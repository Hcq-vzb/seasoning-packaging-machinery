/**
 * 全站联系方式与地址批量更新
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const siteRoot = path.dirname(fileURLToPath(import.meta.url));
const SKIP_DIRS = new Set(['node_modules', 'cache', '.vs', '.git', 'wp-content']);
const LANG_DIRS = new Set(['zh', 'fr', 'de', 'it', 'es', 'pl', 'pt', 'ru']);
const ROOT_LANG_FILES = {
  'zh.html': 'zh',
  'fr.html': 'fr',
  'de.html': 'de',
  'it.html': 'it',
  'es.html': 'es',
  'pl.html': 'pl',
  'pt.html': 'pt',
  'ru.html': 'ru',
};

const PHONE_REPLACEMENTS = [
  ['008618019360681', '008618151132311'],
  ['+86-18019360681', '+86-18151132311'],
  ['+8618019360681', '+8618151132311'],
  ['18019360681', '18151132311'],
];

const GLOBAL_ADDRESS_REPLACEMENTS = [
  [
    'Address No.2009 Xupan Road ,Jiading District, Shanghai China. Post Code 201808',
    'Address Building 4, Xingyuan Road, Nanfeng Town, Zhangjiagang City, Jiangsu Province, China',
  ],
  [
    'Address No.2009 Xupan Road ,Jiading District, Jiangsu China. Post Code 201808',
    'Address Building 4, Xingyuan Road, Nanfeng Town, Zhangjiagang City, Jiangsu Province, China',
  ],
  [
    'Address No.2009 Xupan Road ,Jiading District, Shanghai China. Post Code 201808 Tel\\/Whatsapp +86-18151132311',
    'Address Building 4, Xingyuan Road, Nanfeng Town, Zhangjiagang City, Jiangsu Province, China Tel\\/Whatsapp +86-18151132311',
  ],
  [
    'Address No.2009 Xupan Road ,Jiading District, Jiangsu China. Post Code 201808 Tel\\/Whatsapp +86-18151132311',
    'Address Building 4, Xingyuan Road, Nanfeng Town, Zhangjiagang City, Jiangsu Province, China Tel\\/Whatsapp +86-18151132311',
  ],
  [
    'Jiading District, Shanghai China',
    'Building 4, Xingyuan Road, Nanfeng Town, Zhangjiagang City, Jiangsu Province, China',
  ],
  [
    'Jiading District, Jiangsu China',
    'Building 4, Xingyuan Road, Nanfeng Town, Zhangjiagang City, Jiangsu Province, China',
  ],
  [
    'No.2009 Xupan Road ,Building 4, Xingyuan Road, Nanfeng Town, Zhangjiagang City, Jiangsu Province, China. Post Code 201808',
    'Building 4, Xingyuan Road, Nanfeng Town, Zhangjiagang City, Jiangsu Province, China',
  ],
];

const MAP_OLD =
  'https://www.google.com/maps/embed?pb=!1m14!1m8!1m3!1d108930.42572254973!2d121.28581000000001!3d31.439579999999996!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x35b215387ed9300b%3A0x60c6104595daff9d!2s2009%20Xupan%20Rd%2C%20Jia%20Ding%20Qu%2C%20Shang%20Hai%20Shi%2C%20China%2C%20201808!5e0!3m2!1sen!2sus!4v1760366960901!5m2!1sen!2sus';
const MAP_NEW =
  'https://www.google.com/maps?q=Building+4%2C+Xingyuan+Road%2C+Nanfeng+Town%2C+Zhangjiagang+City%2C+Jiangsu+Province%2C+China&output=embed';

const LANG_REPLACEMENTS = {
  zh: [
    ['江苏市嘉定区徐潘路2009号', '中国江苏省张家港市南丰镇兴园路4号楼'],
    ['中国江苏市嘉定区徐潘路2009号 邮政编码：201808', '中国江苏省张家港市南丰镇兴园路4号楼'],
    ['中国江苏市嘉定区徐潘路2009号', '中国江苏省张家港市南丰镇兴园路4号楼'],
    [
      '工厂占地面积超过2600平方米，坐落于中国江苏市嘉定区沪宜公路2009号。',
      '工厂坐落于中国江苏省张家港市南丰镇兴园路4号楼，占地面积超过2600平方米。',
    ],
    [
      'KIWL工厂坐落于中国江苏市嘉定区，拥有超过2600平方米的生产车间。',
      'KIWL工厂坐落于中国江苏省张家港市南丰镇，拥有超过2600平方米的生产车间。',
    ],
    [
      '江苏鑫紫鲸机械制造集团有限公司是经SGS集团验厂认证的液体灌装设备制造商，生产基地位于江苏市嘉定区。',
      '江苏鑫紫鲸机械制造集团有限公司是经SGS集团验厂认证的液体灌装设备制造商，生产基地位于中国江苏省张家港市南丰镇兴园路4号楼。',
    ],
  ],
  en: [
    ['Jiading District, Jiangsu China', 'Building 4, Xingyuan Road, Nanfeng Town, Zhangjiagang City, Jiangsu Province, China'],
    [
      'No.2009 Xupan Road ,Jiading District, Jiangsu China. Post Code 201808',
      'Building 4, Xingyuan Road, Nanfeng Town, Zhangjiagang City, Jiangsu Province, China',
    ],
    [
      'No. 2009, Xupan Road, Jiading District, Jiangsu, China.',
      'Building 4, Xingyuan Road, Nanfeng Town, Zhangjiagang City, Jiangsu Province, China.',
    ],
    [
      'A factory space of over 2,600 square meters, located at No. 2009, Xupan Road, Jiading District, Jiangsu, China.',
      'A factory space of over 2,600 square meters, located at Building 4, Xingyuan Road, Nanfeng Town, Zhangjiagang City, Jiangsu Province, China.',
    ],
    [
      'KIWL facatory located in Jiading district ,shanghai China,with more than 2600 square meters workshop.we joined in alibaba since 2012.',
      'KIWL factory located in Nanfeng Town, Zhangjiagang City, Jiangsu Province, China, with more than 2600 square meters workshop. We joined Alibaba since 2012.',
    ],
    [
      "Our factory is located in Jiangsu&#8217;s Jiading District.",
      'Our factory is located at Building 4, Xingyuan Road, Nanfeng Town, Zhangjiagang City, Jiangsu Province, China.',
    ],
    [
      "Our factory is located in Jiangsu's Jiading District.",
      'Our factory is located at Building 4, Xingyuan Road, Nanfeng Town, Zhangjiagang City, Jiangsu Province, China.',
    ],
  ],
  fr: [
    ['Jiading District, Jiangsu Chine', 'Bâtiment 4, Route Xingyuan, Ville de Nanfeng, Zhangjiagang, Province du Jiangsu, Chine'],
    [
      'N° 2009, Route Xupan, District de Jiading, Jiangsu, Chine. Code postal : 201808',
      'Bâtiment 4, Route Xingyuan, Ville de Nanfeng, Zhangjiagang, Province du Jiangsu, Chine',
    ],
    [
      'Un espace d&#8217;usine de plus de 2 600 mètres carrés, situé au n° 2009, Route Xupan, District de Jiading, Jiangsu, Chine.',
      'Un espace d&#8217;usine de plus de 2 600 mètres carrés, situé au Bâtiment 4, Route Xingyuan, Ville de Nanfeng, Zhangjiagang, Province du Jiangsu, Chine.',
    ],
    [
      'Un espace d\'usine de plus de 2 600 mètres carrés, situé au n° 2009, Route Xupan, District de Jiading, Jiangsu, Chine.',
      'Un espace d\'usine de plus de 2 600 mètres carrés, situé au Bâtiment 4, Route Xingyuan, Ville de Nanfeng, Zhangjiagang, Province du Jiangsu, Chine.',
    ],
    [
      "Notre usine est située dans le district de Jiading à Jiangsu.",
      'Notre usine est située au Bâtiment 4, Route Xingyuan, Ville de Nanfeng, Zhangjiagang, Province du Jiangsu, Chine.',
    ],
    [
      'L&#8217;usine KIWL est située dans le district de Jiading, Jiangsu, Chine, avec un atelier de plus de 2600 mètres carrés.',
      'L&#8217;usine KIWL est située à Nanfeng, Zhangjiagang, province du Jiangsu, Chine, avec un atelier de plus de 2600 mètres carrés.',
    ],
    [
      "L'usine de KIWL est située dans le district de Jiading, à Jiangsu, en Chine, et dispose d'un atelier de plus de 2600 mètres carrés.",
      "L'usine de KIWL est située à Nanfeng, Zhangjiagang, province du Jiangsu, Chine, et dispose d'un atelier de plus de 2600 mètres carrés.",
    ],
    [
      'Une usine de plus de 2 600 mètres carrés, située au n°2009, route Xupan, district de Jiading, Jiangsu, Chine.',
      'Une usine de plus de 2 600 mètres carrés, située au Bâtiment 4, Route Xingyuan, Ville de Nanfeng, Zhangjiagang, Province du Jiangsu, Chine.',
    ],
    [
      "Notre usine est située dans le district de Jiading à Jiangsu.",
      'Notre usine est située au Bâtiment 4, Route Xingyuan, Ville de Nanfeng, Zhangjiagang, Province du Jiangsu, Chine.',
    ],
    [
      "Notre usine est situ\u00e9e dans le district de Jiading \u00e0 Jiangsu.",
      'Notre usine est situ\u00e9e au B\u00e2timent 4, Route Xingyuan, Ville de Nanfeng, Zhangjiagang, Province du Jiangsu, Chine.',
    ],
  ],
  de: [
    ['Bezirk Jiading, Jiangsu China', 'Gebäude 4, Xingyuan Straße, Nanfeng, Zhangjiagang, Provinz Jiangsu, China'],
    [
      'Xupan Str. 2009, Bezirk Jiading, Jiangsu, China. Postleitzahl: 201808',
      'Gebäude 4, Xingyuan Straße, Nanfeng, Zhangjiagang, Provinz Jiangsu, China',
    ],
    [
      'Eine Fabrikfläche von über 2.600 Quadratmetern, gelegen in der Xupan Straße 2009, Bezirk Jiading, Jiangsu, China.',
      'Eine Fabrikfläche von über 2.600 Quadratmetern, gelegen in Gebäude 4, Xingyuan Straße, Nanfeng, Zhangjiagang, Provinz Jiangsu, China.',
    ],
    [
      'Eine Fabrikfläche von über 2.600 Quadratmetern, gelegen in Xupan Road 2009, Bezirk Jiading, Jiangsu, China.',
      'Eine Fabrikfläche von über 2.600 Quadratmetern, gelegen in Gebäude 4, Xingyuan Straße, Nanfeng, Zhangjiagang, Provinz Jiangsu, China.',
    ],
    [
      'Das Werk von KIWL befindet sich im Bezirk Jiading, Jiangsu, China, und verfügt über eine Werkstatt von mehr als 2.600 Quadratmetern.',
      'Das Werk von KIWL befindet sich in Nanfeng, Zhangjiagang, Provinz Jiangsu, China, und verfügt über eine Werkstatt von mehr als 2.600 Quadratmetern.',
    ],
    [
      'Unsere Fabrik befindet sich im Bezirk Jiading in Jiangsu.',
      'Unsere Fabrik befindet sich in Gebäude 4, Xingyuan Straße, Nanfeng, Zhangjiagang, Provinz Jiangsu, China.',
    ],
    [
      'Unser Werk befindet sich im Bezirk Jiading, Jiangsu.',
      'Unser Werk befindet sich in Gebäude 4, Xingyuan Straße, Nanfeng, Zhangjiagang, Provinz Jiangsu, China.',
    ],
  ],
  it: [
    ['Distretto di Jiading, Jiangsu Cina', 'Edificio 4, Via Xingyuan, Nanfeng, Zhangjiagang, Provincia di Jiangsu, Cina'],
    [
      'Via Xupan N. 2009, Distretto di Jiading, Jiangsu, Cina. Codice postale: 201808',
      'Edificio 4, Via Xingyuan, Nanfeng, Zhangjiagang, Provincia di Jiangsu, Cina',
    ],
    [
      'Uno spazio di fabbrica di oltre 2.600 metri quadrati, situato in Via Xupan n. 2009, Distretto di Jiading, Jiangsu, Cina.',
      'Uno spazio di fabbrica di oltre 2.600 metri quadrati, situato in Edificio 4, Via Xingyuan, Nanfeng, Zhangjiagang, Provincia di Jiangsu, Cina.',
    ],
    [
      'Uno spazio produttivo di oltre 2.600 metri quadrati, situato in Via Xupan N. 2009, Distretto di Jiading, Jiangsu, Cina.',
      'Uno spazio produttivo di oltre 2.600 metri quadrati, situato in Edificio 4, Via Xingyuan, Nanfeng, Zhangjiagang, Provincia di Jiangsu, Cina.',
    ],
    [
      'La fabbrica di KIWL si trova nel distretto di Jiading, Jiangsu, Cina, e vanta un\'officina di oltre 2.600 metri quadrati.',
      'La fabbrica di KIWL si trova a Nanfeng, Zhangjiagang, provincia di Jiangsu, Cina, e vanta un\'officina di oltre 2.600 metri quadrati.',
    ],
    [
      'La nostra fabbrica si trova nel distretto di Jiading a Jiangsu.',
      'La nostra fabbrica si trova in Edificio 4, Via Xingyuan, Nanfeng, Zhangjiagang, Provincia di Jiangsu, Cina.',
    ],
    [
      'La nostra fabbrica si trova nel distretto di Jiading, Jiangsu.',
      'La nostra fabbrica si trova in Edificio 4, Via Xingyuan, Nanfeng, Zhangjiagang, Provincia di Jiangsu, Cina.',
    ],
  ],
  es: [
    ['Distrito de Jiading, Jiangsu China', 'Edificio 4, Calle Xingyuan, Nanfeng, Zhangjiagang, Provincia de Jiangsu, China'],
    [
      'Calle Xupan, Nº 2009, Distrito de Jiading, Shanghái, China. Código postal: 201808',
      'Edificio 4, Calle Xingyuan, Nanfeng, Zhangjiagang, Provincia de Jiangsu, China',
    ],
    [
      'Calle Xupan, Nº 2009, Distrito de Jiading, Jiangsu, China. Código postal: 201808',
      'Edificio 4, Calle Xingyuan, Nanfeng, Zhangjiagang, Provincia de Jiangsu, China',
    ],
    [
      'Un espacio de fábrica de más de 2.600 metros cuadrados, ubicado en el n.º 2009 de la calle Xupan, distrito de Jiading, Jiangsu, China.',
      'Un espacio de fábrica de más de 2.600 metros cuadrados, ubicado en el Edificio 4, Calle Xingyuan, Nanfeng, Zhangjiagang, Provincia de Jiangsu, China.',
    ],
    [
      'Una nave industrial de más de 2600 metros cuadrados, ubicada en el Nº 2009 de la Calle Xupan, Distrito de Jiading, Shanghái, China.',
      'Una nave industrial de más de 2600 metros cuadrados, ubicada en el Edificio 4, Calle Xingyuan, Nanfeng, Zhangjiagang, Provincia de Jiangsu, China.',
    ],
    [
      'La fábrica de KIWL está ubicada en el distrito de Jiading, Shanghái, China, y cuenta con un taller de más de 2600 metros cuadrados.',
      'La fábrica de KIWL está ubicada en Nanfeng, Zhangjiagang, provincia de Jiangsu, China, y cuenta con un taller de más de 2600 metros cuadrados.',
    ],
    [
      'Nuestra fábrica está ubicada en el distrito de Jiading en Jiangsu.',
      'Nuestra fábrica está ubicada en el Edificio 4, Calle Xingyuan, Nanfeng, Zhangjiagang, Provincia de Jiangsu, China.',
    ],
    [
      'Nuestra fábrica está ubicada en el distrito de Jiading, Shanghái.',
      'Nuestra fábrica está ubicada en el Edificio 4, Calle Xingyuan, Nanfeng, Zhangjiagang, Provincia de Jiangsu, China.',
    ],
    [
      'Nuestra f\u00e1brica est\u00e1 ubicada en el distrito de Jiading, Shangh\u00e1i.',
      'Nuestra f\u00e1brica est\u00e1 ubicada en el Edificio 4, Calle Xingyuan, Nanfeng, Zhangjiagang, Provincia de Jiangsu, China.',
    ],
  ],
  pl: [
    ['Dzielnica Jiading, Jiangsu, Chiny', 'Budynek 4, ul. Xingyuan, Nanfeng, Zhangjiagang, Prowincja Jiangsu, Chiny'],
    [
      'ul. Xupan 2009, Dystrykt Jiading, Jiangsu, Chiny. Kod pocztowy: 201808',
      'Budynek 4, ul. Xingyuan, Nanfeng, Zhangjiagang, Prowincja Jiangsu, Chiny',
    ],
    [
      'Powierzchnia fabryki wynosząca ponad 2600 metrów kwadratowych, zlokalizowana przy ulicy Xupan 2009, w Dystrykcie Jiading, Jiangsu, Chiny.',
      'Powierzchnia fabryki wynosząca ponad 2600 metrów kwadratowych, zlokalizowana przy Budynek 4, ul. Xingyuan, Nanfeng, Zhangjiagang, Prowincja Jiangsu, Chiny.',
    ],
    [
      'Fabryka KIWL zlokalizowana jest w dzielnicy Jiading, Jiangsu, Chiny, i posiada warsztat o powierzchni ponad 2600 metrów kwadratowych.',
      'Fabryka KIWL zlokalizowana jest w Nanfeng, Zhangjiagang, prowincja Jiangsu, Chiny, i posiada warsztat o powierzchni ponad 2600 metrów kwadratowych.',
    ],
    [
      'Nasza fabryka zlokalizowana jest w dzielnicy Jiading w Szanghaju.',
      'Nasza fabryka zlokalizowana jest przy Budynek 4, ul. Xingyuan, Nanfeng, Zhangjiagang, Prowincja Jiangsu, Chiny.',
    ],
  ],
  pt: [
    ['Distrito de Jiading, Jiangsu China', 'Edifício 4, Estrada Xingyuan, Nanfeng, Zhangjiagang, Província de Jiangsu, China'],
    [
      'Estrada Xupan, Nº 2009, Distrito de Jiading, Jiangsu, China. Código Postal: 201808',
      'Edifício 4, Estrada Xingyuan, Nanfeng, Zhangjiagang, Província de Jiangsu, China',
    ],
    [
      'Um espaço de fábrica com mais de 2.600 metros quadrados, localizado na Estrada Xupan, Nº 2009, Distrito de Jiading, Jiangsu, China.',
      'Um espaço de fábrica com mais de 2.600 metros quadrados, localizado no Edifício 4, Estrada Xingyuan, Nanfeng, Zhangjiagang, Província de Jiangsu, China.',
    ],
    [
      'Uma fábrica com mais de 2600 metros quadrados, localizada na Estrada Xupan, Nº 2009, Distrito de Jiading, Jiangsu, China.',
      'Uma fábrica com mais de 2600 metros quadrados, localizada no Edifício 4, Estrada Xingyuan, Nanfeng, Zhangjiagang, Província de Jiangsu, China.',
    ],
    [
      'A fábrica da KIWL está localizada no distrito de Jiading, Jiangsu, China, e conta com uma oficina de mais de 2600 metros quadrados.',
      'A fábrica da KIWL está localizada em Nanfeng, Zhangjiagang, província de Jiangsu, China, e conta com uma oficina de mais de 2600 metros quadrados.',
    ],
    [
      'A nossa fábrica está localizada no Distrito de Jiading, em Jiangsu.',
      'A nossa fábrica está localizada no Edifício 4, Estrada Xingyuan, Nanfeng, Zhangjiagang, Província de Jiangsu, China.',
    ],
    [
      'Nossa fábrica está localizada no distrito de Jiading, Jiangsu.',
      'Nossa fábrica está localizada no Edifício 4, Estrada Xingyuan, Nanfeng, Zhangjiagang, Província de Jiangsu, China.',
    ],
    [
      'Nossa f\u00e1brica est\u00e1 localizada no distrito de Jiading, Jiangsu.',
      'Nossa f\u00e1brica est\u00e1 localizada no Edif\u00edcio 4, Estrada Xingyuan, Nanfeng, Zhangjiagang, Prov\u00edncia de Jiangsu, China.',
    ],
  ],
  ru: [
    ['Район Цзядин, Jiangsu, Китай', 'Здание 4, ул. Синъюань, г. Наньфэн, Чжанцзяган, пров. Цзянсу, Китай'],
    [
      'Китай, г. Jiangsu, район Цзядин, ул. Сюпань, д. 2009. Почтовый индекс: 201808',
      'Китай, пров. Цзянсу, г. Чжанцзяган, пос. Наньфэн, ул. Синъюань, д. 4',
    ],
    [
      'Производственная площадь более 2600 квадратных метров, расположенная по адресу: Китай, г. Jiangsu, район Цзядин, ул. Сюпань, д. 2009.',
      'Производственная площадь более 2600 квадратных метров, расположенная по адресу: Китай, пров. Цзянсу, г. Чжанцзяган, пос. Наньфэн, ул. Синъюань, д. 4.',
    ],
    [
      'Завод KIWL расположен в районе Цзядин, Jiangsu, Китай, с мастерской площадью более 2600 квадратных метров.',
      'Завод KIWL расположен в Наньфэне, Чжанцзягане, провинция Цзянсу, Китай, с мастерской площадью более 2600 квадратных метров.',
    ],
    [
      'Наш завод расположен в районе Цзядин, Jiangsu.',
      'Наш завод расположен по адресу: здание 4, ул. Синъюань, пос. Наньфэн, г. Чжанцзяган, пров. Цзянсу, Китай.',
    ],
    [
      'Наш завод расположен в районе Цзядин в Цзянсу.',
      'Наш завод расположен по адресу: здание 4, ул. Синъюань, пос. Наньфэн, г. Чжанцзяган, пров. Цзянсу, Китай.',
    ],
  ],
};

function detectLang(fp) {
  const rel = path.relative(siteRoot, fp).replace(/\\/g, '/');
  const base = path.basename(fp);
  if (ROOT_LANG_FILES[base]) return ROOT_LANG_FILES[base];
  const top = rel.split('/')[0];
  if (LANG_DIRS.has(top)) return top;
  return 'en';
}

function applyReplacements(html, pairs) {
  const sorted = [...pairs].sort((a, b) => b[0].length - a[0].length);
  let out = html;
  for (const [from, to] of sorted) {
    if (out.includes(from)) out = out.split(from).join(to);
  }
  return out;
}

const stats = { files: 0, phone: 0, address: 0 };

function processFile(fp) {
  let html = fs.readFileSync(fp, 'utf8');
  const orig = html;
  const lang = detectLang(fp);

  for (const [from, to] of PHONE_REPLACEMENTS) {
    const n = (html.match(new RegExp(from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
    if (n) {
      html = html.split(from).join(to);
      stats.phone += n;
    }
  }

  html = applyReplacements(html, GLOBAL_ADDRESS_REPLACEMENTS);
  html = applyReplacements(html, LANG_REPLACEMENTS[lang] || []);

  if (html.includes(MAP_OLD)) html = html.split(MAP_OLD).join(MAP_NEW);

  if (html !== orig) {
    fs.writeFileSync(fp, html, 'utf8');
    stats.files++;
    stats.address++;
  }
}

function walk(d) {
  for (const ent of fs.readdirSync(d, { withFileTypes: true })) {
    const f = path.join(d, ent.name);
    if (ent.isDirectory()) {
      if (SKIP_DIRS.has(ent.name)) continue;
      walk(f);
    } else if (ent.name.endsWith('.html')) processFile(f);
  }
}

walk(siteRoot);

const report = [
  '联系方式与地址更新报告',
  `时间: ${new Date().toISOString()}`,
  `修改文件: ${stats.files}`,
  `电话替换次数: ${stats.phone}`,
  '',
  '抽样:',
  ...['index.html', 'zh/index.html', 'pl/index.html', 'contact.html', 'zh/联系.html'].map((p) => {
    const fp = path.join(siteRoot, p);
    if (!fs.existsSync(fp)) return `${p}: 不存在`;
    const h = fs.readFileSync(fp, 'utf8');
    const phone = h.includes('18151132311') ? 'OK' : 'MISSING';
    const addr = h.includes('兴园路') || h.includes('Xingyuan') || h.includes('Синъюань') ? 'OK' : 'CHECK';
    return `${p}\n  phone: ${phone}\n  address: ${addr}`;
  }),
].join('\n');

fs.writeFileSync(path.join(siteRoot, 'contact_update_report.txt'), report, 'utf8');
console.log(report);
