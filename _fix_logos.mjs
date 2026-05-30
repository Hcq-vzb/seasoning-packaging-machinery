/**
 * 修复全站 header/footer logo 图片路径
 * header (.default-logo): npack.png.webp
 * footer (.wp-image-4038): 2025102005594677.png
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const siteRoot = path.dirname(fileURLToPath(import.meta.url));
const SKIP_DIRS = new Set(['node_modules', 'cache', '.vs', '.git']);
const HEADER_LOGO = 'npack.png.webp';
const FOOTER_LOGO = '2025102005594677.png';

const report = { filesChanged: 0, headerFixes: 0, footerFixes: 0, otherFixes: 0 };

function isValidHtml(buf) {
  return buf.length > 200 && /<!doctype html|<html/i.test(buf.slice(0, 800).toString('utf8'));
}

function fixLogos(html) {
  let h = 0;
  let f = 0;
  let o = 0;

  // header / mobile / sticky logos
  html = html.replace(
    /(<img[^>]*class="[^"]*default-logo[^"]*"[^>]*src=)(["'])([^"']+)\2/gi,
    (full, pre, q, src) => {
      if (src.includes(HEADER_LOGO)) return full;
      h++;
      const base = src.replace(/[^/\\]+$/, '');
      return `${pre}${q}${base}${HEADER_LOGO}${q}`;
    },
  );

  // footer logo block
  html = html.replace(
    /(<img[^>]*class="[^"]*wp-image-4038[^"]*"[^>]*src=)(["'])([^"']+)\2/gi,
    (full, pre, q, src) => {
      if (src.includes(FOOTER_LOGO)) return full;
      f++;
      const base = src.replace(/[^/\\]+$/, '');
      return `${pre}${q}${base}${FOOTER_LOGO}${q}`;
    },
  );

  // 残留错误文件名
  const before = html;
  html = html.replace(/kiwllogo\.png/gi, HEADER_LOGO);
  html = html.replace(/npacklogo\.png/gi, (m, offset, str) => {
    // 若前面 500 字符内有 wp-image-4038 则用 footer，否则 header
    const ctx = str.slice(Math.max(0, offset - 500), offset + 50);
    o++;
    const baseMatch = str.slice(Math.max(0, offset - 120), offset).match(/(?:src=)(["'])([^"']*\/)/i);
    const base = baseMatch ? baseMatch[2] : 'wp-content/uploads/2025/10/';
    return ctx.includes('wp-image-4038') ? FOOTER_LOGO : HEADER_LOGO;
  });
  if (html !== before) o++;

  return { html, h, f, o };
}

function processFile(fp) {
  const buf = fs.readFileSync(fp);
  if (!isValidHtml(buf)) return;
  const raw = buf.toString('utf8');
  const { html, h, f, o } = fixLogos(raw);
  if (html === raw) return;
  fs.writeFileSync(fp, html, 'utf8');
  report.filesChanged++;
  report.headerFixes += h;
  report.footerFixes += f;
  report.otherFixes += o;
}

function walk(d) {
  for (const ent of fs.readdirSync(d, { withFileTypes: true })) {
    const f = path.join(d, ent.name);
    if (ent.isDirectory()) {
      if (SKIP_DIRS.has(ent.name)) continue;
      if (ent.name === 'wp-content' && d === siteRoot) continue;
      walk(f);
    } else if (ent.name.endsWith('.html') && !ent.name.endsWith('.html.z')) {
      processFile(f);
    }
  }
}

walk(siteRoot);

const checks = ['index.html', 'pl/index.html', 'zh/index.html'].map((rel) => {
  const fp = path.join(siteRoot, rel);
  const html = fs.readFileSync(fp, 'utf8');
  const header = html.match(/default-logo[^>]+src="([^"]+)"/)?.[1] ?? 'n/a';
  const footer = html.match(/wp-image-4038[^>]+src="([^"]+)"/)?.[1] ?? 'n/a';
  return `${rel}\n  header: ${header}\n  footer: ${footer}`;
}).join('\n\n');

const out = `Logo 修复报告
时间: ${new Date().toISOString()}
修改文件: ${report.filesChanged}
header 修复: ${report.headerFixes}
footer 修复: ${report.footerFixes}
其他: ${report.otherFixes}

抽样:
${checks}
`;

fs.writeFileSync(path.join(siteRoot, 'logo_fix_report.txt'), out, 'utf8');
console.log(out);
