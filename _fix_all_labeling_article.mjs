/**
 * 全语言修复 post-3663 工业贴标机：详情页 + 新闻/技术列表封面与链接
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const siteRoot = path.dirname(fileURLToPath(import.meta.url));
const enFile = path.join(siteRoot, 'industrial-labeling-machine.html');
const enHtml = fs.readFileSync(enFile, 'utf8');
const THUMB = 'wp-content/uploads/2025/10/2025101701434987.jpg';

const LANGS = [
  {
    code: 'zh',
    subdir: 'zh',
    file: '工业贴标机-html.html',
    liveUrl: 'https://www.npackpm.com/zh/%E5%B7%A5%E4%B8%9A%E8%B4%B4%E6%A0%87%E6%9C%BA-html/',
    title: '工业贴标机',
    lang: 'zh-CN',
    techPage: '技术.html',
    skipFetch: false,
  },
  {
    code: 'it',
    subdir: 'it',
    file: 'etichettatrice-industriale-html.html',
    liveUrl: 'https://www.npackpm.com/it/etichettatrice-industriale-html/',
    title: 'Etichettatrice industriale',
    lang: 'it-IT',
    techPage: 'tecnologia.html',
  },
  {
    code: 'pl',
    subdir: 'pl',
    file: 'przemyslowa-maszyna-etykietujaca-html.html',
    liveUrl: 'https://www.npackpm.com/pl/przemyslowa-maszyna-etykietujaca-html/',
    title: 'Przemysłowa maszyna do etykietowania',
    lang: 'pl-PL',
    techPage: 'technologia.html',
  },
  {
    code: 'fr',
    subdir: 'fr',
    file: 'machine-a-etiqueter-industrielle-html.html',
    liveUrl: 'https://www.npackpm.com/fr/machine-a-etiqueter-industrielle-html/',
    title: 'Machine à étiqueter industrielle',
    lang: 'fr-FR',
    techPage: 'technologie.html',
  },
  {
    code: 'de',
    subdir: 'de',
    file: 'industrielle-etikettiermaschine-html.html',
    liveUrl: 'https://www.npackpm.com/de/industrielle-etikettiermaschine-html/',
    title: 'Industrielle Etikettiermaschine',
    lang: 'de-DE',
    techPage: 'technologie.html',
  },
  {
    code: 'es',
    subdir: 'es',
    file: 'etiquetadora-industrial-html.html',
    liveUrl: 'https://www.npackpm.com/es/etiquetadora-industrial-html/',
    title: 'Etiquetadora industrial',
    lang: 'es-ES',
    techPage: 'tecnologia.html',
  },
  {
    code: 'ru',
    subdir: 'ru',
    file: 'industrial-labeling-machine.html',
    liveUrl: 'https://www.npackpm.com/ru/industrial-labeling-machine.html',
    title: 'Промышленная этикетировочная машина',
    lang: 'ru-RU',
    techPage: 'технология.html',
  },
];

const LISTINGS = [
  // EN root
  { file: 'news/page/3.html', href: '../../industrial-labeling-machine.html', img: '../../' },
  { file: 'technology/page/2.html', href: '../../industrial-labeling-machine.html', img: '../../' },
  // ZH
  { file: 'zh/新闻/页码/3.html', href: '../../工业贴标机-html.html', img: '../../../', title: '工业贴标机' },
  { file: 'zh/技术/页码/2.html', href: '../../工业贴标机-html.html', img: '../../../', title: '工业贴标机' },
  { file: 'zh/技术/页码/2-2.html', href: '../../工业贴标机-html.html', img: '../../../', title: '工业贴标机' },
  // PT (already fixed, re-apply safe)
  {
    file: 'pt/noticias/pagina/3.html',
    href: '../../maquina-de-etiquetagem-industrial-html.html',
    img: '../../../',
    title: 'Máquina de etiquetagem industrial',
  },
  {
    file: 'pt/tecnologia/pagina/2.html',
    href: '../../maquina-de-etiquetagem-industrial-html.html',
    img: '../../../',
    title: 'Máquina de etiquetagem industrial',
  },
  // IT
  {
    file: 'it/notizie/pagina/3.html',
    href: '../../etichettatrice-industriale-html.html',
    img: '../../../',
    title: 'Etichettatrice industriale',
  },
  {
    file: 'it/tecnologia/pagina/2.html',
    href: '../../etichettatrice-industriale-html.html',
    img: '../../../',
    title: 'Etichettatrice industriale',
  },
  // PL
  {
    file: 'pl/wiadomosci/strona/3.html',
    href: '../../przemyslowa-maszyna-etykietujaca-html.html',
    img: '../../../',
    title: 'Przemysłowa maszyna do etykietowania',
  },
  {
    file: 'pl/technologia/strona/2.html',
    href: '../../przemyslowa-maszyna-etykietujaca-html.html',
    img: '../../../',
    title: 'Przemysłowa maszyna do etykietowania',
  },
  // FR
  {
    file: 'fr/nouvelles/page/3.html',
    href: '../../machine-a-etiqueter-industrielle-html.html',
    img: '../../../',
    title: 'Machine à étiqueter industrielle',
  },
  {
    file: 'fr/technologie/page/2.html',
    href: '../../machine-a-etiqueter-industrielle-html.html',
    img: '../../../',
    title: 'Machine à étiqueter industrielle',
  },
  // DE
  {
    file: 'de/nachrichten/seite/3.html',
    href: '../../industrielle-etikettiermaschine-html.html',
    img: '../../../',
    title: 'Industrielle Etikettiermaschine',
  },
  {
    file: 'de/technologie/seite/2.html',
    href: '../../industrielle-etikettiermaschine-html.html',
    img: '../../../',
    title: 'Industrielle Etikettiermaschine',
  },
  // ES
  {
    file: 'es/noticias/pagina/3.html',
    href: '../../etiquetadora-industrial-html.html',
    img: '../../../',
    title: 'Etiquetadora industrial',
  },
  {
    file: 'es/tecnologia/pagina/2.html',
    href: '../../etiquetadora-industrial-html.html',
    img: '../../../',
    title: 'Etiquetadora industrial',
  },
  // RU
  {
    file: 'ru/новости/страница/3.html',
    href: '../../industrial-labeling-machine.html',
    img: '../../../',
    title: 'Промышленная этикетировочная машина',
  },
  {
    file: 'ru/технология/страница/2.html',
    href: '../../industrial-labeling-machine.html',
    img: '../../../',
    title: 'Промышленная этикетировочная машина',
  },
  {
    file: 'ru/технология/страница/2-2.html',
    href: '../../industrial-labeling-machine.html',
    img: '../../../',
    title: 'Промышленная этикетировочная машина',
  },
];

function localizePaths(html, inSubdir) {
  if (!inSubdir) return html;
  html = html.replace(/(href|src)=(['"])\.\.\/wp-/g, '$1=$2__KEEP_WP__');
  html = html.replace(/(href|src)=(['"])wp-/g, '$1=$2../wp-');
  return html.replace(/__KEEP_WP__/g, '../wp-');
}

function localizeContent(raw, cfg) {
  const prefix = cfg.subdir ? `${cfg.subdir}/` : '';
  return (
    raw
      .replace(/https:\/\/www\.npackpm\.com\/wp-content\//g, '../wp-content/')
      .replace(new RegExp(`https:\\/\\/www\\.npackpm\\.com\\/${prefix.replace('/', '\\/')}?`, 'g'), '')
      .replace(/https:\/\/www\.npackpm\.com\//g, '')
      .replace(/\bNpack\b/gi, 'KIWL')
      .replace(/\bNPACK\b/g, 'KIWL')
      .replace(/shanghai/gi, 'Jiangsu')
      .replace(/上海/g, '江苏')
      .replace(/Xangai/gi, 'Jiangsu')
      // ensure local .html on common internal links missing extension
      .replace(/href="([^"]+?)(?<!\.\w{2,4})"(?=[^>]*(?:data-type|target|rel))/g, (m, p) => {
        if (p.startsWith('http') || p.startsWith('#') || p.includes('.')) return m;
        return `href="${p}.html"`;
      })
  );
}

function extractArticle(srcHtml) {
  const content = srcHtml.match(
    /<div class="entry-content is-layout-flow">([\s\S]*?)<\/div>\s*<nav class="post-navigation/,
  );
  const nav = srcHtml.match(/<nav class="post-navigation[\s\S]*?<\/nav>/);
  const metaDesc = srcHtml.match(/<meta name="description" content="([^"]+)"/)?.[1];
  const h1 = srcHtml.match(/<h1[^>]*class="page-title"[^>]*>([^<]+)/)?.[1]?.trim();
  if (!content || !nav) return null;
  return { content: content[1], nav: nav[0], metaDesc, h1 };
}

async function fetchLive(url) {
  const r = await fetch(url, {
    redirect: 'follow',
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; KIWL-fix/1.0)' },
  });
  if (!r.ok) throw new Error(`HTTP ${r.status} for ${url}`);
  const html = await r.text();
  if (!html.includes('post-3663') && !html.includes('entry-content is-layout-flow')) {
    throw new Error(`No article body at ${url}`);
  }
  return html;
}

function buildDetailPage(cfg, article) {
  let html = enHtml;
  const outFile = cfg.file;
  const inSubdir = !!cfg.subdir;

  if (inSubdir) {
    html = localizePaths(html, true);
  }

  html = html.replace(/industrial-labeling-machine\.html/g, outFile);
  html = html.replace(/Industrial labeling machine/g, cfg.title);

  if (article.metaDesc) {
    const desc = article.metaDesc.replace(/\bNpack\b/gi, 'KIWL').replace(/"/g, '&quot;');
    html = html.replace(/<meta name="description" content="[^"]+"/, `<meta name="description" content="${desc}"`);
  }

  const body = localizeContent(article.content, cfg).trim();
  const nav = localizeContent(article.nav, cfg);
  html = html.replace(
    /<div class="entry-content is-layout-flow">[\s\S]*?<\/div>\s*<nav class="post-navigation[\s\S]*?<\/nav>/,
    `<div class="entry-content is-layout-flow">\n${body}\n\t\t</div>\n\n\t\t\n\t\t\n\t\t\n\t\t${nav}`,
  );

  html = html.replace(/lang="en-US"/g, `lang="${cfg.lang}"`);
  html = html.replace(/inLanguage":"en-US"/g, `inLanguage":"${cfg.lang}"`);
  html = html.replace(/technology\.html/g, cfg.techPage);

  html = html.replace(
    /href="\.\.\/wp-content\/uploads\/2025\/10\/2025101703373022\.webp"/,
    `href="../wp-content/uploads/2025/10/2025101701434987.jpg"`,
  );
  html = html.replace(
    /href="wp-content\/uploads\/2025\/10\/2025101703373022\.webp"/,
    `href="wp-content/uploads/2025/10/2025101701434987.jpg"`,
  );

  return html;
}

function thumbBlock(href, imgPrefix, title) {
  const alt = title.replace(/"/g, '&quot;');
  return `<a class="ct-media-container boundless-image has-hover-effect" href="${href}" aria-label="${alt}"><img loading="lazy" width="640" height="360" src="${imgPrefix}${THUMB}" class="attachment-medium_large size-medium_large wp-post-image" alt="${alt}" decoding="async" title="${alt}" itemprop="image" style="aspect-ratio: 4/3;" /></a>`;
}

function fixListing(relPath, href, imgPrefix, title) {
  const fp = path.join(siteRoot, relPath);
  if (!fs.existsSync(fp)) {
    console.warn(`  SKIP missing listing: ${relPath}`);
    return false;
  }
  let html = fs.readFileSync(fp, 'utf8');
  const re =
    /<article class="entry-card card-content post-3663 post type-post status-publish format-standard([^"]*)"([^>]*)>([\s\S]*?)<\/article>/;
  const m = html.match(re);
  if (!m) {
    console.warn(`  SKIP no post-3663 in ${relPath}`);
    return false;
  }

  let attrs = m[1];
  let inner = m[3];

  if (!attrs.includes('has-post-thumbnail')) {
    attrs = ` has-post-thumbnail${attrs}`;
  }

  if (!inner.includes('ct-media-container')) {
    inner = thumbBlock(href, imgPrefix, title) + inner;
  }

  inner = inner.replace(/<h2 class="entry-title"><a href="[^"]*"/, `<h2 class="entry-title"><a href="${href}"`);
  if (inner.includes('ct-media-container')) {
    inner = inner.replace(
      /<a class="ct-media-container[^"]*"[^>]*href="[^"]*"/,
      `<a class="ct-media-container boundless-image has-hover-effect" href="${href}"`,
    );
  }

  const replaced = `<article class="entry-card card-content post-3663 post type-post status-publish format-standard${attrs}"${m[2]}>${inner}</article>`;
  html = html.replace(re, replaced);
  fs.writeFileSync(fp, html, 'utf8');
  return true;
}

const report = { details: [], listings: [] };

for (const cfg of LANGS) {
  const outPath = path.join(siteRoot, cfg.subdir || '.', cfg.file);
  try {
    console.log(`Fetching ${cfg.code}: ${cfg.liveUrl}`);
    const live = await fetchLive(cfg.liveUrl);
    const article = extractArticle(live);
    if (!article) throw new Error('extract failed');
    if (article.h1) cfg.title = article.h1;
    const html = buildDetailPage(cfg, article);
    fs.writeFileSync(outPath, html, 'utf8');
    const ok = !html.includes('Click here') && html.includes('entry-content is-layout-flow');
    report.details.push({ code: cfg.code, file: cfg.file, ok });
    console.log(`  Wrote ${cfg.file} (${ok ? 'OK' : 'CHECK'})`);
  } catch (e) {
    report.details.push({ code: cfg.code, file: cfg.file, ok: false, err: e.message });
    console.error(`  FAIL ${cfg.code}: ${e.message}`);
  }
}

console.log('\nFixing listings...');
for (const row of LISTINGS) {
  const title = row.title || 'Industrial labeling machine';
  const ok = fixListing(row.file, row.href, row.img, title);
  report.listings.push({ file: row.file, ok });
  console.log(`  ${ok ? 'OK' : 'SKIP'} ${row.file}`);
}

const reportPath = path.join(siteRoot, '_labeling_article_fix_report.txt');
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');
console.log(`\nReport: ${reportPath}`);
