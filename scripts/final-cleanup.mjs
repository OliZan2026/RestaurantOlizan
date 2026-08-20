import fs from 'node:fs';

function read(file) { return fs.readFileSync(file, 'utf8'); }
function write(file, value) { fs.writeFileSync(file, value, 'utf8'); }
function replaceOptional(value, pattern, replacement, label) {
  if (!pattern.test(value)) {
    console.log(`[final-cleanup] ${label}: deja curat sau nu se mai aplică.`);
    return value;
  }
  return value.replace(pattern, replacement);
}

const bannerAdmin = /\s*<div class="notice notice--gold">\s*<svg[\s\S]*?<\/svg>\s*<div>\s*<p><strong>Notă pentru administratorul site-ului:<\/strong>[\s\S]*?<\/p>\s*<\/div>\s*<\/div>/;

// Termeni și condiții: elimină instrucțiunile interne și păstrează doar informație publică verificabilă.
{
  const file = 'termeni-si-conditii.html';
  let html = read(file);
  html = replaceOptional(html, bannerAdmin, '', `${file} banner admin`);
  html = replaceOptional(
    html,
    /<p><span class="todo">De completat de administrator: informațiile despre livrare[\s\S]*?<\/span><\/p>/,
    '<p>Pentru condițiile actuale privind livrarea sau ridicarea, zonele deservite, eventualele costuri ori praguri minime, metodele de plată și programul de funcționare, te rugăm să confirmi înainte de comandă la <a href="tel:+40720409320">+40 720 409 320</a> sau pe <a href="https://wa.me/40723639875" target="_blank" rel="noopener noreferrer">WhatsApp</a>.</p>',
    `${file} condiții comerciale`,
  );
  html = html.replace('Ultima actualizare: 11 august 2026', 'Ultima actualizare: 20 august 2026');
  write(file, html);
}

// Confidențialitate: fără liste sau termene inventate; formulări neutre și conforme.
{
  const file = 'politica-de-confidentialitate.html';
  let html = read(file);
  html = replaceOptional(html, bannerAdmin, '', `${file} banner admin`);
  html = replaceOptional(
    html,
    /<p><span class="todo">De completat de administrator: lista completă a furnizorilor[\s\S]*?<\/span><\/p>/,
    '<p>Dacă sunt utilizați și alți furnizori necesari activității restaurantului care primesc date cu caracter personal, datele sunt transmise numai în măsura necesară scopului respectiv și în condițiile prevăzute de legislația aplicabilă.</p>',
    `${file} furnizori`,
  );
  html = replaceOptional(
    html,
    /<span class="todo">De completat de administrator: perioada exactă de[\s\S]*?<\/span>/,
    'Datele sunt șterse sau anonimizate atunci când nu mai sunt necesare, cu excepția situațiilor în care o obligație legală impune păstrarea lor pentru o perioadă mai lungă.',
    `${file} retenție`,
  );
  html = html.replace('Ultima actualizare: 11 august 2026', 'Ultima actualizare: 20 august 2026');
  write(file, html);
}

// GDPR: elimină nota internă despre DPO; contactul operatorului rămâne canalul public corect.
{
  const file = 'protectia-datelor-gdpr.html';
  let html = read(file);
  html = replaceOptional(html, bannerAdmin, '', `${file} banner admin`);
  html = replaceOptional(
    html,
    /<p><span class="todo">De completat de administrator, dacă este cazul:[\s\S]*?<\/span><\/p>/,
    '<p>Pentru întrebări privind protecția datelor sau pentru exercitarea drepturilor tale, poți folosi datele de contact ale operatorului indicate mai sus.</p>',
    `${file} DPO`,
  );
  html = html.replace('Ultima actualizare: 11 august 2026', 'Ultima actualizare: 20 august 2026');
  write(file, html);
}

