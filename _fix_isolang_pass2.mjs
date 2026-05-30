/**
 * 第二轮：嵌套栏目 ../../ 修复、URL 深度解码、补全 hreflang 映射、全局首页链接
 */
import fs from 'fs';
import path from 'path';

const root = path.resolve('c:/My Websites/baoz/www.npackpm.com');
const LANGS = ['de', 'fr', 'es', 'it', 'ru', 'pl', 'pt', 'zh'];
const LANG_SET = new Set(LANGS);

const report = { fixed: 0, nested: 0, home: 0, cross: 0, broken: 0, files: 0, remainCross: 0, remainBroken: 0 };

const pathToGroup = new Map();
const fileIndex = new Map();

const COLUMN_EN_TO_LANG = {
  'index.html': { de: 'de/index.html', fr: 'fr/index.html', es: 'es/index.html', it: 'it/index.html', ru: 'ru/index.html', pl: 'pl/index.html', pt: 'pt/index.html', zh: 'zh/index.html' },
  'about-us.html': { de: 'de/uber-uns.html', fr: 'fr/a-propos.html', es: 'es/sobre-nosotros.html', it: 'it/chi-siamo.html', pl: 'pl/o-nas.html', pt: 'pt/sobre-nos.html', zh: 'zh/关于我们.html' },
  'services.html': { de: 'de/dienstleistungen.html', fr: 'fr/services.html', es: 'es/servicios.html', it: 'it/servizi.html', pl: 'pl/uslugi.html', pt: 'pt/servicos.html', zh: 'zh/服务.html' },
  'contact.html': { de: 'de/kontakt.html', fr: 'fr/contact.html', es: 'es/contacto.html', it: 'it/contatto.html', pl: 'pl/kontakt.html', pt: 'pt/contacto.html', zh: 'zh/联系.html' },
  'product.html': { de: 'de/produkt.html', fr: 'fr/produit.html', es: 'es/producto.html', it: 'it/prodotto.html', pl: 'pl/produkt.html', pt: 'pt/produto.html', zh: 'zh/产品.html' },
  'news.html': { de: 'de/nachrichten.html', fr: 'fr/nouvelles.html', es: 'es/noticias.html', it: 'it/notizie.html', ru: 'ru/новости.html', pl: 'pl/wiadomosci.html', pt: 'pt/noticias.html', zh: 'zh/新闻.html' },
  'technology.html': { de: 'de/technologie.html', fr: 'fr/technologie.html', es: 'es/tecnologia.html', it: 'it/tecnologia.html', pl: 'pl/technologia.html', pt: 'pt/tecnologia.html', zh: 'zh/技术.html' },
  'bottling-solutions.html': { de: 'de/abfulllosungen.html', fr: 'fr/solutions-de-remplissage.html', es: 'es/soluciones-de-embotellado.html', it: 'it/soluzioni-di-imbottigliamento.html', pl: 'pl/rozwiazania-do-rozlewu.html', pt: 'pt/solucoes-de-envase.html', zh: 'zh/灌装解决方案.html' },
};

function deepDecode(p) {
  let s = p;
  for (let i = 0; i < 5; i++) {
    try {
      const n = decodeURIComponent(s);
      if (n === s) break;
      s = n;
    } catch {
      break;
    }
  }
  return s;
}

function normPath(p) {
  return deepDecode(p).replace(/\\/g, '/').split('?')[0].split('#')[0].replace(/^\.\//, '').replace(/\/$/, '').toLowerCase();
}

function registerGroup(pathsByLang) {
  const clean = {};
  for (const [lang, p] of Object.entries(pathsByLang)) {
    if (!p) continue;
    clean[lang] = normPath(p);
  }
  if (Object.keys(clean).length < 2) return;
  for (const p of Object.values(clean)) pathToGroup.set(p, clean);
}

function parseHreflangGroups(html) {
  const re = /<link[^>]+rel=["']alternate["'][^>]*>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    const tag = m[0];
    const hlM = tag.match(/hreflang=["']([^"']+)["']/i);
    const hrefM = tag.match(/href=["']([^"']+)["']/i);
    if (!hlM || !hrefM) continue;
    const lang = hlM[1].toLowerCase().split('-')[0];
    if (!LANG_SET.has(lang) && lang !== 'en') continue;
    let href = hrefM[1].replace(/^\.\.\//, '').replace(/^\.\//, '');
    const p = normPath(href);
    if (!p.includes('.html')) continue;
    registerGroup({ [lang]: p });
  }
}

for (const [enPath, langs] of Object.entries(COLUMN_EN_TO_LANG)) {
  registerGroup({ en: normPath(enPath), ...Object.fromEntries(Object.entries(langs).map(([k, v]) => [k, normPath(v)])) });
}

function indexAllHtml(dir) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (['node_modules', '.git'].includes(ent.name)) continue;
      indexAllHtml(full);
    } else if (ent.name.endsWith('.html')) {
      const rel = path.relative(root, full).replace(/\\/g, '/');
      fileIndex.set(rel.toLowerCase(), rel);
      try {
        parseHreflangGroups(fs.readFileSync(full, 'utf8'));
      } catch { /* */ }
    }
  }
}
indexAllHtml(root);

