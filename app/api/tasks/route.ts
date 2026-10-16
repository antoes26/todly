import { env } from "cloudflare:workers";
import { getAppUser } from "../../../lib/auth-context";

export const dynamic = "force-dynamic";
function json(body: unknown, init: ResponseInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("Cache-Control", "private, no-store, max-age=0");
  headers.set("Vary", "Cookie");
  return Response.json(body, { ...init, headers });
}

type Task = {
  id: string; title: string; description: string; project: string; category: string;
  status: "Da iniziare" | "In corso" | "Completato"; priority: "Alta" | "Media" | "Bassa" | "Di routine";
  dueDate: string | null; sourceDate?: string | null; createdAt?: string; isImported?: boolean; deleted?: boolean; pinned?: boolean; archived?: boolean; completedOn?: string | null;
};
const todayInRome = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Rome", year:"numeric", month:"2-digit", day:"2-digit" }).format(new Date());
function database() { if (!env.DB) throw new Error("Salvataggio temporaneamente non disponibile."); return env.DB; }
async function save(userId: string, task: Task, id = task.id) {
  await database().prepare("INSERT INTO task_records (key, user_id, payload, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT(key) DO UPDATE SET payload = excluded.payload, updated_at = excluded.updated_at")
    .bind(`${userId}:${id}`, userId, JSON.stringify(task), new Date().toISOString()).run();
}

type AreaSettings = { pinned?: boolean; archived?: boolean; deleted?: boolean };
async function readState(userId: string) {
  const result = await database().prepare("SELECT payload, updated_at FROM task_records WHERE user_id = ?").bind(userId).all<{ payload: string; updated_at: string }>();
  const changes = new Map<string, { task: Task; updatedAt: string }>(), renames = new Map<string, string>();
  const settings: Record<string, AreaSettings> = Object.create(null);
  for (const row of result.results ?? []) try {
    const parsed = JSON.parse(row.payload);
    if (parsed.kind === "sectionRename" && parsed.from && parsed.to) renames.set(parsed.from, parsed.to);
    else if (parsed.kind === "areaSettings" && parsed.name) settings[parsed.name] = parsed.settings;
    else if (parsed.id) changes.set(parsed.id, { task: parsed, updatedAt: row.updated_at });
  } catch { /* Keep intact imported records available. */ }
  const resolve = (name: string) => { const seen = new Set<string>(); let value = name; while (renames.has(value) && !seen.has(value)) { seen.add(value); value = renames.get(value)!; } return value; };
  const tasks = new Map<string, Task>();
  for (const [id, saved] of changes) if (!saved.task.deleted) tasks.set(id, { ...saved.task, createdAt: saved.task.createdAt || saved.updatedAt, project: resolve(saved.task.project) });
  return { tasks: [...tasks.values()].filter(t => !settings[t.project]?.deleted).map(t => t.priority === "Di routine" && t.status === "Completato" && t.completedOn !== todayInRome() ? { ...t, status: "Da iniziare" as const, completedOn: null } : t), settings, renames, resolve };
}
function metadataStatement(userId: string, key: string, payload: unknown) {
  return database().prepare("INSERT INTO task_records (key, user_id, payload, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT(key) DO UPDATE SET payload = excluded.payload, updated_at = excluded.updated_at")
    .bind(`${userId}:${key}`, userId, JSON.stringify(payload), new Date().toISOString());
}
export async function GET() {
  const user = await getAppUser();
  if (!user) return json({ error: "Accedi per continuare." }, { status: 401 });
  try {
    const state = await readState(user.userId);
    return json({ tasks: state.tasks, areaSettings: state.settings });
  } catch (error) { console.error("TodlyCodex tasks unavailable", error); return json({ error: "Non riesco a caricare le attività. Riprova tra poco." }, { status: 503 }); }
}

