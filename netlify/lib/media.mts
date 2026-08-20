// Depozitul de imagini incarcate din panoul de administrare.
// Fisierele stau in Netlify Blobs, evidenta lor in baza de date.
import { getDeployStore, getStore } from "@netlify/blobs";

export function stocareMedia() {
  const context = (globalThis as { Netlify?: { context?: { deploy?: { context?: string } } } }).Netlify?.context;
  if (context?.deploy?.context === "production") return getStore("olizan-media");
  return getDeployStore("olizan-media");
}

const EXTENSII: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
  "image/gif": "gif",
};

export const TIPURI_ACCEPTATE = Object.keys(EXTENSII);
export const MARIME_MAXIMA = 5 * 1024 * 1024; // 5 MB

export function extensiePentru(tip: string): string {
  return EXTENSII[tip] || "bin";
}

/**
 * Sufix scurt si aleatoriu. Cand se incarca mai multe fotografii una dupa alta,
 * doua cereri pot cadea in aceeasi milisecunda; sufixul tine cheile distincte.
 */
export function sufixUnic(): string {
  return Math.random().toString(36).slice(2, 8);
}

export function cheieCurata(v: string): string {
  return (
    v
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "imagine"
  );
}
