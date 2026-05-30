// 修正 zh 各栏目「页码」目录下分页导航链接
import fs from 'fs';
import path from 'path';

const zhRoot = path.resolve('c:/My Websites/baoz/www.npackpm.com/zh');
const sections = {
  产品: { list: '产品.html', max: 3 },
  新闻: { list: '新闻.html', max: 4 },
  技术: { list: '技术.html', max: 3 },
};

const fixes = [];

for (const [sec, cfg] of Object.entries(sections)) {
  const pageDir = path.join(zhRoot, sec, '页码');
  if (!fs.existsSync(pageDir)) continue;

  for (const ent of fs.readdirSync(pageDir)) {
    if (!/^\d+\.html$/.test(ent)) continue;
    const pageNum = parseInt(ent, 10);
    const fp = path.join(pageDir, ent);
    let html = fs.readFileSync(fp, 'utf8');
    const orig = html;
    const listHref = `../../${cfg.list}`;

    // 分页区内：误用文章 URL 代替第 2 页
    html = html.replace(
      /(<nav class="ct-pagination"[\s\S]*?<\/nav>)/gi,
      (nav) =>
        nav
          .replace(/href=["']\.\.\/\.\.\/2024-我们的春节假期-html\.html["']/gi, 'href="2.html"')
          .replace(/href=["']\.\.\/\.\.\/index\.html["']/gi, (m) => {
            // 在分页 nav 内：index 应改为列表页或相邻页（下面按页码再修）
            return m;
          }),
    );

    // 产品/技术 第 2 页：整块分页替换为正确结构
    if (pageNum === 2 && (sec === '产品' || sec === '技术')) {
      const prev = sec === '产品' ? listHref : listHref;
      const block = `<nav class="ct-pagination" data-pagination="simple"  >
\t\t\t<a class="prev page-numbers" rel="prev" href="${prev}"><svg width="9px" height="9px" viewBox="0 0 15 15" fill="currentColor"><path d="M10.9,15c-0.2,0-0.4-0.1-0.6-0.2L3.6,8c-0.3-0.3-0.3-0.8,0-1.1l6.6-6.6c0.3-0.3,0.8-0.3,1.1,0c0.3,0.3,0.3,0.8,0,1.1L5.2,7.4l6.2,6.2c0.3,0.3,0.3,0.8,0,1.1C11.3,14.9,11.1,15,10.9,15z"/></svg>上一个</a><div class="ct-hidden-sm"><a class="page-numbers" href="${listHref}">1</a>
<span aria-current="page" class="page-numbers current">2</span>
<a class="page-numbers" href="3.html">3</a></div><a class="next page-numbers" rel="next" href="3.html">下一个 <svg width="9px" height="9px" viewBox="0 0 15 15" fill="currentColor"><path d="M4.1,15c0.2,0,0.4-0.1,0.6-0.2L11.4,8c0.3-0.3,0.3-0.8,0-1.1L4.8,0.2C4.5-0.1,4-0.1,3.7,0.2C3.4,0.5,3.4,1,3.7,1.3l6.1,6.1l-6.2,6.2c-0.3,0.3-0.3,0.8,0,1.1C3.7,14.9,3.9,15,4.1,15z"/></svg></a>
\t\t\t
\t\t</nav>`;
      html = html.replace(/<nav class="ct-pagination"[\s\S]*?<\/nav>/i, block);
    }

    // 第 3 页（产品/技术）：prev → 2.html，页码 2 → 2.html
    if (pageNum === 3 && (sec === '产品' || sec === '技术')) {
      html = html.replace(
        /(<nav class="ct-pagination"[\s\S]*?<\/nav>)/i,
        (nav) =>
          nav
            .replace(/rel="prev" href="[^"]*"/i, 'rel="prev" href="2.html"')
            .replace(
              /<a class="page-numbers" href="[^"]*">2<\/a>/i,
              '<a class="page-numbers" href="2.html">2</a>',
            ),
      );
    }

    // 新闻 3、4 页：修正第 2 页链接与 prev
    if (sec === '新闻' && pageNum >= 3) {
      html = html.replace(
        /(<nav class="ct-pagination"[\s\S]*?<\/nav>)/i,
        (nav) => {
          let n = nav.replace(
            /<a class="page-numbers" href="[^"]*">2<\/a>/i,
            '<a class="page-numbers" href="2.html">2</a>',
          );
          if (pageNum === 3) {
            n = n.replace(/rel="prev" href="[^"]*"/i, 'rel="prev" href="2.html"');
          }
          return n;
        },
      );
    }

    // head rel prev/next
    if (pageNum === 2) {
      html = html.replace(/<link rel="prev" href="[^"]*"/i, `<link rel="prev" href="${listHref}"`);
      html = html.replace(/<link rel="next" href="[^"]*"/i, '<link rel="next" href="3.html"');
    }
    if (pageNum === 3) {
      html = html.replace(/<link rel="prev" href="[^"]*"/i, '<link rel="prev" href="2.html"');
      if (cfg.max > 3) {
        html = html.replace(/<link rel="next" href="[^"]*"/i, '<link rel="next" href="4.html"');
      } else {
        html = html.replace(/<link rel="next"[^>]*>\s*/i, '');
      }
    }

    // 面包屑：position / url 误指文章或 index
    html = html.replace(
      /itemprop="position" content="\.\.\/\.\.\/2024-我们的春节假期-html\.html"/gi,
      `itemprop="position" content="${pageNum}"`,
    );
    html = html.replace(
      /<meta itemprop="url" content="\.\.\/\.\.\/index\.html"\/>/gi,
      `<meta itemprop="url" content="${listHref}"/>`,
    );

    if (html !== orig) {
      fs.writeFileSync(fp, html, 'utf8');
      fixes.push(`${sec}/页码/${ent}`);
    }
  }
}

console.log('分页导航修正:', fixes.join(', ') || '无');