export async function POST(request: Request) {
  const user = await getAppUser(); if (!user) return json({ error: "Accedi per continuare." }, { status: 401 });
  try {
    const payload = await request.json() as Partial<Task> & { action?: string; from?: string; to?: string; name?: string; value?: boolean };
    if (payload.action && ["renameProject", "pinProject", "archiveProject", "deleteProject"].includes(payload.action)) {
      const state = await readState(user.userId);
      const from = typeof payload.from === "string" ? payload.from.trim() : typeof payload.name === "string" ? payload.name.trim() : "";
      if (!state.tasks.some(t => t.project === from)) return json({ error: "Area non trovata." }, { status: 404 });
      const settings = { ...state.settings[from] };
      if (payload.action === "renameProject") {
        const to = typeof payload.to === "string" ? payload.to.trim() : "";
        if (!to || to.length > 80 || to === from || state.tasks.some(t => t.project === to) || state.settings[to]?.deleted) return json({ error: "Scegli un nome diverso, libero e di massimo 80 caratteri." }, { status: 400 });
        const aliases = new Map(state.renames);
        for (const [key] of aliases) if (state.resolve(key) === from) aliases.set(key, to);
        aliases.delete(to); aliases.set(from, to);
        const statements = [...aliases].map(([key, value]) => metadataStatement(user.userId, `section-name:${key}`, { kind: "sectionRename", from: key, to: value }));
        statements.push(database().prepare("DELETE FROM task_records WHERE key = ? AND user_id = ?").bind(`${user.userId}:section-name:${to}`, user.userId));
        statements.push(metadataStatement(user.userId, `area-settings:${to}`, { kind: "areaSettings", name: to, settings }));
        statements.push(database().prepare("DELETE FROM task_records WHERE key = ? AND user_id = ?").bind(`${user.userId}:area-settings:${from}`, user.userId));
        await database().batch(statements);
        return json({ project: to });
      }
      if (payload.action === "pinProject") settings.pinned = Boolean(payload.value);
      if (payload.action === "archiveProject") { settings.archived = Boolean(payload.value); settings.pinned = false; }
      if (payload.action === "deleteProject") settings.deleted = true;
      await metadataStatement(user.userId, `area-settings:${from}`, { kind: "areaSettings", name: from, settings }).run();
      return json({ ok: true });
    }
    const title = typeof payload.title === "string" ? payload.title.trim() : "";
    if (!title) return json({ error: "Inserisci il nome dell’attività." }, { status: 400 });
    const task: Task = { id: crypto.randomUUID(), title: title.slice(0, 180), description: typeof payload.description === "string" ? payload.description.trim().slice(0, 1200) : "", project: typeof payload.project === "string" && payload.project.trim() ? payload.project.trim().slice(0, 80) : "Personale", category: typeof payload.category === "string" ? payload.category.trim().slice(0, 80) : "", status: "Da iniziare", priority: payload.priority === "Alta" || payload.priority === "Bassa" || payload.priority === "Di routine" ? payload.priority : "Media", dueDate: typeof payload.dueDate === "string" && payload.dueDate ? payload.dueDate : null, createdAt: new Date().toISOString(), isImported: false };
    await save(user.userId, task); return json({ task }, { status: 201 });
  } catch (error) { console.error("TodlyCodex task save failed", error); return json({ error: "Non riesco a salvare l’attività. Riprova." }, { status: 503 }); }
}

export async function PATCH(request: Request) {
  const user = await getAppUser(); if (!user) return json({ error: "Accedi per continuare." }, { status: 401 });
  try {
    const payload = await request.json() as Partial<Task>;
    if (typeof payload.id !== "string" || typeof payload.title !== "string" || !payload.title.trim()) return json({ error: "Attività non valida." }, { status: 400 });
    const state = await readState(user.userId);
    const existing = state.tasks.find(t => t.id === payload.id);
    if (!existing) return json({ error: "Attività non trovata." }, { status: 404 });
    const task: Task = { id: payload.id, title: payload.title.trim().slice(0, 180), description: typeof payload.description === "string" ? payload.description.trim().slice(0, 1200) : "", project: typeof payload.project === "string" && payload.project.trim() ? payload.project.trim().slice(0, 80) : "Personale", category: typeof payload.category === "string" ? payload.category.trim().slice(0, 80) : "", status: payload.status === "In corso" || payload.status === "Completato" ? payload.status : "Da iniziare", priority: payload.priority === "Alta" || payload.priority === "Bassa" || payload.priority === "Di routine" ? payload.priority : "Media", dueDate: typeof payload.dueDate === "string" && payload.dueDate ? payload.dueDate : null, sourceDate: existing.sourceDate, createdAt: existing.createdAt, pinned: Boolean(payload.pinned), archived: Boolean(payload.archived), completedOn: payload.priority === "Di routine" && payload.status === "Completato" ? todayInRome() : null, isImported: existing.isImported };
    await save(user.userId, task); return json({ task });
  } catch (error) { console.error("TodlyCodex task update failed", error); return json({ error: "Non riesco a salvare la modifica. Riprova." }, { status: 503 }); }
}
export async function DELETE(request: Request) {
  const user = await getAppUser(); if (!user) return json({ error: "Accedi per continuare." }, { status: 401 });
  try { const { id } = await request.json() as { id?: string }; if (typeof id !== "string" || !id) return json({ error: "Attività non valida." }, { status: 400 }); const state = await readState(user.userId); if (!state.tasks.some(t => t.id === id)) return json({ error: "Attività non trovata." }, { status: 404 }); await save(user.userId, { id, title: "", description: "", project: "", category: "", status: "Da iniziare", priority: "Media", dueDate: null, deleted: true }); return json({ ok: true }); }
  catch (error) { console.error("TodlyCodex task delete failed", error); return json({ error: "Non riesco a eliminare l’attività. Riprova." }, { status: 503 }); }
}
