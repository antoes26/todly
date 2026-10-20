import handler from "vinext/server/fetch-handler";
import { createServerClient, parseCookieHeader, serializeCookieHeader } from "@supabase/ssr";
import { readAuthConfig, isSameOriginWrite } from "./lib/auth-config";
import { runWithAuth } from "./lib/auth-context";

export default {
  async fetch(request: Request, env: Cloudflare.Env, ctx: ExecutionContext) {
    const config = readAuthConfig(env as unknown as Record<string, unknown>, request.url);
    const url = new URL(request.url);
    const protectedPath = url.pathname === "/" || url.pathname.startsWith("/api/") || url.pathname.startsWith("/auth/");
    if (!isSameOriginWrite(request, config?.origin ?? url.origin)) {
      return Response.json({ error: "Richiesta non autorizzata." }, { status: 403, headers: { "Cache-Control": "no-store" } });
    }
    const outgoingCookies: string[] = [];
    const jar = new Map(parseCookieHeader(request.headers.get("cookie") ?? "").map(c => [c.name, c.value ?? ""]));
    const client = config ? createServerClient(config.url, config.key, {
      cookies: {
        getAll: () => Array.from(jar, ([name, value]) => ({ name, value })),
        setAll: (updates) => {
          for (const { name, value, options } of updates) {
            jar.set(name, value);
            outgoingCookies.push(serializeCookieHeader(name, value, {
              ...options, httpOnly: true, secure: config.origin.startsWith("https:"), sameSite: "lax", path: "/",
            }));
          }
        },
      },
    }) : null;
    const response = await runWithAuth({ client, config }, () => handler.fetch(request, env, ctx));
    const headers = new Headers(response.headers);
    for (const cookie of outgoingCookies) headers.append("Set-Cookie", cookie);
    if (protectedPath || outgoingCookies.length) {
      headers.set("Cache-Control", "private, no-store, max-age=0");
      headers.set("Vary", "Cookie");
    }
    headers.set("X-Content-Type-Options", "nosniff");
    headers.set("Referrer-Policy", "no-referrer");
    headers.set("X-Frame-Options", "DENY");
    if (url.pathname === "/sw.js" || url.pathname === "/manifest.webmanifest") {
      headers.set("Cache-Control", "no-cache");
    }
    return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
  },
};

