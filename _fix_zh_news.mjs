import fs from 'fs';
import path from 'path';

const root = path.resolve('c:/My Websites/baoz/www.npackpm.com');

const manualPostMap = {
  '3710': 'what-are-capsules-and-how-to-fill-capsules.html',
  '3703': 'what-are-the-advantages-of-automatic-filling-machine.html',
  '3694': 'bee-pollen.html',
  '3653': 'shampoo-production-processing-equipments.html',
  '3639': 'how-to-choose-a-liquid-filling-machine.html',
  '3633': 'how-to-choose-an-edible-oil-filling-machine.html',
  '3615': 'analysis-of-corrosion-reasons-and-anti-corrosion-methods-for-chemical-production-equipment.html',
};

function walk(dir, files = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ent.name === 'node_modules' || ent.name.startsWith('.')) continue;
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(full, files);
    else if (ent.name.endsWith('.html')) files.push(full);
  }
  return files;
}

function isBadHref(h) {
  return !h || h === 'index.html' || /(^|\/)\.\.(\/\.\.)*\/index\.html$/.test(h.replace(/\\/g, '/'));
}

function relHref(fromFile, targetRel) {
  const rel = path.relative(path.dirname(fromFile), path.join(root, targetRel)).replace(/\\/g, '/');
  return rel;
}

function getImageFromHtml(html) {
  let m = html.match(/"image"\s*:\s*\{[^}]*"url"\s*:\s*"([^"]+)"/);
  if (m) {
    const p = m[1].replace(/\\\//g, '/').replace(/^https?:\/\/[^/]+\//, '').replace(/^\//, '');
    if (!p.includes('npack.png')) return p;
  }
  m = html.match(/wp-block-image[^>]*>[\s\S]*?<img[^>]+src="([^"]+)"/);
  if (m) return m[1].replace(/^(\.\.\/)+/, '');
  m = html.match(/rel="preload"[^>]*as="image"[^>]*href="([^"]+)"/);
  if (m) {
    const p = m[1].replace(/^(\.\.\/)+/, '');
    if (!p.includes('npack.png')) return p;
  }
  m = html.match(/property="og:image"\s+content="([^"]+)"/);
  if (m) {
    const p = m[1].replace(/^https?:\/\/[^/]+\//, '').replace(/^\//, '');
    if (!p.includes('npack.png')) return p;
  }
  return null;
}

// Build post map from EN news
const postMap = { ...manualPostMap };
const enLists = [
  path.join(root, 'news.html'),
  ...fs.readdirSync(path.join(root, 'news', 'page')).filter(f => f.endsWith('.html')).map(f => path.join(root, 'news', 'page', f)),
  path.join(root, 'technology.html'),
  ...fs.readdirSync(path.join(root, 'technology', 'page')).filter(f => f.endsWith('.html')).map(f => path.join(root, 'technology', 'page', f)),
];

for (const listPath of enLists) {
  const c = fs.readFileSync(listPath, 'utf8');
  for (const m of c.matchAll(/<article class="entry-card[^"]* post-(\d+)[^>]*>([\s\S]*?)<\/article>/g)) {
    const id = m[1];
    if (postMap[id]) continue;
    const body = m[2];
    const hm = body.match(/ct-media-container[^>]*href="([^"]+\.html)"/);
    if (hm && !isBadHref(hm[1])) {
      postMap[id] = hm[1].replace(/^(\.\.\/)+/, '');
    }
  }
}

const targets = walk(path.join(root, 'zh')).filter(f =>
  /[\\/]新闻[\\/]页码[\\/]|[\\/]技术[\\/]页码[\\/]/.test(f)
);

let fixedFiles = 0;
let fixedCards = 0;

for (const file of targets) {
  let content = fs.readFileSync(file, 'utf8');
  const orig = content;
  const entryRe = /(<article class="entry-card[^"]* post-(\d+)[^>]*>)([\s\S]*?)(<\/article>)/g;

  content = content.replace(entryRe, (full, open, postId, body, close) => {
    const hm = body.match(/ct-media-container[^>]*href="([^"]+)"/);
    const srcBad = /src="(?:\.\.\/)*(?:index\.html|[^"]*npack\.png)/.test(body);
    let slug = postMap[postId];
    if (!slug && hm && hm[1].endsWith('.html') && !isBadHref(hm[1])) {
      slug = hm[1].replace(/^(\.\.\/)+/, '');
    }
    if (!slug) return full;
    const needFix = srcBad || (hm && isBadHref(hm[1]));
    if (!needFix) return full;

    const hrefRel = relHref(file, slug);
    let nb = body.replace(/(ct-media-container[^>]*href=")[^"]+(")/, `$1${hrefRel}$2`);
    nb = nb.replace(/(class="entry-title"[^>]*>\s*<a href=")[^"]+(")/, `$1${hrefRel}$2`);

    const detailPath = path.join(root, slug);
    if (fs.existsSync(detailPath)) {
      const img = getImageFromHtml(fs.readFileSync(detailPath, 'utf8'));
      if (img) {
        const imgRel = relHref(file, img);
        if (/wp-post-image/.test(nb)) {
          nb = nb.replace(/(<img[^>]*?)src="[^"]*"([^>]*wp-post-image[^>]*>)/, `$1src="${imgRel}"$2`);
          if (!nb.includes(imgRel)) {
            nb = nb.replace(/(<img[^>]*wp-post-image[^>]*?)src="[^"]*"/, `$1src="${imgRel}"`);
          }
        }
      }
    }
    if (nb !== body) fixedCards++;
    return open + nb + close;
  });

  if (content !== orig) {
    fs.writeFileSync(file, content, 'utf8');
    fixedFiles++;
    console.log('Fixed:', path.relative(root, file));
  }
}

console.log(`\nDone: ${fixedFiles} files, ${fixedCards} entry cards`);
