export type AuthConfig = { url: string; key: string; origin: string };

// Cloudflare preview URLs look like <version-or-branch>-<worker host>, e.g. abc123-todly.example.workers.dev.
function isPreviewOf(app: URL, candidate: URL): boolean {
  if (!app.hostname.endsWith(".workers.dev") || candidate.protocol !== "https:" || candidate.port) return false;
  const suffix = `-${app.hostname}`;
  return candidate.hostname.endsWith(suffix) && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(candidate.hostname.slice(0, -suffix.length));
}

export function readAuthConfig(values: Record<string, unknown>, requestUrl?: string): AuthConfig | null {
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
    // Previews answer on their own host, so redirects and same-origin checks must use it; any other host keeps APP_URL.
    const current = requestUrl ? new URL(requestUrl) : null;
    const resolved = current && isPreviewOf(appUrl, current) ? current.origin : appUrl.origin;
    return { url: authUrl.origin, key, origin: resolved };
  } catch { return null; }
}

export function isSameOriginWrite(request: Request, origin: string): boolean {
  if (["GET", "HEAD", "OPTIONS"].includes(request.method)) return true;
  return request.headers.get("origin") === origin && request.headers.get("sec-fetch-site") !== "cross-site";
}
