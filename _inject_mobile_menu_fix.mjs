/**
 * Inject mobile-menu-fix.js into all HTML pages (after Blocksy ct-scripts).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const siteRoot = path.dirname(fileURLToPath(import.meta.url));
const SKIP_DIRS = new Set(['node_modules', 'cache', '.vs', '.git']);
const SCRIPT_TAG = '<script src="{PREFIX}wp-content/themes/blocksy/static/bundle/mobile-menu-fix.js" defer></script>';
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

  const html = buf.toString('utf8');
  if (!html.includes('ct-scripts-js') && !html.includes('mobile-menu')) {
    return;
  }
  if (html.includes(MARKER)) {
    report.skipped++;
    return;
  }

  const prefix = assetPrefix(html);
  const tag = SCRIPT_TAG.replace('{PREFIX}', prefix);
  const anchor = /<script[^>]*id=["']ct-scripts-js["'][^>]*><\/script>/i;
  const m = html.match(anchor);
  if (!m) {
    const closeBody = html.lastIndexOf('</body>');
    if (closeBody === -1) return;
    const next = html.slice(0, closeBody) + tag + '\n' + html.slice(closeBody);
    fs.writeFileSync(fp, next, 'utf8');
    report.updated++;
    return;
  }

  const insertAt = m.index + m[0].length;
  const next = html.slice(0, insertAt) + '\n' + tag + html.slice(insertAt);
  fs.writeFileSync(fp, next, 'utf8');
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

const out = `mobile-menu-fix 注入报告
时间: ${new Date().toISOString()}
扫描: ${report.scanned}
新增: ${report.updated}
已有: ${report.skipped}
`;

fs.writeFileSync(path.join(siteRoot, '_mobile_menu_fix_report.txt'), out, 'utf8');
console.log(out);
