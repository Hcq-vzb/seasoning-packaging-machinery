import fs from 'fs';
import path from 'path';
const root = 'c:/My Websites/baoz/www.npackpm.com';
const htmlFile = path.join(root, 'ru/index.html');
const html = fs.readFileSync(htmlFile, 'utf8');
const LANG_SET = new Set(['de','fr','es','it','ru','pl','pt','zh']);
function rootPrefix(f) {
  const dirRel = path.relative(root, path.dirname(f)).replace(/\\/g, '/');
  return dirRel ? '../'.repeat(dirRel.split('/').length) : '';
}
function homeHref(f, t) {
  const p = rootPrefix(f);
  return t === 'en' ? p + 'index.html' : p + t + '/index.html';
}
const re = /<a\s+([^>]*?)href=["']([^"']+)["']([^>]*?)>/gi;
let m;
const idx = html.indexOf('lang="de-DE"');
console.log('de snippet:', html.slice(idx - 100, idx + 50));
while ((m = re.exec(html)) !== null) {
  const ctx = html.slice(Math.max(0, m.index - 900), m.index + 120);
  if (!/ct-language-switcher/i.test(ctx)) continue;
  const langM = (m[1] + m[3]).match(/\blang=["']([a-z]{2})/i);
  if (!langM) continue;
  const tl = langM[1].toLowerCase();
  const nh = homeHref(htmlFile, tl === 'en' ? 'en' : tl);
  console.log('match', tl, m[2], '->', nh, 'fix?', m[2] !== nh);
}
