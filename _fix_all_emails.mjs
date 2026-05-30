/**
 * 全站替换 info@npackchina.com → cathy@kiwlmachine.com（含 HTML 实体编码）
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const siteRoot = path.dirname(fileURLToPath(import.meta.url));
const NEW_EMAIL = 'cathy@kiwlmachine.com';
const MAILTO = `mailto:${NEW_EMAIL}`;

const SKIP_DIRS = new Set(['node_modules', '.git']);

function walk(dir, out = []) {
  for (const name of fs.readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const fp = path.join(dir, name);
    const st = fs.statSync(fp);
    if (st.isDirectory()) walk(fp, out);
    else if (/\.(html|json)$/i.test(name)) out.push(fp);
  }
  return out;
}

function decodeEntities(s) {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n)))
    .replace(/&amp;/g, '&');
}

function isOldNpackEmail(text) {
  const d = decodeEntities(text).toLowerCase().replace(/\s/g, '');
  if (d.includes('info@npackchina.com')) return true;
  if (!d.includes('mailto:')) return false;
  return d.includes('info') && d.includes('npack') && d.includes('china');
}

function fixContent(html) {
  html = html.replace(/<a\s+href="mailto:[^"]*"([^>]*)>([\s\S]*?)<\/a>/gi, (match, attrs, inner) => {
    if (!isOldNpackEmail(match)) return match;
    const cleanAttrs = attrs.replace(/\s*target="[^"]*"/gi, '').replace(/\s*rel="[^"]*"/gi, '');
    return `<a href="${MAILTO}"${cleanAttrs}>${NEW_EMAIL}</a>`;
  });

  html = html.replace(/href="mailto:[^"]*"/gi, (m) => (isOldNpackEmail(m) ? `href="${MAILTO}"` : m));

  html = html.replace(/info@npackchina\.com/gi, NEW_EMAIL);

  return html;
}

const files = walk(siteRoot);
let changed = 0;
let remaining = 0;

for (const fp of files) {
  const rel = path.relative(siteRoot, fp);
  if (rel.startsWith('_fix_') && rel.endsWith('.mjs')) continue;

  const orig = fs.readFileSync(fp, 'utf8');
  const html = fixContent(orig);
  if (html !== orig) {
    fs.writeFileSync(fp, html, 'utf8');
    changed++;
  }
  if (/info@npackchina/i.test(html) || isOldNpackEmail(html)) {
    remaining++;
    console.log('REMAINING', rel);
  }
}

console.log(`\nUpdated ${changed} files`);
console.log(`Remaining with old email: ${remaining}`);
