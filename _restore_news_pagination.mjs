/** 恢复 news/page 分页被栏目修复脚本误改的路径 */
import fs from 'fs';
import path from 'path';

const root = path.resolve('c:/My Websites/baoz/www.npackpm.com');
const pageDir = path.join(root, 'news/page');
let fixed = 0;

for (const n of [2, 3, 4]) {
  const file = path.join(pageDir, `${n}.html`);
  if (!fs.existsSync(file)) continue;
  let c = fs.readFileSync(file, 'utf8');
  const orig = c;

  c = c.replace(/<link rel="canonical" href="" \/>/, `<link rel="canonical" href="${n}.html" />`);

  // 分页：同目录内用 N.html，news 列表用 ../../news.html
  c = c.replace(/href="\.\.\/\.\.\/\.\.\/\.\.\/news\.html"/g, 'href="../../news.html"');
  c = c.replace(/href="\.\.\/\.\.\/(\d)\.html"/g, 'href="$1.html"');
  c = c.replace(/rel="prev" href="\.\.\/\.\.\/\.\.\/\.\.\/news\.html"/, 'rel="prev" href="../../news.html"');
  if (n === 2) {
    c = c.replace(/rel="prev" href="\.\.\/\.\.\/\.\.\/\.\.\/news\.html"/, 'rel="prev" href="../../news.html"');
  }

  // 搜索表单指向首页
  c = c.replace(/class="ct-search-form"[^>]*action="index\.html"/, 'class="ct-search-form"  action="../../index.html"');

  // RSS / logo 等同层 ../../
  c = c.replace(/href="\.\.\/\.\.\/\.\.\/\.\.\/index\.html"/g, 'href="../../index.html"');

  // 导航栏目链接 depth=2
  for (const slug of ['about-us', 'services', 'contact', 'product', 'bottling-solutions', 'technology', 'news']) {
    c = c.replace(new RegExp(`href="${slug}\\.html"`, 'g'), `href="../../${slug}.html"`);
    // 避免重复 ../../
    c = c.replace(/href="\.\.\/\.\.\/\.\.\/\.\.\/([^"]+\.html)"/g, 'href="../../$1"');
  }

  if (c !== orig) {
    fs.writeFileSync(file, c, 'utf8');
    fixed++;
    console.log('Fixed news/page/' + n + '.html');
  }
}

console.log('Done, files fixed:', fixed);
