/**
 * Full-site SEO optimization for Google indexing compliance.
 * Domain: seasoningpackagingmachinery.com
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const siteRoot = path.dirname(fileURLToPath(import.meta.url));
const DOMAIN = 'https://seasoningpackagingmachinery.com';
const SKIP_DIRS = new Set(['node_modules', 'cache', '.vs', '.git', 'wp-content', 'netlify', 'functions']);
const LANGS = ['en', 'zh', 'fr', 'de', 'it', 'es', 'ru', 'pl', 'pt'];
const LANG_DIRS = new Set(['zh', 'fr', 'de', 'it', 'es', 'ru', 'pl', 'pt']);

const SITE_NAMES = {
  en: 'KIWL Liquid Filling Solutions',
  zh: 'KIWL 液体灌装解决方案',
  fr: 'KIWL Solutions de remplissage de liquides',
  de: 'KIWL Flüssigkeitsabfülllösungen',
  it: 'KIWL Soluzioni di riempimento liquidi',
  es: 'KIWL Soluciones de llenado de líquidos',
  ru: 'KIWL Решения для розлива жидкостей',
  pl: 'KIWL Rozwiązania do napełniania cieczy',
  pt: 'KIWL Soluções de enchimento de líquidos',
};

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

const report = {
  scanned: 0,
  modified: 0,
  redirectStubs: 0,
  domainReplaced: 0,
  canonicalFixed: 0,
  descAdded: 0,
  hreflangXDefault: 0,
  h1Fixed: 0,
  altAdded: 0,
  httrackRemoved: 0,
  noindexAdded: 0,
  ogFixed: 0,
  schemaFixed: 0,
  siteNameFixed: 0,
  deadLinksRemoved: 0,
};

function normPath(p) {
  return p.replace(/\\/g, '/');
}

function detectLang(relPath) {
  const parts = normPath(relPath).split('/');
  if (parts.length > 1 && LANG_DIRS.has(parts[0])) return parts[0];
  const base = parts[parts.length - 1].replace('.html', '');
  if (LANG_DIRS.has(base)) return base;
  return 'en';
}

function toAbsoluteUrl(relPath) {
  const norm = normPath(relPath);
  if (norm === 'index.html') return `${DOMAIN}/`;
  const segments = norm.split('/').map((seg) => encodeURIComponent(seg));
  return `${DOMAIN}/${segments.join('/')}`;
}

function resolveRelHref(pageRel, href) {
  if (!href || /^https?:\/\//i.test(href) || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) {
    return href;
  }
  const pageDir = path.dirname(pageRel);
  const resolved = normPath(path.normalize(path.join(pageDir === '.' ? '' : pageDir, href)));
  return resolved || 'index.html';
}

function isHtmlPage(buf) {
  return buf.length >= 200 && /<!doctype html|<html/i.test(buf.slice(0, 800).toString());
}

function isRedirectStub(html, relPath) {
  if (/^index[0-9a-f]{4}\.html$/i.test(path.basename(relPath))) return true;
  if (html.length < 4000 && /Page has moved|META HTTP-EQUIV=["']Refresh["']/i.test(html)) return true;
  if (html.length < 2000 && /HTTrack Website Copier/i.test(html) && !/<meta name="description"/i.test(html)) return true;
  return false;
}

function stripTitleSuffix(title) {
  return title.replace(/\s*[-–|]\s*(China|KIWL|Chiny|Cina|Китай).*$/i, '').trim() || title;
}

function escapeAttr(s) {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

function altFromSrc(src) {
  const base = path.basename(src.split('?')[0], path.extname(src.split('?')[0]));
  if (/^(npack|logo|icon|default|placeholder|spacer|blank)/i.test(base)) return '';
  return base
    .replace(/[-_]+/g, ' ')
    .replace(/\d{8,}/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120);
}

function replaceDomain(html) {
  let out = html;
  const before = out;
  // Preserve email addresses
  out = out.replace(/([a-zA-Z0-9._%+-])@npackpm\.com/g, '$1@npackpm.com\u0000EMAIL\u0000');
  out = out.replace(/https?:\/\/(www\.)?npackpm\.com/gi, DOMAIN);
  // Do NOT use broad //npackpm.com replace — it corrupts adjacent URLs in JSON-LD
  out = out.replace(/\u0000EMAIL\u0000/g, '');
  if (out !== before) report.domainReplaced++;
  return out;
}

function fixSchemaUrls(html, pageAbsUrl) {
  return html.replace(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi, (full, json) => {
    try {
      const data = JSON.parse(json.trim());
      const fixObj = (obj) => {
        if (!obj || typeof obj !== 'object') return;
        for (const [k, v] of Object.entries(obj)) {
          if (k === 'url' && (v === '' || v === '#webpage' || v === '#website')) {
            obj[k] = pageAbsUrl;
            report.schemaFixed++;
          } else if (typeof v === 'string') {
            if (/npackpm\.com/i.test(v)) obj[k] = v.replace(/https?:\/\/(www\.)?npackpm\.com/gi, DOMAIN);
            else if (k === 'url' && v.startsWith('#')) obj[k] = pageAbsUrl + v;
          } else if (Array.isArray(v)) {
            v.forEach(fixObj);
          } else if (typeof v === 'object') {
            fixObj(v);
          }
        }
      };
      if (Array.isArray(data['@graph'])) data['@graph'].forEach(fixObj);
      else fixObj(data);
      report.schemaFixed++;
      return full.replace(json, JSON.stringify(data));
    } catch {
      return full;
    }
  });
}

function removeHttrackComments(html) {
  const before = html;
  let out = html;
  out = out.replace(/<!--\s*Mirrored from[^>]*?-->\s*/gi, '');
  out = out.replace(/<!--\s*Added by HTTrack[^>]*?-->\s*/gi, '');
  out = out.replace(/<!--\s*Created by HTTrack[^>]*?-->\s*/gi, '');
  out = out.replace(/<!--\s*\/Added by HTTrack\s*-->\s*/gi, '');
  if (out !== before) report.httrackRemoved++;
  return out;
}

