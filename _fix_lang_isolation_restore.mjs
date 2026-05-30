/**
 * 恢复多语言菜单 + 修正 hreflang；禁止误改 ct-language-switcher 为 index.html
 */
import fs from 'fs';
import path from 'path';

const root = path.resolve('c:/My Websites/baoz/www.npackpm.com');
const LANG_CODES = ['de', 'fr', 'es', 'it', 'ru', 'pl', 'pt', 'zh'];
const LANG_SET = new Set(LANG_CODES);

const report = {
  switcherFixed: 0,
  hreflangFixed: 0,
  crossLinkFixed: 0,
  npackHomesFixed: 0,
  filesModified: 0,
};

/** 栏目/列表页 hreflang 对照（相对站点根） */
const PAGE_EQUIV = {
  'index.html': {
    en: 'index.html', de: 'de/index.html', fr: 'fr/index.html', es: 'es/index.html',
    it: 'it/index.html', ru: 'ru/index.html', pl: 'pl/index.html', pt: 'pt/index.html', zh: 'zh/index.html',
  },
  'news.html': {
    en: 'news.html', de: 'de/nachrichten.html', fr: 'fr/nouvelles.html', es: 'es/noticias.html',
    it: 'it/notizie.html', ru: 'ru/новости.html', pl: 'pl/wiadomosci.html', pt: 'pt/noticias.html', zh: 'zh/新闻.html',
  },
  'firm-news.html': {
    en: 'firm-news.html', de: 'de/firmennachrichten.html', fr: 'fr/nouvelles-de-lentreprise.html',
    pl: 'pl/wiadomosci-firmowe.html', es: 'es/noticias-de-la-empresa.html', it: 'it/notizie-aziendali.html',
    pt: 'pt/noticias-da-empresa.html', ru: 'ru/новости-компании.html', zh: 'zh/公司新闻.html',
  },
  'industry-news.html': {
    en: 'industry-news.html', de: 'de/branchennachrichten.html', fr: 'fr/nouvelles-de-lindustrie.html',
    pl: 'pl/wiadomosci-branzowe.html', es: 'es/noticias-de-la-industria.html', it: 'it/notizie-di-settore.html',
    pt: 'pt/noticias-do-setor.html', ru: 'ru/отраслевые-новости.html', zh: 'zh/行业新闻.html',
  },
  'technology.html': {
    en: 'technology.html', de: 'de/technologie.html', fr: 'fr/technologie.html', es: 'es/tecnologia.html',
    it: 'it/tecnologia.html', pl: 'pl/technologia.html', pt: 'pt/tecnologia.html', ru: 'ru/технологии.html', zh: 'zh/技术.html',
  },
  'product.html': {
    en: 'product.html', de: 'de/produkt.html', fr: 'fr/produit.html', es: 'es/producto.html',
    it: 'it/prodotto.html', pl: 'pl/produkt.html', pt: 'pt/produto.html', ru: 'ru/продукт.html', zh: 'zh/产品.html',
  },
  'about-us.html': {
    en: 'about-us.html', de: 'de/uber-uns.html', fr: 'fr/a-propos.html', es: 'es/sobre-nosotros.html',
    it: 'it/chi-siamo.html', pl: 'pl/o-nas.html', pt: 'pt/sobre-nos.html', ru: 'ru/о-нас.html', zh: 'zh/关于我们.html',
  },
  'services.html': {
    en: 'services.html', de: 'de/dienstleistungen.html', fr: 'fr/services.html', es: 'es/servicios.html',
    it: 'it/servizi.html', pl: 'pl/uslugi.html', pt: 'pt/servicos.html', ru: 'ru/услуги.html', zh: 'zh/服务.html',
  },
  'contact.html': {
    en: 'contact.html', de: 'de/kontakt.html', fr: 'fr/contact.html', es: 'es/contacto.html',
    it: 'it/contatto.html', pl: 'pl/kontakt.html', pt: 'pt/contacto.html', ru: 'ru/контакт.html', zh: 'zh/联系.html',
  },
  'bottling-solutions.html': {
    en: 'bottling-solutions.html', de: 'de/abfulllosungen.html', fr: 'fr/solutions-de-remplissage.html',
    es: 'es/soluciones-de-embotellado.html', it: 'it/soluzioni-di-imbottigliamento.html',
    pl: 'pl/rozwiazania-do-rozlewu.html', pt: 'pt/solucoes-de-envase.html', ru: 'ru/решения-розлива.html', zh: 'zh/灌装解决方案.html',
  },
  'exhibitions.html': {
    en: 'exhibitions.html', de: 'de/ausstellungen.html', fr: 'fr/expositions.html',
    pl: 'pl/wystawy.html', es: 'es/exposiciones.html', it: 'it/mostre.html', pt: 'pt/exposicoes.html',
    ru: 'ru/выставки.html', zh: 'zh/展会.html',
  },
};

