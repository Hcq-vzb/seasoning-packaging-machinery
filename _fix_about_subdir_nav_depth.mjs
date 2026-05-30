/**
 * 语言根下仅一层子目录（about-us、关于我们 等）内，将多写的 ../ 校正为 ../
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const siteRoot = path.dirname(fileURLToPath(import.meta.url));
const ABOUT_DIRS = [
  'about-us',
  'zh/关于我们',
  'pl/o-nas',
  'de/uber-uns',
  'fr/a-propos-de-nous',
  'es/acerca-de-nosotros',
  'it/chi-siamo',
  'ru/о-нас',
  'pt/sobre-nos',
];

let changed = 0;
let files = 0;

for (const dir of ABOUT_DIRS) {
  const abs = path.join(siteRoot, dir);
  if (!fs.existsSync(abs)) continue;
  for (const name of fs.readdirSync(abs)) {
    if (!name.endsWith('.html')) continue;
    const fp = path.join(abs, name);
    let html = fs.readFileSync(fp, 'utf8');
    const next = html.replace(/href="\.\.\/\.\.\//g, 'href="../');
    if (next !== html) {
      fs.writeFileSync(fp, next, 'utf8');
      changed++;
    }
    files++;
  }
}

console.log(`about 子目录导航深度修复: ${changed}/${files} 个文件已更新`);
