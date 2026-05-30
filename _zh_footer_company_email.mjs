/**
 * 批量更新 zh/ 目录：页脚版权、公司名、邮箱
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const siteRoot = path.dirname(fileURLToPath(import.meta.url));
const zhDir = path.join(siteRoot, 'zh');
const NEW_COMPANY = '江苏鑫紫鲸机械制造集团有限公司';
const NEW_EMAIL = 'cathy@kiwlmachine.com';
const MAILTO = `mailto:${NEW_EMAIL}`;

function walkHtml(dir, files = []) {
  for (const name of fs.readdirSync(dir)) {
    const fp = path.join(dir, name);
    if (fs.statSync(fp).isDirectory()) walkHtml(fp, files);
    else if (name.endsWith('.html')) files.push(fp);
  }
  return files;
}

function privacyPolicyHref(filePath) {
  const rel = path.relative(path.dirname(filePath), path.join(zhDir, '隐私政策.html'));
  return rel.split(path.sep).join('/');
}

function fixFooter(html, filePath) {
  const privacyHref = privacyPolicyHref(filePath);
  const tail = `<a href="${privacyHref}" target="_blank" rel="noopener">隐私政策</a> -<a href="https://npack.en.alibaba.com/" target="_blank" rel="noreferrer noopener nofollow">阿里巴巴</a> - <a href="https://pdf.directindustry.com/pdf/shanghai-npack-automation-equipment-co-ltd-247602.html" target="_blank" rel="noreferrer noopener nofollow">直接行业</a></p></div>`;

  const footerCore = `版权所有 © 2026 - ${NEW_COMPANY} - ${tail}`;

  // 中文页脚（含重复公司名、占位符）
  html = html.replace(
    /版权所有 © 2026 - \{江苏恩派克电子有限公司\} - 江苏恩派克电子有限公司-\s*<a href="[^"]*"[^>]*>隐私政策<\/a> -<a href="https:\/\/npack\.en\.alibaba\.com\/"[^>]*>阿里巴巴<\/a> - <a href="https:\/\/pdf\.directindustry\.com\/pdf\/shanghai-npack-automation-equipment-co-ltd-247602\.html"[^>]*>直接行业<\/a><\/p><\/div>/g,
    footerCore,
  );

  // 已部分修复或仅重复公司名
  html = html.replace(
    /版权所有 © 2026 - \{江苏恩派克电子有限公司\} - 江苏恩派克电子有限公司-/g,
    `版权所有 © 2026 - ${NEW_COMPANY} - `,
  );
  html = html.replace(
    /版权所有 © 2026 - 江苏恩派克电子有限公司 - 江苏恩派克电子有限公司-/g,
    `版权所有 © 2026 - ${NEW_COMPANY} - `,
  );
  html = html.replace(/版权所有 © 2026 - \{江苏恩派克电子有限公司\} -/g, `版权所有 © 2026 - ${NEW_COMPANY} -`);

  // 英文页脚（zh 目录内残留）
  html = html.replace(
    /Copyright © 2026 - \{Shanghai KIWL\} - <a href="[^"]*"[^>]*>Privacy Policy<\/a> -<a href="https:\/\/npack\.en\.alibaba\.com\/"[^>]*>Alibaba<\/a> - <a href="https:\/\/pdf\.directindustry\.com\/pdf\/shanghai-npack-automation-equipment-co-ltd-247602\.html"[^>]*>Directindustry<\/a><\/p><\/div>/g,
    footerCore,
  );
  html = html.replace(
    /Copyright © 2026 - \{Jiangsu KIWL Machinery Manufacturing Group Co., Ltd\} - <a href="[^"]*"[^>]*>Privacy Policy<\/a> -<a href="https:\/\/npack\.en\.alibaba\.com\/"[^>]*>Alibaba<\/a> - <a href="https:\/\/pdf\.directindustry\.com\/pdf\/shanghai-npack-automation-equipment-co-ltd-247602\.html"[^>]*>Directindustry<\/a><\/p><\/div>/g,
    footerCore,
  );

  return html;
}

function fixEmail(html) {
  html = html.replace(/href="mailto:[^"]*"/gi, (m) => {
    if (/npackchina|n&#112;ack|np&#097;ck|npack/i.test(m)) return `href="${MAILTO}"`;
    return m;
  });
  html = html.replace(/info@npackchina\.com/gi, NEW_EMAIL);
  return html;
}

function fixCompanyNames(html) {
  return html
    .replace(/\{江苏恩派克电子有限公司\}/g, '')
    .replace(/江苏恩派克电子有限公司/g, NEW_COMPANY)
    .replace(/江苏恩派克自动化设备有限公司/g, NEW_COMPANY)
    .replace(/江苏恩派克/g, '江苏鑫紫鲸');
}

const files = walkHtml(zhDir);
let changed = 0;
const report = [];

for (const fp of files) {
  const orig = fs.readFileSync(fp, 'utf8');
  let html = orig;
  html = fixFooter(html, fp);
  html = fixCompanyNames(html);
  html = fixEmail(html);

  if (html !== orig) {
    fs.writeFileSync(fp, html, 'utf8');
    changed++;
    report.push(path.relative(siteRoot, fp));
  }
}

const reportPath = path.join(siteRoot, '_zh_footer_update_report.txt');
fs.writeFileSync(
  reportPath,
  `Updated ${changed} / ${files.length} files\n\n${report.join('\n')}\n`,
  'utf8',
);
console.log(`Updated ${changed} / ${files.length} zh HTML files`);
console.log(`Report: ${reportPath}`);
