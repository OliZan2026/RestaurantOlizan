// Ajutoare comune pentru functiile HTTP: raspunsuri JSON, validari, protectie CSRF.

export function json(data: unknown, init: ResponseInit = {}): Response {
  const headers = new Headers(init.headers);
  headers.set("content-type", "application/json; charset=utf-8");
  headers.set("cache-control", "no-store");
  return new Response(JSON.stringify(data), { ...init, headers });
}

export function eroare(mesaj: string, status = 400, init: ResponseInit = {}): Response {
  return json({ eroare: mesaj }, { ...init, status });
}

export function adaugaCookie(raspuns: Response, cookie: string): Response {
  raspuns.headers.append("set-cookie", cookie);
  return raspuns;
}

/** Cererile care modifica date trebuie sa vina de pe acelasi site. */
export function origineValida(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return true; // unele browsere nu trimit Origin la navigari simple
  try {
    return new URL(origin).host === new URL(req.url).host;
  } catch {
    return false;
  }
}

export async function corpJson<T = Record<string, unknown>>(req: Request): Promise<T | null> {
  try {
    const data = await req.json();
    if (!data || typeof data !== "object") return null;
    return data as T;
  } catch {
    return null;
  }
}

export function text(v: unknown, max = 500): string {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

export function emailValid(email: string): boolean {
  return /^[^\s@]{1,64}@[^\s@]{1,190}\.[a-z]{2,}$/i.test(email);
}

export function parolaProblema(parola: string): string | null {
  if (parola.length < 8) return "Parola trebuie să aibă cel puțin 8 caractere.";
  if (parola.length > 200) return "Parola este prea lungă.";
  if (!/[a-zA-Z]/.test(parola) || !/[0-9]/.test(parola)) {
    return "Parola trebuie să conțină cel puțin o literă și o cifră.";
  }
  return null;
}

export function numarSauNull(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : null;
}
