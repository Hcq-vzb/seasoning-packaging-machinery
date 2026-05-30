/**
 * 多语言子目录 (de/fr/es/it/ru/pl/pt/zh) 结构与路径全面修复
 */
import fs from 'fs';
import path from 'path';

const root = path.resolve('c:/My Websites/baoz/www.npackpm.com');
const LANGS = ['de', 'fr', 'es', 'it', 'ru', 'pl', 'pt', 'zh'];
const LANG_RE = new RegExp(`^(${LANGS.join('|')})/`, 'i');

const HT_SUFFIXES = ['a4d4', '0805', '7af1', 'bce4', '8717', 'fb3d', 'db1a', '64a3', '0a27', '161b', '4250', '1069', '5589', 'f43b'];

const report = {
  htmlFoldersFlattened: [],
  stubsRemoved: [],
  filesModified: 0,
  urlsFixed: 0,
  dataSrcSynced: 0,
  errors: [],
};

function stripHtSuffix(baseName) {
  const ext = path.extname(baseName);
  const name = path.basename(baseName, ext);
  for (const suf of HT_SUFFIXES) {
    if (name.endsWith(suf) && name.length > suf.length + 2) return name.slice(0, -suf.length) + ext;
  }
  return baseName;
}

function isRedirectStub(fp) {
  try {
    const c = fs.readFileSync(fp, 'utf8');
    return c.length < 3500 && /HTTrack|Page has moved|META HTTP-EQUIV=["']Refresh["']/i.test(c);
  } catch { return false; }
}

function getLang(htmlFile) {
  const rel = path.relative(root, htmlFile).replace(/\\/g, '/');
  const m = rel.match(LANG_RE);
  return m ? m[1].toLowerCase() : null;
}

function depthFromRoot(htmlFile) {
  const dir = path.dirname(path.relative(root, htmlFile)).replace(/\\/g, '/');
  if (!dir || dir === '.') return 0;
  return dir.split('/').filter(Boolean).length;
}

function rootPrefix(depth) {
  return depth > 0 ? '../'.repeat(depth) : '';
}

// ── 资源索引 ──
const fileIndex = new Map();
const htmlPages = new Set();

function indexFiles(dir) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const ent of entries) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (!['node_modules', '.git'].includes(ent.name)) indexFiles(full);
    } else if (/\.(html|css|js|webp|png|jpe?g|gif|svg|woff2?)$/i.test(ent.name)) {
      const rel = path.relative(root, full).replace(/\\/g, '/');
      if (ent.name.endsWith('.html')) htmlPages.add(rel.toLowerCase());
      const key = path.dirname(rel).replace(/\\/g, '/') + '/' + stripHtSuffix(path.basename(rel)).toLowerCase();
      if (!fileIndex.has(key)) fileIndex.set(key, []);
      fileIndex.get(key).push(full);
    }
  }
}
indexFiles(root);

function findHashedSibling(absPath) {
  const dir = path.dirname(absPath);
  if (!fs.existsSync(dir)) return null;
  const ext = path.extname(absPath);
  const prefix = path.basename(absPath, ext);
  const matches = fs.readdirSync(dir).filter((f) => f.startsWith(prefix) && f.endsWith(ext) && f !== path.basename(absPath));
  if (!matches.length) return null;
  matches.sort((a, b) => a.length - b.length);
  return path.join(dir, matches[0]);
}

