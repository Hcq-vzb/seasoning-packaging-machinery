/**
 * 九语言「关于我们」四大页：校正语言切换器资源路径、href 深度，注入 NPACKPM_LANG_EQUIV
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const siteRoot = path.dirname(fileURLToPath(import.meta.url));
const LANG_CODES = ['en', 'de', 'fr', 'es', 'it', 'ru', 'pl', 'pt', 'zh'];

const PAGE_EQUIV = {
  factory: {
    en: 'about-us/npack-factory.html',
    zh: 'zh/关于我们/npack-工厂.html',
    pl: 'pl/o-nas/npack-factory.html',
    de: 'de/uber-uns/npack-werk.html',
    fr: 'fr/a-propos-de-nous/usine-npack.html',
    es: 'es/acerca-de-nosotros/fabrica-npack.html',
    it: 'it/chi-siamo/fabbrica-npack.html',
    ru: 'ru/о-нас/завод-npack.html',
    pt: 'pt/sobre-nos/fabrica-npack.html',
  },
  customer: {
    en: 'about-us/npack-customer.html',
    zh: 'zh/关于我们/客户.html',
    pl: 'pl/o-nas/klient-npack.html',
    de: 'de/uber-uns/npack-kunde.html',
    fr: 'fr/a-propos-de-nous/client-npack.html',
    es: 'es/acerca-de-nosotros/npack-cliente.html',
    it: 'it/chi-siamo/cliente-npack.html',
    ru: 'ru/о-нас/клиент-npack.html',
    pt: 'pt/sobre-nos/cliente-npack.html',
  },
  certification: {
    en: 'about-us/npack-certification.html',
    zh: 'zh/关于我们/npack-认证.html',
    pl: 'pl/o-nas/certyfikacja-npack.html',
    de: 'de/uber-uns/npack-zertifizierung.html',
    fr: 'fr/a-propos-de-nous/certification-npack.html',
    es: 'es/acerca-de-nosotros/certificacion-npack.html',
    it: 'it/chi-siamo/certificazione-npack.html',
    ru: 'ru/о-нас/сертификация-npack.html',
    pt: 'pt/sobre-nos/certificacao-npack.html',
  },
  team: {
    en: 'about-us/npack-team.html',
    zh: 'zh/关于我们/npack-团队.html',
    pl: 'pl/o-nas/zespol-npack.html',
    de: 'de/uber-uns/npack-team.html',
    fr: 'fr/a-propos-de-nous/lequipe-npack.html',
    es: 'es/acerca-de-nosotros/equipo-npack.html',
    it: 'it/chi-siamo/team-npack.html',
    ru: 'ru/о-нас/команда-npack.html',
    pt: 'pt/sobre-nos/equipa-npack.html',
  },
};

const relToNorm = new Map();
for (const [key, langs] of Object.entries(PAGE_EQUIV)) {
  for (const rel of Object.values(langs)) {
    relToNorm.set(rel.replace(/\\/g, '/'), key);
  }
}

const report = { files: 0, links: 0, missing: [] };

function rootPrefix(htmlFile) {
  const dirRel = path.relative(siteRoot, path.dirname(htmlFile)).replace(/\\/g, '/');
  if (!dirRel) return '';
  return '../'.repeat(dirRel.split('/').length);
}

function buildHomes(prefix) {
  return {
    en: `${prefix}index.html`,
    de: `${prefix}de/index.html`,
    fr: `${prefix}fr/index.html`,
    es: `${prefix}es/index.html`,
    it: `${prefix}it/index.html`,
    ru: `${prefix}ru/index.html`,
    pl: `${prefix}pl/index.html`,
    pt: `${prefix}pt/index.html`,
    zh: `${prefix}zh/index.html`,
  };
}

function buildEquiv(htmlFile, pageKey) {
  const fromDir = path.dirname(htmlFile);
  const equiv = {};
  for (const code of LANG_CODES) {
    const targetRel = PAGE_EQUIV[pageKey][code];
    const targetAbs = path.join(siteRoot, targetRel);
    if (!fs.existsSync(targetAbs)) {
      report.missing.push(`${path.relative(siteRoot, htmlFile)} -> ${code}: ${targetRel}`);
      equiv[code] = buildHomes(rootPrefix(htmlFile))[code];
      continue;
    }
    let rel = path.relative(fromDir, targetAbs).replace(/\\/g, '/');
    if (rel.startsWith('./')) rel = rel.slice(2);
    equiv[code] = rel;
  }
  return equiv;
}

function langFromAttr(attrs) {
  const m = attrs.match(/\blang=["']([a-z]{2})(?:-[A-Za-z]{2})?["']/i);
  if (!m) return null;
  const c = m[1].toLowerCase();
  return LANG_CODES.includes(c) ? c : 'en';
}

function fixSwitcherBlock(block, targets) {
  let n = 0;
  return block.replace(/<a\s+([^>]*?)>/gi, (full, attrs) => {
    if (!/\blang=/i.test(attrs)) return full;
    const code = langFromAttr(attrs);
    if (!code || !targets[code]) return full;
    const target = targets[code];
    let newAttrs = attrs;
    const hm = newAttrs.match(/\bhref=(["'])([^"']*)\1/i);
    if (hm && hm[2] === target) return full;
    if (/\bhref=/i.test(newAttrs)) {
      newAttrs = newAttrs.replace(/\bhref=(["'])[^"']*\1/i, `href=$1${target}$1`);
    } else {
      newAttrs += ` href="${target}"`;
    }
    n++;
    return `<a ${newAttrs}>`;
  });
}

function detectPageKey(htmlFile) {
  const rel = path.relative(siteRoot, htmlFile).replace(/\\/g, '/');
  if (relToNorm.has(rel)) return relToNorm.get(rel);
  const base = path.basename(rel);
  for (const [r, key] of relToNorm) {
    if (path.basename(r) === base) return key;
  }
  return null;
}

function fixFile(htmlFile) {
  const buf = fs.readFileSync(htmlFile);
  if (buf.length < 2000 || (buf[0] === 0x1f && buf[1] === 0x8b)) return;
  let html = buf.toString('utf8');
  if (!html.includes('ct-language-switcher')) return;

  const pageKey = detectPageKey(htmlFile);
  if (!pageKey) return;

  const orig = html;
  const prefix = rootPrefix(htmlFile);
  const assetsPrefix = `${prefix}assets/`;
  const equiv = buildEquiv(htmlFile, pageKey);
  const homes = buildHomes(prefix);
  const targets = equiv;

  html = html.replace(/<div[^>]*\bct-language-switcher\b[^>]*>[\s\S]*?<\/ul>/gi, (block) => {
    report.links += 1;
    return fixSwitcherBlock(block, targets);
  });

  const equivScript = `<script>window.NPACKPM_LANG_EQUIV=${JSON.stringify(equiv)};</script>`;
  if (/window\.NPACKPM_LANG_EQUIV=/.test(html)) {
    html = html.replace(/<script>window\.NPACKPM_LANG_EQUIV=\{[\s\S]*?\};<\/script>/, equivScript);
  } else {
    const homesScript = `<script>window.NPACKPM_LANG_HOMES=${JSON.stringify(homes)};</script>`;
    if (/window\.NPACKPM_LANG_HOMES=/.test(html)) {
      html = html.replace(/<script>window\.NPACKPM_LANG_HOMES=\{[\s\S]*?\};<\/script>/, `${equivScript}\n${homesScript}`);
    } else {
      const bodyEnd = html.lastIndexOf('</body>');
      if (bodyEnd !== -1) {
        html = html.slice(0, bodyEnd) + equivScript + '\n' + homesScript + '\n' + html.slice(bodyEnd);
      }
    }
  }

  html = html.replace(
    /href=(["'])[^"']*local-lang-switcher\.css\1/gi,
    `href=$1${assetsPrefix}local-lang-switcher.css$1`,
  );
  html = html.replace(
    /src=(["'])[^"']*local-lang-switcher\.js\1/gi,
    `src=$1${assetsPrefix}local-lang-switcher.js$1`,
  );

  if (!html.includes('npackpm-lang-switcher-css')) {
    html = html.replace(/<\/head>/i, `<link rel="stylesheet" href="${assetsPrefix}local-lang-switcher.css" id="npackpm-lang-switcher-css">\n</head>`);
  }
  if (!html.includes('local-lang-switcher.js')) {
    const bodyEnd = html.lastIndexOf('</body>');
    if (bodyEnd !== -1) {
      html = html.slice(0, bodyEnd) + `<script src="${assetsPrefix}local-lang-switcher.js"></script>\n` + html.slice(bodyEnd);
    }
  }

  if (html !== orig) {
    fs.writeFileSync(htmlFile, html, 'utf8');
    report.files++;
  }
}

function walk(d) {
  for (const ent of fs.readdirSync(d, { withFileTypes: true })) {
    const f = path.join(d, ent.name);
    if (ent.isDirectory()) {
      if (!['wp-json', 'wp-content', 'node_modules'].includes(ent.name)) walk(f);
    } else if (ent.name.endsWith('.html') && !ent.name.endsWith('.html.z')) {
      fixFile(f);
    }
  }
}

for (const rel of relToNorm.keys()) {
  const fp = path.join(siteRoot, rel);
  if (fs.existsSync(fp)) fixFile(fp);
}
for (const rel of relToNorm.keys()) {
  const fp = path.join(siteRoot, rel.replace(/(\.html)$/, '-2$1'));
  if (fs.existsSync(fp)) fixFile(fp);
}

const text = `关于我们四大页语言切换修复
时间: ${new Date().toISOString()}
修改文件: ${report.files}
菜单块处理: ${report.links}
缺失等价页(回退首页): ${report.missing.length}
${report.missing.slice(0, 20).join('\n') || '无'}
`;
fs.writeFileSync(path.join(siteRoot, 'fix_about_lang_switcher_report.txt'), text, 'utf8');
console.log(text);
