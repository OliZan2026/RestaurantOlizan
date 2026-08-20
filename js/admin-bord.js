/* ==========================================================================
   OLIZAN — panoul de administrare, secțiunea „Comenzi live"
   Tabla comenzilor (kanban) cu patru coloane, plus istoricul comenzilor
   finalizate. Modul separat de admin.js și admin-sala.js.

   Ce face, pe scurt:
     1. citește tabla de la /api/admin/bord la fiecare 12 secunde;
     2. numără singură, din secundă în secundă, timpul stat de fiecare fișă:
        peste 10 minute fără mutare, fișa devine roșie fără reîncărcare;
     3. anunță comenzile noi cu sunet și cu un anunț vizibil, chiar dacă fila
        este în fundal;
     4. mută fișele prin tragere sau prin butonul „starea următoare";
     5. ține istoricul comenzilor finalizate, cu filtru pe zi și ștergere;
     6. pe fișele ajunse la „Finalizate" pune butonul „Trimite mesaj client",
        care deschide WhatsApp cu mesajul deja scris către numărul clientului.

   O comandă ajunge aici doar când clientul o trimite pe WhatsApp (momentul în
   care site-ul o înregistrează pe server) — coșul, oricât ar sta plin, nu
   scrie nimic pe tablă.
   ========================================================================== */
