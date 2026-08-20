/* Marchează service workerul cu identificatorul publicării curente.
   Rulează la fiecare deploy, înainte de publicare (vezi netlify.toml).

   De ce este nevoie: browserul instalează o versiune nouă de service worker
   doar dacă fișierul /sw.js s-a schimbat față de cel salvat. Scriind aici
   identificatorul publicării, fișierul diferă la fiecare deploy, deci copiile
   locale vechi sunt șterse automat și vizitatorii primesc mereu varianta
   nouă a site-ului.

   Scriptul nu poate opri publicarea: orice problemă este raportată în jurnal,
   iar procesul se încheie cu succes. În cel mai rău caz, service workerul
   rămâne cu versiunea anterioară, iar site-ul funcționează normal. */

import { readFile, writeFile } from "node:fs/promises";

const FISIER = new URL("../sw.js", import.meta.url);
const TIPAR = /const VERSIUNE = "[^"]*";/;

function versiunePublicare() {
  const sursa =
    process.env.DEPLOY_ID ||
    process.env.COMMIT_REF ||
    process.env.BUILD_ID ||
    String(Date.now());
  /* Doar caractere sigure pentru un nume de cache. */
  return sursa.replace(/[^a-zA-Z0-9._-]/g, "").slice(0, 20) || String(Date.now());
}

try {
  const continut = await readFile(FISIER, "utf8");

  if (!TIPAR.test(continut)) {
    console.warn("[pwa] Nu am găsit linia de versiune în sw.js; îl las neschimbat.");
  } else {
    const versiune = versiunePublicare();
    await writeFile(FISIER, continut.replace(TIPAR, `const VERSIUNE = "${versiune}";`));
    console.log(`[pwa] Service worker marcat cu versiunea „${versiune}".`);
  }
} catch (eroare) {
  console.warn("[pwa] Marcarea versiunii nu a reușit:", eroare && eroare.message);
}
