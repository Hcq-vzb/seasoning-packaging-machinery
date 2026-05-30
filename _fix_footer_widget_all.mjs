/**
 * 全站页脚 Overview 菜单（Product/Contact/About + 四大页）路径与 HTML 修复
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const siteRoot = path.dirname(fileURLToPath(import.meta.url));
const SKIP = new Set(['wp-content', 'wp-json', 'node_modules']);
const FOOTER_MENU_IDS = ['3965', '3966', '3967', '3968', '3969', '3970', '3971'];

const LANG_MAP = {
  en: {
    product: { rel: 'product.html', label: 'Product' },
    contact: { rel: 'contact.html', label: 'Contact' },
    about: { rel: 'about-us.html', label: 'About Us' },
    factory: { rel: 'about-us/npack-factory.html', label: 'Npack Factory' },
    customer: { rel: 'about-us/npack-customer.html', label: 'Npack Customer' },
    certification: { rel: 'about-us/npack-certification.html', label: 'Npack Certification' },
    team: { rel: 'about-us/npack-team.html', label: 'Npack Team' },
    idMap: { '3965': 'product', '3966': 'contact', '3967': 'about', '3970': 'factory', '3969': 'customer', '3968': 'certification', '3971': 'team' },
  },
  zh: {
    product: { rel: '产品.html', label: '产品中心' },
    contact: { rel: '联系.html', label: '联系我们' },
    about: { rel: '关于我们.html', label: '关于我们' },
    factory: { rel: '关于我们/npack-工厂.html', label: 'Npack 工厂' },
    customer: { rel: '关于我们/客户.html', label: 'Npack 客户群' },
    certification: { rel: '关于我们/npack-认证.html', label: 'Npack 认证资质' },
    team: { rel: '关于我们/npack-团队.html', label: 'Npack 团队' },
    idMap: { '3965': 'product', '3966': 'contact', '3967': 'about', '3970': 'factory', '3969': 'customer', '3968': 'certification', '3971': 'team' },
  },
  pl: {
    product: { rel: 'produkt.html', label: null },
    contact: { rel: 'kontakt.html', label: null },
    about: { rel: 'o-nas.html', label: null },
    factory: { rel: 'o-nas/npack-factory.html', label: 'Fabryka Npack' },
    customer: { rel: 'o-nas/klient-npack.html', label: 'Klienci Npack' },
    certification: { rel: 'o-nas/certyfikacja-npack.html', label: 'Certyfikaty Npack' },
    team: { rel: 'o-nas/zespol-npack.html', label: 'Zespół Npack' },
    idMap: { '3965': 'product', '3966': 'contact', '3967': 'about', '3970': 'factory', '3969': 'customer', '3968': 'certification', '3971': 'team' },
  },
  de: {
    product: { rel: 'produkt.html', label: null },
    contact: { rel: 'kontakt.html', label: null },
    about: { rel: 'uber-uns.html', label: null },
    factory: { rel: 'uber-uns/npack-werk.html', label: 'Npack Werk' },
    customer: { rel: 'uber-uns/npack-kunde.html', label: 'Npack Kunden' },
    certification: { rel: 'uber-uns/npack-zertifizierung.html', label: 'Npack Zertifizierungen' },
    team: { rel: 'uber-uns/npack-team.html', label: 'Npack Team' },
    idMap: { '3965': 'product', '3966': 'contact', '3967': 'about', '3970': 'factory', '3969': 'customer', '3968': 'certification', '3971': 'team' },
  },
  fr: {
    product: { rel: 'produit.html', label: null },
    contact: { rel: 'contact.html', label: null },
    about: { rel: 'a-propos-de-nous.html', label: null },
    factory: { rel: 'a-propos-de-nous/usine-npack.html', label: 'Usine Npack' },
    customer: { rel: 'a-propos-de-nous/client-npack.html', label: 'Clients Npack' },
    certification: { rel: 'a-propos-de-nous/certification-npack.html', label: 'Certifications Npack' },
    team: { rel: 'a-propos-de-nous/lequipe-npack.html', label: 'Équipe Npack' },
    idMap: { '3965': 'product', '3966': 'contact', '3967': 'about', '3970': 'factory', '3969': 'customer', '3968': 'certification', '3971': 'team' },
  },
  es: {
    product: { rel: 'producto.html', label: null },
    contact: { rel: 'pongase-en-contacto-con.html', label: null },
    about: { rel: 'acerca-de-nosotros.html', label: null },
    factory: { rel: 'acerca-de-nosotros/fabrica-npack.html', label: 'Fábrica Npack' },
    customer: { rel: 'acerca-de-nosotros/npack-cliente.html', label: 'Clientes Npack' },
    certification: { rel: 'acerca-de-nosotros/certificacion-npack.html', label: 'Certificaciones Npack' },
    team: { rel: 'acerca-de-nosotros/equipo-npack.html', label: 'Equipo Npack' },
    idMap: { '3965': 'product', '3966': 'contact', '3967': 'about', '3970': 'factory', '3969': 'customer', '3968': 'certification', '3971': 'team' },
  },
  it: {
    product: { rel: 'prodotto.html', label: null },
    contact: { rel: 'contatto.html', label: null },
    about: { rel: 'chi-siamo.html', label: null },
    factory: { rel: 'chi-siamo/fabbrica-npack.html', label: 'Stabilimento Npack' },
    customer: { rel: 'chi-siamo/cliente-npack.html', label: 'Clienti Npack' },
    certification: { rel: 'chi-siamo/certificazione-npack.html', label: 'Certificazioni Npack' },
    team: { rel: 'chi-siamo/team-npack.html', label: 'Team Npack' },
    idMap: { '3965': 'product', '3966': 'contact', '3967': 'about', '3970': 'factory', '3969': 'customer', '3968': 'certification', '3971': 'team' },
  },
  ru: {
    product: { rel: 'продукт.html', label: null },
    contact: { rel: 'связаться-с.html', label: null },
    about: { rel: 'о-нас.html', label: null },
    factory: { rel: 'о-нас/завод-npack.html', label: 'Завод Npack' },
    customer: { rel: 'о-нас/клиент-npack.html', label: 'Клиенты Npack' },
    certification: { rel: 'о-нас/сертификация-npack.html', label: 'Сертификация Npack' },
    team: { rel: 'о-нас/команда-npack.html', label: 'Команда Npack' },
    idMap: { '3965': 'product', '3966': 'contact', '3967': 'about', '3970': 'factory', '3969': 'customer', '3968': 'certification', '3971': 'team' },
  },
  pt: {
    product: { rel: 'produto.html', label: null },
    contact: { rel: 'contacto.html', label: null },
    about: { rel: 'sobre-nos.html', label: null },
    factory: { rel: 'sobre-nos/fabrica-npack.html', label: 'Fábrica Npack' },
    customer: { rel: 'sobre-nos/cliente-npack.html', label: 'Clientes Npack' },
    certification: { rel: 'sobre-nos/certificacao-npack.html', label: 'Certificações Npack' },
    team: { rel: 'sobre-nos/equipa-npack.html', label: 'Equipa Npack' },
    idMap: { '3965': 'product', '3966': 'contact', '3967': 'about', '3970': 'factory', '3969': 'customer', '3968': 'certification', '3971': 'team' },
  },
};

const LANG_DIRS = new Set(['zh', 'pl', 'de', 'fr', 'es', 'it', 'ru', 'pt']);

function relHref(fromFile, targetRel, langRoot) {
  let rel = path.relative(path.dirname(fromFile), path.join(langRoot, targetRel)).replace(/\\/g, '/');
  if (rel.startsWith('./')) rel = rel.slice(2);
  return rel;
}

function detectLang(filePath) {
  const rel = path.relative(siteRoot, filePath).replace(/\\/g, '/');
  const first = rel.split('/')[0];
  return LANG_DIRS.has(first) ? first : 'en';
}

function isValidHtml(buf) {
  return buf.length > 2000 && !(buf[0] === 0x1f && buf[1] === 0x8b) && /<!doctype html|<html/i.test(buf.slice(0, 500).toString('utf8'));
}

function fixFooterItem(html, menuId, href, label) {
  const esc = menuId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  let n = 0;
  const blockRe = new RegExp(
    `(id="menu-item-${esc}"[\\s\\S]*?<a\\s+)([^>]*href=)(["'])([^"']*)\\3([^>]*>)([\\s\\S]*?)(</a>)`,
    'i',
  );
  html = html.replace(blockRe, (full, pre, hrefAttr, q, _old, postAttrs, _mid, end) => {
    n++;
    let mid = '';
    if (label) {
      mid = label;
    } else {
      const tm = full.match(/<a\s+[^>]*>([^<]*)</i);
      mid = tm ? tm[1].trim() : '';
    }
    return `${pre}${hrefAttr}${q}${href}${q}${postAttrs}${mid}${end}`;
  });
  return { html, n };
}

function fixAriaCurrent(html) {
  return html.replace(/aria-current="page"([^><\s])/gi, 'aria-current="page">$1');
}

let files = 0;
let links = 0;
const broken = [];

function processFile(f) {
  const buf = fs.readFileSync(f);
  if (!isValidHtml(buf)) return;
  if (!buf.toString('utf8').includes('menu-npack-profile')) return;

  const lang = detectLang(f);
  const cfg = LANG_MAP[lang];
  const langRoot = lang === 'en' ? siteRoot : path.join(siteRoot, lang);

  let html = buf.toString('utf8');
  const orig = html;
  html = fixAriaCurrent(html);

  for (const id of FOOTER_MENU_IDS) {
    const key = cfg.idMap[id];
    if (!key) continue;
    const page = cfg[key];
    if (!page) continue;
    const targetAbs = path.join(langRoot, page.rel);
    if (!fs.existsSync(targetAbs)) {
      broken.push({ file: path.relative(siteRoot, f), id, target: page.rel });
      continue;
    }
    const href = relHref(f, page.rel, langRoot);
    const r = fixFooterItem(html, id, href, page.label);
    html = r.html;
    links += r.n;
  }

  if (html !== orig) {
    fs.writeFileSync(f, html, 'utf8');
    files++;
  }
}

function walk(d) {
  for (const ent of fs.readdirSync(d, { withFileTypes: true })) {
    const f = path.join(d, ent.name);
    if (ent.isDirectory()) {
      if (!SKIP.has(ent.name)) walk(f);
    } else if (ent.name.endsWith('.html') && !/-[2-9]\.html$/i.test(ent.name)) {
      processFile(f);
    }
  }
}

walk(siteRoot);

// 验证页脚链接
let verifyFail = 0;
function verifyWalk(d) {
  for (const ent of fs.readdirSync(d, { withFileTypes: true })) {
    const f = path.join(d, ent.name);
    if (ent.isDirectory()) {
      if (!SKIP.has(ent.name)) verifyWalk(f);
    } else if (ent.name.endsWith('.html') && !/-[2-9]\.html$/i.test(ent.name)) {
      const buf = fs.readFileSync(f);
      if (!isValidHtml(buf)) continue;
      const html = buf.toString('utf8');
      if (!html.includes('menu-npack-profile')) continue;
      const lang = detectLang(f);
      const cfg = LANG_MAP[lang];
      for (const id of FOOTER_MENU_IDS) {
        const esc = id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const m = html.match(new RegExp(`id="menu-item-${esc}"[^>]*>[\\s\\S]*?<a\\s+[^>]*href=(["'])([^"']+)\\1`, 'i'));
        if (!m) continue;
        const resolved = path.normalize(path.join(path.dirname(f), m[2]));
        if (!fs.existsSync(resolved)) {
          verifyFail++;
          if (verifyFail <= 20) broken.push({ file: path.relative(siteRoot, f), id, href: m[2] });
        }
      }
    }
  }
}
verifyWalk(siteRoot);

const report = `页脚 Overview 全菜单修复
时间: ${new Date().toISOString()}
修改文件: ${files}
链接校正: ${links}
验证失败: ${verifyFail}
${broken.slice(0, 30).map((b) => `  ${b.file} [${b.id}] ${b.href || b.target}`).join('\n') || '  无'}
`;
fs.writeFileSync(path.join(siteRoot, 'fix_footer_widget_report.txt'), report, 'utf8');
console.log(report);
