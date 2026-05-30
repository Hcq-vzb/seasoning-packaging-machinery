/**
 * 全站页脚四大链接修复：Npack Factory / Customer / Certification / Team
 * 英文在站点根目录（非 /en/）；各语言目录内链接须同语言、相对路径、按深度回退
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const siteRoot = path.dirname(fileURLToPath(import.meta.url));
const LANG_DIRS = new Set(['zh', 'pl', 'de', 'fr', 'es', 'it', 'ru', 'pt']);
const SKIP_DIRS = new Set(['wp-content', 'wp-json', 'assets', 'node_modules']);
/** 页脚 widget 菜单 ID */
const FOOTER_IDS = {
  factory: '3970',
  customer: '3969',
  certification: '3968',
  team: '3971',
};

/** 顶栏/移动菜单中「关于我们」四项（与页脚同目标页） */
const HEADER_IDS = {
  customer: '2286',
  factory: '2312',
  team: '2340',
  certification: '2371',
};

const ALL_MENU_KEYS = [...new Set([...Object.keys(FOOTER_IDS), ...Object.keys(HEADER_IDS)])];

/** 语言 → 四大页面（相对语言根目录）及页脚显示文本 */
const LANG_MAP = {
  en: {
    pages: {
      factory: { rel: 'about-us/npack-factory.html', label: 'Npack Factory' },
      customer: { rel: 'about-us/npack-customer.html', label: 'Npack Customer' },
      certification: { rel: 'about-us/npack-certification.html', label: 'Npack Certification' },
      team: { rel: 'about-us/npack-team.html', label: 'Npack Team' },
    },
    templateDir: 'about-us',
  },
  zh: {
    pages: {
      factory: { rel: '关于我们/npack-工厂.html', label: 'Npack 工厂' },
      customer: { rel: '关于我们/客户.html', label: 'Npack 客户群' },
      certification: { rel: '关于我们/npack-认证.html', label: 'Npack 认证资质' },
      team: { rel: '关于我们/npack-团队.html', label: 'Npack 团队' },
    },
    templateDir: '关于我们',
  },
  pl: {
    pages: {
      factory: { rel: 'o-nas/npack-factory.html', label: 'Fabryka Npack' },
      customer: { rel: 'o-nas/klient-npack.html', label: 'Klienci Npack' },
      certification: { rel: 'o-nas/certyfikacja-npack.html', label: 'Certyfikaty Npack' },
      team: { rel: 'o-nas/zespol-npack.html', label: 'Zespół Npack' },
    },
    templateDir: 'o-nas',
  },
  de: {
    pages: {
      factory: { rel: 'uber-uns/npack-werk.html', label: 'Npack Werk' },
      customer: { rel: 'uber-uns/npack-kunde.html', label: 'Npack Kunden' },
      certification: { rel: 'uber-uns/npack-zertifizierung.html', label: 'Npack Zertifizierungen' },
      team: { rel: 'uber-uns/npack-team.html', label: 'Npack Team' },
    },
    templateDir: 'uber-uns',
  },
  fr: {
    pages: {
      factory: { rel: 'a-propos-de-nous/usine-npack.html', label: 'Usine Npack' },
      customer: { rel: 'a-propos-de-nous/client-npack.html', label: 'Clients Npack' },
      certification: { rel: 'a-propos-de-nous/certification-npack.html', label: 'Certifications Npack' },
      team: { rel: 'a-propos-de-nous/lequipe-npack.html', label: 'Équipe Npack' },
    },
    templateDir: 'a-propos-de-nous',
  },
  es: {
    pages: {
      factory: { rel: 'acerca-de-nosotros/fabrica-npack.html', label: 'Fábrica Npack' },
      customer: { rel: 'acerca-de-nosotros/npack-cliente.html', label: 'Clientes Npack' },
      certification: { rel: 'acerca-de-nosotros/certificacion-npack.html', label: 'Certificaciones Npack' },
      team: { rel: 'acerca-de-nosotros/equipo-npack.html', label: 'Equipo Npack' },
    },
    templateDir: 'acerca-de-nosotros',
  },
  it: {
    pages: {
      factory: { rel: 'chi-siamo/fabbrica-npack.html', label: 'Stabilimento Npack' },
      customer: { rel: 'chi-siamo/cliente-npack.html', label: 'Clienti Npack' },
      certification: { rel: 'chi-siamo/certificazione-npack.html', label: 'Certificazioni Npack' },
      team: { rel: 'chi-siamo/team-npack.html', label: 'Team Npack' },
    },
    templateDir: 'chi-siamo',
  },
  ru: {
    pages: {
      factory: { rel: 'о-нас/завод-npack.html', label: 'Завод Npack' },
      customer: { rel: 'о-нас/клиент-npack.html', label: 'Клиенты Npack' },
      certification: { rel: 'о-нас/сертификация-npack.html', label: 'Сертификация Npack' },
      team: { rel: 'о-нас/команда-npack.html', label: 'Команда Npack' },
    },
    templateDir: 'о-нас',
  },
  pt: {
    pages: {
      factory: { rel: 'sobre-nos/fabrica-npack.html', label: 'Fábrica Npack' },
      customer: { rel: 'sobre-nos/cliente-npack.html', label: 'Clientes Npack' },
      certification: { rel: 'sobre-nos/certificacao-npack.html', label: 'Certificações Npack' },
      team: { rel: 'sobre-nos/equipa-npack.html', label: 'Equipa Npack' },
    },
    templateDir: 'sobre-nos',
  },
};

