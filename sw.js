/* Service worker pentru OLIZAN Restaurant & Pizzeria.
   Rol: instalare pe telefon, o pagină de rezervă când nu există internet și
   pornire mai rapidă a fișierelor statice.

   Reguli de bază, în ordinea importanței:
   1. Nu se atinge nimic care ține de comenzi, cont, administrare sau
      formulare. Aceste cereri merg direct la rețea, ca și cum acest fișier
      nu ar exista.
   2. Meniul, produsele, prețurile și recenziile se iau întâi de pe internet.
      Copia locală se folosește doar dacă rețeaua nu răspunde.
   3. Doar fișierele statice (stiluri, scripturi, fonturi, imagini) se rețin
      pentru pornire rapidă.

   Versiunea de mai jos este înlocuită la fiecare publicare (vezi
   scripts/pwa-versiune.mjs). La schimbarea ei, toate copiile vechi sunt
   șterse, deci site-ul nu rămâne niciodată blocat pe o variantă veche. */

"use strict";

const VERSIUNE = "dev";

const CACHE_SCOICA = "olizan-scoica-" + VERSIUNE;   /* interfața de bază */
const CACHE_STATIC = "olizan-static-" + VERSIUNE;   /* stiluri, scripturi, fonturi, imagini */
const CACHE_PAGINI = "olizan-pagini-" + VERSIUNE;   /* ultima variantă văzută a paginilor */

const CACHE_ACTUALE = [CACHE_SCOICA, CACHE_STATIC, CACHE_PAGINI];

const PAGINA_OFFLINE = "/offline.html";

/* Interfața minimă, adusă la instalare. Lista este scurtă intenționat: doar
   cât să se poată afișa pagina de rezervă cu identitatea vizuală corectă. */
const SCOICA = [
  PAGINA_OFFLINE,
  "/assets/css/style.css",
  "/assets/css/fonts.css",
  "/assets/fonts/cormorant-garamond-700-latin.woff2",
  "/assets/fonts/jost-400-latin.woff2",
  "/assets/fonts/jost-500-latin.woff2",
  "/assets/img/favicon.svg",
  "/assets/img/logo-olizan.svg",
  "/assets/img/pwa/icon-192.png",
  "/assets/img/pwa/icon-512.png",
  "/manifest.webmanifest"
];

/* Adrese care nu trec niciodată prin acest fișier: comenzi, coș, plată,
   autentificare, contul clientului, panoul de administrare, funcțiile de
   server și orice cerere către alt domeniu (inclusiv WhatsApp). */
const CAI_INTERZISE = [
  /^\/api\//,
  /^\/\.netlify\//,
  /^\/admin(\/|$|\.html$)/,
  /^\/cont(\/|$|\.html$)/
];

/* Conținut care se schimbă des: meniu, produse, prețuri, recenzii.
   Pentru acestea se cere întâi rețeaua. */
const CAI_INTAI_RETEAUA = [
  /^\/data\//,
  /^\/meniu(\/|$|\.html$)/
];

const LIMITA_STATIC = 140; /* câte fișiere statice se păstrează cel mult */

function potrivit(cale, listaRegex) {
  return listaRegex.some(function (regex) { return regex.test(cale); });
}

/* Un răspuns se poate păstra doar dacă a reușit, vine de pe același domeniu
   și serverul nu a cerut explicit să nu fie păstrat. */
function sePoateRetine(raspuns) {
  if (!raspuns || !raspuns.ok || raspuns.type !== "basic") return false;
  const control = raspuns.headers.get("Cache-Control") || "";
  if (/no-store|private/i.test(control)) return false;
  if (raspuns.headers.get("Set-Cookie")) return false;
  return true;
}

async function tunde(numeCache, limita) {
  try {
    const cache = await caches.open(numeCache);
    const chei = await cache.keys();
    if (chei.length <= limita) return;
    /* Se șterg cele mai vechi intrări, în ordinea în care au fost adăugate. */
    await Promise.all(
      chei.slice(0, chei.length - limita).map(function (cheie) { return cache.delete(cheie); })
    );
  } catch (e) { /* lipsa spațiului nu trebuie să oprească site-ul */ }
}

/* ---- Instalare: se aduce interfața minimă ------------------------------- */
self.addEventListener("install", function (ev) {
  ev.waitUntil((async function () {
    const cache = await caches.open(CACHE_SCOICA);
    /* Fiecare fișier se adaugă separat: dacă unul singur lipsește, instalarea
       nu trebuie să eșueze cu totul. */
    await Promise.all(SCOICA.map(async function (cale) {
      try {
        const raspuns = await fetch(cale, { cache: "reload", credentials: "omit" });
        if (raspuns && raspuns.ok) await cache.put(cale, raspuns);
      } catch (e) { /* se încearcă din nou la prima folosire */ }
    }));
  })());
});

