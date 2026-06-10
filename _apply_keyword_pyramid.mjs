/**
 * Apply site-wide keyword pyramid: meta keywords, unified title suffix, tier SEO.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { PYRAMID, HUB_SLUG_MAP, BRAND } from './_keyword_pyramid.config.mjs';

const siteRoot = path.dirname(fileURLToPath(import.meta.url));
const SKIP_DIRS = new Set(['node_modules', 'cache', '.vs', '.git', 'wp-content', 'netlify', 'functions']);
const LANGS = ['en', 'zh', 'fr', 'de', 'it', 'es', 'ru', 'pl', 'pt'];
const LANG_DIRS = new Set(['zh', 'fr', 'de', 'it', 'es', 'ru', 'pl', 'pt']);

const ALL_HUB_SLUGS = new Set();
for (const [enSlug, langs] of Object.entries(HUB_SLUG_MAP)) {
  ALL_HUB_SLUGS.add(enSlug);
  for (const slug of Object.values(langs)) ALL_HUB_SLUGS.add(slug);
}

const stats = {
  scanned: 0,
  skipped: 0,
  modified: 0,
  byTier: {},
  keywordsAdded: 0,
  titleFixed: 0,
  descUpdated: 0,
};

function norm(p) {
  return p.replace(/\\/g, '/');
}

function detectLang(rel) {
  const parts = norm(rel).split('/');
  if (parts.length > 1 && LANG_DIRS.has(parts[0])) return parts[0];
  const base = parts[parts.length - 1].replace('.html', '');
  if (LANG_DIRS.has(base)) return base;
  return 'en';
}

function escapeAttr(s) {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

function decodeEntities(s) {
  return s
    .replace(/&#039;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function stripTitleSuffix(title) {
  return (
    title
      .replace(/\s*[-–|]\s*(China|KIWL|Chiny|Cina|Китай|江苏|鑫紫鲸|Jiangsu).*$/i, '')
      .replace(/\s*[-–|]\s*.*(?:Manufacturer|Hersteller|Fabricant|Produttore|Fabricante|Producent|Производитель|制造商).*$/i, '')
      .trim() || title
  );
}

function slugBase(name) {
  return name.replace(/-\d+$/, '').replace(/-html$/, '');
}

function isHome(rel) {
  const n = norm(rel);
  if (n === 'index.html') return true;
  if (/^(zh|fr|de|it|es|ru|pl|pt)\/index\.html$/.test(n)) return true;
  const base = path.basename(n, '.html');
  if (LANG_DIRS.has(base) && !n.includes('/')) return true;
  return false;
}

function findHubKey(basename) {
  const base = slugBase(basename);
  for (const [enSlug, langs] of Object.entries(HUB_SLUG_MAP)) {
    if (base === enSlug) return enSlug;
    for (const slug of Object.values(langs)) {
      if (base === slug) return enSlug;
    }
  }
  return null;
}

function classify(rel, html) {
  if (/noindex,\s*nofollow/i.test(html)) return { tier: 'skip' };
  const n = norm(rel).toLowerCase();
  const basename = slugBase(path.basename(rel, '.html'));
  const lang = detectLang(rel);

  if (isHome(rel)) return { tier: 't1', lang, hub: null };

  const hubKey = findHubKey(basename);
  if (hubKey) return { tier: 't2_hub', lang, hub: hubKey };

  if (/\/(product|produit|produkt|prodotto|producto|продукт|produkt|produto|产品)\//i.test(n)) {
    if (/filling|filler|灌装|rempliss|abfüll|napełn|llenad|розлив|enchiment/i.test(n)) {
      return { tier: 't2_filling', lang, hub: null };
    }
    if (/capping|capper|旋盖|capsule|verschließ|zakręc|tapon|укупор|tampad/i.test(n)) {
      return { tier: 't2_capping', lang, hub: null };
    }
    if (/label|贴标|étiquet|etikett|rotul|etykiet/i.test(n)) {
      return { tier: 't2_labeling', lang, hub: null };
    }
    if (/monoblock|monobloc|单体|моноблок/i.test(n)) {
      return { tier: 't2_monoblock', lang, hub: null };
    }
    if (/powder|粉末|poudre|pulver|pó\b|proszk/i.test(n)) {
      return { tier: 't2_powder', lang, hub: null };
    }
  }

  if (/monoblock|monobloc|单体|моноблок/i.test(n)) return { tier: 't2_monoblock', lang, hub: null };
  if (/capping|capper|旋盖|capsule|verschließ|zakręc|tapon|укупор|tampad|screw-capp|ropp-capp|vacuum-capp|spindle-capp|lug-capp|press-capp|tracking-capp|pick-and-capp/i.test(n)) {
    return { tier: 't2_capping', lang, hub: null };
  }
  if (/label|贴标|étiquet|etikett|rotul|etykiet/i.test(n)) return { tier: 't2_labeling', lang, hub: null };
  if (/powder|粉末|poudre|pulver|proszk|pó\b/i.test(n)) return { tier: 't2_powder', lang, hub: null };
  if (/filling|filler|灌装|rempliss|abfüll|napełn|llenad|розлив|enchiment|piston|overflow|gravity|pump-filling|gear-pump|hot-filling|drum-filling|tube-filling|pouch-filling|honey-bottle|lipstick-filling|deodorant-filling/i.test(n)) {
    return { tier: 't2_filling', lang, hub: null };
  }

  if (/bottling|solution|turnkey|装瓶|embouteill|abfülllös|envase|imbottigli|engarraf|розлив/i.test(n)) {
    return { tier: 't3_solution', lang, hub: null };
  }

  if (
    /\/(news|firm-news|industry-news|technology|exhibitions|nachrichten|nouvelles|notizie|noticias|wiadomosci|noticias|новости|技术|新闻|展览)\//i.test(n) ||
    /^(news|firm-news|industry-news|technology|exhibitions|nachrichten|nouvelles|notizie|noticias|wiadomosci|новости|技术|新闻|展览)/i.test(basename) ||
    /how-to-|guide-about|analysis-of|what-you-need|what-are-the|you-need-to-know|difference-between|showcase-|development-history|best-choice-for|unique-/i.test(basename)
  ) {
    return { tier: 't3_content', lang, hub: null };
  }

  return { tier: 't3_product', lang, hub: null };
}

function upsertMeta(html, name, content) {
  const re = new RegExp(`<meta\\s+name="${name}"\\s+content="[^"]*"\\s*/?>`, 'i');
  const tag = `<meta name="${name}" content="${escapeAttr(content)}" />`;
  if (re.test(html)) return html.replace(re, tag);
  const robots = html.match(/<meta\s+name="robots"[^>]*>/i);
  if (robots) return html.replace(robots[0], `${tag}\n\t${robots[0]}`);
  const desc = html.match(/<meta\s+name="description"[^>]*>/i);
  if (desc) return html.replace(desc[0], `${desc[0]}\n\t${tag}`);
  const title = html.match(/<title>[^<]*<\/title>/i);
  if (title) return html.replace(title[0], `${title[0]}\n\t${tag}`);
  return html;
}

function upsertTitle(html, title) {
  return html.replace(/<title>[^<]*<\/title>/i, `<title>${escapeAttr(title)}</title>`);
}

function upsertOg(html, prop, content) {
  const re = new RegExp(`<meta\\s+property="${prop}"\\s+content="[^"]*"\\s*/?>`, 'i');
  const tag = `<meta property="${prop}" content="${escapeAttr(content)}" />`;
  if (re.test(html)) return html.replace(re, tag);
  return html;
}

