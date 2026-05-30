/**
 * 修复 zh/ 目录中 HTML 实体编码的旧邮箱（页脚联系信息等）
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const siteRoot = path.dirname(fileURLToPath(import.meta.url));
const zhDir = path.join(siteRoot, 'zh');
const NEW_EMAIL = 'cathy@kiwlmachine.com';
const MAILTO = `mailto:${NEW_EMAIL}`;

function walkHtml(dir, files = []) {
  for (const name of fs.readdirSync(dir)) {
    const fp = path.join(dir, name);
    if (fs.statSync(fp).isDirectory()) walkHtml(fp, files);
    else if (name.endsWith('.html')) files.push(fp);
  }
  return files;
}

function decodeEntities(s) {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n)))
    .replace(/&amp;/g, '&')
    .toLowerCase();
}

function isOldNpackEmail(text) {
  const d = decodeEntities(text).replace(/\s/g, '');
  return (
    d.includes('info@npackchina.com') ||
    (d.includes('info') && d.includes('npack') && d.includes('china') && d.includes('mailto:'))
  );
}

function fixEmails(html) {
  // mailto 链接（含 HTML 实体编码 href / 正文）
  html = html.replace(/<a\s+href="mailto:[^"]*"([^>]*)>([\s\S]*?)<\/a>/gi, (match, attrs, inner) => {
    if (!isOldNpackEmail(match)) return match;
    const cleanAttrs = attrs.replace(/\s*target="[^"]*"/gi, '').replace(/\s*rel="[^"]*"/gi, '');
    return `<a href="${MAILTO}"${cleanAttrs}>${NEW_EMAIL}</a>`;
  });

  // 仅 href 含旧邮箱、显示文字已改的情况
  html = html.replace(/href="mailto:[^"]*"/gi, (m) => {
    if (isOldNpackEmail(m)) return `href="${MAILTO}"`;
    return m;
  });

  return html.replace(/info@npackchina\.com/gi, NEW_EMAIL);
}

let changed = 0;
for (const fp of walkHtml(zhDir)) {
  const orig = fs.readFileSync(fp, 'utf8');
  const html = fixEmails(orig);
  if (html !== orig) {
    fs.writeFileSync(fp, html, 'utf8');
    changed++;
    console.log(path.relative(siteRoot, fp));
  }
}
console.log(`\nFixed ${changed} files`);
