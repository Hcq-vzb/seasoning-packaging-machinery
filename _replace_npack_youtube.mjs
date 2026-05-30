/**
 * Replace Npack-related YouTube channel links and embed video IDs site-wide.
 * - Remove NpackAutomation channel hrefs (footer/header social, schema, content links)
 * - Swap legacy embed IDs for HD industry product demo videos by category
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const siteRoot = path.dirname(fileURLToPath(import.meta.url));
const SKIP_DIRS = new Set(['node_modules', 'cache', '.vs', '.git']);

const NPACK_CHANNEL = 'https://www.youtube.com/c/NpackAutomation';
const NPACK_CHANNEL_VARIANTS = [
  'https://www.youtube.com/c/NpackAutomation',
  'http://www.youtube.com/c/NpackAutomation',
  'https:\\/\\/www.youtube.com\\/c\\/NpackAutomation',
  'index.html\\/\\/www.youtube.com\\/c\\/NpackAutomation',
  'index.html//www.youtube.com/c/NpackAutomation',
];

/** Old embed ID -> HD product demo video (verified YouTube IDs) */
const VIDEO_MAP = {
  'Y4V-cn2h8sw': 'mgZ_2MJHlL0',
  'PYEKkpibb7A': 'IpwabzdZ_9A',
  'isNIy0nUWc0': 'IpwabzdZ_9A',
  'nuxkgP4HS6A': 'CD7pRHOE1RM',
  'paCPlppg4XY': 'wYjf2yFUDUY',
  'NEagXbc1Jk0': 'RGl_CkQGUw0',
  '3sMcfCeVEik': 'CgGAyvpPVuo',
  'XhbajZZ7j1s': 'CgGAyvpPVuo',
  'BOI0etpB_iI': 'njNxHvR7R60',
  '8RHXzidX2vI': 'njNxHvR7R60',
  'jx6v1a6dNSA': 'njNxHvR7R60',
  'Fj3CcBAXZGs': '27TDfE4OzPQ',
  'xFvas40ETnk': 'mgZ_2MJHlL0',
  'wdSLQDQDZPw': 'CD7pRHOE1RM',
  'bwhtR4agZOw': '8AjNK2KKy-o',
  'pMSV31Q6Ow0': 'IpwabzdZ_9A',
  'Ms3WsECvqsM': '8AjNK2KKy-o',
  'Hb7eb-pkjfY': 'mgZ_2MJHlL0',
};

const report = {
  filesScanned: 0,
  filesChanged: 0,
  channelRefsRemoved: 0,
  videoIdsReplaced: 0,
  npackTextFixed: 0,
  socialUnwrapped: 0,
};

function shouldProcessFile(name) {
  return /\.(html|json|feed)$/i.test(name) || name === 'feed';
}

function unwrapYoutubeSocialAnchor(html) {
  return html.replace(
    /<a\s+([^>]*?)href="https?:\/\/www\.youtube\.com\/c\/NpackAutomation"([^>]*?)>([\s\S]*?)<\/a>/gi,
    (_, pre, post, inner) => {
      report.socialUnwrapped++;
      const attrs = `${pre}${post}`.replace(/\s*href="[^"]*"/gi, '').trim();
      return `<span ${attrs}>${inner}</span>`;
    },
  );
}

function removeNpackChannelLinks(html) {
  let out = html;
  let n = 0;

  for (const variant of NPACK_CHANNEL_VARIANTS) {
    const esc = variant.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`<a\\s+[^>]*href="${esc}"[^>]*>([\\s\\S]*?)<\\/a>`, 'gi');
    out = out.replace(re, (_, inner) => {
      n++;
      return inner;
    });
  }

  // Plain href occurrences in content paragraphs (keep visible text, drop link)
  out = out.replace(
    /<a\s+[^>]*href="https?:\\\/\\\/www\.youtube\.com\\\/c\\\/NpackAutomation"[^>]*>([\s\S]*?)<\/a>/gi,
    (_, text) => {
      n++;
      return text.replace(/Npack\s*YouTube/i, 'KIWL 产品视频').replace(/Npack/i, 'KIWL');
    },
  );
  out = out.replace(
    /<a\s+[^>]*href="https?:\/\/www\.youtube\.com\/c\/NpackAutomation"[^>]*>([\s\S]*?)<\/a>/gi,
    (_, text) => {
      n++;
      return text.replace(/Npack\s*YouTube/i, 'KIWL 产品视频').replace(/Npack/i, 'KIWL');
    },
  );

  // Remove from schema.org sameAs JSON arrays
  out = out.replace(/,?\s*"https?:\\\/\\\/www\.youtube\.com\\\/c\\\/NpackAutomation"/gi, '');
  out = out.replace(/,?\s*"index\.html\\\/\\\/www\.youtube\.com\\\/c\\\/NpackAutomation"/gi, '');
  out = out.replace(/,?\s*"https:\/\/www\.youtube\.com\/c\/NpackAutomation"/gi, '');
  out = out.replace(/,?\s*"index\.html\/\/www\.youtube\.com\/c\/NpackAutomation"/gi, '');
  // Broken HTTrack sameAs paths: "page.html\/\/www.youtube.com\/c\/NpackAutomation"
  out = out.replace(/,?\s*"[^"]*\\\/\\\/www\.youtube\.com\\\/c\\\/NpackAutomation"/gi, '');
  out = out.replace(/,?\s*"[^"]*\/\/www\.youtube\.com\/c\/NpackAutomation"/gi, '');

  // @NpackAutomation channel / playlist links
  out = out.replace(/<a\s+[^>]*href="https?:\/\/www\.youtube\.com\/@NpackAutomation[^"]*"[^>]*>([\s\S]*?)<\/a>/gi, (_, text) => {
    n++;
    return text.replace(/Npack/gi, 'KIWL');
  });
  out = out.replace(/https?:\\\/\\\/www\.youtube\.com\\\/c\\\/NpackAutomation/gi, () => {
    n++;
    return '';
  });
  out = out.replace(/https?:\\\/\\\/www\.youtube\.com\\\/@NpackAutomation[^"'\\]*/gi, () => {
    n++;
    return 'https:\\/\\/www.kiwlmachine.com\\/';
  });
  out = out.replace(/https?:\/\/www\.youtube\.com\/@NpackAutomation[^\s"'<>]*/gi, () => {
    n++;
    return 'https://www.kiwlmachine.com/';
  });

  report.channelRefsRemoved += n;
  return out;
}

