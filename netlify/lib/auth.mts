// Autentificare: parole, sesiuni si cookie-uri.
// Zona clientilor si zona administratorului folosesc cookie-uri diferite si
// randuri diferite in `sessions`, deci o sesiune de client nu poate deschide
// niciodata panoul de administrare (si invers).
import { randomBytes, scrypt as scryptCb, timingSafeEqual, createHash } from "node:crypto";
import { and, eq, gt, lt, ne } from "drizzle-orm";
import { db } from "../../db/index.js";
import { admins, customers, sessions } from "../../db/schema.js";

/** scrypt cu parametrii dati explicit, sub forma de promisiune. */
function scrypt(
  parola: string,
  salt: Buffer,
  lungime: number,
  optiuni: { N: number; r: number; p: number },
): Promise<Buffer> {
  return new Promise((rezolva, respinge) => {
    scryptCb(parola, salt, lungime, optiuni, (eroare, derivat) => {
      if (eroare) respinge(eroare);
      else rezolva(derivat);
    });
  });
}

const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const KEY_LEN = 64;

export const COOKIE_CLIENT = "olizan_client";
export const COOKIE_ADMIN = "olizan_admin";

export const DURATA_CLIENT_MS = 30 * 24 * 60 * 60 * 1000; // 30 de zile
export const DURATA_ADMIN_MS = 12 * 60 * 60 * 1000; // 12 ore

const MAX_INCERCARI = 8;
const BLOCARE_MS = 15 * 60 * 1000;

/* --------------------------------------------------------------- PAROLE */

export async function hashPassword(parola: string): Promise<string> {
  const salt = randomBytes(16);
  const derived = await scrypt(parola.normalize("NFKC"), salt, KEY_LEN, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
  });
  return ["scrypt", SCRYPT_N, SCRYPT_R, SCRYPT_P, salt.toString("base64"), derived.toString("base64")].join("$");
}

export async function verifyPassword(parola: string, stocat: string): Promise<boolean> {
  try {
    const [schema, n, r, p, saltB64, hashB64] = stocat.split("$");
    if (schema !== "scrypt") return false;
    const salt = Buffer.from(saltB64, "base64");
    const asteptat = Buffer.from(hashB64, "base64");
    const derived = await scrypt(parola.normalize("NFKC"), salt, asteptat.length, {
      N: Number(n),
      r: Number(r),
      p: Number(p),
    });
    return derived.length === asteptat.length && timingSafeEqual(derived, asteptat);
  } catch {
    return false;
  }
}

/* ------------------------------------------------------ BLOCARE TEMPORARA */

export function esteBlocat(user: { lockedUntil: Date | null }): boolean {
  return !!user.lockedUntil && user.lockedUntil.getTime() > Date.now();
}

export async function inregistreazaEsec(kind: "customer" | "admin", id: number, incercariCurente: number) {
  const incercari = incercariCurente + 1;
  const lockedUntil = incercari >= MAX_INCERCARI ? new Date(Date.now() + BLOCARE_MS) : null;
  if (kind === "customer") {
    await db.update(customers).set({ failedAttempts: incercari, lockedUntil }).where(eq(customers.id, id));
  } else {
    await db.update(admins).set({ failedAttempts: incercari, lockedUntil }).where(eq(admins.id, id));
  }
}

export async function reseteazaEsecuri(kind: "customer" | "admin", id: number) {
  if (kind === "customer") {
    await db.update(customers).set({ failedAttempts: 0, lockedUntil: null }).where(eq(customers.id, id));
  } else {
    await db
      .update(admins)
      .set({ failedAttempts: 0, lockedUntil: null, lastLoginAt: new Date() })
      .where(eq(admins.id, id));
  }
}

/* -------------------------------------------------------------- SESIUNI */

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function creeazaSesiune(
  kind: "customer" | "admin",
  userId: number,
  userAgent = "",
): Promise<{ token: string; expira: Date }> {
  const token = randomBytes(32).toString("base64url");
  const expira = new Date(Date.now() + (kind === "admin" ? DURATA_ADMIN_MS : DURATA_CLIENT_MS));
  await db.insert(sessions).values({
    tokenHash: hashToken(token),
    kind,
    customerId: kind === "customer" ? userId : null,
    adminId: kind === "admin" ? userId : null,
    userAgent: userAgent.slice(0, 200),
    expiresAt: expira,
  });
  // curatenie oportunista a sesiunilor expirate
  await db.delete(sessions).where(lt(sessions.expiresAt, new Date()));
  return { token, expira };
}

