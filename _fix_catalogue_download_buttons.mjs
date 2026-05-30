/**
 * 修复产品详情页 Catalogue Download 按钮的 PDF 链接
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const siteRoot = path.dirname(fileURLToPath(import.meta.url));
const SKIP = new Set(['wp-json', 'node_modules', 'cache', '.vs']);
const JSON_DIR = path.join(siteRoot, 'wp-json', 'wp', 'v2', 'pages');
const LANG_DIRS = new Set(['zh', 'de', 'fr', 'es', 'it', 'ru', 'pl', 'pt']);

const CONTACT = {
  en: 'contact.html',
  zh: '联系.html',
  de: 'kontakt.html',
  fr: 'contact.html',
  es: 'pongase-en-contacto-con.html',
  it: 'contatto.html',
  ru: 'связаться-с.html',
  pl: 'kontakt.html',
  pt: 'contacto.html',
};

const FALLBACK_PDFS = {
  3436: 'https://www.npackpm.com/wp-content/uploads/2025/10/npack-catalogue.pdf',
  3467: 'https://www.npackpm.com/wp-content/uploads/2025/10/Npack-catalog-2025version.pdf',
  2995: 'https://www.npackpm.com/wp-content/uploads/2025/10/Npack-catalog-2025version.pdf',
};

const report = { catalogueFixed: 0, inquiryFixed: 0, files: 0, noPdf: [] };

function loadPdfMap() {
  const map = new Map();
  for (const f of fs.readdirSync(JSON_DIR)) {
    if (!f.endsWith('.json')) continue;
    const j = JSON.parse(fs.readFileSync(path.join(JSON_DIR, f), 'utf8'));
    const html = j.content?.rendered || '';
    const re = /href=(["'])([^"']+\.pdf)\1/gi;
    let m;
    while ((m = re.exec(html)) !== null) {
      if (!map.has(j.id)) map.set(j.id, m[2]);
      break;
    }
  }
  for (const [id, url] of Object.entries(FALLBACK_PDFS)) {
    if (!map.has(+id)) map.set(+id, url);
  }
  return map;
}

const pdfMap = loadPdfMap();

function isValidHtml(buf) {
  return buf.length > 500 && !(buf[0] === 0x1f && buf[1] === 0x8b) && /<!doctype html|<html/i.test(buf.slice(0, 500).toString('utf8'));
}

function detectLang(filePath) {
  const rel = path.relative(siteRoot, filePath).replace(/\\/g, '/');
  const first = rel.split('/')[0];
  return LANG_DIRS.has(first) ? first : 'en';
}

function depthPrefix(filePath, lang) {
  const root = lang === 'en' ? siteRoot : path.join(siteRoot, lang);
  const rel = path.relative(root, path.dirname(filePath)).replace(/\\/g, '/');
  const depth = rel ? rel.split('/').filter(Boolean).length : 0;
  return depth ? '../'.repeat(depth) : '';
}

function contactHref(filePath) {
  const lang = detectLang(filePath);
  return depthPrefix(filePath, lang) + CONTACT[lang];
}

function assetRelPath(filePath, assetUrl) {
  const relFromSiteRoot = path.relative(siteRoot, path.dirname(filePath)).replace(/\\/g, '/');
  const depth = relFromSiteRoot ? relFromSiteRoot.split('/').filter(Boolean).length : 0;
  const prefix = depth ? '../'.repeat(depth) : '';
  const assetPath = assetUrl.replace(/^https?:\/\/[^/]+\//, '');
  return prefix + assetPath;
}

function getPageId(html) {
  const m = html.match(/data-elementor-type="wp-page"[^>]*data-elementor-id="(\d+)"/i)
    || html.match(/data-elementor-id="(\d+)"[^>]*data-elementor-type="wp-page"/i);
  return m ? +m[1] : null;
}

function fixHomeCtaBlocks(html, filePath, pdfUrl) {
  const pdfTarget = assetRelPath(filePath, pdfUrl);
  const contactTarget = contactHref(filePath);
  let catalogueN = 0;
  let inquiryN = 0;

  html = html.replace(
    /(<div[^>]*\bhome-cta-1\b[^>]*>)([\s\S]*?)(\s*<\/div>)/gi,
    (full, open, inner, closeDiv) => {
      if (/e-far-comments/i.test(inner)) {
        const fixed = inner.replace(
          /<a\b[^>]*>/i,
          (tag) => {
            const href = tag.match(/\bhref=(["'])([^"']*)\1/i)?.[2];
            if (href === contactTarget) return tag;
            inquiryN++;
            return `<a class="elementor-button elementor-button-link elementor-size-sm" href="${contactTarget}" target="_blank">`;
          },
        );
        return fixed === inner ? full : open + fixed + closeDiv;
      }

      if (/e-fas-file-pdf/i.test(inner)) {
        const fixed = inner.replace(
          /<a\b[^>]*>/i,
          (tag) => {
            const href = tag.match(/\bhref=(["'])([^"']*)\1/i)?.[2];
            if (href === pdfTarget) return tag;
            catalogueN++;
            return `<a class="elementor-button elementor-button-link elementor-size-sm" href="${pdfTarget}" target="_blank">`;
          },
        );
        return fixed === inner ? full : open + fixed + closeDiv;
      }

      return full;
    },
  );

  return { html, catalogueN, inquiryN };
}

function processFile(fp) {
  const buf = fs.readFileSync(fp);
  if (!isValidHtml(buf)) return;
  let html = buf.toString('utf8');
  if (!html.includes('home-cta-1')) return;

  const pageId = getPageId(html);
  if (!pageId) return;

  const pdfUrl = pdfMap.get(pageId);
  if (!pdfUrl) {
    if (html.includes('e-fas-file-pdf')) {
      report.noPdf.push(path.relative(siteRoot, fp).replace(/\\/g, '/'));
    }
    return;
  }

  const { html: next, catalogueN, inquiryN } = fixHomeCtaBlocks(html, fp, pdfUrl);
  if (catalogueN > 0 || inquiryN > 0) {
    fs.writeFileSync(fp, next, 'utf8');
    report.catalogueFixed += catalogueN;
    report.inquiryFixed += inquiryN;
    report.files++;
  }
}

function walk(d) {
  for (const ent of fs.readdirSync(d, { withFileTypes: true })) {
    const f = path.join(d, ent.name);
    if (ent.isDirectory()) {
      if (!SKIP.has(ent.name)) {
        if (ent.name === 'wp-content' && d === siteRoot) continue;
        walk(f);
      }
    } else if (ent.name.endsWith('.html') && !ent.name.endsWith('.html.z')) {
      processFile(f);
    }
  }
}

walk(siteRoot);

const bad = [];
function verify(d) {
  for (const ent of fs.readdirSync(d, { withFileTypes: true })) {
    const f = path.join(d, ent.name);
    if (ent.isDirectory()) {
      if (!SKIP.has(ent.name)) {
        if (ent.name === 'wp-content' && d === siteRoot) continue;
        verify(f);
      }
    } else if (ent.name.endsWith('.html')) {
      const buf = fs.readFileSync(f);
      if (!isValidHtml(buf)) continue;
      const html = buf.toString('utf8');
      for (const m of html.matchAll(/(<div[^>]*home-cta-1[^>]*>)([\s\S]*?)(\s*<\/div>)/gi)) {
        const inner = m[2];
        const href = inner.match(/\bhref=(["'])([^"']*)\1/i)?.[2];
        if (/e-fas-file-pdf/i.test(inner) && (!href || !href.includes('.pdf'))) {
          bad.push(`${path.relative(siteRoot, f).replace(/\\/g, '/')} catalogue -> ${href || '(no href)'}`);
        }
        if (/e-far-comments/i.test(inner) && href && href.includes('.pdf')) {
          bad.push(`${path.relative(siteRoot, f).replace(/\\/g, '/')} inquiry -> ${href}`);
        }
      }
    }
  }
}
verify(siteRoot);

const text = `Catalogue Download 按钮修复
时间: ${new Date().toISOString()}
修改文件: ${report.files}
Catalogue 按钮修复: ${report.catalogueFixed}
Inquiry 按钮恢复: ${report.inquiryFixed}
无 PDF 映射: ${[...new Set(report.noPdf)].length}

验证失败: ${bad.length}
${bad.slice(0, 30).join('\n') || '全部通过'}
`;
fs.writeFileSync(path.join(siteRoot, 'fix_catalogue_download_report.txt'), text, 'utf8');
console.log(text);
