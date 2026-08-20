/* Scrie antetul Content-Security-Policy al site-ului în fișierul /_headers.

   Rulează la fiecare deploy, înainte de publicare (vezi netlify.toml), și
   poate fi rulat oricând local:

     node scripts/csp.mjs            → rescrie /_headers
     node scripts/csp.mjs --verifica → nu scrie nimic; spune doar dacă
                                       fișierul din depozit este la zi

   De ce este generat, și nu scris de mână: politica nu folosește
   „unsafe-inline" pentru scripturi. Fiecare bucată de cod scrisă direct în
   pagină (ecranul de intrare din prima pagină, butonul din pagina offline,
   datele structurate pentru motoarele de căutare) este permisă printr-o
   amprentă SHA-256 a conținutului ei. Amprenta se schimbă la orice
   modificare a codului respectiv, fie ea și un spațiu — dacă antetul ar fi
   scris de mână, prima modificare a unei pagini ar bloca acel cod în
   browser, fără niciun semn în cod. Aici amprentele se recalculează la
   fiecare publicare, din paginile reale.

   Regula de aur la modificarea politicii: orice adresă nouă din care pagina
   încarcă ceva (un script, un stil, o imagine, un font, o cerere de rețea,
   un cadru încorporat) trebuie adăugată mai jos, altfel browserul o
   blochează în tăcere. Legăturile obișnuite — WhatsApp, Facebook, ANPC,
   traseul din Google Maps — sunt navigări, nu încărcări, și nu sunt atinse
   de politică. */

import { createHash } from "node:crypto";
import { readFile, readdir, writeFile } from "node:fs/promises";

const RADACINA = new URL("../", import.meta.url);
const FISIER_HEADERS = new URL("_headers", RADACINA);

/* Paginile în care se caută cod scris direct în HTML. */
const DOSARE_HTML = ["", "admin/"];

/* --- Politica ----------------------------------------------------------
   Listele conțin sursele fixe; amprentele calculate din pagini se adaugă
   peste ele. Ordinea directivelor este cea din fișier. */
const POLITICA = [
  /* Implicit totul vine de pe același domeniu. Directivele de mai jos doar
     restrâng sau lărgesc punctual această regulă. */
  ["default-src", ["'self'"]],

  /* Adresa de bază nu poate fi rescrisă (un <base> injectat ar putea muta
     toate legăturile relative pe alt server). */
  ["base-uri", ["'self'"]],

  /* Nu există <object>, <embed> sau applet-uri în site. */
  ["object-src", ["'none'"]],

  /* Site-ul poate fi încadrat doar de el însuși — perechea modernă a
     antetului X-Frame-Options: SAMEORIGIN, păstrat mai departe în
     netlify.toml pentru browserele vechi. */
  ["frame-ancestors", ["'self'"]],

  /* Formularele (contact, autentificare, comenzi, panoul de administrare)
     trimit datele numai către acest domeniu. */
  ["form-action", ["'self'"]],

  /* Scripturi: fișierele proprii din /assets/js și /data, plus amprentele
     codului scris în pagini. Fără „unsafe-inline" și fără „unsafe-eval". */
  ["script-src", ["'self'", "@amprente-script"]],

  /* Atributele de tip onclick= sunt interzise; site-ul nu folosește niciunul,
     toate acțiunile sunt legate din fișierele .js. */
  ["script-src-attr", ["'none'"]],

  /* Stiluri. „unsafe-inline" rămâne doar în directiva generală, pentru
     browserele care nu cunosc perechea -elem/-attr (Safari sub 15.4): fără
     ea, atributele style= din pagini ar fi ignorate acolo, iar așezarea în
     pagină s-ar strica. Browserele actuale folosesc cele două directive de
     mai jos, deci pentru ele foile de stil sunt restrânse strict. */
  ["style-src", ["'self'", "'unsafe-inline'"]],
  ["style-src-elem", ["'self'", "@amprente-stil"]],
  ["style-src-attr", ["'unsafe-inline'"]],

  /* Imagini: cele din site și cele încărcate din panoul de administrare
     (servite de funcția /media/:cheie, tot de pe acest domeniu). „data:"
     este necesar pentru textura de hârtie din style.css, scrisă direct în
     foaia de stil ca SVG. */
  ["img-src", ["'self'", "data:"]],

  /* Fonturile sunt găzduite local, în /assets/fonts. */
  ["font-src", ["'self'"]],

  /* Cereri de rețea: meniul, comenzile, contul clientului, panoul de
     administrare și formularul de contact — toate pe acest domeniu. */
  ["connect-src", ["'self'"]],

  /* Fișiere video/audio găzduite pe site. */
  ["media-src", ["'self'"]],

  /* Singurul cadru încorporat este harta Google din pagina de locație, și
     doar după ce vizitatorul o activează. */
  ["frame-src", ["'self'", "https://www.google.com"]],

  /* Service workerul aplicației instalabile (/sw.js). */
  ["worker-src", ["'self'"]],

  /* Manifestul aplicației instalabile. */
  ["manifest-src", ["'self'"]],

  /* Dacă o adresă http:// scapă undeva, browserul o cere pe https://. */
  ["upgrade-insecure-requests", []],
];

