/* Verifică politica de securitate a conținutului din /_headers față de tot
   ceea ce încarcă site-ul în realitate.

     node scripts/csp-test.mjs

   Scriptul deschide fiecare pagină, fiecare foaie de stil și fiecare fișier
   .js, scoate din ele toate adresele de la care browserul ar cere ceva
   (scripturi, stiluri, imagini, fonturi, cadre, cereri de rețea, ținta
   formularelor) și le trece prin politică, exact ca browserul: directiva
   potrivită, apoi rezervele ei, apoi „default-src". Orice adresă respinsă
   este raportată, cu pagina și directiva vinovată.

   Verifică în plus lucrurile care se strică în tăcere: cod scris în pagină
   fără amprentă, atribute onclick=, adrese „javascript:", eval().

   Nu înlocuiește o verificare în browser, dar prinde tot ce se poate prinde
   citind sursele — și o face la fiecare rulare, nu o singură dată. */

import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";

const RADACINA = new URL("../", import.meta.url);
const ORIGINE = "https://www.restaurantolizan.ro";

/* --- Citirea politicii din /_headers ------------------------------------ */

async function citestePolitica() {
  const text = await readFile(new URL("_headers", RADACINA), "utf8");
  const linie = text.split("\n").find((l) => /^\s*Content-Security-Policy:/i.test(l));
  if (!linie) throw new Error("Nu am găsit antetul Content-Security-Policy în /_headers.");

  const politica = new Map();
  for (const bucata of linie.replace(/^\s*Content-Security-Policy:/i, "").split(";")) {
    const parti = bucata.trim().split(/\s+/).filter(Boolean);
    if (parti.length) politica.set(parti[0].toLowerCase(), parti.slice(1));
  }
  return politica;
}

/* Lanțul de rezerve, ca în specificație: dacă directiva cerută lipsește, se
   folosește următoarea din listă. */
const REZERVE = {
  "script-src-elem": ["script-src", "default-src"],
  "script-src-attr": ["script-src", "default-src"],
  "script-src": ["default-src"],
  "style-src-elem": ["style-src", "default-src"],
  "style-src-attr": ["style-src", "default-src"],
  "style-src": ["default-src"],
  "img-src": ["default-src"],
  "font-src": ["default-src"],
  "connect-src": ["default-src"],
  "media-src": ["default-src"],
  "frame-src": ["child-src", "default-src"],
  "worker-src": ["child-src", "script-src", "default-src"],
  "manifest-src": ["default-src"],
  "object-src": ["default-src"],
  "form-action": [],
};

function surse(politica, directiva) {
  for (const nume of [directiva, ...(REZERVE[directiva] || [])]) {
    if (politica.has(nume)) return { nume, valori: politica.get(nume) };
  }
  return { nume: directiva, valori: null };   /* nicio directivă → permis */
}

/* --- Evaluarea unei adrese ---------------------------------------------- */

function permite(politica, directiva, adresa, paginaUrl) {
  const { nume, valori } = surse(politica, directiva);
  if (valori === null) return { ok: true, nume };
  if (valori.includes("'none'")) return { ok: false, nume };

  let u;
  try {
    u = new URL(adresa, paginaUrl);
  } catch {
    return { ok: true, nume };   /* adresă relativă ciudată; o lasă browserul */
  }

  if (u.protocol === "data:") return { ok: valori.includes("data:"), nume };
  if (u.protocol === "blob:") return { ok: valori.includes("blob:"), nume };

  const originePagina = new URL(paginaUrl).origin;
  if (u.origin === originePagina && valori.includes("'self'")) return { ok: true, nume };

  for (const sursa of valori) {
    if (sursa.startsWith("'")) continue;
    try {
      const s = new URL(sursa);
      if (s.origin === u.origin) return { ok: true, nume };
    } catch { /* nu e adresă absolută */ }
  }
  return { ok: false, nume };
}

function amprenta(continut) {
  return "'sha256-" + createHash("sha256").update(continut, "utf8").digest("base64") + "'";
}

/* --- Extragerea adreselor din pagini ------------------------------------ */

const ATRIBUT = (nume) => new RegExp(`\\b${nume}\\s*=\\s*"([^"]*)"`, "i");

function atribut(eticheta, nume) {
  const m = eticheta.match(ATRIBUT(nume));
  return m ? m[1].replace(/&amp;/g, "&") : null;
}

/* Fiecare intrare: eticheta căutată → funcție care spune ce directivă
   guvernează adresa găsită. */
