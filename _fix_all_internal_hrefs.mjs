/**
 * 全站 HTML 内部链接紧急修复：校正相对路径深度，确保不跳出站点根目录
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const siteRoot = path.dirname(fileURLToPath(import.meta.url));
const SKIP_DIRS = new Set(['wp-json', 'node_modules', 'cache']);
const LANG_DIRS = new Set(['zh', 'de', 'fr', 'es', 'it', 'ru', 'pl', 'pt']);

const report = {
  filesScanned: 0,
  filesModified: 0,
  hrefFixed: 0,
  samples: [],
};

/** 所有 HTML 文件索引：basename -> [abs paths] */
const htmlByBase = new Map();
const allHtmlAbs = [];

function indexHtmlFiles() {
  function walk(d) {
    for (const ent of fs.readdirSync(d, { withFileTypes: true })) {
      const f = path.join(d, ent.name);
      if (ent.isDirectory()) {
        if (!SKIP_DIRS.has(ent.name)) {
          if (ent.name === 'wp-content' && d === siteRoot) {
            walkUploadsHtml(path.join(f, 'uploads'));
          } else walk(f);
        }
      } else if (ent.name.endsWith('.html') && !ent.name.endsWith('.html.z')) {
        allHtmlAbs.push(f);
        const base = ent.name.toLowerCase();
        if (!htmlByBase.has(base)) htmlByBase.set(base, []);
        htmlByBase.get(base).push(f);
      }
    }
  }
  function walkUploadsHtml(uploadsDir) {
    if (!fs.existsSync(uploadsDir)) return;
    for (const ent of fs.readdirSync(uploadsDir, { withFileTypes: true })) {
      const f = path.join(uploadsDir, ent.name);
      if (ent.isDirectory()) walkUploadsHtml(f);
      else if (ent.name.endsWith('.html')) {
        allHtmlAbs.push(f);
        const base = ent.name.toLowerCase();
        if (!htmlByBase.has(base)) htmlByBase.set(base, []);
        htmlByBase.get(base).push(f);
      }
    }
  }
  walk(siteRoot);
}

function detectLang(absFile) {
  const rel = path.relative(siteRoot, absFile).replace(/\\/g, '/');
  const first = rel.split('/')[0];
  return LANG_DIRS.has(first) ? first : 'en';
}

function langRoot(lang) {
  return lang === 'en' ? siteRoot : path.join(siteRoot, lang);
}

function isValidHtml(buf) {
  return buf.length > 500 && !(buf[0] === 0x1f && buf[1] === 0x8b) && /<!doctype html|<html/i.test(buf.slice(0, 500).toString('utf8'));
}

