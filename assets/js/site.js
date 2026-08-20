/* ==========================================================================
   OLIZAN Restaurant & Pizzeria — comportamentul site-ului
   Module: 1 header/nav · 2 linkuri WhatsApp · 3 animații la scroll ·
           4 buton „sus" · 4b oprirea comenzilor · 5 prețuri și carduri de
           produs · 5b recomandări · 6 meniu cu taburi · 7 lightbox ·
           7b coșul de comandă · 8 consimțământ cookie-uri · 9 hartă ·
           10 formular · 11 anul curent ·
           12 pornirea (meniul, starea comenzilor și imaginile administrate)
   Produsele, prețurile și fotografiile se administrează din panoul de la
   /admin; data/menu.js rămâne varianta de rezervă, folosită dacă serverul
   nu răspunde.
   ========================================================================== */
function olizanPorneste() {
  "use strict";

  var D = window.OLIZAN || {};
  var contact = D.contact || {};
  var mesaje = D.mesaje || {};
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }
  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  /* Siglele legale stau într-o bandă separată, sub separatorul footerului,
     nu în interiorul coloanei „Informații legale”. */
  (function footerLegal() {
    var rand = $(".footer .anpc-row");
    var grila = $(".footer .footer-grid");
    if (!rand || !grila || !grila.parentNode) return;
    grila.insertAdjacentElement("afterend", rand);
  })();

  /* ---- 1. Header: stare la scroll + meniu mobil -------------------------- */
  (function header() {
    var head = $(".header");
    var nav = $("#nav-principal");
    var toggle = $(".nav-toggle");

    if (head) {
      var onScroll = function () {
        head.classList.toggle("is-scrolled", window.scrollY > 12);
      };
      onScroll();
      window.addEventListener("scroll", onScroll, { passive: true });
    }

    if (!nav || !toggle) return;

    var mqMobil = window.matchMedia("(max-width:1000px)");
    var fundalNav = null;

    /* Stratul de închidere există în pagină numai cât timp meniul e deschis. */
    function scoateFundal() {
      if (fundalNav && fundalNav.parentNode) fundalNav.parentNode.removeChild(fundalNav);
      fundalNav = null;
    }
    function puneFundal() {
      if (fundalNav) return;
      fundalNav = document.createElement("div");
      fundalNav.className = "nav-backdrop";
      fundalNav.setAttribute("aria-hidden", "true");
      fundalNav.addEventListener("click", function () { setOpen(false); });
      document.body.appendChild(fundalNav);
    }

    function setOpen(open) {
      nav.classList.toggle("is-open", open);
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      toggle.setAttribute("aria-label", open ? "Închide meniul de navigare" : "Deschide meniul de navigare");
      document.body.classList.toggle("nav-open", open);
      if (open && mqMobil.matches) puneFundal(); else scoateFundal();
    }
    toggle.addEventListener("click", function () {
      setOpen(!nav.classList.contains("is-open"));
    });
    $$("a", nav).forEach(function (a) {
      a.addEventListener("click", function () { setOpen(false); });
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && nav.classList.contains("is-open")) {
        setOpen(false);
        toggle.focus();
      }
    });
    /* Trecerea pe ecran lat închide meniul și șterge stratul de închidere. */
    function laSchimbareLatime() {
      if (!mqMobil.matches && nav.classList.contains("is-open")) setOpen(false);
    }
    if (mqMobil.addEventListener) mqMobil.addEventListener("change", laSchimbareLatime);
    else if (mqMobil.addListener) mqMobil.addListener(laSchimbareLatime);
    window.addEventListener("resize", laSchimbareLatime);
    /* La revenirea din memoria browserului meniul pornește întotdeauna închis. */
    window.addEventListener("pageshow", function () { setOpen(false); });
  })();

  /* ---- 2. Linkuri WhatsApp ---------------------------------------------- */
  /* Adresa scrisă în pagină este întotdeauna cea scurtă și oficială,
     wa.me/NUMAR?text=MESAJ. Pe telefon însă adresa aceasta face o redirectare
     către api.whatsapp.com, iar Android și iOS nu deschid aplicația pentru
     paginile la care s-a ajuns prin redirectare — clientul rămâne blocat pe
     pagina web și trebuie să apese de mai multe ori. De aceea pe telefon
     clicul cheamă direct aplicația (whatsapp://send), iar wa.me rămâne doar
     plasa de siguranță, dacă aplicația nu preia clicul. */
  var GAZDE_WA = ["wa.me", "api.whatsapp.com", "web.whatsapp.com", "whatsapp.com"];

  var esteMobil = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent || "") ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

  /* WhatsApp acceptă numărul doar în cifre, cu prefixul de țară, fără „+”. */
  function numarWa() {
    return String(contact.whatsapp || "").replace(/[^0-9]/g, "");
  }
  function waLink(text, nr) {
    var numar = nr || numarWa();
    return "https://wa.me/" + numar + (text ? "?text=" + encodeURIComponent(text) : "");
  }
  function waLinkAplicatie(text, nr) {
    var numar = nr || numarWa();
    return "whatsapp://send?phone=" + numar + (text ? "&text=" + encodeURIComponent(text) : "");
  }
  function waProdus(produs) {
    var sablon = mesaje.produs || "Bună ziua! Doresc să comand {produs}.";
    return waLink(sablon.replace("{produs}", produs));
  }
  window.olizanWaLink = waLink;
  window.olizanWaProdus = waProdus;

  /* Recunoaște orice adresă de WhatsApp scrisă în pagină, indiferent de forma
     ei, și scoate din ea numărul și mesajul. */
  function citesteLinkWa(href) {
    if (!href) return null;
    var u;
    try { u = new URL(href, window.location.href); } catch (e) { return null; }
    var gazda = u.hostname.replace(/^www\./, "").toLowerCase();
    if (GAZDE_WA.indexOf(gazda) === -1) return null;
    var nr = gazda === "wa.me"
      ? u.pathname.replace(/[^0-9]/g, "")
      : (u.searchParams.get("phone") || "").replace(/[^0-9]/g, "");
    return { nr: nr || numarWa(), text: u.searchParams.get("text") || "" };
  }

  /* Deschide conversația. Pe calculator se folosește fila nouă cu wa.me (de
     acolo pornesc WhatsApp Desktop sau WhatsApp Web). Pe telefon se cheamă
     aplicația în fila curentă, iar dacă în ~1,2 secunde pagina este încă
     vizibilă — semn că aplicația nu s-a deschis — se merge pe wa.me. */
  function deschideConversatia(text, nr) {
    var numar = (nr || numarWa()).replace(/[^0-9]/g, "");
    var adresaWeb = waLink(text, numar);

    if (!esteMobil || !numar) {
      var fila = window.open(adresaWeb, "_blank", "noopener");
      if (!fila) window.location.href = adresaWeb;
      return;
    }

    var ceas = null;
    function renunta() {
      if (ceas) { clearTimeout(ceas); ceas = null; }
      document.removeEventListener("visibilitychange", laAscundere);
      window.removeEventListener("pagehide", renunta);
      window.removeEventListener("blur", renunta);
    }
    function laAscundere() { if (document.hidden) renunta(); }

    document.addEventListener("visibilitychange", laAscundere);
    window.addEventListener("pagehide", renunta);
    window.addEventListener("blur", renunta);
    ceas = setTimeout(function () {
      renunta();
      window.location.href = adresaWeb;
    }, 1200);

    window.location.href = waLinkAplicatie(text, numar);
  }
  window.olizanDeschideWa = deschideConversatia;

  function pregatesteLinkuriWa(ctx) {
    $$("[data-wa]", ctx).forEach(function (el) {
      if (el.getAttribute("href")) return;
      el.setAttribute("href", waLink(el.getAttribute("data-wa") || mesaje.general || ""));
      el.setAttribute("rel", "noopener noreferrer");
    });
    $$("[data-wa-produs]", ctx).forEach(function (el) {
      el.setAttribute("href", waProdus(el.getAttribute("data-wa-produs")));
      el.setAttribute("rel", "noopener noreferrer");
    });
    /* Adresele rămân în forma scurtă wa.me, iar pe telefon fără filă nouă:
       fila nouă rupe legătura cu aplicația și lasă clientul pe pagina web. */
    $$('a[href*="wa.me"], a[href*="whatsapp.com"]', ctx).forEach(function (el) {
      var info = citesteLinkWa(el.getAttribute("href"));
      if (!info) return;
      el.setAttribute("href", waLink(info.text, info.nr));
      if (esteMobil) el.removeAttribute("target");
      else el.setAttribute("target", "_blank");
      el.setAttribute("rel", "noopener noreferrer");
    });
  }
  pregatesteLinkuriWa(document);

  /* Un singur ascultător pentru toate butoanele de WhatsApp din site, inclusiv
     cele apărute după încărcare (meniu, recomandări, coș). */
  document.addEventListener("click", function (e) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var el = e.target;
    var a = el && el.closest ? el.closest("a[href]") : null;
    if (!a) return;
    var info = citesteLinkWa(a.getAttribute("href"));
    if (!info) return;
    e.preventDefault();
    deschideConversatia(info.text, info.nr);
  });

  /* ---- 3. Animații discrete la scroll ------------------------------------ */
  var observer = null;
  function urmareste(ctx) {
    var elemente = $$(".reveal", ctx);
    if (!elemente.length) return;
    if (reduceMotion || !("IntersectionObserver" in window)) {
      elemente.forEach(function (el) { el.classList.add("is-in"); });
      return;
    }
    if (!observer) {
      observer = new IntersectionObserver(function (intrari) {
        intrari.forEach(function (intrare) {
          if (intrare.isIntersecting) {
            intrare.target.classList.add("is-in");
            observer.unobserve(intrare.target);
          }
        });
      }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    }
    elemente.forEach(function (el) {
      if (!el.classList.contains("is-in")) observer.observe(el);
    });
  }
  urmareste(document);

  /* ---- 4. Buton „înapoi sus" -------------------------------------------- */
  (function inapoiSus() {
    var btn = $(".to-top");
    if (!btn) return;
    var onScroll = function () {
      btn.classList.toggle("is-visible", window.scrollY > 620);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    btn.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
    });
  })();

  /* Pictograma WhatsApp folosită în conținutul generat din JavaScript */
  var ICON_WA = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12.04 2c-5.5 0-9.96 4.46-9.96 9.96 0 1.76.46 3.48 1.34 5L2 22l5.2-1.36a9.9 9.9 0 0 0 4.84 1.24h.01c5.5 0 9.96-4.46 9.96-9.96A9.9 9.9 0 0 0 19.08 4.9 9.9 9.9 0 0 0 12.04 2Zm0 1.8c2.18 0 4.23.85 5.77 2.4a8.1 8.1 0 0 1 2.39 5.77c0 4.5-3.66 8.16-8.16 8.16a8.2 8.2 0 0 1-4.17-1.14l-.3-.18-3.09.81.82-3-.19-.31a8.1 8.1 0 0 1-1.24-4.34c0-4.5 3.66-8.17 8.17-8.17Zm-2.6 4.14c-.16 0-.42.06-.64.3-.22.24-.85.83-.85 2.03s.87 2.35.99 2.51c.12.16 1.7 2.6 4.13 3.55 2.02.8 2.43.64 2.87.6.44-.04 1.42-.58 1.62-1.15.2-.56.2-1.05.14-1.15-.06-.1-.22-.16-.46-.28-.24-.12-1.42-.7-1.64-.78-.22-.08-.38-.12-.54.12-.16.24-.62.78-.76.94-.14.16-.28.18-.52.06-.24-.12-1.01-.37-1.93-1.19-.71-.63-1.19-1.42-1.33-1.66-.14-.24-.02-.37.1-.49.11-.11.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.53-1.3-.74-1.78-.19-.45-.39-.39-.53-.4h-.47Z"/></svg>';

  /* ---- 4b. Oprirea comenzilor (pauză sau concediu) ----------------------- */
  /* Starea vine de la server. Cât timp este „blocat", nicăieri în pagină nu
     există buton de comandă: cardurile arată mesajul în locul butonului, coșul
     nu se poate trimite, iar în capul paginii apare anunțul restaurantului. */
  var oprire = D.stareComenzi && D.stareComenzi.blocat ? D.stareComenzi : null;
  function comenziOprite() { return !!oprire; }

  var anuntEl = null;
  function anuntOprire() {
    var gazda = $("#continut") || document.body;
    if (!oprire) {
      if (anuntEl && anuntEl.parentNode) anuntEl.parentNode.removeChild(anuntEl);
      anuntEl = null;
      document.body.classList.remove("comenzi-oprite");
      return;
    }
    if (!anuntEl) {
      anuntEl = document.createElement("div");
      anuntEl.className = "anunt";
      anuntEl.setAttribute("role", "status");
      gazda.insertBefore(anuntEl, gazda.firstChild);
    }
    anuntEl.innerHTML = '<div class="wrap anunt-in">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true">' +
        '<circle cx="12" cy="12" r="9"/><path d="M12 7.5v5.2"/><path d="M12 16.4h.01"/></svg>' +
      '<div>' +
        '<p class="anunt-titlu">' + esc(oprire.titlu || "Nu preluăm comenzi momentan") + '</p>' +
        (oprire.mesaj ? '<p class="anunt-text">' + esc(oprire.mesaj) + '</p>' : '') +
      '</div>' +
    '</div>';
    document.body.classList.add("comenzi-oprite");
  }
  anuntOprire();

  /* Serverul are ultimul cuvânt: dacă starea s-a schimbat între încărcarea
     paginii și trimiterea comenzii, pagina se aliniază pe loc. */
  function aplicaOprire(info) {
    oprire = { titlu: info.titlu || "Nu preluăm comenzi momentan", mesaj: info.eroare || info.mesaj || "", blocat: true };
    anuntOprire();
  }

  /* ---- 5. Prețuri, produse, mărimi — baza pentru carduri și coș ---------- */

  /* Sumele se afișează întotdeauna în format românesc: 135,00 lei

     Ca totalul să fie exact, fără marjă de eroare, prețurile nu se adună
     niciodată ca numere cu zecimale (0,1 + 0,2 nu dă fix 0,3 în niciun
     browser). Fiecare sumă este transformată o singură dată în bani — numere
     întregi — iar înmulțirile și adunările se fac doar între întregi. Abia la
     afișare banii se scriu din nou ca lei. Așa suma afișată este întotdeauna
     identică cu suma liniilor, și pe site, și în mesajul de WhatsApp. */
  function bani(valoare) {
    if (valoare === null || valoare === undefined || valoare === "") return NaN;
    var n = typeof valoare === "number" ? valoare : Number(String(valoare).trim().replace(",", "."));
    if (!isFinite(n)) return NaN;
    return Math.round(n * 100);
  }
  function nrRoBani(b) {
    if (typeof b !== "number" || !isFinite(b)) return "";
    var semn = b < 0 ? "-" : "";
    var v = Math.abs(Math.round(b));
    var zecimale = v % 100;
    return semn + Math.floor(v / 100) + "," + (zecimale < 10 ? "0" : "") + zecimale;
  }
  function leiBani(b) {
    var t = nrRoBani(b);
    return t ? t + " lei" : "";
  }
  function nrRo(valoare) {
    return nrRoBani(bani(valoare));
  }
  function lei(valoare) {
    var t = nrRo(valoare);
    return t ? t + " lei" : "";
  }
  window.olizanLei = lei;

  /* Toate mărimile de pizza vin din data/menu.js */
  var MARIMI = Array.isArray(D.marimiPizza) ? D.marimiPizza : [];
  function marimeDupaCod(cod) {
    for (var i = 0; i < MARIMI.length; i++) {
      if (MARIMI[i].cod === cod) return MARIMI[i];
    }
    return null;
  }

  /* Index cu toate produsele, ca să le găsim după id (coș, recomandări) */
  var produse = {};
  (Array.isArray(D.meniu) ? D.meniu : []).forEach(function (cat) {
    (cat.grupe || []).forEach(function (g) {
      (g.produse || []).forEach(function (p) {
        if (!p || !p.id) return;
        produse[p.id] = {
          p: p,
          grupa: g,
          categorie: cat,
          cuMarimi: !!g.cuMarimi,
          nume: (g.prefixComanda || "") + p.nume
        };
      });
    });
  });

  /* Prețul unitar, în bani. Fără mărime pentru produsele obișnuite. */
  function pretUnitar(intrare, codMarime) {
    if (!intrare) return NaN;
    if (intrare.cuMarimi) {
      var m = marimeDupaCod(codMarime);
      if (!m) return NaN;
      return bani(intrare.p[m.camp]);
    }
    return bani(intrare.p.pret);
  }
  function pretValid(v) {
    return typeof v === "number" && isFinite(v) && v > 0;
  }

  /* ---- Taxa de ambalaj --------------------------------------------------
     Regulile vin din data/menu.js (blocul „ambalaje"). Un produs care nu se
     regăsește nici la produse, nici la categorii nu primește nicio taxă.
     Serverul refolosește exact aceleași sume din netlify/lib/ambalaj.mts. */
  var AMBALAJE = D.ambalaje || {};
  var AMBALAJ_ETICHETA = AMBALAJE.eticheta || "Ambalaj";

  /* Taxa, în bani; orice valoare lipsă sau negativă înseamnă „fără taxă". */
  function sumaAmbalaj(v) {
    var n = bani(v);
    return isFinite(n) && n > 0 ? n : 0;
  }

  /* Taxa pentru o bucată din produs; 0 dacă produsul nu se ambalează. */
  function taxaAmbalaj(intrare, codMarime) {
    if (!intrare) return 0;
    var peProdus = AMBALAJE.produse || {};
    if (Object.prototype.hasOwnProperty.call(peProdus, intrare.p.id)) {
      return sumaAmbalaj(peProdus[intrare.p.id]);
    }
    var peCategorie = AMBALAJE.categorii || {};
    var idCat = intrare.categorie ? intrare.categorie.id : "";
    if (!Object.prototype.hasOwnProperty.call(peCategorie, idCat)) return 0;
    var regula = peCategorie[idCat];
    if (regula && typeof regula === "object") return sumaAmbalaj(regula[codMarime || ""]);
    return sumaAmbalaj(regula);
  }

  /* „+3 lei", „+1 leu" pe carduri: scurt, fără zecimale inutile, ca să nu
     concureze cu prețul produsului. Valoarea se primește deja în bani. */
  function ambalajScurt(valoare) {
    var v = typeof valoare === "number" && isFinite(valoare) && valoare > 0 ? Math.round(valoare) : 0;
    if (!v) return "";
    return "+" + (v % 100 === 0 ? String(v / 100) : nrRoBani(v)) + (v === 100 ? " leu" : " lei");
  }

  /* Eticheta discretă de sub preț, pe cardurile din meniu */
  function etichetaAmbalaj(valoare) {
    var scurt = ambalajScurt(valoare);
    if (!scurt) return "";
    return '<small class="prod-ambalaj" aria-label="' + esc(AMBALAJ_ETICHETA + ": " + leiBani(valoare)) + '">' +
      esc(scurt) + '</small>';
  }

  /* Denumirea completă, așa cum apare în coș și în mesajul de WhatsApp */
  function numeCuMarime(intrare, codMarime) {
    var m = intrare.cuMarimi ? marimeDupaCod(codMarime) : null;
    var nume = intrare.nume;
    if (m) return nume + " " + m.scurt;
    if (intrare.p.gramaj) return nume + " " + intrare.p.gramaj;
    return nume;
  }

  function descriereProdus(p) {
    return p.ing || p.desc || "";
  }

  /* Fotografia produsului + textul pentru fereastra mărită */
  function creditFoto(id) {
    var c = D.credite || {};
    return c[id] ? "Foto: " + c[id] : "";
  }
  /* Un produs fără fotografie încărcată încă: cardul rămâne exact la fel,
     doar că banda cu imaginea lipsește, ca la orice alt element opțional. */
  function areFoto(p) {
    return !!(p && p.imagine);
  }
  function fotoProdus(intrare) {
    var p = intrare.p;
    if (!areFoto(p)) return "";
    var alt = "Fotografie cu " + intrare.nume;
    var ing = descriereProdus(p);
    var capitol = intrare.nume + (ing ? " — " + ing : "");
    var credit = creditFoto(p.id);
    return '<button class="prod-foto" type="button" data-lb="' + esc(p.imagine) + '" ' +
      'data-lb-cap="' + esc(capitol + (credit ? " · " + credit : "")) + '" ' +
      'aria-label="Vezi mai mare fotografia: ' + esc(intrare.nume) + '">' +
      '<img src="' + esc(p.imagine) + '" alt="' + esc(alt) + '" loading="lazy" decoding="async" width="760" height="570">' +
      '</button>';
  }

  /* Zona de comandă a unui card: mărimi (doar pizza), preț și buton */
  function zonaComanda(intrare, sufix) {
    var p = intrare.p;
    var html = "";
    var numeGrup = "marime-" + p.id + "-" + sufix;

    /* Cât timp nu preluăm comenzi, cardul rămâne o fișă de prezentare:
       prețurile se văd în continuare, dar nu există nimic de apăsat. */
    if (comenziOprite()) {
      var preturi = intrare.cuMarimi
        ? MARIMI.map(function (m) {
            var pretM = bani(p[m.camp]);
            if (!pretValid(pretM)) return "";
            return '<span class="prod-price-linie">' + esc(m.eticheta) + ' <b>' + esc(leiBani(pretM)) + '</b>' +
              etichetaAmbalaj(taxaAmbalaj(intrare, m.cod)) + '</span>';
          }).join("")
        : '<span class="prod-price-linie"><b>' + esc(leiBani(bani(p.pret))) + '</b>' +
            etichetaAmbalaj(taxaAmbalaj(intrare, "")) + '</span>';
      return '<div class="prod-buy prod-buy--oprit">' +
          '<p class="prod-price">' + preturi + '</p>' +
        '</div>' +
        '<p class="prod-oprit">' + esc(oprire.titlu || "Nu preluăm comenzi momentan") + '</p>';
    }

    if (intrare.cuMarimi) {
      html += '<fieldset class="prod-sizes">' +
        '<legend>Alege mărimea</legend>' +
        MARIMI.map(function (m) {
          var pret = bani(p[m.camp]);
          if (!pretValid(pret)) return "";
          var ambalajM = taxaAmbalaj(intrare, m.cod);
          return '<label class="prod-size">' +
            '<input type="radio" name="' + esc(numeGrup) + '" value="' + esc(m.cod) + '" data-pret="' + pret + '"' +
              ' data-ambalaj="' + ambalajM + '">' +
            '<span class="prod-size-txt">' + esc(m.eticheta) + '</span>' +
            '<span class="prod-size-pret">' + esc(leiBani(pret)) +
              (ambalajM ? ' <small class="prod-ambalaj">' + esc(ambalajScurt(ambalajM)) + '</small>' : '') +
            '</span>' +
          '</label>';
        }).join("") +
      '</fieldset>';
    }

    /* Prețul de pornire și ambalajul potrivit lui: pentru pizza, mărimea
       normală, adică exact suma care se schimbă odată cu alegerea mărimii. */
    var pretPornire = bani(p.pret);
    var ambalajPornire = taxaAmbalaj(intrare, intrare.cuMarimi && MARIMI.length ? MARIMI[0].cod : "");
    html += '<div class="prod-buy">' +
      '<p class="prod-price">' +
        (intrare.cuMarimi ? '<small>de la</small> ' : "") +
        '<span data-pret-afisat>' + esc(leiBani(pretPornire)) + '</span>' +
        '<small class="prod-ambalaj" data-ambalaj-afisat' + (ambalajPornire ? '' : ' hidden') +
          ' aria-label="' + esc(AMBALAJ_ETICHETA + ": " + leiBani(ambalajPornire)) + '">' +
          esc(ambalajScurt(ambalajPornire)) +
        '</small>' +
      '</p>' +
      '<button class="btn btn--add" type="button" data-add="' + esc(p.id) + '">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 5v14"/><path d="M5 12h14"/></svg>' +
        'Adaugă în comandă</button>' +
    '</div>' +
    '<p class="prod-err" data-err hidden></p>';
    return html;
  }

  function cardProdus(intrare, sufix, eticheta) {
    var p = intrare.p;
    var ing = descriereProdus(p);
    return '<article class="prod' + (areFoto(p) ? '' : ' prod--fara-foto') + '" data-produs="' + esc(p.id) + '">' +
      fotoProdus(intrare) +
      (eticheta ? '<span class="prod-tag">' + esc(eticheta) + '</span>' : "") +
      '<div class="prod-body">' +
        '<h4 class="prod-name">' + esc(intrare.nume) + '</h4>' +
        (ing ? '<p class="prod-ing">' + esc(ing) + '</p>' : "") +
        (p.gramaj ? '<p class="prod-gram">' + esc(p.gramaj) + '</p>' : "") +
        zonaComanda(intrare, sufix) +
      '</div>' +
    '</article>';
  }

  /* Prețul afișat se schimbă imediat ce clientul alege altă mărime.
     Atributele data- păstrează sumele tot în bani, deci se citesc ca întregi. */
  function baniDinAtribut(v) {
    var n = parseInt(v, 10);
    return isFinite(n) ? n : 0;
  }
  document.addEventListener("change", function (e) {
    var input = e.target;
    if (!input || input.type !== "radio" || !input.name || input.name.indexOf("marime-") !== 0) return;
    var card = input.closest ? input.closest(".prod") : null;
    if (!card) return;
    var afis = $("[data-pret-afisat]", card);
    if (afis) afis.textContent = leiBani(baniDinAtribut(input.getAttribute("data-pret")));
    var afisAmbalaj = $("[data-ambalaj-afisat]", card);
    if (afisAmbalaj) {
      var taxa = baniDinAtribut(input.getAttribute("data-ambalaj"));
      afisAmbalaj.textContent = ambalajScurt(taxa);
      afisAmbalaj.setAttribute("aria-label", AMBALAJ_ETICHETA + ": " + leiBani(taxa));
      afisAmbalaj.hidden = !taxa;
    }
    var err = $("[data-err]", card);
    if (err) { err.hidden = true; err.textContent = ""; }
  });

  /* Prețurile „de la …” de pe prima pagină se calculează din data/menu.js,
     ca să nu existe sume scrise de mână în alt fișier. */
  (function preturiMinime() {
    var tinte = $$("[data-pret-min]");
    if (!tinte.length) return;
    tinte.forEach(function (el) {
      var idCat = el.getAttribute("data-pret-min");
      var minim = Infinity;
      (Array.isArray(D.meniu) ? D.meniu : []).forEach(function (c) {
        if (c.id !== idCat) return;
        (c.grupe || []).forEach(function (g) {
          (g.produse || []).forEach(function (p) {
            var v = bani(p.pret);
            if (pretValid(v) && v < minim) minim = v;
          });
        });
      });
      if (isFinite(minim)) el.textContent = "de la " + leiBani(minim);
    });
  })();

  /* ---- 5b. Recomandările casei ------------------------------------------ */
  (function recomandari() {
    var grid = $("#recomandari-grid");
    if (!grid || !Array.isArray(D.recomandari)) return;

    var carduri = D.recomandari.map(function (r, i) {
      var intrare = produse[r.produs];
      if (!intrare) return "";
      var intarziere = i % 4 ? " reveal-d" + (i % 4) : "";
      return '<div class="reveal' + intarziere + '">' + cardProdus(intrare, "rec", r.eticheta) + '</div>';
    }).join("");

    if (!carduri) return;
    grid.innerHTML = carduri;
    urmareste(grid);
  })();

  /* ---- 6. Meniul cu taburi ---------------------------------------------- */
  (function meniu() {
    var tabsWrap = $("#menu-tabs");
    var panelsWrap = $("#menu-panels");
    if (!tabsWrap || !panelsWrap || !Array.isArray(D.meniu)) return;

    var categorii = D.meniu;

    function randeazaGrupa(g, idxCat) {
      return '<div class="menu-group">' +
        (g.titlu ? '<h4 class="menu-group-title">' + esc(g.titlu) + '</h4>' : '') +
        (g.nota ? '<p class="menu-group-note">' + esc(g.nota) + '</p>' : '') +
        '<div class="prod-grid">' +
          g.produse.map(function (p) {
            var intrare = produse[p.id];
            return intrare ? cardProdus(intrare, "m" + idxCat) : "";
          }).join("") +
        '</div>' +
      '</div>';
    }

    tabsWrap.innerHTML = categorii.map(function (c, i) {
      return '<button type="button" role="tab" class="menu-tab" id="tab-' + esc(c.id) + '" ' +
        'aria-controls="panel-' + esc(c.id) + '" aria-selected="' + (i === 0 ? "true" : "false") + '" ' +
        'tabindex="' + (i === 0 ? "0" : "-1") + '">' + esc(c.tab) + '</button>';
    }).join("");

    panelsWrap.innerHTML = categorii.map(function (c, i) {
      return '<section class="menu-panel" role="tabpanel" id="panel-' + esc(c.id) + '" ' +
        'aria-labelledby="tab-' + esc(c.id) + '" tabindex="0"' + (i === 0 ? "" : " hidden") + '>' +
        '<header class="menu-panel-head">' +
          '<div><h3>' + esc(c.titlu) + '</h3>' + (c.nota ? '<p>' + esc(c.nota) + '</p>' : '') + '</div>' +
          (c.imagine ? '<img src="' + esc(c.imagine) + '" alt="" aria-hidden="true" loading="lazy" decoding="async" width="600" height="600">' : '') +
        '</header>' +
        c.grupe.map(function (g) { return randeazaGrupa(g, i); }).join("") +
      '</section>';
    }).join("");

    if (mesaje.notaFoto && !$("#menu-nota-foto")) {
      var notaFoto = document.createElement("p");
      notaFoto.id = "menu-nota-foto";
      notaFoto.className = "menu-nota-foto";
      notaFoto.textContent = mesaje.notaFoto;
      panelsWrap.parentNode.insertBefore(notaFoto, panelsWrap);
    }

    var taburi = $$(".menu-tab", tabsWrap);
    var panouri = $$(".menu-panel", panelsWrap);

    function activeaza(idx, cuFocus) {
      taburi.forEach(function (t, i) {
        var activ = i === idx;
        t.setAttribute("aria-selected", activ ? "true" : "false");
        t.setAttribute("tabindex", activ ? "0" : "-1");
        if (activ && cuFocus) t.focus();
      });
      panouri.forEach(function (p, i) {
        if (i === idx) p.removeAttribute("hidden"); else p.setAttribute("hidden", "");
      });
      var id = categorii[idx].id;
      if (window.history && history.replaceState) {
        history.replaceState(null, "", "#" + id);
      }
      taburi[idx].scrollIntoView({ block: "nearest", inline: "nearest", behavior: reduceMotion ? "auto" : "smooth" });
    }

    taburi.forEach(function (t, i) {
      t.addEventListener("click", function () { activeaza(i, false); });
      t.addEventListener("keydown", function (e) {
        var next = null;
        if (e.key === "ArrowRight") next = (i + 1) % taburi.length;
        else if (e.key === "ArrowLeft") next = (i - 1 + taburi.length) % taburi.length;
        else if (e.key === "Home") next = 0;
        else if (e.key === "End") next = taburi.length - 1;
        if (next !== null) { e.preventDefault(); activeaza(next, true); }
      });
    });

    function dinHash() {
      var h = (location.hash || "").replace("#", "");
      if (!h) return;
      for (var i = 0; i < categorii.length; i++) {
        if (categorii[i].id === h) { activeaza(i, false); return; }
      }
    }
    dinHash();
    window.addEventListener("hashchange", dinHash);

    // linkurile din alte secțiuni către o categorie anume
    $$("[data-menu-tab]").forEach(function (el) {
      el.addEventListener("click", function () {
        var cerut = el.getAttribute("data-menu-tab");
        for (var i = 0; i < categorii.length; i++) {
          if (categorii[i].id === cerut) { activeaza(i, false); break; }
        }
      });
    });

    var fallback = $("#menu-fallback");
    if (fallback && fallback.parentNode) fallback.parentNode.removeChild(fallback);

    pregatesteLinkuriWa(panelsWrap);
  })();

  /* ---- 7. Fereastra mărită pentru imagini (galerie + fotografii produse) -- */
  (function lightbox() {
    var lb = $("#lightbox");
    if (!lb) {
      /* Pe paginile fără galerie o construim din JavaScript, ca fotografiile
         produselor să poată fi deschise mărite oriunde apar. */
      lb = document.createElement("div");
      lb.className = "lb";
      lb.id = "lightbox";
      lb.setAttribute("role", "dialog");
      lb.setAttribute("aria-modal", "true");
      lb.setAttribute("aria-label", "Imagine mărită");
      lb.setAttribute("aria-hidden", "true");
      lb.innerHTML = '<button class="lb-btn lb-close" type="button" aria-label="Închide imaginea">&times;</button>' +
        '<button class="lb-btn lb-prev" type="button" aria-label="Imaginea anterioară">&#8249;</button>' +
        '<button class="lb-btn lb-next" type="button" aria-label="Imaginea următoare">&#8250;</button>' +
        '<figure class="lb-figure"><img id="lb-img" src="" alt=""><figcaption id="lb-cap"></figcaption></figure>';
      document.body.appendChild(lb);
    }
    var img = $("#lb-img", lb);
    var cap = $("#lb-cap", lb);

    var elemente = [];
    var indexCurent = 0;
    var ultimulFocus = null;

    function arata(i) {
      if (!elemente.length) return;
      indexCurent = (i + elemente.length) % elemente.length;
      var el = elemente[indexCurent];
      var text = el.getAttribute("data-lb-cap") || "";
      img.setAttribute("src", el.getAttribute("data-lb"));
      img.setAttribute("alt", text || "Imagine din galeria OLIZAN");
      cap.textContent = text;
    }
    function deschide(el) {
      elemente = $$("[data-lb]");
      var i = elemente.indexOf(el);
      ultimulFocus = document.activeElement;
      arata(i < 0 ? 0 : i);
      lb.classList.add("is-open");
      lb.setAttribute("aria-hidden", "false");
      document.body.classList.add("lb-open");
      $(".lb-close", lb).focus();
    }
    function inchide() {
      lb.classList.remove("is-open");
      lb.setAttribute("aria-hidden", "true");
      document.body.classList.remove("lb-open");
      if (ultimulFocus && ultimulFocus.focus) ultimulFocus.focus();
    }

    /* Delegare: merge și pentru imaginile generate ulterior din JavaScript */
    document.addEventListener("click", function (e) {
      var el = e.target.closest ? e.target.closest("[data-lb]") : null;
      if (!el) return;
      e.preventDefault();
      deschide(el);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key !== "Enter" && e.key !== " ") return;
      var el = e.target.closest ? e.target.closest("[data-lb]") : null;
      if (!el || el.tagName === "BUTTON" || el.tagName === "A") return;
      e.preventDefault();
      deschide(el);
    });
    $$("[data-lb]").forEach(function (el) {
      if (el.tagName !== "BUTTON" && el.tagName !== "A" && !el.hasAttribute("tabindex")) {
        el.setAttribute("tabindex", "0");
        el.setAttribute("role", "button");
      }
    });

    $(".lb-close", lb).addEventListener("click", inchide);
    $(".lb-prev", lb).addEventListener("click", function () { arata(indexCurent - 1); });
    $(".lb-next", lb).addEventListener("click", function () { arata(indexCurent + 1); });
    lb.addEventListener("click", function (e) { if (e.target === lb) inchide(); });
    document.addEventListener("keydown", function (e) {
      if (!lb.classList.contains("is-open")) return;
      if (e.key === "Escape") inchide();
      else if (e.key === "ArrowLeft") arata(indexCurent - 1);
      else if (e.key === "ArrowRight") arata(indexCurent + 1);
    });
  })();

  /* ---- 7b. Coșul de comandă ---------------------------------------------- */
  (function cos() {
    if (!Object.keys(produse).length) return;

    var CHEIE = "olizan_cos_v1";
    var linii = [];      /* [{ id, marime, cant }] */
    var client = { nume: "", telefon: "", modalitate: "ridicare", adresa: "", observatii: "" };

    /* --- memorare temporară în browser (rezistă la reîncărcarea paginii) --- */
    function incarca() {
      try {
        var brut = localStorage.getItem(CHEIE);
        if (!brut) return;
        var d = JSON.parse(brut);
        if (d && Array.isArray(d.linii)) {
          linii = d.linii.filter(function (l) {
            var intrare = produse[l.id];
            if (!intrare) return false;
            if (intrare.cuMarimi && !marimeDupaCod(l.marime)) return false;
            l.cant = Math.max(1, Math.min(99, parseInt(l.cant, 10) || 1));
            return pretValid(pretUnitar(intrare, l.marime));
          });
        }
        if (d && d.client) {
          Object.keys(client).forEach(function (k) {
            if (typeof d.client[k] === "string") client[k] = d.client[k];
          });
        }
      } catch (e) { linii = []; }
    }
    function salveaza() {
      try {
        localStorage.setItem(CHEIE, JSON.stringify({ linii: linii, client: client }));
      } catch (e) {}
    }
    incarca();

    /* --- legătura cu contul clientului ------------------------------------ */
    /* Dacă vizitatorul este autentificat, coșul urcă în contul lui, ca să-l
       regăsească pe orice dispozitiv. Sesiunea stă într-un cookie HttpOnly. */
    var contClient = (window.OLIZAN && window.OLIZAN.client) || null;
    var temporizatorCos = null;
    /* coșul nu urcă în cont până nu îl citim pe cel salvat, ca să nu-l ștergem */
    var cosCitit = !contClient;

    function urcaCos() {
      if (!contClient || !cosCitit) return;
      window.clearTimeout(temporizatorCos);
      temporizatorCos = window.setTimeout(function () {
        fetch("/api/account/cos", {
          method: "PUT",
          credentials: "same-origin",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ cos: linii })
        }).catch(function () {});
      }, 800);
    }

    function imbinaCos(dinCont) {
      if (!Array.isArray(dinCont)) return false;
      var schimbat = false;
      dinCont.forEach(function (s) {
        var intrare = produse[s.id];
        if (!intrare) return;
        var marime = s.marime || "";
        if (intrare.cuMarimi && !marimeDupaCod(marime)) return;
        if (!pretValid(pretUnitar(intrare, marime))) return;
        var cant = Math.max(1, Math.min(99, parseInt(s.cant, 10) || 1));
        for (var i = 0; i < linii.length; i++) {
          if (linii[i].id === s.id && (linii[i].marime || "") === marime) {
            if (cant > linii[i].cant) { linii[i].cant = cant; schimbat = true; }
            return;
          }
        }
        linii.push({ id: s.id, marime: marime, cant: cant });
        schimbat = true;
      });
      return schimbat;
    }

    /* --- calcule: preț unitar × cantitate = subtotal, apoi totalul general -
       Ambalajul se ține separat de produse, ca să poată fi arătat clientului
       ca linie distinctă în coș și în mesajul de WhatsApp.
       Toate sumele de aici sunt în bani (întregi), deci înmulțirile și
       adunările sunt exacte: totalul afișat este mereu suma liniilor. */
    function subtotal(l) {
      var intrare = produse[l.id];
      var u = pretUnitar(intrare, l.marime);
      if (!pretValid(u)) return NaN;
      return u * l.cant;
    }
    function ambalajLinie(l) {
      var intrare = produse[l.id];
      return taxaAmbalaj(intrare, l.marime) * l.cant;
    }
    function totalProduse() {
      var t = 0;
      for (var i = 0; i < linii.length; i++) {
        var s = subtotal(linii[i]);
        if (!isFinite(s)) return NaN;
        t += s;
      }
      return t;
    }
    function totalAmbalaj() {
      var t = 0;
      for (var i = 0; i < linii.length; i++) t += ambalajLinie(linii[i]);
      return t;
    }
    function total() {
      var p = totalProduse();
      if (!isFinite(p)) return NaN;
      return p + totalAmbalaj();
    }
    function bucati() {
      return linii.reduce(function (n, l) { return n + l.cant; }, 0);
    }

    /* --- structura din pagină (o singură dată, pe orice pagină) ------------ */
    var drawer = document.createElement("aside");
    drawer.className = "cart";
    drawer.id = "cos";
    drawer.setAttribute("role", "dialog");
    drawer.setAttribute("aria-modal", "true");
    drawer.setAttribute("aria-labelledby", "cart-title");
    drawer.setAttribute("aria-hidden", "true");
    drawer.innerHTML =
      '<div class="cart-head">' +
        '<h2 id="cart-title">Comanda mea</h2>' +
        '<button class="cart-close" type="button" data-cart-close aria-label="Închide coșul">&times;</button>' +
      '</div>' +
      '<div class="cart-scroll">' +
        '<p class="cart-empty" id="cart-empty">Coșul este gol. Alege un produs din meniu și apasă „Adaugă în comandă".</p>' +
        '<ul class="cart-items" id="cart-items"></ul>' +
        '<div class="cart-sumar" id="cart-sumar" hidden>' +
          '<div class="cart-sum"><span>Produse</span><b id="cart-produse">' + esc(leiBani(0)) + '</b></div>' +
          '<div class="cart-sum" id="cart-ambalaj-rand" hidden>' +
            '<span>' + esc(AMBALAJ_ETICHETA) + '</span><b id="cart-ambalaj">' + esc(leiBani(0)) + '</b>' +
          '</div>' +
        '</div>' +
        '<div class="cart-total"><span>Total comandă</span><b id="cart-total">' + esc(leiBani(0)) + '</b></div>' +
        '<div class="cart-oprit" id="cart-oprit" hidden></div>' +
        '<form class="cart-form" id="cart-form" novalidate>' +
          '<div class="cart-cont" id="cart-cont" hidden></div>' +
          '<div class="field"><label for="cart-nume">Nume și prenume *</label>' +
            '<input id="cart-nume" name="nume" type="text" autocomplete="name" required></div>' +
          '<div class="field"><label for="cart-telefon">Telefon *</label>' +
            '<input id="cart-telefon" name="telefon" type="tel" autocomplete="tel" inputmode="tel" required></div>' +
          '<fieldset class="cart-mod"><legend>Modalitate *</legend>' +
            '<label class="cart-radio"><input type="radio" name="modalitate" value="ridicare" checked> Ridicare personală</label>' +
            '<label class="cart-radio"><input type="radio" name="modalitate" value="livrare"> Livrare' +
              '<small>' + esc(mesaje.livrareNota || "Disponibilitatea și costul livrării se confirmă prin WhatsApp.") + '</small>' +
            '</label>' +
          '</fieldset>' +
          '<div class="field" id="cart-adresa-camp" hidden><label for="cart-adresa">Adresa de livrare *</label>' +
            '<input id="cart-adresa" name="adresa" type="text" autocomplete="street-address"></div>' +
          '<label class="cart-salveaza" id="cart-salveaza" hidden>' +
            '<input type="checkbox" id="cart-salveaza-check">' +
            '<span>Salvează adresa în contul meu, pentru comenzile viitoare.</span>' +
          '</label>' +
          '<div class="field"><label for="cart-obs">Observații</label>' +
            '<textarea id="cart-obs" name="observatii" rows="2" placeholder="Ex.: Pizza fără ardei iute."></textarea></div>' +
          '<p class="cart-errors" id="cart-errors" role="alert" hidden></p>' +
          '<button class="btn btn--wa btn--block" type="submit" id="cart-send">' + ICON_WA +
            'Trimite comanda pe WhatsApp</button>' +
          '<p class="cart-note">Comanda nu se trimite automat: se deschide conversația WhatsApp cu mesajul completat, iar tu apeși butonul de trimitere.</p>' +
        '</form>' +
        '<div class="cart-confirm" id="cart-confirm" hidden>' +
          '<p class="cart-confirm-nr" id="cart-confirm-nr" hidden></p>' +
          '<p>S-a deschis WhatsApp cu comanda ta?</p>' +
          '<div class="cart-confirm-row">' +
            '<button class="btn btn--sm" type="button" id="cart-confirm-da">Da, golește coșul</button>' +
            '<button class="btn btn--ghost btn--sm" type="button" id="cart-confirm-nu">Nu, păstrează comanda</button>' +
          '</div>' +
        '</div>' +
      '</div>';

    var fundal = document.createElement("div");
    fundal.className = "cart-backdrop";
    fundal.setAttribute("data-cart-close", "");
    fundal.hidden = true;

    document.body.appendChild(fundal);
    document.body.appendChild(drawer);

    /* butonul de coș stă în antet, care rămâne fixat pe ecran pe toate paginile */
    function butonCos(clasa, eticheta) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = clasa;
      b.setAttribute("data-cart-open", "");
      b.setAttribute("aria-controls", "cos");
      b.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
        '<path d="M3 4h2l2.4 11.2a2 2 0 0 0 2 1.6h7.5a2 2 0 0 0 2-1.55L20.5 8H6"/>' +
        '<circle cx="10" cy="20" r="1.4"/><circle cx="17" cy="20" r="1.4"/></svg>' +
        '<span class="cart-btn-txt">' + esc(eticheta) + '</span>' +
        '<span class="cart-count" data-cart-count>0</span>';
      return b;
    }
    var headerInner = $(".header-inner");
    if (headerInner) {
      var tintaHeader = $(".header-cta", headerInner);
      var bh = butonCos("cart-btn", "Coș");
      bh.setAttribute("aria-label", "Deschide coșul de comandă");
      if (tintaHeader) headerInner.insertBefore(bh, tintaHeader);
      else headerInner.appendChild(bh);
    }

    var listaEl = $("#cart-items", drawer);
    var goleEl = $("#cart-empty", drawer);
    var totalEl = $("#cart-total", drawer);
    var sumarEl = $("#cart-sumar", drawer);
    var produseEl = $("#cart-produse", drawer);
    var ambalajRandEl = $("#cart-ambalaj-rand", drawer);
    var ambalajEl = $("#cart-ambalaj", drawer);
    var formEl = $("#cart-form", drawer);
    var opritEl = $("#cart-oprit", drawer);
    var erori = $("#cart-errors", drawer);
    var confirmEl = $("#cart-confirm", drawer);
    var numarEl = $("#cart-confirm-nr", drawer);
    var campAdresa = $("#cart-adresa-camp", drawer);

    /* Mesajul care ține locul formularului cât timp comenzile sunt oprite.
       Produsele adăugate mai devreme rămân în coș pentru redeschidere. */
    function afiseazaOprirea() {
      if (!comenziOprite()) { opritEl.hidden = true; return; }
      opritEl.innerHTML = '<p class="cart-oprit-titlu">' + esc(oprire.titlu || "Nu preluăm comenzi momentan") + '</p>' +
        (oprire.mesaj ? '<p>' + esc(oprire.mesaj) + '</p>' : '') +
        (linii.length ? '<p class="cart-oprit-nota">Produsele alese rămân în coș până când începem din nou să preluăm comenzi.</p>' : '');
      opritEl.hidden = false;
    }

    /* --- deschidere / închidere ------------------------------------------- */
    var ultimulFocusCos = null;
    function deschideCos() {
      ultimulFocusCos = document.activeElement;
      drawer.classList.add("is-open");
      drawer.setAttribute("aria-hidden", "false");
      fundal.hidden = false;
      document.body.classList.add("cart-open");
      var inchide = $(".cart-close", drawer);
      if (inchide) inchide.focus();
    }
    function inchideCos() {
      drawer.classList.remove("is-open");
      drawer.setAttribute("aria-hidden", "true");
      fundal.hidden = true;
      document.body.classList.remove("cart-open");
      if (ultimulFocusCos && ultimulFocusCos.focus) ultimulFocusCos.focus();
    }
    document.addEventListener("click", function (e) {
      var t = e.target;
      if (!t.closest) return;
      if (t.closest("[data-cart-open]")) { e.preventDefault(); deschideCos(); }
      else if (t.closest("[data-cart-close]")) { e.preventDefault(); inchideCos(); }
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && drawer.classList.contains("is-open")) inchideCos();
    });

    /* --- afișarea coșului --------------------------------------------------*/
    function randeaza() {
      /* dacă tocmai se edita o cantitate, cursorul revine în același câmp */
      var activ = document.activeElement;
      var focusQty = activ && activ.hasAttribute && activ.hasAttribute("data-qty")
        ? activ.getAttribute("data-qty") : null;

      listaEl.innerHTML = linii.map(function (l, i) {
        var intrare = produse[l.id];
        var p = intrare.p;
        var m = intrare.cuMarimi ? marimeDupaCod(l.marime) : null;
        var u = pretUnitar(intrare, l.marime);
        var ing = descriereProdus(p);
        var taxa = taxaAmbalaj(intrare, l.marime);
        return '<li class="cart-item' + (areFoto(p) ? '' : ' cart-item--fara-foto') + '" data-linie="' + i + '">' +
          (areFoto(p)
            ? '<img class="cart-thumb" src="' + esc(p.imagine) + '" alt="' + esc(intrare.nume) + '" loading="lazy" decoding="async" width="120" height="90">'
            : '') +
          '<div class="cart-item-main">' +
            '<p class="cart-item-name">' + esc(intrare.nume) +
              (m ? ' <span class="cart-item-size">' + esc(m.eticheta) + '</span>' : '') +
              (!m && p.gramaj ? ' <span class="cart-item-size">' + esc(p.gramaj) + '</span>' : '') +
            '</p>' +
            (ing ? '<p class="cart-item-ing">' + esc(ing) + '</p>' : '') +
            '<p class="cart-item-unit">' + esc(leiBani(u)) + ' / buc.</p>' +
            (taxa ? '<p class="cart-item-ambalaj">' + esc(AMBALAJ_ETICHETA + ": " + leiBani(taxa)) + ' / buc.' +
              (l.cant > 1 ? ' <span>(' + esc(leiBani(ambalajLinie(l))) + ')</span>' : '') + '</p>' : '') +
            '<div class="cart-item-row">' +
              '<div class="qty">' +
                '<button type="button" class="qty-btn" data-minus="' + i + '" aria-label="Scade cantitatea pentru ' + esc(intrare.nume) + '">&minus;</button>' +
                '<input class="qty-input" type="number" min="1" max="99" step="1" value="' + l.cant + '" data-qty="' + i + '" aria-label="Cantitate pentru ' + esc(intrare.nume) + '">' +
                '<button type="button" class="qty-btn" data-plus="' + i + '" aria-label="Crește cantitatea pentru ' + esc(intrare.nume) + '">+</button>' +
              '</div>' +
              '<b class="cart-item-sub">' + esc(leiBani(subtotal(l))) + '</b>' +
              '<button type="button" class="cart-del" data-del="' + i + '" aria-label="Elimină ' + esc(intrare.nume) + ' din coș">' +
                '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M6 7l1 13h10l1-13"/><path d="M9 7V4h6v3"/></svg>' +
              '</button>' +
            '</div>' +
          '</div>' +
        '</li>';
      }).join("");

      var t = total();
      var tp = totalProduse();
      var ta = totalAmbalaj();
      totalEl.textContent = isFinite(t) ? leiBani(t) : "—";
      produseEl.textContent = isFinite(tp) ? leiBani(tp) : "—";
      ambalajEl.textContent = leiBani(ta);
      ambalajRandEl.hidden = ta <= 0;
      sumarEl.hidden = linii.length === 0;
      goleEl.hidden = linii.length > 0 || comenziOprite();
      listaEl.hidden = linii.length === 0;
      formEl.hidden = linii.length === 0 || comenziOprite();
      afiseazaOprirea();
      $$("[data-cart-count]").forEach(function (el) {
        el.textContent = String(bucati());
        el.classList.toggle("is-zero", bucati() === 0);
      });
      if (focusQty !== null) {
        var reveniri = $('[data-qty="' + focusQty + '"]', listaEl);
        if (reveniri) reveniri.focus();
      }
      salveaza();
      urcaCos();
    }

    /* --- operațiuni pe coș -------------------------------------------------*/
    function adauga(id, marime) {
      if (comenziOprite()) return false;
      var intrare = produse[id];
      if (!intrare) return false;
      if (!pretValid(pretUnitar(intrare, marime))) return false;
      for (var i = 0; i < linii.length; i++) {
        if (linii[i].id === id && (linii[i].marime || "") === (marime || "")) {
          linii[i].cant = Math.min(99, linii[i].cant + 1);
          randeaza();
          return true;
        }
      }
      linii.push({ id: id, marime: marime || "", cant: 1 });
      randeaza();
      return true;
    }
    function seteazaCant(i, val) {
      if (!linii[i]) return;
      var n = parseInt(val, 10);
      if (!isFinite(n) || n < 1) n = 1;
      if (n > 99) n = 99;
      linii[i].cant = n;
      randeaza();
    }
    function elimina(i) {
      if (!linii[i]) return;
      linii.splice(i, 1);
      randeaza();
    }

    listaEl.addEventListener("click", function (e) {
      var b = e.target.closest ? e.target.closest("button") : null;
      if (!b) return;
      if (b.hasAttribute("data-plus")) seteazaCant(+b.getAttribute("data-plus"), linii[+b.getAttribute("data-plus")].cant + 1);
      else if (b.hasAttribute("data-minus")) seteazaCant(+b.getAttribute("data-minus"), linii[+b.getAttribute("data-minus")].cant - 1);
      else if (b.hasAttribute("data-del")) elimina(+b.getAttribute("data-del"));
    });
    listaEl.addEventListener("change", function (e) {
      var inp = e.target;
      if (inp.hasAttribute && inp.hasAttribute("data-qty")) seteazaCant(+inp.getAttribute("data-qty"), inp.value);
    });

    /* --- butonul „Adaugă în comandă" de pe carduri --------------------------*/
    var mesajTemporizator = null;
    function feedback(card, text) {
      var el = $("[data-err]", card);
      if (!el) return;
      el.textContent = text;
      el.hidden = false;
      el.classList.remove("is-err");
      window.clearTimeout(mesajTemporizator);
      mesajTemporizator = window.setTimeout(function () { el.hidden = true; }, 3500);
    }
    function eroareCard(card, text) {
      var el = $("[data-err]", card);
      if (!el) return;
      el.textContent = text;
      el.hidden = false;
      el.classList.add("is-err");
    }

    document.addEventListener("click", function (e) {
      var btn = e.target.closest ? e.target.closest("[data-add]") : null;
      if (!btn) return;
      e.preventDefault();
      var id = btn.getAttribute("data-add");
      var intrare = produse[id];
      var card = btn.closest(".prod");
      if (!intrare || !card) return;

      /* Buton rămas dintr-o pagină deschisă înainte de oprirea comenzilor */
      if (comenziOprite()) {
        eroareCard(card, oprire.titlu || "Nu preluăm comenzi momentan.");
        return;
      }

      var marime = "";
      if (intrare.cuMarimi) {
        var ales = $(".prod-sizes input:checked", card);
        if (!ales) {
          eroareCard(card, "Alege mai întâi mărimea pizzei: " +
            MARIMI.map(function (m) { return m.eticheta; }).join(" sau ") + ".");
          var primul = $(".prod-sizes input", card);
          if (primul) primul.focus();
          return;
        }
        marime = ales.value;
      }
      if (!adauga(id, marime)) {
        eroareCard(card, "Acest produs nu poate fi comandat online. Te rugăm să ne suni.");
        return;
      }
      feedback(card, numeCuMarime(intrare, marime) + " a fost adăugat în comandă.");
      btn.classList.add("is-added");
      window.setTimeout(function () { btn.classList.remove("is-added"); }, 900);
    });

    /* --- formularul clientului ---------------------------------------------*/
    var campNume = $("#cart-nume", drawer);
    var campTel = $("#cart-telefon", drawer);
    var campAdr = $("#cart-adresa", drawer);
    var campObs = $("#cart-obs", drawer);
    var randSalveaza = $("#cart-salveaza", drawer);
    var bifaSalveaza = $("#cart-salveaza-check", drawer);
    var notaCont = $("#cart-cont", drawer);

    function modalitateAleasa() {
      var r = $("input[name=modalitate]:checked", drawer);
      return r ? r.value : "ridicare";
    }
    function actualizeazaAdresa() {
      var livrare = modalitateAleasa() === "livrare";
      campAdresa.hidden = !livrare;
      campAdr.required = livrare;
      randSalveaza.hidden = !livrare || !contClient;
    }
    formEl.addEventListener("change", function () {
      actualizeazaAdresa();
      client.nume = campNume.value;
      client.telefon = campTel.value;
      client.adresa = campAdr.value;
      client.observatii = campObs.value;
      client.modalitate = modalitateAleasa();
      salveaza();
    });

    /* datele completate anterior rămân disponibile după reîncărcare */
    campNume.value = client.nume;
    campTel.value = client.telefon;
    campAdr.value = client.adresa;
    campObs.value = client.observatii;
    var radioSalvat = $("input[name=modalitate][value=" + (client.modalitate === "livrare" ? "livrare" : "ridicare") + "]", drawer);
    if (radioSalvat) radioSalvat.checked = true;
    actualizeazaAdresa();

    /* --- datele venite din contul clientului ------------------------------ */
    if (contClient) {
      notaCont.innerHTML = '<span>Comanzi din contul <b>' + esc(contClient.email) + '</b>. ' +
        'Comenzile se salvează automat în <a href="/cont">contul tău</a>.</span>';
      notaCont.hidden = false;
      if (!campNume.value.trim() && contClient.nume) campNume.value = contClient.nume;
      if (!campTel.value.trim() && contClient.telefon) campTel.value = contClient.telefon;

      /* coșul salvat în cont se îmbină cu cel din browser */
      fetch("/api/account/cos", { credentials: "same-origin", headers: { accept: "application/json" } })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (d) {
          cosCitit = true;
          if (d && imbinaCos(d.cos)) randeaza();
          else urcaCos();
        })
        .catch(function () { cosCitit = true; });

      /* adresa implicită completează câmpul de livrare, dacă e gol */
      fetch("/api/account/adrese", { credentials: "same-origin", headers: { accept: "application/json" } })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (d) {
          if (!d || !Array.isArray(d.adrese) || !d.adrese.length) return;
          var implicita = d.adrese[0];
          if (campAdr.value.trim()) return;
          campAdr.value = implicita.street + (implicita.city ? ", " + implicita.city : "") +
            (implicita.details ? " (" + implicita.details + ")" : "");
          client.adresa = campAdr.value;
          salveaza();
        })
        .catch(function () {});
    } else {
      notaCont.innerHTML = '<span>Ai <a href="/cont">cont OLIZAN</a>? ' +
        'Autentifică-te ca să-ți salvezi adresa și să vezi istoricul comenzilor.</span>';
      notaCont.hidden = false;
    }

    function arataErori(lista, camp) {
      erori.innerHTML = lista.map(function (t) { return esc(t); }).join("<br>");
      erori.hidden = false;
      if (camp && camp.focus) camp.focus();
    }

    function mesajComanda(numar) {
      var t = total();
      var tp = totalProduse();
      var ta = totalAmbalaj();
      /* Fiecare linie își arată ambalajul lângă preț, iar sumele de la final
         despart clar produsele de ambalaj, ca la casa restaurantului. */
      var rand = linii.map(function (l) {
        var intrare = produse[l.id];
        var taxa = ambalajLinie(l);
        return l.cant + " × " + numeCuMarime(intrare, l.marime) + " — " + leiBani(subtotal(l)) +
          (taxa ? " (+ " + AMBALAJ_ETICHETA.toLowerCase() + " " + leiBani(taxa) + ")" : "");
      }).join("\n");
      var livrare = modalitateAleasa() === "livrare";
      return (mesaje.comandaSalut || "Bună ziua! Doresc să plasez următoarea comandă la OLIZAN Restaurant & Pizzeria:") + "\n\n" +
        (numar ? "Comandă #" + numar + "\n" : "") +
        rand + "\n\n" +
        "Produse: " + leiBani(tp) + "\n" +
        (ta ? AMBALAJ_ETICHETA + ": " + leiBani(ta) + "\n" : "") +
        "TOTAL: " + leiBani(t) + "\n\n" +
        "Nume: " + campNume.value.trim() + "\n" +
        "Telefon: " + campTel.value.trim() + "\n" +
        "Modalitate: " + (livrare ? "Livrare" : "Ridicare personală") + "\n" +
        "Adresă: " + (livrare ? campAdr.value.trim() : "—") + "\n" +
        "Observații: " + (campObs.value.trim() || "—") + "\n\n" +
        (mesaje.comandaFinal || "Vă rog să-mi confirmați comanda și timpul estimat de pregătire. Mulțumesc!");
    }

    formEl.addEventListener("submit", function (e) {
      e.preventDefault();
      erori.hidden = true;
      confirmEl.hidden = true;
      arataNumarComanda(null);

      if (comenziOprite()) {
        randeaza();
        arataErori([oprire.titlu + (oprire.mesaj ? " " + oprire.mesaj : "")], null);
        return;
      }

      var probleme = [];
      var primulCamp = null;
      var livrare = modalitateAleasa() === "livrare";

      if (!linii.length) probleme.push("Coșul este gol. Adaugă cel puțin un produs.");
      linii.forEach(function (l) {
        var intrare = produse[l.id];
        if (!(l.cant > 0)) probleme.push("Cantitatea pentru " + intrare.nume + " trebuie să fie cel puțin 1.");
        if (!pretValid(pretUnitar(intrare, l.marime))) probleme.push("Produsul " + intrare.nume + " nu are un preț valid. Te rugăm să îl elimini din coș.");
        if (intrare.cuMarimi && !marimeDupaCod(l.marime)) probleme.push("Alege mărimea pentru " + intrare.nume + ".");
      });
      if (!campNume.value.trim()) { probleme.push("Completează numele."); primulCamp = primulCamp || campNume; }
      if (!campTel.value.trim()) { probleme.push("Completează numărul de telefon."); primulCamp = primulCamp || campTel; }
      else if (campTel.value.replace(/[^0-9]/g, "").length < 9) { probleme.push("Numărul de telefon pare incomplet."); primulCamp = primulCamp || campTel; }
      if (livrare && !campAdr.value.trim()) { probleme.push("Completează adresa de livrare."); primulCamp = primulCamp || campAdr; }

      var t = total();
      if (!isFinite(t) || t <= 0) probleme.push("Totalul comenzii nu este valid. Verifică produsele din coș.");

      if (probleme.length) { arataErori(probleme, primulCamp); return; }

      client.nume = campNume.value.trim();
      client.telefon = campTel.value.trim();
      client.adresa = campAdr.value.trim();
      client.observatii = campObs.value.trim();
      client.modalitate = livrare ? "livrare" : "ridicare";
      salveaza();

      /* Pe calculator fereastra se deschide chiar în timpul clicului, altfel
         browserul o blochează. Rămâne goală câteva zecimi de secundă, cât
         serverul înregistrează comanda și îi alocă numărul zilei, apoi este
         dusă pe WhatsApp cu mesajul complet. Pe telefon nu se deschide filă
         nouă: aplicația este chemată direct din fila curentă, altfel clientul
         rămâne pe pagina web a WhatsApp. Mesajul NU se trimite automat —
         clientul apasă butonul din WhatsApp. */
      var fereastra = esteMobil ? null : window.open("", "_blank");
      if (fereastra) {
        try {
          fereastra.opener = null;
          fereastra.document.write(
            '<!doctype html><html lang="ro"><head><meta charset="utf-8">' +
            '<title>Se pregătește comanda…</title></head><body style="font:16px/1.6 system-ui,sans-serif;padding:2rem">' +
            'Se pregătește comanda pentru WhatsApp…</body></html>'
          );
          fereastra.document.close();
        } catch (e) {}
      }

      /* Comanda se înregistrează în baza restaurantului, ca să apară în
         panoul de administrare și în istoricul contului. Prețurile sunt
         recalculate pe server, deci nu se trimit din browser. Tot serverul
         este cel care poate refuza comanda, dacă între timp restaurantul a
         oprit preluarea lor. */
      inregistreazaComanda(function (numar, blocaj) {
        if (blocaj) {
          inchideFereastra(fereastra);
          aplicaOprire(blocaj);
          confirmEl.hidden = true;
          randeaza();
          arataErori([blocaj.titlu + (blocaj.eroare ? " " + blocaj.eroare : "")], null);
          return;
        }
        confirmEl.hidden = false;
        confirmEl.scrollIntoView({ block: "nearest", behavior: reduceMotion ? "auto" : "smooth" });
        arataNumarComanda(numar);
        deschideWhatsApp(fereastra, mesajComanda(numar));
      });
    });

    /* Fereastra pregătită pentru WhatsApp nu mai are ce duce mai departe */
    function inchideFereastra(fereastra) {
      if (fereastra && !fereastra.closed) {
        try { fereastra.close(); } catch (e) {}
      }
    }

    /* Duce fereastra deja deschisă pe WhatsApp. Dacă nu există (telefon) sau
       browserul a blocat-o, comanda pleacă prin deschiderea obișnuită, care
       pe telefon cheamă direct aplicația. */
    function deschideWhatsApp(fereastra, mesaj) {
      if (fereastra && !fereastra.closed) {
        try { fereastra.location.replace(waLink(mesaj)); return; } catch (e) {}
      }
      deschideConversatia(mesaj);
    }

    function arataNumarComanda(numar) {
      if (!numarEl) return;
      numarEl.textContent = numar ? "Comanda ta are numărul #" + numar + "." : "";
      numarEl.hidden = !numar;
    }

    /* Trimite comanda pe server și predă numărul zilei mai departe. Dacă
       serverul nu răspunde la timp sau dă eroare, comanda pleacă oricum pe
       WhatsApp, doar fără număr. Singurul refuz care oprește totul este cel
       prin care restaurantul anunță că nu mai preia comenzi. Coșul rămâne
       plin până când clientul confirmă că WhatsApp s-a deschis. */
    function inregistreazaComanda(gata) {
      var livrare = modalitateAleasa() === "livrare";
      var trimis = false;
      function finalizeaza(numar, blocaj) {
        if (trimis) return;
        trimis = true;
        gata(numar, blocaj || null);
      }
      var ceas = setTimeout(function () { finalizeaza(null); }, 6000);

      fetch("/api/orders", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          linii: linii.map(function (l) { return { id: l.id, marime: l.marime || "", cant: l.cant }; }),
          nume: client.nume,
          telefon: client.telefon,
          modalitate: livrare ? "livrare" : "ridicare",
          adresa: livrare ? client.adresa : "",
          observatii: client.observatii,
          salveazaAdresa: !!(contClient && livrare && bifaSalveaza && bifaSalveaza.checked)
        })
      }).then(function (r) {
        return r.json().catch(function () { return null; }).then(function (d) {
          return { ok: r.ok, date: d };
        });
      }).then(function (raspuns) {
        clearTimeout(ceas);
        if (!raspuns.ok && raspuns.date && raspuns.date.blocat) {
          finalizeaza(null, raspuns.date);
          return;
        }
        finalizeaza(raspuns.date && raspuns.date.comanda ? raspuns.date.comanda.numar : null);
      }).catch(function () {
        /* dacă înregistrarea nu reușește, comanda rămâne valabilă pe WhatsApp */
        clearTimeout(ceas);
        finalizeaza(null);
      });
    }

    $("#cart-confirm-da", drawer).addEventListener("click", function () {
      linii = [];
      confirmEl.hidden = true;
      randeaza();
    });
    $("#cart-confirm-nu", drawer).addEventListener("click", function () {
      confirmEl.hidden = true;
    });

    randeaza();
  })();

  /* ---- 8. Consimțământ pentru cookie-uri --------------------------------- */
  var CHEIE_CONSIMTAMANT = "olizan_cookie_consent_v1";

  function citesteConsimtamant() {
    try {
      var brut = localStorage.getItem(CHEIE_CONSIMTAMANT);
      return brut ? JSON.parse(brut) : null;
    } catch (e) { return null; }
  }
  function scrieConsimtamant(val) {
    try { localStorage.setItem(CHEIE_CONSIMTAMANT, JSON.stringify(val)); } catch (e) {}
  }
  window.olizanConsimtamant = citesteConsimtamant;

  function aplicaConsimtamant(c) {
    if (!c) return;
    if (c.harti) initHarta();
    if (c.analitice && typeof window.olizanPornesteAnalitice === "function") {
      // Cârlig pentru administrator: definește window.olizanPornesteAnalitice
      // ÎNAINTE de assets/js/site.js dacă adaugi un instrument de statistici.
      // Se apelează exclusiv după acceptarea cookie-urilor de analiză.
      try { window.olizanPornesteAnalitice(); } catch (e) {}
    }
  }

  (function cookieBanner() {
    var banner = $("#cookie-banner");
    var existent = citesteConsimtamant();

    if (existent) aplicaConsimtamant(existent);

    if (!banner) return;
    var prefs = $("#cookie-prefs");
    var optAnalitice = $("#cookie-analitice");
    var optHarti = $("#cookie-harti");

    function deschide() { banner.classList.add("is-open"); }
    function inchide() { banner.classList.remove("is-open"); }

    function salveaza(c) {
      c.data = new Date().toISOString();
      c.versiune = 1;
      scrieConsimtamant(c);
      aplicaConsimtamant(c);
      inchide();
    }

    if (!existent) {
      window.setTimeout(deschide, 700);
    }

    var btnAccept = $("#cookie-accept");
    var btnRefuz = $("#cookie-reject");
    var btnPers = $("#cookie-custom");
    var btnSalvare = $("#cookie-save");

    if (btnAccept) btnAccept.addEventListener("click", function () {
      if (optAnalitice) optAnalitice.checked = true;
      if (optHarti) optHarti.checked = true;
      salveaza({ necesare: true, analitice: true, harti: true });
    });
    if (btnRefuz) btnRefuz.addEventListener("click", function () {
      if (optAnalitice) optAnalitice.checked = false;
      if (optHarti) optHarti.checked = false;
      salveaza({ necesare: true, analitice: false, harti: false });
    });
    if (btnPers) btnPers.addEventListener("click", function () {
      var deschis = prefs.classList.toggle("is-open");
      btnPers.setAttribute("aria-expanded", deschis ? "true" : "false");
    });
    if (btnSalvare) btnSalvare.addEventListener("click", function () {
      salveaza({
        necesare: true,
        analitice: !!(optAnalitice && optAnalitice.checked),
        harti: !!(optHarti && optHarti.checked)
      });
    });

    $$("[data-cookie-settings]").forEach(function (el) {
      el.addEventListener("click", function (e) {
        e.preventDefault();
        var c = citesteConsimtamant();
        if (optAnalitice) optAnalitice.checked = !!(c && c.analitice);
        if (optHarti) optHarti.checked = !!(c && c.harti);
        prefs.classList.add("is-open");
        if (btnPers) btnPers.setAttribute("aria-expanded", "true");
        deschide();
        banner.scrollIntoView({ block: "nearest" });
        var primul = $("#cookie-accept");
        if (primul) primul.focus();
      });
    });
  })();

  /* ---- 9. Harta Google (doar după consimțământ) -------------------------- */
  function initHarta() {
    var shell = $("#map-shell");
    if (!shell || shell.getAttribute("data-loaded") === "1") return;
    var embed = shell.getAttribute("data-embed");
    if (!embed) return;
    var iframe = document.createElement("iframe");
    iframe.setAttribute("src", embed);
    iframe.setAttribute("title", "Harta cu locația OLIZAN Restaurant & Pizzeria în Bulgăruș");
    iframe.setAttribute("loading", "lazy");
    iframe.setAttribute("referrerpolicy", "no-referrer-when-downgrade");
    iframe.setAttribute("allowfullscreen", "");
    shell.innerHTML = "";
    shell.appendChild(iframe);
    shell.setAttribute("data-loaded", "1");
  }

  (function butonHarta() {
    var btn = $("#map-activate");
    if (!btn) return;
    btn.addEventListener("click", function () {
      var c = citesteConsimtamant() || { necesare: true, analitice: false, harti: false };
      c.harti = true;
      c.data = new Date().toISOString();
      c.versiune = 1;
      scrieConsimtamant(c);
      var optHarti = $("#cookie-harti");
      if (optHarti) optHarti.checked = true;
      initHarta();
    });
  })();

  /* ---- 10. Formularul de contact (Netlify Forms) ------------------------- */
  (function formular() {
    var form = $("#form-contact");
    if (!form) return;
    var status = $("#form-status");

    function arataStatus(mesaj, ok) {
      if (!status) return;
      status.textContent = mesaj;
      status.className = "form-status is-visible " + (ok ? "is-ok" : "is-err");
      status.setAttribute("role", "status");
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();

      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }

      var buton = $("button[type=submit]", form);
      var textInitial = buton ? buton.textContent : "";
      if (buton) { buton.disabled = true; buton.textContent = "Se trimite…"; }

      var date = new URLSearchParams(new FormData(form)).toString();

      fetch("/", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: date
      }).then(function (r) {
        if (!r.ok) throw new Error("Răspuns " + r.status);
        form.reset();
        arataStatus("Mulțumim! Mesajul a fost trimis. Vă răspundem cât putem de repede.", true);
      }).catch(function () {
        arataStatus("Mesajul nu a putut fi trimis. Vă rugăm să ne sunați la " + (contact.telefon || "") + " sau să ne scrieți pe WhatsApp.", false);
      }).then(function () {
        if (buton) { buton.disabled = false; buton.textContent = textInitial; }
      });
    });
  })();

  /* ---- 11. Anul curent în footer ---------------------------------------- */
  $$("[data-year]").forEach(function (el) {
    el.textContent = String(new Date().getFullYear());
  });

}