/* Antetul se pune pe tot site-ul: pagini, fișiere statice, funcții. */
const CALE = "/*";

/* --- Citirea paginilor -------------------------------------------------- */

/* Codul dintre <script> și </script>, doar când eticheta nu are src=.
   Include și blocurile type="application/ld+json" (datele structurate):
   browserele le tratează tot ca scripturi scrise în pagină și le blochează
   fără amprentă. */
const TIPAR_SCRIPT = /<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi;
const TIPAR_STIL = /<style\b([^>]*)>([\s\S]*?)<\/style\s*>/gi;
const ARE_SRC = /\bsrc\s*=/i;

function amprenta(continut) {
  return "'sha256-" + createHash("sha256").update(continut, "utf8").digest("base64") + "'";
}

async function paginiHtml() {
  const lista = [];
  for (const dosar of DOSARE_HTML) {
    const intrari = await readdir(new URL(dosar || "./", RADACINA), { withFileTypes: true });
    for (const intrare of intrari) {
      if (intrare.isFile() && intrare.name.endsWith(".html")) lista.push(dosar + intrare.name);
    }
  }
  return lista.sort();
}

/* Adună amprentele codului și ale stilurilor scrise direct în pagini.
   Aceeași bucată de cod repetată în mai multe pagini dă o singură amprentă. */
async function amprenteDinPagini() {
  const scripturi = new Map();   /* amprentă → paginile în care apare */
  const stiluri = new Map();

  for (const cale of await paginiHtml()) {
    const html = await readFile(new URL(cale, RADACINA), "utf8");

    for (const [, atribute, cod] of html.matchAll(TIPAR_SCRIPT)) {
      if (ARE_SRC.test(atribute)) continue;      /* script extern, acoperit de 'self' */
      if (!cod.trim()) continue;                 /* etichetă goală */
      adauga(scripturi, amprenta(cod), cale);
    }

    for (const [, , cod] of html.matchAll(TIPAR_STIL)) {
      if (!cod.trim()) continue;
      adauga(stiluri, amprenta(cod), cale);
    }
  }

  return { scripturi, stiluri };
}

function adauga(harta, cheie, pagina) {
  const pagini = harta.get(cheie) || [];
  if (!pagini.includes(pagina)) pagini.push(pagina);
  harta.set(cheie, pagini);
}

/* --- Scrierea fișierului ------------------------------------------------ */

function construiestePolitica({ scripturi, stiluri }) {
  const inlocuiri = {
    "@amprente-script": [...scripturi.keys()].sort(),
    "@amprente-stil": [...stiluri.keys()].sort(),
  };

  return POLITICA.map(([directiva, surse]) => {
    const valori = surse.flatMap((s) => (s in inlocuiri ? inlocuiri[s] : [s]));
    return [directiva, ...valori].join(" ");
  }).join("; ");
}

function construiesteFisier(politica, { scripturi, stiluri }) {
  const total = scripturi.size + stiluri.size;
  const detalii = [...scripturi, ...stiluri].map(
    ([cheie, pagini]) => `#   ${cheie.slice(0, 16)}…  ${pagini.join(", ")}`
  );

  return [
    "# FIȘIER GENERAT — nu se modifică de mână.",
    "# Sursa: scripts/csp.mjs, rulat la fiecare publicare (vezi netlify.toml).",
    "# Regenerare locală: node scripts/csp.mjs",
    "#",
    "# Antetul de mai jos spune browserului de unde are voie pagina să încarce",
    "# scripturi, stiluri, imagini, fonturi și cadre. Restul antetelor site-ului",
    "# (cache, X-Frame-Options, HSTS și celelalte) rămân în netlify.toml.",
    "#",
    `# ${total} amprente pentru codul și stilurile scrise direct în pagini:`,
    ...detalii,
    "",
    CALE,
    `  Content-Security-Policy: ${politica}`,
    "",
  ].join("\n");
}

/* --- Rulare ------------------------------------------------------------- */

const doarVerifica = process.argv.includes("--verifica");

try {
  const amprente = await amprenteDinPagini();
  const politica = construiestePolitica(amprente);
  const dorit = construiesteFisier(politica, amprente);

  if (doarVerifica) {
    const actual = await readFile(FISIER_HEADERS, "utf8").catch(() => "");
    if (actual === dorit) {
      console.log("[csp] Fișierul /_headers este la zi.");
    } else {
      console.error("[csp] Fișierul /_headers NU este la zi. Rulează: node scripts/csp.mjs");
      process.exitCode = 1;
    }
  } else {
    await writeFile(FISIER_HEADERS, dorit);
    console.log(
      `[csp] Politica scrisă în /_headers (${amprente.scripturi.size} amprente de cod, ` +
        `${amprente.stiluri.size} de stil).`
    );
  }
} catch (eroare) {
  /* Publicarea nu se oprește: dacă generarea eșuează, rămâne în vigoare
     fișierul /_headers din depozit, care este mereu unul valid. */
  console.warn("[csp] Politica nu a putut fi regenerată:", eroare && eroare.message);
}