function cereriDinPagina(html) {
  const cereri = [];
  const adauga = (directiva, adresa, ce) => {
    if (adresa && !adresa.startsWith("#") && !/^(mailto|tel|whatsapp):/i.test(adresa)) {
      cereri.push({ directiva, adresa, ce });
    }
  };

  for (const [eticheta] of html.matchAll(/<script\b[^>]*>/gi)) {
    adauga("script-src-elem", atribut(eticheta, "src"), "<script src>");
  }
  for (const [eticheta] of html.matchAll(/<link\b[^>]*>/gi)) {
    const rel = (atribut(eticheta, "rel") || "").toLowerCase();
    const href = atribut(eticheta, "href");
    const as = (atribut(eticheta, "as") || "").toLowerCase();
    if (rel.includes("stylesheet")) adauga("style-src-elem", href, "<link rel=stylesheet>");
    else if (rel.includes("manifest")) adauga("manifest-src", href, "<link rel=manifest>");
    else if (rel.includes("icon")) adauga("img-src", href, "<link rel=icon>");
    else if (rel.includes("preload") || rel.includes("prefetch")) {
      const directiva = { font: "font-src", image: "img-src", script: "script-src-elem",
        style: "style-src-elem", fetch: "connect-src" }[as];
      if (directiva) adauga(directiva, href, `<link rel=${rel} as=${as}>`);
    }
  }
  for (const [eticheta] of html.matchAll(/<(?:img|source)\b[^>]*>/gi)) {
    adauga("img-src", atribut(eticheta, "src"), "<img src>");
    const srcset = atribut(eticheta, "srcset");
    if (srcset) {
      for (const bucata of srcset.split(",")) {
        adauga("img-src", bucata.trim().split(/\s+/)[0], "srcset");
      }
    }
  }
  for (const [eticheta] of html.matchAll(/<(?:video|audio)\b[^>]*>/gi)) {
    adauga("media-src", atribut(eticheta, "src"), "<video src>");
  }
  for (const [eticheta] of html.matchAll(/<iframe\b[^>]*>/gi)) {
    adauga("frame-src", atribut(eticheta, "src"), "<iframe src>");
  }
  for (const [eticheta] of html.matchAll(/<form\b[^>]*>/gi)) {
    adauga("form-action", atribut(eticheta, "action"), "<form action>");
  }
  /* Harta Google este pusă în pagină de site.js, din acest atribut. */
  for (const [eticheta] of html.matchAll(/<div\b[^>]*data-embed\s*=[^>]*>/gi)) {
    adauga("frame-src", atribut(eticheta, "data-embed"), "harta (data-embed)");
  }
  for (const [eticheta] of html.matchAll(/<(?:object|embed)\b[^>]*>/gi)) {
    adauga("object-src", atribut(eticheta, "data") || atribut(eticheta, "src"), "<object>");
  }
  return cereri;
}

async function fisiere(dosar, extensie) {
  const intrari = await readdir(new URL(dosar, RADACINA), { withFileTypes: true });
  return intrari
    .filter((i) => i.isFile() && i.name.endsWith(extensie))
    .map((i) => dosar + i.name)
    .sort();
}

/* --- Verificarea --------------------------------------------------------- */

const probleme = [];
const note = [];
let verificate = 0;

function verifica(politica, cerere, cale) {
  verificate++;
  const rezultat = permite(politica, cerere.directiva, cerere.adresa, ORIGINE + "/" + cale);
  if (!rezultat.ok) {
    probleme.push(`${cale}: ${cerere.ce} „${cerere.adresa}" blocat de ${rezultat.nume}`);
  }
}

const politica = await citestePolitica();

/* 1. Paginile: adrese, cod scris în pagină, atribute periculoase. */
const pagini = [...(await fisiere("", ".html")), ...(await fisiere("admin/", ".html"))];
if (pagini.length < 15) probleme.push(`Am găsit doar ${pagini.length} pagini — lista pare incompletă.`);

const permiseScript = surse(politica, "script-src-elem").valori || [];
const permiseStil = surse(politica, "style-src-elem").valori || [];

