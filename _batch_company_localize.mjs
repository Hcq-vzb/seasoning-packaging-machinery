/**
 * 全站公司名 + 地域名本地化替换（9语言 HTML）
 * 按语言目录隔离；先完整公司名 → 地域名 → 短称
 * 保护 href/src/url 等路径不被修改
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const siteRoot = path.dirname(fileURLToPath(import.meta.url));
const SKIP_DIRS = new Set(['node_modules', 'cache', '.vs', '.git']);

const COMPANY_TARGET = {
  zh: '江苏鑫紫鲸机械制造集团有限公司',
  en: 'Jiangsu KIWL Machinery Manufacturing Group Co., Ltd',
  fr: 'Jiangsu KIWL Groupe de Fabrication de Machines Co., Ltd',
  de: 'Jiangsu KIWL Maschinenbau-Gruppe Co., Ltd',
  it: 'Jiangsu KIWL Gruppo di Fabbricazione di Macchinari Co., Ltd',
  es: 'Jiangsu KIWL Grupo de Fabricación de Maquinaria Co., Ltd',
  ru: 'Jiangsu KIWL Группа Производства Машин Co., Ltd',
  pl: 'Jiangsu KIWL Grupa Produkcji Maszyn Co., Ltd',
  pt: 'Jiangsu KIWL Grupo de Fabricação de Máquinas Co., Ltd',
};

const report = {
  filesChanged: 0,
  byLang: {},
  totalReplacements: 0,
};

function getLang(fp) {
  const rel = path.relative(siteRoot, fp).replace(/\\/g, '/');
  const base = path.basename(rel, '.html').replace(/\.html.*$/, '');
  const rootLang = { zh: 1, de: 1, fr: 1, es: 1, it: 1, ru: 1, pl: 1, pt: 1 };
  if (rootLang[base] && !rel.includes('/')) return base;
  const m = rel.match(/^(zh|de|fr|es|it|ru|pl|pt)\//);
  if (m) return m[1];
  return 'en';
}

function isProtectedValue(val) {
  if (!val) return false;
  if (/^https?:\/\//i.test(val) || val.includes('://')) return true;
  if (/^www\./i.test(val)) return true;
  if (/npackpm|shanghainpack|npackchina|npack\.en\.|directindustry\.com/i.test(val)) return true;
  if (/shanghai-[a-z0-9-]+|swop-shanghai|shanghainpack/i.test(val)) return true;
  if (/上海[^"']*\.html/.test(val)) return true;
  // 仅保护像路径/资源的字符串，避免误保护正文里的 "app/wechat" 等
  if (/[\\/]/.test(val)) {
    if (/\.(html?|pdf|webp|png|jpe?g|gif|svg|css|js|json|xml|woff2?|ttf|eot|z)(\?|#|$)/i.test(val)) return true;
    if (/wp-content|wp-json|wp-admin|uploads\//i.test(val)) return true;
    if (/^(?:\.\.?\/|\/)[^"'\s]+/.test(val)) return true;
  }
  if (/\.(html?|pdf|webp|png|jpe?g|gif|svg|css|js|json|xml|woff2?|ttf|eot|z)(\?|#|$)/i.test(val) && !/\s/.test(val)) return true;
  return false;
}

function maskProtectedSegments(text) {
  const tokens = [];
  const mask = (segment) => {
    const id = tokens.length;
    tokens.push(segment);
    return `\x00LOCMASK${id}\x00`;
  };

  text = text.replace(/https?:\/\/[^\s"'<>]+/gi, (m) => mask(m));

  text = text.replace(
    /(\s(?:href|src|content|action|poster|data-[\w-]+)\s*=\s*)(["'])([\s\S]*?)\2/gi,
    (full, pre, q, val) => {
      if (isProtectedValue(val)) return pre + q + mask(val) + q;
      return full;
    },
  );

  text = text.replace(/url\(\s*(['"]?)([^'")]+)\1\s*\)/gi, (full, q, val) => {
    if (isProtectedValue(val)) return `url(${q}${mask(val)}${q})`;
    return full;
  });

  // 锚点/文件名 slug（含 shanghai-npack 等）
  text = text.replace(
    /(anchor|@id|mainEntityOfPage|url|content)("\\?:\\?\/\\?\/[^"\\]*|":\\?"|":'|=")([^"'#]*shanghai[a-z0-9-]*)/gi,
    (full, attr, pre, slug) => {
      if (/\.html|#|shanghai-npack|shanghai-kiwl/i.test(slug)) return full.replace(slug, mask(slug));
      return full;
    },
  );
  text = text.replace(/([#"'])([a-z0-9-]*shanghai[a-z0-9-]*)(\.html[#"']?)/gi, (full, q1, slug, tail) => mask(q1 + slug + tail));

  text = text.replace(/\b(npackHeroKenBurnsIn|npack-hero-slideshow|npackpm-lang-switcher|NPACKPM_LANG)\b/g, (m) => mask(m));

  return { text, tokens };
}

function unmask(text, tokens) {
  return text.replace(/\x00LOCMASK(\d+)\x00/g, (_, i) => tokens[+i] ?? '');
}

function countReplace(text, pattern, replacement) {
  let n = 0;
  const out = text.replace(pattern, (...args) => {
    n++;
    return typeof replacement === 'function' ? replacement(...args) : replacement;
  });
  return { text: out, n };
}

function applyReplacements(text, lang) {
  const target = COMPANY_TARGET[lang];
  let total = 0;

  if (lang === 'zh') {
    const strings = [
      '上海置泉自动化设备有限公司',
      '上海Npack',
      '上海KIWL',
      '江苏KIWL',
      '上海置泉',
    ];
    for (const s of strings) {
      const parts = text.split(s);
      if (parts.length > 1) {
        total += parts.length - 1;
        text = parts.join(target);
      }
    }
    const enCo =
      /Shanghai\s+(?:Npack|KIWL|kiwl|NPACK)\s+Automation\s+Equipment\s+Co\.?\s*,?\s*ltd\.?/gi;
    const r1 = countReplace(text, enCo, target);
    text = r1.text;
    total += r1.n;
    const r2 = countReplace(text, /上海/g, '江苏');
    text = r2.text;
    total += r2.n;
    return { text, total };
  }

  if (lang === 'ru') {
    const ruStrings = [
      'Шанхайская компания с ограниченной ответственностью «Энпак Автомэйшн Иквипмент»',
      'ООО «Шанхай KIWL Автоматизация Оборудования»',
      'Шанхайская компания KIWL',
      'Шанхайская компания Npack',
      'Шанхайская компания kiwl',
    ];
    for (const s of ruStrings) {
      const parts = text.split(s);
      if (parts.length > 1) {
        total += parts.length - 1;
        text = parts.join(target);
      }
    }
  }

  // 通用英文公司名（各语言目录内）
  const companyRegexes = [
    /Shanghai\s+(?:Npack|KIWL|kiwl|NPACK)\s+Automation\s+Equipment\s+Co\.?\s*,?\s*Ltd\.?(?:\s+Sp\.\s+z\s+o\.o\.)?/gi,
    /Shanghai\s+(?:Npack|KIWL|kiwl|NPACK)\s+Automation\s+Equipment\s+Co\s*,\s*ltd/gi,
    /Shanghai\s+(?:Npack|KIWL|kiwl|NPACK)\s+Automation\s+Equipment\s+Co\.?,ltd/gi,
    /\{Shanghai\s+(?:Npack|KIWL|kiwl)\}/gi,
    /Shanghai\s+(?:Npack|KIWL|kiwl)\s+Automation\s+Equipment/gi,
  ];
  for (const re of companyRegexes) {
    const r = countReplace(text, re, (m) => {
      if (m.startsWith('{')) return `{${target}}`;
      return target;
    });
    text = r.text;
    total += r.n;
  }

  // 短公司引用 Shanghai KIWL / Shanghai Npack（非完整法定名）
  const shortCo = /\bShanghai\s+(?:KIWL|Npack|kiwl|NPACK)\b/g;
  const rShort = countReplace(text, shortCo, target);
  text = rShort.text;
  total += rShort.n;

  // 历史叙述 "... in Shanghai in 2012" 等地域名
  if (lang !== 'zh') {
    const rIn = countReplace(text, /\bin Shanghai\b/g, 'in Jiangsu');
    text = rIn.text;
    total += rIn.n;
  }

  // 地域名
  const geoRules = {
    en: [[/\bShanghai\b/g, 'Jiangsu']],
    fr: [[/\bShanghai\b/g, 'Jiangsu']],
    de: [[/\bShanghai\b/g, 'Jiangsu']],
    it: [[/\bShanghai\b/g, 'Jiangsu']],
    es: [[/\bShanghai\b/g, 'Jiangsu']],
    ru: [
      [/\bShanghai\b/g, 'Jiangsu'],
      [/Шанхай/g, 'Jiangsu'],
    ],
    pl: [
      [/\bShanghai\b/g, 'Jiangsu'],
      [/\bSzanghaj\b/g, 'Jiangsu'],
      [/\bSZANGHAJ\b/g, 'JIANGSU'],
    ],
    pt: [
      [/\bShanghai\b/g, 'Jiangsu'],
      [/\bXangai\b/g, 'Jiangsu'],
      [/\bxangai\b/g, 'Jiangsu'],
    ],
  };
  for (const [re, rep] of geoRules[lang] ?? []) {
    const r = countReplace(text, re, rep);
    text = r.text;
    total += r.n;
  }

  return { text, total };
}

function isValidHtml(buf) {
  return buf.length > 200 && !(buf[0] === 0x1f && buf[1] === 0x8b) && /<!doctype html|<html/i.test(buf.slice(0, 800).toString('utf8'));
}

function processFile(fp) {
  const buf = fs.readFileSync(fp);
  if (!isValidHtml(buf)) return;
  const raw = buf.toString('utf8');
  const lang = getLang(fp);
  const { text: masked, tokens } = maskProtectedSegments(raw);
  const { text: transformed, total } = applyReplacements(masked, lang);
  const text = unmask(transformed, tokens);
  if (text === raw) return;

  fs.writeFileSync(fp, text, 'utf8');
  report.filesChanged++;
  report.byLang[lang] = (report.byLang[lang] ?? 0) + 1;
  report.totalReplacements += total;
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
const verify = { badPaths: [], leftovers: [] };

function verifyFile(fp) {
  const html = fs.readFileSync(fp, 'utf8');
  const rel = path.relative(siteRoot, fp).replace(/\\/g, '/');
  const lang = getLang(fp);

  for (const m of html.matchAll(/\b(?:href|src)=(["'])([^"']*)\1/gi)) {
    if (/jiangsu[a-z-]*\.html/i.test(m[2]) && !/npack/i.test(m[2])) {
      verify.badPaths.push(`${rel}: ${m[2]}`);
    }
  }

  if (lang === 'zh') {
    if (/上海(?!恩派克)/.test(html.replace(/href=(["'])[^"']*\1/g, '').replace(/src=(["'])[^"']*\1/g, ''))) {
      if (/上海/.test(html) && !/上海恩派克[^<]*\.html/.test(html)) {
        const stripped = html.replace(/\b(?:href|src)=(["'])[^"']*\1/gi, '');
        if (/上海/.test(stripped)) verify.leftovers.push(`${rel}: 上海`);
      }
    }
    if (/上海KIWL|上海Npack|上海置泉/.test(html)) verify.leftovers.push(`${rel}: zh company`);
  } else {
    const target = COMPANY_TARGET[lang];
    const stripped = html
      .replace(/https?:\/\/[^\s"'<>]+/gi, '')
      .replace(/\b(?:href|src|content)=(["'])[^"']*\1/gi, '');
    if (/Shanghai\s+(?:KIWL|Npack|kiwl)\s+Automation/i.test(stripped)) {
      verify.leftovers.push(`${rel}: en company`);
    }
    if (lang === 'ru' && /Шанхайская компания\s+KIWL|Шанхай KIWL Автоматизация/i.test(stripped)) {
      verify.leftovers.push(`${rel}: ru company`);
    }
  }
}

function verifyWalk(d) {
  for (const ent of fs.readdirSync(d, { withFileTypes: true })) {
    const f = path.join(d, ent.name);
    if (ent.isDirectory()) {
      if (SKIP_DIRS.has(ent.name)) continue;
      if (ent.name === 'wp-content' && d === siteRoot) continue;
      verifyWalk(f);
    } else if (ent.name.endsWith('.html')) verifyFile(f);
  }
}
verifyWalk(siteRoot);

function spot(rel) {
  const fp = path.join(siteRoot, rel);
  if (!fs.existsSync(fp)) return `${rel}: missing`;
  const h = fs.readFileSync(fp, 'utf8');
  const title = h.match(/<title>([^<]*)<\/title>/i)?.[1] ?? '';
  const h1 = h.match(/<h1[^>]*>([^<]*)<\/h1>/i)?.[1]?.trim() ?? '';
  const badHref = /\bhref=(["'])[^"']*jiangsu[^"']*\.html\1/i.test(h);
  return `${rel}\n  title: ${title.slice(0, 70)}\n  h1: ${h1.slice(0, 90)}\n  bad href: ${badHref}`;
}

const spots = [
  'zh/index.html',
  'index.html',
  'fr/index.html',
  'de/index.html',
  'es/index.html',
  'vacuum-capping-machine.html',
  'shanghai-npack-shines-at-propak-china-2025.html',
].map(spot).join('\n\n');

const out = `公司名+地域名本地化替换报告
时间: ${new Date().toISOString()}
修改文件数: ${report.filesChanged}
总替换次数(约): ${report.totalReplacements}
按语言: ${JSON.stringify(report.byLang)}

路径破坏: ${verify.badPaths.length}
${verify.badPaths.slice(0, 10).join('\n') || '无'}

残留: ${verify.leftovers.length}
${verify.leftovers.slice(0, 25).join('\n') || '无'}

抽样:
${spots}
`;

fs.writeFileSync(path.join(siteRoot, 'company_localize_report.txt'), out, 'utf8');
console.log(out);
