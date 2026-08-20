// Serveste fotografiile incarcate din panoul de administrare.
// Cheia contine un marcaj de timp, deci fisierul de la o adresa nu se schimba
// niciodata si poate fi memorat in cache pe termen lung.
import type { Config, Context } from "@netlify/functions";
import { stocareMedia } from "../lib/media.mjs";

export default async (req: Request, context: Context) => {
  if (req.method !== "GET" && req.method !== "HEAD") {
    return new Response("Metodă neacceptată.", { status: 405 });
  }
  const cheie = String(context.params.cheie || "");
  if (!cheie || cheie.includes("/")) return new Response("Not found", { status: 404 });

  try {
    const rezultat = await stocareMedia().getWithMetadata(cheie, { type: "arrayBuffer" });
    if (!rezultat) return new Response("Not found", { status: 404 });
    const contentType = String(rezultat.metadata?.contentType || "application/octet-stream");
    return new Response(rezultat.data as ArrayBuffer, {
      headers: {
        "content-type": contentType,
        "cache-control": "public, max-age=31536000, immutable",
      },
    });
  } catch (e) {
    console.error("Nu am putut citi imaginea:", e);
    return new Response("Not found", { status: 404 });
  }
};

export const config: Config = {
  path: "/media/:cheie",
};
