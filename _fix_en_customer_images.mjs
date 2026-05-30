/**
 * 修复英文 about-us/npack-customer.html 客户群图片显示
 * 逻辑与 zh/关于我们/客户.html 等已修复页面一致
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const siteRoot = path.dirname(fileURLToPath(import.meta.url));
const fp = path.join(siteRoot, 'about-us/npack-customer.html');
const refFp = path.join(siteRoot, 'zh/关于我们/客户.html');
const prefix = '../';

const report = {
  galleryItems: 0,
  galleryThumbnails: 0,
  lazySrc: 0,
  pathPrefix: 0,
  footerLogoStyle: 0,
  duplicateFetchpriority: 0,
};

let html = fs.readFileSync(fp, 'utf8');
const orig = html;

/** 图库：从 <a href> 同步到子 div 的 data-thumbnail + background-image */
html = html.replace(
  /(<a class="e-gallery-item[\s\S]*?href=")([^"]+)("[\s\S]*?<div class="e-gallery-image\s+elementor-gallery-item__image"\s+)([^>]*)(>)/gi,
  (full, aPre, imgUrl, aMid, divAttrs, endTag) => {
    report.galleryItems++;
    let attrs = divAttrs.replace(/\s*style="[^"]*"/gi, '').replace(/\s*data-thumbnail="[^"]*"/gi, '');
    const thumb = imgUrl.startsWith('http') ? imgUrl : imgUrl;
    return `${aPre}${thumb}${aMid}data-thumbnail="${thumb}" style="background-image:url('${thumb}');background-size:cover;background-position:center;"${attrs}${endTag}`;
  },
);

/** 页脚客户 logo 尺寸（与中文页一致） */
html = html.replace(
  /(<figure class="wp-block-image[^"]*"[^>]*>\s*<img[^>]*style=")([^"]*)(")/gi,
  (m, pre, style, end) => {
    if (!/width:\s*150px/i.test(style)) return m;
    report.footerLogoStyle++;
    return `${pre}width:auto;height:auto;max-width:220px;max-height:70px${end}`;
  },
);

/** 懒加载：data-src → src */
html = html.replace(
  /(<img\b[^>]*)\bdata-src=(["'])([^"']+)\2([^>]*>)/gi,
  (full, pre, q, src, post) => {
    if (/\bsrc\s*=/.test(pre + post)) return full;
    report.lazySrc++;
    return `${pre}src=${q}${src}${q} data-src=${q}${src}${q}${post}`;
  },
);

/** 缺少 ../ 的 wp-content 引用（避免误改已有 ../） */
html = html.replace(
  /(\b(?:content|href|src)=(["']))(?!\.\.\/)(?!\.\/)(?!https?:)(wp-content\/[^"']+)\2/gi,
  (m, pre, q, p) => {
    if (p.startsWith('../')) return m;
    report.pathPrefix++;
    return `${pre}${q}${prefix}${p}${q}`;
  },
);

/** 清理重复 fetchpriority */
html = html.replace(/\bfetchpriority="high"\s+fetchpriority="high"/gi, () => {
  report.duplicateFetchpriority++;
  return 'fetchpriority="high"';
});

/** 图库 widget 关闭 elementor 懒加载（本地无 elementor JS 时） */
html = html.replace(/&quot;lazyload&quot;:&quot;yes&quot;/g, '&quot;lazyload&quot;:&quot;no&quot;');
html = html.replace(/"lazyload":"yes"/g, '"lazyload":"no"');

if (html !== orig) {
  fs.writeFileSync(fp, html, 'utf8');
}

/** 验证图片文件是否存在 */
const missing = [];
const imgRe = /(?:href|src|data-thumbnail|background-image:url\(['"]?)([^'")\s]+\.(?:webp|png|jpe?g|gif|svg))/gi;
let m;
const seen = new Set();
while ((m = imgRe.exec(html)) !== null) {
  let u = m[1].replace(/^['"]/, '');
  if (u.startsWith('http') || seen.has(u)) continue;
  seen.add(u);
  if (!u.includes('wp-content/uploads/2025/10/202510131')) continue;
  const resolved = path.normalize(path.join(path.dirname(fp), u));
  if (!fs.existsSync(resolved)) missing.push({ url: u, resolved });
}

const text = `英文客户页图片修复报告
时间: ${new Date().toISOString()}
文件: about-us/npack-customer.html
参考: zh/关于我们/客户.html

【修复项】
  图库项（href→thumbnail+background）: ${report.galleryItems}
  页脚 logo 样式校正: ${report.footerLogoStyle}
  懒加载 data-src→src: ${report.lazySrc}
  补全 ../ 的 wp-content 路径: ${report.pathPrefix}
  去除重复 fetchpriority: ${report.duplicateFetchpriority}
  elementor 图库 lazyload: yes → no

【验证】
  图库 webp 文件缺失: ${missing.length}
${missing.map((x) => `  - ${x.url}`).join('\n') || '  （无）'}

【根因说明】
  1. e-gallery-image 的 data-thumbnail 误指向 ../../.../npack.png.webp，且缺少 background-image 内联样式
  2. 原 _fix_customer_pages.mjs 未包含英文目录，未执行图库修复
  3. 页脚 logo 仍为 width:150px;height:32px，与中文页不一致
`;

fs.writeFileSync(path.join(siteRoot, 'fix_en_customer_images_report.txt'), text, 'utf8');
console.log(text);
