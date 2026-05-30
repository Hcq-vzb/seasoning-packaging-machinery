/**
 * 全站品牌名批量替换（9语言 HTML）
 * 优先级1: 上海Npack → 江苏KIWL, 上海置泉自动化设备有限公司 → 江苏鑫紫鲸机械制造集团有限公司
 * 优先级2: 独立 Npack/NPACK/npack → KIWL/kiwl
 * 保护 href/src/url 等路径与外链不被修改
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const siteRoot = path.dirname(fileURLToPath(import.meta.url));
const SKIP_DIRS = new Set(['node_modules', 'cache', '.vs', '.git']);
const SKIP_WP_CONTENT = true;

const report = {
  filesChanged: 0,
  p1_shanghaiNpack: 0,
  p1_company: 0,
  p2_npack: 0,
  samples: [],
};

function isValidHtml(buf) {
  return buf.length > 200 && !(buf[0] === 0x1f && buf[1] === 0x8b) && /<!doctype html|<html/i.test(buf.slice(0, 800).toString('utf8'));
}

function isProtectedValue(val) {
  if (!val || !/npack/i.test(val)) return false;
  if (/^https?:\/\//i.test(val) || val.includes('://')) return true;
  if (/npackpm|shanghainpack|npackchina|npack\.en\.|directindustry\.com/i.test(val)) return true;
  if (/[\\/]/.test(val)) return true;
  if (/\.(html?|pdf|webp|png|jpe?g|gif|svg|css|js|json|xml|woff2?|ttf|eot|z)(\?|#|$)/i.test(val)) return true;
  if (/^www\./i.test(val)) return true;
  if (/^[a-z0-9._-]*npack[a-z0-9._-]*$/i.test(val) && val.includes('-')) return true;
  return false;
}

function maskProtectedSegments(text) {
  const tokens = [];
  const mask = (segment) => {
    const id = tokens.length;
    tokens.push(segment);
    return `\x00NPMASK${id}\x00`;
  };

  // 外链
  text = text.replace(/https?:\/\/[^\s"'<>]+/gi, (m) => (isProtectedValue(m) || /npack/i.test(m) ? mask(m) : m));

  // 属性值（href/src/content/action/poster/data-* 等）
  text = text.replace(
    /(\s(?:href|src|content|action|poster|data-[\w-]+)\s*=\s*)(["'])([\s\S]*?)\2/gi,
    (full, pre, q, val) => {
      if (isProtectedValue(val)) return pre + q + mask(val) + q;
      return full;
    },
  );

  // CSS url(...)
  text = text.replace(/url\(\s*(['"]?)([^'")]+)\1\s*\)/gi, (full, q, val) => {
    if (isProtectedValue(val)) return `url(${q}${mask(val)}${q})`;
    return full;
  });

  // @keyframes / class 等标识符中的 npack（CSS/JS 技术名）
  text = text.replace(/\b(npackHeroKenBurnsIn|npack-hero-slideshow|npackpm-lang-switcher)\b/g, (m) => mask(m));

  return { text, tokens };
}

function unmask(text, tokens) {
  return text.replace(/\x00NPMASK(\d+)\x00/g, (_, i) => tokens[+i] ?? '');
}

function replaceStandaloneNpack(text) {
  let n = 0;
  const out = text.replace(/(?<![A-Za-z0-9_])(Npack|NPACK|npack)(?![A-Za-z0-9_])/g, (m) => {
    n++;
    if (m === 'npack') return 'kiwl';
    return 'KIWL';
  });
  return { text: out, n };
}

function transformContent(raw) {
  const { text: masked, tokens } = maskProtectedSegments(raw);
  let text = masked;
  let c1 = 0;
  let c2 = 0;

  const parts = text.split('上海Npack');
  if (parts.length > 1) {
    c1 = parts.length - 1;
    text = parts.join('江苏KIWL');
  }

  const parts2 = text.split('上海置泉自动化设备有限公司');
  if (parts2.length > 1) {
    c2 = parts2.length - 1;
    text = parts2.join('江苏鑫紫鲸机械制造集团有限公司');
  }

  const { text: afterNpack, n: c3 } = replaceStandaloneNpack(text);
  text = unmask(afterNpack, tokens);

  return { text, c1, c2, c3 };
}

function processFile(fp) {
  const buf = fs.readFileSync(fp);
  if (!isValidHtml(buf)) return;
  const raw = buf.toString('utf8');
  const { text, c1, c2, c3 } = transformContent(raw);
  if (text === raw) return;

  fs.writeFileSync(fp, text, 'utf8');
  report.filesChanged++;
  report.p1_shanghaiNpack += c1;
  report.p1_company += c2;
  report.p2_npack += c3;

  if (report.samples.length < 8) {
    report.samples.push(path.relative(siteRoot, fp).replace(/\\/g, '/'));
  }
}

function walk(d) {
  for (const ent of fs.readdirSync(d, { withFileTypes: true })) {
    const f = path.join(d, ent.name);
    if (ent.isDirectory()) {
      if (SKIP_DIRS.has(ent.name)) continue;
      if (SKIP_WP_CONTENT && ent.name === 'wp-content' && d === siteRoot) continue;
      walk(f);
    } else if (ent.name.endsWith('.html') && !ent.name.endsWith('.html.z')) {
      processFile(f);
    }
  }
}

walk(siteRoot);

// 验证：不应破坏路径；可见文本应已替换
const verify = { badPaths: [], leftoverBrand: [] };

function checkFile(fp) {
  const html = fs.readFileSync(fp, 'utf8');
  const rel = path.relative(siteRoot, fp).replace(/\\/g, '/');

  for (const m of html.matchAll(/\bhref=(["'])([^"']+)\1/gi)) {
    const href = m[2];
    if (/江苏KIWL|kiwl\.en\.|kiwllogo/i.test(href) && !href.includes('npack')) {
      // ok
    } else if (/\b(KIWL|kiwl)[^"']*\.(html|pdf|png|webp)/i.test(href) && /npack/i.test(href) === false) {
      // paths renamed to kiwl - flag if we accidentally changed paths
    }
    if (/href=(["'])[^"']*\bKIWL[^"']*\.html\1/i.test(`href=${m[0]}`)) {
      verify.badPaths.push(`${rel}: ${href}`);
    }
  }

  // 检查是否误改 href 中的 npack 路径
  for (const m of html.matchAll(/\b(?:href|src)=(["'])([^"']*)\1/gi)) {
    if (/kiwl/i.test(m[2]) && /\.(html|pdf|png|webp|css|js)/i.test(m[2]) && /npack/i.test(m[2]) === false) {
      const beforeNpack = ['npack-customer', 'npack-catalogue', 'npack.png', 'shanghai-npack'];
      if (beforeNpack.some((p) => m[2].toLowerCase().includes(p.replace('npack', 'kiwl')))) {
        verify.badPaths.push(`${rel}: mutated path ${m[2]}`);
      }
    }
  }

  if (/上海Npack|上海置泉自动化设备有限公司/.test(html)) {
    verify.leftoverBrand.push(`${rel}: chinese brand`);
  }
  if (/(?<![A-Za-z0-9_])(Npack|NPACK|npack)(?![A-Za-z0-9_])/.test(html)) {
    // 排除路径/URL中的残留
    const stripped = html
      .replace(/https?:\/\/[^\s"'<>]+/gi, '')
      .replace(/\b(?:href|src|content)=(["'])[^"']*\1/gi, '');
    if (/(?<![A-Za-z0-9_])(Npack|NPACK|npack)(?![A-Za-z0-9_])/.test(stripped)) {
      verify.leftoverBrand.push(`${rel}: npack text`);
    }
  }
}

function verifyWalk(d) {
  for (const ent of fs.readdirSync(d, { withFileTypes: true })) {
    const f = path.join(d, ent.name);
    if (ent.isDirectory()) {
      if (SKIP_DIRS.has(ent.name)) continue;
      if (SKIP_WP_CONTENT && ent.name === 'wp-content' && d === siteRoot) continue;
      verifyWalk(f);
    } else if (ent.name.endsWith('.html')) {
      checkFile(f);
    }
  }
}

verifyWalk(siteRoot);

const spotChecks = [
  'index.html',
  'zh/index.html',
  'vacuum-capping-machine.html',
  'zh/真空旋盖机.html',
  'about-us/npack-customer.html',
  'shanghai-npack-shines-at-propak-china-2025.html',
].map((p) => path.join(siteRoot, p)).filter((p) => fs.existsSync(p));

const spot = spotChecks.map((p) => {
  const html = fs.readFileSync(p, 'utf8');
  const rel = path.relative(siteRoot, p);
  const title = html.match(/<title>([^<]*)<\/title>/i)?.[1] ?? '';
  const h1 = html.match(/<h1[^>]*>([^<]*)<\/h1>/i)?.[1] ?? '';
  const hasNpackPath = /href="[^"]*npack[^"]*\.html"/i.test(html);
  const hasKiwlText = /KIWL|江苏KIWL|江苏鑫紫鲸/.test(html);
  return `${rel}\n  title: ${title.slice(0, 80)}\n  h1: ${h1.slice(0, 80)}\n  npack paths preserved: ${hasNpackPath}\n  kiwl text: ${hasKiwlText}`;
}).join('\n\n');

const out = `品牌名全站替换报告
时间: ${new Date().toISOString()}
修改文件数: ${report.filesChanged}
上海Npack → 江苏KIWL: ${report.p1_shanghaiNpack}
上海置泉自动化设备有限公司 → 江苏鑫紫鲸: ${report.p1_company}
独立 Npack → KIWL: ${report.p2_npack}

路径破坏: ${verify.badPaths.length}
${verify.badPaths.slice(0, 15).join('\n') || '无'}

残留品牌名: ${verify.leftoverBrand.length}
${verify.leftoverBrand.slice(0, 20).join('\n') || '无'}

抽样检查:
${spot}
`;

fs.writeFileSync(path.join(siteRoot, 'brand_replace_report.txt'), out, 'utf8');
console.log(out);