(function () {
  "use strict";

  var panou = document.getElementById("panou-bord");
  if (!panou) return;

  var COLOANE = ["noua", "pregatire", "gata", "finalizata"];
  var BUTON_URMATOR = {
    noua: "Trece în pregătire",
    pregatire: "Gata de livrare/ridicare",
    gata: "Finalizează comanda"
  };
  var LIMITA_INTARZIERE = 10 * 60 * 1000; // 10 minute fără mutare → fișa devine roșie
  var PAS_CITIRE = 12000;                 // cât de des se cere tabla de la server
  var CHEIE_SUNET = "olizan_bord_sunet";
  var CHEIE_ANUNTATE = "olizan_bord_anuntate"; // comenzile cărora li s-a deschis deja mesajul
  var LIMITA_ANUNTATE = 300;                   // câte însemnări se păstrează în browser

  /* --- ajutoare ----------------------------------------------------------- */
  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }
  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
  function lei(n) {
    var v = Math.round(Number(n) * 100) / 100;
    return isFinite(v) ? v.toFixed(2).replace(".", ",") + " lei" : "—";
  }
  function ora(v) {
    var d = new Date(v);
    return isNaN(d.getTime()) ? "" : d.toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" });
  }
  function ziCuLitere(z) {
    var p = String(z || "").split("-");
    var d = new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
    if (isNaN(d.getTime())) return z || "";
    return d.toLocaleDateString("ro-RO", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  }
  /** „acum", „3 min", „1 h 12 min" — cât stă fișa în coloana ei. */
  function durata(ms) {
    var minute = Math.floor(Math.max(0, ms) / 60000);
    if (minute < 1) return "sub un minut";
    if (minute < 60) return minute + " min";
    return Math.floor(minute / 60) + " h " + (minute % 60) + " min";
  }

  /* Aceleași reguli ca în admin.js: fără sesiune validă serverul răspunde 401
     și pagina se întoarce la autentificare. */
  function cerere(cale, optiuni) {
    var o = optiuni || {};
    var init = { method: o.method || "GET", credentials: "same-origin", headers: { accept: "application/json" } };
    if (o.corp !== undefined) {
      init.headers["content-type"] = "application/json";
      init.body = JSON.stringify(o.corp);
    }
    return fetch(cale, init).then(function (r) {
      if (r.status === 401) {
        window.location.href = "/admin/login";
        var expirata = new Error("Sesiunea a expirat.");
        expirata.sesiuneExpirata = true;
        throw expirata;
      }
      return r.json().catch(function () { return {}; }).then(function (d) {
        if (!r.ok) throw new Error(d.eroare || "Operațiunea nu a reușit.");
        return d;
      });
    });
  }

  /* --- 1. Sunetul și anunțul pentru comenzi noi --------------------------- */
  /* Sunetul se face din browser (Web Audio), fără fișier audio. Browserele
     cer o apăsare înainte de a lăsa o pagină să sune, de aceea există butonul
     „Pornește sunetul": el pornește contextul audio și, dacă vrei, și
     notificarea sistemului. */
  var butonSunet = $("#bord-sunet");
  var anunt = $("#bord-anunt");
  var insignaTab = $("#tab-bord-insigna");
  var sunetPornit = false;
  var context = null;
  var titluInitial = document.title;
  var ceasTitlu = null;
  var necitite = 0;

  function citestePreferinta() {
    try { return localStorage.getItem(CHEIE_SUNET) === "1"; } catch (e) { return false; }
  }
  function scriePreferinta(val) {
    try { localStorage.setItem(CHEIE_SUNET, val ? "1" : "0"); } catch (e) {}
  }

  function contextAudio() {
    if (context) return context;
    var Audio = window.AudioContext || window.webkitAudioContext;
    if (!Audio) return null;
    try { context = new Audio(); } catch (e) { context = null; }
    return context;
  }

  function sunaClopotel() {
    if (!sunetPornit) return;
    var ctx = contextAudio();
    if (!ctx) return;
    if (ctx.state === "suspended" && ctx.resume) ctx.resume();
    var acum = ctx.currentTime;
    // trei note scurte, repetate o dată: se aude și dintr-o altă cameră
    [0, 0.18, 0.36, 0.75, 0.93, 1.11].forEach(function (pornire, i) {
      var osc = ctx.createOscillator();
      var volum = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = i % 3 === 0 ? 880 : (i % 3 === 1 ? 1174 : 1568);
      volum.gain.setValueAtTime(0.0001, acum + pornire);
      volum.gain.exponentialRampToValueAtTime(0.32, acum + pornire + 0.03);
      volum.gain.exponentialRampToValueAtTime(0.0001, acum + pornire + 0.16);
      osc.connect(volum);
      volum.connect(ctx.destination);
      osc.start(acum + pornire);
      osc.stop(acum + pornire + 0.2);
    });
  }

  function pornesteTitlu() {
    if (ceasTitlu || !document.hidden) return;
    var alternativ = true;
    ceasTitlu = window.setInterval(function () {
      document.title = alternativ ? "🔔 Comandă nouă!" : titluInitial;
      alternativ = !alternativ;
    }, 1000);
  }
  function opresteTitlu() {
    if (ceasTitlu) { window.clearInterval(ceasTitlu); ceasTitlu = null; }
    document.title = titluInitial;
  }

  function notificareSistem(fise) {
    if (!("Notification" in window) || Notification.permission !== "granted") return;
    try {
      var n = new Notification("Comandă nouă — Restaurant OliZan", {
        body: fise.map(function (c) {
          return "#" + (c.numar || c.id) + " · " + c.nume + " · " + lei(c.total);
        }).join("\n"),
        tag: "olizan-comanda-noua",
        renotify: true
      });
      n.onclick = function () { window.focus(); n.close(); };
    } catch (e) {}
  }

  var ceasAnunt = null;
  function arataAnunt(fise) {
    if (!anunt) return;
    anunt.innerHTML = '<span>' + (fise.length === 1
      ? 'Comandă nouă: <b>#' + esc(fise[0].numar || String(fise[0].id)) + '</b> — ' + esc(fise[0].nume) +
        ' · ' + esc(lei(fise[0].total))
      : esc(fise.length + " comenzi noi tocmai au fost primite.")) + '</span>' +
      '<button class="buton buton--mic buton--gol" type="button" id="bord-anunt-ok">Am văzut</button>';
    anunt.hidden = false;
    // anunțul rămâne pe ecran un minut, ca să fie văzut și dacă tocmai ai
    // deschis secțiunea; butonul „Am văzut" îl închide oricând mai devreme
    if (ceasAnunt) window.clearTimeout(ceasAnunt);
    ceasAnunt = window.setTimeout(function () { anunt.hidden = true; }, 60000);
  }

  if (anunt) {
    anunt.addEventListener("click", function (e) {
      if (e.target && e.target.id === "bord-anunt-ok") anunt.hidden = true;
    });
  }

  function insigna(n) {
    if (!insignaTab) return;
    insignaTab.textContent = String(n);
    insignaTab.hidden = n <= 0;
  }

  function anuntaComenziNoi(fise) {
    if (!fise.length) return;
    sunaClopotel();
    arataAnunt(fise);
    notificareSistem(fise);
    pornesteTitlu();
    if (!panou.hidden) return;
    necitite += fise.length;
    insigna(necitite);
  }

  function actualizeazaButonSunet() {
    if (!butonSunet) return;
    butonSunet.textContent = sunetPornit ? "Sunetul este pornit" : "Pornește sunetul";
    butonSunet.setAttribute("aria-pressed", sunetPornit ? "true" : "false");
  }

  if (butonSunet) {
    butonSunet.addEventListener("click", function () {
      sunetPornit = !sunetPornit;
      scriePreferinta(sunetPornit);
      actualizeazaButonSunet();
      if (!sunetPornit) return;
      var ctx = contextAudio();
      if (ctx && ctx.state === "suspended" && ctx.resume) ctx.resume();
      sunaClopotel();
      if ("Notification" in window && Notification.permission === "default") {
        try { Notification.requestPermission(); } catch (e) {}
      }
    });
  }

  sunetPornit = citestePreferinta();
  actualizeazaButonSunet();
  /* Preferința rămâne de la sesiunea trecută, dar browserul tot cere o apăsare
     înainte de primul sunet: prima atingere a paginii repornește contextul. */
  document.addEventListener("click", function reia() {
    document.removeEventListener("click", reia);
    if (!sunetPornit) return;
    var ctx = contextAudio();
    if (ctx && ctx.state === "suspended" && ctx.resume) ctx.resume();
  });

  document.addEventListener("visibilitychange", function () {
    if (document.hidden) return;
    opresteTitlu();
    citesteBord();
  });

  /* --- 2. Mesajul de anunțare a clientului pe WhatsApp -------------------- */
  /* Nu se trimite nimic automat: WhatsApp nu permite asta unui număr obișnuit,
     fără API-ul plătit de business. Butonul doar deschide conversația cu
     clientul și cu mesajul deja scris — rămâne o singură apăsare pe „trimite".
     Pe calculator se deschide wa.me într-o filă nouă (de acolo pornesc
     WhatsApp Desktop sau WhatsApp Web), iar pe telefon/tabletă se cheamă
     direct aplicația, cu wa.me ca plasă de siguranță dacă aplicația nu preia
     apăsarea. Aceleași reguli ca pe site, dar scrise aici: panoul nu încarcă
     site.js. */
  var esteMobil = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent || "") ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

  /* WhatsApp cere numărul numai în cifre, cu prefixul de țară și fără „+”.
     Clientul îl scrie însă cum vrea: „0721 234 567”, „+40 721 234 567”,
     „0040721234567”. Ce nu se poate duce la o formă bună întoarce șir gol,
     iar fișa arată atunci o notă în locul butonului. */
  function numarWhatsApp(telefon) {
    var brut = String(telefon == null ? "" : telefon).trim();
    var cifre = brut.replace(/[^0-9]/g, "");
    if (!cifre) return "";
    if (brut.charAt(0) === "+") {
      // deja international
    } else if (cifre.slice(0, 2) === "00") {
      cifre = cifre.slice(2);
    } else if (cifre.charAt(0) === "0") {
      cifre = "40" + cifre.slice(1);      // număr românesc scris local
    } else if (cifre.length === 9) {
      cifre = "40" + cifre;               // „721234567”, fără zeroul din față
    }
    return cifre.length >= 10 && cifre.length <= 15 ? cifre : "";
  }

  /** Mesajul gata scris, cu numele clientului și numărul comenzii. */
  function mesajClient(c) {
    var nume = String(c.nume || "").trim();
    return "Bună ziua" + (nume ? ", " + nume : "") + "! Comanda dvs. #" +
      (c.numar || c.id) + " e gata! Poftă bună! – OLIZAN";
  }

  function adresaWa(numar, text) {
    return "https://wa.me/" + numar + "?text=" + encodeURIComponent(text);
  }
  function adresaWaAplicatie(numar, text) {
    return "whatsapp://send?phone=" + numar + "&text=" + encodeURIComponent(text);
  }

  /* Pe telefon: se cheamă aplicația în fila curentă, iar dacă după ~1,2
     secunde pagina este încă vizibilă — semn că aplicația nu s-a deschis — se
     merge pe wa.me. Panoul rămâne în fila lui, deci nu se pierde tabla. */
  function deschideWhatsApp(numar, text) {
    var web = adresaWa(numar, text);
    if (!esteMobil) {
      var fila = window.open(web, "_blank", "noopener");
      if (!fila) window.location.href = web;
      return;
    }
    var ceas = null;
    function renunta() {
      if (ceas) { window.clearTimeout(ceas); ceas = null; }
      document.removeEventListener("visibilitychange", laAscundere);
      window.removeEventListener("pagehide", renunta);
      window.removeEventListener("blur", renunta);
    }
    function laAscundere() { if (document.hidden) renunta(); }
    document.addEventListener("visibilitychange", laAscundere);
    window.addEventListener("pagehide", renunta);
    window.addEventListener("blur", renunta);
    ceas = window.setTimeout(function () {
      renunta();
      window.location.href = web;
    }, 1200);
    window.location.href = adresaWaAplicatie(numar, text);
  }

  /* Ce comenzi au fost deja anunțate. Se ține doar în browserul de la tejghea,
     ca butonul să arate că mesajul a fost deschis; nimic nu se scrie pe
     server, fiindcă trimiterea propriu-zisă se face din WhatsApp. */
  var anuntate = {};
  (function citesteAnuntate() {
    try {
      var brut = JSON.parse(localStorage.getItem(CHEIE_ANUNTATE) || "[]");
      if (Object.prototype.toString.call(brut) === "[object Array]") {
        brut.forEach(function (id) { anuntate[String(id)] = true; });
      }
    } catch (e) {}
  })();
  function scrieAnuntat(id) {
    anuntate[String(id)] = true;
    try {
      var lista = Object.keys(anuntate);
      if (lista.length > LIMITA_ANUNTATE) {
        // se păstrează cele mai noi comenzi (id-urile cresc în timp)
        lista = lista.sort(function (a, b) { return Number(a) - Number(b); }).slice(-LIMITA_ANUNTATE);
        anuntate = {};
        lista.forEach(function (v) { anuntate[v] = true; });
      }
      localStorage.setItem(CHEIE_ANUNTATE, JSON.stringify(lista));
    } catch (e) {}
  }

  /* --- 3. Tabla ----------------------------------------------------------- */
  var tabla = $("#bord-tabla");
  var comenzi = [];
  var cunoscute = null;      // id-urile văzute până acum; null cât timp nu s-a citit nimic
  var proaspete = {};        // id → momentul sosirii, pentru evidențierea scurtă
  var deAnuntat = {};        // comenzile tocmai finalizate, cu butonul de mesaj evidențiat
  var decalajServer = 0;     // diferența dintre ceasul serverului și cel al calculatorului
  var seTrage = false;       // cât timp se trage o fișă, tabla nu se redesenează

  function acum() { return Date.now() + decalajServer; }

  /* Rândul cu mesajul pentru client, doar pe fișele finalizate. */
  function anuntHTML(c) {
    var numar = numarWhatsApp(c.telefon);
    if (!numar) {
      return '<p class="fisa-bord-anunt fisa-bord-anunt--fara">Fără număr de telefon valid pentru WhatsApp.</p>';
    }
    var trimis = !!anuntate[String(c.id)];
    var clase = ["buton", "buton--mic", "buton--wa"];
    if (trimis) clase.push("is-trimis");
    if (deAnuntat[c.id] && !trimis) clase.push("is-de-anuntat");
    return '<p class="fisa-bord-anunt">' +
      '<a class="' + clase.join(" ") + '" draggable="false" target="_blank" rel="noopener noreferrer"' +
        ' data-anunta="' + c.id + '" href="' + esc(adresaWa(numar, mesajClient(c))) + '">' +
        (trimis ? "Mesaj deschis ✓ — trimite din nou" : "Trimite mesaj client") +
      '</a></p>';
  }

  function fisaHTML(c) {
    var stat = acum() - new Date(c.miscat).getTime();
    var intarziat = c.coloana !== "finalizata" && stat > LIMITA_INTARZIERE;
    var clase = ["fisa-bord"];
    if (c.coloana === "noua" && !intarziat) clase.push("is-noua");
    if (intarziat) clase.push("is-intarziat");
    if (c.coloana === "finalizata") clase.push("is-finalizata");
    if (proaspete[c.id]) clase.push("is-proaspata");

    var produse = (c.produse || []).map(function (p) {
      return '<li><span>' + p.cant + ' × ' + esc(p.nume) +
        (p.marime ? ' <em>(' + esc(p.marime) + ')</em>' : '') + '</span>' +
        '<b>' + esc(lei(p.pret * p.cant)) + '</b></li>';
    }).join("") || '<li><em>Comandă fără produse înregistrate</em></li>';

    var telefonCurat = String(c.telefon || "").replace(/[^0-9+]/g, "");
    var urmator = BUTON_URMATOR[c.coloana];

    return '<article class="' + clase.join(" ") + '" draggable="true" data-fisa="' + c.id + '"' +
        ' data-miscat="' + esc(c.miscat) + '" data-coloana="' + esc(c.coloana) + '">' +
      '<header class="fisa-bord-cap">' +
        '<span class="fisa-bord-numar">#' + esc(c.numar || String(c.id)) + '</span>' +
        '<span class="fisa-bord-ceas"><b>' + esc(ora(c.data)) + '</b>' +
          '<span data-ceas>' + esc(durata(stat)) + ' în coloană</span></span>' +
      '</header>' +
      '<p class="fisa-bord-client">' + esc(c.nume) + '</p>' +
      '<p class="fisa-bord-tel"><a href="tel:' + esc(telefonCurat) + '">' + esc(c.telefon) + '</a></p>' +
      '<ul class="fisa-bord-produse">' + produse +
        (Number(c.ambalaj) > 0 ? '<li><span><em>Ambalaj</em></span><b>' + esc(lei(c.ambalaj)) + '</b></li>' : '') +
      '</ul>' +
      '<p class="fisa-bord-mod"><b>' + (c.modalitate === "livrare" ? "Livrare" : "Ridicare personală") + '</b>' +
        (c.modalitate === "livrare" ? ' · ' + esc(c.adresa || "fără adresă") : '') + '</p>' +
      (c.observatii ? '<p class="fisa-bord-obs">Mențiuni: ' + esc(c.observatii) + '</p>' : '') +
      '<div class="fisa-bord-jos">' +
        '<span class="fisa-bord-total">' + esc(lei(c.total)) + '</span>' +
        (urmator
          ? '<button class="buton buton--mic" type="button" data-urmator="' + c.id + '">' + esc(urmator) + '</button>'
          : '<span class="fisa-bord-gata">Finalizată la ' + esc(ora(c.miscat)) + '</span>') +
      '</div>' +
      (c.coloana === "finalizata" ? anuntHTML(c) : "") +
    '</article>';
  }

  function randeazaBord() {
    COLOANE.forEach(function (col) {
      var lista = $('[data-lista="' + col + '"]', tabla);
      var fise = comenzi.filter(function (c) { return c.coloana === col; });
      // cele mai vechi sus: pe tablă contează ordinea în care se lucrează
      fise.sort(function (a, b) { return new Date(a.data) - new Date(b.data); });
      lista.innerHTML = fise.length
        ? fise.map(fisaHTML).join("")
        : '<p class="gol">Nicio comandă aici.</p>';
      var numar = $('[data-numar="' + col + '"]', tabla);
      if (numar) numar.textContent = String(fise.length);
    });
  }

  /* Ceasul fișelor: rulează din secundă în secundă și schimbă doar textul și
     culoarea, fără să redeseneze tabla și fără să ceară ceva serverului. */
  window.setInterval(function () {
    var t = acum();
    $$(".fisa-bord[data-miscat]", tabla).forEach(function (el) {
      var stat = t - new Date(el.getAttribute("data-miscat")).getTime();
      var coloana = el.getAttribute("data-coloana");
      var ceas = $("[data-ceas]", el);
      if (ceas) ceas.textContent = durata(stat) + " în coloană";
      var intarziat = coloana !== "finalizata" && stat > LIMITA_INTARZIERE;
      el.classList.toggle("is-intarziat", intarziat);
      el.classList.toggle("is-noua", coloana === "noua" && !intarziat);
      var id = el.getAttribute("data-fisa");
      if (proaspete[id] && Date.now() - proaspete[id] > 60000) {
        delete proaspete[id];
        el.classList.remove("is-proaspata");
      }
    });
  }, 1000);

  function aplicaBord(d) {
    if (d.acum) decalajServer = new Date(d.acum).getTime() - Date.now();
    var lista = d.comenzi || [];
    var noi = [];
    if (cunoscute) {
      lista.forEach(function (c) {
        if (!cunoscute[c.id] && c.coloana === "noua") { noi.push(c); proaspete[c.id] = Date.now(); }
      });
    }
    cunoscute = {};
    lista.forEach(function (c) { cunoscute[c.id] = true; });
    comenzi = lista;
    if (!seTrage) randeazaBord();
    anuntaComenziNoi(noi);
  }

  var citireInCurs = false;
  function citesteBord() {
    if (citireInCurs) return Promise.resolve();
    citireInCurs = true;
    return cerere("/api/admin/bord").then(aplicaBord).catch(function () {}).then(function () {
      citireInCurs = false;
    });
  }

  function muta(id, coloana) {
    var fisa = null;
    for (var i = 0; i < comenzi.length; i++) if (String(comenzi[i].id) === String(id)) fisa = comenzi[i];
    if (!fisa || fisa.coloana === coloana) return;
    // mutarea se vede pe loc, iar răspunsul serverului confirmă starea reală
    fisa.coloana = coloana;
    fisa.miscat = new Date(acum()).toISOString();
    delete proaspete[id];
    // la finalizare, butonul de mesaj se evidențiază pe fișa tocmai mutată
    if (coloana === "finalizata") deAnuntat[id] = true;
    else delete deAnuntat[id];
    randeazaBord();
    cerere("/api/admin/bord/" + encodeURIComponent(id), { method: "PATCH", corp: { coloana: coloana } })
      .then(aplicaBord)
      .catch(function () { citesteBord(); });
  }

  function urmatoareaColoana(col) {
    var i = COLOANE.indexOf(col);
    return i >= 0 && i < COLOANE.length - 1 ? COLOANE[i + 1] : null;
  }

  /* butonul „starea următoare" — varianta pentru tabletă, fără tragere */
  tabla.addEventListener("click", function (e) {
    var btn = e.target.closest ? e.target.closest("[data-urmator]") : null;
    if (!btn) return;
    var fisa = btn.closest(".fisa-bord");
    var urmatoare = urmatoareaColoana(fisa.getAttribute("data-coloana"));
    if (urmatoare) muta(btn.getAttribute("data-urmator"), urmatoare);
  });

  /* butonul „Trimite mesaj client” de pe fișele finalizate. Adresa wa.me este
     deja în href, deci pe calculator apăsarea deschide singură fila nouă; pe
     telefon o oprim și chemăm aplicația, ca să nu se treacă prin redirectarea
     wa.me, pe care Android și iOS nu o duc în aplicație. */
  tabla.addEventListener("click", function (e) {
    var link = e.target.closest ? e.target.closest("[data-anunta]") : null;
    if (!link) return;
    var id = link.getAttribute("data-anunta");
    var fisa = null;
    for (var i = 0; i < comenzi.length; i++) if (String(comenzi[i].id) === String(id)) fisa = comenzi[i];
    var numar = fisa ? numarWhatsApp(fisa.telefon) : "";
    delete deAnuntat[id];
    scrieAnuntat(id);
    link.classList.remove("is-de-anuntat");
    link.classList.add("is-trimis");
    link.textContent = "Mesaj deschis ✓ — trimite din nou";
    if (!esteMobil || !numar) return;   // pe calculator merge legătura obișnuită
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    deschideWhatsApp(numar, mesajClient(fisa));
  });

  /* tragerea fișelor dintr-o coloană în alta */
  tabla.addEventListener("dragstart", function (e) {
    var fisa = e.target.closest ? e.target.closest(".fisa-bord") : null;
    if (!fisa) return;
    seTrage = true;
    fisa.classList.add("is-mutata");
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = "move";
      try { e.dataTransfer.setData("text/plain", fisa.getAttribute("data-fisa")); } catch (err) {}
    }
  });
  tabla.addEventListener("dragend", function (e) {
    seTrage = false;
    var fisa = e.target.closest ? e.target.closest(".fisa-bord") : null;
    if (fisa) fisa.classList.remove("is-mutata");
    $$(".bord-coloana", tabla).forEach(function (c) { c.classList.remove("is-tinta"); });
  });
  tabla.addEventListener("dragover", function (e) {
    var coloana = e.target.closest ? e.target.closest(".bord-coloana") : null;
    if (!coloana) return;
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = "move";
    $$(".bord-coloana", tabla).forEach(function (c) { c.classList.toggle("is-tinta", c === coloana); });
  });
  tabla.addEventListener("dragleave", function (e) {
    var coloana = e.target.closest ? e.target.closest(".bord-coloana") : null;
    if (coloana && !coloana.contains(e.relatedTarget)) coloana.classList.remove("is-tinta");
  });
  tabla.addEventListener("drop", function (e) {
    var coloana = e.target.closest ? e.target.closest(".bord-coloana") : null;
    if (!coloana) return;
    e.preventDefault();
    seTrage = false;
    coloana.classList.remove("is-tinta");
    var id = "";
    try { id = e.dataTransfer.getData("text/plain"); } catch (err) {}
    if (id) muta(id, coloana.getAttribute("data-coloana"));
  });

  $("#bord-reincarca").addEventListener("click", function () { citesteBord(); });

  /* --- 4. Istoricul comenzilor finalizate --------------------------------- */
  var zonaIstoric = $("#bord-istoric");
  var listaIstoric = $("#bord-istoric-lista");
  var alegeZi = $("#bord-istoric-zi");
  var butonIstoric = $("#bord-istoric-buton");
  var istoric = [];

  function umpleZile() {
    var zile = [];
    istoric.forEach(function (c) { if (c.zi && zile.indexOf(c.zi) < 0) zile.push(c.zi); });
    zile.sort().reverse();
    var aleasa = alegeZi.value;
    alegeZi.innerHTML = '<option value="">Toate zilele</option>' + zile.map(function (z) {
      return '<option value="' + esc(z) + '">' + esc(ziCuLitere(z)) + '</option>';
    }).join("");
    if (aleasa && zile.indexOf(aleasa) >= 0) alegeZi.value = aleasa;
  }

  function fisaIstoricHTML(c) {
    var produse = (c.produse || []).map(function (p) {
      return '<li><span>' + p.cant + ' × ' + esc(p.nume) +
        (p.marime ? ' <em>(' + esc(p.marime) + ')</em>' : '') + '</span>' +
        '<b>' + esc(lei(p.pret * p.cant)) + '</b></li>';
    }).join("");
    return '<article class="fisa-bord fisa-bord--istoric is-finalizata" data-istoric="' + c.id + '">' +
      '<header class="fisa-bord-cap">' +
        '<span class="fisa-bord-numar">#' + esc(c.numar || String(c.id)) + '</span>' +
        '<span class="fisa-bord-ceas"><b>' + esc(ora(c.data)) + '</b><span>' + esc(ziCuLitere(c.zi)) + '</span></span>' +
      '</header>' +
      '<p class="fisa-bord-client">' + esc(c.nume) + '</p>' +
      '<p class="fisa-bord-tel">' + esc(c.telefon) + '</p>' +
      '<ul class="fisa-bord-produse">' + produse + '</ul>' +
      (c.observatii ? '<p class="fisa-bord-obs">Mențiuni: ' + esc(c.observatii) + '</p>' : '') +
      '<div class="fisa-bord-jos">' +
        '<span class="fisa-bord-total">' + esc(lei(c.total)) + '</span>' +
        '<button class="buton buton--mic buton--rosu" type="button" data-sterge-istoric="' + c.id + '">Șterge</button>' +
      '</div>' +
    '</article>';
  }

  function randeazaIstoric() {
    var zi = alegeZi.value;
    var vizibile = zi ? istoric.filter(function (c) { return c.zi === zi; }) : istoric;
    if (!vizibile.length) {
      listaIstoric.innerHTML = '<p class="gol">Nicio comandă în istoric' + (zi ? " pentru ziua aleasă" : "") + '.</p>';
      return;
    }
    var html = "";
    var ziuaScrisa = "";
    vizibile.forEach(function (c) {
      if (!zi && c.zi !== ziuaScrisa) {
        ziuaScrisa = c.zi;
        html += '<h3 class="bord-istoric-zi">' + esc(ziCuLitere(c.zi)) + '</h3>';
      }
      html += fisaIstoricHTML(c);
    });
    listaIstoric.innerHTML = html;
  }

  function citesteIstoric() {
    listaIstoric.innerHTML = '<p class="gol">Se încarcă…</p>';
    return cerere("/api/admin/istoric").then(function (d) {
      istoric = d.comenzi || [];
      umpleZile();
      randeazaIstoric();
    }).catch(function (err) {
      listaIstoric.innerHTML = '<p class="gol">' + esc(err.message) + '</p>';
    });
  }

  alegeZi.addEventListener("change", randeazaIstoric);

  listaIstoric.addEventListener("click", function (e) {
    var btn = e.target.closest ? e.target.closest("[data-sterge-istoric]") : null;
    if (!btn) return;
    var id = btn.getAttribute("data-sterge-istoric");
    if (!window.confirm("Scoți definitiv această comandă din istoric?")) return;
    btn.disabled = true;
    cerere("/api/admin/istoric/" + encodeURIComponent(id), { method: "DELETE" }).then(function (d) {
      istoric = d.comenzi || [];
      umpleZile();
      randeazaIstoric();
      citesteBord();
    }).catch(function () { btn.disabled = false; });
  });

  butonIstoric.addEventListener("click", function () {
    var seDeschide = zonaIstoric.hidden;
    zonaIstoric.hidden = !seDeschide;
    tabla.hidden = seDeschide;
    butonIstoric.textContent = seDeschide ? "Înapoi la tablă" : "Istoric comenzi";
    if (seDeschide) citesteIstoric();
  });

  /* --- 5. Pornire și legătura cu taburile panoului ------------------------ */
  /* Fundalul gri și insigna de comenzi noi țin de tabul acestei secțiuni;
     citirea rulează însă tot timpul, ca anunțul să apară și când ești pe altă
     secțiune sau cu fila în fundal. */
  function comutaFundal(nume) {
    document.body.classList.toggle("is-bord", nume === "bord");
    if (nume !== "bord") return;
    necitite = 0;
    insigna(0);
    opresteTitlu();
    citesteBord();
    if (!zonaIstoric.hidden) citesteIstoric();
  }

  $$(".tab").forEach(function (tab) {
    tab.addEventListener("click", function () { comutaFundal(tab.getAttribute("data-tab")); });
  });

  citesteBord();
  window.setInterval(citesteBord, PAS_CITIRE);
})();
