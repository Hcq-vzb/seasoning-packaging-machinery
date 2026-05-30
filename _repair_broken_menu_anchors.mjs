/**
 * 修复 fixFooterItem 误删 <a> 闭合 > 导致的 class="ct-menu-link"文本</a>
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const siteRoot = path.dirname(fileURLToPath(import.meta.url));
const SKIP = new Set(['wp-content', 'wp-json', 'node_modules']);
const LANG_DIRS = new Set(['zh', 'pl', 'de', 'fr', 'es', 'it', 'ru', 'pt']);
let n = 0;

function depthPrefix(htmlFile, langRoot) {
  const rel = path.relative(langRoot, path.dirname(htmlFile)).replace(/\\/g, '/');
  return rel ? '../'.repeat(rel.split('/').length) : '';
}

function walk(d) {
  for (const ent of fs.readdirSync(d, { withFileTypes: true })) {
    const f = path.join(d, ent.name);
    if (ent.isDirectory()) {
      if (SKIP.has(ent.name)) continue;
      walk(f);
    } else if (ent.name.endsWith('.html')) {
      let html = fs.readFileSync(f, 'utf8');
      const orig = html;
      html = html.replace(/class="ct-menu-link">+/gi, 'class="ct-menu-link">');
      html = html.replace(/class='ct-menu-link'>+/gi, "class='ct-menu-link'>");
      html = html.replace(/class="ct-menu-link"(?![^<]*>)([^<]+)<\/a>/gi, 'class="ct-menu-link">$1</a>');
      html = html.replace(/class='ct-menu-link'(?![^<]*>)([^<]+)<\/a>/gi, "class='ct-menu-link'>$1</a>");
      // 仅修复缺 > 且 href 后直接跟文本（非 HTML 属性）的情况
      html = html.replace(
        /(\bhref=(["'])([^"']+)\2)(?=\s*[A-Za-z\u00c0-\u024f\u0400-\u04ff\u4e00-\u9fff])(?![^<]*<\/a>)/gi,
        (m, pre, q, url) => {
          const after = html.slice(html.indexOf(m) + m.length, html.indexOf(m) + m.length + 80);
          if (/^\s*(?:aria-|class\s*=|data-|rel\s*=|target\s*=|itemprop)/i.test(after)) return m;
          return `${pre}>`;
        },
      );
      const lang = LANG_DIRS.has(path.relative(siteRoot, f).split(/[/\\]/)[0])
        ? path.relative(siteRoot, f).split(/[/\\]/)[0]
        : 'en';
      const langRoot = lang === 'en' ? siteRoot : path.join(siteRoot, lang);
      const home = depthPrefix(f, langRoot) + 'index.html';
      html = html.replace(
        /<a\s+([^>]*class="[^"]*site-logo-container[^"]*"[^>]*)href=(["'])[^"']+\2/gi,
        `<a $1href=$2${home}$2`,
      );
      html = html.replace(
        /<a\s+href=(["'])[^"']+\1([^>]*class="[^"]*site-logo-container[^"]*"[^>]*>)/gi,
        `<a href=$1${home}$1$2`,
      );

      if (html !== orig) {
        fs.writeFileSync(f, html, 'utf8');
        n++;
      }
    }
  }
}

walk(siteRoot);
console.log('Repaired broken ct-menu-link anchors in', n, 'files');