function getFileLang(htmlFile) {
  const rel = path.relative(root, htmlFile).replace(/\\/g, '/');
  const first = rel.split('/')[0];
  return LANG_SET.has(first) ? first : null;
}

function getLangFromPath(siteRel) {
  const first = siteRel.split('/')[0];
  return LANG_SET.has(first) ? first : null;
}

function resolveInLang(targetLang, siteRelKey) {
  const key = normPath(siteRelKey);
  const group = pathToGroup.get(key);
  if (group?.[targetLang]) {
    const p = group[targetLang];
    const real = fileIndex.get(p) || p;
    if (fs.existsSync(path.join(root, real.replace(/\//g, path.sep)))) return real;
  }
  const base = path.basename(key);
  for (const variant of [base, base.replace(/-html\.html$/, '.html'), base.replace(/\.html$/, '-html.html')]) {
    const direct = `${targetLang}/${variant}`;
    const real = fileIndex.get(direct.toLowerCase()) || direct;
    if (fs.existsSync(path.join(root, real.replace(/\//g, path.sep)))) return real;
    const subdirs = ['uber-uns', 'o-nas', 'sobre-nos', 'sobre-nosotros', 'chi-siamo', 'a-propos', '关于我们'];
    for (const sd of subdirs) {
      const nested = `${targetLang}/${sd}/${variant}`;
      const nr = fileIndex.get(nested.toLowerCase()) || nested;
      if (fs.existsSync(path.join(root, nr.replace(/\//g, path.sep)))) return nr;
    }
  }
  return null;
}

function resolveSiteRel(htmlFile, urlPath) {
  const fromDir = path.dirname(htmlFile);
  let u = deepDecode(urlPath.split('?')[0].split('#')[0]);
  const abs = path.resolve(fromDir, u.replace(/\//g, path.sep));
  let siteRel = path.relative(root, abs).replace(/\\/g, '/');
  if (siteRel.startsWith('..')) return { siteRel, exists: false };
  return { siteRel, exists: fs.existsSync(abs) };
}

function relFrom(htmlFile, siteRel) {
  const real = fileIndex.get(siteRel.toLowerCase()) || siteRel;
  return path.relative(path.dirname(htmlFile), path.join(root, real.replace(/\//g, path.sep))).replace(/\\/g, '/');
}

function isAssetUrl(url) {
  return /^(https?:|data:|mailto:|#|javascript:)/i.test(url) || /wp-content|wp-includes|wp-json|xmlrpc|\/feed/i.test(url) || /\.(css|js|webp|png|jpe?g|gif|svg|woff|php)(\?|$)/i.test(url);
}

function isExempt(html, offset) {
  const ctx = html.slice(Math.max(0, offset - 150), offset + 100);
  if (/hreflang|rel=["']alternate["']/i.test(ctx)) return true;
  if (/ct-language-switcher|ct-language\b/i.test(ctx)) return true;
  if (/aria-label=["'](?:Angielski|Englisch|English|Francuski|Deutsch|Polski|Chinese)/i.test(ctx)) return true;
  return false;
}

function fixBrokenRelative(htmlFile, url) {
  const lang = getFileLang(htmlFile);
  if (!lang) return null;
  const base = path.basename(deepDecode(url));
  if (!base.endsWith('.html')) return null;
  const dirRel = path.dirname(path.relative(root, htmlFile)).replace(/\\/g, '/');

  const candidates = [
    `${dirRel}/${base}`,
    `${lang}/${base}`,
    `${lang}/uber-uns/${base}`,
    `${lang}/o-nas/${base}`,
    `${lang}/sobre-nos/${base}`,
    `${lang}/sobre-nosotros/${base}`,
    `${lang}/chi-siamo/${base}`,
    `${lang}/a-propos/${base}`,
    `${lang}/关于我们/${base}`,
  ];
  for (const c of candidates) {
    const real = fileIndex.get(c.toLowerCase());
    if (real && fs.existsSync(path.join(root, real))) {
      const rel = relFrom(htmlFile, real);
      if (rel !== url.split('?')[0].split('#')[0]) return rel;
    }
  }
  if (url.startsWith('../../')) {
    const less = url.replace(/^\.\.\/\.\.\//, '../');
    const { exists, siteRel } = resolveSiteRel(htmlFile, less);
    if (exists) {
      const rel = relFrom(htmlFile, siteRel);
      if (rel !== url.split('?')[0].split('#')[0]) return rel;
    }
  }
  return null;
}

function fixUrl(htmlFile, url, html, offset) {
  if (isAssetUrl(url) || isExempt(html, offset)) return null;
  const lang = getFileLang(htmlFile);
  if (!lang) return null;

  const hashIdx = url.indexOf('#');
  const hash = hashIdx >= 0 ? url.slice(hashIdx) : '';
  const noHash = hashIdx >= 0 ? url.slice(0, hashIdx) : url;
  const qIdx = noHash.indexOf('?');
  const query = qIdx >= 0 ? noHash.slice(qIdx) : '';
  const u = qIdx >= 0 ? noHash.slice(0, qIdx) : noHash;

  if (/^index[a-f0-9]*\.html$/i.test(path.basename(u)) || u === '../index.html' || u === '../../index.html') {
    const home = `${lang}/index.html`;
    if (fs.existsSync(path.join(root, lang, 'index.html'))) {
      const rel = relFrom(htmlFile, home);
      if (rel !== u) {
        report.home++;
        return rel + query + hash;
      }
    }
  }

  let { siteRel, exists } = resolveSiteRel(htmlFile, u);
  const targetLang = getLangFromPath(siteRel);

  if (!exists) {
    const fixed = fixBrokenRelative(htmlFile, u);
    if (fixed) {
      report.nested++;
      return fixed + query + hash;
    }
  }

  if (targetLang === lang && exists) {
    const rel = relFrom(htmlFile, siteRel);
    if (rel !== u) return rel + query + hash;
    return null;
  }

  if (!targetLang || targetLang !== lang) {
    const key = exists ? siteRel : u.replace(/^(\.\.\/)+/, '');
    const eq = resolveInLang(lang, key);
    if (eq) {
      const rel = relFrom(htmlFile, eq);
      if (rel !== u) {
        report.cross++;
        return rel + query + hash;
      }
    }
  }
  return null;
}

const ATTR_RE = /\b(href|action|content)=(["'])([^"']+)\2/gi;

function processFile(htmlFile) {
  let html = fs.readFileSync(htmlFile, 'utf8');
  const orig = html;
  html = html.replace(ATTR_RE, (full, attr, q, val, offset) => {
    if (attr === 'content' && !/\.html/.test(val)) return full;
    const fixed = fixUrl(htmlFile, val, html, typeof offset === 'number' ? offset : html.indexOf(full));
    if (!fixed) return full;
    report.fixed++;
    return `${attr}=${q}${fixed}${q}`;
  });
  if (html !== orig) {
    fs.writeFileSync(htmlFile, html, 'utf8');
    report.files++;
  }
}

for (const lang of LANGS) {
  const lp = path.join(root, lang);
  if (!fs.existsSync(lp)) continue;
  function walk(d) {
    for (const ent of fs.readdirSync(d, { withFileTypes: true })) {
      const f = path.join(d, ent.name);
      if (ent.isDirectory() && !ent.name.startsWith('wp-json')) walk(f);
      else if (ent.name.endsWith('.html')) processFile(f);
    }
  }
  walk(lp);
}

// 自检（排除 wp-json / feed / hreflang）
function selfCheck() {
  for (const lang of LANGS) {
    const lp = path.join(root, lang);
    if (!fs.existsSync(lp)) continue;
    function walk(d) {
      for (const ent of fs.readdirSync(d, { withFileTypes: true })) {
        const f = path.join(d, ent.name);
        if (ent.isDirectory()) {
          if (ent.name === 'wp-json') continue;
          walk(f);
        } else if (ent.name.endsWith('.html')) {
          const c = fs.readFileSync(f, 'utf8');
          for (const m of c.matchAll(/\bhref=(["'])([^"']+)\1/gi)) {
            const val = m[2];
            if (isAssetUrl(val) || !val.includes('.html')) continue;
            const ctx = c.slice(Math.max(0, m.index - 120), m.index);
            if (/hreflang|rel=["']alternate["']|ct-language/i.test(ctx)) continue;
            const { siteRel, exists } = resolveSiteRel(f, val);
            if (!exists) {
              report.remainBroken++;
              continue;
            }
            const tl = getLangFromPath(siteRel);
            if ((tl && tl !== lang) || (!tl && !siteRel.startsWith(lang + '/'))) report.remainCross++;
          }
        }
      }
    }
    walk(lp);
  }
}
selfCheck();

const text = `第二轮多语言修复
时间: ${new Date().toISOString()}
hreflang 映射条目: ${pathToGroup.size}
属性链接修复: ${report.fixed}
嵌套路径修复: ${report.nested}
首页链接修复: ${report.home}
跨语言改本语言: ${report.cross}
修改文件: ${report.files}

自检（排除 wp-json/feed/hreflang/语言切换）:
  仍跨语言: ${report.remainCross}
  仍损坏: ${report.remainBroken}
`;
fs.writeFileSync(path.join(root, 'fix_isolang_pass2_report.txt'), text, 'utf8');
console.log(text);
