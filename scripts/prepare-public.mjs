import fs from 'node:fs';

const read = (file) => fs.readFileSync(file, 'utf8');
const write = (file, value) => fs.writeFileSync(file, value, 'utf8');

function replaceOptional(value, pattern, replacement, label) {
  const found = typeof pattern === 'string' ? value.includes(pattern) : pattern.test(value);
  if (!found) {
    console.log(`[prepare-public] ${label}: deja curat sau nu se mai aplică.`);
    return value;
  }
  return value.replace(pattern, replacement);
}

const bannerAdmin = /\s*<div class="notice notice--gold">\s*<svg[\s\S]*?<\/svg>\s*<div>\s*<p><strong>Notă pentru administratorul site-ului:<\/strong>[\s\S]*?<\/p>\s*<\/div>\s*<\/div>/;

// Termeni și condiții: fără instrucțiuni interne sau condiții comerciale inventate.
{
  const file = 'termeni-si-conditii.html';
  let html = read(file);
  html = replaceOptional(html, bannerAdmin, '', `${file}: banner intern`);
  html = replaceOptional(
    html,
    /<p><span class="todo">De completat de administrator: informațiile despre livrare[\s\S]*?<\/span><\/p>/,
    '<p>Pentru condițiile actuale privind livrarea sau ridicarea, zonele deservite, eventualele costuri ori praguri minime, metodele de plată și programul de funcționare, te rugăm să confirmi înainte de comandă la <a href="tel:+40720409320">+40 720 409 320</a> sau pe <a href="https://wa.me/40723639875" target="_blank" rel="noopener noreferrer">WhatsApp</a>.</p>',
    `${file}: condiții comerciale`,
  );
  html = html.replace('Ultima actualizare: 11 august 2026', 'Ultima actualizare: 20 august 2026');
  write(file, html);
}

// Confidențialitate: formulări generale, fără furnizori sau termene de retenție inventate.
{
  const file = 'politica-de-confidentialitate.html';
  let html = read(file);
  html = replaceOptional(html, bannerAdmin, '', `${file}: banner intern`);
  html = replaceOptional(
    html,
    /<p><span class="todo">De completat de administrator: lista completă a furnizorilor[\s\S]*?<\/span><\/p>/,
    '<p>Dacă sunt utilizați și alți furnizori necesari activității restaurantului care primesc date cu caracter personal, datele sunt transmise numai în măsura necesară scopului respectiv și în condițiile prevăzute de legislația aplicabilă.</p>',
    `${file}: furnizori`,
  );
  html = replaceOptional(
    html,
    /<span class="todo">De completat de administrator: perioada exactă de[\s\S]*?<\/span>/,
    'Datele sunt șterse sau anonimizate atunci când nu mai sunt necesare, cu excepția situațiilor în care o obligație legală impune păstrarea lor pentru o perioadă mai lungă.',
    `${file}: retenție`,
  );
  html = html.replace('Ultima actualizare: 11 august 2026', 'Ultima actualizare: 20 august 2026');
  write(file, html);
}

// GDPR: canal public clar pentru solicitări, fără a presupune existența unui DPO.
{
  const file = 'protectia-datelor-gdpr.html';
  let html = read(file);
  html = replaceOptional(html, bannerAdmin, '', `${file}: banner intern`);
  html = replaceOptional(
    html,
    /<p><span class="todo">De completat de administrator, dacă este cazul:[\s\S]*?<\/span><\/p>/,
    '<p>Pentru întrebări privind protecția datelor sau pentru exercitarea drepturilor tale, poți folosi datele de contact ale operatorului indicate mai sus.</p>',
    `${file}: DPO`,
  );
  html = html.replace('Ultima actualizare: 11 august 2026', 'Ultima actualizare: 20 august 2026');
  write(file, html);
}

// Locație: fără formulare de tip „administratorul trebuie să completeze”.
{
  const file = 'locatie.html';
  let html = read(file);
  html = replaceOptional(
    html,
    /Programul de funcționare urmează să fie completat de administratorul restaurantului\. Până atunci,\s*te rugăm să ne suni la <a href="tel:\+40720409320">\+40 720 409 320<\/a> pentru a confirma că suntem deschiși\./,
    'Pentru programul actualizat, te rugăm să ne suni la <a href="tel:+40720409320">+40 720 409 320</a> înainte de vizită.',
    `${file}: program`,
  );
  write(file, html);
}

