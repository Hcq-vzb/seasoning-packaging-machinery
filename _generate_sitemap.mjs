/**
 * Generate sitemap.xml and robots.txt for seasoningpackagingmachinery.com
 * Includes only self-canonical HTML pages (excludes HTTrack mirror duplicates).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const siteRoot = path.dirname(fileURLToPath(import.meta.url));
const DOMAIN = 'https://seasoningpackagingmachinery.com';

const SKIP_DIRS = new Set([
  'node_modules',
  'cache',
  '.vs',
  '.git',
  'wp-content',
  'netlify',
  'functions',
]);

const report = {
  scanned: 0,
  included: 0,
  excluded: { nonHtml: 0, notCanonical: 0, httrackMirror: 0, langHomeDup: 0, redirectStub: 0, noindex: 0, skipDir: 0 },
};

const LANGS = new Set(['zh', 'fr', 'de', 'it', 'es', 'ru', 'pl', 'pt']);
const allHtmlPages = new Set();

function isHtmlPage(buf) {
  return buf.length >= 200 && /<!doctype html|<html/i.test(buf.slice(0, 800).toString());
}

function extractCanonical(html) {
  const m = html.match(/<link\s+rel="canonical"\s+href="([^"]+)"/i);
  return m ? m[1].trim() : null;
}

function normalizePath(p) {
  return p.replace(/\\/g, '/');
}

function resolveCanonical(pageRel, canonicalHref) {
  if (!canonicalHref) return null;
  if (/^https?:\/\//i.test(canonicalHref)) {
    try {
      const u = new URL(canonicalHref);
      if (u.hostname.includes('seasoningpackagingmachinery.com') || u.hostname.includes('npackpm.com')) {
        return u.pathname.replace(/^\//, '').replace(/\/$/, '') || 'index.html';
      }
      return null;
    } catch {
      return null;
    }
  }
  const pageDir = path.dirname(pageRel);
  const resolved = normalizePath(path.normalize(path.join(pageDir === '.' ? '' : pageDir, canonicalHref)));
  return resolved || 'index.html';
}

function pageKey(relPath) {
  const norm = normalizePath(relPath);
  return norm.toLowerCase();
}

function isHttrackMirror(relPath) {
  const norm = normalizePath(relPath);
  if (!/-2\.html$/i.test(norm)) return false;
  const primary = norm.replace(/-2\.html$/i, '.html');
  return allHtmlPages.has(pageKey(primary));
}

function isLangHomeDuplicate(relPath) {
  const norm = normalizePath(relPath);
  const m = norm.match(/^([a-z]{2})\/index\.html$/i);
  return m && LANGS.has(m[1].toLowerCase());
}

function isRedirectStub(relPath, html) {
  const base = path.basename(normalizePath(relPath));
  if (/^index[0-9a-f]{4}\.html$/i.test(base)) return true;
  if (html.length < 4000 && /Page has moved|META HTTP-EQUIV=["']Refresh["']/i.test(html)) return true;
  return false;
}

function isNoindex(html) {
  const m = html.match(/<meta\s+name="robots"\s+content="([^"]*)"/i);
  return m && /noindex/i.test(m[1]);
}

function toPublicUrl(relPath) {
  const norm = normalizePath(relPath);
  if (norm === 'index.html') return `${DOMAIN}/`;
  const segments = norm.split('/');
  const encoded = segments.map((seg) => encodeURIComponent(seg)).join('/');
  return `${DOMAIN}/${encoded}`;
}

function getPriority(relPath) {
  const norm = normalizePath(relPath);
  if (norm === 'index.html') return '1.0';
  if (/^(zh|fr|de|it|es|ru|pl|pt)\.html$/.test(norm)) return '0.9';
  if (
    /^(contact|zh\/联系|fr\/contact|de\/kontakt|it\/contatto|es\/pongase-en-contacto-con|ru\/связаться-с|pl\/kontakt|pt\/contacto)\.html$/i.test(
      norm,
    )
  ) {
    return '0.8';
  }
  if (/\/(product|produit|produkt|prodotto|producto|продукт|produkt|produto|产品)\.html$/i.test(norm)) {
    return '0.8';
  }
  if (/\/(about-us|关于我们|a-propos|uber-uns|chi-siamo|acerca|о-нас|o-nas|sobre-nos)/i.test(norm)) {
    return '0.8';
  }
  if (/(news|blog|technology|技术|technolog|новости|noticias|nachrichten)/i.test(norm)) {
    return '0.6';
  }
  return '0.7';
}

function getChangefreq(relPath) {
  const norm = normalizePath(relPath);
  if (norm === 'index.html' || /^(zh|fr|de|it|es|ru|pl|pt)\.html$/.test(norm)) return 'weekly';
  if (/contact|联系|kontakt|contatto|contacto|связаться/i.test(norm)) return 'monthly';
  if (/(news|blog|technology|技术|technolog|новости)/i.test(norm)) return 'weekly';
  return 'monthly';
}

function formatLastmod(ms) {
  return new Date(ms).toISOString().slice(0, 10);
}

const entries = [];

function collectPages(dir, rel = '') {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const fp = path.join(dir, ent.name);
    const r = rel ? `${rel}/${ent.name}` : ent.name;
    if (ent.isDirectory()) {
      if (SKIP_DIRS.has(ent.name)) continue;
      collectPages(fp, r);
    } else if (ent.name.endsWith('.html') && !ent.name.endsWith('.html.z')) {
      allHtmlPages.add(pageKey(r));
    }
  }
}

collectPages(siteRoot);

function walk(dir, rel = '') {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const fp = path.join(dir, ent.name);
    const r = rel ? `${rel}/${ent.name}` : ent.name;

    if (ent.isDirectory()) {
      if (SKIP_DIRS.has(ent.name)) {
        report.excluded.skipDir++;
        continue;
      }
      walk(fp, r);
      continue;
    }

    if (!ent.name.endsWith('.html') || ent.name.endsWith('.html.z')) continue;

    report.scanned++;
    const buf = fs.readFileSync(fp);
    if (!isHtmlPage(buf)) {
      report.excluded.nonHtml++;
      continue;
    }

    const html = buf.toString('utf8');
    if (isRedirectStub(r, html)) {
      report.excluded.redirectStub++;
      continue;
    }

    if (isNoindex(html)) {
      report.excluded.noindex++;
      continue;
    }

    if (isLangHomeDuplicate(r)) {
      report.excluded.langHomeDup++;
      continue;
    }

    if (isHttrackMirror(r)) {
      report.excluded.httrackMirror++;
      continue;
    }

    const canonicalRaw = extractCanonical(html);
    const canonicalPath = resolveCanonical(r, canonicalRaw);
    const selfKey = pageKey(r);

    if (canonicalPath && pageKey(canonicalPath) !== selfKey) {
      report.excluded.notCanonical++;
      continue;
    }

    const stat = fs.statSync(fp);
    entries.push({
      rel: r,
      url: toPublicUrl(r),
      lastmod: formatLastmod(stat.mtimeMs),
      priority: getPriority(r),
      changefreq: getChangefreq(r),
    });
    report.included++;
  }
}

walk(siteRoot);

entries.sort((a, b) => a.url.localeCompare(b.url));

const MAX_URLS = 50000;
const chunks = [];
for (let i = 0; i < entries.length; i += MAX_URLS) {
  chunks.push(entries.slice(i, i + MAX_URLS));
}

function buildUrlset(chunk) {
  const lines = chunk.map(
    (e) =>
      `  <url>\n    <loc>${escapeXml(e.url)}</loc>\n    <lastmod>${e.lastmod}</lastmod>\n    <changefreq>${e.changefreq}</changefreq>\n    <priority>${e.priority}</priority>\n  </url>`,
  );
  return (
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    lines.join('\n') +
    '\n</urlset>\n'
  );
}

function escapeXml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

let sitemapFiles = [];

if (chunks.length === 1) {
  fs.writeFileSync(path.join(siteRoot, 'sitemap.xml'), buildUrlset(chunks[0]), 'utf8');
  sitemapFiles = [`${DOMAIN}/sitemap.xml`];
} else {
  const indexEntries = chunks.map((_, i) => {
    const name = i === 0 ? 'sitemap.xml' : `sitemap-${i + 1}.xml`;
    fs.writeFileSync(path.join(siteRoot, name), buildUrlset(chunks[i]), 'utf8');
    return `  <sitemap>\n    <loc>${DOMAIN}/${name}</loc>\n  </sitemap>`;
  });
  fs.writeFileSync(
    path.join(siteRoot, 'sitemap-index.xml'),
    '<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
      indexEntries.join('\n') +
      '\n</sitemapindex>\n',
    'utf8',
  );
  sitemapFiles = [`${DOMAIN}/sitemap-index.xml`];
}

const robots =
  'User-agent: *\nAllow: /\n\n' +
  'Sitemap: ' +
  sitemapFiles[0] +
  '\n';

fs.writeFileSync(path.join(siteRoot, 'robots.txt'), robots, 'utf8');

const sample = entries.slice(0, 8).map((e) => e.url).join('\n');
const sampleEnd = entries.slice(-3).map((e) => e.url).join('\n');

const out = `Sitemap 生成报告
时间: ${new Date().toISOString()}
域名: ${DOMAIN}
扫描 HTML: ${report.scanned}
收录 URL: ${report.included}
排除(非页面): ${report.excluded.nonHtml}
排除(canonical 指向他页): ${report.excluded.notCanonical}
排除(HTTrack -2 镜像): ${report.excluded.httrackMirror}
排除(HTTrack 跳转页): ${report.excluded.redirectStub}
排除(noindex 页面): ${report.excluded.noindex}
排除(语言首页重复): ${report.excluded.langHomeDup}
Sitemap 文件: ${sitemapFiles.join(', ')}

首页抽样:
${sample}
...
${sampleEnd}
`;

fs.writeFileSync(path.join(siteRoot, '_generate_sitemap_report.txt'), out, 'utf8');
console.log(out);
