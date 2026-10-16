import { AsyncLocalStorage } from "node:async_hooks";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AuthConfig } from "./auth-config";

export type AppUser = { userId: string; email: string; fullName: string | null };
type AuthContext = {
  client: SupabaseClient | null;
  config: AuthConfig | null;
  user?: Promise<AppUser | null>;
};
const context = new AsyncLocalStorage<AuthContext>();

export function runWithAuth<T>(value: AuthContext, operation: () => T): T {
  return context.run(value, operation);
}

export function authContext(): AuthContext {
  const value = context.getStore();
  if (!value) throw new Error("Authentication request context unavailable");
  return value;
}

export async function getAppUser(): Promise<AppUser | null> {
  const value = authContext();
  if (!value.client) return null;
  // Never trust user IDs from cookies, request bodies, or proxy headers.
  value.user ??= value.client.auth.getUser().then(({ data, error }) => {
    if (error || !data.user?.email || !data.user.email_confirmed_at) return null;
    const name = data.user.user_metadata?.full_name;
    return { userId: data.user.id, email: data.user.email, fullName: typeof name === "string" ? name : null };
  });
  return value.user;
}

export function requireAuthService() {
  const value = authContext();
  if (!value.client || !value.config) throw new Error("Authentication is not configured");
  return { client: value.client, config: value.config };
}
