/**
 * 扩展扫描：产品页 + 详情页全部 href，含跨语言英文路径
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const siteRoot = path.dirname(fileURLToPath(import.meta.url));
const LANG_DIRS = new Set(['zh', 'de', 'fr', 'es', 'it', 'ru', 'pl', 'pt']);
const SKIP = new Set(['wp-json', 'node_modules', 'cache', 'wp-content']);

const issues = [];
let scanned = 0;

function detectLang(rel) {
  const first = rel.split('/')[0];
  return LANG_DIRS.has(first) ? first : 'en';
}

function isProductRelated(rel, html) {
  const base = path.basename(rel);
  if (/^(product|produkt|produit|producto|prodotto|produto|продукт|产品)\.html$/i.test(base)) return true;
  if (/\/(product|produkt|produit|producto|prodotto|produto|продукт|产品)\//i.test(rel)) return true;
  if (html.includes('data-archive="default"') && html.includes('entry-card')) return true;
  if (/category-(product|hot-filling)/.test(html) && html.includes('entry-header')) return true;
  if (html.includes('entry-card') && html.includes('type-page')) return true;
  return false;
}

function resolveHref(fromFile, href) {
  if (!href || /^(https?:|mailto:|tel:|javascript:|#)/i.test(href)) return null;
  const h = href.split('#')[0].split('?')[0];
  if (!h) return null;
  return path.normalize(path.join(path.dirname(fromFile), h.replace(/^\.\//, '')));
}

function checkFile(fp) {
  const buf = fs.readFileSync(fp);
  if (buf.length < 2000 || (buf[0] === 0x1f && buf[1] === 0x8b)) return;
  const html = buf.toString('utf8');
  const rel = path.relative(siteRoot, fp).replace(/\\/g, '/');
  if (!isProductRelated(rel, html)) return;
  scanned++;

  const lang = detectLang(rel);
  const hrefRe = /\bhref=(["'])([^"']+)\1/gi;
  const seen = new Set();

  for (const m of html.matchAll(hrefRe)) {
    const href = m[2];
    if (/^(https?:|mailto:|tel:|javascript:|#|wp-content)/i.test(href)) continue;
    if (!href.includes('.html')) continue;
    const key = href;
    if (seen.has(key)) continue;
    seen.add(key);

    const resolved = resolveHref(fp, href);
    if (!resolved) continue;
    if (!fs.existsSync(resolved)) {
      issues.push({ rel, href, type: '404' });
      continue;
    }

    if (lang !== 'en') {
      const resolvedRel = path.relative(siteRoot, resolved).replace(/\\/g, '/');
      const rLang = detectLang(resolvedRel);
      if (rLang === 'en' && !resolvedRel.startsWith('../') && !href.startsWith('../'.repeat(5))) {
        if (/^(product|about-us|news|contact|services|technology|liquid-|piston-|monoblock-)/i.test(path.basename(href))) {
          issues.push({ rel, href, type: 'cross-lang-en' });
        }
      }
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

const byType = { '404': [], 'cross-lang-en': [] };
for (const i of issues) byType[i.type].push(i);

const text = `产品页全量链接扫描
扫描: ${scanned}
404: ${byType['404'].length}
跨语言英文: ${byType['cross-lang-en'].length}

404 样例:
${byType['404'].slice(0, 60).map((i) => `  ${i.rel} → ${i.href}`).join('\n') || '  无'}

跨语言样例:
${byType['cross-lang-en'].slice(0, 40).map((i) => `  ${i.rel} → ${i.href}`).join('\n') || '  无'}
`;
console.log(text);
fs.writeFileSync(path.join(siteRoot, 'validate_product_links_full.txt'), text, 'utf8');
