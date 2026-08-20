/* ==========================================================================
   OLIZAN — autentificarea în panoul de administrare
   Trimite datele către /api/admin/login. Sesiunea revine ca un cookie
   HttpOnly, separat de cookie-ul clienților, deci scriptul nu vede jetonul.
   ========================================================================== */
(function () {
  "use strict";

  var form = document.getElementById("form-admin-login");
  var stare = document.getElementById("admin-login-stare");
  var buton = form.querySelector("button[type=submit]");

  function arata(mesaj, ok) {
    stare.textContent = mesaj || "";
    stare.classList.toggle("is-visible", !!mesaj);
    stare.classList.toggle("is-ok", !!mesaj && ok === true);
    stare.classList.toggle("is-err", !!mesaj && ok === false);
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var utilizator = document.getElementById("admin-utilizator").value.trim();
    var parola = document.getElementById("admin-parola").value;
    if (!utilizator || !parola) { arata("Completează utilizatorul și parola.", false); return; }

    buton.disabled = true;
    arata("Se verifică datele…");

    fetch("/api/admin/login", {
      method: "POST",
      credentials: "same-origin",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({ utilizator: utilizator, parola: parola })
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (d) {
        if (!r.ok) throw new Error(d.eroare || "Autentificarea nu a reușit.");
        return d;
      });
    }).then(function () {
      arata("Autentificare reușită. Se deschide panoul…", true);
      window.location.href = "/admin/";
    }).catch(function (err) {
      buton.disabled = false;
      document.getElementById("admin-parola").value = "";
      arata(err.message, false);
    });
  });
})();
