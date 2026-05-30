import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const siteRoot = path.dirname(fileURLToPath(import.meta.url));
const PAGE_RE = /[/\\](page|seite|pagina|strona|页码|страница)[/\\]\d+\.html$/i;
let n = 0;

function walk(d) {
  for (const ent of fs.readdirSync(d, { withFileTypes: true })) {
    const f = path.join(d, ent.name);
    if (ent.isDirectory() && !['wp-content', 'wp-json'].includes(ent.name)) walk(f);
    else if (ent.name.endsWith('.html') && PAGE_RE.test(f.replace(/\\/g, '/'))) {
      let html = fs.readFileSync(f, 'utf8');
      const orig = html;
      const rel = path.relative(siteRoot, f).replace(/\\/g, '/');
      const parts = path.dirname(rel).split('/');
      const depth = parts.length;
      const prefix = '../'.repeat(depth);

      html = html.replace(/content="(?:\.\.\/)+index\.html"/gi, `content="${prefix}index.html"`);
      html = html.replace(/itemprop="position" content="(?:\.\.\/)+(\d+)\.html"/gi, 'itemprop="position" content="$1"');
      html = html.replace(/itemprop="url" content="(?:\.\.\/)+([^"]+\.html)"/gi, (m, file) => {
        if (file === 'index.html') return `itemprop="url" content="${prefix}index.html"`;
        return `itemprop="url" content="${prefix}${file.replace(/^(\.\.\/)+/, '')}"`;
      });

      if (html !== orig) {
        fs.writeFileSync(f, html, 'utf8');
        n++;
      }
    }
  }
}
walk(siteRoot);
console.log('Breadcrumb meta fixed in', n, 'pagination files');
