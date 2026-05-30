/**
 * Remove link navigation for contact page "Follow Us" Elementor social icons only:
 * Facebook, Instagram, Twitter/X, YouTube — convert <a> to <span>, keep classes/SVG.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const siteRoot = path.dirname(fileURLToPath(import.meta.url));

const CONTACT_PAGES = [
  'contact.html',
  'zh/联系.html',
  'zh/联系-2.html',
  'fr/contact.html',
  'de/kontakt.html',
  'it/contatto.html',
  'es/pongase-en-contacto-con.html',
  'ru/связаться-с.html',
  'ru/связаться-с-2.html',
  'pl/kontakt.html',
  'pt/contacto.html',
];

const SOCIAL_ICONS = [
  ['facebook', '9c2a87f', 'https://www.facebook.com/npackpm'],
  ['instagram', '88c4ead', 'https://www.instagram.com/shanghainpack/'],
  ['twitter', '1907a84', 'https://twitter.com/npackchina'],
  ['youtube', 'b6258c6', 'https://www.youtube.com/c/NpackAutomation'],
];

const report = {
  processed: 0,
  updated: 0,
  iconsUnwrapped: 0,
  remainingLinks: [],
};

function fixContactSocialIcons(html) {
  let out = html;
  for (const [network, repeaterId, href] of SOCIAL_ICONS) {
    const re = new RegExp(
      '<a\\s+class="elementor-icon elementor-social-icon elementor-social-icon-' +
        network +
        ' elementor-repeater-item-' +
        repeaterId +
        '"\\s+href="' +
        href.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') +
        '"\\s+target="_blank">([\\s\\S]*?)<\\/a>',
      'g',
    );
    out = out.replace(re, (_, inner) => {
      report.iconsUnwrapped++;
      return (
        '<span class="elementor-icon elementor-social-icon elementor-social-icon-' +
        network +
        ' elementor-repeater-item-' +
        repeaterId +
        '">' +
        inner +
        '</span>'
      );
    });
  }
  return out;
}

function countContactSocialLinks(html) {
  let count = 0;
  for (const [network, repeaterId] of SOCIAL_ICONS) {
    const re = new RegExp(
      '<a\\s+[^>]*elementor-social-icon-' + network + ' elementor-repeater-item-' + repeaterId,
      'gi',
    );
    count += (html.match(re) || []).length;
  }
  return count;
}

function footerSocialHasLinks(html) {
  const block = html.match(/<div class="ct-socials-block"[\s\S]*?<\/div>\s*\n\s*<\/div>/i);
  if (!block) return 'no-block';
  return (block[0].match(/<a\s+[^>]*data-network="/gi) || []).length;
}

for (const rel of CONTACT_PAGES) {
  const fp = path.join(siteRoot, rel);
  if (!fs.existsSync(fp)) {
    report.remainingLinks.push(`${rel}: missing`);
    continue;
  }

  report.processed++;
  let html = fs.readFileSync(fp, 'utf8');
  const original = html;
  html = fixContactSocialIcons(html);

  const linksLeft = countContactSocialLinks(html);
  if (linksLeft > 0) report.remainingLinks.push(`${rel}: ${linksLeft} contact social links remain`);

  if (html !== original) {
    fs.writeFileSync(fp, html, 'utf8');
    report.updated++;
  }
}

const samples = [
  ['EN', 'contact.html'],
  ['ZH', 'zh/联系.html'],
  ['FR', 'fr/contact.html'],
].map(([lang, rel]) => {
  const fp = path.join(siteRoot, rel);
  const html = fs.readFileSync(fp, 'utf8');
  return `${lang} ${rel}: contactLinks=${countContactSocialLinks(html)} footerLinks=${footerSocialHasLinks(html)} hasSpanFacebook=${html.includes('elementor-repeater-item-9c2a87f"><span class="elementor-screen-only">Facebook') || html.includes('<span class="elementor-icon elementor-social-icon elementor-social-icon-facebook elementor-repeater-item-9c2a87f">')}`;
}).join('\n');

const out = `联系我们页面社交媒体图标取消跳转报告
时间: ${new Date().toISOString()}
处理页面: ${report.processed}
更新页面: ${report.updated}
取消链接图标: ${report.iconsUnwrapped}
仍含联系页社交链接: ${report.remainingLinks.length ? report.remainingLinks.join(', ') : '(无)'}

抽样验证:
${samples}
`;

fs.writeFileSync(path.join(siteRoot, '_remove_contact_social_report.txt'), out, 'utf8');
console.log(out);
