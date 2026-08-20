import fs from 'node:fs';

const read = (file) => fs.readFileSync(file, 'utf8');
const write = (file, value) => fs.writeFileSync(file, value, 'utf8');

const pages = {
  'index.html': {
    title: 'Restaurant & Pizzerie în Bulgăruș, Timiș | OLIZAN',
    description: 'OLIZAN Restaurant & Pizzeria în Bulgăruș, Timiș: pizza, burgeri, ciorbe, grătare și deserturi. Aproape de Lenauheim, Gottlob și Lovrin.'
  },
  'meniu.html': {
    title: 'Meniu OLIZAN | Pizzerie în Bulgăruș, Timiș',
    description: 'Vezi meniul OLIZAN din Bulgăruș, Timiș: pizza 33/50 cm, burgeri, paste, ciorbe, grătare și deserturi. Ușor accesibil din Lenauheim, Gottlob și Lovrin.'
  },
  'despre.html': {
    title: 'OLIZAN Restaurant & Pizzeria | Bulgăruș, Timiș',
    description: 'Descoperă OLIZAN Restaurant & Pizzeria din Bulgăruș, Timiș: preparate italiene și românești, pizza la comandă și ospitalitate pentru clienții din zonă.'
  },
  'locatie.html': {
    title: 'Locație OLIZAN | Restaurant în Bulgăruș, Timiș',
    description: 'Găsește OLIZAN Restaurant & Pizzeria în Bulgăruș, Timiș, nr. 245/A. Locație convenabilă pentru clienți din Lenauheim, Gottlob, Lovrin și împrejurimi.'
  },
  'contact.html': {
    title: 'Contact OLIZAN | Restaurant & Pizzerie Bulgăruș',
    description: 'Contact OLIZAN Restaurant & Pizzeria din Bulgăruș, Timiș: telefon, WhatsApp și e-mail pentru comenzi, rezervări și informații.'
  },
  'inchiriere-sala.html': {
    title: 'Sală Evenimente Bulgăruș, Timiș | OLIZAN',
    description: 'Sală de evenimente OLIZAN în Bulgăruș, Timiș: 130 mp, până la 80 de persoane, pentru botezuri, aniversări și evenimente de familie.'
  },
  'galerie.html': {
    title: 'Galerie OLIZAN | Restaurant & Pizzerie Bulgăruș',
    description: 'Galerie OLIZAN Restaurant & Pizzeria din Bulgăruș, Timiș: imagini din meniu, restaurant și preparate, pentru clienții din zonă.'
  }
};

function replaceRequired(html, regex, replacement, label) {
  if (!regex.test(html)) throw new Error(`[seo-local] Nu am găsit ${label}`);
  return html.replace(regex, replacement);
}

function updateHead(file, meta) {
  let html = read(file);
  html = replaceRequired(html, /<title>[\s\S]*?<\/title>/i, `<title>${meta.title}</title>`, `${file}: title`);
  html = replaceRequired(html, /<meta\s+name="description"\s+content="[^"]*"\s*\/?\s*>/i, `<meta name="description" content="${meta.description}">`, `${file}: meta description`);
  html = replaceRequired(html, /<meta\s+property="og:title"\s+content="[^"]*"\s*\/?\s*>/i, `<meta property="og:title" content="${meta.title}">`, `${file}: og:title`);
  html = replaceRequired(html, /<meta\s+property="og:description"\s+content="[^"]*"\s*\/?\s*>/i, `<meta property="og:description" content="${meta.description}">`, `${file}: og:description`);
  html = replaceRequired(html, /<meta\s+name="twitter:title"\s+content="[^"]*"\s*\/?\s*>/i, `<meta name="twitter:title" content="${meta.title}">`, `${file}: twitter:title`);
  html = replaceRequired(html, /<meta\s+name="twitter:description"\s+content="[^"]*"\s*\/?\s*>/i, `<meta name="twitter:description" content="${meta.description}">`, `${file}: twitter:description`);
  write(file, html);
}

for (const [file, meta] of Object.entries(pages)) updateHead(file, meta);

// Homepage: întărește identitatea entității locale fără a schimba nimic vizual.
{
  const file = 'index.html';
  let html = read(file);
  const match = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/i);
  if (!match) throw new Error('[seo-local] index.html: schema Restaurant lipsește');

  let restaurant;
  try { restaurant = JSON.parse(match[1]); }
  catch (error) { throw new Error(`[seo-local] index.html: schema Restaurant nu este JSON valid: ${error.message}`); }

  restaurant.alternateName = ['Pizzeria Restaurant Olizan', 'OLIZAN'];
  restaurant.hasMap = 'https://www.google.com/maps/place//data=!4m2!3m1!1s0x47451bbc4e1e6c1f:0x454e48f3946a813?sa=X&ved=1t:8290&ictx=111';
  restaurant.areaServed = [
    { '@type': 'Place', name: 'Bulgăruș, Timiș' },
    { '@type': 'Place', name: 'Lenauheim, Timiș' },
    { '@type': 'Place', name: 'Gottlob, Timiș' },
    { '@type': 'Place', name: 'Lovrin, Timiș' }
  ];

  const restaurantScript = `<script type="application/ld+json">${JSON.stringify(restaurant, null, 2)}</script>`;
  html = html.replace(match[0], restaurantScript);

  if (!html.includes('"@type": "WebSite"')) {
    const website = {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      '@id': 'https://www.restaurantolizan.ro/#website',
      url: 'https://www.restaurantolizan.ro/',
      name: 'OLIZAN Restaurant & Pizzeria',
      alternateName: ['Pizzeria Restaurant Olizan', 'OLIZAN'],
      inLanguage: 'ro-RO',
      publisher: { '@id': 'https://www.restaurantolizan.ro/#restaurant' }
    };
    html = html.replace('</head>', `  <script type="application/ld+json">${JSON.stringify(website, null, 2)}</script>\n</head>`);
  }

  write(file, html);
}

// Actualizează lastmod pentru paginile comerciale modificate.
{
  const file = 'sitemap.xml';
  let xml = read(file);
  const slugs = ['', 'meniu', 'despre', 'locatie', 'contact', 'inchiriere-sala', 'galerie'];
  for (const slug of slugs) {
    const url = slug ? `https://www\\.restaurantolizan\\.ro/${slug}` : 'https://www\\.restaurantolizan\\.ro/';
    const re = new RegExp(`(<loc>${url}<\\/loc>\\s*<lastmod>)[^<]+`);
    if (!re.test(xml)) throw new Error(`[seo-local] sitemap.xml: lipsește ${slug || 'homepage'}`);
    xml = xml.replace(re, '$1' + '2026-08-20');
  }
  write(file, xml);
}

// Validări ca SEO-ul să nu degradeze în deploy-uri viitoare.
for (const [file] of Object.entries(pages)) {
  const html = read(file);
  const title = (html.match(/<title>([\s\S]*?)<\/title>/i) || [])[1] || '';
  const description = (html.match(/<meta\s+name="description"\s+content="([^"]*)"/i) || [])[1] || '';
  const canonical = (html.match(/<link\s+rel="canonical"\s+href="([^"]+)"/i) || [])[1] || '';
  if (!title || title.length > 65) throw new Error(`[seo-local] ${file}: title invalid (${title.length})`);
  if (description.length < 110 || description.length > 170) throw new Error(`[seo-local] ${file}: meta description invalidă (${description.length})`);
  if (!canonical.startsWith('https://www.restaurantolizan.ro')) throw new Error(`[seo-local] ${file}: canonical invalid`);
}

console.log('[seo-local] Metadata locală și structured data validate; designul nu a fost modificat.');
