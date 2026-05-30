/**
 * 9 语言全站分页路径自检与修复
 */
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { fileURLToPath } from 'url';

const siteRoot = path.dirname(fileURLToPath(import.meta.url));
const LANGS = ['en', 'zh', 'de', 'fr', 'es', 'it', 'ru', 'pl', 'pt'];
const LANG_SET = new Set(LANGS.slice(1));
const PAGE_FOLDER_RE = /^(page|seite|pagina|strona|页码|страница)$/i;
const SKIP_DIRS = new Set(['wp-content', 'wp-json', 'assets', 'node_modules']);

/** 各语言分页栏目（实测路径，非臆造） */
const LANG_SECTIONS = {
  en: [
    { sectionDir: 'product', pageFolder: 'page', listPage: 'product.html', maxPage: 3 },
    { sectionDir: 'news', pageFolder: 'page', listPage: 'news.html', maxPage: 4 },
    { sectionDir: 'technology', pageFolder: 'page', listPage: 'technology.html', maxPage: 3 },
  ],
  zh: [
    { sectionDir: '产品', pageFolder: '页码', listPage: '产品.html', maxPage: 3 },
    { sectionDir: '新闻', pageFolder: '页码', listPage: '新闻.html', maxPage: 4 },
    { sectionDir: '技术', pageFolder: '页码', listPage: '技术.html', maxPage: 3 },
  ],
  de: [
    { sectionDir: 'produkt', pageFolder: 'seite', listPage: 'produkt.html', maxPage: 3 },
    { sectionDir: 'nachrichten', pageFolder: 'seite', listPage: 'nachrichten.html', maxPage: 4 },
    { sectionDir: 'technologie', pageFolder: 'seite', listPage: 'technologie.html', maxPage: 3 },
  ],
  fr: [
    { sectionDir: 'produit', pageFolder: 'page', listPage: 'produit.html', maxPage: 3 },
    { sectionDir: 'nouvelles', pageFolder: 'page', listPage: 'nouvelles.html', maxPage: 4 },
    { sectionDir: 'technologie', pageFolder: 'page', listPage: 'technologie.html', maxPage: 3 },
  ],
  es: [
    { sectionDir: 'producto', pageFolder: 'pagina', listPage: 'producto.html', maxPage: 3 },
    { sectionDir: 'noticias', pageFolder: 'pagina', listPage: 'noticias.html', maxPage: 4 },
    { sectionDir: 'tecnologia', pageFolder: 'pagina', listPage: 'tecnologia.html', maxPage: 3 },
  ],
  it: [
    { sectionDir: 'prodotto', pageFolder: 'pagina', listPage: 'prodotto.html', maxPage: 3 },
    { sectionDir: 'notizie', pageFolder: 'pagina', listPage: 'notizie.html', maxPage: 4 },
    { sectionDir: 'tecnologia', pageFolder: 'pagina', listPage: 'tecnologia.html', maxPage: 3 },
  ],
  ru: [
    { sectionDir: 'продукт', pageFolder: 'страница', listPage: 'продукт.html', maxPage: 3 },
    { sectionDir: 'новости', pageFolder: 'страница', listPage: 'новости.html', maxPage: 4 },
    { sectionDir: 'технология', pageFolder: 'страница', listPage: 'технология.html', maxPage: 3 },
  ],
  pl: [
    { sectionDir: 'produkt', pageFolder: 'strona', listPage: 'produkt.html', maxPage: 3 },
    { sectionDir: 'wiadomosci', pageFolder: 'strona', listPage: 'wiadomosci.html', maxPage: 4 },
    { sectionDir: 'technologia', pageFolder: 'strona', listPage: 'technologia.html', maxPage: 3 },
  ],
  pt: [
    { sectionDir: 'produto', pageFolder: 'pagina', listPage: 'produto.html', maxPage: 3 },
    { sectionDir: 'noticias', pageFolder: 'pagina', listPage: 'noticias.html', maxPage: 4 },
    { sectionDir: 'tecnologia', pageFolder: 'pagina', listPage: 'tecnologia.html', maxPage: 3 },
  ],
};

const report = {
  mapping: [],
  folderFixed: [],
  restored: [],
  filesModified: 0,
  hrefFixed: 0,
  paginationNavFixed: 0,
  assetPathFixed: 0,
  crossLangFixed: 0,
  lazySrcFixed: 0,
  charsetAdded: 0,
  brokenAfter: [],
  missingTargets: [],
};

