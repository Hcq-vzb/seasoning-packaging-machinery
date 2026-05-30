/**
 * 多语言隔离修复：/pl/ 只链 /pl/，/de/ 只链 /de/ …
 * 不修改英文根目录 HTML（仅读取 hreflang 建映射）
 */
import fs from 'fs';
import path from 'path';

const root = path.resolve('c:/My Websites/baoz/www.npackpm.com');
const LANGS = ['de', 'fr', 'es', 'it', 'ru', 'pl', 'pt', 'zh'];
const LANG_SET = new Set(LANGS);

const report = {
  htmlFoldersFlattened: 0,
  stubsRemoved: 0,
  filesModified: 0,
  crossLangFixed: 0,
  depthFixed: 0,
  assetsFixed: 0,
  dataSrcSynced: 0,
  remainingCrossLang: 0,
  remainingBroken: 0,
  errors: [],
};

// ─── 翻译映射（hreflang 聚类）───
/** @type {Map<string, Record<string,string>>} path(lower) -> { en, de, pl, ... } */
const pathToGroup = new Map();

const COLUMN_EN_TO_LANG = {
  'index.html': { de: 'de/index.html', fr: 'fr/index.html', es: 'es/index.html', it: 'it/index.html', ru: 'ru/index.html', pl: 'pl/index.html', pt: 'pt/index.html', zh: 'zh/index.html' },
  'about-us.html': { de: 'de/uber-uns.html', fr: 'fr/a-propos.html', es: 'es/sobre-nosotros.html', it: 'it/chi-siamo.html', pl: 'pl/o-nas.html', pt: 'pt/sobre-nos.html', zh: 'zh/关于我们.html' },
  'services.html': { de: 'de/dienstleistungen.html', fr: 'fr/services.html', es: 'es/servicios.html', it: 'it/servizi.html', pl: 'pl/uslugi.html', pt: 'pt/servicos.html', zh: 'zh/服务.html' },
  'contact.html': { de: 'de/kontakt.html', fr: 'fr/contact.html', es: 'es/contacto.html', it: 'it/contatto.html', pl: 'pl/kontakt.html', pt: 'pt/contacto.html', zh: 'zh/联系.html' },
  'product.html': { de: 'de/produkt.html', fr: 'fr/produit.html', es: 'es/producto.html', it: 'it/prodotto.html', pl: 'pl/produkt.html', pt: 'pt/produto.html', zh: 'zh/产品.html' },
  'news.html': { de: 'de/nachrichten.html', fr: 'fr/nouvelles.html', es: 'es/noticias.html', it: 'it/notizie.html', ru: 'ru/новости.html', pl: 'pl/wiadomosci.html', pt: 'pt/noticias.html', zh: 'zh/新闻.html' },
  'technology.html': { de: 'de/technologie.html', fr: 'fr/technologie.html', es: 'es/tecnologia.html', it: 'it/tecnologia.html', pl: 'pl/technologia.html', pt: 'pt/tecnologia.html', zh: 'zh/技术.html' },
  'bottling-solutions.html': { de: 'de/abfulllosungen.html', fr: 'fr/solutions-de-remplissage.html', es: 'es/soluciones-de-embotellado.html', it: 'it/soluzioni-di-imbottigliamento.html', pl: 'pl/rozwiazania-do-rozlewu.html', pt: 'pt/solucoes-de-envase.html', zh: 'zh/灌装解决方案.html' },
  'firm-news.html': { de: 'de/firmennachrichten.html', fr: 'fr/nouvelles-de-lentreprise.html', pl: 'pl/wiadomosci-firmowe.html' },
  'industry-news.html': { de: 'de/branchennachrichten.html', pl: 'pl/wiadomosci-branzowe.html' },
  'exhibitions.html': { de: 'de/ausstellungen.html', pl: 'pl/wystawy.html' },
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
    const n = normPath(p);
    clean[lang] = n;
  }
  if (Object.keys(clean).length < 2) return;
  for (const p of Object.values(clean)) {
    pathToGroup.set(p, clean);
  }
}

