/**
 * 修复 /zh/ 分页乱码：损坏的 2.html 为 gzip 误存，用 *-2.html 或 gunzip 恢复；校正链接与 UTF-8
 */
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

const siteRoot = path.resolve('c:/My Websites/baoz/www.npackpm.com');
const zhRoot = path.join(siteRoot, 'zh');

const report = {
  restoredFromSibling: [],
  restoredFromGzip: [],
  fixedPaths: 0,
  charsetAdded: 0,
  crossLangFixed: 0,
  filesTouched: 0,
};

function isGzip(buf) {
  return buf.length >= 2 && buf[0] === 0x1f && buf[1] === 0x8b;
}

function isValidHtmlBuf(buf) {
  if (buf.length < 8000) return false;
  const s = buf.slice(0, 500).toString('utf8');
  return /<!doctype html|<html/i.test(s) && !isGzip(buf);
}

function tryGunzipFile(fp) {
  const zPath = fp + '.z';
  if (!fs.existsSync(zPath)) return null;
  try {
    const out = zlib.gunzipSync(fs.readFileSync(zPath));
    return isValidHtmlBuf(out) ? out : null;
  } catch {
    return null;
  }
}

/** 恢复损坏的 html：优先 *-2.html，其次 .html.z */
function restoreCorruptHtml(dir) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      restoreCorruptHtml(full);
      continue;
    }
    if (!ent.name.endsWith('.html') || ent.name.endsWith('.html.z')) continue;

    const buf = fs.readFileSync(full);
    if (isValidHtmlBuf(buf)) continue;

    const base = ent.name.replace(/\.html$/, '');
    const sibling = path.join(dir, `${base}-2.html`);
    let good = null;

    if (fs.existsSync(sibling)) {
      const sb = fs.readFileSync(sibling);
      if (isValidHtmlBuf(sb)) good = sb;
    }
    if (!good) good = tryGunzipFile(full);
    if (!good && isGzip(buf)) {
      try {
        const out = zlib.gunzipSync(buf);
        if (isValidHtmlBuf(out)) good = out;
      } catch { /* */ }
    }

    if (good) {
      fs.writeFileSync(full, good);
      const rel = path.relative(zhRoot, full).replace(/\\/g, '/');
      if (fs.existsSync(sibling)) report.restoredFromSibling.push(rel);
      else report.restoredFromGzip.push(rel);
    }
  }
}

function depthToZhRoot(htmlFile) {
  const rel = path.relative(zhRoot, path.dirname(htmlFile)).replace(/\\/g, '/');
  if (!rel) return 0;
  return rel.split('/').length;
}

function prefixToSiteRoot(htmlFile) {
  const d = depthToZhRoot(htmlFile);
  return '../'.repeat(d + 1); // zh/产品/页码 -> ../../../
}

function prefixToZhRoot(htmlFile) {
  const d = depthToZhRoot(htmlFile);
  return d ? '../'.repeat(d) : '';
}

