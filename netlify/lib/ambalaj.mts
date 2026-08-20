// Costul ambalajului, calculat pe server.
//
// Aceleasi sume sunt scrise si in data/menu.js (blocul `ambalaje`), de unde le
// foloseste pagina ca sa afiseze taxa pe carduri si in cos. Aici este insa
// varianta care conteaza: browserul nu trimite niciodata sume, iar comanda
// inregistrata se calculeaza exclusiv din tabelul de mai jos.
// Daca schimbi un pret aici, schimba-l si in data/menu.js.
//
// Sumele se scriu in lei, ca in meniu, dar functia le da mai departe in bani
// (numere intregi): asa adunarile din comanda raman exacte, fara rotunjiri.

export const AMBALAJ_ETICHETA = "Ambalaj";

/** Taxa pe categorie: fie un numar, fie sumele pe mărimile de pizza. */
const CATEGORII: Record<string, number | Record<string, number>> = {
  pizza: { "33": 3, "50": 5 },
  burgeri: 3,
  paste: 2,
  deserturi: 2,
  sosuri: 1,
};

/** Taxa pentru un singur produs; are prioritate fata de categorie. */
const PRODUSE: Record<string, number> = {
  "sos-de-ciuperci": 1,
};

/** Lei (din tabelele de mai sus) → bani. Valorile lipsa inseamna „fara taxa". */
function valoare(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) : 0;
}

/**
 * Taxa de ambalaj, in bani, pentru o bucata din produsul dat. Produsele si
 * categoriile care nu apar in tabele nu primesc nicio taxa, deci raspunsul este 0.
 *
 * @param categorieId id-ul categoriei din meniu, ex. "burgeri"
 * @param produsId    id-ul produsului, ex. "sos-de-ciuperci"
 * @param codMarime   "33" / "50" pentru pizza, gol in rest
 */
export function taxaAmbalajBani(categorieId: string, produsId: string, codMarime = ""): number {
  if (produsId && Object.prototype.hasOwnProperty.call(PRODUSE, produsId)) {
    return valoare(PRODUSE[produsId]);
  }
  const regula = CATEGORII[categorieId];
  if (regula === undefined) return 0;
  if (typeof regula === "number") return valoare(regula);
  return valoare(regula[codMarime]);
}
