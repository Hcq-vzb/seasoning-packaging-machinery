/**
 * Remove inert from #offcanvas — when chunk 447 fails, inert blocks all menu clicks.
 * Closed panel is already hidden via CSS (.ct-panel { display:none; pointer-events:none }).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const siteRoot = path.dirname(fileURLToPath(import.meta.url));
const SKIP_DIRS = new Set(['node_modules', 'cache', '.vs', '.git']);
let updated = 0;

function processFile(fp) {
  const buf = fs.readFileSync(fp);
  if (!buf.slice(0, 800).toString('utf8').match(/<!doctype html|<html/i)) return;
  let html = buf.toString('utf8');
  if (!html.includes('id="offcanvas"') && !html.includes("id='offcanvas'")) return;

  const next = html
    .replace(/(<div[^>]*\bid=["']offcanvas["'][^>]*)\s+inert(?:=["'][^"']*["'])?/gi, '$1')
    .replace(/(<div[^>]*)\s+inert(?:=["'][^"']*["'])?([^>]*\bid=["']offcanvas["'])/gi, '$1$2');

  if (next !== html) {
    fs.writeFileSync(fp, next, 'utf8');
    updated++;
  }
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
console.log('Removed offcanvas inert from', updated, 'files');
