import fs from 'fs';
import path from 'path';

const root = path.resolve('c:/My Websites/baoz/www.npackpm.com');
const LANGS = ['de', 'fr', 'es', 'it', 'ru', 'pl', 'pt', 'zh'];
const cross = new Map();
const broken = new Map();

function getLang(r) {
  const f = r.split('/')[0];
  return LANGS.includes(f) ? f : null;
}

function isAsset(u) {
  return /^(https?:|#|mailto:|javascript:)/i.test(u) || /wp-content|wp-includes|\.(css|js|webp|png|jpg)/i.test(u);
}

function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const f = path.join(d, e.name);
    if (e.isDirectory() && !['node_modules', '.git', 'wp-content', 'wp-includes'].includes(e.name)) walk(f);
    else if (e.name.endsWith('.html')) {
      const rel = path.relative(root, f).replace(/\\/g, '/');
      const fl = getLang(rel);
      if (!fl) continue;
      const html = fs.readFileSync(f, 'utf8');
      const re = /\bhref=(["'])([^"']+)\1/gi;
      let m;
      while ((m = re.exec(html))) {
        const u = m[2];
        if (isAsset(u) || !u.includes('.html')) continue;
        const ctx = html.slice(Math.max(0, m.index - 100), m.index);
        if (/hreflang|ct-language/i.test(ctx)) continue;
        const target = path.normalize(path.join(path.dirname(f), decodeURIComponent(u.split('?')[0].split('#')[0])));
        const sr = path.relative(root, target).replace(/\\/g, '/');
        const tl = getLang(sr);
        const exists = fs.existsSync(target);
        if (!exists) {
          broken.set(u, (broken.get(u) || 0) + 1);
        } else if ((tl && tl !== fl) || (!tl && !sr.startsWith(fl + '/'))) {
          cross.set(sr, (cross.get(sr) || 0) + 1);
        }
      }
    }
  }
}

walk(root);
console.log('Top cross targets:');
[...cross.entries()].sort((a, b) => b[1] - a[1]).slice(0, 25).forEach(([k, v]) => console.log(v, k));
console.log('\nTop broken href patterns:');
[...broken.entries()].sort((a, b) => b[1] - a[1]).slice(0, 25).forEach(([k, v]) => console.log(v, k));