function ensureCharset(html) {
  if (/<meta\s+charset=["']UTF-8["']/i.test(html)) return html;
  report.charsetAdded++;
  if (/<head[^>]*>/i.test(html)) {
    return html.replace(/<head([^>]*)>/i, '<head$1>\n\t<meta charset="UTF-8">');
  }
  return html;
}

function fixZhPage(htmlFile) {
  let html = fs.readFileSync(htmlFile, 'utf8');
  const orig = html;
  const toSite = prefixToSiteRoot(htmlFile);
  const toZh = prefixToZhRoot(htmlFile);
  const relDir = path.relative(zhRoot, path.dirname(htmlFile)).replace(/\\/g, '/');

  html = ensureCharset(html);

  // wp-content / wp-includes 深度
  html = html.replace(
    /\b(href|src|action)=(["'])(?!(https?:|data:|mailto:|#|javascript:))(\.\.\/)*(wp-content|wp-includes)/gi,
    (m, attr, q, _p, _dots, wp) => {
      const fixed = `${toSite}${wp}`;
      if (m.includes(fixed)) return m;
      report.fixedPaths++;
      return `${attr}=${q}${fixed}`;
    },
  );

  // 中文首页 / 栏目（深度自适应）
  html = html.replace(/\bhref=(["'])(\.\.\/)*index\.html\1/gi, (m, q, dots) => {
    const target = `${toZh}index.html`;
    const cur = (dots || '') + 'index.html';
    if (cur === target || m === `href=${q}${target}${q}`) return m;
    report.fixedPaths++;
    return `href=${q}${target}${q}`;
  });

  // 分页：产品/新闻/技术 列表页
  const sections = ['产品', '新闻', '技术'];
  for (const sec of sections) {
    const listPage = `${sec}.html`;
    const esc = listPage.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    html = html.replace(new RegExp(`href=(["'])(?:\\.\\./)*${esc}\\1`, 'gi'), (m, q) => {
      const target = `${toZh}${listPage}`;
      if (m.includes(target)) return m;
      report.fixedPaths++;
      return `href=${q}${target}${q}`;
    });
  }

  // 分页目录内相对链接 3.html / 2.html
  if (relDir.includes('页码')) {
    html = html.replace(/\bhref=(["'])(\.\.\/\.\.\/\.\.\/)([^"']+\.html)\1/gi, (m, q, _p, file) => {
      if (file.startsWith('wp-')) return m;
      return m;
    });
    // prev 指向列表
    const parentSec = relDir.split('/')[0];
    if (sections.includes(parentSec)) {
      const listHref = `${toZh}${parentSec}.html`;
      html = html.replace(/<link\s+rel=["']prev["'][^>]*href=["'][^"']*["']/gi, (tag) => {
        if (tag.includes(listHref)) return tag;
        report.fixedPaths++;
        return tag.replace(/href=["'][^"']*["']/i, `href="${listHref}"`);
      });
    }
  }

  // 禁止正文链到其它语言目录（保留 hreflang / 语言菜单）
  html = html.replace(
    /\b(href|src)=(["'])(\.\.\/)+(de|fr|es|it|ru|pl|pt|en)(\/[^"']*)?\2/gi,
    (full, attr, q, _dots, lang, rest, offset) => {
      const pos = typeof offset === 'number' ? offset : html.indexOf(full);
      const ctx = html.slice(Math.max(0, pos - 200), pos);
      if (/hreflang|ct-language-switcher/i.test(ctx)) return full;
      report.crossLangFixed++;
      if (lang === 'en' || !rest) return `${attr}=${q}${toSite}index.html${q}`;
      return `${attr}=${q}${toZh}index.html${q}`;
    },
  );

  // canonical 空或错误
  html = html.replace(/<link\s+rel=["']canonical["']\s+href=["']\s*["']\s*\/?>/gi, () => {
    const base = path.basename(htmlFile);
    const rel = path.relative(zhRoot, htmlFile).replace(/\\/g, '/');
    const href = rel === path.basename(rel) ? base : rel;
    return `<link rel="canonical" href="${href}" />`;
  });

  if (html !== orig) {
    fs.writeFileSync(htmlFile, html, 'utf8');
    report.filesTouched++;
  }
}

// 1. 恢复损坏文件
restoreCorruptHtml(zhRoot);

// 2. 若 技术/页码/2.html 缺失，从 2-2 复制
const techP2 = path.join(zhRoot, '技术', '页码', '2.html');
const techP2s = path.join(zhRoot, '技术', '页码', '2-2.html');
if (!fs.existsSync(techP2) && fs.existsSync(techP2s)) {
  fs.copyFileSync(techP2s, techP2);
  report.restoredFromSibling.push('技术/页码/2.html (created)');
}

// 3. 修复所有 zh html（不含 wp-json）
function walkFix(d) {
  for (const ent of fs.readdirSync(d, { withFileTypes: true })) {
    const f = path.join(d, ent.name);
    if (ent.isDirectory()) {
      if (ent.name === 'wp-json') continue;
      walkFix(f);
    } else if (ent.name.endsWith('.html') && !ent.name.endsWith('.html.z')) {
      const buf = fs.readFileSync(f);
      if (isValidHtmlBuf(buf)) fixZhPage(f);
    }
  }
}
walkFix(zhRoot);

// 4. 自检
const bad = [];
function walkCheck(d) {
  for (const ent of fs.readdirSync(d, { withFileTypes: true })) {
    const f = path.join(d, ent.name);
    if (ent.isDirectory()) {
      if (ent.name !== 'wp-json') walkCheck(f);
    } else if (ent.name.endsWith('.html') && !ent.name.endsWith('.html.z')) {
      const buf = fs.readFileSync(f);
      if (!isValidHtmlBuf(buf)) bad.push(path.relative(zhRoot, f).replace(/\\/g, '/'));
    }
  }
}
walkCheck(zhRoot);

const text = `中文 /zh/ 分页与栏目修复报告
时间: ${new Date().toISOString()}

【乱码根因】部分 2.html 等为 gzip 压缩数据（非 UTF-8 HTML），浏览器显示乱码。
HTTrack 同时保留了完整副本 *-2.html。

【恢复】
  从 *-2.html 恢复: ${report.restoredFromSibling.join(', ') || '无'}
  从 .html.z gunzip: ${report.restoredFromGzip.join(', ') || '无'}

【校正】
  修改文件数: ${report.filesTouched}
  资源/路径修正: ${report.fixedPaths}
  补充 charset: ${report.charsetAdded}
  跨语言正文链接: ${report.crossLangFixed}

【自检仍损坏】${bad.length ? bad.join(', ') : '无'}

说明: 仅修改 zh/ 目录，不影响其它语言。
`;
fs.writeFileSync(path.join(siteRoot, 'fix_zh_pagination_report.txt'), text, 'utf8');
console.log(text);
