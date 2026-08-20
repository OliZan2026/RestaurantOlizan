// Datele publice ale secțiunii „Închiriere sală": textul de prezentare, cele
// patru fotografii și zilele deja ocupate din calendar.
// Cererea de rezervare nu trece pe aici: ea pleacă direct pe WhatsApp, la fel
// ca o comandă, iar ziua rămâne liberă până când administratorul o marchează.
import type { Config } from "@netlify/functions";
import { eroare, json } from "../lib/http.mjs";
import { DESCRIERE_IMPLICITA, salaPublica } from "../lib/sala.mjs";

export default async (req: Request) => {
  if (req.method !== "GET") return eroare("Metodă neacceptată.", 405);
  try {
    return json(await salaPublica());
  } catch (e) {
    console.error("Nu am putut citi datele sălii:", e);
    // Pagina trebuie să rămână utilizabilă și fără bază de date: textul implicit
    // și un calendar fără zile ocupate sunt mai bune decât o secțiune goală.
    return json({ descriere: DESCRIERE_IMPLICITA, imagini: [], ocupate: [], azi: "" });
  }
};

export const config: Config = {
  path: "/api/sala",
};
