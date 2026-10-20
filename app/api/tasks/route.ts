import { getAppUser } from "../../../lib/auth-context";
import { database, metadataStatement, readState, readTask, save, todayInRome, type AreaSettings, type Task } from "../../../lib/task-store";

export const dynamic = "force-dynamic";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function json(body: unknown, init: ResponseInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("Cache-Control", "private, no-store, max-age=0");
  headers.set("Vary", "Cookie");
  return Response.json(body, { ...init, headers });
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
    const payload = await request.json() as Partial<Task> & { action?: string; from?: string; to?: string; name?: string; value?: boolean; color?: string };
    if (payload.action === "createProject") {
      const name = typeof payload.name === "string" ? payload.name.trim() : "";
      if (!name || name.length > 80 || name === "Tutte le aree") return json({ error: "Inserisci un nome di massimo 80 caratteri." }, { status: 400 });
      if (typeof payload.color !== "string" || !/^#[0-9a-f]{6}$/i.test(payload.color)) return json({ error: "Scegli un colore valido." }, { status: 400 });
      const state = await readState(user.userId);
      // Reserve historical names as well: reusing aliases or tombstones could revive old tasks.
      if (state.tasks.some(t => t.project.toLocaleLowerCase("it") === name.toLocaleLowerCase("it")) || Object.keys(state.settings).some(n => n.toLocaleLowerCase("it") === name.toLocaleLowerCase("it")) || [...state.renames.keys()].some(n => n.toLocaleLowerCase("it") === name.toLocaleLowerCase("it"))) return json({ error: "Questo nome è già utilizzato. Scegline un altro." }, { status: 409 });
      const settings: AreaSettings = { color: payload.color.toLowerCase() };
      await metadataStatement(user.userId, `area-settings:${name}`, { kind: "areaSettings", name, settings }).run();
      return json({ project: name, settings }, { status: 201 });
    }
    if (payload.action && ["renameProject", "pinProject", "archiveProject", "deleteProject"].includes(payload.action)) {
      const state = await readState(user.userId);
      const from = typeof payload.from === "string" ? payload.from.trim() : typeof payload.name === "string" ? payload.name.trim() : "";
      if (state.settings[from]?.deleted || (!state.settings[from] && !state.tasks.some(t => t.project === from))) return json({ error: "Area non trovata." }, { status: 404 });
      const settings = { ...state.settings[from] };
      if (payload.action === "renameProject") {
        const to = typeof payload.to === "string" ? payload.to.trim() : "";
        if (!to || to.length > 80 || to === from || state.tasks.some(t => t.project === to) || Object.hasOwn(state.settings, to) || state.renames.has(to)) return json({ error: "Scegli un nome diverso, libero e di massimo 80 caratteri." }, { status: 400 });
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
    const task: Task = { id: typeof payload.id === "string" && UUID.test(payload.id) ? payload.id : crypto.randomUUID(), title: title.slice(0, 180), description: typeof payload.description === "string" ? payload.description.trim().slice(0, 1200) : "", project: typeof payload.project === "string" && payload.project.trim() ? payload.project.trim().slice(0, 80) : "Personale", category: typeof payload.category === "string" ? payload.category.trim().slice(0, 80) : "", status: "Da iniziare", priority: payload.priority === "Alta" || payload.priority === "Bassa" || payload.priority === "Di routine" ? payload.priority : "Media", dueDate: typeof payload.dueDate === "string" && payload.dueDate ? payload.dueDate : null, createdAt: new Date().toISOString(), isImported: false };
    await save(user.userId, task); return json({ task }, { status: 201 });
  } catch (error) { console.error("TodlyCodex task save failed", error); return json({ error: "Non riesco a salvare l’attività. Riprova." }, { status: 503 }); }
}

export async function PATCH(request: Request) {
  const user = await getAppUser(); if (!user) return json({ error: "Accedi per continuare." }, { status: 401 });
  try {
    const payload = await request.json() as Partial<Task>;
    if (typeof payload.id !== "string" || typeof payload.title !== "string" || !payload.title.trim()) return json({ error: "Attività non valida." }, { status: 400 });
    const existing = await readTask(user.userId, payload.id);
    if (!existing) return json({ error: "Attività non trovata." }, { status: 404 });
    const task: Task = { id: payload.id, title: payload.title.trim().slice(0, 180), description: typeof payload.description === "string" ? payload.description.trim().slice(0, 1200) : "", project: typeof payload.project === "string" && payload.project.trim() ? payload.project.trim().slice(0, 80) : "Personale", category: typeof payload.category === "string" ? payload.category.trim().slice(0, 80) : "", status: payload.status === "In corso" || payload.status === "Completato" ? payload.status : "Da iniziare", priority: payload.priority === "Alta" || payload.priority === "Bassa" || payload.priority === "Di routine" ? payload.priority : "Media", dueDate: typeof payload.dueDate === "string" && payload.dueDate ? payload.dueDate : null, sourceDate: existing.sourceDate, createdAt: existing.createdAt, pinned: Boolean(payload.pinned), archived: Boolean(payload.archived), completedOn: payload.priority === "Di routine" && payload.status === "Completato" ? todayInRome() : null, isImported: existing.isImported };
    await save(user.userId, task); return json({ task });
  } catch (error) { console.error("TodlyCodex task update failed", error); return json({ error: "Non riesco a salvare la modifica. Riprova." }, { status: 503 }); }
}
export async function DELETE(request: Request) {
  const user = await getAppUser(); if (!user) return json({ error: "Accedi per continuare." }, { status: 401 });
  try { const { id } = await request.json() as { id?: string }; if (typeof id !== "string" || !id) return json({ error: "Attività non valida." }, { status: 400 }); if (!await readTask(user.userId, id)) return json({ error: "Attività non trovata." }, { status: 404 }); await save(user.userId, { id, title: "", description: "", project: "", category: "", status: "Da iniziare", priority: "Media", dueDate: null, deleted: true }); return json({ ok: true }); }
  catch (error) { console.error("TodlyCodex task delete failed", error); return json({ error: "Non riesco a eliminare l’attività. Riprova." }, { status: 503 }); }
}
