import fs from 'fs';
import path from 'path';

const root = path.resolve('c:/My Websites/baoz/www.npackpm.com');
const LANGS = ['de', 'fr', 'es', 'it', 'ru', 'pl', 'pt', 'zh'];
let suffixFixed = 0;
let privacyCopied = 0;

const privacySrc = path.join(root, 'privacy-policy.html');
for (const lang of LANGS) {
  const dest = path.join(root, lang, 'privacy-policy.html');
  if (!fs.existsSync(dest) && fs.existsSync(privacySrc)) {
    let html = fs.readFileSync(privacySrc, 'utf8');
    html = html.replace(/\b(href|src)=(["'])(\.\/)?wp-content/gi, '$1=$2../wp-content');
    html = html.replace(/\b(href|src)=(["'])(\.\/)?wp-includes/gi, '$1=$2../wp-includes');
    fs.writeFileSync(dest, html, 'utf8');
    privacyCopied++;
  }
}

for (const lang of LANGS) {
  const lp = path.join(root, lang);
  if (!fs.existsSync(lp)) continue;
  const basenames = new Set(
    fs.readdirSync(lp).filter((f) => f.endsWith('-html.html')).map((f) => f.replace(/-html\.html$/, '.html')),
  );
  function walk(d) {
    for (const ent of fs.readdirSync(d, { withFileTypes: true })) {
      const f = path.join(d, ent.name);
      if (ent.isDirectory() && ent.name !== 'wp-json') walk(f);
      else if (ent.name.endsWith('.html')) {
        let html = fs.readFileSync(f, 'utf8');
        const orig = html;
        for (const base of basenames) {
          const htmlVar = base.replace(/\.html$/, '-html.html');
          if (fs.existsSync(path.join(lp, htmlVar))) {
            const re = new RegExp(`(href=(["']))${base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'gi');
            html = html.replace(re, `$1${htmlVar}$2`);
          }
        }
        if (html !== orig) {
          fs.writeFileSync(f, html, 'utf8');
          suffixFixed++;
        }
      }
    }
  }
  walk(lp);
}

console.log(`privacy 复制: ${privacyCopied}, -html 后缀修正文件: ${suffixFixed}`);