function upsertTwitter(html, name, content) {
  const re = new RegExp(`<meta\\s+name="${name}"\\s+content="[^"]*"\\s*/?>`, 'i');
  const tag = `<meta name="${name}" content="${escapeAttr(content)}" />`;
  if (re.test(html)) return html.replace(re, tag);
  return html;
}

function syncSocial(html, title, desc) {
  let out = html;
  if (/<meta\s+property="og:title"/i.test(out)) out = upsertOg(out, 'og:title', title);
  if (/<meta\s+property="og:description"/i.test(out)) out = upsertOg(out, 'og:description', desc);
  if (/<meta\s+name="twitter:title"/i.test(out)) out = upsertTwitter(out, 'twitter:title', title);
  if (/<meta\s+name="twitter:description"/i.test(out)) out = upsertTwitter(out, 'twitter:description', desc);
  return out;
}

function updateSchema(html, title, desc) {
  return html.replace(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi, (full, json) => {
    try {
      const data = JSON.parse(json.trim());
      const walk = (obj) => {
        if (!obj || typeof obj !== 'object') return;
        const t = obj['@type'];
        if (t === 'WebPage' || t === 'CollectionPage' || t === 'Article' || t === 'Product') {
          if (title) obj.name = title;
          if (desc) obj.description = desc;
        }
        if (t === 'Organization' || t === 'WebSite') {
          if (desc && t === 'Organization') obj.description = stripTitleSuffix(title || obj.description || '');
        }
        for (const v of Object.values(obj)) {
          if (Array.isArray(v)) v.forEach(walk);
          else if (v && typeof v === 'object') walk(v);
        }
      };
      if (Array.isArray(data['@graph'])) data['@graph'].forEach(walk);
      else walk(data);
      return full.replace(json, JSON.stringify(data));
    } catch {
      return full;
    }
  });
}

