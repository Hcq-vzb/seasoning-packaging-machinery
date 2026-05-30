import fs from 'fs';
import path from 'path';

const root = path.resolve('c:/My Websites/baoz/www.npackpm.com');
const LANGS = ['de', 'fr', 'es', 'it', 'pl', 'pt', 'zh', 'ru'];
const MARKERS = {
  de: [/ZU HAUSE/i, /ÜBER UNS/i, /lang="de/i],
  fr: [/ACCUEIL/i, /À PROPOS|A PROPOS|a-propos/i, /lang="fr/i],
  es: [/INICIO|SOBRE/i, /lang="es/i],
  it: [/CHI SIAMO|HOME/i, /lang="it/i],
  pl: [/DO DOMU/i, /O NAS/i, /lang="pl/i],
  pt: [/INÍCIO|INICIO|SOBRE/i, /lang="pt/i],
  zh: [/lang="zh|首页|关于/i],
  ru: [/Главная|ГЛАВНАЯ|О НАС/i, /lang="ru/i],
};

function cyrillicRatio(s) {
  const cyr = (s.match(/[\u0400-\u04FF]/g) || []).length;
  const letters = (s.match(/[a-zA-Z\u0400-\u04FF\u4e00-\u9fff]/g) || []).length;
  return letters ? cyr / letters : 0;
}

function walk(lang, cb) {
  const lp = path.join(root, lang);
  function w(d) {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const f = path.join(d, e.name);
      if (e.isDirectory() && e.name !== 'wp-json') w(f);
      else if (e.name.endsWith('.html')) cb(f);
    }
  }
  w(lp);
}

const report = {};
for (const lang of LANGS) {
  report[lang] = { total: 0, highCyrillic: [], wrongLang: [], ruLinks: 0, brokenSwitcher: 0 };
}

for (const lang of LANGS) {
  if (lang === 'ru') continue;
  walk(lang, (f) => {
    report[lang].total++;
    const html = fs.readFileSync(f, 'utf8').slice(0, 80000);
    const rel = path.relative(root, f).replace(/\\/g, '/');
    const ratio = cyrillicRatio(html);
    if (ratio > 0.15) report[lang].highCyrillic.push({ rel, ratio: ratio.toFixed(2) });
    const markers = MARKERS[lang];
    const ok = markers.some((re) => re.test(html));
    if (!ok && ratio > 0.05) report[lang].wrongLang.push(rel);
    const ruLinks = (html.match(/href=["'][^"']*\/ru\//gi) || []).length;
    report[lang].ruLinks += ruLinks;
    // switcher: lang menu pointing to index.html for other langs (broken)
    const badSw = (html.match(/ct-language[\s\S]{0,2000}?href=["']index\.html["'][^>]*aria-label="(?!.*Polski|.*Deutsch|.*English|.*Angielski)/gi) || []).length;
    report[lang].brokenSwitcher += badSw;
  });
}

for (const lang of LANGS) {
  const r = report[lang];
  console.log(`\n=== ${lang} === total ${r.total}`);
  console.log(`  high Cyrillic files: ${r.highCyrillic.length}`);
  if (r.highCyrillic.length) console.log('   ', r.highCyrillic.slice(0, 8).map((x) => x.rel).join(', '));
  console.log(`  wrongLang sample: ${r.wrongLang.length}`);
  console.log(`  /ru/ href count: ${r.ruLinks}`);
}
