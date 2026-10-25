"use client";

import { useEffect, useState } from "react";
import { Dashboard } from "./todo-app";
import { AuthPanel } from "./auth-panel";

type Loaded = { userId: string; displayName: string; tasks: never[]; areaSettings: Record<string, never>; projects: never[] };
type BootState = { kind: "loading" } | { kind: "ready"; data: Loaded } | { kind: "signin" } | { kind: "error"; message: string };

/* Ask for the tasks as soon as this code arrives in the browser, even before the page finishes starting up. */
function request(): Promise<BootState> {
  return fetch("/api/tasks", { cache: "no-store" }).then(async response => {
    if (response.status === 401) return { kind: "signin" } as const;
    const data = await response.json() as Loaded & { error?: string };
    if (!response.ok || !data.userId) return { kind: "error", message: data.error || "Non riesco a caricare le attività. Riprova tra poco." } as const;
    return { kind: "ready", data } as const;
  }, () => ({ kind: "error", message: "Connessione non disponibile. Riprova." } as const));
}
let early: Promise<BootState> | null = typeof window === "undefined" ? null : request();

/** Shows Todly straight away and fills it in as soon as the tasks arrive, instead of a blank screen while the server works. */
export function AppBoot() {
  const [state, setState] = useState<BootState>({ kind: "loading" });
  useEffect(() => {
    let active = true;
    const pending = early ?? request();
    early = null;
    void pending.then(next => { if (active) setState(next); });
    return () => { active = false; };
  }, []);
  if (state.kind === "ready") {
    const d = state.data;
    return <Dashboard key={d.userId} displayName={d.displayName} initialTasks={d.tasks} initialAreaSettings={d.areaSettings} initialProjects={d.projects} />;
  }
  if (state.kind === "signin") return <AuthPanel configured />;
  return <div className="boot-splash" role="status" aria-live="polite">
    <span className="brand-mark large"><span className="brand-check">✓</span></span>
    {state.kind === "error"
      ? <><p>{state.message}</p><button type="button" onClick={() => { setState({ kind: "loading" }); void request().then(setState); }}>Riprova</button></>
      : <span className="boot-label">Todly</span>}
  </div>;
}
