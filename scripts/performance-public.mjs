import fs from 'node:fs';

const read = (file) => fs.readFileSync(file, 'utf8');
const write = (file, value) => fs.writeFileSync(file, value, 'utf8');

// Elimină din service worker orice precache rămas către copia Jost 500,
// deoarece toate greutățile Jost folosesc acum fișierul canonic 400.
{
  const file = 'sw.js';
  let sw = read(file);
  sw = sw.replace('  "/assets/fonts/jost-500-latin.woff2",\n', '');
  write(file, sw);
}

// Numele eliminate nu trebuie să reapară în CSS/PWA în modificările viitoare.
const interzise = [
  'cormorant-garamond-600-latin-ext.woff2',
  'cormorant-garamond-600-latin.woff2',
  'jost-300-latin-ext.woff2',
  'jost-300-latin.woff2',
  'jost-500-latin-ext.woff2',
  'jost-500-latin.woff2',
  'jost-600-latin-ext.woff2',
  'jost-600-latin.woff2',
];

for (const file of ['assets/css/fonts.css', 'sw.js']) {
  const content = read(file);
  for (const name of interzise) {
    if (content.includes(name)) throw new Error(`${file}: referință veche către ${name}`);
  }
}

// Verifică toate fișierele enumerate în SCOICA: o eroare aici ar însemna
// instalare PWA cu request 404 în fundal.
{
  const sw = read('sw.js');
  const block = sw.match(/const SCOICA = \[([\s\S]*?)\];/);
  if (!block) throw new Error('sw.js: lista SCOICA nu a fost găsită');
  const paths = [...block[1].matchAll(/"(\/[^\"]+)"/g)].map((m) => m[1]);
  for (const url of paths) {
    const local = `.${url}`;
    if (!fs.existsSync(local)) throw new Error(`sw.js: precache către fișier lipsă ${url}`);
  }
  console.log(`[performance] ${paths.length} resurse PWA precache verificate.`);
}

console.log('[performance] Fonturi deduplicate și cache PWA valid.');
