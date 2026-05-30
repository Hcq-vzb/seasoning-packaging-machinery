/**
 * Update core slogans per language across meta tags, JSON-LD, hero text, and footer.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const siteRoot = path.dirname(fileURLToPath(import.meta.url));
const SKIP_DIRS = new Set(['node_modules', 'cache', '.vs', '.git']);
const LANG_DIRS = ['zh', 'fr', 'de', 'it', 'es', 'ru', 'pl', 'pt'];

const SLOGANS = {
  en: 'KIWL Jiangsu - One Stop Solution for Liquid Bottling; Turnkey Projects for Daily Chemical, Cosmetics, Food Sauce & Oil Industries. Leading Manufacturer of Liquid Filling Machines and Bottle Cappers',
  zh: '江苏鑫紫鲸机械制造集团 - 液体装瓶一站式解决方案；日用化工、化妆品、食品调味品及油脂行业交钥匙工程。液体灌装机和瓶子封盖机制造领域的领先企业',
  fr: "KIWL Jiangsu - Solution complète pour l'embouteillage de liquides ; Projets clé en main pour les industries chimique, cosmétique, sauces alimentaires et huiles. Fabricant leader de machines de remplissage de liquides et de bouchonneuses",
  de: 'KIWL Jiangsu - All-in-One-Lösung für die Flüssigkeitsabfüllung; Schlüsselfertige Projekte für die chemische, kosmetische, Lebensmittel- und Ölindustrie. Führender Hersteller von Flüssigkeitsfüllmaschinen und Flaschenverschließmaschinen',
  it: "KIWL Jiangsu - Soluzione integrata per l'imbottigliamento di liquidi; Progetti chiavi in mano per l'industria chimica, cosmetica, delle salse alimentari e degli oli. Produttore leader di macchine per il riempimento di liquidi e tappatrici",
  es: 'KIWL Jiangsu - Solución integral para el embotellado de líquidos; Proyectos llave en mano para las industrias química, cosmética, de salsas alimentarias y aceites. Fabricante líder de máquinas de llenado de líquidos y taponadoras',
  ru: 'KIWL Jiangsu - Единое решение для розлива жидкостей; Проекты «под ключ» для химической, косметической, пищевой и масляной промышленности. Ведущий производитель машин для розлива жидкостей и укупорочных машин',
  pl: 'KIWL Jiangsu - Kompleksowe rozwiązanie do butelkowania płynów; Projekty «pod klucz» dla przemysłu chemicznego, kosmetycznego, spożywczego i olejarskiego. Wiodący producent maszyn do napełniania płynów i zakręcarek',
  pt: 'KIWL Jiangsu - Solução completa para o engarrafamento de líquidos; Projetos chave-na-mão para as indústrias química, cosmética, de molhos alimentares e óleos. Fabricante líder de máquinas de enchimento de líquidos e tampadoras',
};

const OLD_BY_LANG = {
  en: [
    'One Stop Solution for liquid bottling; Turnkey project for Daily Chemical, Cosmetics, Food Sauce and Oils industries. Leaders in Manufacturing Filler and capper',
    'One Stop Packaging Solution for liquid bottling;Turnkey projects for Daily Chemicals, Cosmetics,Food Sauce and Oils industries. Leaders in Manufacturing Liquid Filler and capper since 2015. OEM/ODM and Partners are welcome',
  ],
  zh: [
    '液体装瓶的一站式解决方案；日用化工、化妆品、食品调味品和油脂行业的交钥匙工程。灌装机和封盖机制造领域的领导者',
    '专注于液体瓶装的一站式包装解决方案；为日化、化妆品、食品酱料及油脂行业提供整线交钥匙工程。自2015年起，始终是液体灌装与旋盖设备制造领域的领导者。诚邀OEM/ODM合作与伙伴加盟。',
  ],
  fr: [
    "Solution unique pour l'embouteillage de liquides ; projet clé en main pour les industries quotidiennes de la chimie, des cosmétiques, des sauces alimentaires et des huiles. Leaders dans la fabrication de remplisseuses et de bouchonneuses",
    "Solution d'emballage clé en main pour le conditionnement de liquides ; projets clés en main pour les industries des détergents, cosmétiques, sauces alimentaires et huiles. Leader dans la fabrication de remplisseuses et de boucheuses liquides depuis 2015. Services OEM/ODM et partenariats sont les bienvenus.",
  ],
  de: [
    'One Stop Solution für die Abfüllung von Flüssigkeiten; schlüsselfertige Projekte für die chemische, kosmetische, Lebensmittel- und Ölindustrie. Führend in der Herstellung von Abfüllern und Verschließern',
    'All-in-One-Verpackungslösung für das Abfüllen von Flüssigkeiten; Schlüsselfertige Projekte für die Branchen der Körperpflegemittel, Kosmetika, Lebensmittelsaucen und Öle. Führender Hersteller von Flüssigkeits-Abfüll- und Verschließmaschinen seit 2015. OEM/ODM und Partnerschaften sind willkommen.',
  ],
  it: [
    'Soluzione One Stop per l\'imbottigliamento di liquidi; progetto "chiavi in mano" per l\'industria chimica, cosmetica, delle salse alimentari e degli oli. Leader nella produzione di riempitrici e tappatori',
    "Soluzione di imballaggio completa per l'imbottigliamento di liquidi; progetti chiavi in mano per le industrie di prodotti chimici per la casa, cosmetici, salse alimentari e oli. Leader nella produzione di riempitrici e tappatrici per liquidi dal 2015. Siamo aperti a servizi OEM/ODM e partnership.",
  ],
  es: [
    'Solución integral para el embotellado de líquidos; proyecto llave en mano para las industrias química, cosmética, de salsas alimentarias y aceites. Líderes en la fabricación de llenadoras y taponadoras',
    'Solución de envasado integral para el embotellado de líquidos; proyectos llave en mano para las industrias de químicos para el hogar, cosméticos, salsas alimenticias y aceites. Líder en la fabricación de llenadoras y tapadoras de líquidos desde 2015. Son bienvenidos los servicios OEM/ODM y las asociaciones.',
  ],
  ru: [
    'Единое решение для розлива жидкостей; проект "под ключ" для химической, косметической, пищевой и масляной промышленности. Лидеры в производстве розлива и укупорки',
    'Комплексное упаковочное решение для розлива жидкостей; реализация проектов «под ключ» для отраслей бытовой химии, косметики, пищевых соусов и масел. Ведущий производитель розливных и укупорочных машин с 2015 года. Приветствуем сотрудничество по схемам OEM/ODM и партнерские отношения.',
  ],
  pl: [
    'Kompleksowe rozwiązanie do butelkowania płynów; projekt "pod klucz" dla przemysłu chemicznego, kosmetycznego, spożywczego i olejarskiego. Liderzy w produkcji napełniarek i zakręcarek',
    'Kompleksowe rozwiązanie w zakresie pakowania do rozlewu cieczy; projekty „pod klucz” dla branży chemii gospodarczej, kosmetyków, sosów spożywczych i olejów. Lider w produkcji napełniarek i zamykarek do cieczy od 2015 roku. Zapraszamy do współpracy OEM/ODM i partnerskiej.',
  ],
  pt: [
    'Solução única para o engarrafamento de líquidos; projeto chave-na-mão para as indústrias de produtos químicos diários, cosméticos, molhos alimentares e óleos. Líderes no fabrico de enchedoras e tampadoras',
    'Solução de Embalagem Completa para Envase de Líquidos; Projetos Chave na Mão para as Indústrias de Químicos Domésticos, Cosméticos, Molhos Alimentares e Óleos. Líder na Fabricação de Enchedoras e Taponadoras de Líquidos desde 2015. Serviços OEM/ODM e Parcerias são bem-vindos.',
  ],
};

// HTML-encoded meta variants found in exported pages
const OLD_HTML_ENCODED = {
  fr: [
    'Solution unique pour l&#039;embouteillage de liquides ; projet clé en main pour les industries quotidiennes de la chimie, des cosmétiques, des sauces alimentaires et des huiles. Leaders dans la fabrication de remplisseuses et de bouchonneuses',
  ],
  it: [
    'Soluzione One Stop per l&#039;imbottigliamento di liquidi; progetto &quot;chiavi in mano&quot; per l&#039;industria chimica, cosmetica, delle salse alimentari e degli oli. Leader nella produzione di riempitrici e tappatori',
  ],
  pl: [
    'Kompleksowe rozwiązanie do butelkowania płynów; projekt &quot;pod klucz&quot; dla przemysłu chemicznego, kosmetycznego, spożywczego i olejarskiego. Liderzy w produkcji napełniarek i zakręcarek',
  ],
  ru: [
    'Единое решение для розлива жидкостей; проект &quot;под ключ&quot; для химической, косметической, пищевой и масляной промышленности. Лидеры в производстве розлива и укупорки',
  ],
};

function htmlAttrEncode(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function jsonStringEncode(s) {
  return JSON.stringify(s).slice(1, -1);
}

function detectLang(rel) {
  const norm = rel.replace(/\\/g, '/');
  const parts = norm.split('/');
  if (parts.length > 1 && LANG_DIRS.includes(parts[0])) return parts[0];
  const base = parts[parts.length - 1].replace('.html', '');
  if (LANG_DIRS.includes(base)) return base;
  return 'en';
}

function buildReplacements(lang) {
  const slogan = SLOGANS[lang];
  const pairs = [];
  const seen = new Set();

  const add = (from, to) => {
    if (!from || from === to || seen.has(from)) return;
    seen.add(from);
    pairs.push([from, to]);
  };

  for (const old of OLD_BY_LANG[lang] || []) {
    add(old, slogan);
    add(htmlAttrEncode(old), htmlAttrEncode(slogan));
    add(jsonStringEncode(old), jsonStringEncode(slogan));
  }
  for (const old of OLD_HTML_ENCODED[lang] || []) {
    add(old, htmlAttrEncode(slogan));
  }

  // Non-EN pages sometimes still carry the EN footer blurb.
  if (lang !== 'en') {
    for (const old of OLD_BY_LANG.en) add(old, slogan);
  }

  return pairs;
}

const report = { scanned: 0, updated: 0, byLang: {} };

function processFile(fp, rel) {
  const buf = fs.readFileSync(fp);
  if (buf.length < 200 || !/<!doctype html|<html/i.test(buf.slice(0, 800).toString())) return;
  report.scanned++;

  const lang = detectLang(rel);
  let html = buf.toString('utf8');
  const original = html;
  let count = 0;

  for (const [from, to] of buildReplacements(lang)) {
    if (!html.includes(from)) continue;
    const parts = html.split(from);
    count += parts.length - 1;
    html = parts.join(to);
  }

  if (html !== original) {
    fs.writeFileSync(fp, html, 'utf8');
    report.updated++;
    report.byLang[lang] = (report.byLang[lang] || 0) + 1;
  }
}

function walk(dir, rel = '') {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const fp = path.join(dir, ent.name);
    const r = rel ? `${rel}/${ent.name}` : ent.name;
    if (ent.isDirectory()) {
      if (SKIP_DIRS.has(ent.name)) continue;
      if (ent.name === 'wp-content' && dir === siteRoot) continue;
      walk(fp, r);
    } else if (ent.name.endsWith('.html') && !ent.name.endsWith('.html.z')) {
      processFile(fp, r);
    }
  }
}

walk(siteRoot);

const homeChecks = [
  ['en', 'index.html'],
  ['zh', 'zh/index.html'],
  ['fr', 'fr/index.html'],
  ['de', 'de/index.html'],
  ['it', 'it/index.html'],
  ['es', 'es/index.html'],
  ['ru', 'ru/index.html'],
  ['pl', 'pl/index.html'],
  ['pt', 'pt/index.html'],
];

const samples = homeChecks.map(([lang, rel]) => {
  const fp = path.join(siteRoot, rel);
  const html = fs.readFileSync(fp, 'utf8');
  const desc = (html.match(/<meta name="description" content="([^"]*)"/) || [])[1] || '';
  const hasOld = (OLD_BY_LANG[lang] || []).some((o) => html.includes(o) || html.includes(htmlAttrEncode(o)));
  const hasNew = html.includes(SLOGANS[lang].slice(0, 30));
  return `${lang.toUpperCase()} ${rel}: new=${hasNew} oldLeft=${hasOld} desc=${desc.slice(0, 80)}…`;
}).join('\n');

const out = `核心 Slogan 更新报告
时间: ${new Date().toISOString()}
扫描: ${report.scanned}
更新: ${report.updated}
按语言: ${JSON.stringify(report.byLang)}

各语言新 Slogan:
${Object.entries(SLOGANS).map(([l, s]) => `${l.toUpperCase()}: ${s}`).join('\n')}

首页验证:
${samples}
`;

fs.writeFileSync(path.join(siteRoot, '_update_slogans_report.txt'), out, 'utf8');
console.log(out);
