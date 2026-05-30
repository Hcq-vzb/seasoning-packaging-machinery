import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const siteRoot = path.dirname(fileURLToPath(import.meta.url));
const PAGE_RE = /[/\\](page|seite|pagina|strona|页码|страница)[/\\]\d+\.html$/i;
const issues = [];
let total = 0;

function isValidHtml(buf) {
  return buf.length > 8000 && !(buf[0] === 0x1f && buf[1] === 0x8b) && /<!doctype html|<html/i.test(buf.slice(0, 500).toString('utf8'));
}

function walk(d) {
  for (const ent of fs.readdirSync(d, { withFileTypes: true })) {
    const f = path.join(d, ent.name);
    if (ent.isDirectory() && !['wp-content', 'wp-json', 'node_modules'].includes(ent.name)) walk(f);
    else if (ent.name.endsWith('.html') && PAGE_RE.test(f.replace(/\\/g, '/'))) {
      total++;
      const rel = path.relative(siteRoot, f).replace(/\\/g, '/');
      const buf = fs.readFileSync(f);
      if (!isValidHtml(buf)) {
        issues.push({ rel, type: 'corrupt' });
        continue;
      }
      const html = buf.toString('utf8');
      if (/\bhref=(["'])(?:\.\.\/){4,}/i.test(html)) issues.push({ rel, type: 'href-too-deep' });
      if (/page-numbers" "/.test(html)) issues.push({ rel, type: 'broken-nav-html' });
      const nav = html.match(/<nav class="ct-pagination"[\s\S]*?<\/nav>/i)?.[0] || '';
      for (const m of nav.matchAll(/\bhref=(["'])([^"']+)\1/gi)) {
        const href = m[2];
        if (/^(https?:|#)/i.test(href)) continue;
        const resolved = path.normalize(path.join(path.dirname(f), href));
        if (!fs.existsSync(resolved)) issues.push({ rel, type: `nav-404:${href}` });
      }
    }
  }
}
walk(siteRoot);

const text = `分页验证: ${total} 个文件, ${issues.length} 个问题\n${issues.slice(0, 40).map((i) => `  ${i.rel}: ${i.type}`).join('\n') || '  全部通过'}`;
fs.writeFileSync(path.join(siteRoot, 'fix_all_pagination_report.txt'), fs.readFileSync(path.join(siteRoot, 'fix_all_pagination_report.txt'), 'utf8') + '\n\n【最终验证】\n' + text, 'utf8');
console.log(text);
