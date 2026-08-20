// Tabla de comenzi din panou (kanban) si istoricul comenzilor finalizate.
//
// Coloana de pe tabla se tine in `orders.board_status` si este complet separata
// de `orders.status`, folosit de lista clasica de comenzi: mutarea unei fise pe
// tabla nu schimba nimic in vechea lista si invers.
//
// Ceasul celor 10 minute nu se calculeaza aici: serverul trimite doar momentul
// ultimei mutari (`miscat`), iar pagina numara singura, din secunda in secunda,
// asa ca o fisa se inroseste fara nicio reincarcare.
import { and, desc, eq, inArray, ne, or, sql } from "drizzle-orm";
import { db } from "../../db/index.js";
import { orderItems, orders } from "../../db/schema.js";
import { numarAfisat, ziuaCurenta } from "./comenzi.mjs";

/** Coloanele tablei, in ordinea in care se parcurg. */
export const COLOANE = ["noua", "pregatire", "gata", "finalizata"] as const;
export type Coloana = (typeof COLOANE)[number];

export function esteColoana(v: unknown): v is Coloana {
  return typeof v === "string" && (COLOANE as readonly string[]).includes(v);
}

/** Cate comenzi finalizate se aduc in istoric intr-o singura citire. */
const LIMITA_ISTORIC = 400;

type RandComanda = typeof orders.$inferSelect;

/** Liniile comenzilor cerute, grupate pe comanda. */
async function liniiPentru(ids: number[]) {
  const grupate = new Map<number, { nume: string; marime: string; pret: number; ambalaj: number; cant: number }[]>();
  if (!ids.length) return grupate;
  const linii = await db.select().from(orderItems).where(inArray(orderItems.orderId, ids));
  for (const l of linii) {
    if (!grupate.has(l.orderId)) grupate.set(l.orderId, []);
    grupate.get(l.orderId)!.push({
      nume: l.productName,
      marime: l.size,
      pret: Number(l.unitPrice),
      ambalaj: Number(l.packagingUnit),
      cant: l.quantity,
    });
  }
  return grupate;
}

/** Fisa asa cum o primeste panoul. */
function fisa(c: RandComanda, produse: unknown[]) {
  return {
    id: c.id,
    numar: numarAfisat(c.dailyNumber),
    // ziua de lucru: cea alocata la comanda, altfel ziua calendaristica a primirii
    zi: c.orderDay || ziuaCurenta(c.createdAt),
    data: c.createdAt,
    miscat: c.boardMovedAt,
    coloana: c.boardStatus,
    nume: c.name,
    telefon: c.phone,
    modalitate: c.fulfilment,
    adresa: c.address,
    observatii: c.notes,
    ambalaj: Number(c.packaging),
    total: Number(c.total),
    produse,
  };
}

async function fiseDin(lista: RandComanda[]) {
  const produse = await liniiPentru(lista.map((c) => c.id));
  return lista.map((c) => fisa(c, produse.get(c.id) || []));
}

/**
 * Comenzile de pe tabla: tot ce nu este inca finalizat, plus comenzile
 * finalizate chiar in ziua de lucru curenta. Asa coloana „Finalizate" arata
 * munca de azi, iar restul ramane doar in istoric — tabla nu se aglomereaza.
 */
export async function comenziBord() {
  const zi = ziuaCurenta();
  const lista = await db
    .select()
    .from(orders)
    .where(
      and(
        eq(orders.boardHidden, false),
        or(
          ne(orders.boardStatus, "finalizata"),
          // ziua se citeste dupa ora Romaniei, direct in Postgres, ca sa fie
          // aceeasi zi de lucru ca cea din numerotarea comenzilor
          sql`(${orders.boardMovedAt} AT TIME ZONE 'Europe/Bucharest')::date = ${zi}::date`,
        ),
      ),
    )
    .orderBy(desc(orders.createdAt))
    .limit(300);
  return fiseDin(lista);
}

/** Istoricul: toate comenzile finalizate, cele mai recente primele. */
export async function istoricComenzi() {
  const lista = await db
    .select()
    .from(orders)
    .where(and(eq(orders.boardHidden, false), eq(orders.boardStatus, "finalizata")))
    .orderBy(desc(orders.boardMovedAt))
    .limit(LIMITA_ISTORIC);
  return fiseDin(lista);
}

/**
 * Muta o comanda in alta coloana. Momentul mutarii se rescrie de fiecare data,
 * deci cele 10 minute de asteptare repornesc la fiecare pas.
 */
export async function mutaComanda(id: number, coloana: Coloana): Promise<boolean> {
  const randuri = await db
    .update(orders)
    .set({ boardStatus: coloana, boardMovedAt: new Date() })
    .where(eq(orders.id, id))
    .returning({ id: orders.id });
  return randuri.length > 0;
}

/**
 * Scoate o comanda din istoric. Fisa ramane in baza de date (lista clasica de
 * comenzi si istoricul contului clientului nu se ating), dar nu mai apare nici
 * pe tabla, nici in istoricul panoului.
 */
export async function ascundeComanda(id: number): Promise<boolean> {
  const randuri = await db
    .update(orders)
    .set({ boardHidden: true })
    .where(eq(orders.id, id))
    .returning({ id: orders.id });
  return randuri.length > 0;
}
