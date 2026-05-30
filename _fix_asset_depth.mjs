/**
 * 将 HTML 内本地 CSS/JS 路径规范为：从当前文件到站点根目录的正确 ../ 层级 + 已解析的真实资源名
 */
import fs from 'fs';
import path from 'path';

const root = path.resolve('c:/My Websites/baoz/www.npackpm.com');

const HT_SUFFIXES = ['a4d4', '0805', '7af1', 'bce4', '8717', 'fb3d', 'db1a', '64a3', '0a27', '161b', '4250', '1069', '5589', 'f43b'];

function stripHtSuffix(baseName) {
  const ext = path.extname(baseName);
  const name = path.basename(baseName, ext);
  for (const suf of HT_SUFFIXES) {
    if (name.endsWith(suf) && name.length > suf.length + 2) {
      return name.slice(0, -suf.length) + ext;
    }
  }
  return baseName;
}

const fileIndex = new Map();
function normKey(filePath) {
  const rel = path.relative(root, filePath).replace(/\\/g, '/');
  const dir = path.dirname(rel).replace(/\\/g, '/');
  return `${dir}/${stripHtSuffix(path.basename(rel)).toLowerCase()}`;
}

function walk(dir) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const ent of entries) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (!['node_modules', '.git'].includes(ent.name)) walk(full);
    } else if (/\.(css|js)$/i.test(ent.name)) {
      const key = normKey(full);
      if (!fileIndex.has(key)) fileIndex.set(key, []);
      fileIndex.get(key).push(full);
    }
  }
}
walk(root);

function findHashedSibling(absPath) {
  const dir = path.dirname(absPath);
  if (!fs.existsSync(dir)) return null;
  const ext = path.extname(absPath);
  const prefix = path.basename(absPath, ext);
  const matches = fs.readdirSync(dir).filter(
    (f) => f.startsWith(prefix) && f.endsWith(ext) && f !== path.basename(absPath)
  );
  if (!matches.length) return null;
  matches.sort((a, b) => a.length - b.length);
  return path.join(dir, matches[0]);
}

function resolveOnDisk(siteRelPath) {
  const abs = path.join(root, siteRelPath.replace(/\//g, path.sep));
  if (fs.existsSync(abs)) return path.relative(root, abs).replace(/\\/g, '/');
  const sibling = findHashedSibling(abs);
  if (sibling) return path.relative(root, sibling).replace(/\\/g, '/');
  const key = normKey(abs);
  const candidates = fileIndex.get(key);
  if (candidates?.length === 1) {
    return path.relative(root, candidates[0]).replace(/\\/g, '/');
  }
  if (candidates?.length > 1) {
    const dir = path.dirname(siteRelPath).replace(/\\/g, '/').toLowerCase();
    const same = candidates.find(
      (c) => path.dirname(path.relative(root, c)).replace(/\\/g, '/').toLowerCase() === dir
    );
    return path.relative(root, (same || candidates[0])).replace(/\\/g, '/');
  }
  return null;
}

/** 从任意相对路径得到站点根目录下的逻辑路径 */
function toSiteRel(htmlFile, urlPath) {
  let u = decodeURIComponent(urlPath.split('?')[0].split('#')[0]);
  u = u.replace(/^\//, '');
  const stripped = u.replace(/^(\.\.\/|\.\/)+/, '');
  // wp-content / wp-includes 始终在站点根，不受 ../ 层数影响
  if (/^(wp-content|wp-includes)/i.test(stripped)) {
    return stripped;
  }
  const abs = path.resolve(path.dirname(htmlFile), u.replace(/\//g, path.sep));
  let rel = path.relative(root, abs).replace(/\\/g, '/');
  if (rel.startsWith('..') || path.isAbsolute(rel)) return null;
  // 修正 de/wp-content/... → wp-content/...
  const langFix = rel.match(/^[a-z]{2}\/((?:wp-content|wp-includes)\/.+)$/i);
  if (langFix) return langFix[1];
  return rel;
}

function relFromHtml(htmlFile, siteRel) {
  const target = path.join(root, siteRel.replace(/\//g, path.sep));
  return path.relative(path.dirname(htmlFile), target).replace(/\\/g, '/');
}

function fixAttr(html, htmlFile, attrName, tagPattern) {
  const re = new RegExp(`(<${tagPattern}\\b[^>]*\\b${attrName}=)(["'])([^"']+)\\2`, 'gi');
  return html.replace(re, (full, pre, q, val) => {
    if (/^(https?:|data:|mailto:|#|javascript:)/i.test(val)) return full;
    const query = val.includes('?') ? '?' + val.split('?')[1].split('#')[0] : '';
    const hashPart = val.includes('#') ? val.slice(val.indexOf('#')) : '';
    const siteRel = toSiteRel(htmlFile, val);
    if (!siteRel) return full;
    const resolved = resolveOnDisk(siteRel);
    if (!resolved) return full;
    const newVal = relFromHtml(htmlFile, resolved) + query + (hashPart.startsWith('#') ? '' : hashPart);
    if (newVal === val) return full;
    return `${pre}${q}${newVal}${q}`;
  });
}

function collectHtml() {
  const files = [];
  const skip = new Set(['node_modules', '.git', 'wp-json']);
  function w(dir) {
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        if (!skip.has(ent.name) && !ent.name.startsWith('.')) w(full);
      } else if (ent.name.endsWith('.html')) files.push(full);
    }
  }
  w(root);
  return files;
}

const stats = { scanned: 0, modified: 0, fixed: 0, missing: [] };

for (const htmlFile of collectHtml()) {
  stats.scanned++;
  let content = fs.readFileSync(htmlFile, 'utf8');
  const orig = content;
  content = fixAttr(content, htmlFile, 'href', 'link');
  content = fixAttr(content, htmlFile, 'src', 'script');
  if (content !== orig) {
    fs.writeFileSync(htmlFile, content, 'utf8');
    stats.modified++;
  }
}

// 验证根目录文章 + 若干子目录
const samples = [
  'bee-pollen.html',
  'news/page/2.html',
  'de/nachrichten/seite/2.html',
];
for (const f of samples) {
  const htmlFile = path.join(root, f);
  const c = fs.readFileSync(htmlFile, 'utf8');
  for (const m of c.matchAll(/<link[^>]*rel=["']stylesheet["'][^>]*href=["']([^"']+)["']/gi)) {
    const href = m[1];
    if (/^https?:/i.test(href)) continue;
    const abs = path.resolve(path.dirname(htmlFile), decodeURIComponent(href.split('?')[0]));
    if (!fs.existsSync(abs)) stats.missing.push(`${f}: ${href}`);
  }
}

const report = `资源路径深度修复
扫描: ${stats.scanned}
修改文件: ${stats.modified}
抽样仍缺失 (${stats.missing.length}):
${stats.missing.slice(0, 40).map((x) => '  ' + x).join('\n')}
`;
fs.writeFileSync(path.join(root, 'fix_asset_depth_report.txt'), report, 'utf8');
console.log(report);
