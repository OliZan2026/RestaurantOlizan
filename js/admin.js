/* ==========================================================================
   OLIZAN — panoul de administrare
   Secțiuni: 1 sesiune și taburi · 2 comenzi · 3 starea preluării comenzilor ·
             4 meniu și prețuri · 5 imagini · 6 parolă
   Toate cererile merg către /api/admin/*; fără sesiune de administrator,
   serverul răspunde 401 și pagina trimite înapoi la /admin/login.
   ========================================================================== */
(function () {
  "use strict";

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
  function dataRo(v) {
    var d = new Date(v);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleDateString("ro-RO", { day: "2-digit", month: "short", year: "numeric" }) +
      ", " + d.toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" });
  }
  function numar(v) {
    var t = String(v == null ? "" : v).trim().replace(",", ".");
    if (!t) return null;
    var n = Number(t);
    return isFinite(n) ? n : null;
  }

  var STATUSURI = [
    { cod: "noua", nume: "Comandă nouă" },
    { cod: "confirmata", nume: "Confirmată" },
    { cod: "livrata", nume: "Livrată" },
    { cod: "anulata", nume: "Anulată" }
  ];
  function numeStatus(cod) {
    for (var i = 0; i < STATUSURI.length; i++) if (STATUSURI[i].cod === cod) return STATUSURI[i].nume;
    return cod;
  }

  function stare(el, mesaj, ok) {
    if (!el) return;
    el.textContent = mesaj || "";
    el.classList.toggle("is-visible", !!mesaj);
    el.classList.toggle("is-ok", !!mesaj && ok === true);
    el.classList.toggle("is-err", !!mesaj && ok === false);
  }

  /* --- 1. Comunicarea cu serverul și sesiunea ----------------------------- */
  function laLogin() {
    window.location.href = "/admin/login";
  }

  function cerere(cale, optiuni) {
    var o = optiuni || {};
    var init = { method: o.method || "GET", credentials: "same-origin", headers: { accept: "application/json" } };
    if (o.formData) {
      init.body = o.formData;
    } else if (o.corp !== undefined) {
      init.headers["content-type"] = "application/json";
      init.body = JSON.stringify(o.corp);
    }
    return fetch(cale, init).then(function (r) {
      if (r.status === 401) {
        laLogin();
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

  /* taburi */
  $$(".tab").forEach(function (tab) {
    tab.addEventListener("click", function () {
      var nume = tab.getAttribute("data-tab");
      $$(".tab").forEach(function (t) { t.setAttribute("aria-selected", String(t === tab)); });
      $$(".panou").forEach(function (p) { p.hidden = p.id !== "panou-" + nume; });
      if (nume === "meniu") incarcaMeniu();
      if (nume === "imagini") { incarcaMeniu(); incarcaImagini(); }
      if (nume === "stare") incarcaStare();
    });
  });

  $("#admin-logout").addEventListener("click", function () {
    cerere("/api/admin/logout", { method: "POST" }).then(laLogin).catch(laLogin);
  });

  /* --- 2. Comenzile ------------------------------------------------------- */
  var zonaComenzi = $("#lista-comenzi");
  var comenzi = [];

  function randeazaComenzi() {
    var filtru = $("#filtru-status").value;
    var vizibile = filtru ? comenzi.filter(function (c) { return c.status === filtru; }) : comenzi;
    if (!vizibile.length) {
      zonaComenzi.innerHTML = '<p class="gol">Nicio comandă de afișat.</p>';
      return;
    }
    zonaComenzi.innerHTML = vizibile.map(function (c) {
      var produse = (c.produse || []).map(function (p) {
        var ambalaj = Number(p.ambalaj) > 0 ? Number(p.ambalaj) * p.cant : 0;
        return '<li><span>' + p.cant + ' × ' + esc(p.nume) +
          (p.marime ? ' <em>(' + esc(p.marime) + ')</em>' : '') +
          (ambalaj ? ' <em>+ ambalaj ' + esc(lei(ambalaj)) + '</em>' : '') + '</span>' +
          '<b>' + esc(lei(p.pret * p.cant)) + '</b></li>';
      }).join("");
      var optiuni = STATUSURI.map(function (s) {
        return '<option value="' + s.cod + '"' + (s.cod === c.status ? ' selected' : '') + '>' + esc(s.nume) + '</option>';
      }).join("");
      return '<article class="fisa">' +
        '<header class="fisa-cap">' +
          '<div>' +
            '<p class="fisa-titlu">Comanda #' + esc(c.numar || String(c.id)) + ' — ' + esc(c.nume) + '</p>' +
            '<p class="fisa-meta">' + esc(dataRo(c.data)) + ' · ' + esc(c.telefon) +
              (c.email ? ' · ' + esc(c.email) : '') + ' · ' + esc(c.cont) +
              (c.numar ? ' · fișa #' + c.id : '') + '</p>' +
          '</div>' +
          '<span class="eticheta eticheta--' + esc(c.status) + '">' + esc(numeStatus(c.status)) + '</span>' +
        '</header>' +
        '<ul class="fisa-linii">' + produse +
          (Number(c.ambalaj) > 0
            ? '<li class="fisa-ambalaj"><span>Ambalaj</span><b>' + esc(lei(c.ambalaj)) + '</b></li>'
            : '') +
        '</ul>' +
        '<div class="fisa-jos">' +
          '<span>' + (c.modalitate === "livrare"
            ? 'Livrare · ' + esc(c.adresa || "fără adresă")
            : 'Ridicare personală') +
            (c.observatii ? '<br>Observații: ' + esc(c.observatii) : '') + '</span>' +
          '<span class="butoane">' +
            '<select data-status="' + c.id + '" aria-label="Starea comenzii #' + esc(c.numar || String(c.id)) + '">' + optiuni + '</select>' +
            '<b>' + esc(lei(c.total)) + '</b>' +
          '</span>' +
        '</div>' +
      '</article>';
    }).join("");
  }

  function incarcaComenzi() {
    zonaComenzi.innerHTML = '<p class="gol">Se încarcă…</p>';
    cerere("/api/admin/orders").then(function (d) {
      comenzi = d.comenzi || [];
      randeazaComenzi();
    }).catch(function (err) {
      zonaComenzi.innerHTML = '<p class="gol">' + esc(err.message) + '</p>';
    });
  }

  zonaComenzi.addEventListener("change", function (e) {
    var sel = e.target;
    if (!sel.hasAttribute || !sel.hasAttribute("data-status")) return;
    var id = sel.getAttribute("data-status");
    sel.disabled = true;
    cerere("/api/admin/orders/" + id, { method: "PATCH", corp: { status: sel.value } })
      .then(incarcaComenzi)
      .catch(function () { sel.disabled = false; });
  });

  $("#filtru-status").addEventListener("change", randeazaComenzi);
  $("#reincarca-comenzi").addEventListener("click", incarcaComenzi);

  /* --- 3. Starea preluării comenzilor ------------------------------------- */
  /* Trei stări, un singur clic între ele. Butonul stării active rămâne apăsat,
     iar insigna din antet arată starea pe orice tab al panoului. */
  var zonaStari = $("#lista-stari");
  var mesajStare = $("#stare-mesaj");
  var insignaStare = $("#insigna-stare");
  var stari = [];
  var stareCurenta = "";

  function randeazaStari() {
    if (!stari.length) {
      zonaStari.innerHTML = '<p class="gol">Stările nu au putut fi încărcate.</p>';
      return;
    }
    zonaStari.innerHTML = stari.map(function (s) {
      var activa = s.cod === stareCurenta;
      return '<button class="stare-opt' + (activa ? ' is-activa' : '') + (s.blocat ? ' stare-opt--oprit' : '') + '" ' +
        'type="button" data-stare="' + esc(s.cod) + '" aria-pressed="' + (activa ? 'true' : 'false') + '">' +
        '<span class="stare-opt-cap">' +
          '<b>' + esc(s.eticheta) + '</b>' +
          '<span class="stare-opt-bifa">' + (activa ? 'Stare activă' : 'Alege') + '</span>' +
        '</span>' +
        '<span class="stare-opt-desc">' + esc(s.explicatie) + '</span>' +
        (s.mesaj ? '<span class="stare-opt-text">Clienții văd: „' + esc(s.mesaj) + '"</span>' : '') +
      '</button>';
    }).join("");
  }

  function randeazaInsigna() {
    if (!insignaStare) return;
    var aleasa = null;
    for (var i = 0; i < stari.length; i++) if (stari[i].cod === stareCurenta) aleasa = stari[i];
    if (!aleasa) { insignaStare.hidden = true; return; }
    insignaStare.textContent = aleasa.blocat ? "Comenzi oprite: " + aleasa.eticheta : "Comenzi: deschis";
    insignaStare.classList.toggle("is-oprit", !!aleasa.blocat);
    insignaStare.hidden = false;
  }

  function aplicaStare(d) {
    stari = d.optiuni || stari;
    stareCurenta = d.stare || stareCurenta;
    randeazaStari();
    randeazaInsigna();
  }

  function incarcaStare() {
    return cerere("/api/admin/stare").then(aplicaStare).catch(function (err) {
      zonaStari.innerHTML = '<p class="gol">' + esc(err.message) + '</p>';
    });
  }

  zonaStari.addEventListener("click", function (e) {
    var btn = e.target.closest ? e.target.closest("[data-stare]") : null;
    if (!btn) return;
    var cod = btn.getAttribute("data-stare");
    if (cod === stareCurenta) return;
    $$("[data-stare]", zonaStari).forEach(function (b) { b.disabled = true; });
    stare(mesajStare, "Se salvează…");
    cerere("/api/admin/stare", { method: "PUT", corp: { stare: cod } }).then(function (d) {
      aplicaStare(d);
      var aleasa = null;
      for (var i = 0; i < stari.length; i++) if (stari[i].cod === stareCurenta) aleasa = stari[i];
      stare(mesajStare, aleasa && aleasa.blocat
        ? "Salvat. Site-ul nu mai preia comenzi și afișează mesajul „" + aleasa.titlu + "”."
        : "Salvat. Site-ul preia comenzi ca de obicei.", true);
    }).catch(function (err) {
      stare(mesajStare, err.message, false);
      $$("[data-stare]", zonaStari).forEach(function (b) { b.disabled = false; });
    });
  });

  $("#reincarca-stare").addEventListener("click", function () {
    stare(mesajStare, "");
    incarcaStare();
  });

  /* --- 4. Meniul și prețurile --------------------------------------------- */
  var categorii = [];
  var produse = [];
  var meniuIncarcat = false;

  function numeCategorie(id) {
    for (var i = 0; i < categorii.length; i++) if (categorii[i].id === id) return categorii[i].titlu;
    return id;
  }

  function randeazaProduse() {
    var filtru = $("#filtru-categorie").value;
    var vizibile = filtru ? produse.filter(function (p) { return p.categorie === filtru; }) : produse;
    var corp = $("#lista-produse");
    if (!vizibile.length) {
      corp.innerHTML = '<tr><td colspan="5" class="gol">Niciun produs în această categorie.</td></tr>';
      return;
    }
    corp.innerHTML = vizibile.map(function (p) {
      return '<tr' + (p.activ ? '' : ' class="inactiv"') + '>' +
        '<td><b>' + esc((p.grupPrefix || "") + p.nume) + '</b>' +
          (p.ing ? '<br><span class="fisa-meta">' + esc(p.ing) + '</span>' : '') +
          (p.activ ? '' : '<br><span class="eticheta">indisponibil</span>') + '</td>' +
        '<td>' + esc(numeCategorie(p.categorie)) + '</td>' +
        '<td class="num">' + esc(p.pret === null ? "—" : lei(p.pret)) + '</td>' +
        '<td class="num">' + esc(p.cuMarimi && p.pretMare !== null ? lei(p.pretMare) : "—") + '</td>' +
        '<td class="butoane">' +
          '<button class="buton buton--mic buton--gol" type="button" data-editeaza="' + esc(p.id) + '">Modifică</button>' +
          '<button class="buton buton--mic buton--rosu" type="button" data-sterge="' + esc(p.id) + '">Șterge</button>' +
        '</td>' +
      '</tr>';
    }).join("");
  }

  function umpleCategorii() {
    var optiuni = categorii.map(function (c) {
      return '<option value="' + esc(c.id) + '">' + esc(c.titlu) + '</option>';
    }).join("");
    $("#filtru-categorie").innerHTML = '<option value="">Toate categoriile</option>' + optiuni;
    $("#produs-categorie").innerHTML = optiuni;
  }

  function umpleProduseFoto() {
    $("#foto-produs").innerHTML = produse.map(function (p) {
      return '<option value="' + esc(p.id) + '">' + esc((p.grupPrefix || "") + p.nume) +
        ' — ' + esc(numeCategorie(p.categorie)) + '</option>';
    }).join("");
  }

  function incarcaMeniu(fortat) {
    if (meniuIncarcat && !fortat) return Promise.resolve();
    return cerere("/api/admin/menu").then(function (d) {
      categorii = d.categorii || [];
      produse = d.produse || [];
      meniuIncarcat = true;
      umpleCategorii();
      umpleProduseFoto();
      randeazaProduse();
    }).catch(function (err) {
      $("#lista-produse").innerHTML = '<tr><td colspan="5" class="gol">' + esc(err.message) + '</td></tr>';
    });
  }

  $("#filtru-categorie").addEventListener("change", randeazaProduse);

  /* editorul de produs */
  var editor = $("#editor-produs");

  function deschideEditor(produs) {
    $("#editor-titlu").textContent = produs ? "Modifică produsul" : "Produs nou";
    $("#produs-id").value = produs ? produs.id : "";
    $("#produs-nume").value = produs ? produs.nume : "";
    $("#produs-categorie").value = produs ? produs.categorie : ($("#filtru-categorie").value || (categorii[0] || {}).id || "");
    $("#produs-ing").value = produs ? (produs.ing || "") : "";
    $("#produs-gramaj").value = produs ? (produs.gramaj || "") : "";
    $("#produs-pret").value = produs && produs.pret !== null ? produs.pret : "";
    $("#produs-pret-mare").value = produs && produs.pretMare !== null ? produs.pretMare : "";
    $("#produs-cu-marimi").checked = !!(produs && produs.cuMarimi);
    $("#produs-grup").value = produs ? (produs.grupTitlu || "") : "";
    $("#produs-prefix").value = produs ? (produs.grupPrefix || "") : "";
    $("#produs-activ").checked = produs ? produs.activ !== false : true;
    stare($("#produs-stare"), "");
    editor.hidden = false;
    editor.scrollIntoView({ block: "nearest", behavior: "smooth" });
    $("#produs-nume").focus();
  }

  $("#produs-nou").addEventListener("click", function () { deschideEditor(null); });
  $("#renunta-produs").addEventListener("click", function () { editor.hidden = true; });

  $("#lista-produse").addEventListener("click", function (e) {
    var btn = e.target.closest ? e.target.closest("button") : null;
    if (!btn) return;
    if (btn.hasAttribute("data-editeaza")) {
      var id = btn.getAttribute("data-editeaza");
      for (var i = 0; i < produse.length; i++) if (produse[i].id === id) { deschideEditor(produse[i]); return; }
    }
    if (btn.hasAttribute("data-sterge")) {
      var idS = btn.getAttribute("data-sterge");
      if (!window.confirm("Ștergi definitiv acest produs din meniu?")) return;
      btn.disabled = true;
      cerere("/api/admin/menu/" + encodeURIComponent(idS), { method: "DELETE" })
        .then(function () { return incarcaMeniu(true); })
        .catch(function () { btn.disabled = false; });
    }
  });

  $("#form-produs").addEventListener("submit", function (e) {
    e.preventDefault();
    var status = $("#produs-stare");
    var id = $("#produs-id").value;
    var cuMarimi = $("#produs-cu-marimi").checked;
    var corp = {
      nume: $("#produs-nume").value.trim(),
      categorie: $("#produs-categorie").value,
      ing: $("#produs-ing").value.trim(),
      gramaj: $("#produs-gramaj").value.trim(),
      pret: numar($("#produs-pret").value),
      pretMare: numar($("#produs-pret-mare").value),
      cuMarimi: cuMarimi,
      grupTitlu: $("#produs-grup").value.trim(),
      grupPrefix: $("#produs-prefix").value,
      activ: $("#produs-activ").checked
    };
    if (!corp.nume) { stare(status, "Completează denumirea produsului.", false); return; }
    if (corp.pret === null || corp.pret <= 0) { stare(status, "Completează un preț valid.", false); return; }
    if (cuMarimi && (corp.pretMare === null || corp.pretMare <= 0)) {
      stare(status, "Completează și prețul pentru mărimea family.", false); return;
    }

    var buton = $("#form-produs button[type=submit]");
    buton.disabled = true;
    stare(status, "Se salvează…");
    cerere(id ? "/api/admin/menu/" + encodeURIComponent(id) : "/api/admin/menu", {
      method: id ? "PUT" : "POST",
      corp: corp
    }).then(function () {
      stare(status, "Produsul a fost salvat.", true);
      editor.hidden = true;
      return incarcaMeniu(true);
    }).catch(function (err) {
      stare(status, err.message, false);
    }).then(function () { buton.disabled = false; });
  });

  /* --- 5. Imaginile ------------------------------------------------------- */
  var imagini = [];
  var MARIME_MAXIMA = 5 * 1024 * 1024;

  /** "o fotografie", "3 fotografii", "21 de fotografii". */
  function numaraFotografii(n) {
    if (n === 1) return "o fotografie";
    return n + (n % 100 === 0 || n % 100 > 19 ? " de fotografii" : " fotografii");
  }

  /** Numele fisierului, fara extensie, folosit ca titlu cand nu s-a completat unul. */
  function titluDinNume(nume) {
    return String(nume || "").replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim().slice(0, 200);
  }

  function cardImagine(img) {
    return '<figure class="poza">' +
      '<img src="' + esc(img.src) + '" alt="' + esc(img.alt || "Imagine încărcată") + '" loading="lazy">' +
      '<figcaption class="poza-jos">' +
        '<span class="poza-nume" title="' + esc(img.titlu || img.cheie) + '">' + esc(img.titlu || img.cheie) + '</span>' +
        '<button class="buton buton--mic buton--rosu" type="button" data-sterge-imagine="' + img.id + '">Șterge</button>' +
      '</figcaption>' +
    '</figure>';
  }

  function randeazaImagini() {
    function pentru(slot) {
      return imagini.filter(function (i) { return i.slot === slot; }).map(cardImagine).join("") ||
        '<p class="gol">Nicio imagine încărcată încă.</p>';
    }
    $("#lista-hero").innerHTML = pentru("hero");
    $("#lista-galerie").innerHTML = pentru("galerie");
    $("#lista-produse-foto").innerHTML = pentru("produs");
  }

  function incarcaImagini() {
    return cerere("/api/admin/images").then(function (d) {
      imagini = d.imagini || [];
      randeazaImagini();
    }).catch(function () {});
  }

  $("#panou-imagini").addEventListener("click", function (e) {
    var btn = e.target.closest ? e.target.closest("[data-sterge-imagine]") : null;
    if (!btn) return;
    if (!window.confirm("Ștergi această imagine? Site-ul revine la imaginea inițială.")) return;
    btn.disabled = true;
    cerere("/api/admin/images/" + btn.getAttribute("data-sterge-imagine"), { method: "DELETE" })
      .then(function (d) { imagini = d.imagini || []; randeazaImagini(); })
      .catch(function () { btn.disabled = false; });
  });

  function urcaImagine(fisier, campuri) {
    var date = new FormData();
    date.append("fisier", fisier);
    date.append("slot", campuri.slot);
    if (campuri.cheie) date.append("cheie", campuri.cheie);
    if (campuri.alt) date.append("alt", campuri.alt);
    // La galerie fiecare fotografie primeste un titlu: cel scris in formular
    // pentru tot grupul, altfel numele fisierului.
    var titlu = campuri.titlu || (campuri.slot === "galerie" ? titluDinNume(fisier.name) : "");
    if (titlu) date.append("titlu", titlu);
    return cerere("/api/admin/images", { method: "POST", formData: date });
  }

  function trimiteImagini(form, campuri, elStare) {
    var fisiere = Array.prototype.slice.call(campuri.fisier.files || []);
    if (!fisiere.length) {
      stare(elStare, campuri.fisier.multiple ? "Alege cel puțin un fișier imagine." : "Alege un fișier imagine.", false);
      return;
    }

    var preaMari = fisiere.filter(function (f) { return f.size > MARIME_MAXIMA; });
    if (preaMari.length) {
      stare(elStare, "Peste 5 MB, alege fișiere mai mici: " +
        preaMari.map(function (f) { return f.name; }).join(", "), false);
      return;
    }

    var buton = form.querySelector("button[type=submit]");
    buton.disabled = true;

    var reusite = 0;
    var esecuri = [];

    // Fiecare fotografie merge intr-o cerere separata, una dupa alta: asa nu
    // depasim limita de marime a unei singure cereri si stim exact care fisier
    // a esuat, fara sa pierdem restul incarcarii.
    function pas(i) {
      if (i >= fisiere.length) return Promise.resolve();
      stare(elStare, fisiere.length > 1 ? "Se încarcă " + (i + 1) + " din " + fisiere.length + "…" : "Se încarcă…");
      return urcaImagine(fisiere[i], campuri).then(function (d) {
        reusite++;
        imagini = d.imagini || imagini;
        randeazaImagini();
        return pas(i + 1);
      }, function (err) {
        if (err && err.sesiuneExpirata) return Promise.resolve();
        esecuri.push(fisiere[i].name + " — " + err.message);
        return pas(i + 1);
      });
    }

    pas(0).then(function () {
      buton.disabled = false;
      if (reusite) form.reset();
      if (reusite && !esecuri.length) {
        stare(elStare, fisiere.length > 1
          ? numaraFotografii(reusite) + " au fost încărcate și sunt vizibile pe site."
          : "Imaginea a fost încărcată și este vizibilă pe site.", true);
      } else if (esecuri.length) {
        stare(elStare, (reusite ? "Încărcate: " + reusite + " din " + fisiere.length + ". Nereușite: " : "") +
          esecuri.join(" · "), false);
      }
    });
  }

  $("#form-hero").addEventListener("submit", function (e) {
    e.preventDefault();
    trimiteImagini(e.target, {
      fisier: $("#hero-fisier"), slot: "hero", cheie: "hero", alt: $("#hero-alt").value.trim()
    }, $("#hero-stare"));
  });

  $("#form-galerie").addEventListener("submit", function (e) {
    e.preventDefault();
    trimiteImagini(e.target, {
      fisier: $("#galerie-fisier"),
      slot: "galerie",
      cheie: "",
      alt: $("#galerie-alt").value.trim(),
      titlu: $("#galerie-titlu").value.trim()
    }, $("#galerie-stare"));
  });

  $("#form-produs-foto").addEventListener("submit", function (e) {
    e.preventDefault();
    var produs = $("#foto-produs").value;
    if (!produs) { stare($("#foto-stare"), "Alege produsul.", false); return; }
    trimiteImagini(e.target, {
      fisier: $("#foto-fisier"), slot: "produs", cheie: produs, alt: $("#foto-alt").value.trim()
    }, $("#foto-stare"));
  });

  /* --- 6. Parola ---------------------------------------------------------- */
  $("#form-parola").addEventListener("submit", function (e) {
    e.preventDefault();
    var status = $("#parola-stare");
    var buton = $("#form-parola button[type=submit]");
    buton.disabled = true;
    stare(status, "Se salvează…");
    cerere("/api/admin/parola", {
      method: "POST",
      corp: { parolaVeche: $("#parola-veche").value, parolaNoua: $("#parola-noua").value }
    }).then(function () {
      $("#form-parola").reset();
      stare(status, "Parola a fost schimbată.", true);
    }).catch(function (err) {
      stare(status, err.message, false);
    }).then(function () { buton.disabled = false; });
  });

  /* --- pornire ------------------------------------------------------------ */
  cerere("/api/admin/session").then(function (d) {
    $("#admin-nume").textContent = "Autentificat: " + d.admin.utilizator;
    incarcaComenzi();
    incarcaStare();
  }).catch(function () {});
})();
