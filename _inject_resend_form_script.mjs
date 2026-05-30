/**
 * Inject resend-inquiry-form.js into all HTML pages with inquiry form (form_id 97d2821).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const siteRoot = path.dirname(fileURLToPath(import.meta.url));
const SKIP_DIRS = new Set(['node_modules', 'cache', '.vs', '.git', 'wp-content']);

const SCRIPT_MARKER = 'resend-inquiry-form.js';
const FORM_MARKER = 'form_id" value="97d2821';

const report = { scanned: 0, injected: 0, skipped: 0, already: 0 };

function assetsPrefix(relPath) {
  const dir = path.dirname(relPath.replace(/\\/g, '/'));
  if (dir === '.') return 'assets/';
  const parts = dir.split('/').filter(Boolean);
  return '../'.repeat(parts.length) + 'assets/';
}

function processFile(fp, rel) {
  const buf = fs.readFileSync(fp);
  if (buf.length < 200 || !/<!doctype html|<html/i.test(buf.slice(0, 800).toString())) return;

  report.scanned++;
  let html = buf.toString('utf8');

  if (!html.includes(FORM_MARKER)) return;

  if (html.includes(SCRIPT_MARKER)) {
    report.already++;
    return;
  }

  const prefix = assetsPrefix(rel);
  const tag = `<script src="${prefix}resend-inquiry-form.js"></script>`;

  // Insert after local-lang-switcher.js if present, else before </body>
  if (html.includes('local-lang-switcher.js')) {
    html = html.replace(
      /(<script src="[^"]*local-lang-switcher\.js"><\/script>)/i,
      '$1\n' + tag,
    );
  } else if (/<\/body>/i.test(html)) {
    html = html.replace(/<\/body>/i, tag + '\n</body>');
  } else {
    report.skipped++;
    return;
  }

  fs.writeFileSync(fp, html, 'utf8');
  report.injected++;
}

function walk(dir, rel = '') {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const fp = path.join(dir, ent.name);
    const r = rel ? `${rel}/${ent.name}` : ent.name;
    if (ent.isDirectory()) {
      if (SKIP_DIRS.has(ent.name)) continue;
      walk(fp, r);
    } else if (ent.name.endsWith('.html') && !ent.name.endsWith('.html.z')) {
      processFile(fp, r);
    }
  }
}

walk(siteRoot);

const samples = ['contact.html', 'zh/联系.html', 'de/kontakt.html', 'fr/contact.html'].map((rel) => {
  const fp = path.join(siteRoot, rel);
  if (!fs.existsSync(fp)) return `${rel}: missing`;
  const html = fs.readFileSync(fp, 'utf8');
  const hasScript = html.includes(SCRIPT_MARKER);
  const hasForm = html.includes(FORM_MARKER);
  return `${rel}: form=${hasForm} script=${hasScript}`;
});

const out = `Resend 表单脚本注入报告
时间: ${new Date().toISOString()}
扫描 HTML: ${report.scanned}
新注入: ${report.injected}
已有脚本: ${report.already}
跳过: ${report.skipped}

抽样:
${samples.join('\n')}
`;

fs.writeFileSync(path.join(siteRoot, '_inject_resend_form_report.txt'), out, 'utf8');
console.log(out);
