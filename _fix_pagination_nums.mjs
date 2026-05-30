import fs from 'fs';
import path from 'path';
const root = path.resolve('c:/My Websites/baoz/www.npackpm.com');
const LANGS = ['de', 'fr', 'es', 'it', 'ru', 'pl', 'pt', 'zh'];
const PAGE_RE = /[/\\](seite|page|pagina|strona|页码|страница)[/\\]\d+\.html$/i;
let n = 0;
function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const f = path.join(d, e.name);
    if (e.isDirectory()) walk(f);
    else if (e.name.endsWith('.html') && PAGE_RE.test(path.relative(root, f).replace(/\\/g, '/'))) {
      let c = fs.readFileSync(f, 'utf8');
      const o = c;
      c = c.replace(/href="(?:\.\.\/)+(\d+)\.html"/g, 'href="$1.html"');
      if (c !== o) { fs.writeFileSync(f, c); n++; }
    }
  }
}
for (const l of LANGS) {
  const p = path.join(root, l);
  if (fs.existsSync(p)) walk(p);
}
console.log('pagination num links fixed:', n);