// 从英文页解析 hreflang 簇（详情页等）
const hreflangByEnKey = new Map();
function indexEnHreflang() {
  for (const ent of fs.readdirSync(root, { withFileTypes: true })) {
    if (!ent.isFile() || !ent.name.endsWith('.html')) continue;
    const html = fs.readFileSync(path.join(root, ent.name), 'utf8');
    const block = extractHreflangMap(html);
    if (Object.keys(block).length >= 2) hreflangByEnKey.set(ent.name.toLowerCase(), block);
  }
  for (const [k, v] of Object.entries(PAGE_EQUIV)) {
    hreflangByEnKey.set(k.toLowerCase(), v);
  }
}

function extractHreflangMap(html) {
  const map = {};
  const re = /<link[^>]+rel=["']alternate["'][^>]*>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    const tag = m[0];
    const hlM = tag.match(/hreflang=["']([^"']+)["']/i);
    const hrefM = tag.match(/href=["']([^"']+)["']/i);
    if (!hlM || !hrefM) continue;
    const lang = hlM[1].toLowerCase().split('-')[0];
    let href = hrefM[1].replace(/^\.\//, '');
    if (lang === 'en' || LANG_SET.has(lang)) map[lang] = href;
  }
  return map;
}

function getSiteRelFromMirror(html) {
  const m = html.match(/Mirrored from www\.npackpm\.com\/([^\s#]+)/i);
  if (!m) return null;
  let p = m[1].replace(/\/$/, '');
  if (!p.endsWith('.html')) p += '.html';
  return p;
}

function getFileLang(siteRel) {
  const first = siteRel.split('/')[0];
  return LANG_SET.has(first) ? first : 'en';
}

function rootPrefix(htmlFile) {
  const dirRel = path.relative(root, path.dirname(htmlFile)).replace(/\\/g, '/');
  if (!dirRel) return '';
  return '../'.repeat(dirRel.split('/').length);
}

function toRelHref(htmlFile, siteRelFromRoot) {
  const prefix = rootPrefix(htmlFile);
  return prefix + siteRelFromRoot.replace(/^\//, '');
}

function homeHref(htmlFile, targetLang) {
  const prefix = rootPrefix(htmlFile);
  if (targetLang === 'en') return `${prefix}index.html`;
  return `${prefix}${targetLang}/index.html`;
}

function fixLanguageSwitcher(html, htmlFile) {
  let n = 0;
  const out = html.replace(/<a\s+([^>]*?)href=["']([^"']+)["']([^>]*?)>/gi, (aFull, before, href, after, offset) => {
    const swStart = html.lastIndexOf('ct-language-switcher', offset);
    if (swStart === -1 || offset - swStart > 20000) return aFull;
    const segment = html.slice(swStart, offset + 200);
    if (!/ct-active-language/i.test(segment)) return aFull;
    const langM = (before + after).match(/\blang=["']([a-z]{2})(?:-[A-Za-z]{2})?["']/i);
    if (!langM) return aFull;
    const tl = langM[1].toLowerCase();
    const nh = homeHref(htmlFile, tl === 'en' || !LANG_SET.has(tl) ? 'en' : tl);
    if (nh === href) return aFull;
    n++;
    return `<a ${before}href="${nh}"${after}>`;
  });
  report.switcherFixed += n;
  return out;
}

function resolvePageEquiv(siteRel) {
  const key = siteRel.toLowerCase();
  if (hreflangByEnKey.has(key)) return hreflangByEnKey.get(key);
  const base = path.basename(key);
  if (hreflangByEnKey.has(base)) return hreflangByEnKey.get(base);
  for (const [enKey, group] of hreflangByEnKey) {
    for (const p of Object.values(group)) {
      if (p.toLowerCase() === key || p.toLowerCase().endsWith('/' + base)) return group;
    }
  }
  for (const [, group] of Object.entries(PAGE_EQUIV)) {
    for (const p of Object.values(group)) {
      if (p.toLowerCase() === key) return group;
    }
  }
  return null;
}

function fixHreflangBlock(html, htmlFile) {
  const siteRel = getSiteRelFromMirror(html) || path.relative(root, htmlFile).replace(/\\/g, '/');
  const group = resolvePageEquiv(siteRel);
  if (!group) return html;
  let n = 0;
  const fixed = html.replace(/<link[^>]+rel=["']alternate["'][^>]*>/gi, (tag) => {
    const hlM = tag.match(/hreflang=["']([^"']+)["']/i);
    const hrefM = tag.match(/href=["']([^"']+)["']/i);
    if (!hlM || !hrefM) return tag;
    const lang = hlM[1].toLowerCase().split('-')[0];
    const target = lang === 'en' ? 'en' : lang;
    if (!group[target]) return tag;
    const newHref = toRelHref(htmlFile, group[target]);
    if (newHref === hrefM[1]) return tag;
    n++;
    return tag.replace(/href=["'][^"']+["']/i, `href="${newHref}"`);
  });
  report.hreflangFixed += n;
  return fixed;
}

function fixNpackHomes(html, htmlFile) {
  const prefix = rootPrefix(htmlFile);
  const homes = {
    it: `${prefix}it/index.html`,
    es: `${prefix}es/index.html`,
    fr: `${prefix}fr/index.html`,
    pt: `${prefix}pt/index.html`,
    de: `${prefix}de/index.html`,
    en: `${prefix}index.html`,
    ru: `${prefix}ru/index.html`,
    zh: `${prefix}zh/index.html`,
    pl: `${prefix}pl/index.html`,
  };
  const json = JSON.stringify(homes);
  if (!html.includes('NPACKPM_LANG_HOMES')) return html;
  report.npackHomesFixed++;
  return html.replace(/window\.NPACKPM_LANG_HOMES=\{[^}]+\}/, `window.NPACKPM_LANG_HOMES=${json}`);
}

/** 正文内错误跨语言目录链接（非 hreflang / 非 switcher）→ 本语言同名文件 */
function fixCrossLangBodyLinks(html, htmlFile) {
  const fileLang = getFileLang(path.relative(root, htmlFile).replace(/\\/g, '/'));
  if (!fileLang || fileLang === 'en') return html;
  let n = 0;
  const out = html.replace(/\b(href|src)=(["'])(\.\.\/)+(de|fr|es|it|ru|pl|pt|zh)\/([^"']+)\2/gi, (full, attr, q, dots, otherLang, rest) => {
    const ctxStart = Math.max(0, html.indexOf(full) - 200);
    const ctx = html.slice(ctxStart, html.indexOf(full) + 50);
    if (/hreflang|ct-language-switcher/i.test(ctx)) return full;
    if (otherLang === fileLang) return full;
    const base = path.basename(rest);
    const local = path.join(root, fileLang, base);
    if (fs.existsSync(local)) {
      n++;
      const rel = path.relative(path.dirname(htmlFile), local).replace(/\\/g, '/');
      return `${attr}=${q}${rel}${q}`;
    }
    return full;
  });
  report.crossLinkFixed += n;
  return out;
}

indexEnHreflang();

function processFile(htmlFile) {
  let html = fs.readFileSync(htmlFile, 'utf8');
  const orig = html;
  html = fixLanguageSwitcher(html, htmlFile);
  html = fixHreflangBlock(html, htmlFile);
  html = fixNpackHomes(html, htmlFile);
  html = fixCrossLangBodyLinks(html, htmlFile);
  if (html !== orig) {
    fs.writeFileSync(htmlFile, html, 'utf8');
    report.filesModified++;
  }
}

function walkAll(dir) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const f = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (['node_modules', '.git'].includes(ent.name)) continue;
      walkAll(f);
    } else if (ent.name.endsWith('.html')) processFile(f);
  }
}

walkAll(root);

const text = `多语言隔离恢复报告
时间: ${new Date().toISOString()}

【问题根因】此前语言隔离脚本将 ct-language-switcher 内 ../xx/index.html 误改为 index.html，
导致在 /ru/ 点击「波兰语」仍停留在 /ru/index.html（显示俄语）。

【修复】
  语言菜单链接恢复: ${report.switcherFixed} 处
  hreflang 校正: （逐页匹配对照表）
  NPACKPM_LANG_HOMES 深度前缀: ${report.npackHomesFixed} 个文件
  正文跨语言目录链接: ${report.crossLinkFixed} 处
  修改文件数: ${report.filesModified}

【说明】
  中文目录为 zh/（非 cn/）
  各语言 index 内容扫描：pl/de/fr 等为对应语言（非俄语全文替换）
  91 篇从英文复制的详情页正文仍为英文，需后续重新镜像或翻译
`;
fs.writeFileSync(path.join(root, 'fix_lang_isolation_restore_report.txt'), text, 'utf8');
console.log(text);
