/**
 * 从各语言 index.html 的 menu-item-ID 对齐，将英文栏目 href 替换为本语言路径
 */
import fs from 'fs';
import path from 'path';

const root = path.resolve('c:/My Websites/baoz/www.npackpm.com');
const LANGS = ['de', 'fr', 'es', 'it', 'ru', 'pl', 'pt', 'zh'];

const enIndex = path.join(root, 'index.html');
const enHtml = fs.readFileSync(enIndex, 'utf8');

/** menu-item-1234 -> href */
function extractMenuHrefs(html) {
  const map = new Map();
  const re = /menu-item-(\d+)[^>]*>[\s\S]*?<a\s+[^>]*href=(["'])([^"']+)\2/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    const id = m[1];
    let href = m[3];
    if (/^(https?:|#|mailto:|javascript:)/i.test(href) || href.includes('wp-content')) continue;
    map.set(id, href);
  }
  return map;
}

const enMenu = extractMenuHrefs(enHtml);
const report = { langs: {}, totalRepl: 0, files: 0 };

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

for (const lang of LANGS) {
  const langIndex = path.join(root, lang, 'index.html');
  if (!fs.existsSync(langIndex)) continue;
  const langMenu = extractMenuHrefs(fs.readFileSync(langIndex, 'utf8'));
  const replacements = [];
  for (const [id, enHref] of enMenu) {
    const langHref = langMenu.get(id);
    if (!langHref || langHref === enHref) continue;
    replacements.push({ from: enHref, to: langHref });
  }
  // 更长路径优先
  replacements.sort((a, b) => b.from.length - a.from.length);
  report.langs[lang] = replacements.length;

  function walk(d) {
    for (const ent of fs.readdirSync(d, { withFileTypes: true })) {
      const f = path.join(d, ent.name);
      if (ent.isDirectory() && ent.name !== 'wp-json') walk(f);
      else if (ent.name.endsWith('.html')) {
        let html = fs.readFileSync(f, 'utf8');
        const orig = html;
        for (const { from, to } of replacements) {
          const re = new RegExp(`(href=(["']))${escapeRe(from)}\\2`, 'gi');
          html = html.replace(re, `$1${to}$2`);
        }
        if (html !== orig) {
          fs.writeFileSync(f, html, 'utf8');
          report.files++;
        }
      }
    }
  }
  walk(path.join(root, lang));
}

// 栏目硬编码兜底
const COLUMN_FALLBACK = {
  de: { 'about-us.html': 'uber-uns.html', 'about-us/': 'uber-uns/', 'news.html': 'nachrichten.html', 'product.html': 'produkt.html', 'services.html': 'dienstleistungen.html', 'contact.html': 'kontakt.html', 'technology.html': 'technologie.html', 'bottling-solutions.html': 'abfulllosungen.html' },
  fr: { 'about-us.html': 'a-propos.html', 'about-us/': 'a-propos/', 'news.html': 'nouvelles.html', 'product.html': 'produit.html' },
  es: { 'about-us.html': 'sobre-nosotros.html', 'about-us/': 'sobre-nosotros/', 'news.html': 'noticias.html', 'product.html': 'producto.html' },
  it: { 'about-us.html': 'chi-siamo.html', 'about-us/': 'chi-siamo/', 'news.html': 'notizie.html', 'product.html': 'prodotto.html' },
  pl: { 'about-us.html': 'o-nas.html', 'about-us/': 'o-nas/', 'news.html': 'wiadomosci.html', 'product.html': 'produkt.html', 'services.html': 'uslugi.html', 'contact.html': 'kontakt.html', 'technology.html': 'technologia.html', 'bottling-solutions.html': 'rozwiazania-do-rozlewu.html' },
  pt: { 'about-us.html': 'sobre-nos.html', 'about-us/': 'sobre-nos/', 'news.html': 'noticias.html', 'product.html': 'produto.html' },
  ru: { 'news.html': 'новости.html' },
  zh: { 'about-us.html': '关于我们.html', 'about-us/': '关于我们/', 'news.html': '新闻.html', 'product.html': '产品.html' },
};

for (const lang of LANGS) {
  const fb = COLUMN_FALLBACK[lang];
  if (!fb) continue;
  const entries = Object.entries(fb).sort((a, b) => b[0].length - a[0].length);
  function walk(d) {
    for (const ent of fs.readdirSync(d, { withFileTypes: true })) {
      const f = path.join(d, ent.name);
      if (ent.isDirectory() && ent.name !== 'wp-json') walk(f);
      else if (ent.name.endsWith('.html')) {
        let html = fs.readFileSync(f, 'utf8');
        const orig = html;
        for (const [from, to] of entries) {
          html = html.replace(new RegExp(`(href=(["']))${escapeRe(from)}`, 'gi'), `$1${to}$2`);
        }
        if (html !== orig) {
          fs.writeFileSync(f, html, 'utf8');
          report.files++;
          report.totalRepl++;
        }
      }
    }
  }
  walk(path.join(root, lang));
}

const text = `菜单 ID 导航修复\n${JSON.stringify(report, null, 2)}\n`;
fs.writeFileSync(path.join(root, 'fix_nav_menu_id_report.txt'), text, 'utf8');
console.log(text);
