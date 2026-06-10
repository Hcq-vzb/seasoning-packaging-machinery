/**
 * Inject live-chat-widget.css/js into all real HTML pages (skip HTTrack redirect stubs).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const siteRoot = path.dirname(fileURLToPath(import.meta.url));
const SKIP_DIRS = new Set(['node_modules', 'cache', '.vs', '.git', 'wp-content', 'netlify', 'functions']);

const CSS_MARKER = 'live-chat-widget.css';
const JS_MARKER = 'live-chat-widget.js';

const report = { scanned: 0, injected: 0, skippedStub: 0, already: 0 };

function assetsPrefix(relPath) {
  const dir = path.dirname(relPath.replace(/\\/g, '/'));
  if (dir === '.') return 'assets/';
  return '../'.repeat(dir.split('/').filter(Boolean).length) + 'assets/';
}

function isHtmlPage(buf) {
  return buf.length >= 200 && /<!doctype html|<html/i.test(buf.slice(0, 800).toString());
}

function isRedirectStub(html, relPath) {
  if (/^index[0-9a-f]{4}\.html$/i.test(path.basename(relPath))) return true;
  return html.length < 4000 && /Page has moved|META HTTP-EQUIV=["']Refresh["']/i.test(html);
}

function processFile(fp, rel) {
  const buf = fs.readFileSync(fp);
  if (!isHtmlPage(buf)) return;

  report.scanned++;
  let html = buf.toString('utf8');

  if (isRedirectStub(html, rel)) {
    report.skippedStub++;
    return;
  }

  if (html.includes(JS_MARKER) && html.includes(CSS_MARKER)) {
    report.already++;
    return;
  }

  const prefix = assetsPrefix(rel);
  const cssTag = `<link rel="stylesheet" href="${prefix}${CSS_MARKER}" id="kiwl-live-chat-css">`;
  const jsTag = `<script src="${prefix}${JS_MARKER}" defer></script>`;

  if (!html.includes(CSS_MARKER)) {
    if (html.includes('local-lang-switcher.css')) {
      html = html.replace(
        /(<link[^>]*local-lang-switcher\.css[^>]*>)/i,
        '$1\n' + cssTag,
      );
    } else if (/<\/head>/i.test(html)) {
      html = html.replace(/<\/head>/i, cssTag + '\n</head>');
    }
  }

  if (!html.includes(JS_MARKER)) {
    if (html.includes('local-lang-switcher.js')) {
      html = html.replace(
        /(<script src="[^"]*local-lang-switcher\.js"><\/script>)/i,
        '$1\n' + jsTag,
      );
    } else if (/<\/body>/i.test(html)) {
      html = html.replace(/<\/body>/i, jsTag + '\n</body>');
    }
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

const samples = ['index.html', 'zh/index.html', 'de/kontakt.html', 'lipstick-filling-machine.html'].map((rel) => {
  const fp = path.join(siteRoot, rel);
  if (!fs.existsSync(fp)) return `${rel}: missing`;
  const html = fs.readFileSync(fp, 'utf8');
  return `${rel}: css=${html.includes(CSS_MARKER)} js=${html.includes(JS_MARKER)}`;
});

const out = `Live Chat Widget 注入报告
时间: ${new Date().toISOString()}
扫描: ${report.scanned}
新注入: ${report.injected}
已有: ${report.already}
跳过(跳转页): ${report.skippedStub}

抽样:
${samples.join('\n')}
`;

fs.writeFileSync(path.join(siteRoot, '_inject_live_chat_report.txt'), out, 'utf8');
console.log(out);
