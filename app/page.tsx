import { authContext, getAppUser } from "../lib/auth-context";
import { Dashboard } from "./todo-app";
import { AuthPanel } from "./auth-panel";
export const dynamic = "force-dynamic";
export default async function Home({ searchParams }: { searchParams: Promise<{ auth_error?: string }> }) {
  const user = await getAppUser();
  if (user) return <Dashboard key={user.userId} displayName={user.fullName ?? user.email} />;
  const params = await searchParams;
  const errors: Record<string, string> = {
    google: "Accesso con Google non riuscito. Riprova oppure usa email e password.",
    callback: "Accesso non completato. Riprova da questa pagina.",
    expired: "Il collegamento non è più valido. Richiedine uno nuovo.",
  };
  return <AuthPanel configured={Boolean(authContext().config)} initialError={errors[params.auth_error ?? ""] ?? ""} />;
}
