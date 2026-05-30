import fs from 'fs';
import path from 'path';

const root = path.resolve('c:/My Websites/baoz/www.npackpm.com');
const LANGS = ['de', 'fr', 'es', 'it', 'ru', 'pl', 'pt', 'zh'];

function getLang(file) {
  const rel = path.relative(root, file).replace(/\\/g, '/');
  const p = rel.split('/');
  return LANGS.includes(p[0]) ? p[0] : null;
}

function isAsset(url) {
  return /^(https?:|data:|mailto:|#|javascript:)|wp-content|wp-includes|wp-json|xmlrpc|\.(css|js|webp|png|jpe?g|gif|svg|woff|php)/i.test(url);
}

function resolveTarget(htmlFile, href) {
  const fromDir = path.dirname(htmlFile);
  const u = decodeURIComponent(href.split('?')[0].split('#')[0]);
  const abs = path.resolve(fromDir, u.replace(/\//g, path.sep));
  const siteRel = path.relative(root, abs).replace(/\\/g, '/');
  return { abs, siteRel, exists: fs.existsSync(abs) };
}

const issues = { crossLang: [], noExt: [], broken: [] };
let scanned = 0;

function scanFile(htmlFile) {
  const lang = getLang(htmlFile);
  if (!lang) return;
  scanned++;
  const c = fs.readFileSync(htmlFile, 'utf8');
  const fromRel = path.relative(root, htmlFile).replace(/\\/g, '/');

  for (const m of c.matchAll(/\b(href|action|src)=(["'])([^"']+)\2/gi)) {
    const attr = m[1].toLowerCase();
    const val = m[3];
    if (isAsset(val)) continue;
    if (attr === 'src') continue;
    if (!val.endsWith('.html') && !val.includes('.html?')) continue;

    const { siteRel, exists } = resolveTarget(htmlFile, val);
    if (siteRel.startsWith('..')) continue;

    const top = siteRel.split('/')[0];
    const isHreflang = c.slice(Math.max(0, m.index - 80), m.index).includes('hreflang');
    const isLangSwitcher = /ct-language|language-switcher|hreflang/i.test(c.slice(Math.max(0, m.index - 200), m.index + 50));

    if (!exists) {
      issues.broken.push({ from: fromRel, href: val });
      continue;
    }

    if (top !== lang && top !== '' && LANGS.includes(top) === false && !isHreflang && !isLangSwitcher) {
      // points to root english or wrong
      if (!LANGS.includes(top)) {
        issues.crossLang.push({ from: fromRel, href: val, target: siteRel, lang });
      }
    } else if (top !== lang && !LANGS.includes(top) && !isHreflang && !isLangSwitcher) {
      issues.crossLang.push({ from: fromRel, href: val, target: siteRel, lang });
    }
  }
}

function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const f = path.join(d, e.name);
    if (e.isDirectory() && !['node_modules', '.git', 'wp-content', 'wp-includes'].includes(e.name)) walk(f);
    else if (e.name.endsWith('.html')) scanFile(f);
  }
}
walk(root);

console.log('scanned lang files', scanned);
console.log('crossLang', issues.crossLang.length);
console.log('broken', issues.broken.length);
console.log('samples cross:');
issues.crossLang.slice(0, 25).forEach((x) => console.log(`  [${x.lang}] ${x.from} -> ${x.href} (${x.target})`));
console.log('samples broken:');
issues.broken.slice(0, 15).forEach((x) => console.log(`  ${x.from} -> ${x.href}`));
