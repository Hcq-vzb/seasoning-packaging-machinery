/**
 * SEO pass 2: fix regressions, remaining meta, twitter:image, schema corruption.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const siteRoot = path.dirname(fileURLToPath(import.meta.url));
const DOMAIN = 'https://seasoningpackagingmachinery.com';
const SKIP_DIRS = new Set(['node_modules', 'cache', '.vs', '.git', 'wp-content', 'netlify', 'functions']);
const LANG_DIRS = new Set(['zh', 'fr', 'de', 'it', 'es', 'ru', 'pl', 'pt']);

const DESC_SUFFIX = {
  en: 'KIWL Jiangsu – leading manufacturer of liquid filling machines, capping machines and turnkey bottling lines.',
  zh: '江苏鑫紫鲸（KIWL）——液体灌装机、旋盖机及交钥匙装瓶生产线领先制造商。',
  fr: 'KIWL Jiangsu – fabricant leader de machines de remplissage, capsuleuses et lignes d\'embouteillage clés en main.',
  de: 'KIWL Jiangsu – führender Hersteller von Abfüllmaschinen, Verschließmaschinen und schlüsselfertigen Abfülllinien.',
  it: 'KIWL Jiangsu – produttore leader di riempitrici, tappatrici e linee di imbottigliamento chiavi in mano.',
  es: 'KIWL Jiangsu – fabricante líder de llenadoras, taponadoras y líneas de embotellado llave en mano.',
  ru: 'KIWL Jiangsu – ведущий производитель машин для розлива, укупорки и линий розлива под ключ.',
  pl: 'KIWL Jiangsu – wiodący producent maszyn do napełniania, zakręcających i linii rozlewniczych.',
  pt: 'KIWL Jiangsu – fabricante líder de enchedoras, tampadoras e linhas de engarrafamento turnkey.',
};

const report = { modified: 0, schemaFixed: 0, twitterFixed: 0, ogImageFixed: 0, descAdded: 0, npackUrlFixed: 0 };

function normPath(p) {
  return p.replace(/\\/g, '/');
}

function detectLang(relPath) {
  const parts = normPath(relPath).split('/');
  if (parts.length > 1 && LANG_DIRS.has(parts[0])) return parts[0];
  return 'en';
}

function toAbsoluteUrl(relPath) {
  const norm = normPath(relPath);
  if (norm === 'index.html') return `${DOMAIN}/`;
  return `${DOMAIN}/${norm.split('/').map((s) => encodeURIComponent(s)).join('/')}`;
}

function resolveRelHref(pageRel, href) {
  if (!href || /^https?:\/\//i.test(href)) return href;
  const pageDir = path.dirname(pageRel);
  return normPath(path.normalize(path.join(pageDir === '.' ? '' : pageDir, href)));
}

function isRedirectStub(html, relPath) {
  if (/^index[0-9a-f]{4}\.html$/i.test(path.basename(relPath))) return true;
  return html.length < 4000 && /Page has moved|META HTTP-EQUIV=["']Refresh["']/i.test(html);
}

function escapeAttr(s) {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

function stripTitleSuffix(title) {
  return title.replace(/\s*[-–|]\s*(China|KIWL|Chiny|Cina|Китай).*$/i, '').trim() || title;
}

function fixSchemaCorruption(html) {
  const before = html;
  // Fix broken linkedin/social URLs from prior domain replace
  let out = html.replace(/\.html\/\/www\./g, '","https://www.');
  out = out.replace(/\.html\/\/seasoningpackagingmachinery\.com\//g, '","https://seasoningpackagingmachinery.com/');
  // Fix schema WebSite name
  out = out.replace(/"name":"China Liquid Filling Machine Leading Manufacturer"/g, '"name":"KIWL Liquid Filling Solutions"');
  out = out.replace(/"name":"China Flüssigabfüllmaschine Führender Hersteller"/g, '"name":"KIWL Flüssigkeitsabfülllösungen"');
  if (out !== before) report.schemaFixed++;
  return out;
}

function fixRemainingNpackUrls(html) {
  const before = html;
  let out = html;
  out = out.replace(/%3A%2F%2Fwww\.npackpm\.com/gi, '%3A%2F%2Fseasoningpackagingmachinery.com');
  out = out.replace(/%2F%2Fwww\.npackpm\.com/gi, '%2F%2Fseasoningpackagingmachinery.com');
  out = out.replace(/www\.npackpm\.com/gi, (m, offset, str) => {
    const pre = str.slice(Math.max(0, offset - 1), offset);
    if (pre === '@') return m;
    return 'seasoningpackagingmachinery.com';
  });
  if (out !== before) report.npackUrlFixed++;
  return out;
}

function fixOgAndTwitterImages(html, pageRel) {
  let out = html;
  out = out.replace(/<meta\s+property="og:image(?::secure_url)?"\s+content="([^"]*)"\s*\/?>/gi, (full, src) => {
    if (/^https:\/\/seasoningpackagingmachinery\.com\/(?!de\/|fr\/|es\/|it\/|ru\/|pl\/|pt\/|zh\/)(wp-content)/.test(src)) return full;
    if (/^https:\/\/seasoningpackagingmachinery\.com\/(de|fr|es|it|ru|pl|pt|zh)\/wp-content\//.test(src)) {
      report.ogImageFixed++;
      return full.replace(/\/(de|fr|es|it|ru|pl|pt|zh)\/wp-content\//, '/wp-content/');
    }
    if (/^https?:\/\//i.test(src)) return full;
    const resolved = resolveRelHref(pageRel, src);
    report.ogImageFixed++;
    return full.replace(src, toAbsoluteUrl(resolved));
  });
  out = out.replace(/<meta\s+name="twitter:image"\s+content="([^"]*)"\s*\/?>/gi, (full, src) => {
    if (/^https:\/\/seasoningpackagingmachinery\.com\//.test(src)) return full;
    const resolved = resolveRelHref(pageRel, src);
    report.twitterFixed++;
    return full.replace(src, toAbsoluteUrl(resolved));
  });
  return out;
}

function addDescriptionIfMissing(html, lang) {
  if (/<meta\s+name="description"/i.test(html)) return html;
  const title = (html.match(/<title>([^<]*)<\/title>/i) || [])[1]?.trim();
  if (!title) return html;
  const pageName = stripTitleSuffix(title);
  const suffix = DESC_SUFFIX[lang] || DESC_SUFFIX.en;
  const desc = `${pageName}. ${suffix}`.slice(0, 160);
  const tag = `\t<meta name="description" content="${escapeAttr(desc)}" />\n`;
  const robotsMatch = html.match(/<meta\s+name="robots"[^>]*>/i);
  if (robotsMatch) {
    report.descAdded++;
    return html.replace(robotsMatch[0], `${tag}${robotsMatch[0]}`);
  }
  return html;
}

function fixHttrackMetaPlacement(html) {
  return html.replace(
    /<meta http-equiv="content-type" content="text\/html;charset=UTF-8" \/><head>/i,
    '<head>\n\t<meta http-equiv="content-type" content="text/html;charset=UTF-8" />',
  );
}

const files = [];
function walk(dir, rel = '') {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const fp = path.join(dir, ent.name);
    const r = rel ? `${rel}/${ent.name}` : ent.name;
    if (ent.isDirectory()) {
      if (SKIP_DIRS.has(ent.name)) continue;
      walk(fp, r);
    } else if (ent.name.endsWith('.html')) files.push(r);
  }
}
walk(siteRoot);

for (const rel of files) {
  const fp = path.join(siteRoot, rel);
  let html = fs.readFileSync(fp, 'utf8');
  const orig = html;
  const lang = detectLang(rel);

  html = fixSchemaCorruption(html);
  html = fixRemainingNpackUrls(html);
  html = fixHttrackMetaPlacement(html);

  if (!isRedirectStub(html, rel)) {
    html = fixOgAndTwitterImages(html, rel);
    html = addDescriptionIfMissing(html, lang);
  }

  if (html !== orig) {
    fs.writeFileSync(fp, html, 'utf8');
    report.modified++;
  }
}

console.log(JSON.stringify(report, null, 2));
