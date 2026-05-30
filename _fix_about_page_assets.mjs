/**
 * 修复九语言「关于我们」四大页（工厂/客户/认证/团队）的图片与资源路径
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const siteRoot = path.dirname(fileURLToPath(import.meta.url));

const PAGES = {
  en: [
    'about-us/npack-factory.html',
    'about-us/npack-customer.html',
    'about-us/npack-certification.html',
    'about-us/npack-team.html',
  ],
  zh: ['关于我们/npack-工厂.html', '关于我们/客户.html', '关于我们/npack-认证.html', '关于我们/npack-团队.html'],
  pl: ['o-nas/npack-factory.html', 'o-nas/klient-npack.html', 'o-nas/certyfikacja-npack.html', 'o-nas/zespol-npack.html'],
  de: ['uber-uns/npack-werk.html', 'uber-uns/npack-kunde.html', 'uber-uns/npack-zertifizierung.html', 'uber-uns/npack-team.html'],
  fr: ['a-propos-de-nous/usine-npack.html', 'a-propos-de-nous/client-npack.html', 'a-propos-de-nous/certification-npack.html', 'a-propos-de-nous/lequipe-npack.html'],
  es: ['acerca-de-nosotros/fabrica-npack.html', 'acerca-de-nosotros/npack-cliente.html', 'acerca-de-nosotros/certificacion-npack.html', 'acerca-de-nosotros/equipo-npack.html'],
  it: ['chi-siamo/fabbrica-npack.html', 'chi-siamo/cliente-npack.html', 'chi-siamo/certificazione-npack.html', 'chi-siamo/team-npack.html'],
  ru: ['о-нас/завод-npack.html', 'о-нас/клиент-npack.html', 'о-нас/сертификация-npack.html', 'о-нас/команда-npack.html'],
  pt: ['sobre-nos/fabrica-npack.html', 'sobre-nos/cliente-npack.html', 'sobre-nos/certificacao-npack.html', 'sobre-nos/equipa-npack.html'],
};

let fixed = 0;

function depthPrefix(fp, langRoot) {
  const rel = path.relative(langRoot, path.dirname(fp)).replace(/\\/g, '/');
  return rel ? '../'.repeat(rel.split('/').length) : '';
}

function fixPage(fp, lang) {
  const langRoot = lang === 'en' ? siteRoot : path.join(siteRoot, lang);
  const prefix = depthPrefix(fp, langRoot);
  const homeHref = prefix + 'index.html';
  let html = fs.readFileSync(fp, 'utf8');
  const orig = html;

  html = html.replace(
    /(<a class="e-gallery-item[\s\S]*?href=")([^"]+)("[\s\S]*?<div class="e-gallery-image\s+elementor-gallery-item__image"\s+)([^>]*)(>)/gi,
    (m, aPre, imgUrl, aMid, divAttrs, endTag) => {
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
    /(<img\b[^>]*)\bdata-src=(["'])([^"']+)\2([^>]*>)/gi,
    (full, pre, q, src, post) => {
      if (/\bsrc\s*=/.test(pre + post)) return full;
      return `${pre}src=${q}${src}${q} data-src=${q}${src}${q}${post}`;
    },
  );

  html = html.replace(
    /\b(href|src)=(["'])(https?:\/\/www\.npackpm\.com\/)(wp-content\/[^"']+)\2/gi,
    (m, attr, q, _host, wp) => `${attr}=${q}${prefix}${wp}${q}`,
  );

  html = html.replace(
    /(\b(?:content|href|src)=(["']))(?!\.\.\/)(?!\.\/)(?!https?:)(wp-content\/[^"']+)\2/gi,
    (m, pre, q, p) => `${pre}${q}${prefix}${p}${q}`,
  );

  html = html.replace(
    /<a\s+([^>]*class="[^"]*site-logo-container[^"]*"[^>]*href=)(["'])[^"']+\2/gi,
    `<a $1$2${homeHref}$2`,
  );

  if (html !== orig) {
    fs.writeFileSync(fp, html, 'utf8');
    fixed++;
  }
}

for (const [lang, rels] of Object.entries(PAGES)) {
  for (const rel of rels) {
    const fp = path.join(lang === 'en' ? siteRoot : path.join(siteRoot, lang), rel);
    if (fs.existsSync(fp)) fixPage(fp, lang);
  }
}

console.log('About page assets fixed:', fixed, 'files');