function replaceVideoEmbeds(html) {
  let out = html;
  let n = 0;
  for (const [oldId, newId] of Object.entries(VIDEO_MAP)) {
    if (oldId === newId) continue;
    const esc = oldId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`(youtube\\.com\\/embed\\/)${esc}(\\?[^"'\\s>]*)?`, 'g');
    const before = out;
    out = out.replace(re, `$1${newId}$2`);
    if (out !== before) n += (before.match(re) || []).length;
    // youtu.be short links
    const re2 = new RegExp(`(youtu\\.be\\/)${esc}(\\?[^"'\\s>]*)?`, 'g');
    out = out.replace(re2, `$1${newId}$2`);
    // watch?v= links
    const re3 = new RegExp(`(youtube\\.com\\/watch\\?v=)${esc}(&[^"'\\s>]*)?`, 'g');
    out = out.replace(re3, `$1${newId}$2`);
  }
  report.videoIdsReplaced += n;
  return out;
}

function fixNpackYoutubeText(html) {
  let out = html;
  const before = out;
  out = out.replace(/Npack\s*YouTube/gi, 'KIWL 产品视频');
  out = out.replace(/Npack\s*Youtube/gi, 'KIWL 产品视频');
  out = out.replace(/youtube\.com\/c\/NpackAutomation/gi, '');
  if (out !== before) report.npackTextFixed++;
  return out;
}

function cleanIframeTitles(html) {
  return html.replace(/(<iframe[^>]*title=")([^"]*Npack[^"]*)(")/gi, (_, pre, title, post) => {
    return `${pre}${title.replace(/Npack/gi, 'KIWL').replace(/npack/gi, 'KIWL')}${post}`;
  });
}

function transform(content) {
  let html = content;
  html = replaceVideoEmbeds(html);
  html = unwrapYoutubeSocialAnchor(html);
  html = removeNpackChannelLinks(html);
  html = fixNpackYoutubeText(html);
  html = cleanIframeTitles(html);
  return html;
}

function processFile(fp) {
  report.filesScanned++;
  const original = fs.readFileSync(fp, 'utf8');
  const updated = transform(original);
  if (updated !== original) {
    fs.writeFileSync(fp, updated, 'utf8');
    report.filesChanged++;
  }
}

function walk(dir) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const fp = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (SKIP_DIRS.has(ent.name)) continue;
      walk(fp);
    } else if (ent.name.endsWith('.html') || ent.name === 'feed' || /\.(json|feed)$/i.test(ent.name)) {
      processFile(fp);
    }
  }
}

walk(siteRoot);

// Post-check counts
let channelLeft = 0;
let oldIdsLeft = {};
function walkCheck(dir) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const fp = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (SKIP_DIRS.has(ent.name)) continue;
      walkCheck(fp);
    } else if (shouldProcessFile(ent.name)) {
      const t = fs.readFileSync(fp, 'utf8');
      channelLeft += (t.match(/youtube\.com\/c\/NpackAutomation/gi) || []).length;
      for (const oldId of Object.keys(VIDEO_MAP)) {
        if (t.includes(`youtube.com/embed/${oldId}`)) {
          oldIdsLeft[oldId] = (oldIdsLeft[oldId] || 0) + 1;
        }
      }
    }
  }
}
walkCheck(siteRoot);

const out = `Npack YouTube 替换报告
时间: ${new Date().toISOString()}
扫描文件: ${report.filesScanned}
修改文件: ${report.filesChanged}
频道链接处理: ${report.channelRefsRemoved}
社交图标取消跳转: ${report.socialUnwrapped}
视频 ID 替换次数: ${report.videoIdsReplaced}
Npack YouTube 文案修正: ${report.npackTextFixed}

剩余 NpackAutomation 频道引用: ${channelLeft}
剩余旧 embed ID: ${Object.keys(oldIdsLeft).length ? JSON.stringify(oldIdsLeft) : '(无)'}

视频映射:
${Object.entries(VIDEO_MAP).map(([a, b]) => `  ${a} -> ${b}`).join('\n')}
`;

fs.writeFileSync(path.join(siteRoot, '_replace_npack_youtube_report.txt'), out, 'utf8');
console.log(out);
