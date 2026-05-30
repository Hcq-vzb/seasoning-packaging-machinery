/**
 * 修复品牌替换脚本误改的路径/URL（保留可见文本 KIWL）
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const siteRoot = path.dirname(fileURLToPath(import.meta.url));
const SKIP_DIRS = new Set(['node_modules', 'cache', '.vs', '.git']);

const report = { filesChanged: 0, fixes: 0 };

// 仅修复路径/文件名/邮箱域名中的 kiwl → npack
const PATH_REPLACEMENTS = [
  [/kiwllogo/gi, 'npacklogo'],
  [/kiwl\.png/gi, 'npack.png'],
  [/shanghai-kiwl/gi, 'shanghai-npack'],
  [/kiwl-customer/gi, 'npack-customer'],
  [/kiwl-certification/gi, 'npack-certification'],
  [/kiwl-factory/gi, 'npack-factory'],
  [/kiwl-team/gi, 'npack-team'],
  [/kiwl-kunde/gi, 'npack-kunde'],
  [/kiwl-zertifizierung/gi, 'npack-zertifizierung'],
  [/kiwl-werk/gi, 'npack-werk'],
  [/client-kiwl/gi, 'client-npack'],
  [/certification-kiwl/gi, 'certification-npack'],
  [/fabrica-kiwl/gi, 'fabrica-npack'],
  [/equipo-kiwl/gi, 'equipo-npack'],
  [/certificacion-kiwl/gi, 'certificacion-npack'],
  [/cliente-kiwl/gi, 'cliente-npack'],
  [/certificazione-kiwl/gi, 'certificazione-npack'],
  [/fabbrica-kiwl/gi, 'fabbrica-npack'],
  [/klient-kiwl/gi, 'klient-npack'],
  [/certyfikacja-kiwl/gi, 'certyfikacja-npack'],
  [/certificacao-kiwl/gi, 'certificacao-npack'],
  [/equipa-kiwl/gi, 'equipa-npack'],
  [/usine-kiwl/gi, 'usine-npack'],
  [/lequipe-kiwl/gi, 'lequipe-npack'],
  [/kiwl-认证/g, 'npack-认证'],
  [/KIWL-catalog/g, 'Npack-catalog'],
  [/kiwl-catalogue/gi, 'npack-catalogue'],
  [/kiwlchina/gi, 'npackchina'],
  // 通用：文件名片段 -kiwl. / -kiwl.html / /kiwl-
  [/([\/\\%_-])kiwl(\.html)/gi, '$1npack$2'],
  [/([\/\\%_-])kiwl([\/\\%_-])/gi, '$1npack$2'],
];

function isValidHtml(buf) {
  return buf.length > 200 && /<!doctype html|<html/i.test(buf.slice(0, 800).toString('utf8'));
}

function fixPaths(text) {
  let n = 0;
  for (const [re, rep] of PATH_REPLACEMENTS) {
    const before = text;
    text = text.replace(re, (...args) => {
      n++;
      return typeof rep === 'function' ? rep(...args) : rep;
    });
    if (text !== before) {
      // count handled per replacement
    }
  }
  return { text, n };
}

function processFile(fp) {
  const buf = fs.readFileSync(fp);
  if (!isValidHtml(buf)) return;
  const raw = buf.toString('utf8');
  const { text, n } = fixPaths(raw);
  if (text === raw) return;
  fs.writeFileSync(fp, text, 'utf8');
  report.filesChanged++;
  report.fixes += n;
}

function walk(d) {
  for (const ent of fs.readdirSync(d, { withFileTypes: true })) {
    const f = path.join(d, ent.name);
    if (ent.isDirectory()) {
      if (SKIP_DIRS.has(ent.name)) continue;
      if (ent.name === 'wp-content' && d === siteRoot) continue;
      walk(f);
    } else if (ent.name.endsWith('.html') && !ent.name.endsWith('.html.z')) {
      processFile(f);
    }
  }
}

walk(siteRoot);

// 验证
const issues = [];
function verifyFile(fp) {
  const html = fs.readFileSync(fp, 'utf8');
  const rel = path.relative(siteRoot, fp).replace(/\\/g, '/');
  if (/kiwllogo|kiwl\.png\.webp|kiwl-customer\.html|shanghai-kiwl|kiwlchina/i.test(html)) {
    if (/src=[^>]*kiwl|href=[^>]*kiwl|NPACKPM_LANG[^;]*kiwl|rocket_beacon_data[^<]*kiwl/i.test(html)) {
      issues.push(rel);
    }
  }
  for (const m of html.matchAll(/\b(?:href|src)=(["'])([^"']*kiwl[^"']*)\1/gi)) {
    if (/\.(html|png|webp|pdf|jpg)/i.test(m[2])) issues.push(`${rel}: ${m[2]}`);
  }
}

function verifyWalk(d) {
  for (const ent of fs.readdirSync(d, { withFileTypes: true })) {
    const f = path.join(d, ent.name);
    if (ent.isDirectory()) {
      if (SKIP_DIRS.has(ent.name)) continue;
      if (ent.name === 'wp-content' && d === siteRoot) continue;
      verifyWalk(f);
    } else if (ent.name.endsWith('.html')) {
      verifyFile(f);
    }
  }
}
verifyWalk(siteRoot);

const spots = ['index.html', 'zh/index.html', 'vacuum-capping-machine.html', 'about-us/npack-customer.html'].map((p) => {
  const fp = path.join(siteRoot, p);
  if (!fs.existsSync(fp)) return `${p}: missing`;
  const h = fs.readFileSync(fp, 'utf8');
  const title = h.match(/<title>([^<]*)<\/title>/i)?.[1] ?? '';
  const logoSrc = h.match(/src="([^"]*logo[^"]*)"/i)?.[1] ?? '';
  const langEquiv = h.match(/NPACKPM_LANG_EQUIV=\{([^}]+)\}/)?.[1]?.slice(0, 120) ?? 'n/a';
  const hasKiwlText = /KIWL|江苏KIWL/.test(h);
  const badPath = /href="[^"]*kiwl[^"]*\.html"/i.test(h);
  return `${p}\n  title: ${title.slice(0, 60)}\n  logo: ${logoSrc}\n  KIWL text: ${hasKiwlText}\n  bad href: ${badPath}\n  LANG_EQUIV: ${langEquiv}`;
}).join('\n\n');

const out = `路径回归修复报告
时间: ${new Date().toISOString()}
修改文件: ${report.filesChanged}
替换次数: ${report.fixes}
残留路径问题: ${issues.length}
${issues.slice(0, 20).join('\n') || '无'}

抽样:
${spots}
`;

fs.writeFileSync(path.join(siteRoot, 'path_regression_fix_report.txt'), out, 'utf8');
console.log(out);
