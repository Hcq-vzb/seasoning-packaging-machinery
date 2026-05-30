import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const siteRoot = path.dirname(fileURLToPath(import.meta.url));
const LANG_DIRS = new Set(['zh', 'pl', 'de', 'fr', 'es', 'it', 'ru', 'pt']);
const SKIP = new Set(['wp-content', 'wp-json', 'node_modules']);
const FOOTER_IDS = { '3970': 'factory', '3969': 'customer', '3968': 'certification', '3971': 'team' };
const issues = [];

const LANG_MAP = {
  en: {
    factory: 'about-us/npack-factory.html',
    customer: 'about-us/npack-customer.html',
    certification: 'about-us/npack-certification.html',
    team: 'about-us/npack-team.html',
  },
  zh: {
    factory: '关于我们/npack-工厂.html',
    customer: '关于我们/客户.html',
    certification: '关于我们/npack-认证.html',
    team: '关于我们/npack-团队.html',
  },
  pl: {
    factory: 'o-nas/npack-factory.html',
    customer: 'o-nas/klient-npack.html',
    certification: 'o-nas/certyfikacja-npack.html',
    team: 'o-nas/zespol-npack.html',
  },
  de: {
    factory: 'uber-uns/npack-werk.html',
    customer: 'uber-uns/npack-kunde.html',
    certification: 'uber-uns/npack-zertifizierung.html',
    team: 'uber-uns/npack-team.html',
  },
  fr: {
    factory: 'a-propos-de-nous/usine-npack.html',
    customer: 'a-propos-de-nous/client-npack.html',
    certification: 'a-propos-de-nous/certification-npack.html',
    team: 'a-propos-de-nous/lequipe-npack.html',
  },
  es: {
    factory: 'acerca-de-nosotros/fabrica-npack.html',
    customer: 'acerca-de-nosotros/npack-cliente.html',
    certification: 'acerca-de-nosotros/certificacion-npack.html',
    team: 'acerca-de-nosotros/equipo-npack.html',
  },
  it: {
    factory: 'chi-siamo/fabbrica-npack.html',
    customer: 'chi-siamo/cliente-npack.html',
    certification: 'chi-siamo/certificazione-npack.html',
    team: 'chi-siamo/team-npack.html',
  },
  ru: {
    factory: 'о-нас/завод-npack.html',
    customer: 'о-нас/клиент-npack.html',
    certification: 'о-нас/сертификация-npack.html',
    team: 'о-нас/команда-npack.html',
  },
  pt: {
    factory: 'sobre-nos/fabrica-npack.html',
    customer: 'sobre-nos/cliente-npack.html',
    certification: 'sobre-nos/certificacao-npack.html',
    team: 'sobre-nos/equipa-npack.html',
  },
};

function relHref(fromFile, targetRel, langRoot) {
  let rel = path.relative(path.dirname(fromFile), path.join(langRoot, targetRel)).replace(/\\/g, '/');
  if (rel.startsWith('./')) rel = rel.slice(2);
  return rel;
}

function walk(d, lang) {
  const langRoot = lang === 'en' ? siteRoot : path.join(siteRoot, lang);
  const cfg = LANG_MAP[lang];
  for (const ent of fs.readdirSync(d, { withFileTypes: true })) {
    const f = path.join(d, ent.name);
    if (ent.isDirectory()) {
      if (SKIP.has(ent.name)) continue;
      walk(f, lang);
    } else if (ent.name.endsWith('.html') && !/-[2-9]\.html$/i.test(ent.name)) {
      const buf = fs.readFileSync(f);
      if (buf.length < 2000) continue;
      const html = buf.toString('utf8');
      const rel = path.relative(siteRoot, f).replace(/\\/g, '/');
      for (const [id, key] of Object.entries(FOOTER_IDS)) {
        const re = new RegExp(`id="menu-item-${id}"[^>]*>\\s*<a\\s+[^>]*href=(["'])([^"']+)\\1`, 'gi');
        let m;
        while ((m = re.exec(html))) {
          const href = m[2];
          if (/^(https?:|#|mailto:)/i.test(href)) continue;
          const expected = relHref(f, cfg[key], langRoot);
          const resolved = path.normalize(path.join(path.dirname(f), href));
          if (!fs.existsSync(resolved)) {
            issues.push({ rel, id, href, expected, type: '404' });
          }
          if (lang !== 'en' && /about-us\/npack-/i.test(href)) {
            issues.push({ rel, id, href, type: 'cross-lang' });
          }
          if (/\/index\.html$/i.test(href) && /npack-|工厂|客户|认证|团队|usine|client|fabbrica|werk|kunde/i.test(href)) {
            issues.push({ rel, id, href, type: 'folder-index' });
          }
        }
      }
    }
  }
}

walk(siteRoot, 'en');
for (const lang of LANG_DIRS) walk(path.join(siteRoot, lang), lang);

console.log(`全站页脚 href 扫描: ${issues.length} 问题`);
for (const i of issues.slice(0, 30)) console.log(JSON.stringify(i));
