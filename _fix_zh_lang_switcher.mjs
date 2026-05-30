// 校正 /zh/ 全部页面的多语言菜单链接深度 + 注入 NPACKPM_LANG_HOMES / 本地 switcher 资源
import fs from 'fs';
import path from 'path';

const siteRoot = path.resolve('c:/My Websites/baoz/www.npackpm.com');
const zhRoot = path.join(siteRoot, 'zh');

const LANG_CODES = ['en', 'de', 'fr', 'es', 'it', 'ru', 'pl', 'pt', 'zh'];

const report = {
  files: 0,
  switcherBlocks: 0,
  linksFixed: 0,
  homesInjected: 0,
  cssInjected: 0,
  jsInjected: 0,
  skippedGzip: 0,
};

function isGzip(buf) {
  return buf.length >= 2 && buf[0] === 0x1f && buf[1] === 0x8b;
}

function isValidHtml(buf) {
  if (buf.length < 2000 || isGzip(buf)) return false;
  const s = buf.slice(0, 300).toString('utf8');
  return /<!doctype html|<html/i.test(s);
}

function rootPrefix(htmlFile) {
  const dirRel = path.relative(siteRoot, path.dirname(htmlFile)).replace(/\\/g, '/');
  if (!dirRel) return '';
  return '../'.repeat(dirRel.split('/').length);
}

function buildHomes(prefix) {
  return {
    en: `${prefix}index.html`,
    de: `${prefix}de/index.html`,
    fr: `${prefix}fr/index.html`,
    es: `${prefix}es/index.html`,
    it: `${prefix}it/index.html`,
    ru: `${prefix}ru/index.html`,
    pl: `${prefix}pl/index.html`,
    pt: `${prefix}pt/index.html`,
    zh: `${prefix}zh/index.html`,
  };
}

function langFromAttr(attrs) {
  const m = attrs.match(/\blang=["']([a-z]{2})(?:-[A-Za-z]{2})?["']/i);
  if (!m) return null;
  const c = m[1].toLowerCase();
  return LANG_CODES.includes(c) ? c : 'en';
}

function fixSwitcherBlock(block, homes) {
  let n = 0;
  const fixed = block.replace(/<a\s+([^>]*?)>/gi, (full, attrs) => {
    if (!/\blang=/i.test(attrs)) return full;
    const code = langFromAttr(attrs);
    if (!code) return full;
    const target = homes[code];
    if (!target) return full;
    let newAttrs = attrs;
    if (/\bhref=/i.test(newAttrs)) {
      const hm = newAttrs.match(/\bhref=(["'])([^"']*)\1/i);
      if (hm && hm[2] === target) return full;
      newAttrs = newAttrs.replace(/\bhref=(["'])[^"']*\1/i, `href=$1${target}$1`);
    } else {
      newAttrs += ` href="${target}"`;
    }
    n++;
    return `<a ${newAttrs}>`;
  });
  report.linksFixed += n;
  return fixed;
}

function fixHtmlFile(htmlFile) {
  const buf = fs.readFileSync(htmlFile);
  if (!isValidHtml(buf)) {
    report.skippedGzip++;
    return;
  }

  let html = buf.toString('utf8');
  if (!html.includes('ct-language-switcher')) return;

  const orig = html;
  const prefix = rootPrefix(htmlFile);
  const homes = buildHomes(prefix);
  const homesJson = JSON.stringify(homes);
  const assetsPrefix = prefix + 'assets/';
  const cssHref = `${assetsPrefix}local-lang-switcher.css`;
  const jsHref = `${assetsPrefix}local-lang-switcher.js`;

  html = html.replace(/<div[^>]*\bct-language-switcher\b[^>]*>[\s\S]*?<\/ul>/gi, (block) => {
    report.switcherBlocks++;
    return fixSwitcherBlock(block, homes);
  });

  const homesScript = `<script>window.NPACKPM_LANG_HOMES=${homesJson};</script>`;
  if (/window\.NPACKPM_LANG_HOMES=/.test(html)) {
    html = html.replace(/<script>window\.NPACKPM_LANG_HOMES=\{[^}]+\};<\/script>/, homesScript);
  } else {
    const injectBefore = html.lastIndexOf('</body>');
    if (injectBefore !== -1) {
      html = html.slice(0, injectBefore) + homesScript + '\n' + html.slice(injectBefore);
      report.homesInjected++;
    }
  }

  if (!html.includes('npackpm-lang-switcher-css')) {
    const linkTag = `<link rel="stylesheet" href="${cssHref}" id="npackpm-lang-switcher-css">`;
    if (/<\/head>/i.test(html)) {
      html = html.replace(/<\/head>/i, `${linkTag}\n</head>`);
      report.cssInjected++;
    }
  } else {
    html = html.replace(
      /href=(["'])[^"']*local-lang-switcher\.css\1/gi,
      `href=$1${cssHref}$1`,
    );
  }

  if (!html.includes('local-lang-switcher.js')) {
    const scriptTag = `<script src="${jsHref}"></script>`;
    const bodyEnd = html.lastIndexOf('</body>');
    if (bodyEnd !== -1) {
      html = html.slice(0, bodyEnd) + scriptTag + '\n' + html.slice(bodyEnd);
      report.jsInjected++;
    }
  } else {
    html = html.replace(
      /src=(["'])[^"']*local-lang-switcher\.js\1/gi,
      `src=$1${jsHref}$1`,
    );
  }

  if (html !== orig) {
    fs.writeFileSync(htmlFile, html, 'utf8');
    report.files++;
  }
}

function walk(d) {
  for (const ent of fs.readdirSync(d, { withFileTypes: true })) {
    const f = path.join(d, ent.name);
    if (ent.isDirectory()) {
      if (ent.name !== 'wp-json') walk(f);
    } else if (ent.name.endsWith('.html') && !ent.name.endsWith('.html.z') && !/-\d+\.html$/.test(ent.name)) {
      fixHtmlFile(f);
    }
  }
}

walk(zhRoot);

const text = `中文 /zh/ 语言切换修复报告
时间: ${new Date().toISOString()}

修改文件数: ${report.files}
语言菜单块: ${report.switcherBlocks}
链接校正: ${report.linksFixed}
新增 NPACKPM_LANG_HOMES: ${report.homesInjected}
新增 CSS: ${report.cssInjected}
新增 JS: ${report.jsInjected}
跳过损坏(gzip): ${report.skippedGzip}

路径规则（相对站点根）:
  zh/index.html → ../index.html, ../fr/index.html 等
  zh/产品/页码/2.html → ../../../index.html, ../../../fr/index.html 等

仅修改 zh/ 目录。
`;
fs.writeFileSync(path.join(siteRoot, 'fix_zh_lang_switcher_report.txt'), text, 'utf8');
console.log(text);
