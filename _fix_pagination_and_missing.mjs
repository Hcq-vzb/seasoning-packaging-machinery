/**
 * 修复分页 ../../../ 误指向根目录；将镜像缺失的英文文章复制到各语言目录
 */
import fs from 'fs';
import path from 'path';

const root = path.resolve('c:/My Websites/baoz/www.npackpm.com');
const LANGS = ['de', 'fr', 'es', 'it', 'ru', 'pl', 'pt', 'zh'];
const LANG_SET = new Set(LANGS);

const report = { depthFixed: 0, copied: 0, copySkipped: 0, linkFixed: 0, files: 0 };

function getFileLang(htmlFile) {
  const rel = path.relative(root, htmlFile).replace(/\\/g, '/');
  const first = rel.split('/')[0];
  return LANG_SET.has(first) ? first : null;
}

function depthToLangRoot(htmlFile) {
  const rel = path.relative(root, htmlFile).replace(/\\/g, '/');
  const parts = rel.split('/');
  return Math.max(0, parts.length - 2);
}

function copyEnArticleToLang(enBasename, lang) {
  const src = path.join(root, enBasename);
  const dest = path.join(root, lang, enBasename);
  if (!fs.existsSync(src) || fs.existsSync(dest)) return false;
  let html = fs.readFileSync(src, 'utf8');
  html = html.replace(/(<link[^>]+href=["'])(\.\/)?wp-content/gi, '$1../wp-content');
  html = html.replace(/(<link[^>]+href=["'])(\.\/)?wp-includes/gi, '$1../wp-includes');
  html = html.replace(/\b(href|src|action)=(["'])(?!https|#|mailto)(\.\/)?wp-content/gi, '$1=$2../wp-content');
  html = html.replace(/\b(href|src)=(["'])(?!https|#|mailto)(\.\/)?wp-includes/gi, '$1=$2../wp-includes');
  html = html.replace(/\blang=["']en/gi, `lang="${lang === 'zh' ? 'zh-CN' : lang}`);
  fs.writeFileSync(dest, html, 'utf8');
  return true;
}

const needCopy = new Set();

function processFile(htmlFile) {
  const lang = getFileLang(htmlFile);
  if (!lang) return;
  const up = depthToLangRoot(htmlFile);
  if (up < 2) return;

  let html = fs.readFileSync(htmlFile, 'utf8');
  const orig = html;
  const correctPrefix = '../'.repeat(up);

  html = html.replace(/\b(href)=(["'])((?:\.\.\/)+)([^/"']+\.html)\2/gi, (full, attr, q, dots, base) => {
    const dotCount = (dots.match(/\.\.\//g) || []).length;
    if (dotCount < up) return full;
    const langTarget = path.join(root, lang, base);
    const rootTarget = path.join(root, base);
    if (fs.existsSync(langTarget)) {
      const fixed = correctPrefix + base;
      if (fixed !== dots + base) {
        report.depthFixed++;
        return `${attr}=${q}${fixed}${q}`;
      }
    }
    if (dotCount >= up && fs.existsSync(rootTarget) && !fs.existsSync(langTarget)) {
      needCopy.add(`${lang}|${base}`);
      const fixed = correctPrefix + base;
      if (fixed !== dots + base) {
        report.depthFixed++;
        return `${attr}=${q}${fixed}${q}`;
      }
    }
    return full;
  });

  if (html !== orig) {
    fs.writeFileSync(htmlFile, html, 'utf8');
    report.files++;
  }
}

for (const lang of LANGS) {
  const lp = path.join(root, lang);
  if (!fs.existsSync(lp)) continue;
  function walk(d) {
    for (const ent of fs.readdirSync(d, { withFileTypes: true })) {
      const f = path.join(d, ent.name);
      if (ent.isDirectory() && ent.name !== 'wp-json') walk(f);
      else if (ent.name.endsWith('.html')) processFile(f);
    }
  }
  walk(lp);
}

for (const item of needCopy) {
  const [lang, base] = item.split('|');
  if (copyEnArticleToLang(base, lang)) report.copied++;
  else report.copySkipped++;
}

const text = `分页与缺失文章修复
时间: ${new Date().toISOString()}
深度路径修正: ${report.depthFixed}
复制英文文章到语言目录: ${report.copied}（跳过 ${report.copySkipped}）
列表链接修正: ${report.linkFixed}
修改文件: ${report.files}
`;
fs.writeFileSync(path.join(root, 'fix_pagination_missing_report.txt'), text, 'utf8');
console.log(text);