// Despre noi: fără promisiuni neconfirmate sau instrucțiuni interne.
{
  const file = 'despre.html';
  let html = read(file);
  html = replaceOptional(
    html,
    /Programul de funcționare, informațiile despre livrare și zonele deservite urmează să fie completate de\s*administratorul restaurantului\. Până atunci, te rugăm să ne suni la <a href="tel:\+40720409320">\+40 720 409 320<\/a> pentru\s*confirmarea disponibilității\./,
    'Pentru programul actualizat și informațiile curente despre livrare, te rugăm să ne suni la <a href="tel:+40720409320">+40 720 409 320</a> înainte de comandă sau vizită.',
    `${file}: program și livrare`,
  );
  html = replaceOptional(
    html,
    /<p><strong>Fotografii reale, în curând\.<\/strong> Ilustrațiile de pe acest site sunt desene originale, create\s*special pentru OLIZAN\. Nu folosim fotografii generice prezentate drept imagini din restaurant\. Secțiunea de\s*galerie este pregătită pentru fotografiile autentice ale echipei, ale bucătăriei și ale preparatelor\.<\/p>/,
    '<p><strong>Ilustrații originale OLIZAN.</strong> Imaginile ilustrative de pe site sunt desene originale create special pentru OLIZAN; nu folosim fotografii generice prezentate drept imagini ale restaurantului sau ale preparatelor.</p>',
    `${file}: mesaj imagini`,
  );
  write(file, html);
}

// Homepage: distincția „Firma de Aur” rămâne vizibilă, dar nu mai acoperă
// conținutul aproape patru secunde. 1,8 s este suficient pentru recunoaștere,
// iar eliminarea DOM este sincronizată cu tranziția CSS de 0,35 s.
{
  const file = 'index.html';
  let html = read(file);
  html = replaceOptional(html, 'se stinge singur după ~3,5 s.', 'se stinge singur după ~1,8 s.', `${file}: comentariu overlay`);
  html = replaceOptional(html, '      }, 700);', '      }, 400);', `${file}: eliminare overlay`);
  html = replaceOptional(html, '    ceas = window.setTimeout(inchide, 3500);', '    ceas = window.setTimeout(inchide, 1800);', `${file}: durată overlay`);
  write(file, html);
}

// SEO comercial: titluri și descrieri suficient de scurte pentru snippet și
// termeni locali expliciți în paginile care trebuie să aducă trafic organic.
{
  const file = 'index.html';
  let html = read(file);
  const oldTitle = 'OLIZAN Restaurant & Pizzeria Bulgăruș — pizza, burgeri și mâncare gătită';
  const newTitle = 'Restaurant & Pizzerie în Bulgăruș | OLIZAN';
  const oldDesc = 'Restaurant și pizzerie în Bulgăruș, județul Timiș. Pizza coaptă la comandă, paste, burgeri, ciorbe, grătare și deserturi. Comandă pe WhatsApp la +40 723 639 875.';
  const newDesc = 'OLIZAN Restaurant & Pizzeria din Bulgăruș, Timiș: pizza, paste, burgeri, ciorbe, grătare și deserturi. Comandă rapid prin WhatsApp.';
  html = html.split(oldTitle).join(newTitle);
  html = html.split(oldDesc).join(newDesc);
  html = replaceOptional(html, '<h1>Gust italian, ospitalitate românească</h1>', '<h1>Restaurant &amp; Pizzerie în Bulgăruș</h1>', `${file}: H1 local`);
  html = replaceOptional(
    html,
    '<p class="hero-sub">Pizza, paste, burgeri și preparate delicioase, pregătite cu grijă pentru fiecare client,\n            chiar în inima localității Bulgăruș.</p>',
    '<p class="hero-sub">Gust italian, ospitalitate românească. Pizza, paste, burgeri și preparate delicioase, pregătite cu grijă pentru fiecare client.</p>',
    `${file}: slogan hero`,
  );
  html = replaceOptional(html, '  "name": "OLIZAN Restaurant & Pizzeria",', '  "name": "OLIZAN Restaurant & Pizzeria",\n  "alternateName": "Pizzeria Restaurant Olizan",', `${file}: alternateName schema`);
  write(file, html);
}

{
  const file = 'meniu.html';
  let html = read(file);
  const oldTitle = 'Meniu — pizza, burgeri, ciorbe și deserturi | OLIZAN Bulgăruș';
  const newTitle = 'Meniu OLIZAN Bulgăruș | Pizza, burgeri și preparate';
  const oldDesc = 'Meniul complet OLIZAN Restaurant & Pizzeria din Bulgăruș: pizza normală și family, meniuri, burgeri, ciorbe, grătare, garnituri, salate, sosuri, bar și deserturi, cu prețuri actualizate.';
  const newDesc = 'Vezi meniul OLIZAN din Bulgăruș: pizza 33/50 cm, burgeri, ciorbe, grătare, salate, deserturi și băuturi, cu prețuri actualizate.';
  html = html.split(oldTitle).join(newTitle);
  html = html.split(oldDesc).join(newDesc);
  html = replaceOptional(html, '<h1>Meniu OLIZAN</h1>', '<h1>Meniu OLIZAN Bulgăruș</h1>', `${file}: H1 local`);
  write(file, html);
}

