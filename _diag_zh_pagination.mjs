import fs from 'fs';
import path from 'path';

const root = path.join('c:/My Websites/baoz/www.npackpm.com/zh');

function isValidHtml(fp) {
  const buf = fs.readFileSync(fp);
  if (buf.length < 5000) return { ok: false, reason: 'too_small', size: buf.length };
  const head = buf.slice(0, 200).toString('utf8');
  if (!/<!doctype html|<html/i.test(head)) return { ok: false, reason: 'not_html', head: head.slice(0, 80) };
  if (!/charset/i.test(head) && !buf.slice(0, 2000).toString('utf8').includes('charset')) {
    return { ok: false, reason: 'no_charset' };
  }
  return { ok: true, size: buf.length };
}

function walk(d, out = []) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const f = path.join(d, e.name);
    if (e.isDirectory()) walk(f, out);
    else if (e.name.endsWith('.html') && !e.name.endsWith('.html.z')) out.push(f);
  }
  return out;
}

for (const f of walk(root)) {
  const rel = path.relative(root, f).replace(/\\/g, '/');
  const v = isValidHtml(f);
  if (!v.ok) console.log('BAD', rel, v);
}
