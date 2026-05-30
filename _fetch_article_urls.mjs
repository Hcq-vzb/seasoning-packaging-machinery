const urls = [
  ['pt', 'https://www.npackpm.com/pt/maquina-de-etiquetagem-industrial-html/'],
  ['zh', 'https://www.npackpm.com/zh/%E5%B7%A5%E4%B8%9A%E8%B4%B4%E6%A0%87%E6%9C%BA-html/'],
  ['it', 'https://www.npackpm.com/it/etichettatrice-industriale-html/'],
  ['pl', 'https://www.npackpm.com/pl/przemyslowa-maszyna-etykietujaca-html/'],
  ['fr', 'https://www.npackpm.com/fr/machine-a-etiqueter-industrielle-html/'],
  ['de', 'https://www.npackpm.com/de/industrielle-etikettiermaschine-html/'],
  ['es', 'https://www.npackpm.com/es/etiquetadora-industrial-html/'],
  ['ru', 'https://www.npackpm.com/ru/promyshlennaya-etiketirovochnaya-mashina-html/'],
];

for (const [code, u] of urls) {
  const r = await fetch(u, { redirect: 'follow', headers: { 'User-Agent': 'Mozilla/5.0' } });
  const t = await r.text();
  const has = t.includes('post-3663');
  const h1 = t.match(/<h1[^>]*class="page-title"[^>]*>([^<]+)/)?.[1]?.trim();
  console.log(code, r.status, has ? 'OK' : 'NO', h1 || 'no h1');
}