/* ---- Activare: se șterg copiile publicărilor anterioare ------------------ */
self.addEventListener("activate", function (ev) {
  ev.waitUntil((async function () {
    const nume = await caches.keys();
    await Promise.all(nume.map(function (n) {
      if (n.indexOf("olizan-") === 0 && CACHE_ACTUALE.indexOf(n) === -1) return caches.delete(n);
      return null;
    }));
    if (self.registration.navigationPreload) {
      try { await self.registration.navigationPreload.enable(); } catch (e) {}
    }
    await self.clients.claim();
  })());
});

/* Pagina cere trecerea imediată la versiunea nouă, după o publicare. */
self.addEventListener("message", function (ev) {
  if (ev.data && ev.data.tip === "TRECI_LA_VERSIUNEA_NOUA") self.skipWaiting();
});

/* ---- Strategii ---------------------------------------------------------- */

/* Pagini: întâi rețeaua, apoi ultima copie, apoi pagina de rezervă. */
async function paginaCuRetea(ev) {
  const cerere = ev.request;
  try {
    const preincarcat = ev.preloadResponse ? await ev.preloadResponse : null;
    const raspuns = preincarcat || await fetch(cerere);
    if (sePoateRetine(raspuns)) {
      const copie = raspuns.clone();
      caches.open(CACHE_PAGINI).then(function (cache) { cache.put(cerere, copie); });
    }
    return raspuns;
  } catch (e) {
    const salvat = await caches.match(cerere, { ignoreSearch: true });
    if (salvat) return salvat;
    const rezerva = await caches.match(PAGINA_OFFLINE);
    if (rezerva) return rezerva;
    return new Response("Momentan ești offline.", {
      status: 503,
      headers: { "Content-Type": "text/plain; charset=utf-8" }
    });
  }
}

/* Date care se schimbă des: întâi rețeaua, copia doar ca plasă de siguranță. */
async function dateCuRetea(cerere) {
  try {
    const raspuns = await fetch(cerere);
    if (sePoateRetine(raspuns)) {
      const copie = raspuns.clone();
      caches.open(CACHE_PAGINI).then(function (cache) { cache.put(cerere, copie); });
    }
    return raspuns;
  } catch (e) {
    const salvat = await caches.match(cerere);
    if (salvat) return salvat;
    throw e;
  }
}

/* Fonturile nu se schimbă niciodată sub același nume: se iau din copie. */
async function fontDinCopie(cerere) {
  const salvat = await caches.match(cerere);
  if (salvat) return salvat;
  const raspuns = await fetch(cerere);
  if (sePoateRetine(raspuns)) {
    const copie = raspuns.clone();
    caches.open(CACHE_STATIC).then(function (cache) { cache.put(cerere, copie); });
  }
  return raspuns;
}

/* Stiluri, scripturi și imagini: se afișează copia, iar în fundal se aduce
   varianta nouă pentru vizita următoare. */
async function staticCuImprospatare(cerere) {
  const salvat = await caches.match(cerere);
  const dinRetea = fetch(cerere).then(function (raspuns) {
    if (sePoateRetine(raspuns)) {
      const copie = raspuns.clone();
      caches.open(CACHE_STATIC).then(function (cache) {
        cache.put(cerere, copie).then(function () { tunde(CACHE_STATIC, LIMITA_STATIC); });
      });
    }
    return raspuns;
  }).catch(function () { return null; });

  if (salvat) return salvat;
  const raspuns = await dinRetea;
  if (raspuns) return raspuns;
  throw new Error("Fișierul nu este disponibil offline.");
}

/* ---- Dirijarea cererilor ------------------------------------------------ */
self.addEventListener("fetch", function (ev) {
  const cerere = ev.request;

  /* Doar citiri simple. Trimiterile de formulare, comenzile și orice POST
     merg neatinse la server. */
  if (cerere.method !== "GET") return;

  let adresa;
  try { adresa = new URL(cerere.url); } catch (e) { return; }

  /* Alt domeniu (WhatsApp, Google Maps, Facebook): nu ne atingem de el. */
  if (adresa.origin !== self.location.origin) return;

  /* Comenzi, cont, administrare, funcții de server: direct la rețea. */
  if (potrivit(adresa.pathname, CAI_INTERZISE)) return;

  /* Cereri parțiale (video, audio): lăsate pe seama browserului. */
  if (cerere.headers.has("range")) return;

  if (cerere.mode === "navigate") {
    ev.respondWith(paginaCuRetea(ev));
    return;
  }

  const cale = adresa.pathname;

  if (potrivit(cale, CAI_INTAI_RETEAUA)) {
    ev.respondWith(dateCuRetea(cerere));
    return;
  }

  if (cale.indexOf("/assets/fonts/") === 0) {
    ev.respondWith(fontDinCopie(cerere));
    return;
  }

  if (
    cale.indexOf("/assets/css/") === 0 ||
    cale.indexOf("/assets/js/") === 0 ||
    cale.indexOf("/assets/img/") === 0 ||
    cale === "/manifest.webmanifest"
  ) {
    ev.respondWith(staticCuImprospatare(cerere));
    return;
  }

  /* Orice altceva: rețea obișnuită, fără copie locală. */
});