/* ---- 12. Pornirea: meniul din baza de date și imaginile administrate ----- */
(function pornire() {
  "use strict";

  var OL = window.OLIZAN = window.OLIZAN || {};
  var ASTEPTARE = 2500; /* dacă serverul întârzie, pagina pornește pe datele locale */

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  function ia(cale) {
    if (typeof fetch !== "function") return Promise.resolve(null);
    return fetch(cale, { credentials: "same-origin", headers: { accept: "application/json" } })
      .then(function (r) { return r.ok ? r.json() : null; })
      .catch(function () { return null; });
  }

  function cuTermen(promisiune) {
    return new Promise(function (rezolva) {
      var incheiat = false;
      var ceas = window.setTimeout(function () {
        if (!incheiat) { incheiat = true; rezolva(null); }
      }, ASTEPTARE);
      promisiune.then(function (v) {
        if (!incheiat) { incheiat = true; window.clearTimeout(ceas); rezolva(v); }
      });
    });
  }

  /* Fotografia mare de pe prima pagină, înlocuită din panoul de administrare */
  function aplicaHero(hero) {
    if (!hero || !hero.src) return;
    var img = document.querySelector(".hero-arch img");
    if (!img) return;
    img.setAttribute("src", hero.src);
    img.removeAttribute("srcset");
    if (hero.alt) img.setAttribute("alt", hero.alt);
  }

  /* Fotografiile încărcate în galerie; lightbox-ul le preia la pornire */
  function aplicaGalerie(lista) {
    var zona = document.querySelector("[data-galerie-incarcata]");
    if (!zona) return;
    var sectiune = zona.closest ? zona.closest("[data-galerie-sectiune]") : null;
    if (!Array.isArray(lista) || !lista.length) return;
    zona.innerHTML = lista.map(function (f) {
      var titlu = f.titlu || f.alt || "Fotografie OLIZAN Restaurant & Pizzeria";
      return '<figure class="gallery-item" data-lb="' + esc(f.src) + '" data-lb-cap="' + esc(titlu) + '">' +
        '<img src="' + esc(f.src) + '" alt="' + esc(f.alt || titlu) + '" loading="lazy" decoding="async">' +
        '<figcaption>' + esc(titlu) + '</figcaption>' +
      '</figure>';
    }).join("");
    if (sectiune) sectiune.hidden = false;
  }

  Promise.all([cuTermen(ia("/api/menu")), cuTermen(ia("/api/auth/me"))])
    .then(function (raspunsuri) {
      var meniu = raspunsuri[0];
      var cont = raspunsuri[1];
      if (meniu && Array.isArray(meniu.meniu) && meniu.meniu.length) OL.meniu = meniu.meniu;
      if (meniu && meniu.imagini) {
        aplicaHero(meniu.imagini.hero);
        aplicaGalerie(meniu.imagini.galerie);
      }
      /* Starea preluării comenzilor vine odată cu meniul. Dacă serverul nu
         răspunde, site-ul pornește deschis, iar comanda tot ar fi oprită de
         server la trimitere, cu același mesaj. */
      OL.stareComenzi = meniu && meniu.comenzi ? meniu.comenzi : null;
      OL.client = cont && cont.autentificat ? cont.client : null;
    })
    .then(function () {
      olizanPorneste();
    });
})();
