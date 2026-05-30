/**
 * Remove link navigation for:
 * 1) Four certification CTA cards (Learn More area) — convert outer <a class="elementor-cta"> to <div>
 * 2) Footer Alibaba + Direct Industry links — unwrap <a>, keep text
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const siteRoot = path.dirname(fileURLToPath(import.meta.url));
const SKIP_DIRS = new Set(['node_modules', 'cache', '.vs', '.git']);

const CERT_BG_IDS = [
  '2025101314092321',
  '2025101314162117',
  '2025101314175229',
  '2025101314183916',
];

const report = {
  scanned: 0,
  updated: 0,
  certCards: 0,
  footerAlibaba: 0,
  footerDirect: 0,
};

function isValidHtml(buf) {
  return buf.length > 200 && /<!doctype html|<html/i.test(buf.slice(0, 800).toString('utf8'));
}

function fixCertCards(html) {
  let count = 0;
  for (const imgId of CERT_BG_IDS) {
    const re = new RegExp(
      '<a\\s+class="elementor-cta"[^>]*>([\\s\\S]*?' + imgId + '[\\s\\S]*?)<\\/a>',
      'gi',
    );
    html = html.replace(re, (match, inner) => {
      count++;
      return '<div class="elementor-cta">' + inner + '</div>';
    });
  }
  report.certCards += count;
  return html;
}

function fixFooterLinks(html) {
  let alibaba = 0;
  let direct = 0;

  html = html.replace(
    /<a\s+href="https:\/\/npack\.en\.alibaba\.com\/"[^>]*>([^<]+)<\/a>/gi,
    (_, text) => {
      alibaba++;
      return text;
    },
  );

  html = html.replace(
    /<a\s+href="https:\/\/pdf\.directindustry\.com\/[^"]*"[^>]*>([^<]+)<\/a>/gi,
    (_, text) => {
      direct++;
      return text;
    },
  );

  report.footerAlibaba += alibaba;
  report.footerDirect += direct;
  return html;
}

function processFile(fp) {
  const buf = fs.readFileSync(fp);
  if (!isValidHtml(buf)) return;
  report.scanned++;

  let html = buf.toString('utf8');
  const original = html;

  html = fixCertCards(html);
  html = fixFooterLinks(html);

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

walk(siteRoot);

const samples = ['index.html', 'zh/index.html', 'fr/index.html', 'about-us.html', 'zh/关于我们.html'].map((rel) => {
  const fp = path.join(siteRoot, rel);
  if (!fs.existsSync(fp)) return `${rel}: missing`;
  const html = fs.readFileSync(fp, 'utf8');
  const certA = (html.match(/<a class="elementor-cta"[^>]*>[\s\S]*?2025101314092321/gi) || []).length;
  const certDiv = (html.match(/<div class="elementor-cta">[\s\S]*?2025101314092321/gi) || []).length;
  const footerAlibabaLink = (html.match(/href="https:\/\/npack\.en\.alibaba\.com\/"/g) || []).length;
  const footerInCopyright = html.includes('ct-footer-copyright')
    ? (html.match(/ct-footer-copyright[\s\S]{0,800}/) || [''])[0].includes('href="https://npack.en.alibaba.com/"')
    : 'n/a';
  return `${rel}: cert<a>=${certA} cert<div>=${certDiv} alibabaHref=${footerAlibabaLink} footerLinkInCopyright=${footerInCopyright}`;
}).join('\n');

const out = `取消跳转修复报告
时间: ${new Date().toISOString()}
扫描 HTML: ${report.scanned}
更新文件: ${report.updated}
认证卡片 CTA 改为 div: ${report.certCards}
页脚 Alibaba 去链接: ${report.footerAlibaba}
页脚 Direct Industry 去链接: ${report.footerDirect}

抽样验证:
${samples}
`;

fs.writeFileSync(path.join(siteRoot, '_remove_links_report.txt'), out, 'utf8');
console.log(out);
