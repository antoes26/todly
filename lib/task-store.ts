import { env } from "cloudflare:workers";

export type Task = {
  id: string; title: string; description: string; project: string; category: string; projectId?: string | null;
  status: "Da iniziare" | "In corso" | "Completato"; priority: "Alta" | "Media" | "Bassa" | "Di routine";
  dueDate: string | null; sourceDate?: string | null; createdAt?: string; isImported?: boolean; deleted?: boolean; pinned?: boolean; archived?: boolean; completedOn?: string | null;
};
export const todayInRome = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Rome", year:"numeric", month:"2-digit", day:"2-digit" }).format(new Date());
export function database() { if (!env.DB) throw new Error("Salvataggio temporaneamente non disponibile."); return env.DB; }
export async function save(userId: string, task: Task, id = task.id) {
  await database().prepare("INSERT INTO task_records (key, user_id, payload, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT(key) DO UPDATE SET payload = excluded.payload, updated_at = excluded.updated_at")
    .bind(`${userId}:${id}`, userId, JSON.stringify(task), new Date().toISOString()).run();
}

export type TodlyProject = { id: string; name: string; description: string; createdAt: string; deleted?: boolean };
export type AreaSettings = { pinned?: boolean; archived?: boolean; deleted?: boolean; color?: string };
export async function readState(userId: string) {
  const result = await database().prepare("SELECT payload, updated_at FROM task_records WHERE user_id = ?").bind(userId).all<{ payload: string; updated_at: string }>();
  const changes = new Map<string, { task: Task; updatedAt: string }>(), renames = new Map<string, string>();
  const settings: Record<string, AreaSettings> = Object.create(null); const projects: TodlyProject[] = [];
  for (const row of result.results ?? []) try {
    const parsed = JSON.parse(row.payload);
    if (parsed.kind === "todlyProject" && parsed.id) { if (!parsed.deleted) projects.push(parsed as TodlyProject); }
    else if (parsed.kind === "sectionRename" && parsed.from && parsed.to) renames.set(parsed.from, parsed.to);
    else if (parsed.kind === "areaSettings" && parsed.name) settings[parsed.name] = parsed.settings;
    else if (parsed.id) changes.set(parsed.id, { task: parsed, updatedAt: row.updated_at });
  } catch { /* Keep intact imported records available. */ }
  const resolve = (name: string) => { const seen = new Set<string>(); let value = name; while (renames.has(value) && !seen.has(value)) { seen.add(value); value = renames.get(value)!; } return value; };
  const tasks = new Map<string, Task>();
  for (const [id, saved] of changes) if (!saved.task.deleted) tasks.set(id, { ...saved.task, createdAt: saved.task.createdAt || saved.updatedAt, project: resolve(saved.task.project) });
  return { projects, tasks: [...tasks.values()].filter(t => !settings[t.project]?.deleted).map(t => t.priority === "Di routine" && t.status === "Completato" && t.completedOn !== todayInRome() ? { ...t, status: "Da iniziare" as const, completedOn: null } : t), settings, renames, resolve };
}
export function metadataStatement(userId: string, key: string, payload: unknown) {
  return database().prepare("INSERT INTO task_records (key, user_id, payload, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT(key) DO UPDATE SET payload = excluded.payload, updated_at = excluded.updated_at")
    .bind(`${userId}:${key}`, userId, JSON.stringify(payload), new Date().toISOString());
}
/** Reads a single task by its key. Much cheaper than readState(): one indexed lookup instead of every record of the account. Returns null when the task is missing, deleted or not a task record. */
export async function readTask(userId: string, id: string): Promise<Task | null> {
  const result = await database().prepare("SELECT payload, updated_at FROM task_records WHERE key = ? AND user_id = ?").bind(`${userId}:${id}`, userId).all<{ payload: string; updated_at: string }>();
  const row = result.results?.[0];
  if (row) {
    try {
      const parsed = JSON.parse(row.payload);
      if (parsed && parsed.id === id && !parsed.kind) return parsed.deleted ? null : { ...parsed, createdAt: parsed.createdAt || row.updated_at } as Task;
    } catch { /* fall through to the full scan below */ }
  }
  // Records imported under a different key (or unreadable ones) keep working through the full scan.
  return (await readState(userId)).tasks.find(t => t.id === id) ?? null;
}
