/**
 * 修复 head 中 link 标签：href/src 后误插 > 导致顶部乱码
 * 如: href='...'> crossorigin / href="..."> sizes="32x32" />
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const siteRoot = path.dirname(fileURLToPath(import.meta.url));
const SKIP = new Set(['node_modules']);
let files = 0;
let fixes = 0;

const ATTR_AFTER =
  /(\b(?:href|src)=(["'])(?:\\.|(?!\2).)*\2)>\s+(?=(?:crossorigin\b|sizes\b|rel[\s='"]|media\s*=|class\s*=|aria-|data-|itemprop\s*=|target\s*=|as\s*=|onload\s*=|type\s*=|id\s*=|fetchpriority\s*=))/gi;

function walk(d) {
  for (const ent of fs.readdirSync(d, { withFileTypes: true })) {
    const f = path.join(d, ent.name);
    if (ent.isDirectory()) {
      if (!SKIP.has(ent.name)) walk(f);
    } else if (ent.name.endsWith('.html')) {
      let html = fs.readFileSync(f, 'utf8');
      const orig = html;
      let n = 0;
      let prev;
      do {
        prev = html;
        html = html.replace(ATTR_AFTER, (m, pre) => {
          n++;
          return `${pre} `;
        });
      } while (html !== prev);

      // 孤立片段：href="..."> sizes="32x32" />
      html = html.replace(
        /((?:href|src)=(["'])(?:\\.|(?!\2).)*\2)>\s*(sizes=(["'])[^"']+\4\s*\/?>)/gi,
        (m, pre, _q, frag) => {
          n++;
          return `${pre} ${frag.replace(/\s*\/?>$/, ' /')}`.replace(' /', ' />');
        },
      );
      // 更直接：.webp"> sizes="32x32" /> → .webp" sizes="32x32" />
      html = html.replace(/((?:href|src)=["'][^"']*["'])>\s*(sizes=["'][^"']+["']\s*\/?>)/gi, (m, pre, sizesPart) => {
        n++;
        const sp = sizesPart.replace(/\s*\/?>$/, '').trim();
        return `${pre} ${sp} />`;
      });

      if (html !== orig) {
        fs.writeFileSync(f, html, 'utf8');
        files++;
        fixes += n;
      }
    }
  }
}

walk(siteRoot);
console.log(`Head/link 修复: ${files} 文件, ${fixes} 处`);
