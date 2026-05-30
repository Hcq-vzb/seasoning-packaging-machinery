/**
 * 全站九语言 logo 统一替换为 kiwllogo.png（顶部/页脚/移动端）
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const siteRoot = path.dirname(fileURLToPath(import.meta.url));
const LOGO_FILE = 'wp-content/uploads/2025/10/kiwllogo.png';
const SKIP_DIRS = new Set(['wp-json', 'node_modules', 'cache']);
const OLD_LOGO_RE = /(?:npack\.png(?:\.webp)?|2025102005594677\.png|kiwllogo\.png)/i;

const report = {
  filesScanned: 0,
  filesModified: 0,
  headerLogos: 0,
  footerLogos: 0,
  byDepth: {},
  samples: [],
};

function isValidHtml(buf) {
  return buf.length > 500 && !(buf[0] === 0x1f && buf[1] === 0x8b) && /<!doctype html|<html/i.test(buf.slice(0, 500).toString('utf8'));
}

function logoPathForFile(htmlFile) {
  const dirRel = path.relative(siteRoot, path.dirname(htmlFile)).replace(/\\/g, '/');
  const depth = dirRel ? dirRel.split('/').filter(Boolean).length : 0;
  if (depth === 0) return `./${LOGO_FILE}`;
  return `${'../'.repeat(depth)}${LOGO_FILE}`;
}

function depthKey(htmlFile) {
  const dirRel = path.relative(siteRoot, path.dirname(htmlFile)).replace(/\\/g, '/');
  const depth = dirRel ? dirRel.split('/').filter(Boolean).length : 0;
  return depth === 0 ? '根目录(0)' : `${depth}级子目录`;
}

function patchImgAttrs(attrs, logoPath, isFooter) {
  let a = attrs;
  let changed = false;

  const setAttr = (name, val) => {
    const re = new RegExp(`\\b${name}\\s*=\\s*(["'])[^"']*\\1`, 'i');
    if (re.test(a)) {
      const next = a.replace(re, `${name}=${val.startsWith('"') || val.startsWith("'") ? val : `"${val}"`}`);
      if (next !== a) changed = true;
      a = next;
    } else if (name === 'src') {
      a += ` src="${logoPath}"`;
      changed = true;
    }
  };

  if (/\bsrc\s*=/i.test(a)) {
    const m = a.match(/\bsrc\s*=\s*(["'])([^"']*)\1/i);
    if (m && m[2] !== logoPath) {
      a = a.replace(/\bsrc\s*=\s*(["'])[^"']*\1/i, `src="${logoPath}"`);
      changed = true;
    }
  } else {
    a += ` src="${logoPath}"`;
    changed = true;
  }

  if (/\bdata-src\s*=/i.test(a)) {
    a = a.replace(/\bdata-src\s*=\s*(["'])[^"']*\1/i, `data-src="${logoPath}"`);
    changed = true;
  }

  if (/\bsrcset\s*=/i.test(a) && OLD_LOGO_RE.test(a)) {
    a = a.replace(/\bsrcset\s*=\s*(["'])[^"']*\1/i, 'srcset=""');
    changed = true;
  }

  if (/\balt\s*=\s*(["'])\s*\1/i.test(a) || !/\balt\s*=/i.test(a)) {
    if (/\balt\s*=/i.test(a)) {
      a = a.replace(/\balt\s*=\s*(["'])[^"']*\1/i, 'alt="Npack Logo"');
    } else {
      a += ' alt="Npack Logo"';
    }
    changed = true;
  }

  if (/\btitle\s*=\s*(["'])[^"']*npack[^"']*\1/i.test(a)) {
    a = a.replace(/\btitle\s*=\s*(["'])[^"']*\1/i, 'title="Npack Logo"');
    changed = true;
  }

  if (!isFooter && /\bloading\s*=\s*(["'])lazy\1/i.test(a)) {
    a = a.replace(/\s*\bloading\s*=\s*(["'])lazy\1/i, '');
    changed = true;
  }

  return { attrs: a, changed };
}

function replaceSiteLogoBlocks(html, logoPath) {
  let n = 0;
  const out = html.replace(
    /(<a\b[^>]*\bclass="[^"]*\bsite-logo-container\b[^"]*"[^>]*>[\s\S]*?<img\b)([^>]*)(>)/gi,
    (full, pre, attrs, end) => {
      const { attrs: next, changed } = patchImgAttrs(attrs, logoPath, false);
      if (changed) n++;
      return `${pre}${next}${end}`;
    },
  );
  report.headerLogos += n;
  return out;
}

function replaceFooterLogo(html, logoPath) {
  let n = 0;
  let out = html;

  out = out.replace(
    /(<footer\b[^>]*\bid="footer"[\s\S]*?<figure class="wp-block-image[^"]*"[^>]*>\s*<img\b)([^>]*)(>)/i,
    (full, pre, attrs, end) => {
      const { attrs: next, changed } = patchImgAttrs(attrs, logoPath, true);
      if (changed) n++;
      return `${pre}${next}${end}`;
    },
  );

  out = out.replace(
    /(<footer\b[^>]*\bid="footer"[\s\S]*?<img\b)([^>]*\bclass="[^"]*\bwp-image-4038\b[^"]*"[^>]*)(>)/i,
    (full, pre, attrs, end) => {
      const { attrs: next, changed } = patchImgAttrs(attrs, logoPath, true);
      if (changed) n++;
      return `${pre}${next}${end}`;
    },
  );

  report.footerLogos += n;
  return out;
}

function processFile(htmlFile) {
  const buf = fs.readFileSync(htmlFile);
  if (!isValidHtml(buf)) return;

  report.filesScanned++;
  let html = buf.toString('utf8');
  const orig = html;
  const logoPath = logoPathForFile(htmlFile);

  html = replaceSiteLogoBlocks(html, logoPath);
  html = replaceFooterLogo(html, logoPath);

  if (html !== orig) {
    fs.writeFileSync(htmlFile, html, 'utf8');
    report.filesModified++;
    const dk = depthKey(htmlFile);
    report.byDepth[dk] = (report.byDepth[dk] || 0) + 1;
    if (report.samples.length < 12) {
      report.samples.push(`${path.relative(siteRoot, htmlFile).replace(/\\/g, '/')} → ${logoPath}`);
    }
  }
}

function walk(d) {
  for (const ent of fs.readdirSync(d, { withFileTypes: true })) {
    if (ent.isDirectory()) {
      if (SKIP_DIRS.has(ent.name)) continue;
      if (ent.name === 'wp-content' && d === siteRoot) {
        const uploads = path.join(d, ent.name, 'uploads');
        if (fs.existsSync(uploads)) walkUploadsHtml(uploads);
        continue;
      }
      walk(path.join(d, ent.name));
    } else if (ent.name.endsWith('.html') && !ent.name.endsWith('.html.z')) {
      processFile(path.join(d, ent.name));
    }
  }
}

function walkUploadsHtml(uploadsDir) {
  for (const ent of fs.readdirSync(uploadsDir, { withFileTypes: true })) {
    const f = path.join(uploadsDir, ent.name);
    if (ent.isDirectory()) walkUploadsHtml(f);
    else if (ent.name.endsWith('.html')) processFile(f);
  }
}

const logoAbs = path.join(siteRoot, LOGO_FILE);
if (!fs.existsSync(logoAbs)) {
  console.error(`错误: logo 文件不存在: ${LOGO_FILE}`);
  process.exit(1);
}

walk(siteRoot);

const verify = { ok: 0, bad: [] };
function verifyWalk(d) {
  for (const ent of fs.readdirSync(d, { withFileTypes: true })) {
    if (ent.isDirectory()) {
      if (SKIP_DIRS.has(ent.name)) continue;
      if (ent.name === 'wp-content' && d === siteRoot) {
        const uploads = path.join(d, ent.name, 'uploads');
        if (fs.existsSync(uploads)) verifyWalk(uploads);
        continue;
      }
      verifyWalk(path.join(d, ent.name));
    } else if (ent.name.endsWith('.html') && !ent.name.endsWith('.html.z')) {
      const fp = path.join(d, ent.name);
      const buf = fs.readFileSync(fp);
      if (!isValidHtml(buf)) return;
      const html = buf.toString('utf8');
      const expected = logoPathForFile(fp);
      const rel = path.relative(siteRoot, fp).replace(/\\/g, '/');

      const checkImg = (block, label) => {
        const sm = block.match(/\bsrc\s*=\s*(["'])([^"']*)\1/i);
        if (!sm) {
          verify.bad.push(`${rel} [${label}] 缺少 src`);
          return;
        }
        if (sm[2] !== expected) {
          verify.bad.push(`${rel} [${label}] src=${sm[2]} 期望 ${expected}`);
          return;
        }
        const resolved = path.normalize(path.join(path.dirname(fp), sm[2].replace(/^\.\//, '')));
        if (!fs.existsSync(resolved)) {
          verify.bad.push(`${rel} [${label}] 路径无法解析: ${sm[2]}`);
          return;
        }
        verify.ok++;
      };

      const headerMatches = [...html.matchAll(/<a\b[^>]*\bclass="[^"]*\bsite-logo-container\b[^"]*"[^>]*>[\s\S]*?<img\b([^>]*)>/gi)];
      for (const m of headerMatches) checkImg(m[1], 'header');

      const footerM = html.match(/<footer\b[^>]*\bid="footer"[\s\S]*?<figure class="wp-block-image[^"]*"[^>]*>\s*<img\b([^>]*)>/i);
      if (footerM) checkImg(footerM[1], 'footer');
    }
  }
}
verifyWalk(siteRoot);

const depthLines = Object.entries(report.byDepth)
  .sort((a, b) => {
    const da = parseInt(a[0]) || 0;
    const db = parseInt(b[0]) || 0;
    return da - db;
  })
  .map(([k, v]) => `  ${k}: ${v} 个文件`)
  .join('\n');

const text = `全站 Logo 替换报告 (kiwllogo.png)
时间: ${new Date().toISOString()}
Logo 文件: ${LOGO_FILE} (${fs.statSync(logoAbs).size} bytes)

扫描 HTML: ${report.filesScanned}
修改文件: ${report.filesModified}
顶部/移动端 logo 更新: ${report.headerLogos}
页脚 logo 更新: ${report.footerLogos}

按目录层级:
${depthLines || '  无'}

路径验证: ${verify.ok} 处通过, ${verify.bad.length} 处失败
${verify.bad.slice(0, 30).join('\n') || '  全部通过'}

示例:
${report.samples.join('\n') || '  无'}
`;

fs.writeFileSync(path.join(siteRoot, 'replace_all_logos_report.txt'), text, 'utf8');
console.log(text);

if (verify.bad.length > 0) process.exitCode = 1;
