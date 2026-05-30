/**
 * 紧急修复：误在 href 后插入 > 导致属性/样式全部失效
 * 错误: href="x"> class="ct-menu-link">  正确: href="x" class="ct-menu-link">
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const siteRoot = path.dirname(fileURLToPath(import.meta.url));
const SKIP = new Set(['node_modules']);
let files = 0;
let fixes = 0;

// href 闭合引号后误插 >，且紧跟 HTML 属性（非链接文字）
const BAD_GT_BEFORE_ATTR =
  /(\bhref=(["'])(?:\\.|(?!\2).)*\2)>\s+(?=(?:aria-[\w-]*|class\s*=|data-[\w-]*|rel\s*=|itemprop\s*=|target\s*=|media\s*=|id\s*=|as\s*=|onload\s*=|crossorigin\s*=|type\s*=|role\s*=|download\s*=|title\s*=|lang\s*=))/gi;

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
        html = html.replace(BAD_GT_BEFORE_ATTR, (m, pre) => {
          n++;
          return `${pre} `;
        });
      } while (html !== prev);
      if (html !== orig) {
        fs.writeFileSync(f, html, 'utf8');
        files++;
        fixes += n;
      }
    }
  }
}

walk(siteRoot);
console.log(`紧急修复完成: ${files} 个文件, ${fixes} 处 href 后多余 > 已移除`);
