// Meniul public: citit din baza de date, populat automat la prima cerere din
// datele existente ale restaurantului si imbogatit cu fotografiile incarcate
// de administrator.
import { asc, desc, eq, gte, sql } from "drizzle-orm";
import { db } from "../../db/index.js";
import { menuCategories, menuItems, siteImages, siteSettings } from "../../db/schema.js";
import seed, { type CategorieSeed } from "./menu-seed.mjs";

export type Grup = {
  titlu?: string;
  prefixComanda?: string;
  cuMarimi?: boolean;
  produse: Record<string, unknown>[];
};

let seedVerificat = false;
let completariVerificate = false;

/** Scrie o categorie din datele initiale, fara sa atinga ce exista deja. */
async function scrieCategorie(cat: CategorieSeed, position: number): Promise<void> {
  await db
    .insert(menuCategories)
    .values({
      id: cat.id,
      tab: cat.tab,
      title: cat.title,
      note: cat.note,
      image: cat.image,
      position,
    })
    .onConflictDoNothing();
  if (!cat.items.length) return;
  await db
    .insert(menuItems)
    .values(
      cat.items.map((p) => ({
        id: p.id,
        categoryId: cat.id,
        groupTitle: p.groupTitle,
        groupPrefix: p.groupPrefix,
        withSizes: p.withSizes,
        name: p.name,
        ingredients: p.ingredients,
        weight: p.weight,
        price: p.price,
        priceLarge: p.priceLarge,
        image: p.image,
        position: p.position,
      })),
    )
    .onConflictDoNothing();
}

/* Categoriile adaugate dupa deschiderea site-ului nu mai ajung in baza de date
   prin seed, care ruleaza o singura data, cat timp meniul este gol. Fiecare
   completare de mai jos se aplica exact o data pe baza de date si se tine minte
   printr-un rand in `site_settings`, ca sa nu reapara produsele sterse ulterior
   din panoul de administrare.

   Implicit categoria se aseaza la coada meniului. Cand are `dupa`, ea intra
   imediat dupa categoria numita acolo, iar categoriile de dupa ea sunt
   impinse cu o pozitie mai incolo. */
const COMPLETARI: { categorie: string; cheie: string; dupa?: string }[] = [
  { categorie: "sosuri", cheie: "meniu_completare_sosuri" },
  { categorie: "paste", cheie: "meniu_completare_paste", dupa: "pizza" },
];

/** Pozitia pe care o primeste o categorie noua, plus locul liber pentru ea. */
async function pregatestePozitia(cat: CategorieSeed, dupa?: string): Promise<number> {
  // Pe o baza de date populata din seed categoria exista deja, cu pozitia ei
  // din meniu: o lasam acolo, altfel am imbranci degeaba restul categoriilor.
  const deja = await db
    .select({ position: menuCategories.position })
    .from(menuCategories)
    .where(eq(menuCategories.id, cat.id))
    .limit(1);
  if (deja.length) return deja[0].position;

  if (dupa) {
    const ancora = await db
      .select({ position: menuCategories.position })
      .from(menuCategories)
      .where(eq(menuCategories.id, dupa))
      .limit(1);
    if (ancora.length) {
      const pozitie = ancora[0].position + 1;
      // Face loc: tot ce vine dupa ancora se muta cu o pozitie mai incolo.
      await db
        .update(menuCategories)
        .set({ position: sql`${menuCategories.position} + 1` })
        .where(gte(menuCategories.position, pozitie));
      return pozitie;
    }
  }
  // Fara ancora, categoria noua se aseaza la coada meniului, ca sa nu miste
  // ordinea pe care administratorul a stabilit-o intre categoriile existente.
  const ultima = await db
    .select({ position: menuCategories.position })
    .from(menuCategories)
    .orderBy(desc(menuCategories.position))
    .limit(1);
  return ultima.length ? ultima[0].position + 1 : cat.position;
}