const EN_TEMPLATES = {
  factory: 'about-us/npack-factory.html',
  customer: 'about-us/npack-customer.html',
  certification: 'about-us/npack-certification.html',
  team: 'about-us/npack-team.html',
};

const report = {
  langs: {},
  filesModified: 0,
  linksFixed: 0,
  labelsFixed: 0,
  foldersFixed: [],
  filesCreated: [],
  missingAfter: [],
  issuesByType: { path: 0, text: 0, crossLang: 0, missing: 0 },
};

function isGzip(buf) {
  return buf.length >= 2 && buf[0] === 0x1f && buf[1] === 0x8b;
}

function isValidHtml(buf) {
  return buf.length > 2000 && !isGzip(buf) && /<!doctype html|<html/i.test(buf.slice(0, 400).toString('utf8'));
}

function shouldSkipHtml(name) {
  if (name.endsWith('.html.z')) return true;
  if (/-20\d{2}\.html$/i.test(name)) return false; // 年份页面（如 *-2024.html）需处理
  if (/-[2-9]\.html$/i.test(name)) return true; // HTTrack 重复副本（如 新闻-2.html）
  return false;
}

function relHref(fromFile, targetRel, langRoot) {
  const targetAbs = path.join(langRoot, targetRel);
  let rel = path.relative(path.dirname(fromFile), targetAbs).replace(/\\/g, '/');
  if (rel.startsWith('./')) rel = rel.slice(2);
  return rel;
}

/** WinHTTrack: xxx.html/index.html → xxx.html */
function fixWrongHtmlFolders(langRoot) {
  function walk(d) {
    for (const ent of fs.readdirSync(d, { withFileTypes: true })) {
      const full = path.join(d, ent.name);
      if (ent.isDirectory()) {
        if (SKIP_DIRS.has(ent.name)) continue;
        if (/\.html$/i.test(ent.name)) {
          const inner = path.join(full, 'index.html');
          if (fs.existsSync(inner)) {
            const parent = path.dirname(full);
            const target = path.join(parent, ent.name);
            if (!fs.existsSync(target)) {
              fs.copyFileSync(inner, target);
              report.foldersFixed.push(path.relative(siteRoot, target));
            }
            fs.rmSync(full, { recursive: true, force: true });
          }
        } else walk(full);
      }
    }
  }
  if (fs.existsSync(langRoot)) walk(langRoot);
}

function ensurePage(lang, key, cfg) {
  const fp = path.join(siteRoot, lang === 'en' ? '' : lang, cfg.rel);
  if (fs.existsSync(fp)) {
    const b = fs.readFileSync(fp);
    if (isValidHtml(b)) return fp;
  }
  const dir = path.dirname(fp);
  const base = path.basename(fp, '.html');
  const alt = path.join(dir, `${base}-2.html`);
  const enTpl = path.join(siteRoot, EN_TEMPLATES[key]);
  fs.mkdirSync(dir, { recursive: true });
  if (fs.existsSync(alt) && isValidHtml(fs.readFileSync(alt))) {
    fs.copyFileSync(alt, fp);
    report.filesCreated.push(`${lang}/${cfg.rel} (from -2)`);
    return fp;
  }
  if (fs.existsSync(enTpl) && isValidHtml(fs.readFileSync(enTpl))) {
    fs.copyFileSync(enTpl, fp);
    report.filesCreated.push(`${lang}/${cfg.rel} (from en)`);
    return fp;
  }
  report.missingAfter.push(`${lang}/${cfg.rel}`);
  return null;
}