function removeDeadWpLinks(html) {
  const before = html;
  let out = html;
  out = out.replace(/<link rel="alternate" type="application\/rss\+xml"[^>]*>\s*/gi, '');
  out = out.replace(/<link rel="alternate" title="oEmbed[^>]*>\s*/gi, '');
  out = out.replace(/<link rel="https:\/\/api\.w\.org\/"[^>]*>\s*/gi, '');
  out = out.replace(/<link rel="alternate" title="JSON" type="application\/json"[^>]*>\s*/gi, '');
  out = out.replace(/<link rel="EditURI"[^>]*>\s*/gi, '');
  if (out !== before) report.deadLinksRemoved++;
  return out;
}

function upsertMeta(html, name, content) {
  const re = new RegExp(`<meta\\s+name="${name}"\\s+content="[^"]*"\\s*/?>`, 'i');
  const tag = `<meta name="${name}" content="${escapeAttr(content)}" />`;
  if (re.test(html)) return html.replace(re, tag);
  const insertAt = html.match(/<head[^>]*>/i);
  if (insertAt) {
    const idx = insertAt.index + insertAt[0].length;
    return html.slice(0, idx) + `\n\t${tag}` + html.slice(idx);
  }
  return html;
}

function upsertLinkCanonical(html, href) {
  const tag = `<link rel="canonical" href="${href}" />`;
  const re = /<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/i;
  if (re.test(html)) {
    report.canonicalFixed++;
    return html.replace(re, tag);
  }
  const descMatch = html.match(/<meta\s+name="description"[^>]*>/i);
  if (descMatch) {
    report.canonicalFixed++;
    return html.replace(descMatch[0], `${descMatch[0]}\n\t${tag}`);
  }
  const titleMatch = html.match(/<title>[^<]*<\/title>/i);
  if (titleMatch) {
    report.canonicalFixed++;
    return html.replace(titleMatch[0], `${titleMatch[0]}\n\t${tag}`);
  }
  return html;
}

function upsertOg(html, prop, content) {
  const re = new RegExp(`<meta\\s+property="${prop}"\\s+content="[^"]*"\\s*/?>`, 'i');
  const tag = `<meta property="${prop}" content="${escapeAttr(content)}" />`;
  if (re.test(html)) {
    report.ogFixed++;
    return html.replace(re, tag);
  }
  return html;
}

function makeAbsoluteOgImage(html, pageRel) {
  return html.replace(/<meta\s+property="og:image(?::secure_url)?"\s+content="([^"]*)"\s*\/?>/gi, (full, src) => {
    if (/^https?:\/\//i.test(src)) {
      if (/^https:\/\/seasoningpackagingmachinery\.com\/(de|fr|es|it|ru|pl|pt|zh)\/wp-content\//.test(src)) {
        report.ogFixed++;
        return full.replace(/\/(de|fr|es|it|ru|pl|pt|zh)\/wp-content\//, '/wp-content/');
      }
      return full;
    }
    const resolved = resolveRelHref(pageRel, src);
    report.ogFixed++;
    return full.replace(src, toAbsoluteUrl(resolved));
  });
}