{
  const file = 'inchiriere-sala.html';
  let html = read(file);
  const oldDesc = 'Sala de evenimente a restaurantului OLIZAN din Bulgăruș, județul Timiș: 130 mp și până la 80 de persoane. Vezi fotografiile, calendarul disponibilității și trimite o cerere de rezervare.';
  const newDesc = 'Sală de evenimente OLIZAN în Bulgăruș, Timiș: 130 mp, până la 80 de persoane, calendar de disponibilitate și cerere de rezervare.';
  html = html.split(oldDesc).join(newDesc);
  html = replaceOptional(html, '<h1>Închiriere sală</h1>', '<h1>Închiriere sală de evenimente în Bulgăruș</h1>', `${file}: H1 local`);
  write(file, html);
}

// Galerie: elimină orice referință publică la README sau instrucțiuni de lucru.
{
  const file = 'galerie.html';
  let html = read(file);
  html = replaceOptional(
    html,
    '<p>Secțiunea este pregătită pentru fotografiile autentice ale restaurantului (preparate, interior, terasă).\n              Instrucțiunile de înlocuire se găsesc în fișierul <code>README.md</code>.</p>',
    '<p>Fotografiile autentice încărcate de echipa OLIZAN apar automat în galerie, alături de imaginile meniului și ilustrațiile originale.</p>',
    `${file}: fără instrucțiuni interne`,
  );
  write(file, html);
}

// Galeria sălii este ascunsă până când există fotografii reale încărcate din panou.
for (const file of ['index.html', 'inchiriere-sala.html']) {
  let html = read(file);
  html = replaceOptional(
    html,
    /<div class="sala-galerie reveal" data-sala-galerie>[\s\S]*?<\/div>\s*(?=<div class="sala-rezervare">)/,
    '<div class="sala-galerie reveal" data-sala-galerie hidden></div>\n\n        ',
    `${file}: galerie sală`,
  );
  write(file, html);
}

// Modulul sălii afișează numai fotografiile reale existente; zero imagini => galerie ascunsă.
{
  const file = 'assets/js/sala.js';
  let js = read(file);
  js = replaceOptional(
    js,
    '    var lista = Array.isArray(imagini) ? imagini : [];\n    var bucati = lista.slice(0, 4).map(function (f) {',
    '    var lista = Array.isArray(imagini) ? imagini : [];\n    if (!lista.length) { zona.hidden = true; zona.innerHTML = ""; return; }\n    zona.hidden = false;\n    var bucati = lista.slice(0, 4).map(function (f) {',
    `${file}: galerie goală`,
  );
  js = replaceOptional(
    js,
    '    while (bucati.length < 4) bucati.push(locGol());\n    zona.innerHTML = bucati.join("");',
    '    zona.innerHTML = bucati.join("");',
    `${file}: placeholder-e`,
  );
  write(file, js);
}

// Sitemap: actualizează data paginilor modificate în această revizie.
{
  const file = 'sitemap.xml';
  let xml = read(file);
  for (const slug of ['', 'meniu', 'despre', 'locatie', 'inchiriere-sala', 'galerie', 'politica-de-confidentialitate', 'protectia-datelor-gdpr', 'termeni-si-conditii']) {
    const loc = slug ? `https://www\\.restaurantolizan\\.ro/${slug}` : 'https://www\\.restaurantolizan\\.ro/';
    const re = new RegExp(`(<loc>${loc}<\\/loc>\\s*<lastmod>)[^<]+`);
    xml = replaceOptional(xml, re, '$1' + '2026-08-20', `sitemap: ${slug || 'home'}`);
  }
  write(file, xml);
}

// Validare de producție: nu publicăm instrucțiuni interne sau placeholder-e „în curând”.
for (const file of fs.readdirSync('.').filter((name) => name.endsWith('.html'))) {
  const html = read(file);
  if (/Notă pentru administratorul site-ului|De completat de administrator|urmează să fie completat(?:e)? de administratorul restaurantului|Fotografii reale, în curând|Fotografie în curând|Instrucțiunile de înlocuire se găsesc în fișierul/.test(html)) {
    throw new Error(`Text intern/placeholder rămas în ${file}`);
  }
}

console.log('[prepare-public] Conținutul public și SEO comercial sunt curate.');
