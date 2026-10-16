import { authContext, getAppUser, requireAuthService } from "../../../lib/auth-context";

export const dynamic = "force-dynamic";
const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "private, no-store" } });

export async function POST(request: Request) {
  if (!authContext().config) return json({ error: "Accesso temporaneamente non disponibile." }, 503);
  try {
    const { client, config } = requireAuthService();
    const body = await request.json() as Record<string, unknown>;
    const action = body.action;
    if (action === "signout") {
      const { error } = await client.auth.signOut({ scope: "local" });
      return error ? json({ error: "Uscita non riuscita. Riprova." }, 503) : json({ ok: true });
    }
    if (action === "updatePassword") {
      if (!await getAppUser()) return json({ error: "Il collegamento è scaduto. Richiedine uno nuovo." }, 401);
      const password = typeof body.password === "string" ? body.password : "";
      if (password.length < 12 || password.length > 128) return json({ error: "Usa una password da 12 a 128 caratteri." }, 400);
      const { error } = await client.auth.updateUser({ password });
      return error ? json({ error: "Non riesco ad aggiornare la password. Riprova." }, 400) : json({ ok: true });
    }
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: "Inserisci un indirizzo email valido." }, 400);
    if (action === "reset") {
      const { error } = await client.auth.resetPasswordForEmail(email, { redirectTo: `${config.origin}/auth/confirm` });
      // Same message for unknown and existing addresses; operational failures remain visible.
      if (error && (error.status === 429 || (error.status ?? 0) >= 500)) return json({ error: "Invio temporaneamente non disponibile. Riprova tra poco." }, 503);
      return json({ message: "Se l’indirizzo è associato a un account, riceverai un’email per scegliere una nuova password." });
    }
    const password = typeof body.password === "string" ? body.password : "";
    if (password.length < 12 || password.length > 128) return json({ error: "Usa una password da 12 a 128 caratteri." }, 400);
    if (action === "signin") {
      const { data, error } = await client.auth.signInWithPassword({ email, password });
      if (error || !data.user?.email_confirmed_at) return json({ error: "Email o password non corrette, oppure email da confermare." }, 401);
      return json({ ok: true });
    }
    if (action === "signup") {
      const { data, error } = await client.auth.signUp({ email, password, options: { emailRedirectTo: `${config.origin}/auth/confirm` } });
      if (error) return json({ error: "Registrazione non riuscita. Riprova o accedi se hai già un account." }, 400);
      return data.session ? json({ ok: true }) : json({ message: "Controlla la tua email per confermare la registrazione. Se hai già un account, accedi o recupera la password." });
    }
    return json({ error: "Operazione non valida." }, 400);
  } catch { return json({ error: "Operazione non riuscita. Riprova tra poco." }, 503); }
}
