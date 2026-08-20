/* ==========================================================================
   OLIZAN — panoul de administrare, secțiunea „Închiriere sală"
   Modul separat de admin.js: se ocupă doar de textul de prezentare, de cele
   patru fotografii ale sălii și de calendarul zilelor ocupate.
   Toate cererile merg către /api/admin/sala și /api/admin/images.
   ========================================================================== */
(function () {
  "use strict";

  var panou = document.getElementById("panou-sala");
  if (!panou) return;

  var LOCURI = ["sala-1", "sala-2", "sala-3", "sala-4"];
  var SLOT = "sala";
  var MARIME_MAXIMA = 5 * 1024 * 1024;

  function $(sel) { return document.querySelector(sel); }
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

  function stare(el, mesaj, ok) {
    if (!el) return;
    el.textContent = mesaj || "";
    el.classList.toggle("is-visible", !!mesaj);
    el.classList.toggle("is-ok", !!mesaj && ok === true);
    el.classList.toggle("is-err", !!mesaj && ok === false);
  }

  /* Aceleași reguli ca în admin.js: fără sesiune validă, serverul răspunde 401
     și pagina se întoarce la autentificare. */
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

  var date = { descriere: "", descriereImplicita: "", zile: [], azi: cheieZi(new Date()) };
  var fotografii = [];
  var lunaAfisata = new Date();
  lunaAfisata.setDate(1);
  var ziAleasa = "";

  /* --- 1. Textul de prezentare -------------------------------------------- */
  var campText = $("#sala-descriere");
  var stareText = $("#sala-text-stare");

  $("#form-sala-text").addEventListener("submit", function (e) {
    e.preventDefault();
    var buton = this.querySelector("button[type=submit]");
    buton.disabled = true;
    stare(stareText, "Se salvează…");
    cerere("/api/admin/sala", { method: "PUT", corp: { descriere: campText.value } })
      .then(function (d) {
        date.descriere = d.descriere || "";
        campText.value = date.descriere;
        stare(stareText, "Textul a fost salvat și se vede deja pe site.", true);
      })
      .catch(function (err) { if (!err.sesiuneExpirata) stare(stareText, err.message, false); })
      .then(function () { buton.disabled = false; });
  });

  $("#sala-text-implicit").addEventListener("click", function () {
    campText.value = date.descriereImplicita || "";
    stare(stareText, "Textul inițial a fost pus în câmp. Apasă „Salvează textul” ca să îl publici.", true);
  });

  /* --- 2. Cele patru fotografii ------------------------------------------- */
  var zonaFoto = $("#lista-sala-foto");
  var stareFoto = $("#sala-foto-stare");

  function randeazaFotografii() {
    zonaFoto.innerHTML = LOCURI.map(function (cheie, i) {
      var img = null;
      for (var k = 0; k < fotografii.length; k++) if (fotografii[k].cheie === cheie) img = fotografii[k];
      if (!img) {
        return '<figure class="poza">' +
          '<div class="poza-goala">Locul ' + (i + 1) + '<br><span>fără fotografie</span></div>' +
        '</figure>';
      }
      return '<figure class="poza">' +
        '<img src="' + esc(img.src) + '" alt="' + esc(img.alt || "Fotografie a sălii") + '" loading="lazy">' +
        '<figcaption class="poza-jos">' +
          '<span class="poza-nume" title="' + esc(img.titlu || "Locul " + (i + 1)) + '">Locul ' + (i + 1) +
            (img.titlu ? " — " + esc(img.titlu) : "") + '</span>' +
          '<button class="buton buton--mic buton--rosu" type="button" data-sterge-sala="' + img.id + '">Șterge</button>' +
        '</figcaption>' +
      '</figure>';
    }).join("");
  }

  function incarcaFotografii() {
    return cerere("/api/admin/images").then(function (d) {
      fotografii = (d.imagini || []).filter(function (i) { return i.slot === SLOT; });
      randeazaFotografii();
    });
  }

  zonaFoto.addEventListener("click", function (e) {
    var btn = e.target.closest ? e.target.closest("[data-sterge-sala]") : null;
    if (!btn) return;
    if (!window.confirm("Ștergi această fotografie? Locul rămâne gol pe site.")) return;
    btn.disabled = true;
    cerere("/api/admin/images/" + btn.getAttribute("data-sterge-sala"), { method: "DELETE" })
      .then(function (d) {
        fotografii = (d.imagini || []).filter(function (i) { return i.slot === SLOT; });
        randeazaFotografii();
        stare(stareFoto, "Fotografia a fost ștearsă.", true);
      })
      .catch(function (err) {
        btn.disabled = false;
        if (!err.sesiuneExpirata) stare(stareFoto, err.message, false);
      });
  });

  $("#form-sala-foto").addEventListener("submit", function (e) {
    e.preventDefault();
    var campFisier = $("#sala-fisier");
    var fisier = (campFisier.files || [])[0];
    if (!fisier) { stare(stareFoto, "Alege un fișier imagine.", false); return; }
    if (fisier.size > MARIME_MAXIMA) { stare(stareFoto, "Imaginea depășește 5 MB. Alege una mai mică.", false); return; }

    var form = this;
    var buton = form.querySelector("button[type=submit]");
    buton.disabled = true;
    stare(stareFoto, "Se încarcă…");

    var corp = new FormData();
    corp.append("fisier", fisier);
    corp.append("slot", SLOT);
    corp.append("cheie", $("#sala-loc").value);
    if ($("#sala-alt").value) corp.append("alt", $("#sala-alt").value);
    if ($("#sala-titlu").value) corp.append("titlu", $("#sala-titlu").value);

    cerere("/api/admin/images", { method: "POST", formData: corp })
      .then(function (d) {
        fotografii = (d.imagini || []).filter(function (i) { return i.slot === SLOT; });
        randeazaFotografii();
        form.reset();
        stare(stareFoto, "Fotografia a fost încărcată.", true);
      })
      .catch(function (err) { if (!err.sesiuneExpirata) stare(stareFoto, err.message, false); })
      .then(function () { buton.disabled = false; });
  });

  /* --- 3. Calendarul ------------------------------------------------------- */
  var elLuna = $("#sala-luna");
  var elZile = $("#sala-zile");
  var elEditor = $("#sala-editor");
  var elEditorGol = $("#sala-editor-gol");
  var elEditorZi = $("#sala-editor-zi");
  var elNota = $("#sala-nota");
  var elElibereaza = $("#sala-elibereaza");
  var elLista = $("#sala-lista-ocupate");
  var stareCal = $("#sala-cal-stare");

  function notaPentru(zi) {
    for (var i = 0; i < date.zile.length; i++) if (date.zile[i].zi === zi) return date.zile[i].nota || "";
    return null; /* null = ziua este liberă */
  }

  function randeazaCalendar() {
    elLuna.textContent = lunaAfisata.toLocaleDateString("ro-RO", { month: "long", year: "numeric" });
    var an = lunaAfisata.getFullYear();
    var luna = lunaAfisata.getMonth();
    var zileInLuna = new Date(an, luna + 1, 0).getDate();
    var decalaj = (new Date(an, luna, 1).getDay() + 6) % 7; /* luni = 0 */

    var bucati = [];
    for (var g = 0; g < decalaj; g++) bucati.push('<span class="sala-adm-zi-goala"></span>');
    for (var zi = 1; zi <= zileInLuna; zi++) {
      var cheie = an + "-" + doua(luna + 1) + "-" + doua(zi);
      var nota = notaPentru(cheie);
      var clase = "sala-adm-zi";
      if (nota !== null) clase += " is-ocupat";
      if (cheie === date.azi) clase += " is-azi";
      if (cheie < date.azi) clase += " is-trecut";
      if (cheie === ziAleasa) clase += " is-aleasa";
      bucati.push('<button class="' + clase + '" type="button" data-zi="' + cheie + '" aria-label="' +
        esc(ziCuLitere(cheie) + " — " + (nota === null ? "liber" : "ocupat")) + '">' + zi + '</button>');
    }
    elZile.innerHTML = bucati.join("");
  }

  function randeazaLista() {
    var viitoare = date.zile.filter(function (z) { return z.zi >= date.azi; });
    if (!viitoare.length) {
      elLista.innerHTML = '<li class="sala-adm-fara">Nicio zi ocupată de acum înainte.</li>';
      return;
    }
    elLista.innerHTML = viitoare.map(function (z) {
      return '<li><b>' + esc(ziCuLitere(z.zi)) + '</b>' +
        (z.nota ? '<span>' + esc(z.nota) + '</span>' : '') + '</li>';
    }).join("");
  }

  function deschideEditor(zi) {
    ziAleasa = zi;
    var nota = notaPentru(zi);
    elEditorZi.textContent = ziCuLitere(zi);
    elNota.value = nota === null ? "" : nota;
    elElibereaza.hidden = nota === null;
    elEditor.hidden = false;
    elEditorGol.hidden = true;
    randeazaCalendar();
    elNota.focus();
  }

  function inchideEditor() {
    ziAleasa = "";
    elEditor.hidden = true;
    elEditorGol.hidden = false;
    randeazaCalendar();
  }

  function salveazaZi(ocupat) {
    if (!ziAleasa) return;
    var butoane = elEditor.querySelectorAll("button");
    Array.prototype.forEach.call(butoane, function (b) { b.disabled = true; });
    stare(stareCal, "Se salvează…");
    cerere("/api/admin/sala", {
      method: "POST",
      corp: { zi: ziAleasa, ocupat: ocupat, nota: elNota.value }
    }).then(function (d) {
      date.zile = d.zile || [];
      stare(stareCal, ocupat
        ? "Ziua este marcată ocupată și nu mai poate fi aleasă pe site."
        : "Ziua a fost eliberată și apare din nou ca disponibilă.", true);
      inchideEditor();
      randeazaLista();
    }).catch(function (err) {
      if (!err.sesiuneExpirata) stare(stareCal, err.message, false);
    }).then(function () {
      Array.prototype.forEach.call(butoane, function (b) { b.disabled = false; });
    });
  }

  elZile.addEventListener("click", function (e) {
    var btn = e.target.closest ? e.target.closest("[data-zi]") : null;
    if (!btn) return;
    stare(stareCal, "");
    deschideEditor(btn.getAttribute("data-zi"));
  });
  $("#sala-luna-inapoi").addEventListener("click", function () {
    lunaAfisata = new Date(lunaAfisata.getFullYear(), lunaAfisata.getMonth() - 1, 1);
    randeazaCalendar();
  });
  $("#sala-luna-inainte").addEventListener("click", function () {
    lunaAfisata = new Date(lunaAfisata.getFullYear(), lunaAfisata.getMonth() + 1, 1);
    randeazaCalendar();
  });
  $("#sala-ocupa").addEventListener("click", function () { salveazaZi(true); });
  $("#sala-elibereaza").addEventListener("click", function () { salveazaZi(false); });
  $("#sala-renunta").addEventListener("click", inchideEditor);

  /* --- 4. Pornirea --------------------------------------------------------- */
  var incarcat = false;

  function incarca() {
    return cerere("/api/admin/sala").then(function (d) {
      date = {
        descriere: d.descriere || "",
        descriereImplicita: d.descriereImplicita || "",
        zile: d.zile || [],
        azi: d.azi || cheieZi(new Date())
      };
      if (document.activeElement !== campText) campText.value = date.descriere;
      lunaAfisata = dinCheie(date.azi);
      lunaAfisata.setDate(1);
      randeazaCalendar();
      randeazaLista();
      return incarcaFotografii();
    }).catch(function (err) {
      if (!err.sesiuneExpirata) stare(stareCal, "Nu am putut încărca datele sălii: " + err.message, false);
    });
  }

  /* Tabul este comandat de admin.js; aici doar aducem datele la prima deschidere. */
  var tab = document.querySelector('.tab[data-tab="sala"]');
  if (tab) {
    tab.addEventListener("click", function () {
      if (incarcat) return;
      incarcat = true;
      incarca();
    });
  }
})();