function isGzip(buf) {
  return buf.length >= 2 && buf[0] === 0x1f && buf[1] === 0x8b;
}

function isValidHtml(buf) {
  return buf.length > 8000 && !isGzip(buf) && /<!doctype html|<html/i.test(buf.slice(0, 500).toString('utf8'));
}

function langRootOf(lang) {
  return lang === 'en' ? siteRoot : path.join(siteRoot, lang);
}

function getLangFromFile(htmlFile) {
  const rel = path.relative(siteRoot, htmlFile).replace(/\\/g, '/');
  const first = rel.split('/')[0];
  return LANG_SET.has(first) ? first : 'en';
}

function prefixes(htmlFile, lang) {
  const langRoot = langRootOf(lang);
  const relDir = path.relative(langRoot, path.dirname(htmlFile)).replace(/\\/g, '/');
  const depth = relDir ? relDir.split('/').length : 0;
  const toLang = depth ? '../'.repeat(depth) : '';
  const toSite = lang === 'en' ? toLang : '../'.repeat(depth + 1);
  return { langRoot, depth, toLang, toSite, relDir };
}

function relHref(fromFile, targetAbs) {
  if (!fs.existsSync(targetAbs)) return null;
  let rel = path.relative(path.dirname(fromFile), targetAbs).replace(/\\/g, '/');
  if (rel === '') rel = path.basename(targetAbs);
  return rel;
}

