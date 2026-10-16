"use client";
import { useState, type FormEvent } from "react";
type Mode = "signin" | "signup" | "reset" | "updatePassword";
export function AuthPanel({ configured, initialMode = "signin", initialError = "" }: { configured: boolean; initialMode?: Mode; initialError?: string }) {
  const [mode, setMode] = useState<Mode>(initialMode), [email, setEmail] = useState(""), [password, setPassword] = useState(""), [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false), [error, setError] = useState(initialError), [message, setMessage] = useState("");
  function changeMode(next: Mode) { setMode(next); setPassword(""); setConfirmation(""); setError(""); setMessage(""); }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setMessage("");
    if ((mode === "signup" || mode === "updatePassword") && password !== confirmation) { setError("Le password non coincidono."); return; }
    setBusy(true);
    try {
      const response = await fetch("/api/auth", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: mode, email, password }) });
      const data = await response.json() as { error?: string; ok?: boolean; message?: string };
      if (!response.ok) throw new Error(data.error || "Operazione non riuscita.");
      if (data.ok) { window.location.assign("/"); return; }
      setMessage(data.message || "Operazione completata."); setPassword(""); setConfirmation("");
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Connessione non disponibile. Riprova."); }
    finally { setBusy(false); }
  }
  const titles: Record<Mode, string> = { signin: "Fai spazio alle cose\nche contano.", signup: "Il tuo spazio,\nda oggi.", reset: "Ritrova l’accesso\nal tuo spazio.", updatePassword: "Scegli la tua\nnuova password." };
  const buttons: Record<Mode, string> = { signin: "Accedi", signup: "Crea account", reset: "Invia email di recupero", updatePassword: "Salva nuova password" };
  return <main className="login-page"><section className="login-card auth-card" aria-labelledby="auth-title">
    <div className="brand-mark large"><span className="brand-check">✓</span></div><p className="eyebrow">IL TUO SPAZIO PERSONALE</p>
    <h1 id="auth-title">{titles[mode].split("\n").map((line, i) => <span key={line}>{i > 0 && <br />}{line}</span>)}</h1>
    <p className="login-copy">{mode === "reset" ? "Ti invieremo un collegamento per scegliere una nuova password." : "Le tue attività e le tue aree di lavoro, visibili soltanto a te."}</p>
    {!configured && <p className="auth-message" role="status">L’accesso sarà disponibile a breve.</p>}
    {error && <p className="auth-error" role="alert">{error}</p>}{message && <p className="auth-message" role="status">{message}</p>}
    {(mode === "signin" || mode === "signup") && <><a href={configured && !busy ? "/auth/google" : undefined} className="auth-google" aria-disabled={!configured || busy}><span aria-hidden="true" className="google-letter">G</span>Accedi con Google</a><div className="auth-divider"><span>oppure con email</span></div></>}
    <form onSubmit={submit} className="auth-form"><fieldset disabled={!configured || busy}>
      {mode !== "updatePassword" && <label>Email<input type="email" name="email" autoComplete="email" required maxLength={254} value={email} onChange={e => setEmail(e.target.value)} /></label>}
      {mode !== "reset" && <label>{mode === "updatePassword" ? "Nuova password" : "Password"}<input type="password" name="password" autoComplete={mode === "signin" ? "current-password" : "new-password"} required minLength={12} maxLength={128} value={password} onChange={e => setPassword(e.target.value)} />{mode !== "signin" && <small>Almeno 12 caratteri.</small>}</label>}
      {(mode === "signup" || mode === "updatePassword") && <label>Ripeti password<input type="password" name="confirmation" autoComplete="new-password" required minLength={12} maxLength={128} value={confirmation} onChange={e => setConfirmation(e.target.value)} /></label>}
      <button type="submit" className="login-button">{busy ? "Un momento…" : buttons[mode]}</button>
    </fieldset></form>
    {!busy && <div className="auth-links">{mode === "signin" ? <><button onClick={() => changeMode("reset")}>Password dimenticata?</button><p>Non hai un account? <button onClick={() => changeMode("signup")}>Registrati</button></p></> : mode === "updatePassword" ? <a href="/">Torna alle attività</a> : <button onClick={() => changeMode("signin")}>Torna all’accesso</button>}</div>}
  </section><div className="login-foot">Todly <span>·</span> il tuo tempo, con più chiarezza</div></main>;
}
