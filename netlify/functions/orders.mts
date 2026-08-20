// Inregistrarea comenzilor. Functioneaza si pentru vizitatorii neautentificati,
// iar daca vizitatorul are cont, comanda se leaga automat de contul lui.
// Preturile se recalculeaza intotdeauna din baza de date, niciodata din
// datele trimise de browser — la fel si taxa de ambalaj, care se ia din
// netlify/lib/ambalaj.mts dupa categoria si marimea produsului. Fiecare
// comanda primeste si un numar de ordine pe ziua respectiva (01, 02, 03...),
// folosit in mesajul WhatsApp si in panou.
//
// Toate sumele se aduna in bani (numere intregi), niciodata in lei cu zecimale:
// asa totalul inregistrat este exact suma liniilor, fara marja de eroare, si
// coincide cu totalul aratat in cos si trimis pe WhatsApp.
import type { Config } from "@netlify/functions";
import { eq, inArray } from "drizzle-orm";
import { db } from "../../db/index.js";
import { addresses, menuItems, orderItems, orders } from "../../db/schema.js";
import { taxaAmbalajBani } from "../lib/ambalaj.mjs";
import { clientDinCerere } from "../lib/auth.mjs";
import { numarAfisat, rezervaNumarZilnic } from "../lib/comenzi.mjs";
import { asiguraMeniu } from "../lib/menu.mjs";
import { corpJson, eroare, json, origineValida, text } from "../lib/http.mjs";
import { stareComenzi } from "../lib/stare.mjs";

const MARIMI: Record<string, { camp: "price" | "priceLarge"; scurt: string }> = {
  "33": { camp: "price", scurt: "33 cm" },
  "50": { camp: "priceLarge", scurt: "50 cm" },
};

/** Pretul din baza de date (text zecimal, ex. "35.00") citit exact, in bani. */
function baniDinNumeric(v: string | null): number | null {
  if (v === null || v === undefined) return null;
  const potrivire = /^\s*(-?)(\d*)(?:[.,](\d*))?\s*$/.exec(String(v));
  if (!potrivire || (!potrivire[2] && !potrivire[3])) return null;
  const zecimale = (potrivire[3] || "").padEnd(2, "0").slice(0, 2);
  const suma = Number(potrivire[2] || "0") * 100 + Number(zecimale);
  if (!Number.isFinite(suma)) return null;
  return potrivire[1] === "-" ? -suma : suma;
}

/** Bani → textul cu doua zecimale pe care il asteapta coloanele numeric. */
function textDinBani(b: number): string {
  const semn = b < 0 ? "-" : "";
  const v = Math.abs(Math.round(b));
  return semn + Math.floor(v / 100) + "." + String(v % 100).padStart(2, "0");
}

/** Bani → lei, pentru raspunsul trimis paginii. */
function lei(b: number): number {
  return Number(textDinBani(b));
}

