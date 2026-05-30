/**
 * Fix homepage card-section CTA links (all 9 languages):
 * - 78e47bd (About Us "Learn More") → about us page (menu-item-1954)
 * - 36f9ee1 (Main Products "Learn More") → product center (menu-item-2418)
 * - 87e5efd (Instant Consult WhatsApp) → https://wa.me/8617751189576 + +86-17751189576
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const siteRoot = path.dirname(fileURLToPath(import.meta.url));

const HOME_PAGES = [
  'index.html',
  'zh.html',
  'zh/index.html',
  'fr.html',
  'fr/index.html',
  'de.html',
  'de/index.html',
  'it.html',
  'it/index.html',
  'es.html',
  'es/index.html',
  'ru.html',
  'ru/index.html',
  'pl.html',
  'pl/index.html',
  'pt.html',
  'pt/index.html',
];

const NEW_DISPLAY = '+86-17751189576';
const NEW_WA_LINK = 'https://wa.me/8617751189576';

const report = { processed: 0, updated: 0, fixes: [] };

function extractMenuHref(html, menuItemId) {
  const re = new RegExp('menu-item-' + menuItemId + '[\\s\\S]*?<a href="([^"]+)"', 'i');
  const m = html.match(re);
  return m ? m[1] : null;
}

function fixWidgetHref(html, widgetId, newHref) {
  const re = new RegExp(
    '(elementor-element-' + widgetId + '[\\s\\S]*?<a class="elementor-button elementor-button-link elementor-size-sm" href=")([^"]+)(")',
    'i',
  );
  return html.replace(re, `$1${newHref}$3`);
}

function fixWidget87e5efd(html) {
  const re =
    /(elementor-element-87e5efd[\s\S]*?<a class="elementor-button elementor-button-link elementor-size-sm" href=")([^"]+)("[\s\S]*?<span class="elementor-button-text">)([^<]*)(<\/span>)/i;
  if (!re.test(html)) return html;
  return html.replace(re, (match, before, href, mid, phone, after) => {
    if (href === NEW_WA_LINK && phone === NEW_DISPLAY) return match;
    return before + NEW_WA_LINK + mid + NEW_DISPLAY + after;
  });
}

function getWidgetHref(html, widgetId) {
  const re = new RegExp(
    'elementor-element-' + widgetId + '[\\s\\S]*?<a class="elementor-button elementor-button-link elementor-size-sm" href="([^"]+)"',
    'i',
  );
  const m = html.match(re);
  return m ? m[1] : null;
}

function getWidgetPhone(html, widgetId) {
  const re = new RegExp(
    'elementor-element-' + widgetId + '[\\s\\S]*?<span class="elementor-button-text">([^<]+)',
    'i',
  );
  const m = html.match(re);
  return m ? m[1] : null;
}

for (const rel of HOME_PAGES) {
  const fp = path.join(siteRoot, rel);
  if (!fs.existsSync(fp)) continue;

  report.processed++;
  let html = fs.readFileSync(fp, 'utf8');
  const original = html;

  const aboutHref = extractMenuHref(html, '1954');
  const productHref = extractMenuHref(html, '2418');

  if (!aboutHref || !productHref) {
    report.fixes.push(`${rel}: SKIP missing menu hrefs (about=${aboutHref}, product=${productHref})`);
    continue;
  }

  html = fixWidgetHref(html, '78e47bd', aboutHref);
  html = fixWidgetHref(html, '36f9ee1', productHref);
  html = fixWidget87e5efd(html);

  if (html !== original) {
    fs.writeFileSync(fp, html, 'utf8');
    report.updated++;
  }

  report.fixes.push(
    `${rel}: about=${getWidgetHref(html, '78e47bd')} | product=${getWidgetHref(html, '36f9ee1')} | whatsapp=${getWidgetHref(html, '87e5efd')} phone=${getWidgetPhone(html, '87e5efd')}`,
  );
}

const out = `首页卡片区 CTA 链接修复报告
时间: ${new Date().toISOString()}
处理: ${report.processed}
更新: ${report.updated}

${report.fixes.join('\n')}
`;

fs.writeFileSync(path.join(siteRoot, '_fix_homepage_card_cta_report.txt'), out, 'utf8');
console.log(out);