function addHreflangXDefault(html, pageRel) {
  if (/hreflang="x-default"/i.test(html)) return html;
  const enMatch = html.match(/<link[^>]+hreflang="en(?:-US)?"[^>]+href="([^"]+)"/i)
    || html.match(/<link[^>]+href="([^"]+)"[^>]+hreflang="en(?:-US)?"/i);
  if (!enMatch) return html;
  const enHref = enMatch[1];
  const absEn = /^https?:\/\//i.test(enHref) ? enHref : toAbsoluteUrl(resolveRelHref(pageRel, enHref));
  const tag = `<link rel="alternate" hreflang="x-default" href="${absEn}"/>`;
  report.hreflangXDefault++;
  // Insert after last hreflang
  const lastHl = [...html.matchAll(/<link[^>]+hreflang="[^"]+"[^>]*>/gi)].pop();
  if (lastHl) {
    const idx = lastHl.index + lastHl[0].length;
    return html.slice(0, idx) + `\n${tag}` + html.slice(idx);
  }
  return html;
}

function fixHreflangAbsolute(html, pageRel) {
  return html.replace(/(<link[^>]+hreflang="[^"]+"[^>]+href=")([^"]+)(")/gi, (full, pre, href, post) => {
    if (/^https?:\/\//i.test(href)) return full;
    return `${pre}${toAbsoluteUrl(resolveRelHref(pageRel, href))}${post}`;
  }).replace(/(<link[^>]+href=")([^"]+)("[^>]+hreflang="[^"]+")/gi, (full, pre, href, post) => {
    if (/^https?:\/\//i.test(href)) return full;
    return `${pre}${toAbsoluteUrl(resolveRelHref(pageRel, href))}${post}`;
  });
}

function addDescription(html, lang) {
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
  const titleMatch = html.match(/<title>[^<]*<\/title>/i);
  if (titleMatch) {
    report.descAdded++;
    return html.replace(titleMatch[0], `${titleMatch[0]}\n${tag.trim()}`);
  }
  return html;
}

function syncOgDescription(html) {
  const desc = (html.match(/<meta\s+name="description"\s+content="([^"]*)"/i) || [])[1];
  if (!desc) return html;
  if (!/<meta\s+property="og:description"/i.test(html)) {
    const ogTitle = (html.match(/<meta\s+property="og:title"\s+content="([^"]*)"/i) || [])[1] || '';
    const insertAfter = html.match(/<meta\s+property="og:title"[^>]*>/i);
    if (insertAfter) {
      report.ogFixed++;
      return html.replace(insertAfter[0], `${insertAfter[0]}\n\t\t<meta property="og:description" content="${escapeAttr(desc)}" />`);
    }
  }
  if (/<meta\s+property="og:description"/i.test(html)) {
    return html.replace(/<meta\s+property="og:description"\s+content="[^"]*"\s*\/?>/i, () => {
      report.ogFixed++;
      return `<meta property="og:description" content="${escapeAttr(desc)}" />`;
    });
  }
  if (!/<meta\s+name="twitter:description"/i.test(html) && desc) {
    const tw = (html.match(/<meta\s+name="twitter:title"[^>]*>/i) || [])[0];
    if (tw) {
      report.ogFixed++;
      return html.replace(tw, `${tw}\n\t\t<meta name="twitter:description" content="${escapeAttr(desc)}" />`);
    }
  }
  return html;
}

