import fs from 'fs';
import path from 'path';

const root = path.resolve('c:/My Websites/baoz/www.npackpm.com');
const CUSTOMER_REL = {
  zh: '关于我们/客户.html',
  pl: 'o-nas/klient-npack.html',
  de: 'uber-uns/npack-kunde.html',
  fr: 'a-propos-de-nous/client-npack.html',
  es: 'acerca-de-nosotros/npack-cliente.html',
  it: 'chi-siamo/cliente-npack.html',
  ru: 'о-нас/клиент-npack.html',
  pt: 'sobre-nos/cliente-npack.html',
};

for (const [lang, rel] of Object.entries(CUSTOMER_REL)) {
  const fp = path.join(root, lang, rel);
  if (!fs.existsSync(fp)) continue;
  const langRoot = path.join(root, lang);
  const depth = path.relative(langRoot, path.dirname(fp)).split('/').filter(Boolean).length;
  const home = `${'../'.repeat(depth)}index.html`;
  let html = fs.readFileSync(fp, 'utf8');
  html = html.replace(
    /<a\s+([^>]*class="[^"]*site-logo-container[^"]*"[^>]*href=)(["'])[^"']+\2/gi,
    `<a $1$2${home}$2`,
  );
  html = html.replace(
    /<a\s+([^>]*href=)(["'])[^"']+\2([^>]*class="[^"]*site-logo-container[^"]*"[^>]*>)/gi,
    `<a $1$2${home}$2$3`,
  );
  html = html.replace(
    /(<a\s+href=)(["'])[^"']+\2([^>]*>[\s\S]*?ct-home-icon)/gi,
    `$1$2${home}$2$3`,
  );
  html = html.replace(
    /(<span class="first-item"[\s\S]*?<a\s+href=)(["'])[^"']+\2/gi,
    `$1$2${home}$2`,
  );
  fs.writeFileSync(fp, html);
  console.log('logo ok', lang, home);
}