function normalizeHref(htmlFile, lang, href) {
  if (!href || /^(https?:|#|mailto:|javascript:|data:)/i.test(href)) return href;
  if (href.includes('://')) return href;

  const { langRoot, toLang, toSite } = prefixes(htmlFile, lang);
  const stripped = href.replace(/^(\.\/)+/, '').replace(/^(\.\.\/)+/, '');

  if (/^\d+\.html$/.test(stripped)) return stripped;

  if (/^(wp-content|wp-includes)\//i.test(stripped)) {
    const prefix = lang === 'en' ? toLang : toSite;
    return prefix + stripped;
  }

  const targetLang = path.join(langRoot, stripped);
  if (fs.existsSync(targetLang)) {
    const rel = relHref(htmlFile, targetLang);
    return rel || href;
  }

  if (lang !== 'en') {
    const targetRoot = path.join(siteRoot, stripped);
    if (fs.existsSync(targetRoot) && !fs.existsSync(targetLang)) {
      report.missingTargets.push({ lang, href: stripped, file: path.relative(siteRoot, htmlFile) });
      const rel = relHref(htmlFile, targetLang);
      return rel || href;
    }
  }

  return href;
}

function fixAllRelativeHrefs(html, htmlFile, lang) {
  return html.replace(/\b(href|src)=(["'])((?:\.\.\/|\.\/)*)([^"']+)\2/gi, (full, attr, q, _dots, rest) => {
    if (/^(https?:|#|mailto:|javascript:|data:)/i.test(rest)) return full;
    const fixed = normalizeHref(htmlFile, lang, (_dots || '') + rest);
    if (fixed === ((_dots || '') + rest)) return full;
    report.hrefFixed++;
    return `${attr}=${q}${fixed}${q}`;
  });
}

function fixWpAssets(html, htmlFile, lang) {
  const { toLang, toSite } = prefixes(htmlFile, lang);
  const wpPrefix = lang === 'en' ? toLang : toSite;
  let n = 0;
  const out = html.replace(
    /\b(href|src|action|content)=(["'])(?!(https?:|data:|mailto:|#|javascript:))(\.\.\/)*(wp-content|wp-includes)/gi,
    (m, attr, q, _p, _dots, wp) => {
      const target = `${wpPrefix}${wp}`;
      if (m.includes(target)) return m;
      n++;
      return `${attr}=${q}${target}`;
    },
  );
  report.assetPathFixed += n;
  return out;
}

function fixCrossLang(html, htmlFile, lang) {
  const { toLang, toSite } = prefixes(htmlFile, lang);
  return html.replace(
    /\b(href|src)=(["'])(\.\.\/)+(de|fr|es|it|ru|pl|pt|zh|en)(\/[^"']*)?\2/gi,
    (full, attr, q, _dots, otherLang, rest, offset) => {
      const pos = typeof offset === 'number' ? offset : 0;
      const ctx = html.slice(Math.max(0, pos - 250), pos + full.length + 50);
      if (/hreflang|ct-language|translatepress|alternate/i.test(ctx)) return full;
      if (otherLang === lang || (lang === 'en' && otherLang === 'en')) return full;
      report.crossLangFixed++;
      if (lang === 'en') return `${attr}=${q}index.html${q}`;
      return `${attr}=${q}${toLang}index.html${q}`;
    },
  );
}

function fixLazySrc(html) {
  let n = 0;
  const out = html.replace(
    /(<img\b[^>]*)\bdata-src=(["'])([^"']+)\2([^>]*>)/gi,
    (full, pre, q, src, post) => {
      if (/\bsrc\s*=/.test(pre + post)) return full;
      n++;
      return `${pre}src=${q}${src}${q} data-src=${q}${src}${q}${post}`;
    },
  );
  report.lazySrcFixed += n;
  return out;
}

function ensureCharset(html) {
  if (/<meta\s+charset=["']UTF-8["']/i.test(html)) return html;
  report.charsetAdded++;
  return html.replace(/<head([^>]*)>/i, '<head$1>\n\t<meta charset="UTF-8">');
}

// 分页导航由 _repair_pagination_nav.mjs 统一重建，此处不再改写 nav 避免破坏 HTML

function fixWrongHtmlFolders(langRoot) {
  function walk(d) {
    for (const ent of fs.readdirSync(d, { withFileTypes: true })) {
      const full = path.join(d, ent.name);
      if (ent.isDirectory()) {
        if (SKIP_DIRS.has(ent.name)) continue;
        if (/\.html$/i.test(ent.name)) {
          const inner = path.join(full, 'index.html');
          if (fs.existsSync(inner)) {
            const target = path.join(path.dirname(full), ent.name);
            if (!fs.existsSync(target)) {
              fs.copyFileSync(inner, target);
              report.folderFixed.push(path.relative(siteRoot, target));
            }
            fs.rmSync(full, { recursive: true, force: true });
          }
        } else walk(full);
      }
    }
  }
  walk(langRoot);
}

function restoreMissingPage(lang, sectionCfg) {
  const langRoot = langRootOf(lang);
  const pageDir = path.join(langRoot, sectionCfg.sectionDir, sectionCfg.pageFolder);
  if (!fs.existsSync(pageDir)) return;

  for (let p = 2; p <= sectionCfg.maxPage; p++) {
    const fp = path.join(pageDir, `${p}.html`);
    if (fs.existsSync(fp) && isValidHtml(fs.readFileSync(fp))) continue;

    const alt = path.join(pageDir, `${p}-2.html`);
    const zPath = fp + '.z';
    let good = null;

    if (fs.existsSync(alt) && isValidHtml(fs.readFileSync(alt))) good = fs.readFileSync(alt);
    else if (fs.existsSync(zPath)) {
      try {
        const out = zlib.gunzipSync(fs.readFileSync(zPath));
        if (isValidHtml(out)) good = out;
      } catch { /* */ }
    } else if (fs.existsSync(fp) && isGzip(fs.readFileSync(fp))) {
      try {
        const out = zlib.gunzipSync(fs.readFileSync(fp));
        if (isValidHtml(out)) good = out;
      } catch { /* */ }
    }

    if (good) {
      fs.writeFileSync(fp, good);
      report.restored.push(path.relative(siteRoot, fp).replace(/\\/g, '/'));
    }
  }
}

function discoverPaginationFiles() {
  const files = [];
  for (const lang of LANGS) {
    const langRoot = langRootOf(lang);
    if (!fs.existsSync(langRoot)) continue;
    function walk(d) {
      for (const ent of fs.readdirSync(d, { withFileTypes: true })) {
        const full = path.join(d, ent.name);
        if (ent.isDirectory()) {
          if (SKIP_DIRS.has(ent.name) || ent.name === 'wp-json') continue;
          walk(full);
        } else if (/^\d+\.html$/.test(ent.name)) {
          const parent = path.basename(path.dirname(full));
          if (PAGE_FOLDER_RE.test(parent)) {
            const rel = path.relative(siteRoot, full).replace(/\\/g, '/');
            files.push({ lang, file: full, rel, pageNum: parseInt(ent.name, 10) });
            report.mapping.push(rel);
          }
        }
      }
    }
    walk(langRoot);
  }
  return files;
}

function getSectionCfg(lang, rel) {
  const parts = rel.split('/');
  const start = lang === 'en' ? 0 : 1;
  const sectionDir = parts[start];
  const pageFolder = parts[start + 1];
  return LANG_SECTIONS[lang]?.find(
    (s) => s.sectionDir === sectionDir && s.pageFolder === pageFolder,
  );
}

function processPaginationFile({ lang, file, rel, pageNum }) {
  const sectionCfg = getSectionCfg(lang, rel);
  if (!sectionCfg) return;

  let buf = fs.readFileSync(file);
  if (!isValidHtml(buf)) return;

  let html = buf.toString('utf8');
  const orig = html;

  html = ensureCharset(html);
  html = fixWpAssets(html, file, lang);
  html = fixCrossLang(html, file, lang);
  html = fixLazySrc(html);
  html = fixAllRelativeHrefs(html, file, lang);

  if (html !== orig) {
    fs.writeFileSync(file, html, 'utf8');
    report.filesModified++;
  }
}

function validatePaginationFiles(files) {
  for (const { lang, file, rel } of files) {
    if (!fs.existsSync(file)) {
      report.brokenAfter.push({ rel, issue: 'missing' });
      continue;
    }
    const buf = fs.readFileSync(file);
    if (!isValidHtml(buf)) {
      report.brokenAfter.push({ rel, issue: 'corrupt' });
      continue;
    }
    const html = buf.toString('utf8');
    const { langRoot } = prefixes(file, lang);

    const nav = html.match(/<nav class="ct-pagination"[\s\S]*?<\/nav>/i)?.[0] || '';
    for (const m of nav.matchAll(/\bhref=(["'])([^"']+)\1/gi)) {
      const href = m[2];
      if (/^(https?:|#)/i.test(href)) continue;
      const resolved = path.normalize(path.join(path.dirname(file), href));
      if (!fs.existsSync(resolved)) {
        report.brokenAfter.push({ rel, issue: `broken-nav:${href}` });
      }
      if (lang !== 'en' && /^(\.\.\/)*(de|fr|es|it|ru|pl|pt|zh)\//i.test(href)) {
        const ctx = nav;
        if (!/ct-language|hreflang/i.test(ctx)) {
          report.brokenAfter.push({ rel, issue: `cross-lang-nav:${href}` });
        }
      }
    }

    if (/\.\.\/\.\.\/\.\.\/\.\.\//.test(html)) {
      report.brokenAfter.push({ rel, issue: 'excessive-depth' });
    }
  }
}

// === 执行 ===
for (const lang of LANGS) {
  const langRoot = langRootOf(lang);
  if (!fs.existsSync(langRoot)) continue;
  fixWrongHtmlFolders(langRoot);
  for (const sec of LANG_SECTIONS[lang] || []) {
    restoreMissingPage(lang, sec);
  }
}

const paginationFiles = discoverPaginationFiles();
for (const item of paginationFiles) {
  processPaginationFile(item);
}

validatePaginationFiles(paginationFiles);

const mappingTable = LANGS.map((lang) => {
  const secs = LANG_SECTIONS[lang]
    .map(
      (s) =>
        `  ${s.sectionDir}/${s.pageFolder}/ → ${lang === 'en' ? '' : lang + '/'}${s.listPage} (页 ${s.maxPage})`,
    )
    .join('\n');
  return `[${lang}]\n${secs}`;
}).join('\n\n');

const text = `9语言全站分页路径修复报告
时间: ${new Date().toISOString()}

【分页映射表】
${mappingTable}

【扫描】共 ${report.mapping.length} 个分页文件

【修复统计】
  文件夹式分页校正: ${report.folderFixed.length}
  损坏/缺失分页恢复: ${report.restored.length}
  修改 HTML 文件数: ${report.filesModified}
  相对链接校正: ${report.hrefFixed}
  分页导航校正: ${report.paginationNavFixed}
  资源路径(wp-content等): ${report.assetPathFixed}
  跨语言链接修正: ${report.crossLangFixed}
  懒加载 src 同步: ${report.lazySrcFixed}
  补充 UTF-8 charset: ${report.charsetAdded}

【恢复的文件】
${report.restored.join('\n  ') || '  无'}

【文件夹校正】
${report.folderFixed.join('\n  ') || '  无'}

【验证仍异常】(${report.brokenAfter.length})
${report.brokenAfter.slice(0, 50).map((b) => `  - ${b.rel}: ${b.issue}`).join('\n') || '  无'}

【指向英文根目录的缺失目标（需复制文章时关注）】
${[...new Set(report.missingTargets.slice(0, 30).map((x) => `${x.lang}: ${x.href}`))].join('\n  ') || '  无'}
`;

fs.writeFileSync(path.join(siteRoot, 'fix_all_pagination_report.txt'), text, 'utf8');
console.log(text);
