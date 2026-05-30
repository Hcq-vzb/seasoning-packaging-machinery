/**
 * 修正页脚 wp-image-4038 为专用 footer logo
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const siteRoot = path.dirname(fileURLToPath(import.meta.url));
const SKIP_DIRS = new Set(['node_modules', 'cache', '.vs', '.git']);
const FOOTER_LOGO = '2025102005594677.png';
let changed = 0;

function processFile(fp) {
  const buf = fs.readFileSync(fp);
  if (!/wp-image-4038/.test(buf.toString('utf8'))) return;
  let html = buf.toString('utf8');
  const next = html.replace(/<img\b[^>]*\bwp-image-4038\b[^>]*>/gi, (tag) => {
    return tag.replace(/\bsrc=(["'])([^"']+)\1/i, (full, q, src) => {
      if (src.endsWith(FOOTER_LOGO)) return full;
      changed++;
      const base = src.replace(/[^/\\]+$/, '');
      return `src=${q}${base}${FOOTER_LOGO}${q}`;
    });
  });
  if (next !== html) fs.writeFileSync(fp, next, 'utf8');
}

function walk(d) {
  for (const ent of fs.readdirSync(d, { withFileTypes: true })) {
    const f = path.join(d, ent.name);
    if (ent.isDirectory()) {
      if (SKIP_DIRS.has(ent.name)) continue;
      if (ent.name === 'wp-content' && d === siteRoot) continue;
      walk(f);
    } else if (ent.name.endsWith('.html')) processFile(f);
  }
}

walk(siteRoot);
console.log(`Footer logo fixes: ${changed}`);
