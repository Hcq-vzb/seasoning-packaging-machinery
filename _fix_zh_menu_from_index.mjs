// 按 zh/index.html 的 menu-item-ID 校正各页 ct-menu-link href（href/class 任意顺序）
import fs from 'fs';
import path from 'path';

const zhRoot = path.resolve('c:/My Websites/baoz/www.npackpm.com/zh');
const indexHtml = fs.readFileSync(path.join(zhRoot, 'index.html'), 'utf8');

function firstMenuHref(fragment) {
  const m = fragment.match(/<a\s+[^>]*ct-menu-link[^>]*>/i);
  if (!m) return null;
  const tag = m[0];
  const hm = tag.match(/href=(["'])([^"']+)\1/i);
  if (!hm || /^(https?:|#|mailto:|javascript:)/i.test(hm[2])) return null;
  return hm[2];
}

const menuMap = new Map();
const patterns = [
  /\bid="menu-item-(\d+)"[^>]*>([\s\S]{0,1200}?)<\/a>/gi,
  /menu-item-(\d+)(?:[^>]*>)(?:<span[^>]*>\s*)?<a\s+[^>]*ct-menu-link[^>]*>/gi,
];

for (const re of patterns) {
  let m;
  while ((m = re.exec(indexHtml)) !== null) {
    const id = m[1];
    const frag = m[2] || m[0];
    const href = firstMenuHref(frag);
    if (href) menuMap.set(id, href);
  }
}

let filesFixed = 0;
let linksFixed = 0;

function fixAnchorInMenuItem(html, id, target) {
  const esc = id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const reps = [
    new RegExp(
      `(menu-item-${esc}\\b[^>]*>\\s*<a\\s+)([^>]*ct-menu-link[^>]*)(>)`,
      'gi',
    ),
    new RegExp(
      `(menu-item-${esc}(?:[^>]*>)(?:<span[^>]*>\\s*)?<a\\s+)([^>]*ct-menu-link[^>]*)(>)`,
      'gi',
    ),
  ];
  for (const re of reps) {
    html = html.replace(re, (full, pre, attrs, end) => {
      if (!/href=/i.test(attrs)) return full;
      const hm = attrs.match(/href=(["'])([^"']+)\1/i);
      if (hm && hm[2] === target) return full;
      linksFixed++;
      const newAttrs = attrs.replace(/href=(["'])[^"']+\1/i, `href=$1${target}$1`);
      return pre + newAttrs + end;
    });
  }
  return html;
}

function fixFile(f) {
  const relDir = path.relative(zhRoot, path.dirname(f)).replace(/\\/g, '/');
  const depth = relDir ? relDir.split('/').length : 0;
  const prefix = depth ? '../'.repeat(depth) : '';

  let html = fs.readFileSync(f, 'utf8');
  const orig = html;
  for (const [id, base] of menuMap) {
    html = fixAnchorInMenuItem(html, id, prefix + base);
  }
  if (html !== orig) {
    fs.writeFileSync(f, html, 'utf8');
    filesFixed++;
  }
}

function walk(d) {
  for (const ent of fs.readdirSync(d, { withFileTypes: true })) {
    const f = path.join(d, ent.name);
    if (ent.isDirectory()) {
      if (ent.name !== 'wp-json') walk(f);
    } else if (ent.name.endsWith('.html') && !ent.name.endsWith('.html.z')) {
      fixFile(f);
    }
  }
}

walk(zhRoot);
console.log(`菜单精确校正: ${filesFixed} 文件, ${linksFixed} 链接, 映射 ${menuMap.size} 项`);
