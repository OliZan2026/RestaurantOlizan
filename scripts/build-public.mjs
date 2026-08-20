import { cp, copyFile, mkdir, readdir, rm } from 'node:fs/promises';

const ROOT = new URL('../', import.meta.url);
const DIST = new URL('../dist/', import.meta.url);

await rm(DIST, { recursive: true, force: true });
await mkdir(DIST, { recursive: true });

// Toate paginile HTML din rădăcină sunt pagini publice ale site-ului.
for (const entry of await readdir(ROOT, { withFileTypes: true })) {
  if (entry.isFile() && entry.name.endsWith('.html')) {
    await copyFile(new URL(entry.name, ROOT), new URL(entry.name, DIST));
  }
}

// Directoare publice. Admin conține doar interfața browserului; funcțiile și
// bibliotecile server-side rămân în /netlify și NU ajung în directorul publicat.
for (const dir of ['assets', 'data', 'admin']) {
  await cp(new URL(`${dir}/`, ROOT), new URL(`${dir}/`, DIST), { recursive: true });
}

// Fișiere publice speciale pentru Netlify, SEO și PWA.
for (const file of ['_headers', 'robots.txt', 'sitemap.xml', 'manifest.webmanifest', 'sw.js']) {
  await copyFile(new URL(file, ROOT), new URL(file, DIST));
}

console.log('[build-public] Directorul dist/ conține numai fișierele publice ale site-ului.');
