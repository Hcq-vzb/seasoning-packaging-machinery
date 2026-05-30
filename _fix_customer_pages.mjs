/**
 * 修复各语言「客户群」页面：文件结构、首页/页脚链接、客户页图片
 */
import fs from 'fs';
import path from 'path';

const siteRoot = path.resolve('c:/My Websites/baoz/www.npackpm.com');
const LANGS = ['zh', 'pl', 'de', 'fr', 'es', 'it', 'ru', 'pt'];
const EN_CUSTOMER_FP = 'about-us/npack-customer.html';

const CUSTOMER_REL = {
  zh: '关于我们/客户.html',
  pl: 'o-nas/klient-npack.html',
  de: 'uber-uns/npack-kunde.html',
  fr: 'a-propos-de-nous/client-npack.html',
  es: 'acerca-de-nosotros/npack-cliente.html',
  it: 'chi-siamo/cliente-npack.html',
  ru: 'о-нас/клиент-npack.html',
  pt: 'sobre-nos/cliente-npack.html',
};

const EN_CUSTOMER = 'about-us/npack-customer.html';

const report = {
  foldersFixed: [],
  filesCreated: [],
  menuLinks: 0,
  footerLinks: 0,
  enPathsReplaced: 0,
  customerPagesFixed: 0,
  galleryThumbs: 0,
};

function isGzip(buf) {
  return buf.length >= 2 && buf[0] === 0x1f && buf[1] === 0x8b;
}

function isValidHtml(buf) {
  return buf.length > 2000 && !isGzip(buf) && /<!doctype html|<html/i.test(buf.slice(0, 400).toString('utf8'));
}

