import fs from 'node:fs';

const file = 'politica-cookie.html';
let html = fs.readFileSync(file, 'utf8');
const bannerAdmin = /\s*<div class="notice notice--gold">\s*<svg[\s\S]*?<\/svg>\s*<div>\s*<p><strong>Notă pentru administratorul site-ului:<\/strong>[\s\S]*?<\/p>\s*<\/div>\s*<\/div>/;
html = html.replace(bannerAdmin, '');
html = html.replace('Ultima actualizare: 11 august 2026', 'Ultima actualizare: 20 august 2026');
fs.writeFileSync(file, html, 'utf8');
console.log('[prepare-cookie] politica-cookie.html curățată pentru producție.');
