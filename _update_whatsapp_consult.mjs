/**
 * Update solution-page "Instant Consultation" WhatsApp CTA (widget cc1091b):
 * phone 86-18116425561 → 861-7751189576, link → https://wa.me/8617751189576
 * Also sync legacy 18116425561 occurrences site-wide in HTML.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const siteRoot = path.dirname(fileURLToPath(import.meta.url));
const SKIP_DIRS = new Set(['node_modules', 'cache', '.vs', '.git']);

const NEW_DISPLAY = '+86-17751189576';
const NEW_WA_LINK = 'https://wa.me/8617751189576';

const report = {
  scanned: 0,
  updated: 0,
  cc1091bFixed: 0,
  phoneReplacements: 0,
};

function fixCc1091bBlock(html) {
  const re =
    /(elementor-element-cc1091b[\s\S]*?<a class="elementor-button elementor-button-link elementor-size-sm" href=")([^"]+)("[\s\S]*?<span class="elementor-button-text">)([^<]*)(<\/span>)/i;
  if (!re.test(html)) return html;
  return html.replace(re, (match, before, href, mid, phone, after) => {
    if (href === NEW_WA_LINK && phone === NEW_DISPLAY) return match;
    report.cc1091bFixed++;
    return before + NEW_WA_LINK + mid + NEW_DISPLAY + after;
  });
}

function replaceLegacyPhones(html) {
  let count = 0;
  const pairs = [
    ['+86-18116425561', NEW_DISPLAY],
    ['0086-18116425561', '8617751189576'],
    ['86-18116425561', NEW_DISPLAY],
  ];
  let out = html;
  for (const [from, to] of pairs) {
    const parts = out.split(from);
    if (parts.length > 1) {
      count += parts.length - 1;
      out = parts.join(to);
    }
  }
  report.phoneReplacements += count;
  return out;
}

function processFile(fp) {
  const buf = fs.readFileSync(fp);
  if (buf.length < 200 || !/<!doctype html|<html/i.test(buf.slice(0, 800).toString())) return;
  report.scanned++;

  let html = buf.toString('utf8');
  const original = html;

  html = fixCc1091bBlock(html);
  html = replaceLegacyPhones(html);

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

const samples = [
  'bottling-solutions.html',
  'zh/装瓶解决方案.html',
  'fr/solutions-dembouteillage.html',
  'de/abfulllosungen.html',
].map((rel) => {
  const fp = path.join(siteRoot, rel);
  if (!fs.existsSync(fp)) return `${rel}: missing`;
  const html = fs.readFileSync(fp, 'utf8');
  const block = html.match(/elementor-element-cc1091b[\s\S]{0,600}/i);
  const href = block ? (block[0].match(/href="([^"]+)"/) || [])[1] : 'n/a';
  const phone = block ? (block[0].match(/elementor-button-text">([^<]+)/) || [])[1] : 'n/a';
  const oldLeft = html.includes('18116425561');
  return `${rel}: href=${href} phone=${phone} oldPhoneLeft=${oldLeft}`;
}).join('\n');

const remaining = [];
function findRemaining(dir, rel = '') {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const fp = path.join(dir, ent.name);
    const r = rel ? `${rel}/${ent.name}` : ent.name;
    if (ent.isDirectory()) {
      if (SKIP_DIRS.has(ent.name)) continue;
      if (ent.name === 'wp-content' && dir === siteRoot) continue;
      findRemaining(fp, r);
    } else if (ent.name.endsWith('.html') && !ent.name.endsWith('.html.z')) {
      const html = fs.readFileSync(fp, 'utf8');
      if (html.includes('18116425561')) remaining.push(r);
    }
  }
}
findRemaining(siteRoot);

const out = `即刻咨询 WhatsApp 更新报告
时间: ${new Date().toISOString()}
扫描 HTML: ${report.scanned}
更新文件: ${report.updated}
cc1091b 区块修复: ${report.cc1091bFixed}
号码文本替换次数: ${report.phoneReplacements}
仍含 18116425561 的文件: ${remaining.length}
${remaining.length ? remaining.slice(0, 15).join('\n') : '(无)'}

新号码显示: ${NEW_DISPLAY}
新 WhatsApp 链接: ${NEW_WA_LINK}

抽样验证:
${samples}
`;

fs.writeFileSync(path.join(siteRoot, '_update_whatsapp_consult_report.txt'), out, 'utf8');
console.log(out);