for (const cale of pagini) {
  const html = await readFile(new URL(cale, RADACINA), "utf8");

  for (const cerere of cereriDinPagina(html)) verifica(politica, cerere, cale);

  /* Cod scris direct în pagină → trebuie să aibă amprenta în politică. */
  for (const [, atribute, cod] of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)) {
    if (/\bsrc\s*=/i.test(atribute) || !cod.trim()) continue;
    verificate++;
    const tip = (atribute.match(/type\s*=\s*"([^"]*)"/i) || [, "javascript"])[1];
    if (!permiseScript.includes(amprenta(cod))) {
      probleme.push(`${cale}: cod scris în pagină (type=${tip}) fără amprentă în script-src`);
    }
  }
  for (const [, , cod] of html.matchAll(/<style\b([^>]*)>([\s\S]*?)<\/style\s*>/gi)) {
    if (!cod.trim()) continue;
    verificate++;
    if (!permiseStil.includes(amprenta(cod))) {
      probleme.push(`${cale}: <style> fără amprentă în style-src-elem`);
    }
  }

  /* Atribute onclick= și adrese javascript: — politica le interzice. */
  const evenimente = [...html.matchAll(/\son(?:click|load|error|change|submit|input|focus|blur|mouse[a-z]+|key[a-z]+|touch[a-z]+)\s*=/gi)];
  if (evenimente.length) {
    probleme.push(`${cale}: ${evenimente.length} atribut(e) de tip onclick= — blocate de script-src-attr 'none'`);
  }
  if (/(?:href|src|action)\s*=\s*"\s*javascript:/i.test(html)) {
    probleme.push(`${cale}: adresă „javascript:" — blocată de script-src`);
  }

  /* Atribute style= → au nevoie de style-src-attr 'unsafe-inline'. */
  const stiluri = [...html.matchAll(/\sstyle\s*=\s*"/gi)];
  if (stiluri.length) {
    verificate++;
    if (!(surse(politica, "style-src-attr").valori || []).includes("'unsafe-inline'")) {
      probleme.push(`${cale}: ${stiluri.length} atribut(e) style= fără style-src-attr 'unsafe-inline'`);
    }
  }
}

/* 2. Foile de stil: imagini de fundal și fonturi. */
for (const cale of await fisiere("assets/css/", ".css")) {
  const css = await readFile(new URL(cale, RADACINA), "utf8");
  for (const [, adresa] of css.matchAll(/url\(\s*['"]?([^'")]+)['"]?\s*\)/gi)) {
    const directiva = /\.(woff2?|ttf|otf|eot)(\?|$)/i.test(adresa) ? "font-src" : "img-src";
    verifica(politica, { directiva, adresa, ce: `url() în ${cale}` }, cale);
  }
}

/* 3. Fișierele .js: cereri de rețea, lucrători, cadre create din cod. */
for (const cale of [...(await fisiere("assets/js/", ".js")), "sw.js"]) {
  const js = await readFile(new URL(cale, RADACINA), "utf8");

  for (const [, adresa] of js.matchAll(/\bfetch\(\s*["'`]([^"'`]+)["'`]/g)) {
    verifica(politica, { directiva: "connect-src", adresa, ce: "fetch()" }, cale);
  }
  for (const [, adresa] of js.matchAll(/serviceWorker\.register\(\s*["']([^"']+)["']/g)) {
    verifica(politica, { directiva: "worker-src", adresa, ce: "register()" }, cale);
  }
  if (/\beval\s*\(|new\s+Function\s*\(/.test(js)) {
    probleme.push(`${cale}: eval() sau new Function() — politica nu permite 'unsafe-eval'`);
  }
  if (/setAttribute\(\s*["']style["']/.test(js)) {
    note.push(`${cale}: setAttribute("style") — permis prin style-src-attr 'unsafe-inline'`);
  }
}

/* 4. Manifestul aplicației instalabile. */
const manifest = JSON.parse(await readFile(new URL("manifest.webmanifest", RADACINA), "utf8"));
for (const icon of [...(manifest.icons || []), ...(manifest.shortcuts || []).flatMap((s) => s.icons || [])]) {
  verifica(politica, { directiva: "img-src", adresa: icon.src, ce: "icoană manifest" }, "manifest.webmanifest");
}

/* 5. Directivele care nu trebuie să slăbească niciodată. */
const scriptSrc = politica.get("script-src") || [];
if (scriptSrc.includes("'unsafe-inline'")) probleme.push("script-src conține 'unsafe-inline'");
if (scriptSrc.includes("'unsafe-eval'")) probleme.push("script-src conține 'unsafe-eval'");
if (!scriptSrc.some((s) => s.startsWith("'sha256-"))) probleme.push("script-src nu conține nicio amprentă");
for (const ceruta of ["default-src", "base-uri", "object-src", "frame-ancestors", "form-action", "connect-src", "img-src", "frame-src"]) {
  if (!politica.has(ceruta)) probleme.push(`Lipsește directiva ${ceruta}`);
}

/* --- Raportul ----------------------------------------------------------- */

console.log(`[csp-test] ${pagini.length} pagini, ${verificate} verificări.`);
for (const nota of note) console.log(`  · ${nota}`);

if (probleme.length) {
  console.error(`\n[csp-test] ${probleme.length} problemă/probleme:`);
  for (const p of probleme) console.error(`  ✗ ${p}`);
  process.exitCode = 1;
} else {
  console.log("[csp-test] Nimic blocat: politica acoperă tot ce încarcă site-ul.");
}