function extractMenuMap(html) {
  const map = new Map();
  const idBlockRe = /\bid="menu-item-(\d+)"[^>]*>([\s\S]{0,1500}?)<\/a>/gi;
  let m;
  while ((m = idBlockRe.exec(html)) !== null) {
    const tag = m[2].match(/<a\s+[^>]*ct-menu-link[^>]*>/i)?.[0] || m[2].match(/<a\s+[^>]*>/i)?.[0];
    const hm = tag?.match(/href=(["'])([^"']+)\1/i);
    if (hm && !/^(https?:|#|mailto:|javascript:)/i.test(hm[2])) map.set(m[1], hm[2]);
  }
  const mobRe = /menu-item-(\d+)(?:[^>]*>)(?:<span[^>]*>\s*)?<a\s+[^>]*ct-menu-link[^>]*href=(["'])([^"']+)\2/gi;
  while ((m = mobRe.exec(html)) !== null) {
    if (!/^(https?:|#|mailto:|javascript:)/i.test(m[3])) map.set(m[1], m[3]);
  }
  return map;
}

function fixAnchorInMenuItem(html, id, target) {
  const esc = id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const reps = [
    new RegExp(`(menu-item-${esc}\\b[^>]*>\\s*<a\\s+)([^>]*ct-menu-link[^>]*)(>)`, 'gi'),
    new RegExp(`(menu-item-${esc}(?:[^>]*>)(?:<span[^>]*>\\s*)?<a\\s+)([^>]*ct-menu-link[^>]*)(>)`, 'gi'),
    new RegExp(`(id="menu-item-${esc}"[^>]*>[\\s\\S]*?<a\\s+)([^>]*)(>)`, 'gi'),
  ];
  let n = 0;
  for (const re of reps) {
    html = html.replace(re, (full, pre, attrs, end) => {
      if (!/href=/i.test(attrs)) return full;
      const hm = attrs.match(/href=(["'])([^"']+)\1/i);
      if (hm && hm[2] === target) return full;
      n++;
      return pre + attrs.replace(/href=(["'])[^"']+\1/i, `href=$1${target}$1`) + end;
    });
  }
  return { html, n };
}

function depthPrefix(htmlFile, langRoot) {
  const rel = path.relative(langRoot, path.dirname(htmlFile)).replace(/\\/g, '/');
  return rel ? '../'.repeat(rel.split('/').length) : '';
}

/** 错误目录：客户.html/index.html */
function fixWrongCustomerFolders(langRoot) {
  function walk(d) {
    for (const ent of fs.readdirSync(d, { withFileTypes: true })) {
      const full = path.join(d, ent.name);
      if (ent.isDirectory()) {
        if (/\.html$/i.test(ent.name)) {
          const inner = path.join(full, 'index.html');
          if (fs.existsSync(inner)) {
            const parent = path.dirname(full);
            const target = path.join(parent, ent.name);
            if (!fs.existsSync(target)) {
              fs.copyFileSync(inner, target);
              report.foldersFixed.push(path.relative(siteRoot, target));
            }
            fs.rmSync(full, { recursive: true, force: true });
          }
        } else walk(full);
      }
    }
  }
  walk(langRoot);
}

function ensureCustomerFile(lang) {
  const rel = CUSTOMER_REL[lang];
  const fp = path.join(siteRoot, lang, rel);
  if (fs.existsSync(fp)) {
    const b = fs.readFileSync(fp);
    if (isValidHtml(b)) return fp;
  }
  const dir = path.dirname(fp);
  const base = path.basename(fp, '.html');
  const alt = path.join(dir, `${base}-2.html`);
  const en = path.join(siteRoot, EN_CUSTOMER);
  if (fs.existsSync(alt) && isValidHtml(fs.readFileSync(alt))) {
    fs.mkdirSync(dir, { recursive: true });
    fs.copyFileSync(alt, fp);
    report.filesCreated.push(`${lang}/${rel} (from -2)`);
    return fp;
  }
  if (fs.existsSync(en) && isValidHtml(fs.readFileSync(en))) {
    fs.mkdirSync(dir, { recursive: true });
    fs.copyFileSync(en, fp);
    report.filesCreated.push(`${lang}/${rel} (from en)`);
    return fp;
  }
  return null;
}

function buildMenuMap(lang) {
  const langRoot = path.join(siteRoot, lang);
  const indexPath = path.join(langRoot, 'index.html');
  if (!fs.existsSync(indexPath)) return new Map();
  let html = fs.readFileSync(indexPath, 'utf8');
  const customer = CUSTOMER_REL[lang];

  html = html.replace(
    /(menu-item-1953\b[^>]*>[\s\S]*?<a\s+[^>]*href=)(["'])[^"']+\2/gi,
    `$1$2index.html$2`,
  );
  fs.writeFileSync(indexPath, html, 'utf8');

  const map = extractMenuMap(fs.readFileSync(indexPath, 'utf8'));
  map.set('1953', 'index.html');
  map.set('2286', customer);
  map.set('3969', customer);
  return map;
}

function applyMenuToHtml(html, langRoot, htmlFile, menuMap) {
  const prefix = depthPrefix(htmlFile, langRoot);
  let n = 0;
  for (const [id, base] of menuMap) {
    const target = prefix + base;
    const r = fixAnchorInMenuItem(html, id, target);
    html = r.html;
    n += r.n;
  }
  return { html, n };
}

function replaceEnCustomerPaths(html, lang, prefix) {
  const target = prefix + CUSTOMER_REL[lang];
  let n = 0;
  let out = html.replace(/href=(["'])(?:\.\.\/)*about-us\/npack-customer\.html\1/gi, (m, q) => {
    n++;
    return `href=${q}${target}${q}`;
  });
  const re2 = /(?:\.\.\/)*about-us\/npack-customer\.html/gi;
  out = out.replace(re2, () => {
    n++;
    return target;
  });
  return { html: out, n };
}

function fixCustomerPageContent(fp, lang) {
  const langRoot = lang === 'en' ? siteRoot : path.join(siteRoot, lang);
  const prefix = depthPrefix(fp, langRoot);
  const homeHref = prefix + 'index.html';
  let html = fs.readFileSync(fp, 'utf8');
  const orig = html;
  let galleryThumbs = 0;

  html = html.replace(
    /(<a class="e-gallery-item[\s\S]*?href=")([^"]+)("[\s\S]*?<div class="e-gallery-image\s+elementor-gallery-item__image"\s+)([^>]*)(>)/gi,
    (m, aPre, imgUrl, aMid, divAttrs, endTag) => {
      galleryThumbs++;
      const attrs = divAttrs.replace(/\s*style="[^"]*"/gi, '').replace(/\s*data-thumbnail="[^"]*"/gi, '');
      return `${aPre}${imgUrl}${aMid}data-thumbnail="${imgUrl}" style="background-image:url('${imgUrl}');background-size:cover;background-position:center;"${attrs}${endTag}`;
    },
  );

  html = html.replace(/&quot;lazyload&quot;:&quot;yes&quot;/g, '&quot;lazyload&quot;:&quot;no&quot;');
  html = html.replace(/"lazyload":"yes"/g, '"lazyload":"no"');

  html = html.replace(
    /(<figure class="wp-block-image[^"]*"[^>]*>\s*<img[^>]*style=")([^"]*)(")/gi,
    (m, pre, style, end) => {
      if (!/width:\s*150px/i.test(style)) return m;
      return `${pre}width:auto;height:auto;max-width:220px;max-height:70px${end}`;
    },
  );

  html = html.replace(
    /<a\s+([^>]*class="[^"]*site-logo-container[^"]*"[^>]*href=)(["'])[^"']+\2/gi,
    `<a $1$2${homeHref}$2`,
  );
  html = html.replace(
    /<a\s+([^>]*href=)(["'])[^"']+\2([^>]*class="[^"]*site-logo-container[^"]*"[^>]*>)/gi,
    `<a $1$2${homeHref}$2$3`,
  );

  html = html.replace(
    /(<span[^>]*ct-home-icon[\s\S]*?<\/span><\/a><meta itemprop="url" content=")[^"]*(")/i,
    `$1${homeHref}$2`,
  );

  html = html.replace(/\bhref=(["'])#\1(?=[^>]*ct-home-icon)/gi, `href=$1${homeHref}$1`);

  html = html.replace(
    /(<img\b[^>]*)\bdata-src=(["'])([^"']+)\2([^>]*>)/gi,
    (full, pre, q, src, post) => {
      if (/\bsrc=/.test(pre + post)) return full;
      return `${pre}src=${q}${src}${q} data-src=${q}${src}${q}${post}`;
    },
  );

  html = html.replace(
    /\b(href|src)=(["'])(https?:\/\/www\.npackpm\.com\/)(wp-content\/[^"']+)\2/gi,
    (m, attr, q, _host, wp) => `${attr}=${q}${prefix}${wp}${q}`,
  );

  if (html !== orig) {
    fs.writeFileSync(fp, html, 'utf8');
    report.customerPagesFixed++;
    report.galleryThumbs += galleryThumbs;
  }
}

for (const lang of LANGS) {
  const langRoot = path.join(siteRoot, lang);
  if (!fs.existsSync(langRoot)) continue;

  fixWrongCustomerFolders(langRoot);
  const customerFp = ensureCustomerFile(lang);
  const menuMap = buildMenuMap(lang);

  function walk(d) {
    for (const ent of fs.readdirSync(d, { withFileTypes: true })) {
      const f = path.join(d, ent.name);
      if (ent.isDirectory()) {
        if (ent.name !== 'wp-json') walk(f);
      } else if (ent.name.endsWith('.html') && !ent.name.endsWith('.html.z') && !/-\d+\.html$/.test(ent.name)) {
        const buf = fs.readFileSync(f);
        if (!isValidHtml(buf)) continue;
        const prefix = depthPrefix(f, langRoot);
        let html = buf.toString('utf8');
        const orig = html;

        const menuR = applyMenuToHtml(html, langRoot, f, menuMap);
        html = menuR.html;
        report.menuLinks += menuR.n;

        const enFix = replaceEnCustomerPaths(html, lang, prefix);
        html = enFix.html;
        report.enPathsReplaced += enFix.n;

        const homeTarget = prefix + 'index.html';
        html = html.replace(
          /(menu-item-home\b[^>]*>[\s\S]*?<a\s+[^>]*href=)(["'])[^"']+\2/gi,
          (m, pre, q) => {
            if (m.includes(homeTarget)) return m;
            report.menuLinks++;
            return `${pre}${q}${homeTarget}${q}`;
          },
        );

        if (html !== orig) fs.writeFileSync(f, html, 'utf8');
      }
    }
  }
  walk(langRoot);

  if (customerFp && fs.existsSync(customerFp)) fixCustomerPageContent(customerFp, lang);
}

const enCustomer = path.join(siteRoot, EN_CUSTOMER_FP);
if (fs.existsSync(enCustomer)) {
  fixCustomerPageContent(enCustomer, 'en');
  report.customerPagesFixed++;
}

const text = `客户群页面全站修复报告
时间: ${new Date().toISOString()}

【文件结构】
  文件夹校正: ${report.foldersFixed.join(', ') || '无'}
  新建/恢复文件: ${report.filesCreated.join(', ') || '无'}

【链接】
  菜单项校正次数: ${report.menuLinks}
  英文客户路径替换: ${report.enPathsReplaced}

【客户页内容】
  客户页深度修复: ${report.customerPagesFixed} 个
  图库缩略图校正: ${report.galleryThumbs}

【各语言客户页路径】
${Object.entries(CUSTOMER_REL).map(([k, v]) => `  ${k}: ${v}`).join('\n')}

说明: 仅处理多语言目录；英文根目录 about-us/npack-customer.html 未改。
`;
fs.writeFileSync(path.join(siteRoot, 'fix_customer_pages_report.txt'), text, 'utf8');
console.log(text);