function parseHreflangGroups(html) {
  const re = /<link[^>]+rel=["']alternate["'][^>]*>/gi;
  const byHl = {};
  let m;
  while ((m = re.exec(html)) !== null) {
    const tag = m[0];
    const hlM = tag.match(/hreflang=["']([^"']+)["']/i);
    const hrefM = tag.match(/href=["']([^"']+)["']/i);
    if (!hlM || !hrefM) continue;
    const lang = hlM[1].toLowerCase().split('-')[0];
    if (!LANG_SET.has(lang) && lang !== 'en') continue;
    let href = hrefM[1].replace(/^(\.\.\/)+/, '').replace(/^\.\//, '');
    const p = normPath(href);
    if (!p.includes('.html')) continue;
    byHl[lang] = p;
  }
  if (Object.keys(byHl).length >= 2) registerGroup(byHl);
}

// 注册栏目硬编码映射
for (const [enPath, langs] of Object.entries(COLUMN_EN_TO_LANG)) {
  const g = { en: normPath(enPath), ...Object.fromEntries(Object.entries(langs).map(([k, v]) => [k, normPath(v)])) };
  registerGroup(g);
}

function getLangFromPath(siteRel) {
  const first = siteRel.split('/')[0];
  return LANG_SET.has(first) ? first : null;
}

function getLangFromFile(htmlFile) {
  const rel = path.relative(root, htmlFile).replace(/\\/g, '/');
  return getLangFromPath(rel) || (rel.includes('/') ? null : null);
}

function getFileLang(htmlFile) {
  const rel = path.relative(root, htmlFile).replace(/\\/g, '/');
  const first = rel.split('/')[0];
  return LANG_SET.has(first) ? first : null;
}

function depthToLangRoot(htmlFile) {
  const rel = path.relative(root, htmlFile).replace(/\\/g, '/');
  const parts = rel.split('/');
  return Math.max(0, parts.length - 2);
}

function resolveInLang(targetLang, siteRelKey) {
  const key = normPath(siteRelKey);
  const group = pathToGroup.get(key);
  if (group && group[targetLang]) {
    const p = group[targetLang];
    const real = fileIndex.get(p) || p;
    if (fs.existsSync(path.join(root, real.replace(/\//g, path.sep)))) return real;
  }
  // 直接尝试 targetLang/basename
  const base = path.basename(key);
  const direct = `${targetLang}/${base}`;
  const directReal = fileIndex.get(direct.toLowerCase()) || direct;
  if (fs.existsSync(path.join(root, directReal.replace(/\//g, path.sep)))) return directReal;
  // -html 变体
  if (base.endsWith('.html') && !base.endsWith('-html.html')) {
    const htmlVar = `${targetLang}/${base.replace(/\.html$/, '-html.html')}`;
    if (fs.existsSync(path.join(root, htmlVar.replace(/\//g, path.sep)))) return htmlVar;
  }
  if (base.endsWith('-html.html')) {
    const plain = `${targetLang}/${base.replace(/-html\.html$/, '.html')}`;
    if (fs.existsSync(path.join(root, plain.replace(/\//g, path.sep)))) return plain;
  }
  return null;
}

function relFrom(htmlFile, siteRel) {
  const target = path.join(root, siteRel.replace(/\//g, path.sep));
  return path.relative(path.dirname(htmlFile), target).replace(/\\/g, '/');
}

function isAssetUrl(url) {
  return /^(https?:|data:|mailto:|#|javascript:)/i.test(url) || /wp-content|wp-includes|wp-json|xmlrpc|\/feed/i.test(url) || /\.(css|js|webp|png|jpe?g|gif|svg|woff|php)(\?|$)/i.test(url);
}

function isRedirectStub(fp) {
  try {
    const c = fs.readFileSync(fp, 'utf8');
    return c.length < 3500 && /HTTrack|Page has moved|META HTTP-EQUIV=["']Refresh["']/i.test(c);
  } catch { return false; }
}

// ─── Phase 1: 扫描建映射 + 索引所有 html ───
const allHtmlByLang = { en: [], ...Object.fromEntries(LANGS.map((l) => [l, []])) };
const fileIndex = new Map();

function indexAllHtml(dir, isRoot = false) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (['node_modules', '.git', 'wp-content', 'wp-includes'].includes(ent.name)) continue;
      indexAllHtml(full, false);
    } else if (ent.name.endsWith('.html')) {
      const rel = path.relative(root, full).replace(/\\/g, '/');
      const lang = getLangFromPath(rel) || (isRoot || !rel.includes('/') ? 'en' : null);
      if (lang === 'en' || lang) {
        if (!allHtmlByLang[lang]) allHtmlByLang[lang] = [];
        allHtmlByLang[lang].push(rel);
      }
      fileIndex.set(rel.toLowerCase(), rel);
      try {
        const html = fs.readFileSync(full, 'utf8');
        parseHreflangGroups(html);
      } catch { /* */ }
    }
  }
}
indexAllHtml(root, true);

// ─── Phase 2: 扁平化 .html 文件夹（仅语言目录）──
function flattenHtmlFolders(dir) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!ent.isDirectory()) continue;
    const full = path.join(dir, ent.name);
    if (/\.html$/.test(ent.name) || /-html$/.test(ent.name)) {
      const indexPath = path.join(full, 'index.html');
      const targetFile = path.join(dir, ent.name.endsWith('.html') ? ent.name : `${ent.name}.html`);
      try {
        if (fs.existsSync(indexPath) && !fs.existsSync(targetFile)) {
          fs.renameSync(indexPath, targetFile);
          report.htmlFoldersFlattened++;
        } else if (fs.existsSync(indexPath) && isRedirectStub(indexPath)) {
          fs.unlinkSync(indexPath);
          report.stubsRemoved++;
        }
        if (fs.existsSync(full) && fs.readdirSync(full).length === 0) fs.rmdirSync(full);
      } catch (e) {
        report.errors.push(`flatten: ${e.message}`);
      }
    }
    flattenHtmlFolders(full);
  }
}
for (const lang of LANGS) {
  const lp = path.join(root, lang);
  if (fs.existsSync(lp)) flattenHtmlFolders(lp);
}

// ─── Phase 3: 判断是否保留跨语言链接 ───
function isExemptCrossLang(html, offset, url) {
  const swStart = html.lastIndexOf('ct-language-switcher', offset);
  if (swStart !== -1 && offset - swStart < 20000) {
    const segment = html.slice(swStart, offset + 200);
    if (/ct-active-language/i.test(segment)) return true;
  }
  const ctx = html.slice(Math.max(0, offset - 120), offset + 80);
  if (/hreflang/i.test(ctx)) return true;
  if (/ct-language-switcher|ct-language\b/i.test(ctx)) return true;
  if (/rel=["']alternate["']/i.test(ctx)) return true;
  // 语言切换下拉：指向 ../xx/ 或 ../news.html
  if (/aria-label=["'](?:Angielski|Englisch|English|Francuski|Deutsch|Polski)/i.test(ctx)) return true;
  if (/data-label=["']right["']/i.test(ctx) && /ct-language/i.test(html.slice(Math.max(0, offset - 400), offset))) return true;
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
    if (real && fs.existsSync(path.join(root, real))) return relFrom(htmlFile, real);
  }
  if (/^(\.\.\/){2,}/.test(url)) {
    const less = url.replace(/^(\.\.\/){2}/, '../');
    const { exists, siteRel } = resolveSiteRel(htmlFile, less);
    if (exists) return relFrom(htmlFile, fileIndex.get(siteRel.toLowerCase()) || siteRel);
  }
  return null;
}

function resolveSiteRel(htmlFile, urlPath) {
  const fromDir = path.dirname(htmlFile);
  let u = deepDecode(urlPath.split('?')[0].split('#')[0]);
  u = u.replace(/^\//, '');
  const abs = path.resolve(fromDir, u.replace(/\//g, path.sep));
  let siteRel = path.relative(root, abs).replace(/\\/g, '/');
  if (siteRel.startsWith('..')) return { siteRel, exists: false };
  return { siteRel, exists: fs.existsSync(abs) };
}

function fixUrlForLangPage(htmlFile, urlPath, html, offset) {
  if (isAssetUrl(urlPath)) return null;
  if (isExemptCrossLang(html, offset, urlPath)) return null;

  const lang = getFileLang(htmlFile);
  if (!lang) return null;

  const hashIdx = urlPath.indexOf('#');
  const hash = hashIdx >= 0 ? urlPath.slice(hashIdx) : '';
  const noHash = hashIdx >= 0 ? urlPath.slice(0, hashIdx) : urlPath;
  const qIdx = noHash.indexOf('?');
  const query = qIdx >= 0 ? noHash.slice(qIdx) : '';

  let u = decodeURIComponent(qIdx >= 0 ? noHash.slice(0, qIdx) : noHash);
  u = u.replace(/\.html\/index\.html$/i, '.html').replace(/\.html\/$/i, '.html');

  const { siteRel, exists } = resolveSiteRel(htmlFile, u);
  const targetLang = getLangFromPath(siteRel);
  const key = normPath(siteRel);

  // WordPress 伪静态 index*.html?p= → 本语言首页
  if (/^index[a-f0-9]*\.html$/i.test(path.basename(u)) || u === 'index.html' && !targetLang) {
    const home = `${lang}/index.html`;
    if (fs.existsSync(path.join(root, lang, 'index.html'))) {
      const newRel = relFrom(htmlFile, home);
      if (newRel !== u) return newRel + query + hash;
    }
  }

  // 已是本语言
  if (targetLang === lang) {
    if (exists) {
      const fixed = relFrom(htmlFile, fileIndex.get(key) || siteRel);
      if (fixed !== u) return fixed + query + hash;
    } else {
      const eq = resolveInLang(lang, u) || resolveInLang(lang, siteRel);
      if (eq) {
        const newRel = relFrom(htmlFile, eq);
        if (newRel !== u) {
          report.crossLangFixed++;
          return newRel + query + hash;
        }
      }
      const enBase = normPath(u);
      if (COLUMN_EN_TO_LANG[enBase]?.[lang]) {
        const col = COLUMN_EN_TO_LANG[enBase][lang];
        const colReal = fileIndex.get(normPath(col)) || col;
        if (fs.existsSync(path.join(root, colReal.replace(/\//g, path.sep)))) {
          const newRel = relFrom(htmlFile, colReal);
          if (newRel !== u) {
            report.crossLangFixed++;
            return newRel + query + hash;
          }
        }
      }
    }
    return null;
  }

  // 指向英文根目录或其它语言
  let equivalent = null;
  if (!exists) {
    const broken = fixBrokenRelative(htmlFile, u);
    if (broken) return broken + query + hash;
  }

  if (!targetLang || targetLang === 'en' || (targetLang && targetLang !== lang)) {
    equivalent = resolveInLang(lang, exists ? siteRel : u.replace(/^(\.\.\/)+/, ''));
    if (!equivalent && !targetLang) equivalent = resolveInLang(lang, u.replace(/^(\.\.\/)+/, ''));
  }

  if (equivalent) {
    const newRel = relFrom(htmlFile, equivalent);
    if (newRel !== u) {
      report.crossLangFixed++;
      return newRel + query + hash;
    }
  }

  // 本语言内资源深度修正（wp-content 等）
  if (isAssetUrl(u) || u.includes('wp-content') || u.includes('wp-includes')) {
    const fixed = relFrom(htmlFile, siteRel);
    if (exists && fixed !== u) {
      report.assetsFixed++;
      return fixed + query + hash;
    }
  }

  return null;
}

const ATTR_RE = /\b(href|action|src|content|data-src|data-lazy-src)=(["'])([^"']+)\2/gi;

function fixLangHtmlFile(htmlFile) {
  let html = fs.readFileSync(htmlFile, 'utf8');
  const orig = html;

  html = html.replace(/<base\b[^>]*>/gi, '');

  html = html.replace(ATTR_RE, (full, attr, q, val, offset) => {
    if (attr === 'content' && !/\.html/.test(val)) return full;
    const fixed = fixUrlForLangPage(htmlFile, val, html, typeof offset === 'number' ? offset : html.indexOf(full));
    if (!fixed) return full;
    return `${attr}=${q}${fixed}${q}`;
  });

  // index.html// 损坏
  html = html.replace(/index\.html\/\//g, '');

  // 懒加载
  html = html.replace(/<img\b([^>]*?)>/gi, (tag) => {
    const ds = tag.match(/\bdata-src=(["'])([^"']+)\1/i);
    if (!ds) return tag;
    const off = html.indexOf(tag);
    const fixed = fixUrlForLangPage(htmlFile, ds[2], html, off) || ds[2];
    let out = tag;
    const srcM = tag.match(/\bsrc=(["'])([^"']*)\1/i);
    if (!srcM || !srcM[2] || /index[a-f0-9]*\.html/i.test(srcM[2])) {
      out = srcM ? out.replace(/\bsrc=(["'])[^"']*\1/i, `src="${fixed}"`) : out.replace(/<img\b/, `<img src="${fixed}"`);
      report.dataSrcSynced++;
    }
    return out;
  });

  // 语言首页导航
  html = html.replace(/(menu-item-home[^>]*>\s*<a\s+)href="\.\.\/index\.html"/gi, '$1href="index.html"');
  html = html.replace(/(class="site-logo-container"[^>]*href=")\.\.\/index\.html(")/gi, '$1index.html$2');
  const upHome = depthToLangRoot(htmlFile);
  if (upHome > 0) {
    const homeRel = `${'../'.repeat(upHome)}index.html`;
    html = html.replace(/(menu-item-home[^>]*>\s*<a\s+)href="index\.html"/gi, `$1href="${homeRel}"`);
  }

  if (html !== orig) {
    fs.writeFileSync(htmlFile, html, 'utf8');
    report.filesModified++;
  }
}

for (const lang of LANGS) {
  const lp = path.join(root, lang);
  if (!fs.existsSync(lp)) continue;
  function walk(d) {
    for (const ent of fs.readdirSync(d, { withFileTypes: true })) {
      const f = path.join(d, ent.name);
      if (ent.isDirectory()) walk(f);
      else if (ent.name.endsWith('.html')) fixLangHtmlFile(f);
    }
  }
  walk(lp);
}

// ─── Phase 6: 自检（仅语言目录）──
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
          const fromLang = lang;
          const c = fs.readFileSync(f, 'utf8');
          for (const m of c.matchAll(/\bhref=(["'])([^"']+\.html[^"']*)\1/gi)) {
            const val = m[2];
            if (isAssetUrl(val)) continue;
            const ctx = c.slice(Math.max(0, m.index - 120), m.index);
            if (/hreflang|rel=["']alternate["']|ct-language/i.test(ctx)) continue;
            const { siteRel, exists } = resolveSiteRel(f, val);
            if (!exists) { report.remainingBroken++; continue; }
            const tl = getLangFromPath(siteRel);
            if (tl && tl !== fromLang) report.remainingCrossLang++;
            if (!tl && !siteRel.startsWith(lang + '/')) report.remainingCrossLang++;
          }
        }
      }
    }
    walk(lp);
  }
}
selfCheck();

// 映射表导出
const mapLines = [`语言-文件映射（hreflang 聚类 ${pathToGroup.size} 条）`, ''];
let n = 0;
for (const [p, g] of pathToGroup) {
  if (n++ > 500) { mapLines.push('...'); break; }
  mapLines.push(`${p} => ${JSON.stringify(g)}`);
}

const text = `多语言隔离修复报告
==================
时间: ${new Date().toISOString()}
语言目录: ${LANGS.join(', ')}（中文为 zh/，无 cn/）

【映射】hreflang/栏目映射条目: ${pathToGroup.size}

【第二步】扁平化 .html 文件夹: ${report.htmlFoldersFlattened}
【第二步】删除重定向 stub: ${report.stubsRemoved}

【第三步】跨语言链接改为本语言: ${report.crossLangFixed}
【第五歩】资源路径/深度校正: ${report.assetsFixed}
修改文件数: ${report.filesModified}
懒加载 src 同步: ${report.dataSrcSynced}

【自检-语言目录内】
  仍指向其它语言的内部链接: ${report.remainingCrossLang}
  仍无法解析的 .html 链接: ${report.remainingBroken}

【错误】${report.errors.length}
${report.errors.slice(0, 10).join('\n')}

说明: hreflang 与右上角语言切换菜单保留跨语言（ intentional ）。
英文根目录 HTML 未修改。
`;

fs.writeFileSync(path.join(root, 'fix_isolang_complete_report.txt'), text, 'utf8');
fs.writeFileSync(path.join(root, 'fix_isolang_mapping_sample.txt'), mapLines.slice(0, 200).join('\n'), 'utf8');
console.log(text);