function fixH1(html) {
  if (/<h1[^>]*>[\s\S]*?<\/h1>/i.test(html)) return html;
  // Promote first elementor h2 heading in main content
  const h2Match = html.match(/<h2(\s+class="elementor-heading-title[^"]*"[^>]*)>([\s\S]*?)<\/h2>/i);
  if (h2Match) {
    report.h1Fixed++;
    return html.replace(h2Match[0], `<h1${h2Match[1]}>${h2Match[2]}</h1>`);
  }
  const title = (html.match(/<title>([^<]*)<\/title>/i) || [])[1]?.trim();
  if (title) {
    const h1Text = stripTitleSuffix(title);
    report.h1Fixed++;
    const insert = `\n<h1 class="screen-reader-text">${escapeAttr(h1Text)}</h1>\n`;
    const bodyMatch = html.match(/<body[^>]*>/i);
    if (bodyMatch) {
      const idx = bodyMatch.index + bodyMatch[0].length;
      return html.slice(0, idx) + insert + html.slice(idx);
    }
  }
  return html;
}

function fixImageAlts(html) {
  return html.replace(/<img\b([^>]*?)>/gi, (full, attrs) => {
    if (/\balt\s*=\s*["'][^"']+["']/i.test(attrs)) return full;
    if (/\balt\s*=\s*["']\s*["']/i.test(attrs)) {
      const src = (attrs.match(/\bsrc\s*=\s*["']([^"']+)["']/i) || [])[1] || '';
      const alt = altFromSrc(src);
      if (!alt) return full;
      report.altAdded++;
      return `<img${attrs.replace(/\balt\s*=\s*["']\s*["']/i, `alt="${escapeAttr(alt)}"`)}>`;
    }
    const src = (attrs.match(/\bsrc\s*=\s*["']([^"']+)["']/i) || [])[1] || '';
    const alt = altFromSrc(src);
    if (!alt) return full;
    report.altAdded++;
    return `<img${attrs} alt="${escapeAttr(alt)}">`;
  });
}

function fixSiteName(html, lang) {
  const name = SITE_NAMES[lang] || SITE_NAMES.en;
  const re = /<meta\s+property="og:site_name"\s+content="[^"]*"\s*\/?>/i;
  if (re.test(html)) {
    report.siteNameFixed++;
    return html.replace(re, `<meta property="og:site_name" content="${escapeAttr(name)}" />`);
  }
  return html;
}

function processRedirectStub(html) {
  report.redirectStubs++;
  let out = html;
  if (!/noindex/i.test(out)) {
    out = out.replace(/<head[^>]*>/i, (m) => `${m}\n<meta name="robots" content="noindex, nofollow" />`);
    report.noindexAdded++;
  }
  out = removeHttrackComments(out);
  return out;
}

function processRealPage(html, relPath, lang) {
  let out = html;
  const absUrl = toAbsoluteUrl(relPath);

  out = replaceDomain(out);
  out = removeHttrackComments(out);
  out = removeDeadWpLinks(out);

  out = upsertLinkCanonical(out, absUrl);
  out = upsertOg(out, 'og:url', absUrl);
  out = makeAbsoluteOgImage(out, relPath);
  out = fixSiteName(out, lang);
  out = addDescription(out, lang);
  out = syncOgDescription(out);
  out = fixSchemaUrls(out, absUrl);

  // Ensure robots allows indexing (unless already noindex for pagination)
  if (!/noindex/i.test(out)) {
    out = upsertMeta(out, 'robots', 'max-image-preview:large, index, follow');
  }

  out = fixHreflangAbsolute(out, relPath);
  out = addHreflangXDefault(out, relPath);
  out = fixH1(out);
  out = fixImageAlts(out);

  // Fix RocketPreload / Elementor siteUrl in inline scripts
  out = out.replace(/"siteUrl"\s*:\s*"https?:\\\/\\\/(www\.)?npackpm\.com"/gi, `"siteUrl":"${DOMAIN.replace(/\//g, '\\/')}"`);
  out = out.replace(/"siteUrl"\s*:\s*"https?:\/\/(www\.)?npackpm\.com"/gi, `"siteUrl":"${DOMAIN}"`);

  // -2 mirror pages: noindex
  if (/-2\.html$/i.test(relPath)) {
    out = upsertMeta(out, 'robots', 'noindex, follow');
    report.noindexAdded++;
  }

  return out;
}

const files = [];
function walk(dir, rel = '') {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const fp = path.join(dir, ent.name);
    const r = rel ? `${rel}/${ent.name}` : ent.name;
    if (ent.isDirectory()) {
      if (SKIP_DIRS.has(ent.name)) continue;
      walk(fp, r);
    } else if (ent.name.endsWith('.html') && !ent.name.endsWith('.html.z')) {
      files.push(r);
    }
  }
}
walk(siteRoot);

for (const rel of files) {
  const fp = path.join(siteRoot, rel);
  const buf = fs.readFileSync(fp);
  if (!isHtmlPage(buf)) continue;

  report.scanned++;
  const html = buf.toString('utf8');
  const lang = detectLang(rel);

  let out;
  if (isRedirectStub(html, rel)) {
    out = processRedirectStub(html);
  } else {
    out = processRealPage(html, rel, lang);
  }

  if (out !== html) {
    fs.writeFileSync(fp, out, 'utf8');
    report.modified++;
  }
}

const reportText = `# 全站 SEO 优化报告
时间: ${new Date().toISOString()}
域名: ${DOMAIN}

## 处理统计
- 扫描页面: ${report.scanned}
- 修改文件: ${report.modified}
- HTTrack 跳转页处理: ${report.redirectStubs}
- 添加 noindex: ${report.noindexAdded}
- 域名替换: ${report.domainReplaced} 文件
- Canonical 修复: ${report.canonicalFixed}
- Description 补全: ${report.descAdded}
- hreflang x-default: ${report.hreflangXDefault}
- H1 修复: ${report.h1Fixed}
- 图片 alt 补全: ${report.altAdded}
- HTTrack 注释清理: ${report.httrackRemoved} 文件
- OG 标签修复: ${report.ogFixed}
- Schema 修复: ${report.schemaFixed}
- og:site_name 统一: ${report.siteNameFixed}
- 无效 WP 链接移除: ${report.deadLinksRemoved} 文件
`;

fs.writeFileSync(path.join(siteRoot, '_optimize_seo_report.md'), reportText, 'utf8');
console.log(reportText);
