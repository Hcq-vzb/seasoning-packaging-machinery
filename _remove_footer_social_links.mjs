/**
 * Remove link navigation for footer social icons only (ct-socials-block):
 * Facebook, Instagram, X/Twitter, YouTube, LinkedIn — unwrap <a>, keep icon SVG.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const siteRoot = path.dirname(fileURLToPath(import.meta.url));
const SKIP_DIRS = new Set(['node_modules', 'cache', '.vs', '.git']);
const SOCIAL_NETWORKS = ['facebook', 'instagram', 'twitter', 'youtube', 'linkedin'];

const report = {
  scanned: 0,
  updated: 0,
  iconsUnwrapped: 0,
  blocksProcessed: 0,
};

function isValidHtml(buf) {
  return buf.length > 200 && /<!doctype html|<html/i.test(buf.slice(0, 800).toString('utf8'));
}

function unwrapSocialAnchor(inner) {
  let out = inner;
  for (const network of SOCIAL_NETWORKS) {
    const re = new RegExp(
      '<a\\s+[^>]*data-network="' + network + '"[^>]*>\\s*([\\s\\S]*?)\\s*<\\/a>',
      'gi',
    );
    out = out.replace(re, (_, iconHtml) => {
      report.iconsUnwrapped++;
      return iconHtml;
    });
  }
  return out;
}

function fixFooterSocialIcons(html) {
  return html.replace(
    /(<div class="ct-socials-block"[^>]*>[\s\S]*?<div class="ct-social-box"[^>]*>)([\s\S]*?)(<\/div>\s*\n\s*<\/div>)/gi,
    (match, before, middle, after) => {
      const fixed = unwrapSocialAnchor(middle);
      if (fixed !== middle) report.blocksProcessed++;
      return before + fixed + after;
    },
  );
}

function processFile(fp) {
  const buf = fs.readFileSync(fp);
  if (!isValidHtml(buf)) return;
  report.scanned++;

  let html = buf.toString('utf8');
  const original = html;

  html = fixFooterSocialIcons(html);

  if (html !== original) {
    fs.writeFileSync(fp, html, 'utf8');
    report.updated++;
  }
}

function walk(dir) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const fp = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (SKIP_DIRS.has(ent.name)) continue;
      if (ent.name === 'wp-content' && dir === siteRoot) continue;
      walk(fp);
    } else if (ent.name.endsWith('.html') && !ent.name.endsWith('.html.z')) {
      processFile(fp);
    }
  }
}

function countFooterSocialLinks(html) {
  const block = html.match(/<div class="ct-socials-block"[\s\S]*?<\/div>\s*\n\s*<\/div>/i);
  if (!block) return { block: false, links: 0 };
  const links = (block[0].match(/<a\s+[^>]*data-network="(?:facebook|instagram|twitter|youtube|linkedin)"/gi) || []).length;
  return { block: true, links };
}

function countOffcanvasSocialLinks(html) {
  const offcanvas = html.match(/id="offcanvas"[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/i);
  if (!offcanvas) return 0;
  return (offcanvas[0].match(/<a\s+[^>]*data-network="/gi) || []).length;
}

walk(siteRoot);

const sampleFiles = ['index.html', 'zh/index.html', 'de/index.html', 'contact.html', 'zh/联系.html'];
const samples = sampleFiles.map((rel) => {
  const fp = path.join(siteRoot, rel);
  if (!fs.existsSync(fp)) return `${rel}: missing`;
  const html = fs.readFileSync(fp, 'utf8');
  const footer = countFooterSocialLinks(html);
  const offcanvas = countOffcanvasSocialLinks(html);
  const elementorSocial = (html.match(/elementor-social-icon-facebook/g) || []).length;
  const navLinks = (html.match(/<nav[\s\S]*?<\/nav>/gi) || []).join('').includes('href=');
  return `${rel}: footerLinks=${footer.links} offcanvasSocialLinks=${offcanvas} elementorSocial=${elementorSocial} navHasLinks=${navLinks}`;
}).join('\n');

const remaining = [];
function findRemaining(dir) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const fp = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (SKIP_DIRS.has(ent.name)) continue;
      if (ent.name === 'wp-content' && dir === siteRoot) continue;
      findRemaining(fp);
    } else if (ent.name.endsWith('.html') && !ent.name.endsWith('.html.z')) {
      const html = fs.readFileSync(fp, 'utf8');
      const { block, links } = countFooterSocialLinks(html);
      if (block && links > 0) remaining.push(path.relative(siteRoot, fp));
    }
  }
}
findRemaining(siteRoot);

const out = `页脚社交媒体图标取消跳转报告
时间: ${new Date().toISOString()}
扫描 HTML: ${report.scanned}
更新文件: ${report.updated}
处理 ct-socials-block 区块: ${report.blocksProcessed}
取消链接图标数: ${report.iconsUnwrapped}
仍含页脚社交链接的文件: ${remaining.length}
${remaining.length ? remaining.slice(0, 20).join('\n') : '(无)'}

抽样验证:
${samples}
`;

fs.writeFileSync(path.join(siteRoot, '_remove_footer_social_report.txt'), out, 'utf8');
console.log(out);
