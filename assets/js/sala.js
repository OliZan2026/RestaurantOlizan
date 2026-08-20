/* ==========================================================================
   OLIZAN Restaurant & Pizzeria — secțiunea „Închiriere sală"
   Modul independent: rulează doar pe paginile care au un element [data-sala]
   și nu atinge nimic din restul site-ului (meniu, coș, cont, galerie).

   1 datele vin de la /api/sala (text, fotografii, zilele ocupate)
   2 calendarul arată o lună o dată, cu navigare înainte/înapoi
   3 zilele ocupate de administrator nu se pot alege
   4 alegerea unei zile libere deschide formularul de cerere
   5 trimiterea deschide WhatsApp cu mesajul completat — este o CERERE,
     ziua rămâne liberă până când restaurantul o marchează din panou
   ========================================================================== */
(function () {
  "use strict";

  var sectiuni = Array.prototype.slice.call(document.querySelectorAll("[data-sala]"));
  if (!sectiuni.length) return;

  var NUMAR_WA_IMPLICIT = "40723639875";
  var LUNI_INAINTE = 18;              /* cât de departe se poate răsfoi calendarul */
  var ZILE_SCURTE = ["L", "Ma", "Mi", "J", "V", "S", "D"];

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
  function doua(n) { return n < 10 ? "0" + n : String(n); }
  function cheieZi(d) { return d.getFullYear() + "-" + doua(d.getMonth() + 1) + "-" + doua(d.getDate()); }
  function dinCheie(z) {
    var p = String(z).split("-");
    return new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
  }
  function ziCuLitere(z) {
    var d = dinCheie(z);
    if (isNaN(d.getTime())) return z;
    return d.toLocaleDateString("ro-RO", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  }
  function numeLuna(d) {
    return d.toLocaleDateString("ro-RO", { month: "long", year: "numeric" });
  }

  var ICON_CAL = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 10h18"/></svg>';
  var ICON_INFO = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 16v-5"/><path d="M12 8h.01"/></svg>';
  var ICON_FOTO = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="8.5" cy="10" r="1.5"/><path d="m21 16-5-5L5 19"/></svg>';
  var ICON_WA = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12.04 2c-5.5 0-9.96 4.46-9.96 9.96 0 1.76.46 3.48 1.34 5L2 22l5.2-1.36a9.9 9.9 0 0 0 4.84 1.24h.01c5.5 0 9.96-4.46 9.96-9.96A9.9 9.9 0 0 0 19.08 4.9 9.9 9.9 0 0 0 12.04 2Zm0 1.8c2.18 0 4.23.85 5.77 2.4a8.1 8.1 0 0 1 2.39 5.77c0 4.5-3.66 8.16-8.16 8.16a8.2 8.2 0 0 1-4.17-1.14l-.3-.18-3.09.81.82-3-.19-.31a8.1 8.1 0 0 1-1.24-4.34c0-4.5 3.66-8.17 8.17-8.17Zm-2.6 4.14c-.16 0-.42.06-.64.3-.22.24-.85.83-.85 2.03s.87 2.35.99 2.51c.12.16 1.7 2.6 4.13 3.55 2.02.8 2.43.64 2.87.6.44-.04 1.42-.58 1.62-1.15.2-.56.2-1.05.14-1.15-.06-.1-.22-.16-.46-.28-.24-.12-1.42-.7-1.64-.78-.22-.08-.38-.12-.54.12-.16.24-.62.78-.76.94-.14.16-.28.18-.52.06-.24-.12-1.01-.37-1.93-1.19-.71-.63-1.19-1.42-1.33-1.66-.14-.24-.02-.37.1-.49.11-.11.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.53-1.3-.74-1.78-.19-.45-.39-.39-.53-.4h-.47Z"/></svg>';

  /* Numărul de WhatsApp al restaurantului, din data/menu.js dacă există */
  function numarWa() {
    var D = window.OLIZAN || {};
    var nr = D.contact && D.contact.whatsapp ? String(D.contact.whatsapp) : NUMAR_WA_IMPLICIT;
    return nr.replace(/[^0-9]/g, "") || NUMAR_WA_IMPLICIT;
  }

  /* Deschiderea conversației folosește, dacă a apucat să pornească, aceeași
     funcție ca butoanele de comandă din site.js (care tratează și aplicația de
     pe telefon). Altfel rămâne varianta simplă, cu adresa wa.me. */
  function trimitePeWhatsApp(mesaj) {
    if (typeof window.olizanDeschideWa === "function") {
      window.olizanDeschideWa(mesaj, numarWa());
      return;
    }
    var adresa = "https://wa.me/" + numarWa() + "?text=" + encodeURIComponent(mesaj);
    var fila = window.open(adresa, "_blank", "noopener");
    if (!fila) window.location.href = adresa;
  }

  /* Textul vine din panou ca text simplu; numerele de telefon din el rămân
     apelabile de pe telefon. */
  function textCuTelefoane(text) {
    return esc(text).replace(/(\+?4?0[\s.\-]?\d{3}[\s.\-]?\d{3}[\s.\-]?\d{3})/g, function (nr) {
      var cifre = nr.replace(/[^0-9]/g, "");
      if (cifre.length === 9) cifre = "0" + cifre;
      if (cifre.length === 10 && cifre.charAt(0) === "0") cifre = "4" + cifre;
      if (cifre.length !== 11) return nr;
      return '<a href="tel:+' + cifre + '">' + nr + "</a>";
    });
  }

  /* --- fotografiile sălii -------------------------------------------------- */
  function locGol() {
    return '<figure class="sala-foto sala-foto--gol">' + ICON_FOTO +
      '<span>Fotografie în curând</span></figure>';
  }

  function randeazaGalerie(zona, imagini) {
    if (!zona) return;
    var lista = Array.isArray(imagini) ? imagini : [];
    var bucati = lista.slice(0, 4).map(function (f) {
      var titlu = f.titlu || f.alt || "Sala de evenimente OLIZAN";
      /* tabindex/role sunt puse aici pentru că lupa din site.js le adaugă doar
         imaginilor existente la pornire, iar acestea vin mai târziu */
      return '<figure class="sala-foto" tabindex="0" role="button" data-lb="' + esc(f.src) +
        '" data-lb-cap="' + esc(titlu) + '">' +
        '<img src="' + esc(f.src) + '" alt="' + esc(f.alt || titlu) + '" loading="lazy" decoding="async">' +
        (f.titlu ? '<figcaption>' + esc(f.titlu) + '</figcaption>' : '') +
      '</figure>';
    });
    while (bucati.length < 4) bucati.push(locGol());
    zona.innerHTML = bucati.join("");
  }

  /* --- calendarul și formularul ------------------------------------------- */
  function porneste(sectiune, date) {
    var ocupate = {};
    (date.ocupate || []).forEach(function (z) { ocupate[z] = true; });

    var azi = date.azi && /^\d{4}-\d{2}-\d{2}$/.test(date.azi) ? date.azi : cheieZi(new Date());
    var primaLuna = dinCheie(azi);
    primaLuna.setDate(1);
    var ultimaLuna = new Date(primaLuna.getFullYear(), primaLuna.getMonth() + LUNI_INAINTE, 1);

    var lunaAfisata = new Date(primaLuna.getTime());
    var aleasa = "";

    var elLuna = sectiune.querySelector("[data-sala-luna]");
    var elZile = sectiune.querySelector("[data-sala-zile]");
    var elInapoi = sectiune.querySelector("[data-sala-inapoi]");
    var elInainte = sectiune.querySelector("[data-sala-inainte]");
    var elFormZona = sectiune.querySelector("[data-sala-form-zona]");
    var elForm = sectiune.querySelector("[data-sala-form]");
    var elGol = sectiune.querySelector("[data-sala-fara-zi]");
    var elEticheta = sectiune.querySelector("[data-sala-zi-aleasa]");
    var elStatus = sectiune.querySelector("[data-sala-status]");

    if (!elZile || !elLuna) return;

    function randeazaLuna() {
      elLuna.textContent = numeLuna(lunaAfisata);
      if (elInapoi) elInapoi.disabled = lunaAfisata.getFullYear() === primaLuna.getFullYear() &&
        lunaAfisata.getMonth() === primaLuna.getMonth();
      if (elInainte) elInainte.disabled = lunaAfisata.getFullYear() === ultimaLuna.getFullYear() &&
        lunaAfisata.getMonth() === ultimaLuna.getMonth();

      var an = lunaAfisata.getFullYear();
      var luna = lunaAfisata.getMonth();
      var prima = new Date(an, luna, 1);
      var zileInLuna = new Date(an, luna + 1, 0).getDate();
      var decalaj = (prima.getDay() + 6) % 7; /* luni = 0 */

      var bucati = [];
      for (var g = 0; g < decalaj; g++) bucati.push('<span class="sala-zi-goala" aria-hidden="true"></span>');

      for (var zi = 1; zi <= zileInLuna; zi++) {
        var cheie = an + "-" + doua(luna + 1) + "-" + doua(zi);
        var trecuta = cheie < azi;
        var ocupata = !!ocupate[cheie];
        var clase = "sala-zi";
        var stare = "";
        if (cheie === azi) clase += " is-azi";
        if (trecuta) { clase += " is-trecuta"; stare = "zi trecută"; }
        else if (ocupata) { clase += " is-ocupata"; stare = "ocupat"; }
        else { stare = "disponibil"; }
        if (cheie === aleasa) clase += " is-aleasa";
        bucati.push(
          '<button class="' + clase + '" type="button" data-zi="' + cheie + '"' +
          (trecuta || ocupata ? ' disabled' : '') +
          ' aria-pressed="' + (cheie === aleasa ? "true" : "false") + '"' +
          ' aria-label="' + esc(ziCuLitere(cheie) + " — " + stare) + '">' + zi + '</button>'
        );
      }
      elZile.innerHTML = bucati.join("");
    }

    function alegeZiua(cheie) {
      aleasa = cheie;
      randeazaLuna();
      if (elEticheta) elEticheta.innerHTML = ICON_CAL + '<span>' + esc(ziCuLitere(cheie)) + '</span>';
      if (elGol) elGol.hidden = true;
      if (elForm) elForm.hidden = false;
      if (elFormZona) {
        var camp = elFormZona.querySelector("input, select, textarea");
        if (camp) camp.focus({ preventScroll: true });
        elFormZona.scrollIntoView({ block: "nearest", behavior: "smooth" });
      }
    }

    elZile.addEventListener("click", function (e) {
      var btn = e.target.closest ? e.target.closest("[data-zi]") : null;
      if (!btn || btn.disabled) return;
      arataStatus("", null);
      alegeZiua(btn.getAttribute("data-zi"));
    });

    function mutaLuna(pas) {
      var noua = new Date(lunaAfisata.getFullYear(), lunaAfisata.getMonth() + pas, 1);
      if (noua < primaLuna || noua > ultimaLuna) return;
      lunaAfisata = noua;
      randeazaLuna();
    }
    if (elInapoi) elInapoi.addEventListener("click", function () { mutaLuna(-1); });
    if (elInainte) elInainte.addEventListener("click", function () { mutaLuna(1); });

    function arataStatus(mesaj, ok) {
      if (!elStatus) return;
      elStatus.textContent = mesaj || "";
      elStatus.className = "form-status" + (mesaj ? " is-visible " + (ok ? "is-ok" : "is-err") : "");
    }

    /* Mesajul dus pe WhatsApp — aceleași rânduri, în aceeași ordine, ca să fie
       ușor de citit de la telefon. */
    function mesajCerere(campuri) {
      var randuri = [
        "Bună ziua! Doresc să rezerv sala de evenimente de la OLIZAN Restaurant & Pizzeria.",
        "",
        "Data dorită: " + ziCuLitere(aleasa),
        "Nume: " + campuri.nume,
        "Telefon: " + campuri.telefon,
        "Tip eveniment: " + campuri.tip,
        "Număr aproximativ de invitați: " + campuri.invitati
      ];
      if (campuri.mesaj) randuri.push("Mesaj: " + campuri.mesaj);
      randuri.push("");
      randuri.push("Aceasta este o cerere de rezervare trimisă de pe site, nu o rezervare confirmată.");
      return randuri.join("\n");
    }

    if (elForm) {
      elForm.addEventListener("submit", function (e) {
        e.preventDefault();
        if (!aleasa) { arataStatus("Alege mai întâi o zi disponibilă din calendar.", false); return; }
        if (!elForm.checkValidity()) { elForm.reportValidity(); return; }

        var campuri = {
          nume: (elForm.querySelector("[data-camp=nume]").value || "").trim(),
          telefon: (elForm.querySelector("[data-camp=telefon]").value || "").trim(),
          tip: (elForm.querySelector("[data-camp=tip]").value || "").trim(),
          invitati: (elForm.querySelector("[data-camp=invitati]").value || "").trim(),
          mesaj: (elForm.querySelector("[data-camp=mesaj]").value || "").trim()
        };
        if (!campuri.nume || !campuri.telefon) {
          arataStatus("Completează numele și numărul de telefon.", false);
          return;
        }
        trimitePeWhatsApp(mesajCerere(campuri));
        arataStatus("S-a deschis WhatsApp cu cererea completată. Apasă butonul de trimitere din " +
          "WhatsApp, iar noi îți confirmăm disponibilitatea cât de repede putem.", true);
      });
    }

    randeazaLuna();
  }

  /* --- pornirea ------------------------------------------------------------ */
  function aplica(date) {
    sectiuni.forEach(function (sectiune) {
      var elDescriere = sectiune.querySelector("[data-sala-descriere]");
      if (elDescriere && date.descriere) elDescriere.innerHTML = textCuTelefoane(date.descriere);
      randeazaGalerie(sectiune.querySelector("[data-sala-galerie]"), date.imagini);
      porneste(sectiune, date);
    });
  }

  function ia() {
    if (typeof fetch !== "function") return Promise.resolve(null);
    return fetch("/api/sala", { headers: { accept: "application/json" } })
      .then(function (r) { return r.ok ? r.json() : null; })
      .catch(function () { return null; });
  }

  /* Dacă serverul nu răspunde, secțiunea rămâne folosibilă: textul scris în
     pagină, fotografiile lipsă ca locuri goale și un calendar fără zile
     ocupate — cererea tot ajunge pe WhatsApp. */
  ia().then(function (date) {
    aplica(date && typeof date === "object" ? date : { ocupate: [], imagini: [] });
  });
})();
