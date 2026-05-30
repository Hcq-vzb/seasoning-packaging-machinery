import fs from 'fs';
import path from 'path';

const root = path.resolve('c:/My Websites/baoz/www.npackpm.com');
const LANGS = ['de', 'fr', 'es', 'it', 'ru', 'pl', 'pt', 'zh'];
let fixed = 0;

function rel(from, toRel) {
  return path.relative(path.dirname(from), path.join(root, toRel)).replace(/\\/g, '/');
}

for (const lang of LANGS) {
  const indexFile = path.join(root, lang, 'index.html');
  if (!fs.existsSync(indexFile)) continue;
  let c = fs.readFileSync(indexFile, 'utf8');
  const o = c;

  // 语言首页导航/Logo：指向本语言首页 index.html（保留 hreflang/语言切换里的 ../index.html）
  c = c.replace(/menu-item-home[^>]*><a href="\.\.\/index\.html"/gi, (m) => m.replace('../index.html', 'index.html'));
  c = c.replace(/class="site-logo-container"[^>]*href="\.\.\/index\.html"/gi, (m) => m.replace('../index.html', 'index.html'));
  c = c.replace(/rel="home"[^>]*href="\.\.\/index\.html"/gi, (m) => m.replace('../index.html', 'index.html'));

  // hreflang 英文 → 根目录首页
  const enHome = rel(indexFile, 'index.html');
  c = c.replace(
    /<link rel="alternate" hreflang="en(-US)?" href="index\.html"\/>/gi,
    (_, us) => `<link rel="alternate" hreflang="en${us || ''}" href="${enHome}"/>`
  );
  // 当前语言 hreflang
  const langTag = lang === 'zh' ? 'zh-CN' : `${lang}-${lang.toUpperCase()}`;
  c = c.replace(
    new RegExp(`<link rel="alternate" hreflang="${langTag}" href="\\.\\./index\\.html"\\/>`, 'gi'),
    `<link rel="alternate" hreflang="${langTag}" href="index.html"/>`
  );
  c = c.replace(
    new RegExp(`<link rel="alternate" hreflang="${lang}" href="\\.\\./index\\.html"\\/>`, 'gi'),
    `<link rel="alternate" hreflang="${lang}" href="index.html"/>`
  );

  // canonical / og:url 指向 pl.html 等错误
  c = c.replace(/href="\.\.\/\.\.\/[^"]+\.html"/g, (m) => {
    if (/canonical|og:url/.test(c.slice(Math.max(0, c.indexOf(m) - 80), c.indexOf(m)))) {
      return 'href="index.html"';
    }
    return m;
  });
  c = c.replace(/content="\.\.\/\.\.\/[^"]+\.html"/g, 'content="index.html"');

  // Logo 链到本语言首页
  c = c.replace(/(<a\s+[^>]*class="site-logo-container"[^>]*href=")\.\.\/index\.html(")/gi, '$1index.html$2');

  if (c !== o) {
    fs.writeFileSync(indexFile, c, 'utf8');
    fixed++;
    console.log('polished', lang + '/index.html');
  }
}

// 新闻/技术分页：hreflang 当前语言 → 同目录页码文件
const pagePatterns = [
  /[/\\](seite|page|pagina|strona|页码|страница)[/\\](\d+)\.html$/i,
];
function walkNewsPages(dir) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) walkNewsPages(full);
    else if (ent.name.endsWith('.html')) {
      const rel = path.relative(root, full).replace(/\\/g, '/');
      const m = rel.match(/\/(seite|page|pagina|strona|页码|страница)\/(\d+)\.html$/i);
      if (!m) continue;
      const lang = rel.split('/')[0];
      if (!LANGS.includes(lang)) continue;
      let c = fs.readFileSync(full, 'utf8');
      const o = c;
      const pageFile = `${m[2]}.html`;
      const langUpper = lang === 'zh' ? 'zh-CN' : `${lang}-${lang.toUpperCase()}`;

      c = c.replace(
        new RegExp(`<link rel="alternate" hreflang="${langUpper}" href="[^"]+"\\/>`, 'i'),
        `<link rel="alternate" hreflang="${langUpper}" href="${pageFile}"/>`
      );
      c = c.replace(
        new RegExp(`<link rel="alternate" hreflang="${lang}" href="[^"]+"\\/>`, 'i'),
        `<link rel="alternate" hreflang="${lang}" href="${pageFile}"/>`
      );

      // 分页链接：同目录 N.html（去掉错误的多余 ../）
      const n = parseInt(m[2], 10);
      c = c.replace(new RegExp(`href="(?:\\.\\./)+${n + 1}\\.html"`, 'g'), `href="${n + 1}.html"`);
      c = c.replace(new RegExp(`href="(?:\\.\\./)+${n - 1}\\.html"`, 'g'), `href="${n - 1}.html"`);
      if (n > 2) c = c.replace(/rel="prev" href="[^"]+"/, `rel="prev" href="${n - 1}.html"`);
      if (n === 2) {
        const listRel = relFromList(full, lang, rel);
        c = c.replace(/rel="prev" href="[^"]+"/, `rel="prev" href="${listRel}"`);
      }
      c = c.replace(/rel="next" href="[^"]+"/, `rel="next" href="${n + 1}.html"`);
      c = c.replace(/page-numbers[^>]*href="(?:\.\.\/)+(\d+)\.html"/g, 'page-numbers" href="$1.html"');
      c = c.replace(/class="next page-numbers"[^>]*href="(?:\.\.\/)+(\d+)\.html"/g, 'class="next page-numbers" rel="next" href="$1.html"');

      if (c !== o) {
        fs.writeFileSync(full, c, 'utf8');
        fixed++;
        console.log('page', rel);
      }
    }
  }
}

function relFromList(pageFile, lang, rel) {
  const dir = path.dirname(pageFile);
  const candidates = ['nachrichten.html', 'nouvelles.html', 'notizie.html', 'noticias.html', 'wiadomosci.html', 'news.html', '技术.html', 'новости.html'];
  for (const name of candidates) {
    const p = path.join(root, lang, name);
    if (fs.existsSync(p)) return path.relative(dir, p).replace(/\\/g, '/');
  }
  return '../../' + lang + '.html';
}

walkNewsPages(root);
console.log('Total polished:', fixed);
