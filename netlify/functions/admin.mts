// Panoul de administrare — o singura suprafata pentru toate rutele /api/admin/*.
//
// Zona este complet separata de conturile clientilor: alt tabel (`admins`),
// alt cookie de sesiune si nicio cale de inregistrare publica. Contul
// proprietarului vine din variabilele de mediu ADMIN_USERNAME si ADMIN_PASSWORD:
// se creeaza la prima autentificare si ramane reparabil din aceleasi variabile
// cat timp parola nu a fost schimbata din panou.
import type { Config, Context } from "@netlify/functions";
import { timingSafeEqual } from "node:crypto";
import { and, asc, desc, eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { admins, menuCategories, menuItems, orderItems, orders, siteImages } from "../../db/schema.js";
import {
  adminDinCerere,
  cookieSesiune,
  cookieSters,
  creeazaSesiune,
  esteBlocat,
  hashPassword,
  inchideSesiuni,
  inregistreazaEsec,
  reseteazaEsecuri,
  stergeSesiune,
  tokenDinCerere,
  verifyPassword,
  type AdminAutentificat,
} from "../lib/auth.mjs";
import { numarAfisat } from "../lib/comenzi.mjs";
import { ascundeComanda, comenziBord, esteColoana, istoricComenzi, mutaComanda } from "../lib/bord.mjs";
import {
  adaugaCookie,
  corpJson,
  eroare,
  json,
  numarSauNull,
  origineValida,
  parolaProblema,
  text,
} from "../lib/http.mjs";
import { asiguraMeniu } from "../lib/menu.mjs";
import { esteCodStare, seteazaStareComenzi, STARI, stareComenzi } from "../lib/stare.mjs";
import { cheieCurata, extensiePentru, MARIME_MAXIMA, stocareMedia, sufixUnic, TIPURI_ACCEPTATE } from "../lib/media.mjs";
import {
  esteCheieSala,
  salaAdmin,
  seteazaDescriereSala,
  seteazaZi,
  SLOT_SALA,
  ziValida,
  zileOcupate,
} from "../lib/sala.mjs";

/* ------------------------------------------------------------ AJUTOARE */

function egale(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/** Hash inexistent, folosit ca sa dureze la fel si cand utilizatorul nu exista. */
const HASH_FICTIV = "scrypt$16384$8$1$AAAAAAAAAAAAAAAAAAAAAA==$AAAA";

type CredentialeMediu = { utilizator: string; parole: string[] };

/**
 * Citeste ADMIN_USERNAME si ADMIN_PASSWORD. Numele este mereu curatat de spatii,
 * iar pentru parola acceptam si varianta fara spatii la capete, pentru ca o
 * valoare lipita din greseala cu un spatiu sau un rand nou in urma sa nu blocheze
 * accesul in panou.
 */
function credentialeMediu(): CredentialeMediu | null {
  const utilizator = (process.env.ADMIN_USERNAME || "").trim();
  const parolaBruta = process.env.ADMIN_PASSWORD || "";
  if (!utilizator || !parolaBruta.trim()) return null;
  const parole = parolaBruta === parolaBruta.trim() ? [parolaBruta] : [parolaBruta, parolaBruta.trim()];
  return { utilizator, parole };
}

/**
 * Aduce contul proprietarului in acord cu variabilele de mediu si returneaza
 * randul din `admins`, gata de autentificat.
 *
 * Ruleaza doar cand datele trimise sunt exact cele din ADMIN_USERNAME si
 * ADMIN_PASSWORD, si acopera trei situatii:
 *   1. nu exista inca un cont cu acel nume  -> il creeaza;
 *   2. exista, dar cu alta parola          -> ii pune parola din mediu la loc;
 *   3. parola a fost schimbata din panou   -> nu atinge nimic (panoul are ultimul cuvant).
 */
async function contulDinMediu(utilizator: string, parola: string) {
  const mediu = credentialeMediu();
  if (!mediu) {
    console.warn("admin/login: ADMIN_USERNAME sau ADMIN_PASSWORD nu este configurat pentru funcții.");
    return null;
  }
  if (!egale(utilizator, mediu.utilizator)) return null;
  // toate variantele sunt verificate, fara iesire devreme, ca timpul sa nu spuna nimic
  const parolaCorecta = mediu.parole.reduce((ok, varianta) => egale(parola, varianta) || ok, false);
  if (!parolaCorecta) {
    console.warn("admin/login: utilizatorul corespunde ADMIN_USERNAME, dar parola trimisă nu corespunde ADMIN_PASSWORD.");
    return null;
  }

  const randuri = await db.select().from(admins).where(eq(admins.username, mediu.utilizator)).limit(1);

  if (!randuri.length) {
    const [creat] = await db
      .insert(admins)
      .values({ username: mediu.utilizator, passwordHash: await hashPassword(parola) })
      .onConflictDoNothing()
      .returning();
    if (creat) {
      console.info("admin/login: contul de administrator a fost creat din variabilele de mediu.");
      return creat;
    }
    // o cerere paralela tocmai l-a creat — il citim pe cel existent
    const [aparut] = await db.select().from(admins).where(eq(admins.username, mediu.utilizator)).limit(1);
    return aparut ?? null;
  }

  const existent = randuri[0];
  if (existent.passwordChangedAt) {
    console.warn(
      "admin/login: parola contului a fost schimbată din panou, așa că ADMIN_PASSWORD nu o mai poate înlocui.",
    );
    return null;
  }

  const trebuieParolaNoua = !(await verifyPassword(parola, existent.passwordHash));
  if (!trebuieParolaNoua && !existent.lockedUntil && existent.failedAttempts === 0) return existent;

  const modificari: Record<string, unknown> = { failedAttempts: 0, lockedUntil: null };
  if (trebuieParolaNoua) {
    modificari.passwordHash = await hashPassword(parola);
    console.info("admin/login: parola contului a fost readusă la valoarea din ADMIN_PASSWORD.");
  }
  const [actualizat] = await db.update(admins).set(modificari).where(eq(admins.id, existent.id)).returning();
  return actualizat ?? existent;
}

/** Exista macar un cont de administrator? Folosit doar pentru mesajul de configurare. */
async function existaAdministratori(): Promise<boolean> {
  const randuri = await db.select({ id: admins.id }).from(admins).limit(1);
  return randuri.length > 0;
}

function slug(v: string): string {
  return cheieCurata(v);
}

/** Identificatorii numerici din adresa (comenzi, imagini) — null daca nu sunt valizi. */
function idNumeric(v: string | null): number | null {
  if (!v) return null;
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : null;
}

/* ------------------------------------------------------------- COMENZI */

const STATUSURI = ["noua", "confirmata", "livrata", "anulata"];

async function comenziPentruPanou() {
  const lista = await db.select().from(orders).orderBy(desc(orders.createdAt)).limit(300);
  if (!lista.length) return [];
  const linii = await db.select().from(orderItems);
  const dupaComanda = new Map<number, unknown[]>();
  for (const l of linii) {
    if (!dupaComanda.has(l.orderId)) dupaComanda.set(l.orderId, []);
    dupaComanda.get(l.orderId)!.push({
      nume: l.productName,
      marime: l.size,
      pret: Number(l.unitPrice),
      ambalaj: Number(l.packagingUnit),
      cant: l.quantity,
    });
  }
  return lista.map((c) => ({
    id: c.id,
    numar: numarAfisat(c.dailyNumber),
    zi: c.orderDay,
    data: c.createdAt,
    nume: c.name,
    telefon: c.phone,
    email: c.email,
    cont: c.customerId ? "client cu cont" : "vizitator",
    modalitate: c.fulfilment,
    adresa: c.address,
    observatii: c.notes,
    ambalaj: Number(c.packaging),
    total: Number(c.total),
    status: c.status,
    produse: dupaComanda.get(c.id) || [],
  }));
}

/* ----------------------------------------------------------- IMAGINILE */

async function listaImagini() {
  const lista = await db.select().from(siteImages).orderBy(asc(siteImages.slot), asc(siteImages.position));
  return lista.map((i) => ({
    id: i.id,
    slot: i.slot,
    cheie: i.slotKey,
    src: `/media/${i.blobKey}?v=${i.version}`,
    alt: i.alt,
    titlu: i.caption,
    actualizat: i.updatedAt,
  }));
}

async function incarcaImagine(req: Request): Promise<Response> {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return eroare("Fișierul nu a putut fi citit.");
  }
  const fisier = form.get("fisier");
  if (!(fisier instanceof File) || !fisier.size) return eroare("Alege un fișier imagine.");
  if (fisier.size > MARIME_MAXIMA) return eroare("Imaginea depășește 5 MB. Alege una mai mică.", 413);
  const tip = fisier.type || "image/jpeg";
  if (!TIPURI_ACCEPTATE.includes(tip)) {
    return eroare("Format acceptat: JPG, PNG, WEBP, AVIF sau GIF.", 415);
  }

  const slot = text(form.get("slot"), 20);
  if (!["hero", "galerie", "produs", SLOT_SALA].includes(slot)) return eroare("Zona imaginii nu este validă.");

  let cheie = cheieCurata(text(form.get("cheie"), 80));
  if (slot === "hero") cheie = "hero";
  if (slot === "produs") {
    const produs = await db.select({ id: menuItems.id }).from(menuItems).where(eq(menuItems.id, cheie)).limit(1);
    if (!produs.length) return eroare("Produsul selectat nu există.", 404);
  }
  // Sala are exact patru locuri fixe, deci o fotografie noua inlocuieste
  // intotdeauna una dintre ele, nu se aduna la sfarsit.
  if (slot === SLOT_SALA && !esteCheieSala(cheie)) return eroare("Locul fotografiei din sală nu este valid.");
  if (slot === "galerie" && !cheie) cheie = `galerie-${Date.now()}-${sufixUnic()}`;

  const alt = text(form.get("alt"), 200);
  const titlu = text(form.get("titlu"), 200);

  const store = stocareMedia();
  const blobKey = `${slot}-${cheie}-${Date.now()}-${sufixUnic()}.${extensiePentru(tip)}`;
  await store.set(blobKey, await fisier.arrayBuffer(), { metadata: { contentType: tip } });

  const existenta = await db
    .select()
    .from(siteImages)
    .where(and(eq(siteImages.slot, slot), eq(siteImages.slotKey, cheie)))
    .limit(1);

  if (existenta.length) {
    const veche = existenta[0];
    await db
      .update(siteImages)
      .set({
        blobKey,
        contentType: tip,
        alt: alt || veche.alt,
        caption: titlu || veche.caption,
        version: veche.version + 1,
        updatedAt: new Date(),
      })
      .where(eq(siteImages.id, veche.id));
    await store.delete(veche.blobKey).catch(() => {});
  } else {
    // pozitia continua numerotarea din aceeasi zona, ca ordinea sa fie cea a incarcarii
    const ultima = await db
      .select({ position: siteImages.position })
      .from(siteImages)
      .where(eq(siteImages.slot, slot))
      .orderBy(desc(siteImages.position))
      .limit(1);
    await db.insert(siteImages).values({
      slot,
      slotKey: cheie,
      blobKey,
      contentType: tip,
      alt,
      caption: titlu,
      position: (ultima[0]?.position ?? 0) + 1,
    });
  }

  return json({ ok: true, imagini: await listaImagini() }, { status: 201 });
}

/* -------------------------------------------------------------- RUTARE */

export default async (req: Request, context: Context) => {
  const resursa = String(context.params.resursa || "");
  const id = context.params.id ? String(context.params.id) : null;
  const modifica = req.method !== "GET" && req.method !== "HEAD";
  if (modifica && !origineValida(req)) return eroare("Cerere respinsă.", 403);

  /* --- rutele fara sesiune: autentificare si deconectare ---------------- */
  if (resursa === "login") {
    if (req.method !== "POST") return eroare("Metodă neacceptată.", 405);
    const corp = await corpJson<{ utilizator?: string; parola?: string }>(req);
    if (!corp) return eroare("Datele trimise nu sunt valide.");
    const utilizator = text(corp.utilizator, 80);
    const parola = typeof corp.parola === "string" ? corp.parola : "";
    if (!utilizator || !parola) return eroare("Completează utilizatorul și parola.");

    const generic = "Datele de autentificare nu sunt corecte.";

    // Variabilele de mediu au intaietate: ele creeaza contul proprietarului la
    // prima autentificare si tot ele il pot readuce la zi daca a ramas in urma.
    let admin = await contulDinMediu(utilizator, parola);

    if (!admin) {
      const randuri = await db.select().from(admins).where(eq(admins.username, utilizator)).limit(1);
      if (!randuri.length) {
        await verifyPassword(parola, HASH_FICTIV);
        if (!credentialeMediu() && !(await existaAdministratori())) {
          return eroare(
            "Panoul nu are încă un cont de administrator. Setează ADMIN_USERNAME și ADMIN_PASSWORD " +
              "în variabilele de mediu ale site-ului (cu acces pentru funcții), apoi republică site-ul.",
            503,
          );
        }
        return eroare(generic, 401);
      }
      const gasit = randuri[0];
      if (esteBlocat(gasit)) {
        return eroare("Contul este blocat temporar după prea multe încercări. Încearcă din nou în 15 minute.", 429);
      }
      if (!(await verifyPassword(parola, gasit.passwordHash))) {
        await inregistreazaEsec("admin", gasit.id, gasit.failedAttempts);
        return eroare(generic, 401);
      }
      admin = gasit;
    }

    await reseteazaEsecuri("admin", admin.id);
    const { token, expira } = await creeazaSesiune("admin", admin.id, req.headers.get("user-agent") || "");
    return adaugaCookie(
      json({ ok: true, admin: { id: admin.id, utilizator: admin.username } }),
      cookieSesiune(req, "admin", token, expira),
    );
  }

  if (resursa === "logout") {
    if (req.method !== "POST") return eroare("Metodă neacceptată.", 405);
    const token = tokenDinCerere(req, "admin");
    if (token) await stergeSesiune(token);
    return adaugaCookie(json({ ok: true }), cookieSters(req, "admin"));
  }

  /* --- de aici incolo totul cere o sesiune de administrator ------------- */
  const admin: AdminAutentificat | null = await adminDinCerere(req);
  if (!admin) return eroare("Autentificare necesară.", 401);

  if (resursa === "session") {
    return json({ admin: { id: admin.id, utilizator: admin.username } });
  }

  /* ------------------------------------------------------------ PAROLA */
  if (resursa === "parola" && req.method === "POST") {
    const corp = await corpJson<{ parolaVeche?: string; parolaNoua?: string }>(req);
    if (!corp) return eroare("Datele trimise nu sunt valide.");
    const veche = typeof corp.parolaVeche === "string" ? corp.parolaVeche : "";
    const noua = typeof corp.parolaNoua === "string" ? corp.parolaNoua : "";
    const problema = parolaProblema(noua);
    if (problema) return eroare(problema);
    const randuri = await db.select().from(admins).where(eq(admins.id, admin.id)).limit(1);
    if (!randuri.length || !(await verifyPassword(veche, randuri[0].passwordHash))) {
      return eroare("Parola actuală nu este corectă.", 401);
    }
    // Din acest moment parola din panou este cea reala: `passwordChangedAt` opreste
    // variabila ADMIN_PASSWORD sa mai suprascrie ceva la urmatoarea autentificare.
    await db
      .update(admins)
      .set({ passwordHash: await hashPassword(noua), passwordChangedAt: new Date() })
      .where(eq(admins.id, admin.id));
    // orice alta sesiune de administrator ramasa deschisa se inchide
    await inchideSesiuni("admin", admin.id, tokenDinCerere(req, "admin"));
    return json({ ok: true });
  }

  /* ------------------------------------------ STAREA PRELUARII COMENZILOR */
  if (resursa === "stare") {
    const optiuni = Object.values(STARI).map((s) => ({
      cod: s.cod,
      eticheta: s.eticheta,
      explicatie: s.explicatie,
      titlu: s.titlu,
      mesaj: s.mesaj,
      blocat: s.blocat,
    }));

    if (req.method === "GET") {
      const curenta = await stareComenzi();
      return json({ stare: curenta.cod, optiuni });
    }

    if (req.method === "POST" || req.method === "PUT") {
      const corp = await corpJson<{ stare?: string }>(req);
      const aleasa = text(corp?.stare, 20);
      if (!esteCodStare(aleasa)) return eroare("Stare necunoscută.");
      const salvata = await seteazaStareComenzi(aleasa);
      return json({ ok: true, stare: salvata.cod, optiuni });
    }

    return eroare("Metodă neacceptată.", 405);
  }

  /* ----------------------------------------------------------- COMENZI */
  if (resursa === "orders") {
    if (req.method === "GET") return json({ comenzi: await comenziPentruPanou() });
    if ((req.method === "PATCH" || req.method === "PUT") && id) {
      const idComanda = idNumeric(id);
      if (!idComanda) return eroare("Comanda nu a fost găsită.", 404);
      const corp = await corpJson<{ status?: string }>(req);
      const status = text(corp?.status, 20);
      if (!STATUSURI.includes(status)) return eroare("Stare necunoscută.");
      await db.update(orders).set({ status }).where(eq(orders.id, idComanda));
      return json({ ok: true });
    }
    return eroare("Metodă neacceptată.", 405);
  }

  /* ------------------------------------------- TABLA DE COMENZI (KANBAN) */
  /* Aceeasi sesiune de administrator, alta priveliste asupra acelorasi
     comenzi: coloanele tablei stau in `board_status`, complet separat de
     lista clasica de mai sus. */
  if (resursa === "bord") {
    if (req.method === "GET") return json({ comenzi: await comenziBord(), acum: new Date().toISOString() });
    if ((req.method === "PATCH" || req.method === "PUT") && id) {
      const idComanda = idNumeric(id);
      if (!idComanda) return eroare("Comanda nu a fost găsită.", 404);
      const corp = await corpJson<{ coloana?: string }>(req);
      const coloana = text(corp?.coloana, 20);
      if (!esteColoana(coloana)) return eroare("Coloană necunoscută.");
      if (!(await mutaComanda(idComanda, coloana))) return eroare("Comanda nu a fost găsită.", 404);
      return json({ ok: true, comenzi: await comenziBord(), acum: new Date().toISOString() });
    }
    return eroare("Metodă neacceptată.", 405);
  }

  /* ---------------------------------------- ISTORICUL COMENZILOR FINALIZATE */
  if (resursa === "istoric") {
    if (req.method === "GET") return json({ comenzi: await istoricComenzi() });
    if (req.method === "DELETE" && id) {
      const idComanda = idNumeric(id);
      if (!idComanda) return eroare("Comanda nu a fost găsită.", 404);
      await ascundeComanda(idComanda);
      return json({ ok: true, comenzi: await istoricComenzi() });
    }
    return eroare("Metodă neacceptată.", 405);
  }

  /* ------------------------------------------------------------- MENIU */
  if (resursa === "menu") {
    await asiguraMeniu();

    if (req.method === "GET") {
      const [categorii, produse] = await Promise.all([
        db.select().from(menuCategories).orderBy(asc(menuCategories.position)),
        db.select().from(menuItems).orderBy(asc(menuItems.categoryId), asc(menuItems.position)),
      ]);
      return json({
        categorii: categorii.map((c) => ({ id: c.id, titlu: c.title, tab: c.tab })),
        produse: produse.map((p) => ({
          id: p.id,
          categorie: p.categoryId,
          nume: p.name,
          ing: p.ingredients,
          gramaj: p.weight,
          pret: p.price === null ? null : Number(p.price),
          pretMare: p.priceLarge === null ? null : Number(p.priceLarge),
          cuMarimi: p.withSizes,
          grupTitlu: p.groupTitle,
          grupPrefix: p.groupPrefix,
          imagine: p.image,
          pozitie: p.position,
          activ: p.active,
        })),
      });
    }

    if (req.method === "POST" || req.method === "PUT") {
      const corp = await corpJson<Record<string, unknown>>(req);
      if (!corp) return eroare("Datele trimise nu sunt valide.");
      const nume = text(corp.nume, 120);
      const categorie = text(corp.categorie, 60);
      if (!nume) return eroare("Completează denumirea produsului.");

      const cuMarimi = corp.cuMarimi === true;
      const pret = numarSauNull(corp.pret);
      const pretMare = numarSauNull(corp.pretMare);
      if (pret === null || pret <= 0) return eroare("Completează un preț valid (mai mare decât zero).");
      if (cuMarimi && (pretMare === null || pretMare <= 0)) {
        return eroare("Pentru produsele cu două mărimi completează și prețul pentru mărimea family.");
      }

      const valori = {
        name: nume,
        ingredients: text(corp.ing, 400),
        weight: text(corp.gramaj, 40),
        price: pret.toFixed(2),
        priceLarge: cuMarimi && pretMare !== null ? pretMare.toFixed(2) : null,
        withSizes: cuMarimi,
        groupTitle: text(corp.grupTitlu, 80),
        groupPrefix: text(corp.grupPrefix, 40),
        active: corp.activ !== false,
        updatedAt: new Date(),
      };
      // Ilustratia se schimba doar daca a fost trimisa explicit; altfel produsul
      // si-ar pierde fotografia existenta la fiecare modificare de pret.
      const imagine = typeof corp.imagine === "string" ? text(corp.imagine, 300) : null;

      if (req.method === "PUT") {
        if (!id) return eroare("Lipsește produsul de modificat.");
        const existent = await db.select().from(menuItems).where(eq(menuItems.id, id)).limit(1);
        if (!existent.length) return eroare("Produsul nu a fost găsit.", 404);
        const set: Record<string, unknown> = { ...valori };
        if (imagine !== null) set.image = imagine;
        if (categorie) {
          const cat = await db
            .select({ id: menuCategories.id })
            .from(menuCategories)
            .where(eq(menuCategories.id, categorie))
            .limit(1);
          if (!cat.length) return eroare("Categoria nu există.");
          set.categoryId = categorie;
        }
        await db.update(menuItems).set(set).where(eq(menuItems.id, id));
        return json({ ok: true, id });
      }

      const cat = await db
        .select({ id: menuCategories.id })
        .from(menuCategories)
        .where(eq(menuCategories.id, categorie))
        .limit(1);
      if (!cat.length) return eroare("Alege o categorie existentă.");

      let idNou = slug(text(corp.id, 80) || nume);
      const ocupat = await db.select({ id: menuItems.id }).from(menuItems).where(eq(menuItems.id, idNou)).limit(1);
      if (ocupat.length) idNou = `${idNou}-${Date.now().toString(36).slice(-4)}`;

      const ultim = await db
        .select({ position: menuItems.position })
        .from(menuItems)
        .where(eq(menuItems.categoryId, categorie))
        .orderBy(desc(menuItems.position))
        .limit(1);

      await db.insert(menuItems).values({
        ...valori,
        image: imagine || "",
        id: idNou,
        categoryId: categorie,
        position: (ultim[0]?.position ?? 0) + 1,
      });
      return json({ ok: true, id: idNou }, { status: 201 });
    }

    if (req.method === "DELETE" && id) {
      await db.delete(menuItems).where(eq(menuItems.id, id));
      await db.delete(siteImages).where(and(eq(siteImages.slot, "produs"), eq(siteImages.slotKey, id)));
      return json({ ok: true });
    }

    return eroare("Metodă neacceptată.", 405);
  }

  /* ----------------------------------------------------------- IMAGINI */
  if (resursa === "images") {
    if (req.method === "GET") return json({ imagini: await listaImagini() });
    if (req.method === "POST") return incarcaImagine(req);
    if (req.method === "DELETE" && id) {
      const idImagine = idNumeric(id);
      if (!idImagine) return eroare("Imaginea nu a fost găsită.", 404);
      const randuri = await db
        .select()
        .from(siteImages)
        .where(eq(siteImages.id, idImagine))
        .limit(1);
      if (randuri.length) {
        await stocareMedia().delete(randuri[0].blobKey).catch(() => {});
        await db.delete(siteImages).where(eq(siteImages.id, randuri[0].id));
      }
      return json({ ok: true, imagini: await listaImagini() });
    }
    return eroare("Metodă neacceptată.", 405);
  }

  /* ------------------------------------------------- ÎNCHIRIEREA SĂLII */
  /* Trei operațiuni pe aceeași resursă: citirea a tot (text, fotografii,
     zilele ocupate), salvarea textului de prezentare și marcarea unei zile
     ca ocupată sau liberă. */
  if (resursa === "sala") {
    if (req.method === "GET") return json(await salaAdmin());

    if (req.method === "PUT") {
      const corp = await corpJson<{ descriere?: string }>(req);
      if (!corp) return eroare("Datele trimise nu sunt valide.");
      const descriere = await seteazaDescriereSala(text(corp.descriere, 2000));
      return json({ ok: true, descriere });
    }

    if (req.method === "POST") {
      const corp = await corpJson<{ zi?: string; ocupat?: boolean; nota?: string }>(req);
      if (!corp) return eroare("Datele trimise nu sunt valide.");
      const zi = ziValida(corp.zi);
      if (!zi) return eroare("Ziua aleasă nu este validă.");
      const ocupat = corp.ocupat !== false;
      await seteazaZi(zi, ocupat, ocupat ? text(corp.nota, 200) : "");
      return json({ ok: true, zile: await zileOcupate(false) });
    }

    return eroare("Metodă neacceptată.", 405);
  }

  return eroare("Resursă necunoscută.", 404);
};

export const config: Config = {
  path: ["/api/admin/:resursa", "/api/admin/:resursa/:id"],
};