// Locație: elimină formularea de tip „site neterminat”, fără a inventa ore de funcționare.
{
  const file = 'locatie.html';
  let html = read(file);
  html = replaceOptional(
    html,
    /Programul de funcționare urmează să fie completat de administratorul restaurantului\. Până atunci,\s*te rugăm să ne suni la <a href="tel:\+40720409320">\+40 720 409 320<\/a> pentru a confirma că suntem deschiși\./,
    'Pentru programul actualizat, te rugăm să ne suni la <a href="tel:+40720409320">+40 720 409 320</a> înainte de vizită.',
    `${file} program`,
  );
  write(file, html);
}

// Despre noi: fără promisiuni sau instrucțiuni interne neconfirmate.
{
  const file = 'despre.html';
  let html = read(file);
  html = replaceOptional(
    html,
    /Programul de funcționare, informațiile despre livrare și zonele deservite urmează să fie completate de\s*administratorul restaurantului\. Până atunci, te rugăm să ne suni la <a href="tel:\+40720409320">\+40 720 409 320<\/a> pentru\s*confirmarea disponibilității\./,
    'Pentru programul actualizat și informațiile curente despre livrare, te rugăm să ne suni la <a href="tel:+40720409320">+40 720 409 320</a> înainte de comandă sau vizită.',
    `${file} program și livrare`,
  );
  html = replaceOptional(
    html,
    /<p><strong>Fotografii reale, în curând\.<\/strong> Ilustrațiile de pe acest site sunt desene originale, create\s*special pentru OLIZAN\. Nu folosim fotografii generice prezentate drept imagini din restaurant\. Secțiunea de\s*galerie este pregătită pentru fotografiile autentice ale echipei, ale bucătăriei și ale preparatelor\.<\/p>/,
    '<p><strong>Ilustrații originale OLIZAN.</strong> Imaginile ilustrative de pe site sunt desene originale create special pentru OLIZAN; nu folosim fotografii generice prezentate drept imagini ale restaurantului sau ale preparatelor.</p>',
    `${file} mesaj imagini`,
  );
  write(file, html);
}

// Galeria sălii: dacă nu există fotografii reale, nu afișăm patru placeholder-e „în curând”.
// Modulul JS o face vizibilă automat când API-ul furnizează cel puțin o fotografie.
for (const file of ['index.html', 'inchiriere-sala.html']) {
  let html = read(file);
  html = replaceOptional(
    html,
    /<div class="sala-galerie reveal" data-sala-galerie>[\s\S]*?<\/div>\s*(?=<div class="sala-rezervare">)/,
    '<div class="sala-galerie reveal" data-sala-galerie hidden></div>\n\n        ',
    `${file} galerie sală`,
  );
  write(file, html);
}

// Modifică doar copia publicată a modulului sălii: fără imagini => galerie ascunsă;
// cu imagini => sunt afișate doar fotografiile reale existente.
{
  const file = 'assets/js/sala.js';
  let js = read(file);
  js = replaceOptional(
    js,
    '    var lista = Array.isArray(imagini) ? imagini : [];\n    var bucati = lista.slice(0, 4).map(function (f) {',
    '    var lista = Array.isArray(imagini) ? imagini : [];\n    if (!lista.length) { zona.hidden = true; zona.innerHTML = ""; return; }\n    zona.hidden = false;\n    var bucati = lista.slice(0, 4).map(function (f) {',
    `${file} ascundere galerie goală`,
  );
  js = replaceOptional(
    js,
    '    while (bucati.length < 4) bucati.push(locGol());\n    zona.innerHTML = bucati.join("");',
    '    zona.innerHTML = bucati.join("");',
    `${file} fără placeholder-e`,
  );
  write(file, js);
}

