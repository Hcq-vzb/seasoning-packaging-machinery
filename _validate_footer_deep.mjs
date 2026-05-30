import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const siteRoot = path.dirname(fileURLToPath(import.meta.url));
const LANG_DIRS = new Set(['zh', 'pl', 'de', 'fr', 'es', 'it', 'ru', 'pt']);
const SKIP = new Set(['wp-content', 'wp-json', 'assets', 'node_modules']);
const FOOTER_IDS = ['3970', '3969', '3968', '3971'];
const issues = [];

function walk(d, lang) {
  for (const ent of fs.readdirSync(d, { withFileTypes: true })) {
    const f = path.join(d, ent.name);
    if (ent.isDirectory()) {
      if (SKIP.has(ent.name)) continue;
      walk(f, lang);
    } else if (ent.name.endsWith('.html') && !/-[2-9]\.html$/i.test(ent.name)) {
      const buf = fs.readFileSync(f);
      if (buf.length < 2000) continue;
      const html = buf.toString('utf8');
      const rel = path.relative(siteRoot, f).replace(/\\/g, '/');

      for (const id of FOOTER_IDS) {
        const re = new RegExp(`id="menu-item-${id}"[^>]*>\\s*<a\\s+[^>]*href=(["'])([^"']+)\\1`, 'gi');
        let m;
        while ((m = re.exec(html))) {
          const href = m[2];
          if (/^(https?:|#|mailto:)/i.test(href)) {
            issues.push({ rel, id, type: 'bad-scheme', href });
            continue;
          }
          const resolved = path.normalize(path.join(path.dirname(f), href));
          if (!fs.existsSync(resolved)) {
            issues.push({ rel, id, type: '404', href, resolved: path.relative(siteRoot, resolved) });
          }
          if (lang !== 'en' && /about-us\/npack-/i.test(href)) {
            issues.push({ rel, id, type: 'cross-lang', href });
          }
        }
      }

      // 页脚 widget 区域英文路径（无 menu-item id）
      if (lang !== 'en') {
        const footer = html.match(/<footer[\s\S]*?<\/footer>/i)?.[0] || '';
        if (/about-us\/npack-(factory|customer|certification|team)\.html/i.test(footer)) {
          issues.push({ rel, type: 'footer-en-path-no-id' });
        }
      }
    }
  }
}

walk(siteRoot, 'en');
for (const lang of LANG_DIRS) {
  const d = path.join(siteRoot, lang);
  if (fs.existsSync(d)) walk(d, lang);
}

const text = `深度验证: ${issues.length} 个问题\n${issues.slice(0, 50).map((i) => JSON.stringify(i)).join('\n') || '全部通过'}`;
console.log(text);
fs.appendFileSync(path.join(siteRoot, 'fix_footer_links_report.txt'), '\n\n【深度验证】\n' + text, 'utf8');
