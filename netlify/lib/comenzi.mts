// Numarul zilnic al comenzilor: 1, 2, 3... reluat de la 1 in fiecare zi noua.
// Ziua se socoteste dupa ora Romaniei, nu dupa UTC, ca sa se schimbe exact la
// miezul noptii pentru restaurant. Nu exista nicio sarcina programata care sa
// „reseteze" ceva: contorul are un rand pe zi, iar ziua urmatoare porneste de
// la un rand nou, gol.
import { sql } from "drizzle-orm";
import { db } from "../../db/index.js";
import { orderCounters } from "../../db/schema.js";

const FUS_ORAR = "Europe/Bucharest";

const formatZi = new Intl.DateTimeFormat("en-CA", {
  timeZone: FUS_ORAR,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Ziua de lucru curenta, in forma "2026-08-11" (ora Romaniei). */
export function ziuaCurenta(acum: Date = new Date()): string {
  const parti = Object.fromEntries(
    formatZi.formatToParts(acum).map((p) => [p.type, p.value]),
  ) as Record<string, string>;
  return `${parti.year}-${parti.month}-${parti.day}`;
}

/** "3" -> "03". Peste 99 de comenzi pe zi numarul ramane needit: "103". */
export function numarAfisat(numar: number | null): string | null {
  if (!numar || !Number.isFinite(numar)) return null;
  return numar < 10 ? `0${numar}` : String(numar);
}

/**
 * Rezerva urmatorul numar din ziua curenta.
 * Incrementarea se face intr-o singura instructiune SQL, deci Postgres tine
 * randul blocat pana la final: doua comenzi trimise in aceeasi secunda primesc
 * numere diferite, fara sa fie nevoie de o tranzactie separata.
 */
export async function rezervaNumarZilnic(): Promise<{ zi: string; numar: number } | null> {
  const zi = ziuaCurenta();
  try {
    const [rand] = await db
      .insert(orderCounters)
      .values({ day: zi, lastNumber: 1 })
      .onConflictDoUpdate({
        target: orderCounters.day,
        set: {
          lastNumber: sql`${orderCounters.lastNumber} + 1`,
          updatedAt: sql`now()`,
        },
      })
      .returning({ numar: orderCounters.lastNumber });
    if (!rand || !rand.numar) return null;
    return { zi, numar: rand.numar };
  } catch {
    // O comanda fara numar este preferabila unei comenzi pierdute.
    return null;
  }
}
