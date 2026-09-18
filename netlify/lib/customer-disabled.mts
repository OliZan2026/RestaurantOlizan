// Retired customer routes never read the database or accept an existing session.
// Only the customer cookie is expired; administrator authentication is separate.
export function customerDisabled(req: Request, anonymous = false) {
  const secure = new URL(req.url).protocol === "https:" ? "; Secure" : "";
  return new Response(JSON.stringify(anonymous
    ? { autentificat: false, client: null }
    : { eroare: "Conturile clienților nu mai sunt disponibile. Poți comanda fără cont.", conturiDezactivate: true }), {
    status: anonymous ? 200 : 410,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "set-cookie": "olizan_client=; Path=/; HttpOnly; SameSite=Lax" + secure + "; Max-Age=0"
    }
  });
}
