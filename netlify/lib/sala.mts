// Inchirierea salii de evenimente — partea comuna site-ului public si
// panoului de administrare.
//
// Trei lucruri se administreaza din panou si se citesc de aici:
//   1. textul de prezentare a salii  -> un rand in `site_settings`;
//   2. cele patru fotografii ale salii -> `site_images`, zona "sala";
//   3. zilele deja ocupate            -> tabelul `hall_dates`.
//
// Zilele libere nu se scriu nicaieri: absenta randului inseamna „liber", deci
// calendarul public arata implicit toata luna ca disponibila.
import { asc, eq, gte } from "drizzle-orm";
import { db } from "../../db/index.js";
import { hallDates, siteImages, siteSettings } from "../../db/schema.js";
import { ziuaCurenta } from "./comenzi.mjs";

export const CHEIE_DESCRIERE = "sala_descriere";

/** Zona din `site_images` rezervata fotografiilor salii. */
export const SLOT_SALA = "sala";

/** Exact patru fotografii, cu chei fixe: incarcarea uneia noi o inlocuieste. */
export const CHEI_SALA = ["sala-1", "sala-2", "sala-3", "sala-4"] as const;

/** Textul afisat cat timp administratorul nu a scris altul din panou. */
export const DESCRIERE_IMPLICITA =
  "Sala noastră dispune de 130 mp și poate găzdui până la 80 de persoane. " +
  "Organizăm botezuri, aniversări, cine festive și evenimente de familie, iar la cerere " +
  "ne ocupăm și de meniul evenimentului. Pentru detalii, disponibilitate și ofertă de preț " +
  "ne puteți suna la +40 720 409 320.";

export function esteCheieSala(v: string): boolean {
  return (CHEI_SALA as readonly string[]).includes(v);
}

/** Ziua trimisa din formular sau din panou, in forma „2026-09-14". */
export function ziValida(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const zi = v.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(zi)) return null;
  const d = new Date(`${zi}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return null;
  // respinge zilele inexistente (ex. 31 februarie), pe care Date le-ar rostogoli
  return d.toISOString().slice(0, 10) === zi ? zi : null;
}

/** Textul de prezentare. Orice problema de citire lasa textul implicit. */
export async function descriereSala(): Promise<string> {
  try {
    const randuri = await db
      .select({ value: siteSettings.value })
      .from(siteSettings)
      .where(eq(siteSettings.key, CHEIE_DESCRIERE))
      .limit(1);
    const salvat = (randuri[0]?.value || "").trim();
    return salvat || DESCRIERE_IMPLICITA;
  } catch (e) {
    console.error("Nu am putut citi descrierea sălii:", e);
    return DESCRIERE_IMPLICITA;
  }
}

/** Salveaza textul scris in panou. Textul gol readuce varianta implicita. */
export async function seteazaDescriereSala(text: string): Promise<string> {
  const valoare = text.trim();
  await db
    .insert(siteSettings)
    .values({ key: CHEIE_DESCRIERE, value: valoare })
    .onConflictDoUpdate({
      target: siteSettings.key,
      set: { value: valoare, updatedAt: new Date() },
    });
  return valoare || DESCRIERE_IMPLICITA;
}

/** Cele patru fotografii, in ordinea cheilor, doar cele incarcate. */
export async function imaginiSala() {
  const randuri = await db
    .select()
    .from(siteImages)
    .where(eq(siteImages.slot, SLOT_SALA))
    .orderBy(asc(siteImages.slotKey));
  return CHEI_SALA.map((cheie) => {
    const img = randuri.find((i) => i.slotKey === cheie);
    if (!img) return null;
    return {
      cheie,
      src: `/media/${img.blobKey}?v=${img.version}`,
      alt: img.alt || "Sala de evenimente OLIZAN Restaurant & Pizzeria",
      titlu: img.caption || "",
    };
  }).filter((i): i is NonNullable<typeof i> => i !== null);
}

/**
 * Zilele ocupate. Pentru site trimitem doar zilele de azi inainte — trecutul
 * nu mai poate fi rezervat oricum — iar pentru panou se cer si zilele vechi,
 * ca administratorul sa poata rasfoi lunile trecute.
 */
export async function zileOcupate(doarViitoare = true) {
  const conditie = doarViitoare ? gte(hallDates.day, ziuaCurenta()) : undefined;
  const randuri = await db
    .select()
    .from(hallDates)
    .where(conditie)
    .orderBy(asc(hallDates.day));
  return randuri.map((r) => ({ zi: r.day, nota: r.note }));
}

/**
 * Marcheaza sau elibereaza o zi. „Ocupat" inseamna un rand in tabel, „liber"
 * inseamna lipsa lui, deci eliberarea sterge si nota ramasa de la eveniment.
 */
export async function seteazaZi(zi: string, ocupat: boolean, nota = ""): Promise<void> {
  if (!ocupat) {
    await db.delete(hallDates).where(eq(hallDates.day, zi));
    return;
  }
  await db
    .insert(hallDates)
    .values({ day: zi, note: nota })
    .onConflictDoUpdate({
      target: hallDates.day,
      set: { note: nota, updatedAt: new Date() },
    });
}

/** Forma trimisa paginilor publice: fara notele interne ale administratorului. */
export async function salaPublica() {
  const [descriere, imagini, ocupate] = await Promise.all([
    descriereSala(),
    imaginiSala(),
    zileOcupate(true),
  ]);
  return {
    descriere,
    imagini,
    // doar zilele, fara note: notele sunt evidenta interna a restaurantului
    ocupate: ocupate.map((z) => z.zi),
    azi: ziuaCurenta(),
  };
}

/** Ajutor pentru panou: perechea zi + nota, gata de afisat in calendar. */
export async function salaAdmin() {
  const [descriere, imagini, zile] = await Promise.all([
    descriereSala(),
    imaginiSala(),
    zileOcupate(false),
  ]);
  return { descriere, descriereImplicita: DESCRIERE_IMPLICITA, imagini, zile, azi: ziuaCurenta() };
}
