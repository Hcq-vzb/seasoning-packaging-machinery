/**
 * Audit site-wide SEO fields: title, description, og tags, meta keywords
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const siteRoot = path.dirname(fileURLToPath(import.meta.url));
const SKIP_DIRS = new Set(['node_modules', 'cache', '.vs', '.git']);

const LANGS = ['en', 'zh', 'fr', 'de', 'it', 'es', 'ru', 'pl', 'pt'];

function detectLang(rel) {
  const norm = rel.replace(/\\/g, '/');
  const parts = norm.split('/');
  const langDirs = LANGS.filter((l) => l !== 'en');
  if (parts.length > 1 && langDirs.includes(parts[0])) return parts[0];
  const base = parts[parts.length - 1].replace('.html', '');
  if (langDirs.includes(base)) return base;
  return 'en';
}

function decodeEntities(s) {
  return s
    .replace(/&#039;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function extract(html) {
  const title = (html.match(/<title>([^<]*)<\/title>/i) || [])[1]?.trim() || '';
  const desc = decodeEntities(
    (html.match(/<meta\s+name="description"\s+content="([^"]*)"/i) || [])[1] || '',
  );
  const keywords = (html.match(/<meta\s+name="keywords"\s+content="([^"]*)"/i) || [])[1] || '';
  const ogTitle = decodeEntities(
    (html.match(/<meta\s+property="og:title"\s+content="([^"]*)"/i) || [])[1] || '',
  );
  const ogSite = decodeEntities(
    (html.match(/<meta\s+property="og:site_name"\s+content="([^"]*)"/i) || [])[1] || '',
  );
  const ogDesc = decodeEntities(
    (html.match(/<meta\s+property="og:description"\s+content="([^"]*)"/i) || [])[1] || '',
  );
  const h1Match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  const h1 = h1Match ? h1Match[1].replace(/<[^>]+>/g, '').trim() : '';
  return { title, desc, keywords, ogTitle, ogSite, ogDesc, h1 };
}

const files = [];
function walk(dir, rel = '') {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const fp = path.join(dir, ent.name);
    const r = rel ? `${rel}/${ent.name}` : ent.name;
    if (ent.isDirectory()) {
      if (SKIP_DIRS.has(ent.name)) continue;
      if (ent.name === 'wp-content' && dir === siteRoot) continue;
      walk(fp, r);
    } else if (ent.name.endsWith('.html') && !ent.name.endsWith('.html.z')) {
      const buf = fs.readFileSync(fp);
      if (buf.length < 200 || !/<!doctype html|<html/i.test(buf.slice(0, 800).toString())) continue;
      files.push(r);
    }
  }
}
walk(siteRoot);

const byLang = Object.fromEntries(LANGS.map((l) => [l, { count: 0, withDesc: 0, withKeywords: 0, siteNames: new Set() }]));
let totalKeywords = 0;
const titleSuffixes = {};
const allPages = [];

for (const rel of files) {
  const html = fs.readFileSync(path.join(siteRoot, rel), 'utf8');
  const lang = detectLang(rel);
  const seo = extract(html);
  const row = { rel, lang, ...seo };
  allPages.push(row);

  byLang[lang].count++;
  if (seo.desc) byLang[lang].withDesc++;
  if (seo.keywords) {
    byLang[lang].withKeywords++;
    totalKeywords++;
  }
  if (seo.ogSite) byLang[lang].siteNames.add(seo.ogSite);

  const suffix = seo.title.includes(' - ') ? seo.title.split(' - ').slice(1).join(' - ') : '(无后缀)';
  titleSuffixes[suffix] = (titleSuffixes[suffix] || 0) + 1;
}

const homeCandidates = [
  'index.html',
  'zh/index.html',
  'zh.html',
  'fr/index.html',
  'fr.html',
  'de/index.html',
  'de.html',
  'it/index.html',
  'it.html',
  'es/index.html',
  'es.html',
  'ru/index.html',
  'ru.html',
  'pl/index.html',
  'pl.html',
  'pt/index.html',
  'pt.html',
];

const homeSeo = [];
const seenLang = new Set();
for (const h of homeCandidates) {
  const fp = path.join(siteRoot, h);
  if (!fs.existsSync(fp)) continue;
  const lang = detectLang(h);
  if (seenLang.has(lang)) continue;
  seenLang.add(lang);
  homeSeo.push({ page: h, lang, ...extract(fs.readFileSync(fp, 'utf8')) });
}

// unique titles count per lang
const uniqueTitles = {};
for (const lang of LANGS) {
  uniqueTitles[lang] = new Set(allPages.filter((p) => p.lang === lang).map((p) => p.title)).size;
}

// pages missing description
const missingDesc = allPages.filter((p) => !p.desc).slice(0, 20);

// export full CSV for reference
const csvLines = ['lang,path,title,description,keywords,h1'];
for (const p of allPages) {
  const esc = (s) => `"${(s || '').replace(/"/g, '""')}"`;
  csvLines.push([p.lang, p.rel, esc(p.title), esc(p.desc), esc(p.keywords), esc(p.h1)].join(','));
}
fs.writeFileSync(path.join(siteRoot, '_seo_keywords_full.csv'), csvLines.join('\n'), 'utf8');

const report = `# 全站 SEO / 关键词审计报告
生成时间: ${new Date().toISOString()}

## 一、总体说明

本站使用 **All in One SEO Pro (AIOSEO)** 管理 SEO，**未使用**传统 \`<meta name="keywords">\` 标签。
实际 SEO 字段为：
- \`<title>\` 页面标题
- \`<meta name="description">\` 描述（相当于核心关键词/摘要）
- \`og:title\` / \`og:description\` / \`og:site_name\` Open Graph 标签
- Schema.org JSON-LD 结构化数据

| 指标 | 数值 |
|------|------|
| HTML 页面总数 | ${files.length} |
| 含 meta keywords 的页面 | ${totalKeywords} |
| 含 meta description 的页面 | ${allPages.filter((p) => p.desc).length} |
| 无 description 的页面 | ${allPages.filter((p) => !p.desc).length} |

## 二、各语言统计

| 语言 | 页面数 | 有 description | 有 keywords 标签 | 独立 title 数 | og:site_name |
|------|--------|----------------|------------------|---------------|--------------|
${LANGS.map((l) => {
  const d = byLang[l];
  const names = [...d.siteNames].join(' / ') || '(无)';
  return `| ${l.toUpperCase()} | ${d.count} | ${d.withDesc} | ${d.withKeywords} | ${uniqueTitles[l]} | ${names.slice(0, 80)}${names.length > 80 ? '…' : ''} |`;
}).join('\n')}

## 三、各语言首页 SEO

${homeSeo
  .map(
    (h) => `### ${h.lang.toUpperCase()} — \`${h.page}\`

- **Title:** ${h.title}
- **Description:** ${h.desc}
- **og:site_name:** ${h.ogSite}
- **H1:** ${h.h1 || '(无)'}
`,
  )
  .join('\n')}

## 四、Title 后缀品牌词（出现次数 Top 15）

站点多数页面 title 格式为「页面名 - 品牌后缀」：

${Object.entries(titleSuffixes)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 15)
  .map(([suffix, count]) => `- **${count}** 页 — \`${suffix}\``)
  .join('\n')}

## 五、核心品牌/行业关键词（从首页 description 提取）

| 语言 | 核心描述关键词 |
|------|----------------|
${homeSeo.map((h) => `| ${h.lang.toUpperCase()} | ${h.desc.slice(0, 120)}${h.desc.length > 120 ? '…' : ''} |`).join('\n')}

## 六、无 description 的页面（前 20 条）

${missingDesc.length ? missingDesc.map((p) => `- [${p.lang}] ${p.rel}`).join('\n') : '(无)'}

## 七、完整明细

全部 ${files.length} 页的 title / description / h1 已导出至 \`_seo_keywords_full.csv\`
`;

fs.writeFileSync(path.join(siteRoot, '_seo_keywords_report.md'), report, 'utf8');
console.log(report);