function resolveHref(fromFile, href) {
  if (!href || /^(https?:|mailto:|tel:|javascript:|#)/i.test(href)) return null;
  const clean = href.split('#')[0].split('?')[0];
  if (!clean || !clean.includes('.html')) return null;
  return path.normalize(path.join(path.dirname(fromFile), clean.replace(/^\.\//, '')));
}

function isInsideSite(abs) {
  const rel = path.relative(siteRoot, abs);
  return rel && !rel.startsWith('..') && !path.isAbsolute(rel);
}

function relHref(fromFile, targetAbs) {
  let rel = path.relative(path.dirname(fromFile), targetAbs).replace(/\\/g, '/');
  if (rel.startsWith('./')) rel = rel.slice(2);
  return rel;
}

function pickTarget(fromFile, href) {
  const clean = href.split('#')[0].split('?')[0];
  const hash = href.includes('#') ? href.slice(href.indexOf('#')) : '';
  const query = href.includes('?') && !href.includes('#') ? href.slice(href.indexOf('?')) : '';
  const suffix = (href.includes('?') ? href.slice(href.indexOf('?')) : '') || hash;
  const baseName = path.basename(clean).toLowerCase();
  const srcLang = detectLang(fromFile);
  const srcLangRoot = langRoot(srcLang);

  const candidates = htmlByBase.get(baseName) || [];
  if (candidates.length === 0) return null;

  // 优先同语言
  const sameLang = candidates.filter((c) => detectLang(c) === srcLang);
  const pool = sameLang.length ? sameLang : candidates;

  // 若 href 含子路径，尝试路径后缀匹配
  const hrefNorm = clean.replace(/^\.\.\/+/, '').replace(/^\.\//, '').replace(/\\/g, '/').toLowerCase();
  for (const c of pool) {
    const relToLang = path.relative(srcLangRoot, c).replace(/\\/g, '/').toLowerCase();
    if (relToLang === hrefNorm || relToLang.endsWith('/' + hrefNorm)) return c;
  }

  // 同目录优先
  const sameDir = pool.find((c) => path.dirname(c) === path.dirname(fromFile));
  if (sameDir) return sameDir;

  // 语言根下最短路径
  pool.sort((a, b) => {
    const da = path.relative(srcLangRoot, a).split(/[/\\]/).length;
    const db = path.relative(srcLangRoot, b).split(/[/\\]/).length;
    return da - db;
  });
  return pool[0];
}

function fixHref(fromFile, href) {
  const resolved = resolveHref(fromFile, href);
  if (resolved && isInsideSite(resolved) && fs.existsSync(resolved)) return href;

  const target = pickTarget(fromFile, href);
  if (!target) return href;

  const newRel = relHref(fromFile, target);
  const qIdx = href.indexOf('?');
  const hIdx = href.indexOf('#');
  let suffix = '';
  if (qIdx !== -1) suffix = href.slice(qIdx);
  else if (hIdx !== -1) suffix = href.slice(hIdx);

  return newRel + suffix;
}

function fixFile(absFile) {
  const buf = fs.readFileSync(absFile);
  if (!isValidHtml(buf)) return;

  report.filesScanned++;
  let html = buf.toString('utf8');
  const orig = html;
  let n = 0;

  html = html.replace(/\bhref=(["'])([^"']+)\1/gi, (full, q, href) => {
    if (/^(https?:|mailto:|tel:|javascript:|#)/i.test(href)) return full;
    if (!href.includes('.html')) return full;
    const fixed = fixHref(absFile, href);
    if (fixed !== href) {
      n++;
      return `href=${q}${fixed}${q}`;
    }
    return full;
  });

  if (html !== orig) {
    fs.writeFileSync(absFile, html, 'utf8');
    report.filesModified++;
    report.hrefFixed += n;
    if (report.samples.length < 20) {
      report.samples.push(`${path.relative(siteRoot, absFile).replace(/\\/g, '/')} (${n} links)`);
    }
  }
}

indexHtmlFiles();
for (const f of allHtmlAbs) fixFile(f);

// 验证
let broken = 0;
const brokenSamples = [];
for (const f of allHtmlAbs) {
  const buf = fs.readFileSync(f);
  if (!isValidHtml(buf)) continue;
  const html = buf.toString('utf8');
  const seen = new Set();
  for (const m of html.matchAll(/\bhref=(["'])([^"']+)\1/gi)) {
    const href = m[2];
    if (/^(https?:|mailto:|tel:|javascript:|#|wp-content)/i.test(href)) continue;
    if (!href.includes('.html')) continue;
    if (seen.has(href)) continue;
    seen.add(href);
    const resolved = resolveHref(f, href);
    if (!resolved || !isInsideSite(resolved) || !fs.existsSync(resolved)) {
      broken++;
      if (brokenSamples.length < 40) {
        brokenSamples.push(`${path.relative(siteRoot, f).replace(/\\/g, '/')} → ${href}`);
      }
    }
  }
}

const text = `全站内部链接紧急修复
时间: ${new Date().toISOString()}
HTML 索引: ${allHtmlAbs.length}
扫描: ${report.filesScanned}
修改文件: ${report.filesModified}
校正链接: ${report.hrefFixed}
验证剩余失效: ${broken}

修改样例:
${report.samples.join('\n') || '无'}

剩余失效 (前40):
${brokenSamples.join('\n') || '全部通过 ✓'}
`;
fs.writeFileSync(path.join(siteRoot, 'fix_all_hrefs_report.txt'), text, 'utf8');
console.log(text);
process.exitCode = broken > 0 ? 1 : 0;
