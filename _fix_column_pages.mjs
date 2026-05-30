/**
 * 栏目页修复：扁平化 .html 文件夹、删除重定向 stub、校正全站栏目链接、移除 base 标签
 * 排除：news/technology 下已修复的新闻分页与详情（仅跳过 .html 文件夹扫描中的 news 子树）
 */
import fs from 'fs';
import path from 'path';

const root = path.resolve('c:/My Websites/baoz/www.npackpm.com');

const NEWS_SKIP_RE = /[/\\](news|firm-news|industry-news|exhibitions)[/\\]page[/\\]/i;
const NEWS_LANG_RE = /[/\\](nachrichten|nouvelles|notizie|noticias|wiadomosci|novosti|新闻|技术|technologie)[/\\](page|seite|页码)[/\\]/i;

const report = {
  htmlFoldersFlattened: [],
  stubIndexRemoved: [],
  linksFixed: 0,
  filesModified: 0,
  baseTagsRemoved: 0,
  errors: [],
};

function isNewsPath(p) {
  const n = p.replace(/\\/g, '/');
  return NEWS_SKIP_RE.test(n) || NEWS_LANG_RE.test(n);
}

function isRedirectStub(filePath) {
  try {
    const c = fs.readFileSync(filePath, 'utf8');
    return c.length < 3500 && /HTTrack|Page has moved|META HTTP-EQUIV=["']Refresh["']/i.test(c);
  } catch {
    return false;
  }
}

// ── Phase 1: 扁平化 *.html 文件夹 ──
function flattenHtmlFolders(dir) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const ent of entries) {
    if (!ent.isDirectory()) continue;
    const full = path.join(dir, ent.name);
    const rel = path.relative(root, full).replace(/\\/g, '/');
    if (isNewsPath(rel)) {
      flattenHtmlFolders(full);
      continue;
    }
    if (/\.html$/.test(ent.name) || /-html$/.test(ent.name)) {
      const indexPath = path.join(full, 'index.html');
      const targetFile = path.join(dir, ent.name.endsWith('.html') ? ent.name : ent.name + '.html');
      try {
        if (fs.existsSync(indexPath)) {
          const size = fs.statSync(indexPath).size;
          if (size > 5000 || !isRedirectStub(indexPath)) {
            if (!fs.existsSync(targetFile)) {
              fs.renameSync(indexPath, targetFile);
              report.htmlFoldersFlattened.push(rel);
            }
          }
        }
        if (fs.existsSync(full)) {
          const left = fs.readdirSync(full);
          if (left.length === 0) fs.rmdirSync(full);
        }
      } catch (e) {
        report.errors.push(`flatten ${rel}: ${e.message}`);
      }
    }
    flattenHtmlFolders(full);
  }
}
flattenHtmlFolders(root);

// ── Phase 2: 删除重定向 stub index.html（保留含真实内容的目录）──
function removeStubs(dir) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const ent of entries) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      removeStubs(full);
      continue;
    }
    if (ent.name !== 'index.html') continue;
    const rel = path.relative(root, full).replace(/\\/g, '/');
    if (isNewsPath(rel)) continue;
    if (!isRedirectStub(full)) continue;
    try {
      fs.unlinkSync(full);
      report.stubIndexRemoved.push(rel);
      const parentDir = path.dirname(full);
      if (fs.readdirSync(parentDir).length === 0) fs.rmdirSync(parentDir);
    } catch (e) {
      report.errors.push(`stub ${rel}: ${e.message}`);
    }
  }
}
removeStubs(root);

// ── Phase 3: 建立站点内 .html 页面索引（slug 路径 -> 根相对路径）──
const htmlPages = new Set();
function indexHtmlPages(dir) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (!['node_modules', '.git', 'wp-content', 'wp-includes'].includes(ent.name)) indexHtmlPages(full);
    } else if (ent.name.endsWith('.html')) {
      htmlPages.add(path.relative(root, full).replace(/\\/g, '/').toLowerCase());
    }
  }
}
indexHtmlPages(root);

