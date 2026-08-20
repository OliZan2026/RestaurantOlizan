// Zona de cont a clientului: date personale, adrese salvate, istoricul
// comenzilor si cosul legat de cont.
import type { Config, Context } from "@netlify/functions";
import { and, desc, eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { addresses, carts, customers, orderItems, orders } from "../../db/schema.js";
import { clientDinCerere } from "../lib/auth.mjs";
import { numarAfisat } from "../lib/comenzi.mjs";
import { corpJson, eroare, json, origineValida, text } from "../lib/http.mjs";

type LinieCos = { id: string; marime: string; cant: number };

function curataCos(v: unknown): LinieCos[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((l) => l && typeof l === "object")
    .slice(0, 60)
    .map((l: Record<string, unknown>) => ({
      id: text(l.id, 80),
      marime: text(l.marime, 10),
      cant: Math.max(1, Math.min(99, Number(l.cant) || 1)),
    }))
    .filter((l) => !!l.id);
}

export default async (req: Request, context: Context) => {
  const client = await clientDinCerere(req);
  if (!client) return eroare("Trebuie să fii autentificat.", 401);

  const resursa = String(context.params.resursa || "");
  const id = context.params.id ? Number(context.params.id) : null;
  const modifica = req.method !== "GET" && req.method !== "HEAD";
  if (modifica && !origineValida(req)) return eroare("Cerere respinsă.", 403);

  /* ------------------------------------------------------------- PROFIL */
  if (resursa === "profil" && req.method === "PUT") {
    const corp = await corpJson<{ nume?: string; telefon?: string }>(req);
    if (!corp) return eroare("Datele trimise nu sunt valide.");
    const nume = text(corp.nume, 120) || client.name;
    const telefon = text(corp.telefon, 40);
    await db.update(customers).set({ name: nume, phone: telefon }).where(eq(customers.id, client.id));
    return json({ ok: true, client: { ...client, nume, telefon } });
  }

  /* ------------------------------------------------------------- ADRESE */
  if (resursa === "adrese") {
    if (req.method === "GET") {
      const lista = await db
        .select()
        .from(addresses)
        .where(eq(addresses.customerId, client.id))
        .orderBy(desc(addresses.isDefault), desc(addresses.id));
      return json({ adrese: lista });
    }

    if (req.method === "POST") {
      const corp = await corpJson<Record<string, unknown>>(req);
      if (!corp) return eroare("Datele trimise nu sunt valide.");
      const strada = text(corp.strada, 240);
      if (!strada) return eroare("Completează adresa de livrare.");
      const implicita = corp.implicita !== false;
      if (implicita) {
        await db.update(addresses).set({ isDefault: false }).where(eq(addresses.customerId, client.id));
      }
      const [adresa] = await db
        .insert(addresses)
        .values({
          customerId: client.id,
          label: text(corp.eticheta, 60) || "Acasă",
          street: strada,
          city: text(corp.localitate, 120),
          details: text(corp.detalii, 240),
          isDefault: implicita,
        })
        .returning();
      return json({ ok: true, adresa }, { status: 201 });
    }

    if (req.method === "DELETE" && id) {
      await db.delete(addresses).where(and(eq(addresses.id, id), eq(addresses.customerId, client.id)));
      return json({ ok: true });
    }
  }

  /* ----------------------------------------------------------- COMENZI */
  if (resursa === "comenzi" && req.method === "GET") {
    const lista = await db
      .select()
      .from(orders)
      .where(eq(orders.customerId, client.id))
      .orderBy(desc(orders.createdAt))
      .limit(50);
    const toate = lista.length
      ? await db
          .select()
          .from(orderItems)
          .innerJoin(orders, eq(orderItems.orderId, orders.id))
          .where(eq(orders.customerId, client.id))
      : [];
    const dupaComanda = new Map<number, unknown[]>();
    for (const rand of toate) {
      const linie = rand.order_items;
      if (!dupaComanda.has(linie.orderId)) dupaComanda.set(linie.orderId, []);
      dupaComanda.get(linie.orderId)!.push({
        nume: linie.productName,
        marime: linie.size,
        pret: Number(linie.unitPrice),
        ambalaj: Number(linie.packagingUnit),
        cant: linie.quantity,
      });
    }
    return json({
      comenzi: lista.map((c) => ({
        id: c.id,
        numar: numarAfisat(c.dailyNumber),
        data: c.createdAt,
        status: c.status,
        modalitate: c.fulfilment,
        adresa: c.address,
        observatii: c.notes,
        ambalaj: Number(c.packaging),
        total: Number(c.total),
        produse: dupaComanda.get(c.id) || [],
      })),
    });
  }

  /* --------------------------------------------------------------- COS */
  if (resursa === "cos") {
    if (req.method === "GET") {
      const randuri = await db.select().from(carts).where(eq(carts.customerId, client.id)).limit(1);
      return json({ cos: randuri[0] ? curataCos(randuri[0].items) : [] });
    }
    if (req.method === "PUT") {
      const corp = await corpJson<{ cos?: unknown }>(req);
      if (!corp) return eroare("Datele trimise nu sunt valide.");
      const linii = curataCos(corp.cos);
      await db
        .insert(carts)
        .values({ customerId: client.id, items: linii, updatedAt: new Date() })
        .onConflictDoUpdate({
          target: carts.customerId,
          set: { items: linii, updatedAt: new Date() },
        });
      return json({ ok: true, cos: linii });
    }
  }

  return eroare("Resursă necunoscută.", 404);
};

export const config: Config = {
  path: ["/api/account/:resursa", "/api/account/:resursa/:id"],
};