function buildKeywords(tierCfg, pageName, tier) {
  const base = [...(tierCfg.keywords || [])];
  if (tier.startsWith('t3') && pageName) {
    const words = pageName
      .toLowerCase()
      .replace(/[^a-z0-9\u4e00-\u9fff\s-]/gi, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 3 && !/machine|machines|equipment|kiwl/i.test(w))
      .slice(0, 3);
    for (const w of words) if (!base.some((k) => k.toLowerCase().includes(w))) base.push(w);
  }
  return [...new Set(base)].slice(0, 12).join(', ');
}

function buildTitle(pageName, brandSuffix, tier, hubKey, langCfg) {
  if (tier === 't1' && langCfg.tiers.t1.title) return langCfg.tiers.t1.title;
  if (tier === 't2_hub' && hubKey && langCfg.hubTitles?.[hubKey]) {
    return `${langCfg.hubTitles[hubKey]} | ${BRAND}`;
  }
  const clean = stripTitleSuffix(pageName);
  if (!clean) return brandSuffix;
  if (clean.toLowerCase() === 'home') {
    return langCfg.tiers.t1.title || `${clean} | ${BRAND}`;
  }
  return `${clean} | ${brandSuffix}`;
}

function buildDescription(tier, langCfg, pageName, existingDesc, hubKey) {
  if (tier === 't1') return langCfg.tiers.t1.description;
  if (tier === 't2_hub' && hubKey && langCfg.hubTitles?.[hubKey]) {
    const hub = langCfg.hubTitles[hubKey];
    const kw = langCfg.tiers.t2_hub.keywords.slice(0, 3).join(', ');
    return `${hub} – ${kw}. ${langCfg.brandSuffix}.`.slice(0, 160);
  }
  if (existingDesc && existingDesc.length >= 80) return existingDesc.slice(0, 160);
  const kw = langCfg.tiers[tier]?.keywords?.[0] || langCfg.tiers.t3_product.keywords[0];
  const clean = stripTitleSuffix(pageName);
  return `${clean} – ${kw}. ${langCfg.brandSuffix}.`.slice(0, 160);
}

function isHtmlPage(buf) {
  return buf.length >= 200 && /<!doctype html|<html/i.test(buf.slice(0, 800).toString());
}

