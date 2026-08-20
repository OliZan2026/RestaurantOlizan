// Autentificarea clientilor (zona publica): inregistrare, autentificare,
// deconectare si datele contului curent.
import type { Config, Context } from "@netlify/functions";
import { eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { customers } from "../../db/schema.js";
import {
  clientDinCerere,
  cookieSesiune,
  cookieSters,
  creeazaSesiune,
  esteBlocat,
  hashPassword,
  inregistreazaEsec,
  reseteazaEsecuri,
  stergeSesiune,
  tokenDinCerere,
  verifyPassword,
} from "../lib/auth.mjs";
import {
  adaugaCookie,
  corpJson,
  emailValid,
  eroare,
  json,
  origineValida,
  parolaProblema,
  text,
} from "../lib/http.mjs";

function profil(c: { id: number; email: string; name: string; phone: string }) {
  return { id: c.id, email: c.email, nume: c.name, telefon: c.phone };
}

export default async (req: Request, context: Context) => {
  const actiune = String(context.params.actiune || "");

  if (actiune === "me") {
    if (req.method !== "GET") return eroare("Metodă neacceptată.", 405);
    const client = await clientDinCerere(req);
    return json({ autentificat: !!client, client: client ? profil(client) : null });
  }

  if (req.method !== "POST") return eroare("Metodă neacceptată.", 405);
  if (!origineValida(req)) return eroare("Cerere respinsă.", 403);

  /* ------------------------------------------------------- DECONECTARE */
  if (actiune === "logout") {
    const token = tokenDinCerere(req, "customer");
    if (token) await stergeSesiune(token);
    return adaugaCookie(json({ ok: true }), cookieSters(req, "customer"));
  }

  const corp = await corpJson<{ email?: string; parola?: string; nume?: string; telefon?: string }>(req);
  if (!corp) return eroare("Datele trimise nu sunt valide.");

  const email = text(corp.email, 254).toLowerCase();
  const parola = typeof corp.parola === "string" ? corp.parola : "";

  /* ------------------------------------------------------- INREGISTRARE */
  if (actiune === "register") {
    const nume = text(corp.nume, 120);
    const telefon = text(corp.telefon, 40);
    if (!nume) return eroare("Completează numele.");
    if (!emailValid(email)) return eroare("Adresa de e-mail nu pare corectă.");
    const problema = parolaProblema(parola);
    if (problema) return eroare(problema);

    const existent = await db.select({ id: customers.id }).from(customers).where(eq(customers.email, email)).limit(1);
    if (existent.length) return eroare("Există deja un cont cu această adresă de e-mail.", 409);

    const [client] = await db
      .insert(customers)
      .values({ email, passwordHash: await hashPassword(parola), name: nume, phone: telefon })
      .returning({ id: customers.id, email: customers.email, name: customers.name, phone: customers.phone });

    const { token, expira } = await creeazaSesiune("customer", client.id, req.headers.get("user-agent") || "");
    return adaugaCookie(
      json({ ok: true, client: profil(client) }, { status: 201 }),
      cookieSesiune(req, "customer", token, expira),
    );
  }

  /* ------------------------------------------------------ AUTENTIFICARE */
  if (actiune === "login") {
    if (!email || !parola) return eroare("Completează e-mailul și parola.");
    const randuri = await db.select().from(customers).where(eq(customers.email, email)).limit(1);
    const client = randuri[0];
    const generic = "E-mailul sau parola nu sunt corecte.";
    if (!client) {
      // acelasi timp de raspuns ca la o parola gresita
      await verifyPassword(parola, "scrypt$16384$8$1$AAAAAAAAAAAAAAAAAAAAAA==$AAAA");
      return eroare(generic, 401);
    }
    if (esteBlocat(client)) {
      return eroare("Contul este blocat temporar după prea multe încercări. Încearcă din nou în 15 minute.", 429);
    }
    if (!(await verifyPassword(parola, client.passwordHash))) {
      await inregistreazaEsec("customer", client.id, client.failedAttempts);
      return eroare(generic, 401);
    }
    await reseteazaEsecuri("customer", client.id);
    const { token, expira } = await creeazaSesiune("customer", client.id, req.headers.get("user-agent") || "");
    return adaugaCookie(json({ ok: true, client: profil(client) }), cookieSesiune(req, "customer", token, expira));
  }

  return eroare("Acțiune necunoscută.", 404);
};

export const config: Config = {
  path: "/api/auth/:actiune",
};