function resolveOnDisk(siteRel) {
  const abs = path.join(root, siteRel.replace(/\//g, path.sep));
  if (fs.existsSync(abs)) return path.relative(root, abs).replace(/\\/g, '/');
  const sib = findHashedSibling(abs);
  if (sib) return path.relative(root, sib).replace(/\\/g, '/');
  const key = path.dirname(siteRel).replace(/\\/g, '/') + '/' + stripHtSuffix(path.basename(siteRel)).toLowerCase();
  const cands = fileIndex.get(key);
  if (cands?.length === 1) return path.relative(root, cands[0]).replace(/\\/g, '/');
  if (cands?.length > 1) {
    const dir = path.dirname(siteRel).replace(/\\/g, '/').toLowerCase();
    const same = cands.find((c) => path.dirname(path.relative(root, c)).replace(/\\/g, '/').toLowerCase() === dir);
    return path.relative(root, (same || cands[0])).replace(/\\/g, '/');
  }
  return null;
}

/** 将 href 解析为站点根相对路径（逻辑路径） */
function toSiteRel(htmlFile, urlPath) {
  let u = decodeURIComponent(urlPath.split('?')[0].split('#')[0]);
  u = u.replace(/^\//, '');
  u = u.replace(/\.html\/index\.html$/i, '.html').replace(/\.html\/$/i, '.html').replace(/-html\/index\.html$/i, '-html.html').replace(/-html\/$/i, '-html.html');
  u = u.replace(/index\.html\/\//g, '');

  const fromDir = path.dirname(htmlFile);
  const lang = getLang(htmlFile);

  // 绝对 URL 转路径
  u = u.replace(/^https?:\/\/[^/]*npackpm\.com\/?/i, '');

  const tryPaths = [];
  tryPaths.push(path.resolve(fromDir, u.replace(/\//g, path.sep)));

  if (lang) {
    const stripped = u.replace(/^(\.\.\/)+/, '');
    tryPaths.push(path.join(root, lang, stripped.replace(/\//g, path.sep)));
  }
  const stripped = u.replace(/^(\.\.\/)+/, '');
  tryPaths.push(path.join(root, stripped.replace(/\//g, path.sep)));

  for (const abs of tryPaths) {
    const rel = path.relative(root, abs).replace(/\\/g, '/');
    if (!rel.startsWith('..') && !path.isAbsolute(rel)) {
      if (fs.existsSync(abs)) return rel;
      const resolved = resolveOnDisk(rel);
      if (resolved) return resolved;
    }
  }

  // 无扩展名 → 补 .html
  if (!/\.[a-z0-9]{1,8}$/i.test(path.basename(u))) {
    const withHtml = u.replace(/\/$/, '') + '.html';
    return toSiteRel(htmlFile, withHtml);
  }
  return null;
}

function relFromHtml(htmlFile, siteRel) {
  const target = path.join(root, siteRel.replace(/\//g, path.sep));
  return path.relative(path.dirname(htmlFile), target).replace(/\\/g, '/');
}

function fixUrl(htmlFile, urlPath) {
  if (!urlPath || /^(https?:|data:|mailto:|#|javascript:)/i.test(urlPath)) return null;
  const hashIdx = urlPath.indexOf('#');
  const hash = hashIdx >= 0 ? urlPath.slice(hashIdx) : '';
  const noHash = hashIdx >= 0 ? urlPath.slice(0, hashIdx) : urlPath;
  const qIdx = noHash.indexOf('?');
  const query = qIdx >= 0 ? noHash.slice(qIdx) : '';

  const siteRel = toSiteRel(htmlFile, noHash);
  if (!siteRel) return null;
  const newRel = relFromHtml(htmlFile, siteRel);
  const normOld = noHash.replace(/\\/g, '/');
  if (newRel === normOld) return null;
  return newRel + query + hash;
}

// ── Phase 1: 扁平化语言目录内 .html 文件夹 ──
function flattenLangHtmlFolders(dir) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!ent.isDirectory()) continue;
    const full = path.join(dir, ent.name);
    if (/\.html$/.test(ent.name) || /-html$/.test(ent.name)) {
      const indexPath = path.join(full, 'index.html');
      const targetName = ent.name.endsWith('.html') ? ent.name : ent.name + '.html';
      const targetFile = path.join(dir, targetName);
      try {
        if (fs.existsSync(indexPath)) {
          const size = fs.statSync(indexPath).size;
          if (size > 5000 || !isRedirectStub(indexPath)) {
            if (!fs.existsSync(targetFile)) fs.renameSync(indexPath, targetFile);
            else if (isRedirectStub(indexPath)) fs.unlinkSync(indexPath);
          }
        }
        if (fs.existsSync(full) && fs.readdirSync(full).length === 0) {
          fs.rmdirSync(full);
          report.htmlFoldersFlattened.push(path.relative(root, full).replace(/\\/g, '/'));
        }
      } catch (e) {
        report.errors.push(`flatten ${full}: ${e.message}`);
      }
    }
    flattenLangHtmlFolders(full);
  }
}
for (const lang of LANGS) {
  const lp = path.join(root, lang);
  if (fs.existsSync(lp)) flattenLangHtmlFolders(lp);
}

// ── Phase 2: 删除语言目录内重定向 stub ──
function removeLangStubs(dir) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) removeLangStubs(full);
    else if (ent.name === 'index.html' && isRedirectStub(full)) {
      try {
        fs.unlinkSync(full);
        report.stubsRemoved.push(path.relative(root, full).replace(/\\/g, '/'));
        const parent = path.dirname(full);
        if (fs.readdirSync(parent).length === 0) fs.rmdirSync(parent);
      } catch (e) {
        report.errors.push(`stub ${full}: ${e.message}`);
      }
    }
  }
}
for (const lang of LANGS) {
  const lp = path.join(root, lang);
  if (fs.existsSync(lp)) removeLangStubs(lp);
}

// ── Phase 3–4: 修复 HTML 内链接与资源 ──
const ATTR_RE = /\b(href|action|src|content|data-src|data-lazy-src|poster)=(["'])([^"']+)\2/gi;

function fixHtmlFile(htmlFile) {
  let content = fs.readFileSync(htmlFile, 'utf8');
  const orig = content;
  let fixes = 0;

  content = content.replace(/<base\b[^>]*>/gi, '');

  content = content.replace(ATTR_RE, (full, attr, q, val) => {
    if (attr === 'content' && !/^(\.\.?\/|wp-content|wp-includes|[a-z0-9_\-./%]+\.html)/i.test(val)) return full;
    const fixed = fixUrl(htmlFile, val);
    if (!fixed) return full;
    fixes++;
    return `${attr}=${q}${fixed}${q}`;
  });

  // JSON-LD / 内联 url
  content = content.replace(/"(url|item|@id|content)"\s*:\s*"([^"]+)"/gi, (full, key, val) => {
    if (/^https?:\/\//i.test(val) && !/npackpm\.com/i.test(val)) return full;
    const fixed = fixUrl(htmlFile, val.replace(/^https?:\/\/[^/]*npackpm\.com\/?/i, ''));
    if (!fixed) return full;
    fixes++;
    return `"${key}":"${fixed}"`;
  });

  content = content.replace(/index\.html\/\//g, '');

  // 懒加载：data-src → src（src 缺失或指向 index.html 时）
  content = content.replace(/<img\b([^>]*?)>/gi, (tag) => {
    const ds = tag.match(/\bdata-src=(["'])([^"']+)\1/i);
    if (!ds) return tag;
    const srcM = tag.match(/\bsrc=(["'])([^"']*)\1/i);
    const dsFixed = fixUrl(htmlFile, ds[2]) || ds[2];
    let out = tag;
    if (!srcM || /index\.html$/i.test(srcM[2]) || srcM[2] === '') {
      out = srcM
        ? out.replace(/\bsrc=(["'])[^"']*\1/i, `src="${dsFixed}"`)
        : out.replace(/<img\b/, `<img src="${dsFixed}"`);
      report.dataSrcSynced++;
    }
    if (ds[2] !== dsFixed) {
      out = out.replace(/\bdata-src=(["'])[^"']*\1/i, `data-src="${dsFixed}"`);
      fixes++;
    }
    return out;
  });

  // 分页 canonical 空值
  const base = path.basename(htmlFile);
  if (content.includes('rel="canonical" href=""') && /^\d+\.html$/.test(base)) {
    content = content.replace(/rel="canonical" href=""/, `rel="canonical" href="${base}"`);
    fixes++;
  }

  if (content !== orig) {
    fs.writeFileSync(htmlFile, content, 'utf8');
    report.filesModified++;
    report.urlsFixed += fixes;
  }
}

function walkLangHtml(dir) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) walkLangHtml(full);
    else if (ent.name.endsWith('.html')) fixHtmlFile(full);
  }
}
for (const lang of LANGS) {
  const lp = path.join(root, lang);
  if (fs.existsSync(lp)) walkLangHtml(lp);
}

// ── 验证抽样 ──
const samples = [
  'de/index.html',
  'de/nachrichten/seite/2.html',
  'pl/index.html',
  'fr/index.html',
  'zh/index.html',
];
const verify = [];
for (const s of samples) {
  const fp = path.join(root, s);
  if (!fs.existsSync(fp)) continue;
  const c = fs.readFileSync(fp, 'utf8');
  const d = depthFromRoot(fp);
  const need = rootPrefix(d);
  let bad = 0;
  for (const m of c.matchAll(/href=["'](\.\.\/)+wp-content/gi)) {
    const n = (m[1].match(/\.\.\//g) || []).length;
    if (n !== d) bad++;
  }
  const home = c.match(/menu-item-home[^>]*href=["']([^"']+)["']/i);
  verify.push(`${s}: depth=${d} wp-bad=${bad} home=${home?.[1] || 'n/a'}`);
}

const text = `多语言子目录修复报告
========================
时间: ${new Date().toISOString()}
语言: ${LANGS.join(', ')}

【第一步】扁平化 .html 文件夹: ${report.htmlFoldersFlattened.length}
${report.htmlFoldersFlattened.slice(0, 20).map((x) => '  - ' + x).join('\n')}

【第二步】删除重定向 stub: ${report.stubsRemoved.length}
${report.stubsRemoved.length > 20 ? `  ... 共 ${report.stubsRemoved.length} 个` : report.stubsRemoved.slice(0, 20).map((x) => '  - ' + x).join('\n')}

【第三~四步】链接与资源路径
  修改文件: ${report.filesModified}
  URL 修复: ${report.urlsFixed}
  懒加载 src 同步: ${report.dataSrcSynced}

【验证抽样】
${verify.map((v) => '  ' + v).join('\n')}

【错误】${report.errors.length}
${report.errors.slice(0, 15).map((e) => '  ! ' + e).join('\n')}
`;

fs.writeFileSync(path.join(root, 'fix_multilang_report.txt'), text, 'utf8');
console.log(text);
