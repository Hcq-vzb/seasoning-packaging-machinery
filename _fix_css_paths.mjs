import fs from 'fs';
import path from 'path';

const root = path.resolve('c:/My Websites/baoz/www.npackpm.com');

// Build index: normalized base path -> actual file(s)
const fileIndex = new Map(); // key: dir + basename without hash

// Known HTTrack / WP Rocket local mirror suffixes (before extension)
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

function normKey(filePath) {
  const rel = path.relative(root, filePath).replace(/\\/g, '/');
  const dir = path.dirname(rel).replace(/\\/g, '/');
  const cleanBase = stripHtSuffix(path.basename(rel)).toLowerCase();
  return `${dir}/${cleanBase}`;
}

/** If exact path missing, find single file in same dir with same prefix + ext */
function findHashedSibling(absPath) {
  const dir = path.dirname(absPath);
  if (!fs.existsSync(dir)) return null;
  const ext = path.extname(absPath);
  const prefix = path.basename(absPath, ext);
  const matches = fs.readdirSync(dir).filter(
    (f) => f.startsWith(prefix) && f.endsWith(ext) && f !== path.basename(absPath)
  );
  if (matches.length === 0) return null;
  if (matches.length === 1) return path.join(dir, matches[0]);
  // Prefer shortest name (usually base + 4-char HTTrack hash)
  matches.sort((a, b) => a.length - b.length);
  return path.join(dir, matches[0]);
}

function walk(dir) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const ent of entries) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (!['node_modules', '.git'].includes(ent.name)) walk(full);
    } else if (/\.(css|js|woff2?|ttf|eot|svg)$/i.test(ent.name)) {
      const key = normKey(full);
      if (!fileIndex.has(key)) fileIndex.set(key, []);
      fileIndex.get(key).push(full);
    }
  }
}
walk(root);

