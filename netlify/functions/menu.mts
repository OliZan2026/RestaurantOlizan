import type { Config } from "@netlify/functions";
import { json, eroare } from "../lib/http.mjs";
import { meniuPublic } from "../lib/menu.mjs";
import { starePublica, stareComenzi } from "../lib/stare.mjs";

export default async (req: Request) => {
  if (req.method !== "GET") return eroare("Metodă neacceptată.", 405);
  try {
    // Starea preluarii comenzilor calatoreste odata cu meniul: paginile o
    // primesc din aceeasi cerere pe care o fac oricum la pornire.
    const [date, stare] = await Promise.all([meniuPublic(), stareComenzi()]);
    return json({ ...date, comenzi: starePublica(stare) });
  } catch (e) {
    console.error("Nu am putut citi meniul:", e);
    return eroare("Meniul nu este disponibil momentan.", 503);
  }
};

export const config: Config = {
  path: "/api/menu",
};
