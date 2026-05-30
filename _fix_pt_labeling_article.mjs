/**
 * 修复 PT 工业贴标机新闻详情页 + 列表封面
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const siteRoot = path.dirname(fileURLToPath(import.meta.url));
const enFile = path.join(siteRoot, 'industrial-labeling-machine.html');
const ptFile = path.join(siteRoot, 'pt', 'maquina-de-etiquetagem-industrial-html.html');
const ptSrc = path.join(siteRoot, '_pt_article_temp.html');

const ptSrcHtml = fs.readFileSync(ptSrc, 'utf8');
let html = fs.readFileSync(enFile, 'utf8');

function localizePtContent(raw) {
  return raw
    .replace(/https:\/\/www\.npackpm\.com\/wp-content\//g, '../wp-content/')
    .replace(/https:\/\/www\.npackpm\.com\/pt\//g, '')
    .replace(/\bNpack\b/gi, 'KIWL')
    .replace(/\bNPACK\b/g, 'KIWL')
    .replace(/Xangai/gi, 'Jiangsu')
    .replace(/Shanghai/gi, 'Jiangsu')
    .replace(/maquina-de-enchimento-de-tambor-html/g, 'drum-filling-machine.html')
    .replace(/equipamentos-de-processamento-de-mel-html/g, 'honey-processing-equipments.html')
    .replace(/href="maquina-de-etiquetar-2"/g, 'href="maquina-de-etiquetar-2.html"')
    .replace(/href="maquina-de-etiquetar-sacos"/g, 'href="maquina-de-etiquetar-sacos.html"')
    .replace(
      /href="maquina-de-rotulagem-vertical-para-embalagem-de-garrafas-redondas"/g,
      'href="maquina-de-rotulagem-vertical-para-embalagem-de-garrafas-redondas.html"',
    )
    .replace(/href="maquina-de-etiquetar-frente-e-verso"/g, 'href="maquina-de-etiquetar-frente-e-verso.html"');
}

const ptContent = ptSrcHtml.match(
  /<div class="entry-content is-layout-flow">([\s\S]*?)<\/div>\s*<nav class="post-navigation/,
);
const ptNav = ptSrcHtml.match(/<nav class="post-navigation[\s\S]*?<\/nav>/);

if (!ptContent || !ptNav) throw new Error('Failed to extract PT article content');

// paths: pt/ subdirectory
html = html.replace(/(href|src)=(['"])\.\.\/wp-/g, '$1=$2__KEEP_WP__');
html = html.replace(/(href|src)=(['"])wp-/g, '$1=$2../wp-');
html = html.replace(/__KEEP_WP__/g, '../wp-');

html = html.replace(/industrial-labeling-machine\.html/g, 'maquina-de-etiquetagem-industrial-html.html');
html = html.replace(/Industrial labeling machine/g, 'Máquina de etiquetagem industrial');

const ptMetaDesc = ptSrcHtml.match(/<meta name="description" content="([^"]+)"/)?.[1];
if (ptMetaDesc) {
  html = html.replace(
    /<meta name="description" content="[^"]+"/,
    `<meta name="description" content="${ptMetaDesc.replace(/\bNpack\b/gi, 'KIWL').replace(/"/g, '&quot;')}"`,
  );
}

html = html.replace(
  /<div class="entry-content is-layout-flow">[\s\S]*?<\/div>\s*<nav class="post-navigation[\s\S]*?<\/nav>/,
  `<div class="entry-content is-layout-flow">\n${localizePtContent(ptContent[1]).trim()}\n\t\t</div>\n\n\t\t\n\t\t\n\t\t\n\t\t${localizePtContent(ptNav[0])}`,
);

html = html.replace(/lang="en-US"/g, 'lang="pt-PT"');
html = html.replace(/inLanguage":"en-US"/g, 'inLanguage":"pt-PT"');
html = html.replace(/technology\.html/g, 'tecnologia.html');
html = html.replace(/Previous <span>Post<\/span>/g, '<span>Artigo</span> anterior');
html = html.replace(/Next <span>Post<\/span>/g, 'Próximo <span>Artigo</span>');
html = html.replace(/Drum Filling Machine/g, 'Máquina de enchimento de tambor');
html = html.replace(/Honey Processing Equipments and related machines/g, 'Equipamentos de processamento de mel e máquinas conexas');

fs.writeFileSync(ptFile, html, 'utf8');

// 修复新闻/技术列表封面
const thumbSnippet = (hrefPrefix, imgPrefix) =>
  `<a class="ct-media-container boundless-image has-hover-effect" href="${hrefPrefix}maquina-de-etiquetagem-industrial-html.html" aria-label="Máquina de etiquetagem industrial"><img loading="lazy" width="640" height="360" src="${imgPrefix}wp-content/uploads/2025/10/2025101701434987.jpg" class="attachment-medium_large size-medium_large wp-post-image" alt="Máquina de etiquetagem industrial" decoding="async" title="Máquina de etiquetagem industrial" itemprop="image" style="aspect-ratio: 4/3;" /></a>`;

const listingFiles = [
  ['pt/noticias/pagina/3.html', '../../', '../../../'],
  ['pt/tecnologia/pagina/2.html', '../../', '../../../'],
];

let listingFixed = 0;
for (const [rel, hrefPrefix, imgPrefix] of listingFiles) {
  const fp = path.join(siteRoot, rel);
  let listHtml = fs.readFileSync(fp, 'utf8');
  const old =
    '<article class="entry-card card-content post-3663 post type-post status-publish format-standard hentry category-technology" ><div class="entry-divider"';
  const neu = `<article class="entry-card card-content post-3663 post type-post status-publish format-standard has-post-thumbnail hentry category-technology" >${thumbSnippet(hrefPrefix, imgPrefix)}<div class="entry-divider"`;
  if (listHtml.includes(old)) {
    listHtml = listHtml.replace(old, neu);
    fs.writeFileSync(fp, listHtml, 'utf8');
    listingFixed++;
  }
}

console.log(`Detail page written: ${ptFile}`);
console.log(`Listing pages fixed: ${listingFixed}`);
