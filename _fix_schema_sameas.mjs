/** Fix corrupted sameAs arrays in JSON-LD (orphan page slug entries). */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.dirname(fileURLToPath(import.meta.url));
const SKIP = new Set(['node_modules', 'cache', '.vs', '.git', 'wp-content', 'netlify', 'functions']);
let fixed = 0;

function fixSameAs(html) {
  return html.replace(/"sameAs"\s*:\s*\[([^\]]*)\]/g, (full, inner) => {
    const items = [...inner.matchAll(/"((?:\\.|[^"\\])*)"/g)].map((m) =>
      m[1].replace(/\\"/g, '"').replace(/\\\//g, '/'),
    );
    const valid = items.filter((u) => /^https?:\/\//i.test(u));
    if (valid.length === items.length) return full;
    fixed++;
    const encoded = valid.map((u) => `"${u.replace(/\//g, '\\/')}"`).join(',');
    return `"sameAs":[${encoded}]`;
  });
}

function walk(d, r = '') {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const fp = path.join(d, e.name);
    const rel = r ? `${r}/${e.name}` : e.name;
    if (e.isDirectory()) {
      if (SKIP.has(e.name)) continue;
      walk(fp, rel);
    } else if (e.name.endsWith('.html')) {
      const html = fs.readFileSync(fp, 'utf8');
      const out = fixSameAs(html);
      if (out !== html) fs.writeFileSync(fp, out, 'utf8');
    }
  }
}
walk(root);
console.log('sameAs arrays fixed:', fixed);
