/**
 * Fix homepage hero slideshow CTA links:
 * - f716481 (Products / 设备中心) → product center page
 * - 6b4a0db (Solutions / 方案中心) → bottling solutions page
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

function getWidgetHref(html, widgetId) {
  const re = new RegExp(
    'elementor-element-' + widgetId + '[\\s\\S]*?<a class="elementor-button elementor-button-link elementor-size-sm" href="([^"]+)"',
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

  const productHref = extractMenuHref(html, '2418');
  const solutionsHref = extractMenuHref(html, '2419');

  if (!productHref || !solutionsHref) {
    report.fixes.push(`${rel}: SKIP missing menu hrefs (product=${productHref}, solutions=${solutionsHref})`);
    continue;
  }

  html = fixWidgetHref(html, 'f716481', productHref);
  html = fixWidgetHref(html, '6b4a0db', solutionsHref);

  if (html !== original) {
    fs.writeFileSync(fp, html, 'utf8');
    report.updated++;
  }

  report.fixes.push(
    `${rel}: products=${getWidgetHref(html, 'f716481')} | solutions=${getWidgetHref(html, '6b4a0db')}`,
  );
}

const out = `首页幻灯片 CTA 链接修复报告
时间: ${new Date().toISOString()}
处理: ${report.processed}
更新: ${report.updated}

${report.fixes.join('\n')}
`;

fs.writeFileSync(path.join(siteRoot, '_fix_home_hero_cta_report.txt'), out, 'utf8');
console.log(out);