function menuItemAnchorRe(menuId) {
  const esc = menuId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return `(?:id="menu-item-${esc}"|class="[^"]*\\bmenu-item-${esc}\\b[^"]*")[^>]*>\\s*<a\\s+[^>]*>`;
}

function fixFooterItem(html, menuId, href, label) {
  let n = 0;
  let nl = 0;

  const hrefRe = new RegExp(`(${menuItemAnchorRe(menuId)}href=)(["'])([^"']+)\\2`, 'gi');
  html = html.replace(hrefRe, (full, pre, q, old) => {
    if (old === href) return full;
    n++;
    return `${pre}${q}${href}${q}`;
  });

  const labelRe = new RegExp(`(${menuItemAnchorRe(menuId)})([^<]+)(</a>)`, 'gi');
  html = html.replace(labelRe, (full, pre, text, end) => {
    const t = text.replace(/<[^>]+>/g, '').trim();
    if (t === label) return full;
    nl++;
    return `${pre}${label}${end}`;
  });

  return { html, n, nl };
}

/** 页脚区域外的错误英文 about-us 路径（仅页脚 menu-item 已单独处理） */
function stripCrossLangFooterPaths(html, lang, langRoot, fromFile) {
  if (lang === 'en') return { html, n: 0 };
  const cfg = LANG_MAP[lang];
  let n = 0;
  const enPatterns = [
    /about-us\/npack-factory\.html/gi,
    /about-us\/npack-customer\.html/gi,
    /about-us\/npack-certification\.html/gi,
    /about-us\/npack-team\.html/gi,
    /\.\.\/npack-factory\.html/gi,
    /\.\.\/npack-customer\.html/gi,
    /\.\.\/npack-certification\.html/gi,
    /\.\.\/npack-team\.html/gi,
  ];
  const targets = {
    'about-us/npack-factory.html': cfg.pages.factory,
    'about-us/npack-customer.html': cfg.pages.customer,
    'about-us/npack-certification.html': cfg.pages.certification,
    'about-us/npack-team.html': cfg.pages.team,
    '../npack-factory.html': cfg.pages.factory,
    '../npack-customer.html': cfg.pages.customer,
    '../npack-certification.html': cfg.pages.certification,
    '../npack-team.html': cfg.pages.team,
  };
  for (const pat of enPatterns) {
    html = html.replace(pat, (m) => {
      const key = m.toLowerCase().replace(/\\/g, '/');
      const mapKey = Object.keys(targets).find((k) => key === k.toLowerCase());
      if (!mapKey) return m;
      const rel = relHref(fromFile, targets[mapKey].rel, langRoot);
      n++;
      report.issuesByType.crossLang++;
      return rel.replace(/^\.\//, '');
    });
  }
  return { html, n };
}

function processLang(lang) {
  const langRoot = lang === 'en' ? siteRoot : path.join(siteRoot, lang);
  if (!fs.existsSync(langRoot)) return;

  const cfg = LANG_MAP[lang];
  report.langs[lang] = { files: 0, links: 0, labels: 0 };

  fixWrongHtmlFolders(langRoot);

  for (const key of Object.keys(cfg.pages)) {
    ensurePage(lang, key, cfg.pages[key]);
  }

  function walk(d) {
    for (const ent of fs.readdirSync(d, { withFileTypes: true })) {
      const f = path.join(d, ent.name);
      if (ent.isDirectory()) {
        if (SKIP_DIRS.has(ent.name) || ent.name === 'wp-json') continue;
        walk(f);
      } else if (ent.name.endsWith('.html') && !shouldSkipHtml(ent.name)) {
        const buf = fs.readFileSync(f);
        if (!isValidHtml(buf)) continue;

        let html = buf.toString('utf8');
        const orig = html;
        let linkCount = 0;
        let labelCount = 0;

        for (const key of ALL_MENU_KEYS) {
          const page = cfg.pages[key];
          const href = relHref(f, page.rel, langRoot);
          for (const idMap of [FOOTER_IDS, HEADER_IDS]) {
            const menuId = idMap[key];
            if (!menuId) continue;
            const r = fixFooterItem(html, menuId, href, page.label);
            html = r.html;
            linkCount += r.n;
            labelCount += r.nl;
            if (r.n) report.issuesByType.path += r.n;
            if (r.nl) report.issuesByType.text += r.nl;
          }
        }

        const cross = stripCrossLangFooterPaths(html, lang, langRoot, f);
        html = cross.html;
        linkCount += cross.n;

        if (html !== orig) {
          fs.writeFileSync(f, html, 'utf8');
          report.filesModified++;
          report.linksFixed += linkCount;
          report.labelsFixed += labelCount;
          report.langs[lang].files++;
          report.langs[lang].links += linkCount;
          report.langs[lang].labels += labelCount;
        }
      }
    }
  }

  walk(langRoot);
}

function isEnglishRootFile(relPath) {
  const first = relPath.split(/[/\\]/)[0];
  return !LANG_DIRS.has(first) && !SKIP_DIRS.has(first);
}

function walkEnglishRoot() {
  function walk(d) {
    for (const ent of fs.readdirSync(d, { withFileTypes: true })) {
      const f = path.join(d, ent.name);
      const rel = path.relative(siteRoot, f);
      if (ent.isDirectory()) {
        if (SKIP_DIRS.has(ent.name) || LANG_DIRS.has(ent.name) || ent.name === 'wp-json') continue;
        walk(f);
      } else if (ent.name.endsWith('.html') && !shouldSkipHtml(ent.name) && isEnglishRootFile(rel)) {
        const buf = fs.readFileSync(f);
        if (!isValidHtml(buf)) continue;
        let html = buf.toString('utf8');
        const orig = html;
        const cfg = LANG_MAP.en;
        let linkCount = 0;
        let labelCount = 0;
        for (const key of ALL_MENU_KEYS) {
          const page = cfg.pages[key];
          const href = relHref(f, page.rel, siteRoot);
          for (const idMap of [FOOTER_IDS, HEADER_IDS]) {
            const menuId = idMap[key];
            if (!menuId) continue;
            const r = fixFooterItem(html, menuId, href, page.label);
            html = r.html;
            linkCount += r.n;
            labelCount += r.nl;
          }
        }
        if (html !== orig) {
          fs.writeFileSync(f, html, 'utf8');
          report.filesModified++;
          report.linksFixed += linkCount;
          report.labelsFixed += labelCount;
          report.langs.en = report.langs.en || { files: 0, links: 0, labels: 0 };
          report.langs.en.files++;
          report.langs.en.links += linkCount;
          report.langs.en.labels += labelCount;
        }
      }
    }
  }
  fixWrongHtmlFolders(siteRoot);
  for (const key of Object.keys(LANG_MAP.en.pages)) {
    ensurePage('en', key, LANG_MAP.en.pages[key]);
  }
  walk(siteRoot);
}

function validateLinks() {
  const broken = [];
  for (const lang of Object.keys(LANG_MAP)) {
    const langRoot = lang === 'en' ? siteRoot : path.join(siteRoot, lang);
    if (!fs.existsSync(langRoot)) continue;
    function walk(d) {
      for (const ent of fs.readdirSync(d, { withFileTypes: true })) {
        const f = path.join(d, ent.name);
        if (ent.isDirectory()) {
          if (SKIP_DIRS.has(ent.name) || ent.name === 'wp-json') continue;
          walk(f);
        } else if (ent.name.endsWith('.html') && !shouldSkipHtml(ent.name)) {
          const buf = fs.readFileSync(f);
          if (!isValidHtml(buf)) continue;
          const html = buf.toString('utf8');
          const cfg = LANG_MAP[lang];
          for (const key of ALL_MENU_KEYS) {
            const page = cfg.pages[key];
            for (const idMap of [FOOTER_IDS, HEADER_IDS]) {
              const menuId = idMap[key];
              if (!menuId) continue;
              const esc = menuId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
              const re = new RegExp(`id="menu-item-${esc}"[^>]*>\\s*<a\\s+[^>]*href=(["'])([^"']+)\\1`, 'gi');
              let m;
              while ((m = re.exec(html))) {
                const href = m[2];
                if (/^(https?:|#|mailto:)/i.test(href)) continue;
                const resolved = path.normalize(path.join(path.dirname(f), href));
                if (!fs.existsSync(resolved)) {
                  broken.push({
                    file: path.relative(siteRoot, f).replace(/\\/g, '/'),
                    id: menuId,
                    href,
                    expected: relHref(f, page.rel, langRoot),
                  });
                }
                if (lang !== 'en' && /about-us\/npack-/i.test(href)) {
                  broken.push({
                    file: path.relative(siteRoot, f).replace(/\\/g, '/'),
                    id: menuId,
                    issue: 'cross-lang-en-path',
                    href,
                  });
                }
                if (/\/index\.html$/i.test(href) && /npack-|工厂|客户|认证|团队|usine|client|fabbrica|werk|kunde|o-nas|uber-uns|chi-siamo|sobre-nos|о-нас/i.test(href)) {
                  broken.push({
                    file: path.relative(siteRoot, f).replace(/\\/g, '/'),
                    id: menuId,
                    issue: 'folder-index-path',
                    href,
                  });
                }
              }
            }
          }
        }
      }
    }
    walk(langRoot);
  }
  return broken;
}

/** 根目录 HTTrack 语言镜像（zh.html、de.html 等） */
const ROOT_LANG_FILES = {
  'zh.html': 'zh',
  'de.html': 'de',
  'fr.html': 'fr',
  'es.html': 'es',
  'it.html': 'it',
  'pl.html': 'pl',
  'pt.html': 'pt',
  'ru.html': 'ru',
};

function fixRootLangMirrors() {
  for (const [file, lang] of Object.entries(ROOT_LANG_FILES)) {
    const fp = path.join(siteRoot, file);
    if (!fs.existsSync(fp)) continue;
    const buf = fs.readFileSync(fp);
    if (!isValidHtml(buf)) continue;
    const cfg = LANG_MAP[lang];
    let html = buf.toString('utf8');
    const orig = html;
    let linkCount = 0;
    let labelCount = 0;
    for (const key of ALL_MENU_KEYS) {
      const page = cfg.pages[key];
      const targetRel = `${lang}/${page.rel}`;
      const href = relHref(fp, targetRel, siteRoot);
      for (const idMap of [FOOTER_IDS, HEADER_IDS]) {
        const menuId = idMap[key];
        if (!menuId) continue;
        const r = fixFooterItem(html, menuId, href, page.label);
        html = r.html;
        linkCount += r.n;
        labelCount += r.nl;
      }
    }
    if (html !== orig) {
      fs.writeFileSync(fp, html, 'utf8');
      report.filesModified++;
      report.linksFixed += linkCount;
      report.labelsFixed += labelCount;
      report.langs[lang] = report.langs[lang] || { files: 0, links: 0, labels: 0 };
      report.langs[lang].files++;
      report.langs[lang].links += linkCount;
      report.langs[lang].labels += labelCount;
      report.rootMirrors = report.rootMirrors || [];
      report.rootMirrors.push(file);
    }
  }
}

// 执行
for (const lang of Object.keys(LANG_MAP)) {
  if (lang === 'en') continue;
  processLang(lang);
}
walkEnglishRoot();
fixRootLangMirrors();

const broken = validateLinks();
report.validationBroken = broken.length;
report.brokenSamples = broken.slice(0, 40);

const mappingTable = Object.entries(LANG_MAP)
  .map(([lang, cfg]) => {
    const rows = Object.entries(cfg.pages)
      .map(([k, p]) => `  ${k}: ${p.label} → ${lang === 'en' ? '/' : `/${lang}/`}${p.rel}`)
      .join('\n');
    return `[${lang}]\n${rows}`;
  })
  .join('\n\n');

const text = `全站页脚四大链接修复报告
时间: ${new Date().toISOString()}

【修复统计】
  修改文件数: ${report.filesModified}
  链接 href 校正: ${report.linksFixed}
  链接文本校正: ${report.labelsFixed}
  WinHTTrack 目录校正: ${report.foldersFixed.length ? report.foldersFixed.join(', ') : '无'}
  新建/恢复页面: ${report.filesCreated.length ? report.filesCreated.join(', ') : '无'}

【各语言】
${Object.entries(report.langs)
  .map(([l, s]) => `  ${l}: ${s.files} 文件, ${s.links} 链接, ${s.labels} 文本`)
  .join('\n')}

【异常类型统计】
  路径错误: ${report.issuesByType.path}
  文本错误: ${report.issuesByType.text}
  跨语言英文路径: ${report.issuesByType.crossLang}

【验证】
  修复后仍无效的页脚链接: ${report.validationBroken}
${report.brokenSamples.length ? report.brokenSamples.map((b) => `  - ${b.file} [${b.id}] ${b.href || b.issue}`).join('\n') : '  （无）'}

【语言-页面映射表】
${mappingTable}

说明: 英文站点根目录对应用户文档中的 /en/；无独立 en 文件夹。
`;

fs.writeFileSync(path.join(siteRoot, 'fix_footer_links_report.txt'), text, 'utf8');
console.log(text);
