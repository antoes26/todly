import { authContext, getAppUser } from "../lib/auth-context";
import { readState } from "../lib/task-store";
import { Dashboard } from "./todo-app";
import { AuthPanel } from "./auth-panel";
import { AppBoot } from "./app-boot";
export const dynamic = "force-dynamic";
export default async function Home({ searchParams }: { searchParams: Promise<{ auth_error?: string }> }) {
  // With a saved session the page is sent back immediately and the browser loads the tasks: no blank screen while identity and data are checked.
  // The tasks themselves still go through the full identity check in /api/tasks.
  if (authContext().client && authContext().peekUserId) return <AppBoot />;
  // Start reading the data at the same time as the identity check instead of after it: the two network trips overlap and the page opens sooner.
  // The early read uses the id from the session cookie and is used only if the verified user turns out to be the same person.
  const peekId = authContext().peekUserId;
  const early = peekId ? readState(peekId) : null;
  early?.catch(() => undefined);
  const user = await getAppUser();
  if (user) {
    // Read the tasks here, in the same request, so the page arrives already filled in. If it fails the browser loads them itself.
    const initial = await (early && peekId === user.userId ? early : readState(user.userId)).then(state => ({ tasks: state.tasks, areaSettings: { ...state.settings }, projects: state.projects, areaOrder: state.areaOrder }), error => { console.error("Todly initial tasks unavailable", error); return null; });
    return <Dashboard key={user.userId} displayName={user.fullName ?? user.email} initialTasks={initial?.tasks} initialAreaSettings={initial?.areaSettings} initialProjects={initial?.projects} initialAreaOrder={initial?.areaOrder} />;
  }
  const params = await searchParams;
  const errors: Record<string, string> = {
    google: "Accesso con Google non riuscito. Riprova oppure usa email e password.",
    callback: "Accesso non completato. Riprova da questa pagina.",
    expired: "Il collegamento non è più valido. Richiedine uno nuovo.",
  };
  return <AuthPanel configured={Boolean(authContext().config)} initialError={errors[params.auth_error ?? ""] ?? ""} />;
}