export async function stergeSesiune(token: string) {
  await db.delete(sessions).where(eq(sessions.tokenHash, hashToken(token)));
}

/**
 * Inchide toate sesiunile unui cont, mai putin cea data (cea curenta).
 * Se foloseste la schimbarea parolei, ca o sesiune furata sa nu ramana valabila.
 */
export async function inchideSesiuni(kind: "customer" | "admin", userId: number, tokenPastrat?: string | null) {
  const conditii = [
    eq(sessions.kind, kind),
    kind === "admin" ? eq(sessions.adminId, userId) : eq(sessions.customerId, userId),
  ];
  if (tokenPastrat) conditii.push(ne(sessions.tokenHash, hashToken(tokenPastrat)));
  await db.delete(sessions).where(and(...conditii));
}

function citesteCookie(req: Request, nume: string): string | null {
  const brut = req.headers.get("cookie");
  if (!brut) return null;
  for (const bucata of brut.split(";")) {
    const idx = bucata.indexOf("=");
    if (idx < 0) continue;
    if (bucata.slice(0, idx).trim() === nume) return decodeURIComponent(bucata.slice(idx + 1).trim());
  }
  return null;
}

export type ClientAutentificat = {
  id: number;
  email: string;
  name: string;
  phone: string;
};

export async function clientDinCerere(req: Request): Promise<ClientAutentificat | null> {
  const token = citesteCookie(req, COOKIE_CLIENT);
  if (!token) return null;
  const randuri = await db
    .select({
      id: customers.id,
      email: customers.email,
      name: customers.name,
      phone: customers.phone,
    })
    .from(sessions)
    .innerJoin(customers, eq(sessions.customerId, customers.id))
    .where(
      and(
        eq(sessions.tokenHash, hashToken(token)),
        eq(sessions.kind, "customer"),
        gt(sessions.expiresAt, new Date()),
      ),
    )
    .limit(1);
  return randuri[0] ?? null;
}

export type AdminAutentificat = { id: number; username: string };

export async function adminDinCerere(req: Request): Promise<AdminAutentificat | null> {
  const token = citesteCookie(req, COOKIE_ADMIN);
  if (!token) return null;
  const randuri = await db
    .select({ id: admins.id, username: admins.username })
    .from(sessions)
    .innerJoin(admins, eq(sessions.adminId, admins.id))
    .where(
      and(eq(sessions.tokenHash, hashToken(token)), eq(sessions.kind, "admin"), gt(sessions.expiresAt, new Date())),
    )
    .limit(1);
  return randuri[0] ?? null;
}

export function tokenDinCerere(req: Request, kind: "customer" | "admin"): string | null {
  return citesteCookie(req, kind === "admin" ? COOKIE_ADMIN : COOKIE_CLIENT);
}

/* -------------------------------------------------------------- COOKIE */

function siguranta(req: Request): string {
  // pe localhost (netlify dev) cookie-ul nu poate fi Secure
  const url = new URL(req.url);
  return url.protocol === "https:" ? "; Secure" : "";
}

export function cookieSesiune(req: Request, kind: "customer" | "admin", token: string, expira: Date): string {
  const nume = kind === "admin" ? COOKIE_ADMIN : COOKIE_CLIENT;
  const sameSite = kind === "admin" ? "Strict" : "Lax";
  return (
    `${nume}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=${sameSite}` +
    `${siguranta(req)}; Expires=${expira.toUTCString()}`
  );
}

export function cookieSters(req: Request, kind: "customer" | "admin"): string {
  const nume = kind === "admin" ? COOKIE_ADMIN : COOKIE_CLIENT;
  const sameSite = kind === "admin" ? "Strict" : "Lax";
  return `${nume}=; Path=/; HttpOnly; SameSite=${sameSite}${siguranta(req)}; Max-Age=0`;
}