export default async (req: Request) => {
  if (req.method !== "POST") return eroare("Metodă neacceptată.", 405);
  if (!origineValida(req)) return eroare("Cerere respinsă.", 403);

  /* Cat timp restaurantul nu preia comenzi, cererea se opreste inainte de
     orice altceva. Pagina blocheaza deja cosul, dar oprirea reala este aici:
     o fila lasata deschisa dinainte nu poate strecura o comanda. */
  const stare = await stareComenzi();
  if (stare.blocat) {
    return json({ eroare: stare.mesaj, blocat: true, stare: stare.cod, titlu: stare.titlu }, { status: 403 });
  }

  const corp = await corpJson<Record<string, unknown>>(req);
  if (!corp) return eroare("Datele trimise nu sunt valide.");

  const linii = Array.isArray(corp.linii) ? corp.linii.slice(0, 60) : [];
  if (!linii.length) return eroare("Comanda nu conține niciun produs.");

  const nume = text(corp.nume, 120);
  const telefon = text(corp.telefon, 40);
  const modalitate = corp.modalitate === "livrare" ? "livrare" : "ridicare";
  const adresa = text(corp.adresa, 240);
  const observatii = text(corp.observatii, 500);

  if (!nume) return eroare("Completează numele.");
  if (telefon.replace(/[^0-9]/g, "").length < 9) return eroare("Numărul de telefon pare incomplet.");
  if (modalitate === "livrare" && !adresa) return eroare("Completează adresa de livrare.");

  const client = await clientDinCerere(req);

  await asiguraMeniu();
  const ids = [...new Set(linii.map((l: Record<string, unknown>) => text(l.id, 80)).filter(Boolean))];
  if (!ids.length) return eroare("Comanda nu conține niciun produs valid.");
  const produse = await db.select().from(menuItems).where(inArray(menuItems.id, ids));
  const dupaId = new Map(produse.map((p) => [p.id, p]));

  const deSalvat: {
    productId: string;
    productName: string;
    size: string;
    unitPrice: string;
    packagingUnit: string;
    quantity: number;
  }[] = [];
  let produseTotal = 0;
  let ambalajTotal = 0;

  for (const brut of linii as Record<string, unknown>[]) {
    const produs = dupaId.get(text(brut.id, 80));
    if (!produs || !produs.active) continue;
    const cant = Math.max(1, Math.min(99, Number(brut.cant) || 1));
    const codMarime = text(brut.marime, 10);
    let pret: number | null = null;
    let etichetaMarime = "";
    let marimeAmbalaj = "";
    if (produs.withSizes) {
      const marime = MARIMI[codMarime];
      if (!marime) continue;
      pret = baniDinNumeric(marime.camp === "price" ? produs.price : produs.priceLarge);
      etichetaMarime = marime.scurt;
      marimeAmbalaj = codMarime;
    } else {
      pret = baniDinNumeric(produs.price);
      etichetaMarime = produs.weight || "";
    }
    if (pret === null || !Number.isFinite(pret) || pret <= 0) continue;
    const ambalaj = taxaAmbalajBani(produs.categoryId, produs.id, marimeAmbalaj);
    produseTotal += pret * cant;
    ambalajTotal += ambalaj * cant;
    deSalvat.push({
      productId: produs.id,
      productName: (produs.groupPrefix || "") + produs.name,
      size: etichetaMarime,
      unitPrice: textDinBani(pret),
      packagingUnit: textDinBani(ambalaj),
      quantity: cant,
    });
  }

  if (!deSalvat.length) return eroare("Produsele din coș nu mai sunt disponibile. Reîncarcă pagina de meniu.", 409);
  const total = produseTotal + ambalajTotal;

  /* Numarul zilei se rezerva abia acum, dupa ce comanda s-a dovedit valida,
     ca sa nu se consume numere pe cereri respinse. */
  const numerotare = await rezervaNumarZilnic();

  const [comanda] = await db
    .insert(orders)
    .values({
      customerId: client ? client.id : null,
      name: nume,
      phone: telefon,
      email: client ? client.email : "",
      fulfilment: modalitate,
      address: modalitate === "livrare" ? adresa : "",
      notes: observatii,
      packaging: textDinBani(ambalajTotal),
      total: textDinBani(total),
      orderDay: numerotare ? numerotare.zi : null,
      dailyNumber: numerotare ? numerotare.numar : null,
    })
    .returning({ id: orders.id, createdAt: orders.createdAt });

  await db.insert(orderItems).values(deSalvat.map((l) => ({ ...l, orderId: comanda.id })));

  /* Optional: clientul poate cere salvarea adresei pentru comenzile viitoare */
  if (client && corp.salveazaAdresa === true && modalitate === "livrare" && adresa) {
    await db.update(addresses).set({ isDefault: false }).where(eq(addresses.customerId, client.id));
    await db.insert(addresses).values({
      customerId: client.id,
      label: "Adresă de livrare",
      street: adresa,
      isDefault: true,
    });
  }

  return json(
    {
      ok: true,
      comanda: {
        id: comanda.id,
        numar: numerotare ? numarAfisat(numerotare.numar) : null,
        zi: numerotare ? numerotare.zi : null,
        produse: lei(produseTotal),
        ambalaj: lei(ambalajTotal),
        total: lei(total),
        data: comanda.createdAt,
      },
    },
    { status: 201 },
  );
};

export const config: Config = {
  path: "/api/orders",
};
