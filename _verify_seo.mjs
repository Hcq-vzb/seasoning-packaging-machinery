import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.dirname(fileURLToPath(import.meta.url));
const SKIP = new Set(['node_modules', 'cache', '.vs', '.git', 'wp-content', 'netlify', 'functions']);
const stats = {
  total: 0, noDesc: 0, relCanonical: 0, absCanonical: 0, npackRefs: 0,
  noHreflang: 0, hasXDefault: 0, redirectNoindex: 0, noH1: 0, emptyAlt: 0, imgTotal: 0,
};
const files = [];
function walk(d, r = '') {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const fp = path.join(d, e.name); const rel = r ? r + '/' + e.name : e.name;
    if (e.isDirectory()) { if (SKIP.has(e.name)) continue; walk(fp, rel); }
    else if (e.name.endsWith('.html')) files.push(rel);
  }
}
walk(root);
for (const rel of files) {
  const html = fs.readFileSync(path.join(root, rel), 'utf8');
  stats.total++;
  if (!/<meta\s+name="description"/i.test(html)) stats.noDesc++;
  const canon = (html.match(/<link\s+rel="canonical"\s+href="([^"]*)"/i) || [])[1] || '';
  if (canon) { if (/^https:\/\/seasoningpackagingmachinery\.com/.test(canon)) stats.absCanonical++; else stats.relCanonical++; }
  if (/npackpm\.com/i.test(html)) stats.npackRefs++;
  if (!/hreflang=/i.test(html)) stats.noHreflang++;
  if (/hreflang="x-default"/i.test(html)) stats.hasXDefault++;
  if (/^index[0-9a-f]{4}\.html$/i.test(path.basename(rel)) && /noindex/i.test(html)) stats.redirectNoindex++;
  if (!/<h1[^>]*>/i.test(html)) stats.noH1++;
  const imgs = html.match(/<img\b[^>]*>/gi) || [];
  stats.imgTotal += imgs.length;
  for (const img of imgs) {
    if (!/\balt\s*=/.test(img) || /\balt\s*=\s*["']\s*["']/.test(img)) stats.emptyAlt++;
  }
}
const sm = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');
const smUrls = (sm.match(/<loc>/g) || []).length;
const smBad = (sm.match(/index[0-9a-f]{4}\.html/g) || []).length;
console.log(JSON.stringify({ ...stats, sitemapUrls: smUrls, sitemapRedirectPages: smBad }, null, 2));
