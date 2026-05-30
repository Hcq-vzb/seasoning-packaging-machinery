/**
 * Re-inject mobile-menu-fix.js in <head> without defer (must run before user opens menu).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const siteRoot = path.dirname(fileURLToPath(import.meta.url));
const SKIP_DIRS = new Set(['node_modules', 'cache', '.vs', '.git']);
const MARKER = 'mobile-menu-fix.js';

const report = { scanned: 0, updated: 0, skipped: 0 };

function isValidHtml(buf) {
  return buf.length > 200 && /<!doctype html|<html/i.test(buf.slice(0, 800).toString('utf8'));
}

function assetPrefix(html) {
  const m = html.match(/id=["']jquery-core-js["'][^>]*\ssrc=["']([^"']+)["']/i)
    || html.match(/src=["']([^"']+)["'][^>]*id=["']jquery-core-js["']/i);
  if (!m) return '';
  return m[1].replace(/wp-includes\/.*$/, '');
}

function processFile(fp) {
  const buf = fs.readFileSync(fp);
  if (!isValidHtml(buf)) return;
  report.scanned++;

  let html = buf.toString('utf8');
  if (!html.includes('ct-scripts-js') && !html.includes('mobile-menu')) return;

  const prefix = assetPrefix(html);
  const tag = `<script src="${prefix}wp-content/themes/blocksy/static/bundle/mobile-menu-fix.js"></script>`;

  html = html.replace(/<script[^>]*mobile-menu-fix\.js[^>]*><\/script>\s*/gi, '');

  const headClose = html.search(/<\/head>/i);
  if (headClose === -1) return;

  html = html.slice(0, headClose) + tag + '\n' + html.slice(headClose);
  fs.writeFileSync(fp, html, 'utf8');
  report.updated++;
}

function walk(dir) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const fp = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (SKIP_DIRS.has(ent.name)) continue;
      if (ent.name === 'wp-content' && dir === siteRoot) continue;
      walk(fp);
    } else if (ent.name.endsWith('.html') && !ent.name.endsWith('.html.z')) {
      processFile(fp);
    }
  }
}

walk(siteRoot);
console.log(JSON.stringify(report, null, 2));