// README: documentația trebuie să descrie arhitectura și conținutul actual.
{
  const file = 'README.md';
  let md = read(file);
  md = md.replace(
    'Site static, fără framework și **fără pas de compilare**: fișierele din depozit sunt exact\nfișierele publicate. Orice modificare devine vizibilă imediat după publicare.',
    'Frontend static, fără framework, împreună cu **Netlify Functions** pentru conturi, comenzi și administrare. Nu există bundling de frontend; înainte de publicare rulează scripturile de curățare, versiune PWA, CSP și generare a directorului public `dist/`.',
  );
  md = md.replace(
    /## 6\. Programul de funcționare și livrarea[\s\S]*?\n---\n\n## 7\./,
    '## 6. Programul de funcționare și livrarea\n\nInformațiile comerciale care se pot schimba (program, livrare, zone, praguri sau costuri) nu sunt inventate în cod. Cât timp o valoare nu este confirmată, paginile publice trimit clientul către telefon sau WhatsApp pentru informația actuală. Când aceste condiții sunt stabilite, actualizează paginile relevante și, pentru program, și datele structurate din `index.html`.\n\n---\n\n## 7.',
  );
  md = md.replace(
    /Pasajele evidențiate cu galben \(`<span class="todo">…<\/span>`\)[\s\S]*?\* informațiile despre livrare, plată și program din Termeni și condiții\.\n/,
    'Paginile juridice publice nu conțin instrucțiuni interne sau valori neconfirmate. Unde o informație exactă nu este stabilită, textul folosește o formulare neutră și indică datele de contact ale operatorului. Orice termen concret nou trebuie verificat înainte de publicare.\n',
  );
  if (!md.includes('├── politica-retur.html')) {
    md = md.replace('├── termeni-si-conditii.html\n', '├── termeni-si-conditii.html\n├── politica-retur.html\n');
  }
  if (!md.includes('scripts/pwa-versiune.mjs')) {
    md = md.replace(
      '├── scripts/csp-test.mjs                verifică politica față de tot ce încarcă site-ul\n',
      '├── scripts/csp-test.mjs                verifică politica față de tot ce încarcă site-ul\n├── scripts/pwa-versiune.mjs             actualizează versiunea service workerului la deploy\n├── scripts/build-public.mjs              generează directorul public dist/\n',
    );
  }
  md = md.replace('- [ ] Cele patru pagini legale se deschid din subsol', '- [ ] Toate paginile legale se deschid din subsol');
  md = md.replace('Toate cele nouă categorii din meniu', 'Toate cele zece categorii din meniu');
  md = md.replace('Nu există un pas de compilare: înainte de publicare', 'Nu există bundling sau compilare de frontend: înainte de publicare');
  write(file, md);
}

// Sitemap: paginile al căror conținut public s-a schimbat primesc data reală a modificării.
{
  const file = 'sitemap.xml';
  let xml = read(file);
  for (const slug of ['', 'despre', 'locatie', 'inchiriere-sala', 'politica-de-confidentialitate', 'protectia-datelor-gdpr', 'termeni-si-conditii']) {
    const loc = slug ? `https://www\\.restaurantolizan\\.ro/${slug}` : 'https://www\\.restaurantolizan\\.ro/';
    const re = new RegExp(`(<loc>${loc}<\\/loc>\\s*<lastmod>)[^<]+`);
    xml = replaceOptional(xml, re, '$1' + '2026-08-20', `sitemap ${slug || 'home'}`);
  }
  write(file, xml);
}

// Nicio instrucțiune internă sau promisiune de placeholder nu trebuie să rămână
// într-o pagină publică după această etapă.
const publicHtml = fs.readdirSync('.').filter((file) => file.endsWith('.html'));
for (const file of publicHtml) {
  const html = read(file);
  if (/Notă pentru administratorul site-ului|De completat de administrator|urmează să fie completat(?:e)? de administratorul restaurantului|Fotografii reale, în curând|Fotografie în curând/.test(html)) {
    throw new Error(`Text intern/placeholder rămas în ${file}`);
  }
}

console.log('[final-cleanup] Curățarea conținutului a trecut.');
