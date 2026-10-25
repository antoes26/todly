import { authContext, getAppUser } from "../lib/auth-context";
import { readState } from "../lib/task-store";
import { Dashboard } from "./todo-app";
import { AuthPanel } from "./auth-panel";
export const dynamic = "force-dynamic";
export default async function Home({ searchParams }: { searchParams: Promise<{ auth_error?: string }> }) {
  const user = await getAppUser();
  if (user) {
    // Read the tasks here, in the same request, so the page arrives already filled in. If it fails the browser loads them itself.
    const initial = await readState(user.userId).then(state => ({ tasks: state.tasks, areaSettings: { ...state.settings }, projects: state.projects }), error => { console.error("Todly initial tasks unavailable", error); return null; });
    return <Dashboard key={user.userId} displayName={user.fullName ?? user.email} initialTasks={initial?.tasks} initialAreaSettings={initial?.areaSettings} initialProjects={initial?.projects} />;
  }
  const params = await searchParams;
  const errors: Record<string, string> = {
    google: "Accesso con Google non riuscito. Riprova oppure usa email e password.",
    callback: "Accesso non completato. Riprova da questa pagina.",
    expired: "Il collegamento non è più valido. Richiedine uno nuovo.",
  };
  return <AuthPanel configured={Boolean(authContext().config)} initialError={errors[params.auth_error ?? ""] ?? ""} />;
}
