// Autentificarea clientilor (zona publica): inregistrare, autentificare,
// deconectare si datele contului curent.
import type { Config, Context } from "@netlify/functions";
import { and, eq, gt, lt } from "drizzle-orm";
import { createHash, randomBytes } from "node:crypto";
import { db } from "../../db/index.js";
import { customers, passwordResetTokens } from "../../db/schema.js";
import {
  clientDinCerere,
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

const RESET_MS = 30 * 60 * 1000;
const RESET_RASPUNS = "Dacă există un cont cu această adresă, vei primi în câteva minute un e-mail cu instrucțiunile.";

function hashTokenReset(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function htmlSigur(v: string) {
  const entitati: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
  return v.replace(/[&<>\"']/g, (c) => entitati[c] || c);
}

async function trimiteResetare(destinatar: string, link: string) {
  const apiKey = process.env.RESEND_API_KEY;
  const expeditor = process.env.PASSWORD_RESET_FROM || "OLIZAN <cont@restaurantolizan.ro>";
  if (!apiKey) throw new Error("RESEND_API_KEY lipsește din variabilele Netlify.");
  const raspuns = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
    body: JSON.stringify({
      from: expeditor,
      to: [destinatar],
      subject: "Resetarea parolei contului OLIZAN",
      text: `Ai cerut resetarea parolei contului OLIZAN. Deschide linkul în următoarele 30 de minute: ${link}\n\nDacă nu ai făcut această cerere, ignoră mesajul.`,
      html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;background:#141716;color:#eee8dc;padding:32px;border:1px solid #96763f;border-radius:18px"><p style="color:#d8bd83;letter-spacing:.12em">OLIZAN RESTAURANT &amp; PIZZERIA</p><h1 style="font-family:Georgia,serif;color:#f0d59c">Resetarea parolei</h1><p>Ai cerut o parolă nouă pentru contul tău. Linkul este valabil 30 de minute și poate fi folosit o singură dată.</p><p style="margin:28px 0"><a href="${htmlSigur(link)}" style="display:inline-block;background:#d8bd83;color:#111;padding:14px 22px;border-radius:10px;text-decoration:none;font-weight:bold">Alege parola nouă</a></p><p style="color:#aaa49a;font-size:13px">Dacă nu ai făcut această cerere, poți ignora mesajul.</p></div>`,
    }),
  });
  if (!raspuns.ok) throw new Error(`Resend a răspuns cu ${raspuns.status}.`);
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

  const corp = await corpJson<{ email?: string; parola?: string; nume?: string; telefon?: string; token?: string }>(req);
  if (!corp) return eroare("Datele trimise nu sunt valide.");

  const email = text(corp.email, 254).toLowerCase();
  const parola = typeof corp.parola === "string" ? corp.parola : "";

  /* --------------------------------------------------- PAROLA UITATA */
  if (actiune === "forgot-password") {
    if (!emailValid(email)) return json({ ok: true, mesaj: RESET_RASPUNS });
    if (!process.env.RESEND_API_KEY) return eroare("Serviciul de e-mail pentru resetarea parolei nu este configurat încă.", 503);

    await db.delete(passwordResetTokens).where(lt(passwordResetTokens.expiresAt, new Date()));
    const [client] = await db.select({ id: customers.id }).from(customers).where(eq(customers.email, email)).limit(1);
    if (!client) return json({ ok: true, mesaj: RESET_RASPUNS });

    const [recent] = await db.select({ createdAt: passwordResetTokens.createdAt })
      .from(passwordResetTokens).where(eq(passwordResetTokens.customerId, client.id)).limit(1);
    if (recent && recent.createdAt.getTime() > Date.now() - 60_000) return json({ ok: true, mesaj: RESET_RASPUNS });

    await db.delete(passwordResetTokens).where(eq(passwordResetTokens.customerId, client.id));
    const token = randomBytes(32).toString("base64url");
    await db.insert(passwordResetTokens).values({
      customerId: client.id,
      tokenHash: hashTokenReset(token),
      expiresAt: new Date(Date.now() + RESET_MS),
    });
    const link = new URL(`/cont?reset=${encodeURIComponent(token)}`, req.url).toString();
    try {
      await trimiteResetare(email, link);
    } catch (e) {
      await db.delete(passwordResetTokens).where(eq(passwordResetTokens.customerId, client.id));
      console.error("E-mailul de resetare nu a putut fi trimis:", e);
    }
    return json({ ok: true, mesaj: RESET_RASPUNS });
  }

  /* ------------------------------------------------------ PAROLA NOUA */
  if (actiune === "reset-password") {
    const token = text(corp.token, 100);
    const problema = parolaProblema(parola);
    if (!token || problema) return eroare(problema || "Linkul de resetare nu este valid.");

    const [folosit] = await db.delete(passwordResetTokens)
      .where(and(eq(passwordResetTokens.tokenHash, hashTokenReset(token)), gt(passwordResetTokens.expiresAt, new Date())))
      .returning({ customerId: passwordResetTokens.customerId });
    if (!folosit) return eroare("Linkul a expirat sau a fost deja folosit. Cere un link nou.", 410);

    await db.update(customers).set({ passwordHash: await hashPassword(parola), failedAttempts: 0, lockedUntil: null })
      .where(eq(customers.id, folosit.customerId));
    await inchideSesiuni("customer", folosit.customerId);
    return json({ ok: true, mesaj: "Parola a fost schimbată. Acum te poți autentifica." });
  }

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