function resolveLocalUrl(htmlFile, urlPath) {
  if (!urlPath || /^(https?:|data:|mailto:|#|javascript:)/i.test(urlPath)) return null;
  const hashIdx = urlPath.indexOf('#');
  const hash = hashIdx >= 0 ? urlPath.slice(hashIdx) : '';
  const noHash = hashIdx >= 0 ? urlPath.slice(0, hashIdx) : urlPath;
  const qIdx = noHash.indexOf('?');
  const query = qIdx >= 0 ? noHash.slice(qIdx) : '';
  let p = decodeURIComponent(qIdx >= 0 ? noHash.slice(0, qIdx) : noHash);

  // 已是 .html 文件：仅规范化 .html/ 与 index.html
  p = p.replace(/\.html\/index\.html$/i, '.html').replace(/\.html\/$/i, '.html').replace(/-html\/index\.html$/i, '-html.html').replace(/-html\/$/i, '-html.html');

  const hasExt = /\.[a-z0-9]{1,6}$/i.test(p.split('/').pop() || '');
  if (!hasExt) {
    const tryHtml = p.replace(/\/$/, '') + '.html';
    const abs1 = path.resolve(path.dirname(htmlFile), tryHtml);
    const rel1 = path.relative(root, abs1).replace(/\\/g, '/');
    if (htmlPages.has(rel1.toLowerCase())) p = tryHtml;
    else {
      const rootTry = tryHtml.replace(/^(\.\.\/)+/, '');
      if (htmlPages.has(rootTry.toLowerCase())) p = tryHtml;
    }
  }

  const abs = path.resolve(path.dirname(htmlFile), p.replace(/\//g, path.sep));
  const siteRel = path.relative(root, abs).replace(/\\/g, '/');
  if (siteRel.startsWith('..') || !htmlPages.has(siteRel.toLowerCase())) {
    // 尝试仅补 .html
    if (!hasExt) {
      const try2 = p.replace(/\/$/, '') + '.html';
      const abs2 = path.resolve(path.dirname(htmlFile), try2);
      const sr2 = path.relative(root, abs2).replace(/\\/g, '/');
      if (!sr2.startsWith('..') && htmlPages.has(sr2.toLowerCase())) {
        p = try2;
      } else return null;
    } else return null;
  }

  const newRel = path.relative(path.dirname(htmlFile), path.join(root, p.replace(/\//g, path.sep))).replace(/\\/g, '/');
  return newRel + query + hash;
}

const ATTR_RE = /\b(href|action|src|content|data-href)=(["'])([^"']+)\2/gi;
const JSON_URL_RE = /"(url|item|@id|mainEntityOfPage|content)"\s*:\s*"([^"]+)"/gi;

function fixHtmlContent(htmlFile, content) {
  let changed = 0;

  // 删除 base 标签
  const baseBefore = content;
  content = content.replace(/<base\b[^>]*>/gi, () => { report.baseTagsRemoved++; return ''; });
  if (content !== baseBefore) changed++;

  content = content.replace(ATTR_RE, (full, attr, q, val) => {
    if (/^(https?:|data:|mailto:|#|javascript:)/i.test(val)) return full;
    // content 属性仅修复明显本地路径
    if (attr === 'content' && !/^(\.\.?\/|wp-content|wp-includes|[a-z0-9_-]+$)/i.test(val)) return full;
    const fixed = resolveLocalUrl(htmlFile, val);
    if (!fixed || fixed === val) return full;
    changed++;
    return `${attr}=${q}${fixed}${q}`;
  });

  // JSON-LD 内 url
  content = content.replace(JSON_URL_RE, (full, key, val) => {
    if (/^https?:\/\//i.test(val)) return full;
    const fixed = resolveLocalUrl(htmlFile, val);
    if (!fixed || fixed === val) return full;
    changed++;
    return `"${key}":"${fixed}"`;
  });

  // 遗留模式
  const patterns = [
    [/([a-zA-Z0-9_\-./%]+)\.html\/index\.html/g, '$1.html'],
    [/([a-zA-Z0-9_\-./%]+)-html\/index\.html/g, '$1-html.html'],
    [/(\b(href|action|src)=["'])([^"']+?)\.html\/(["'])/g, '$1$3.html$4'],
    [/(\b(href|action|src)=["'])([^"']+?)-html\/(["'])/g, '$1$3-html.html$4'],
  ];
  for (const [re, rep] of patterns) {
    const before = content;
    content = content.replace(re, rep);
    if (content !== before) changed++;
  }

  return { content, changed };
}

function collectFiles() {
  const files = [];
  const skip = new Set(['node_modules', '.git']);
  function w(dir) {
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        if (!skip.has(ent.name) && !ent.name.startsWith('.')) w(full);
      } else if (/\.(html|js)$/i.test(ent.name) && !full.includes(`${path.sep}wp-content${path.sep}`) && !full.includes(`${path.sep}wp-includes${path.sep}`)) {
        files.push(full);
      }
    }
  }
  w(root);
  return files;
}

for (const file of collectFiles()) {
  try {
    let content = fs.readFileSync(file, 'utf8');
    const { content: fixed, changed } = fixHtmlContent(file, content);
    if (changed > 0) {
      fs.writeFileSync(file, fixed, 'utf8');
      report.filesModified++;
      report.linksFixed += changed;
    }
  } catch (e) {
    report.errors.push(`${path.relative(root, file)}: ${e.message}`);
  }
}

// ── 验证 ──
let remainingHtmlDirs = 0;
let remainingStubs = 0;
let remainingBadLinks = 0;
let extensionlessColumnLinks = 0;

function verifyDir(d) {
  for (const ent of fs.readdirSync(d, { withFileTypes: true })) {
    const full = path.join(d, ent.name);
    if (ent.isDirectory()) {
      if (/\.html$/.test(ent.name) || /-html$/.test(ent.name)) remainingHtmlDirs++;
      verifyDir(full);
    } else if (ent.name === 'index.html' && isRedirectStub(full)) {
      remainingStubs++;
    }
  }
}
verifyDir(root);

const columnSlugs = ['about-us', 'services', 'contact', 'product', 'bottling-solutions', 'technology'];
for (const file of collectFiles().filter((f) => f.endsWith('.html'))) {
  const c = fs.readFileSync(file, 'utf8');
  if (/\.html\/index\.html|-html\/index\.html/.test(c)) remainingBadLinks++;
  for (const slug of columnSlugs) {
    const re = new RegExp(`(?:href|action|src|content)=["'](?:\\.\\./)*${slug}["']`, 'i');
    if (re.test(c)) extensionlessColumnLinks++;
  }
}

const text = `栏目页面结构修复报告
========================
生成时间: ${new Date().toISOString()}

【第一步】扁平化 .html 文件夹: ${report.htmlFoldersFlattened.length} 个
${report.htmlFoldersFlattened.slice(0, 30).map((x) => '  - ' + x).join('\n')}

【第二步】删除 HTTrack 重定向 stub index.html: ${report.stubIndexRemoved.length} 个
${report.stubIndexRemoved.slice(0, 30).map((x) => '  - ' + x).join('\n')}${report.stubIndexRemoved.length > 30 ? `\n  ... 共 ${report.stubIndexRemoved.length} 个` : ''}

【第三步】链接与 base 标签修复
  修改文件数: ${report.filesModified}
  修复项数: ${report.linksFixed}
  移除 base 标签: ${report.baseTagsRemoved}

【第四步】验证
  剩余 .html 文件夹: ${remainingHtmlDirs}
  剩余重定向 stub: ${remainingStubs}
  仍含 .html/index.html 模式的文件: ${remainingBadLinks}
  仍含无扩展名栏目链接的文件: ${extensionlessColumnLinks}

【错误】${report.errors.length}
${report.errors.slice(0, 20).map((e) => '  ! ' + e).join('\n')}

【补充】新闻分页路径已单独恢复（news/page/2-4.html）
`;

const outPath = path.join(root, 'fix_column_pages_report.txt');
fs.writeFileSync(outPath, text, 'utf8');
console.log(text);
console.log('Report:', outPath);
