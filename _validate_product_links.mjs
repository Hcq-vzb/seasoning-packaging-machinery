/**
 * 扫描产品列表/分页/详情页中的失效 href
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const siteRoot = path.dirname(fileURLToPath(import.meta.url));
const LANG_DIRS = new Set(['zh', 'de', 'fr', 'es', 'it', 'ru', 'pl', 'pt']);
const SKIP = new Set(['wp-json', 'node_modules', 'cache']);

const PRODUCT_LIST = new Set([
  'product.html', 'produkt.html', 'produit.html', 'producto.html', 'prodotto.html',
  'produto.html', 'продукт.html', '产品.html',
]);

const issues = [];
let scanned = 0;

function detectLang(rel) {
  const first = rel.split('/')[0];
  return LANG_DIRS.has(first) ? first : 'en';
}

function isProductPage(rel) {
  const base = path.basename(rel);
  if (PRODUCT_LIST.has(base)) return true;
  if (/\/(product|produkt|produit|producto|prodotto|produto|продукт|产品)\/(page|seite|pagina|strona|页码|страница)\/\d+\.html$/i.test(rel)) return true;
  if (/\/(product|produkt|produit|producto|prodotto|produto|продукт|产品)\/[^/]+\.html$/i.test(rel)) return true;
  return false;
}

function isProductDetail(rel, html) {
  if (isProductPage(rel)) return true;
  if (html.includes('data-archive="default"') && html.includes('entry-card')) return true;
  if (html.includes('category-product') || html.includes('category-hot-filling')) return true;
  if (/post-\d+ page type-page/.test(html) && html.includes('entry-header')) return true;
  return false;
}

function resolveHref(fromFile, href) {
  if (!href || /^(https?:|mailto:|tel:|javascript:|#)/i.test(href)) return null;
  let h = href.split('#')[0].split('?')[0];
  if (!h || h.endsWith('/')) return null;
  return path.normalize(path.join(path.dirname(fromFile), h.replace(/^\.\//, '')));
}

function checkFile(fp) {
  const buf = fs.readFileSync(fp);
  if (buf.length < 2000 || (buf[0] === 0x1f && buf[1] === 0x8b)) return;
  const html = buf.toString('utf8');
  const rel = path.relative(siteRoot, fp).replace(/\\/g, '/');
  if (!isProductDetail(rel, html)) return;

  scanned++;
  const contexts = [];

  for (const m of html.matchAll(/<article class="entry-card[\s\S]*?<\/article>/gi)) {
    for (const h of m[0].matchAll(/\bhref=(["'])([^"']+\.html[^"']*)\1/gi)) contexts.push({ ctx: 'entry-card', href: h[2] });
  }
  const nav = html.match(/<nav class="ct-pagination"[\s\S]*?<\/nav>/i)?.[0] || '';
  for (const h of nav.matchAll(/\bhref=(["'])([^"']+)\1/gi)) contexts.push({ ctx: 'pagination', href: h[2] });
  for (const m of html.matchAll(/menu-item-2418[\s\S]*?<\/li>/gi)) {
    for (const h of m[0].matchAll(/\bhref=(["'])([^"']+\.html[^"']*)\1/gi)) contexts.push({ ctx: 'product-menu', href: h[2] });
  }
  for (const h of html.matchAll(/class="entry-title"[\s\S]*?\bhref=(["'])([^"']+\.html[^"']*)\1/gi)) {
    contexts.push({ ctx: 'entry-title', href: h[2] });
  }

  const seen = new Set();
  for (const { ctx, href } of contexts) {
    const key = `${ctx}|${href}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const resolved = resolveHref(fp, href);
    if (!resolved) continue;
    if (!fs.existsSync(resolved)) {
      issues.push({ rel, ctx, href, resolved: path.relative(siteRoot, resolved).replace(/\\/g, '/') });
    }
  }
}

function walk(d) {
  for (const ent of fs.readdirSync(d, { withFileTypes: true })) {
    const f = path.join(d, ent.name);
    if (ent.isDirectory()) {
      if (!SKIP.has(ent.name)) walk(f);
    } else if (ent.name.endsWith('.html') && !ent.name.endsWith('.html.z')) {
      checkFile(f);
    }
  }
}

walk(siteRoot);

const grouped = {};
for (const i of issues) {
  const k = i.href;
  grouped[k] = (grouped[k] || 0) + 1;
}

const topBroken = Object.entries(grouped).sort((a, b) => b[1] - a[1]).slice(0, 30);

const text = `产品页链接扫描
时间: ${new Date().toISOString()}
扫描产品相关页: ${scanned}
失效链接: ${issues.length}

高频失效 href:
${topBroken.map(([h, c]) => `  ${c}x ${h}`).join('\n') || '  无'}

样例 (前 50):
${issues.slice(0, 50).map((i) => `  ${i.rel} [${i.ctx}] ${i.href}`).join('\n') || '  无'}
`;

fs.writeFileSync(path.join(siteRoot, 'validate_product_links_report.txt'), text, 'utf8');
console.log(text);
