/* Partea de aplicație instalabilă (PWA) pentru OLIZAN Restaurant & Pizzeria.

   Acest fișier face trei lucruri și nimic mai mult:
   1. înregistrează fișierul /sw.js;
   2. trece automat la versiunea nouă după fiecare publicare;
   3. afișează butonul de instalare, dar numai atunci când browserul chiar
      oferă instalarea.

   Nu atinge nimic din site: nu modifică meniul, coșul, comenzile,
   formularele sau legăturile WhatsApp. Butonul și stilurile lui sunt create
   din JavaScript și apar doar în momentul în care instalarea este posibilă,
   deci pe restul site-ului nu se schimbă absolut nimic. */

(function () {
  "use strict";

  if (!("serviceWorker" in navigator)) return;

  var cale = location.pathname;
  /* Panoul de administrare și contul clientului rămân complet în afara PWA. */
  if (/^\/admin(\/|$|\.html$)/.test(cale) || /^\/cont(\/|$|\.html$)/.test(cale)) return;

  var CHEIE_RESPINS = "olizan_pwa_instalare_respinsa_v1";

  var evenimentInstalare = null;
  var bara = null;
  var stiluriPuse = false;
  var observatorCookie = null;

  /* ---- 1. Înregistrarea și actualizarea automată ------------------------ */

  function anuntaVersiuneaNoua(reg) {
    /* O versiune nouă este gata. Dacă pagina este deja controlată de o
       versiune veche, îi cerem celei noi să preia imediat. Nu reîncărcăm
       pagina cu forța: o comandă în curs de completare nu trebuie
       întreruptă. Paginile se iau oricum întâi de pe internet, deci
       conținutul este proaspăt, iar copiile vechi sunt șterse la preluare. */
    if (reg.waiting && navigator.serviceWorker.controller) {
      reg.waiting.postMessage({ tip: "TRECI_LA_VERSIUNEA_NOUA" });
    }
  }

  function urmaresteActualizarea(reg) {
    anuntaVersiuneaNoua(reg);

    reg.addEventListener("updatefound", function () {
      var nou = reg.installing;
      if (!nou) return;
      nou.addEventListener("statechange", function () {
        if (nou.state === "installed") anuntaVersiuneaNoua(reg);
      });
    });

    /* La revenirea în aplicație se verifică dacă a apărut o publicare nouă.
       Verificarea se face cel mult o dată la 30 de minute. */
    var ultimaVerificare = Date.now();
    document.addEventListener("visibilitychange", function () {
      if (document.visibilityState !== "visible") return;
      if (Date.now() - ultimaVerificare < 30 * 60 * 1000) return;
      ultimaVerificare = Date.now();
      reg.update().catch(function () {});
    });
  }

  window.addEventListener("load", function () {
    navigator.serviceWorker.register("/sw.js", { scope: "/" })
      .then(urmaresteActualizarea)
      .catch(function () { /* fără service worker site-ul funcționează la fel */ });
  });

  /* ---- 2. Butonul de instalare ----------------------------------------- */

  function esteDejaInstalata() {
    if (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) return true;
    if (window.matchMedia && window.matchMedia("(display-mode: minimal-ui)").matches) return true;
    return navigator.standalone === true; /* Safari pe iOS */
  }

  function aFostRespins() {
    try { return sessionStorage.getItem(CHEIE_RESPINS) === "1"; } catch (e) { return false; }
  }

  function tineMinteRespingerea() {
    try { sessionStorage.setItem(CHEIE_RESPINS, "1"); } catch (e) {}
  }

  function puneStiluri() {
    if (stiluriPuse) return;
    stiluriPuse = true;
    var stil = document.createElement("style");
    stil.id = "olizan-pwa-stil";
    /* Colțul din stânga-jos este liber: butoanele flotante ale site-ului
       (WhatsApp, coș) stau în dreapta. Nivelul de suprapunere este sub ele
       și sub bannerul de cookie-uri, ca să nu acopere niciodată nimic. */
    stil.textContent = [
      ".olizan-instalare{",
        "position:fixed;z-index:75;",
        "left:max(1rem,env(safe-area-inset-left));",
        "bottom:calc(1rem + env(safe-area-inset-bottom));",
        "display:flex;align-items:center;gap:.5rem;",
        "background:var(--cream,#faf6ee);",
        "border:1px solid var(--cream-3,#e8dcc3);",
        "border-radius:999px;",
        "box-shadow:0 2px 6px rgba(34,37,31,.07),0 18px 40px rgba(34,37,31,.10);",
        "padding:.35rem .4rem .35rem .5rem;",
        "opacity:0;transform:translateY(10px);",
        "transition:opacity .25s ease,transform .25s ease;",
      "}",
      ".olizan-instalare.is-open{opacity:1;transform:translateY(0)}",
      ".olizan-instalare button{",
        "font-family:var(--ff-text,system-ui,sans-serif);",
        "border:0;cursor:pointer;background:transparent;color:inherit;",
      "}",
      ".olizan-instalare .olizan-instalare-cta{",
        "display:inline-flex;align-items:center;gap:.45rem;",
        "background:var(--olive,#2f4132);color:var(--cream,#faf6ee);",
        "border-radius:999px;padding:.5rem .95rem;",
        "font-size:.86rem;font-weight:600;letter-spacing:.02em;",
      "}",
      ".olizan-instalare .olizan-instalare-cta:hover{background:var(--olive-deep,#1d2a1f)}",
      ".olizan-instalare .olizan-instalare-cta svg{width:17px;height:17px;flex:none}",
      ".olizan-instalare .olizan-instalare-x{",
        "width:30px;height:30px;border-radius:999px;",
        "display:inline-flex;align-items:center;justify-content:center;",
        "color:var(--muted,#62655a);font-size:1.15rem;line-height:1;",
      "}",
      ".olizan-instalare .olizan-instalare-x:hover{background:var(--olive-tint,#eaf0e4)}",
      "body.nav-open .olizan-instalare,",
      "body.lb-open .olizan-instalare,",
      "body.cart-open .olizan-instalare{display:none}",
      "@media (prefers-reduced-motion:reduce){",
        ".olizan-instalare{transition:none}",
      "}"
    ].join("");
    document.head.appendChild(stil);
  }

  /* Cât timp bannerul de cookie-uri este deschis, butonul se retrage, ca să
     nu existe două elemente suprapuse în partea de jos a ecranului. */
  function bannerCookieDeschis() {
    var c = document.querySelector(".cookie");
    return !!(c && c.classList.contains("is-open"));
  }

  function actualizeazaVizibilitatea() {
    if (!bara) return;
    bara.hidden = bannerCookieDeschis();
  }

  function urmaresteBannerulCookie() {
    var c = document.querySelector(".cookie");
    if (!c || observatorCookie) return;
    observatorCookie = new MutationObserver(actualizeazaVizibilitatea);
    observatorCookie.observe(c, { attributes: true, attributeFilter: ["class"] });
  }

  function ascunde() {
    if (!bara) return;
    bara.classList.remove("is-open");
    var deSters = bara;
    bara = null;
    window.setTimeout(function () {
      if (deSters && deSters.parentNode) deSters.parentNode.removeChild(deSters);
    }, 300);
    if (observatorCookie) { observatorCookie.disconnect(); observatorCookie = null; }
  }

  function arataButonul() {
    if (bara || !document.body) return;
    puneStiluri();

    bara = document.createElement("div");
    bara.className = "olizan-instalare";

    var cta = document.createElement("button");
    cta.type = "button";
    cta.className = "olizan-instalare-cta";
    cta.innerHTML =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
      'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      '<path d="M12 3v12"/><path d="m7 12 5 5 5-5"/><path d="M5 21h14"/></svg>' +
      '<span>Instalează aplicația</span>';

    var inchide = document.createElement("button");
    inchide.type = "button";
    inchide.className = "olizan-instalare-x";
    inchide.setAttribute("aria-label", "Închide propunerea de instalare");
    inchide.innerHTML = "&times;";

    bara.appendChild(cta);
    bara.appendChild(inchide);
    document.body.appendChild(bara);

    urmaresteBannerulCookie();
    actualizeazaVizibilitatea();

    /* Un cadru de așteptare, ca tranziția de apariție să pornească. */
    window.requestAnimationFrame(function () {
      window.requestAnimationFrame(function () {
        if (bara) bara.classList.add("is-open");
      });
    });

    inchide.addEventListener("click", function () {
      tineMinteRespingerea();
      ascunde();
    });

    cta.addEventListener("click", function () {
      if (!evenimentInstalare) { ascunde(); return; }
      cta.disabled = true;
      var ev = evenimentInstalare;
      evenimentInstalare = null;
      ev.prompt();
      ev.userChoice.then(function (rezultat) {
        if (rezultat && rezultat.outcome === "dismissed") tineMinteRespingerea();
        ascunde();
      }).catch(function () { ascunde(); });
    });
  }

  /* Evenimentul apare doar în browserele care chiar pot instala aplicația și
     doar dacă manifestul și service workerul sunt valide. Fără el, butonul nu
     este creat niciodată. */
  window.addEventListener("beforeinstallprompt", function (ev) {
    ev.preventDefault();
    evenimentInstalare = ev;
    if (esteDejaInstalata() || aFostRespins()) return;
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", arataButonul, { once: true });
    } else {
      arataButonul();
    }
  });

  window.addEventListener("appinstalled", function () {
    evenimentInstalare = null;
    ascunde();
  });
})();