function resolveAsset(fromFile, urlPath) {
  if (!urlPath || /^(https?:|data:|mailto:|#|javascript:)/i.test(urlPath)) return null;
  let u = decodeURIComponent(urlPath.split('?')[0].split('#')[0]);
  u = u.replace(/^\//, '');
  const abs = path.resolve(path.dirname(fromFile), u.replace(/\//g, path.sep));
  if (fs.existsSync(abs)) return path.relative(root, abs).replace(/\\/g, '/');

  const sibling = findHashedSibling(abs);
  if (sibling) return path.relative(root, sibling).replace(/\\/g, '/');

  const rel = path.relative(root, abs).replace(/\\/g, '/');
  const key = normKey(abs);
  const candidates = fileIndex.get(key);
  if (candidates && candidates.length === 1) {
    return path.relative(root, candidates[0]).replace(/\\/g, '/');
  }
  if (candidates && candidates.length > 1) {
    const dir = path.dirname(rel).replace(/\\/g, '/').toLowerCase();
    const sameDir = candidates.find(
      (c) => path.dirname(path.relative(root, c)).replace(/\\/g, '/').toLowerCase() === dir
    );
    if (sameDir) return path.relative(root, sameDir).replace(/\\/g, '/');
    return path.relative(root, candidates[0]).replace(/\\/g, '/');
  }
  return null;
}

function relHref(fromFile, targetRel) {
  const fromDir = path.dirname(fromFile);
  const target = path.join(root, targetRel.replace(/\//g, path.sep));
  return path.relative(fromDir, target).replace(/\\/g, '/');
}

function collectHtmlFiles() {
  const files = [];
  const skipDirs = new Set(['node_modules', '.git', 'wp-includes', 'wp-json']);
  function walkHtml(dir) {
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const ent of entries) {
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        if (!skipDirs.has(ent.name) && !ent.name.startsWith('.')) walkHtml(full);
      } else if (ent.name.endsWith('.html') && ent.name !== 'index.html') {
        files.push(full);
      }
    }
  }
  walkHtml(root);
  return files;
}

const stats = {
  filesScanned: 0,
  filesModified: 0,
  cssFixed: 0,
  jsFixed: 0,
  stillMissing: [],
};

const linkRe = /<link\b([^>]*)\brel=["']stylesheet["']([^>]*)>/gi;
const linkRe2 = /<link\b([^>]*)\brel=["']stylesheet["']([^>]*)>/gi;
const hrefInTag = /href=["']([^"']+)["']/i;

function fixStylesheetTags(html, htmlFile) {
  return html.replace(/<link\b[^>]*\brel=["']stylesheet["'][^>]*>/gi, (tag) => {
    const hm = tag.match(/href=["']([^"']+)["']/i);
    if (!hm) return tag;
    const orig = hm[1];
    if (/^https?:/i.test(orig)) return tag; // keep external fonts
    const resolved = resolveAsset(htmlFile, orig);
    if (!resolved) {
      stats.stillMissing.push({ file: path.relative(root, htmlFile), href: orig });
      return tag;
    }
    const rel = relHref(htmlFile, resolved);
    const query = orig.includes('?') ? '?' + orig.split('?')[1].split('#')[0] : '';
    const newHref = rel + query;
    const normOrig = orig.replace(/\\/g, '/');
    if (newHref === orig || newHref === normOrig) return tag;
    stats.cssFixed++;
    return tag.replace(/href=["'][^"']+["']/i, `href="${newHref}"`);
  });
}

function fixScriptTags(html, htmlFile) {
  return html.replace(/<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi, (tag, src) => {
    if (/^https?:/i.test(src)) return tag;
    const resolved = resolveAsset(htmlFile, src);
    if (!resolved) return tag;
    const rel = relHref(htmlFile, resolved);
    const query = src.includes('?') ? '?' + src.split('?')[1].split('#')[0] : '';
    const newSrc = rel + query;
    if (newSrc === src) return tag;
    stats.jsFixed++;
    return tag.replace(/src=["'][^"']+["']/i, `src="${newSrc}"`);
  });
}

function fixNoscriptStyles(html, htmlFile) {
  return html.replace(/<noscript[^>]*>[\s\S]*?<link\s+rel=["']stylesheet["']\s+href=["']([^"']+)["']/gi, (match, href) => {
    if (/^https?:/i.test(href)) return match;
    const resolved = resolveAsset(htmlFile, href);
    if (!resolved) return match;
    const rel = relHref(htmlFile, resolved);
    return match.replace(href, rel);
  });
}

// Fix @import and url() in inline style blocks - basic
function fixInlineStyleUrls(html, htmlFile) {
  return html.replace(/url\(\s*["']?([^"')]+)["']?\s*\)/gi, (m, u) => {
    if (/^https?:|^data:|^#/.test(u)) return m;
    const resolved = resolveAsset(htmlFile, u);
    if (!resolved) return m;
    const rel = relHref(htmlFile, resolved);
    return `url("${rel}")`;
  });
}

for (const htmlFile of collectHtmlFiles()) {
  stats.filesScanned++;
  let content = fs.readFileSync(htmlFile, 'utf8');
  const orig = content;
  content = fixStylesheetTags(content, htmlFile);
  content = fixNoscriptStyles(content, htmlFile);
  content = fixScriptTags(content, htmlFile);
  // Only fix url() in link tags area - skip large inline CSS
  if (content !== orig) {
    fs.writeFileSync(htmlFile, content, 'utf8');
    stats.filesModified++;
  }
}

// Deduplicate missing
const uniqMissing = new Map();
for (const m of stats.stillMissing) {
  uniqMissing.set(m.file + '|' + m.href, m);
}

const report = `CSS/JS 路径修复报告
==================
扫描 HTML 文件: ${stats.filesScanned}
修改文件数: ${stats.filesModified}
校正 stylesheet 链接: ${stats.cssFixed}
校正 script 链接: ${stats.jsFixed}
仍缺失的资源: ${uniqMissing.size}

${[...uniqMissing.values()].slice(0, 80).map(m => `  [${m.file}] ${m.href}`).join('\n')}
`;

fs.writeFileSync(path.join(root, 'fix_css_paths_report.txt'), report, 'utf8');
console.log(report);