/** Aduce in meniu categoriile aparute dupa popularea initiala. */
async function completeazaMeniu(): Promise<void> {
  if (completariVerificate) return;
  for (const completare of COMPLETARI) {
    const facuta = await db
      .select({ key: siteSettings.key })
      .from(siteSettings)
      .where(eq(siteSettings.key, completare.cheie))
      .limit(1);
    if (facuta.length) continue;
    const cat = seed.find((c) => c.id === completare.categorie);
    if (cat) {
      await scrieCategorie(cat, await pregatestePozitia(cat, completare.dupa));
    }
    await db.insert(siteSettings).values({ key: completare.cheie, value: "1" }).onConflictDoNothing();
  }
  completariVerificate = true;
}

/** Populeaza meniul din datele initiale, o singura data, daca tabelul e gol. */
export async function asiguraMeniu(): Promise<void> {
  if (seedVerificat && completariVerificate) return;
  if (!seedVerificat) {
    const existente = await db.select({ id: menuCategories.id }).from(menuCategories).limit(1);
    if (!existente.length) {
      for (const cat of seed) await scrieCategorie(cat, cat.position);
    }
    seedVerificat = true;
  }
  await completeazaMeniu();
}

function numar(v: string | null): number | undefined {
  if (v === null || v === undefined) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

/** Structura asteptata de site (aceeasi forma ca window.OLIZAN.meniu). */
export async function meniuPublic() {
  await asiguraMeniu();

  const [categorii, produse, imagini] = await Promise.all([
    db.select().from(menuCategories).orderBy(asc(menuCategories.position), asc(menuCategories.id)),
    db.select().from(menuItems).orderBy(asc(menuItems.position), asc(menuItems.id)),
    db.select().from(siteImages).orderBy(asc(siteImages.position), asc(siteImages.id)),
  ]);

  const produsImagine = new Map<string, string>();
  for (const img of imagini) {
    if (img.slot === "produs") produsImagine.set(img.slotKey, `/media/${img.blobKey}?v=${img.version}`);
  }

  const meniu = categorii.map((cat) => {
    const aleCategoriei = produse.filter((p) => p.categoryId === cat.id && p.active);
    const grupe: Grup[] = [];
    let curent: Grup | null = null;
    let cheieCurenta = "";
    for (const p of aleCategoriei) {
      const cheie = `${p.groupTitle}|${p.groupPrefix}|${p.withSizes}`;
      if (!curent || cheie !== cheieCurenta) {
        curent = { produse: [] };
        if (p.groupTitle) curent.titlu = p.groupTitle;
        if (p.groupPrefix) curent.prefixComanda = p.groupPrefix;
        if (p.withSizes) curent.cuMarimi = true;
        grupe.push(curent);
        cheieCurenta = cheie;
      }
      const produs: Record<string, unknown> = {
        id: p.id,
        nume: p.name,
        imagine: produsImagine.get(p.id) || p.image,
      };
      if (p.ingredients) produs.ing = p.ingredients;
      if (p.weight) produs.gramaj = p.weight;
      const pret = numar(p.price);
      if (pret !== undefined) produs.pret = pret;
      const pretMare = numar(p.priceLarge);
      if (pretMare !== undefined) produs.pretMare = pretMare;
      curent.produse.push(produs);
    }
    return {
      id: cat.id,
      tab: cat.tab,
      titlu: cat.title,
      nota: cat.note,
      imagine: cat.image,
      grupe,
    };
  });

  const hero = imagini.find((i) => i.slot === "hero" && i.slotKey === "hero");
  const galerie = imagini
    .filter((i) => i.slot === "galerie")
    .map((i) => ({
      src: `/media/${i.blobKey}?v=${i.version}`,
      alt: i.alt || "Fotografie din galeria OLIZAN Restaurant & Pizzeria",
      titlu: i.caption || "",
    }));

  return {
    meniu,
    imagini: {
      hero: hero ? { src: `/media/${hero.blobKey}?v=${hero.version}`, alt: hero.alt } : null,
      galerie,
    },
  };
}
