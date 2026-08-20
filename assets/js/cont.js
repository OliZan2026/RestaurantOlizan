/* ==========================================================================
   OLIZAN Restaurant & Pizzeria — pagina „Contul meu”
   Autentificare și înregistrare client, datele personale, adresele salvate
   și istoricul comenzilor. Vorbește doar cu funcțiile din /api/auth și
   /api/account; sesiunea este ținută într-un cookie HttpOnly, deci scriptul
   nu are acces la niciun jeton.
   ========================================================================== */
(function () {
  "use strict";

  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
  function lei(n) {
    return (Math.round(Number(n) * 100) / 100).toFixed(2).replace(".", ",") + " lei";
  }
  function dataRo(v) {
    var d = new Date(v);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleDateString("ro-RO", { day: "2-digit", month: "long", year: "numeric" }) +
      ", " + d.toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" });
  }

  var STATUSURI = {
    noua: "Comandă nouă",
    confirmata: "Confirmată",
    livrata: "Livrată",
    anulata: "Anulată"
  };

  /* --- comunicarea cu serverul -------------------------------------------- */
  function cerere(cale, optiuni) {
    var o = optiuni || {};
    var init = {
      method: o.method || "GET",
      credentials: "same-origin",
      headers: { accept: "application/json" }
    };
    if (o.corp !== undefined) {
      init.headers["content-type"] = "application/json";
      init.body = JSON.stringify(o.corp);
    }
    return fetch(cale, init).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (d) {
        if (!r.ok) throw new Error((d && d.eroare) || "A apărut o problemă. Încearcă din nou.");
        return d;
      });
    });
  }

  function stare(el, mesaj, ok) {
    if (!el) return;
    el.textContent = mesaj || "";
    el.classList.toggle("is-visible", !!mesaj);
    el.classList.toggle("is-ok", !!mesaj && ok === true);
    el.classList.toggle("is-err", !!mesaj && ok === false);
  }

  function blocheaza(form, activ) {
    var btn = $("button[type=submit]", form);
    if (btn) btn.disabled = !!activ;
  }

  /* --- elementele paginii -------------------------------------------------- */
  var sectiuneIncarcare = $("#cont-incarcare");
  var sectiuneVizitator = $("#cont-vizitator");
  var sectiuneClient = $("#cont-client");
  if (!sectiuneVizitator || !sectiuneClient) return;

  var formLogin = $("#form-login");
  var formInregistrare = $("#form-inregistrare");
  var formProfil = $("#form-profil");
  var formAdresa = $("#form-adresa");
  var listaAdrese = $("#cont-adrese");
  var zonaComenzi = $("#cont-comenzi");

  function arata(client) {
    if (sectiuneIncarcare) sectiuneIncarcare.hidden = true;
    sectiuneVizitator.hidden = !!client;
    sectiuneClient.hidden = !client;
    if (!client) return;
    $("#cont-salut").textContent = client.nume ? "Bună, " + client.nume + "!" : "Contul tău";
    $("#cont-email").textContent = client.email;
    $("#profil-nume").value = client.nume || "";
    $("#profil-telefon").value = client.telefon || "";
    incarcaAdrese();
    incarcaComenzi();
  }

  /* --- adresele salvate ---------------------------------------------------- */
  function randeazaAdrese(adrese) {
    if (!adrese.length) {
      listaAdrese.innerHTML = '<li class="cont-gol">Nu ai încă nicio adresă salvată. ' +
        'Adaugă una mai jos și o vom completa automat în coș.</li>';
      return;
    }
    listaAdrese.innerHTML = adrese.map(function (a) {
      return '<li class="cont-adresa">' +
        '<div>' +
          '<p class="cont-adresa-eticheta">' + esc(a.label) +
            (a.isDefault ? ' <span class="cont-implicita">implicită</span>' : '') + '</p>' +
          '<p class="cont-adresa-text">' + esc(a.street) +
            (a.city ? ', ' + esc(a.city) : '') + '</p>' +
          (a.details ? '<p class="cont-adresa-detalii">' + esc(a.details) + '</p>' : '') +
        '</div>' +
        '<button class="link-btn" type="button" data-sterge-adresa="' + a.id + '">Șterge</button>' +
      '</li>';
    }).join("");
  }

  function incarcaAdrese() {
    cerere("/api/account/adrese")
      .then(function (d) { randeazaAdrese(d.adrese || []); })
      .catch(function () {
        listaAdrese.innerHTML = '<li class="cont-gol">Adresele nu au putut fi încărcate.</li>';
      });
  }

  listaAdrese.addEventListener("click", function (e) {
    var btn = e.target.closest ? e.target.closest("[data-sterge-adresa]") : null;
    if (!btn) return;
    btn.disabled = true;
    cerere("/api/account/adrese/" + btn.getAttribute("data-sterge-adresa"), { method: "DELETE" })
      .then(incarcaAdrese)
      .catch(function (err) { btn.disabled = false; stare($("#adresa-status"), err.message, false); });
  });

  formAdresa.addEventListener("submit", function (e) {
    e.preventDefault();
    var status = $("#adresa-status");
    var strada = $("#adresa-strada").value.trim();
    if (!strada) { stare(status, "Completează strada și numărul.", false); return; }
    blocheaza(formAdresa, true);
    stare(status, "Se salvează…");
    cerere("/api/account/adrese", {
      method: "POST",
      corp: {
        strada: strada,
        localitate: $("#adresa-localitate").value.trim(),
        eticheta: $("#adresa-eticheta").value.trim(),
        detalii: $("#adresa-detalii").value.trim()
      }
    }).then(function () {
      formAdresa.reset();
      stare(status, "Adresa a fost salvată și va fi folosită implicit la comenzi.", true);
      incarcaAdrese();
    }).catch(function (err) {
      stare(status, err.message, false);
    }).then(function () { blocheaza(formAdresa, false); });
  });

  /* --- istoricul comenzilor ------------------------------------------------ */
  function randeazaComenzi(comenzi) {
    if (!comenzi.length) {
      zonaComenzi.innerHTML = '<p class="cont-gol">Nu ai încă nicio comandă înregistrată. ' +
        'Comenzile trimise din coșul site-ului apar aici.</p>';
      return;
    }
    zonaComenzi.innerHTML = comenzi.map(function (c) {
      var produse = (c.produse || []).map(function (p) {
        var ambalaj = Number(p.ambalaj) > 0 ? Number(p.ambalaj) * p.cant : 0;
        return '<li><span>' + p.cant + ' × ' + esc(p.nume) +
          (p.marime ? ' <em>(' + esc(p.marime) + ')</em>' : '') +
          (ambalaj ? ' <em>+ ambalaj ' + esc(lei(ambalaj)) + '</em>' : '') + '</span>' +
          '<b>' + esc(lei(p.pret * p.cant)) + '</b></li>';
      }).join("");
      return '<article class="cont-comanda">' +
        '<header class="cont-comanda-cap">' +
          '<div>' +
            '<p class="cont-comanda-nr">Comanda #' + esc(c.numar || String(c.id)) + '</p>' +
            '<p class="cont-comanda-data">' + esc(dataRo(c.data)) + '</p>' +
          '</div>' +
          '<span class="cont-status cont-status--' + esc(c.status) + '">' +
            esc(STATUSURI[c.status] || c.status) + '</span>' +
        '</header>' +
        '<ul class="cont-comanda-linii">' + produse +
          (Number(c.ambalaj) > 0
            ? '<li class="cont-comanda-ambalaj"><span>Ambalaj</span><b>' + esc(lei(c.ambalaj)) + '</b></li>'
            : '') +
        '</ul>' +
        '<footer class="cont-comanda-jos">' +
          '<span>' + (c.modalitate === "livrare"
            ? 'Livrare · ' + esc(c.adresa || "adresă nespecificată")
            : 'Ridicare personală') + '</span>' +
          '<b>' + esc(lei(c.total)) + '</b>' +
        '</footer>' +
        (c.observatii ? '<p class="cont-comanda-obs">Observații: ' + esc(c.observatii) + '</p>' : '') +
      '</article>';
    }).join("");
  }

  function incarcaComenzi() {
    zonaComenzi.innerHTML = '<p class="cont-gol">Se încarcă comenzile…</p>';
    cerere("/api/account/comenzi")
      .then(function (d) { randeazaComenzi(d.comenzi || []); })
      .catch(function () {
        zonaComenzi.innerHTML = '<p class="cont-gol">Comenzile nu au putut fi încărcate. Reîncarcă pagina.</p>';
      });
  }

  /* --- datele personale ---------------------------------------------------- */
  formProfil.addEventListener("submit", function (e) {
    e.preventDefault();
    var status = $("#profil-status");
    blocheaza(formProfil, true);
    stare(status, "Se salvează…");
    cerere("/api/account/profil", {
      method: "PUT",
      corp: { nume: $("#profil-nume").value.trim(), telefon: $("#profil-telefon").value.trim() }
    }).then(function (d) {
      stare(status, "Datele au fost actualizate.", true);
      if (d.client) $("#cont-salut").textContent = d.client.nume ? "Bună, " + d.client.nume + "!" : "Contul tău";
    }).catch(function (err) {
      stare(status, err.message, false);
    }).then(function () { blocheaza(formProfil, false); });
  });

  /* --- autentificare, înregistrare, deconectare ---------------------------- */
  function dupaAutentificare(client) {
    /* coșul din browser urcă în cont, apoi pagina afișează zona clientului */
    var local = [];
    try {
      var brut = localStorage.getItem("olizan_cos_v1");
      var d = brut ? JSON.parse(brut) : null;
      if (d && Array.isArray(d.linii)) local = d.linii;
    } catch (e) { local = []; }
    var gata = local.length
      ? cerere("/api/account/cos", { method: "PUT", corp: { cos: local } }).catch(function () {})
      : Promise.resolve();
    gata.then(function () { arata(client); });
  }

  formLogin.addEventListener("submit", function (e) {
    e.preventDefault();
    var status = $("#login-status");
    blocheaza(formLogin, true);
    stare(status, "Se verifică datele…");
    cerere("/api/auth/login", {
      method: "POST",
      corp: { email: $("#login-email").value.trim(), parola: $("#login-parola").value }
    }).then(function (d) {
      stare(status, "");
      formLogin.reset();
      dupaAutentificare(d.client);
    }).catch(function (err) {
      stare(status, err.message, false);
    }).then(function () { blocheaza(formLogin, false); });
  });

  formInregistrare.addEventListener("submit", function (e) {
    e.preventDefault();
    var status = $("#reg-status");
    blocheaza(formInregistrare, true);
    stare(status, "Se creează contul…");
    cerere("/api/auth/register", {
      method: "POST",
      corp: {
        nume: $("#reg-nume").value.trim(),
        email: $("#reg-email").value.trim(),
        telefon: $("#reg-telefon").value.trim(),
        parola: $("#reg-parola").value
      }
    }).then(function (d) {
      stare(status, "");
      formInregistrare.reset();
      dupaAutentificare(d.client);
    }).catch(function (err) {
      stare(status, err.message, false);
    }).then(function () { blocheaza(formInregistrare, false); });
  });

  $("#btn-logout").addEventListener("click", function () {
    cerere("/api/auth/logout", { method: "POST" }).then(function () {
      window.location.reload();
    }).catch(function () { window.location.reload(); });
  });

  /* --- starea inițială ----------------------------------------------------- */
  cerere("/api/auth/me")
    .then(function (d) { arata(d.autentificat ? d.client : null); })
    .catch(function () { arata(null); });
})();
