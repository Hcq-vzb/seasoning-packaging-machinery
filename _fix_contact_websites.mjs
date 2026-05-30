import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.dirname(fileURLToPath(import.meta.url));
const oldBlock =
  '<p><span style="color: #393939;">www.npackpm.com</span><br /><span style="color: #393939;">www.npackchina.com</span></p>';
const newBlock =
  '<p><span style="color: #393939;">www.kiwlmachine.com</span><br /><span style="color: #393939;">seasoningpackagingmachinery.com</span></p>';

const files = [
  'contact.html',
  'zh/联系.html',
  'zh/联系-2.html',
  'de/kontakt.html',
  'es/pongase-en-contacto-con.html',
  'fr/contact.html',
  'it/contatto.html',
  'pl/kontakt.html',
  'pt/contacto.html',
  'ru/связаться-с.html',
  'ru/связаться-с-2.html',
];

for (const rel of files) {
  const fp = path.join(root, rel);
  if (!fs.existsSync(fp)) {
    console.log('MISSING', rel);
    continue;
  }
  let html = fs.readFileSync(fp, 'utf8');
  const orig = html;
  html = html.replaceAll(oldBlock, newBlock);
  html = html.replaceAll('www.npackpm.comwww.npackchina.com', 'www.kiwlmachine.com seasoningpackagingmachinery.com');
  if (html !== orig) {
    fs.writeFileSync(fp, html, 'utf8');
    console.log('UPDATED', rel);
  } else {
    console.log('OK', rel);
  }
}
