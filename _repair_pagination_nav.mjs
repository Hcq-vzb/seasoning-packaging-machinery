/**
 * 修复被误伤的 ct-pagination 导航 HTML
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const siteRoot = path.dirname(fileURLToPath(import.meta.url));
const LANG_SECTIONS = {
  en: [
    { sectionDir: 'product', pageFolder: 'page', listPage: 'product.html', maxPage: 3, prevLabel: 'Prev', nextLabel: 'Next' },
    { sectionDir: 'news', pageFolder: 'page', listPage: 'news.html', maxPage: 4, prevLabel: 'Prev', nextLabel: 'Next' },
    { sectionDir: 'technology', pageFolder: 'page', listPage: 'technology.html', maxPage: 3, prevLabel: 'Prev', nextLabel: 'Next' },
  ],
  zh: [
    { sectionDir: '产品', pageFolder: '页码', listPage: '产品.html', maxPage: 3, prevLabel: '上一个', nextLabel: '下一个' },
    { sectionDir: '新闻', pageFolder: '页码', listPage: '新闻.html', maxPage: 4, prevLabel: '上一个', nextLabel: '下一个' },
    { sectionDir: '技术', pageFolder: '页码', listPage: '技术.html', maxPage: 3, prevLabel: '上一个', nextLabel: '下一个' },
  ],
  de: [
    { sectionDir: 'produkt', pageFolder: 'seite', listPage: 'produkt.html', maxPage: 3, prevLabel: 'Zurück', nextLabel: 'Weiter' },
    { sectionDir: 'nachrichten', pageFolder: 'seite', listPage: 'nachrichten.html', maxPage: 4, prevLabel: 'Zurück', nextLabel: 'Weiter' },
    { sectionDir: 'technologie', pageFolder: 'seite', listPage: 'technologie.html', maxPage: 3, prevLabel: 'Zurück', nextLabel: 'Weiter' },
  ],
  fr: [
    { sectionDir: 'produit', pageFolder: 'page', listPage: 'produit.html', maxPage: 3, prevLabel: 'Précédent', nextLabel: 'Suivant' },
    { sectionDir: 'nouvelles', pageFolder: 'page', listPage: 'nouvelles.html', maxPage: 4, prevLabel: 'Précédent', nextLabel: 'Suivant' },
    { sectionDir: 'technologie', pageFolder: 'page', listPage: 'technologie.html', maxPage: 3, prevLabel: 'Précédent', nextLabel: 'Suivant' },
  ],
  es: [
    { sectionDir: 'producto', pageFolder: 'pagina', listPage: 'producto.html', maxPage: 3, prevLabel: 'Anterior', nextLabel: 'Siguiente' },
    { sectionDir: 'noticias', pageFolder: 'pagina', listPage: 'noticias.html', maxPage: 4, prevLabel: 'Anterior', nextLabel: 'Siguiente' },
    { sectionDir: 'tecnologia', pageFolder: 'pagina', listPage: 'tecnologia.html', maxPage: 3, prevLabel: 'Anterior', nextLabel: 'Siguiente' },
  ],
  it: [
    { sectionDir: 'prodotto', pageFolder: 'pagina', listPage: 'prodotto.html', maxPage: 3, prevLabel: 'Precedente', nextLabel: 'Successivo' },
    { sectionDir: 'notizie', pageFolder: 'pagina', listPage: 'notizie.html', maxPage: 4, prevLabel: 'Precedente', nextLabel: 'Successivo' },
    { sectionDir: 'tecnologia', pageFolder: 'pagina', listPage: 'tecnologia.html', maxPage: 3, prevLabel: 'Precedente', nextLabel: 'Successivo' },
  ],
  ru: [
    { sectionDir: 'продукт', pageFolder: 'страница', listPage: 'продукт.html', maxPage: 3, prevLabel: 'Назад', nextLabel: 'Далее' },
    { sectionDir: 'новости', pageFolder: 'страница', listPage: 'новости.html', maxPage: 4, prevLabel: 'Назад', nextLabel: 'Далее' },
    { sectionDir: 'технология', pageFolder: 'страница', listPage: 'технология.html', maxPage: 3, prevLabel: 'Назад', nextLabel: 'Далее' },
  ],
  pl: [
    { sectionDir: 'produkt', pageFolder: 'strona', listPage: 'produkt.html', maxPage: 3, prevLabel: 'Poprzednia', nextLabel: 'Następna' },
    { sectionDir: 'wiadomosci', pageFolder: 'strona', listPage: 'wiadomosci.html', maxPage: 4, prevLabel: 'Poprzednia', nextLabel: 'Następna' },
    { sectionDir: 'technologia', pageFolder: 'strona', listPage: 'technologia.html', maxPage: 3, prevLabel: 'Poprzednia', nextLabel: 'Następna' },
  ],
  pt: [
    { sectionDir: 'produto', pageFolder: 'pagina', listPage: 'produto.html', maxPage: 3, prevLabel: 'Anterior', nextLabel: 'Próximo' },
    { sectionDir: 'noticias', pageFolder: 'pagina', listPage: 'noticias.html', maxPage: 4, prevLabel: 'Anterior', nextLabel: 'Próximo' },
    { sectionDir: 'tecnologia', pageFolder: 'pagina', listPage: 'tecnologia.html', maxPage: 3, prevLabel: 'Anterior', nextLabel: 'Próximo' },
  ],
};

const PREV_SVG =
  '<svg width="9px" height="9px" viewBox="0 0 15 15" fill="currentColor"><path d="M10.9,15c-0.2,0-0.4-0.1-0.6-0.2L3.6,8c-0.3-0.3-0.3-0.8,0-1.1l6.6-6.6c0.3-0.3,0.8-0.3,1.1,0c0.3,0.3,0.3,0.8,0,1.1L5.2,7.4l6.2,6.2c0.3,0.3,0.3,0.8,0,1.1C11.3,14.9,11.1,15,10.9,15z"/></svg>';
const NEXT_SVG =
  '<svg width="9px" height="9px" viewBox="0 0 15 15" fill="currentColor"><path d="M4.1,15c0.2,0,0.4-0.1,0.6-0.2L11.4,8c0.3-0.3,0.3-0.8,0-1.1L4.8,0.2C4.5-0.1,4-0.1,3.7,0.2C3.4,0.5,3.4,1,3.7,1.3l6.1,6.1l-6.2,6.2c-0.3,0.3-0.3,0.8,0,1.1C3.7,14.9,3.9,15,4.1,15z"/></svg>';

function buildNav(cfg, pageNum, listHref) {
  const prevHref = pageNum === 2 ? listHref : `${pageNum - 1}.html`;
  const nums = [];
  for (let p = 1; p <= cfg.maxPage; p++) {
    if (p === pageNum) {
      nums.push(`<span aria-current="page" class="page-numbers current">${p}</span>`);
    } else {
      const href = p === 1 ? listHref : `${p}.html`;
      nums.push(`<a class="page-numbers" href="${href}">${p}</a>`);
    }
  }
  const next =
    pageNum < cfg.maxPage
      ? `<a class="next page-numbers" rel="next" href="${pageNum + 1}.html">${cfg.nextLabel} ${NEXT_SVG}</a>`
      : '';
  return `<nav class="ct-pagination" data-pagination="simple"  >
\t\t\t<a class="prev page-numbers" rel="prev" href="${prevHref}">${PREV_SVG}${cfg.prevLabel}</a><div class="ct-hidden-sm">${nums.join('')}</div>${next}
\t\t\t
\t\t</nav>`;
}

function getCfg(lang, rel) {
  const parts = rel.split('/');
  const i = lang === 'en' ? 0 : 1;
  return LANG_SECTIONS[lang]?.find((s) => s.sectionDir === parts[i] && s.pageFolder === parts[i + 1]);
}

let fixed = 0;
for (const lang of Object.keys(LANG_SECTIONS)) {
  for (const sec of LANG_SECTIONS[lang]) {
    const langRoot = lang === 'en' ? siteRoot : path.join(siteRoot, lang);
    const pageDir = path.join(langRoot, sec.sectionDir, sec.pageFolder);
    if (!fs.existsSync(pageDir)) continue;
    const listHref = `../../${sec.listPage}`;

    for (const ent of fs.readdirSync(pageDir)) {
      if (!/^\d+\.html$/.test(ent)) continue;
      const pageNum = parseInt(ent, 10);
      const fp = path.join(pageDir, ent);
      let html = fs.readFileSync(fp, 'utf8');
      if (!/<nav class="ct-pagination"/i.test(html)) continue;

      const orig = html;
      html = html.replace(/<nav class="ct-pagination"[\s\S]*?<\/nav>/i, buildNav(sec, pageNum, listHref));

      if (pageNum === 2) {
        html = html.replace(/<link rel="prev" href="[^"]*"/i, `<link rel="prev" href="${listHref}"`);
        html = html.replace(/<link rel="next" href="[^"]*"/i, '<link rel="next" href="3.html"');
      } else if (pageNum === 3) {
        html = html.replace(/<link rel="prev" href="[^"]*"/i, '<link rel="prev" href="2.html"');
        if (sec.maxPage > 3) {
          html = html.replace(/<link rel="next" href="[^"]*"/i, '<link rel="next" href="4.html"');
        }
      } else if (pageNum === 4) {
        html = html.replace(/<link rel="prev" href="[^"]*"/i, '<link rel="prev" href="3.html"');
        html = html.replace(/\s*<link rel="next"[^>]*>\s*/i, '');
      }

      if (html !== orig) {
        fs.writeFileSync(fp, html, 'utf8');
        fixed++;
      }
    }
  }
}

console.log('Repaired pagination nav in', fixed, 'files');
