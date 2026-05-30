/**
 * 修复产品详情页 Inquiry Us 按钮 + 全站 contact 类链接深度
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const siteRoot = path.dirname(fileURLToPath(import.meta.url));
const SKIP = new Set(['wp-json', 'node_modules', 'cache']);
const LANG_DIRS = new Set(['zh', 'de', 'fr', 'es', 'it', 'ru', 'pl', 'pt']);

const CONTACT = {
  en: 'contact.html',
  zh: '联系.html',
  de: 'kontakt.html',
  fr: 'contact.html',
  es: 'pongase-en-contacto-con.html',
  it: 'contatto.html',
  ru: 'связаться-с.html',
  pl: 'kontakt.html',
  pt: 'contacto.html',
};

const INQUIRY_RE = /inquiry\s*us|demandez|anfrage|consulte|cont[aá]ct|咨询|询盘|联系我们/i;

const report = { inquiryFixed: 0, contactDepthFixed: 0, files: 0 };

function detectLang(filePath) {
  const rel = path.relative(siteRoot, filePath).replace(/\\/g, '/');
  const first = rel.split('/')[0];
  return LANG_DIRS.has(first) ? first : 'en';
}

function langRoot(lang) {
  return lang === 'en' ? siteRoot : path.join(siteRoot, lang);
}

function depthPrefix(filePath, lang) {
  const root = langRoot(lang);
  const rel = path.relative(root, path.dirname(filePath)).replace(/\\/g, '/');
  const depth = rel ? rel.split('/').filter(Boolean).length : 0;
  return depth ? '../'.repeat(depth) : '';
}

function contactHref(filePath) {
  const lang = detectLang(filePath);
  return depthPrefix(filePath, lang) + CONTACT[lang];
}

function isValidHtml(buf) {
  return buf.length > 500 && !(buf[0] === 0x1f && buf[1] === 0x8b) && /<!doctype html|<html/i.test(buf.slice(0, 500).toString('utf8'));
}

function resolveHref(fromFile, href) {
  if (!href || /^(https?:|mailto:|tel:|javascript:|#)/i.test(href)) return null;
  const clean = href.split('#')[0].split('?')[0];
  if (!clean) return null;
  return path.normalize(path.join(path.dirname(fromFile), clean.replace(/^\.\//, '')));
}

function isContactBasename(base) {
  const b = base.toLowerCase();
  return Object.values(CONTACT).some((c) => c.toLowerCase() === b)
    || b === 'contacto.html' || b === 'contact.html';
}

function fixInquiryButtons(html, filePath) {
  const target = contactHref(filePath);
  let n = 0;

  // home-cta-1 产品询价按钮
  html = html.replace(
    /(<div[^>]*\bhome-cta-1\b[^>]*>[\s\S]*?<a\b[^>]*\bhref=)(["'])([^"']*)(\2)/gi,
    (full, pre, q, href) => {
      if (href === target) return full;
      n++;
      return `${pre}${q}${target}${q}`;
    },
  );

  // 含 Inquiry 文案的 elementor 按钮
  html = html.replace(
    /(<a\b[^>]*\belementor-button\b[^>]*\bhref=)(["'])([^"']*)(\2)([\s\S]*?<span class="elementor-button-text">[^<]*<\/span>[\s\S]*?<\/a>)/gi,
    (full, pre, q, href, q2, rest) => {
      if (!INQUIRY_RE.test(rest)) return full;
      if (href === target) return full;
      n++;
      return `${pre}${q}${target}${q2}${rest}`;
    },
  );

  report.inquiryFixed += n;
  return html;
}

function fixContactDepth(html, filePath) {
  const target = contactHref(filePath);
  const targetBase = path.basename(target);
  let n = 0;

  html = html.replace(/\bhref=(["'])([^"']+)\1/gi, (full, q, href) => {
    if (/^(https?:|mailto:|tel:|javascript:|#)/i.test(href)) return full;
    const clean = href.split('#')[0].split('?')[0];
    const base = path.basename(clean);
    if (!isContactBasename(base)) return full;
    const suffix = href.slice(clean.length);
    const resolved = resolveHref(filePath, clean);
    if (resolved && fs.existsSync(resolved)) return full;
    if (clean === target) return full;
    // 仅当指向 contact 类页面但路径错误时替换
    if (base.toLowerCase() === targetBase.toLowerCase() || Object.values(CONTACT).includes(base)) {
      n++;
      return `href=${q}${target}${suffix}${q}`;
    }
    return full;
  });

  report.contactDepthFixed += n;
  return html;
}

function processFile(fp) {
  const buf = fs.readFileSync(fp);
  if (!isValidHtml(buf)) return;
  let html = buf.toString('utf8');
  const orig = html;
  html = fixInquiryButtons(html, fp);
  html = fixContactDepth(html, fp);
  if (html !== orig) {
    fs.writeFileSync(fp, html, 'utf8');
    report.files++;
  }
}

function walk(d) {
  for (const ent of fs.readdirSync(d, { withFileTypes: true })) {
    const f = path.join(d, ent.name);
    if (ent.isDirectory()) {
      if (!SKIP.has(ent.name)) {
        if (ent.name === 'wp-content' && d === siteRoot) continue;
        walk(f);
      }
    } else if (ent.name.endsWith('.html') && !ent.name.endsWith('.html.z')) {
      processFile(f);
    }
  }
}

walk(siteRoot);

// 验证 Inquiry 按钮
let badInquiry = 0;
const badSamples = [];
function verify(d) {
  for (const ent of fs.readdirSync(d, { withFileTypes: true })) {
    const f = path.join(d, ent.name);
    if (ent.isDirectory()) {
      if (!SKIP.has(ent.name)) {
        if (ent.name === 'wp-content' && d === siteRoot) continue;
        verify(f);
      }
    } else if (ent.name.endsWith('.html')) {
      const buf = fs.readFileSync(f);
      if (!isValidHtml(buf)) continue;
      const html = buf.toString('utf8');
      const target = contactHref(f);
      for (const m of html.matchAll(/home-cta-1[\s\S]*?<a\b[^>]*href=(["'])([^"']+)\1/gi)) {
        const href = m[2];
        if (href.includes('elementor-action') || href.startsWith('#')) {
          badInquiry++;
          badSamples.push(`${path.relative(siteRoot, f)} popup:${href.slice(0, 40)}`);
          continue;
        }
        const resolved = resolveHref(f, href);
        if (!resolved || !fs.existsSync(resolved)) {
          badInquiry++;
          badSamples.push(`${path.relative(siteRoot, f)} → ${href}`);
        }
      }
    }
  }
}
verify(siteRoot);

const text = `Inquiry Us / Contact 链接修复
时间: ${new Date().toISOString()}
修改文件: ${report.files}
Inquiry 按钮修复: ${report.inquiryFixed}
Contact 深度修复: ${report.contactDepthFixed}
验证 Inquiry 失效: ${badInquiry}
${badSamples.slice(0, 25).join('\n') || '全部通过'}
`;
fs.writeFileSync(path.join(siteRoot, 'fix_inquiry_us_report.txt'), text, 'utf8');
console.log(text);