function isRedirectStub(html, rel) {
  if (/^index[0-9a-f]{4}\.html$/i.test(path.basename(rel))) return true;
  if (html.length < 4000 && /Page has moved|META HTTP-EQUIV=["']Refresh["']/i.test(html)) return true;
  if (html.length < 2000 && /HTTrack Website Copier/i.test(html) && !/<meta name="description"/i.test(html)) {
    return true;
  }
  return false;
}

const tierLog = [];

function processPage(html, rel) {
  stats.scanned++;
  if (isRedirectStub(html, rel)) {
    stats.skipped++;
    return html;
  }

  const { tier, lang, hub } = classify(rel, html);
  if (tier === 'skip') {
    stats.skipped++;
    return html;
  }

  stats.byTier[tier] = (stats.byTier[tier] || 0) + 1;
  const langCfg = PYRAMID[lang] || PYRAMID.en;
  const tierCfg = langCfg.tiers[tier] || langCfg.tiers.t3_product;

  const oldTitle = (html.match(/<title>([^<]*)<\/title>/i) || [])[1]?.trim() || '';
  const oldDesc = decodeEntities(
    (html.match(/<meta\s+name="description"\s+content="([^"]*)"/i) || [])[1] || '',
  );
  const pageName = stripTitleSuffix(oldTitle);

  const newTitle = buildTitle(pageName, langCfg.brandSuffix, tier, hub, langCfg);
  const newDesc = buildDescription(tier, langCfg, pageName, oldDesc, hub);
  const keywords = buildKeywords(tierCfg, pageName, tier);

  let out = html;
  const before = out;

  out = upsertMeta(out, 'keywords', keywords);
  if (!/<meta\s+name="keywords"/i.test(before)) stats.keywordsAdded++;

  if (oldTitle !== newTitle) {
    out = upsertTitle(out, newTitle);
    stats.titleFixed++;
  }

  if (tier === 't1' || tier === 't2_hub' || !oldDesc || oldDesc.length < 60) {
    out = upsertMeta(out, 'description', newDesc);
    if (decodeEntities(newDesc) !== oldDesc) stats.descUpdated++;
  } else {
    // keep existing desc for t3 with good content
  }

  const finalDesc =
    tier === 't1' || tier === 't2_hub' || !oldDesc || oldDesc.length < 60
      ? newDesc
      : oldDesc;
  out = syncSocial(out, newTitle, finalDesc);
  out = updateSchema(out, newTitle, finalDesc);

  if (out !== before) {
    stats.modified++;
    tierLog.push({ rel, tier, lang, title: newTitle, keywords });
  }

  return out;
}

const files = [];
function walk(dir, rel = '') {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const fp = path.join(dir, ent.name);
    const r = rel ? `${rel}/${ent.name}` : ent.name;
    if (ent.isDirectory()) {
      if (SKIP_DIRS.has(ent.name)) continue;
      walk(fp, r);
    } else if (ent.name.endsWith('.html') && !ent.name.endsWith('.html.z')) {
      const buf = fs.readFileSync(fp);
      if (isHtmlPage(buf)) files.push(r);
    }
  }
}
walk(siteRoot);

for (const rel of files) {
  const fp = path.join(siteRoot, rel);
  const html = fs.readFileSync(fp, 'utf8');
  const out = processPage(html, rel);
  if (out !== html) fs.writeFileSync(fp, out, 'utf8');
}

// CSV log
const csv = ['tier,lang,path,title,keywords', ...tierLog.map((r) => {
  const esc = (s) => `"${(s || '').replace(/"/g, '""')}"`;
  return [r.tier, r.lang, r.rel, esc(r.title), esc(r.keywords)].join(',');
})];
fs.writeFileSync(path.join(siteRoot, '_keyword_pyramid_applied.csv'), csv.join('\n'), 'utf8');

const report = `# 全站关键词金字塔应用报告

生成时间: ${new Date().toISOString()}

## 金字塔结构

| 层级 | 定位 | 页面数 |
|------|------|--------|
| **T1** | 品牌核心词（各语言首页） | ${stats.byTier.t1 || 0} |
| **T2 Hub** | 栏目页（产品/解决方案/关于/联系等） | ${stats.byTier.t2_hub || 0} |
| **T2 Filling** | 灌装机品类 | ${stats.byTier.t2_filling || 0} |
| **T2 Capping** | 旋盖机品类 | ${stats.byTier.t2_capping || 0} |
| **T2 Labeling** | 贴标机品类 | ${stats.byTier.t2_labeling || 0} |
| **T2 Monoblock** | 单体机品类 | ${stats.byTier.t2_monoblock || 0} |
| **T2 Powder** | 粉末灌装机品类 | ${stats.byTier.t2_powder || 0} |
| **T3 Solution** | 行业解决方案长尾 | ${stats.byTier.t3_solution || 0} |
| **T3 Product** | 具体产品页 | ${stats.byTier.t3_product || 0} |
| **T3 Content** | 新闻/博客/技术文章 | ${stats.byTier.t3_content || 0} |

## 执行统计

| 指标 | 数值 |
|------|------|
| 扫描页面 | ${stats.scanned} |
| 跳过（noindex/跳转页） | ${stats.skipped} |
| 已修改 | ${stats.modified} |
| 新增 meta keywords | ${stats.keywordsAdded} |
| Title 统一后缀 | ${stats.titleFixed} |
| Description 更新 | ${stats.descUpdated} |

## 各语言 T1 核心词

${LANGS.map((l) => {
  const cfg = PYRAMID[l];
  return `### ${l.toUpperCase()}
- **Title:** ${cfg.tiers.t1.title}
- **Keywords:** ${cfg.tiers.t1.keywords.join(', ')}
- **Description:** ${cfg.tiers.t1.description.slice(0, 120)}…
`;
}).join('\n')}

## 配置文件

- 金字塔定义: \`_keyword_pyramid.config.mjs\`
- 应用明细: \`_keyword_pyramid_applied.csv\` (${tierLog.length} 条)
`;

fs.writeFileSync(path.join(siteRoot, '_keyword_pyramid_report.md'), report, 'utf8');
console.log(report);
console.log('\nDone. Modified', stats.modified, 'pages.');
