/**
 * Restore corrupted Blocksy ct_localizations URLs (broken mobile menu / submenu).
 * Webpack public_path comes from public_url; when it pointed at npack.png.webp, menu JS failed.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const siteRoot = path.dirname(fileURLToPath(import.meta.url));
const SKIP_DIRS = new Set(['node_modules', 'cache', '.vs', '.git']);

const URL_PATHS = {
  ajax_url: 'wp-admin/admin-ajax.php',
  public_url: 'wp-content/themes/blocksy/static/bundle/',
  rest_url: 'wp-json/',
  search_url: 'search/QUERY_STRING',
};

const CHUNK_URLS = {
  'blocksy_pro_micro_popups':
    'wp-content/plugins/blocksy-companion-pro2.1.15正/framework/premium/static/bundle/micro-popups.js?ver=2.1.42',
  'blocksy_sticky_header':
    'wp-content/plugins/blocksy-companion-pro2.1.15正/static/bundle/sticky.js?ver=2.1.42',
};

const STYLE_URLS = {
  lazy_load: 'wp-content/themes/blocksy/static/bundle/non-critical-styles.min.css?ver=2.1.42',
  search_lazy: 'wp-content/themes/blocksy/static/bundle/non-critical-search-styles.min.css?ver=2.1.42',
  back_to_top: 'wp-content/themes/blocksy/static/bundle/back-to-top.min.css?ver=2.1.42',
};

const SELECTOR_URLS = [
  {
    selector: '.ct-header-cart, #woo-cart-panel',
    url: 'wp-content/themes/blocksy/static/bundle/cart-header-element-lazy.min.css?ver=2.1.42',
  },
  {
    selector: '.flexy',
    url: 'wp-content/themes/blocksy/static/bundle/flexy.min.css?ver=2.1.42',
  },
  {
    selector: '.ct-pagination',
    url: 'wp-content/themes/blocksy/static/bundle/pagination.min.css?ver=2.1.42',
  },
  {
    selector: '.ct-media-container[data-media-id], .ct-dynamic-media[data-media-id]',
    url:
      'wp-content/plugins/blocksy-companion-pro2.1.15正/framework/premium/static/bundle/video-lazy.min.css?ver=2.1.42',
  },
  {
    selector: '#account-modal',
    url: 'wp-content/plugins/blocksy-companion-pro2.1.15正/static/bundle/header-account-modal-lazy.min.css?ver=2.1.42',
  },
  {
    selector: '.ct-header-account',
    url: 'wp-content/plugins/blocksy-companion-pro2.1.15正/static/bundle/header-account-dropdown-lazy.min.css?ver=2.1.42',
  },
];

const report = { scanned: 0, updated: 0, skipped: 0, errors: [] };

function isValidHtml(buf) {
  return buf.length > 200 && /<!doctype html|<html/i.test(buf.slice(0, 800).toString('utf8'));
}

function assetPrefix(html) {
  const m = html.match(/id=["']jquery-core-js["'][^>]*\ssrc=["']([^"']+)["']/i)
    || html.match(/src=["']([^"']+)["'][^>]*id=["']jquery-core-js["']/i);
  if (!m) return '';
  return m[1].replace(/wp-includes\/.*$/, '');
}

function expectedUrls(prefix) {
  const urls = {};
  for (const [key, rel] of Object.entries(URL_PATHS)) {
    urls[key] = prefixPath(prefix, rel);
  }
  return urls;
}

function needsFix(loc, prefix) {
  const exp = expectedUrls(prefix);
  for (const key of Object.keys(URL_PATHS)) {
    if (loc[key] !== exp[key]) return true;
  }
  if ((loc.dynamic_js_chunks || []).some((c) => {
    const rel = CHUNK_URLS[c.id];
    return rel && c.url !== prefixPath(prefix, rel);
  })) return true;
  if (loc.dynamic_styles) {
    for (const [key, rel] of Object.entries(STYLE_URLS)) {
      if (loc.dynamic_styles[key] !== prefixPath(prefix, rel)) return true;
    }
  }
  if (Array.isArray(loc.dynamic_styles_selectors)) {
    for (let i = 0; i < SELECTOR_URLS.length; i++) {
      const sel = loc.dynamic_styles_selectors[i];
      if (sel && sel.url !== prefixPath(prefix, SELECTOR_URLS[i].url)) return true;
    }
  }
  return false;
}

function prefixPath(prefix, rel) {
  return `${prefix}${rel}`;
}

function fixLocalizations(loc, prefix) {
  for (const [key, rel] of Object.entries(URL_PATHS)) {
    loc[key] = prefixPath(prefix, rel);
  }

  if (Array.isArray(loc.dynamic_js_chunks)) {
    for (const chunk of loc.dynamic_js_chunks) {
      if (chunk.id && CHUNK_URLS[chunk.id]) {
        chunk.url = prefixPath(prefix, CHUNK_URLS[chunk.id]);
      }
    }
  }

  if (loc.dynamic_styles && typeof loc.dynamic_styles === 'object') {
    for (const [key, rel] of Object.entries(STYLE_URLS)) {
      loc.dynamic_styles[key] = prefixPath(prefix, rel);
    }
  }

  if (Array.isArray(loc.dynamic_styles_selectors)) {
    for (let i = 0; i < loc.dynamic_styles_selectors.length; i++) {
      if (SELECTOR_URLS[i]) {
        loc.dynamic_styles_selectors[i].url = prefixPath(prefix, SELECTOR_URLS[i].url);
      }
    }
  }

  return loc;
}

function processFile(fp) {
  const buf = fs.readFileSync(fp);
  if (!isValidHtml(buf)) return;
  report.scanned++;

  const html = buf.toString('utf8');
  const re = /var ct_localizations = (\{[\s\S]*?\});/;
  const m = html.match(re);
  if (!m) return;

  let loc;
  try {
    loc = JSON.parse(m[1]);
  } catch (e) {
    report.errors.push(`${path.relative(siteRoot, fp)}: JSON parse error`);
    return;
  }

  const prefix = assetPrefix(html);

  if (!needsFix(loc, prefix)) {
    report.skipped++;
    return;
  }
  const fixed = fixLocalizations(loc, prefix);
  const replacement = `var ct_localizations = ${JSON.stringify(fixed)};`;
  const next = html.replace(re, replacement);
  if (next === html) return;

  fs.writeFileSync(fp, next, 'utf8');
  report.updated++;
}

function walk(dir) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const fp = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (SKIP_DIRS.has(ent.name)) continue;
      if (ent.name === 'wp-content' && dir === siteRoot) continue;
      walk(fp);
    } else if (ent.name.endsWith('.html') && !ent.name.endsWith('.html.z')) {
      processFile(fp);
    }
  }
}

walk(siteRoot);

const sample = ['index.html', 'de/index.html', 'zh/index.html', 'product/page/2.html'].map((rel) => {
  const fp = path.join(siteRoot, rel);
  if (!fs.existsSync(fp)) return `${rel}: missing`;
  const m = fs.readFileSync(fp, 'utf8').match(/var ct_localizations = (\{[\s\S]*?\});/);
  if (!m) return `${rel}: no ct_localizations`;
  const loc = JSON.parse(m[1]);
  return `${rel}\n  public_url: ${loc.public_url}\n  chunk0: ${loc.dynamic_js_chunks?.[0]?.url ?? 'n/a'}`;
}).join('\n\n');

const out = `ct_localizations 修复报告
时间: ${new Date().toISOString()}
扫描: ${report.scanned}
更新: ${report.updated}
跳过(正常): ${report.skipped}
错误: ${report.errors.length}
${report.errors.slice(0, 20).join('\n')}

抽样:
${sample}
`;

fs.writeFileSync(path.join(siteRoot, '_ct_localizations_fix_report.txt'), out, 'utf8');
console.log(out);
