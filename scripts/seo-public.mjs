import fs from 'node:fs';

const read = (file) => fs.readFileSync(file, 'utf8');
const write = (file, value) => fs.writeFileSync(file, value, 'utf8');

function replaceOptional(value, pattern, replacement, label) {
  const found = typeof pattern === 'string' ? value.includes(pattern) : pattern.test(value);
  if (!found) {
    console.log(`[seo] ${label}: deja optimizat sau nu se mai aplică.`);
    return value;
  }
  return value.replace(pattern, replacement);
}

const entitySchema = `
<script type="application/ld+json">{
  "@context": "https://schema.org",
  "@type": "Restaurant",
  "@id": "https://www.restaurantolizan.ro/#restaurant",
  "name": "OLIZAN Restaurant & Pizzeria",
  "alternateName": "Pizzeria Restaurant Olizan",
  "url": "https://www.restaurantolizan.ro/",
  "telephone": "+40720409320",
  "email": "olizan1@yahoo.com",
  "hasMenu": "https://www.restaurantolizan.ro/meniu",
  "servesCuisine": ["Italiană", "Românească", "Pizza"],
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "245/A",
    "addressLocality": "Bulgăruș",
    "addressRegion": "Timiș",
    "postalCode": "307241",
    "addressCountry": "RO"
  },
  "sameAs": ["https://www.facebook.com/byOliviaZan"]
}</script>`;

// Locație: H1 descriptiv + entitatea locală legată de același @id ca homepage-ul.
{
  const file = 'locatie.html';
  let html = read(file);
  html = replaceOptional(html, '<h1>Unde ne găsești</h1>', '<h1>Locația OLIZAN în Bulgăruș</h1>', `${file}: H1`);
  if (!html.includes('https://www.restaurantolizan.ro/#restaurant')) {
    html = html.replace('</head>', `${entitySchema}\n</head>`);
  }
  write(file, html);
}

// Contact: pagina spune explicit brandul și conectează datele NAP la entitatea Restaurant.
{
  const file = 'contact.html';
  let html = read(file);
  html = replaceOptional(html, '<h1>Hai să vorbim</h1>', '<h1>Contact OLIZAN Restaurant & Pizzeria</h1>', `${file}: H1`);
  if (!html.includes('https://www.restaurantolizan.ro/#restaurant')) {
    html = html.replace('</head>', `${entitySchema}\n</head>`);
  }
  write(file, html);
}

// Galerie: H1-ul generic devine descriptiv pentru brand.
{
  const file = 'galerie.html';
  let html = read(file);
  html = replaceOptional(html, '<h1>Meniul nostru, în imagini</h1>', '<h1>Galerie OLIZAN Restaurant & Pizzeria</h1>', `${file}: H1`);
  write(file, html);
}

// SEO lint pentru paginile comerciale. Build-ul se oprește dacă o modificare
// viitoare elimină canonicalul, descrierea, H1-ul sau creează snippet-uri exagerat de lungi.
const pages = ['index.html', 'meniu.html', 'despre.html', 'locatie.html', 'inchiriere-sala.html', 'galerie.html', 'contact.html'];
for (const file of pages) {
  const html = read(file);
  const title = html.match(/<title>([^<]+)<\/title>/i)?.[1]?.trim() || '';
  const desc = html.match(/<meta\s+name="description"\s+content="([^"]*)"/i)?.[1]?.trim() || '';
  const canonical = html.match(/<link\s+rel="canonical"\s+href="([^"]+)"/i)?.[1]?.trim() || '';
  const h1Count = (html.match(/<h1\b/gi) || []).length;
  const robots = html.match(/<meta\s+name="robots"\s+content="([^"]+)"/i)?.[1]?.toLowerCase() || '';

  if (!title || title.length > 65) throw new Error(`${file}: title SEO invalid (${title.length} caractere)`);
  if (!desc || desc.length > 165) throw new Error(`${file}: meta description invalidă (${desc.length} caractere)`);
  if (!canonical.startsWith('https://www.restaurantolizan.ro/')) throw new Error(`${file}: canonical invalid`);
  if (h1Count !== 1) throw new Error(`${file}: trebuie exact un H1, găsite ${h1Count}`);
  if (!robots.includes('index') || !robots.includes('follow')) throw new Error(`${file}: robots trebuie index, follow`);
}

console.log(`[seo] ${pages.length} pagini comerciale validate: title, description, canonical, H1 și robots OK.`);
