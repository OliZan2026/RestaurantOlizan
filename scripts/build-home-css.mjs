import { readFile, writeFile } from "node:fs/promises";

const surse = [
  "assets/css/fonts.css",
  "assets/css/style.css",
  "assets/css/home-luxury.css",
];

const continut = (await Promise.all(surse.map((fisier) => readFile(fisier, "utf8")))).join("\n");

// Homepage-ul primește o singură cerere CSS, compactată. Ordinea surselor
// rămâne identică celei din HTML, deci aspectul și suprascrierile nu se schimbă.
const compact = continut
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/\s+/g, " ")
  .replace(/\s*([{}:;,>])\s*/g, "$1")
  .trim();

await writeFile("assets/css/home-bundle.min.css", `${compact}\n`, "utf8");
console.log(`[home-css] ${surse.length} fișiere reunite în ${compact.length} octeți.`);
