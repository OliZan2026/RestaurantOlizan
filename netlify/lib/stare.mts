// Starea preluarii comenzilor, comuna site-ului public si panoului de
// administrare. Exista trei stari, iar textele afisate clientilor se scriu
// o singura data, aici, ca sa fie identice peste tot (banner, carduri, cos).
import { eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { siteSettings } from "../../db/schema.js";

export const CHEIE_STARE = "stare_comenzi";

export type CodStare = "deschis" | "pauza" | "concediu";

export type Stare = {
  cod: CodStare;
  /** Eticheta scurta din panoul de administrare. */
  eticheta: string;
  /** Explicatia pentru administrator: ce se intampla pe site in starea asta. */
  explicatie: string;
  /** Titlul afisat clientilor (banner, buton de comanda inlocuit). */
  titlu: string;
  /** Textul lung afisat clientilor. Gol pentru starea „deschis". */
  mesaj: string;
  /** Cat timp este adevarat, comenzile nu pot fi trimise. */
  blocat: boolean;
};

export const STARI: Record<CodStare, Stare> = {
  deschis: {
    cod: "deschis",
    eticheta: "Deschis",
    explicatie: "Site-ul functioneaza normal: clientii pot adauga produse in cos si pot trimite comenzi.",
    titlu: "Preluăm comenzi ca de obicei",
    mesaj: "",
    blocat: false,
  },
  pauza: {
    cod: "pauza",
    eticheta: "Nu preluăm comenzi momentan",
    explicatie: "Cosul si trimiterea comenzilor sunt oprite, iar clientii vad mesajul pe toate paginile.",
    titlu: "Nu preluăm comenzi momentan",
    mesaj:
      "Ne pare rău, momentan nu preluăm comenzi online. Reveniți puțin mai târziu — " +
      "începem din nou să primim comenzi cât de curând. Ne puteți scrie oricând pe WhatsApp " +
      "sau ne puteți suna pentru orice întrebare.",
    blocat: true,
  },
  concediu: {
    cod: "concediu",
    eticheta: "Suntem în concediu",
    explicatie: "La fel ca mai sus, dar mesajul anunta o inchidere mai lunga, de concediu.",
    titlu: "Suntem în concediu",
    mesaj:
      "Restaurantul este închis pentru o perioadă mai lungă, fiind în concediu, așa că nu " +
      "preluăm comenzi în acest interval. Vă mulțumim pentru înțelegere și vă așteptăm cu " +
      "drag la redeschidere. Pentru întrebări ne puteți scrie pe WhatsApp.",
    blocat: true,
  },
};

/** Starea folosita cand in baza de date nu s-a salvat inca nimic. */
export const STARE_IMPLICITA: CodStare = "deschis";

export function esteCodStare(v: unknown): v is CodStare {
  return typeof v === "string" && Object.prototype.hasOwnProperty.call(STARI, v);
}

/**
 * Starea curenta. Orice problema de citire lasa site-ul deschis: mai bine o
 * comanda in plus decat un site care refuza comenzile fara ca cineva sa fi cerut-o.
 */
export async function stareComenzi(): Promise<Stare> {
  try {
    const randuri = await db
      .select({ value: siteSettings.value })
      .from(siteSettings)
      .where(eq(siteSettings.key, CHEIE_STARE))
      .limit(1);
    const cod = randuri[0]?.value;
    return esteCodStare(cod) ? STARI[cod] : STARI[STARE_IMPLICITA];
  } catch (e) {
    console.error("Nu am putut citi starea comenzilor:", e);
    return STARI[STARE_IMPLICITA];
  }
}

/** Salveaza starea aleasa din panou si o returneaza in forma completa. */
export async function seteazaStareComenzi(cod: CodStare): Promise<Stare> {
  await db
    .insert(siteSettings)
    .values({ key: CHEIE_STARE, value: cod })
    .onConflictDoUpdate({
      target: siteSettings.key,
      set: { value: cod, updatedAt: new Date() },
    });
  return STARI[cod];
}

/** Forma trimisa in paginile publice — fara textele destinate panoului. */
export function starePublica(stare: Stare) {
  return { stare: stare.cod, titlu: stare.titlu, mesaj: stare.mesaj, blocat: stare.blocat };
}
