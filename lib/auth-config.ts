export type AuthConfig = { url: string; key: string; origin: string };

export function readAuthConfig(values: Record<string, unknown>): AuthConfig | null {
  const url = values.SUPABASE_URL;
  const key = values.SUPABASE_PUBLISHABLE_KEY;
  const origin = values.APP_URL;
  if (typeof url !== "string" || typeof key !== "string" || typeof origin !== "string" || !key) return null;
  try {
    const authUrl = new URL(url);
    const appUrl = new URL(origin);
    const local = ["localhost", "127.0.0.1", "[::1]"].includes(appUrl.hostname);
    if (authUrl.protocol !== "https:" || (appUrl.protocol !== "https:" && !(local && appUrl.protocol === "http:"))) return null;
    if (authUrl.username || authUrl.password || appUrl.username || appUrl.password || appUrl.pathname !== "/" || appUrl.search || appUrl.hash) return null;
    return { url: authUrl.origin, key, origin: appUrl.origin };
  } catch { return null; }
}

export function isSameOriginWrite(request: Request, origin: string): boolean {
  if (["GET", "HEAD", "OPTIONS"].includes(request.method)) return true;
  return request.headers.get("origin") === origin && request.headers.get("sec-fetch-site") !== "cross-site";
}
