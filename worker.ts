import handler from "vinext/server/fetch-handler";
import { createServerClient, parseCookieHeader, serializeCookieHeader } from "@supabase/ssr";
import { readAuthConfig, isSameOriginWrite } from "./lib/auth-config";
import { runWithAuth } from "./lib/auth-context";

/** Reads the user id from the Supabase session cookie WITHOUT verifying it. Used only to start reading data in parallel with the real check. */
function peekSessionUserId(jar: Map<string, string>): string | null {
  try {
    const parts = [...jar.keys()].filter(name => /^sb-.+-auth-token(\.\d+)?$/.test(name)).sort((a, b) => Number(a.split(".").pop()) - Number(b.split(".").pop()));
    if (!parts.length) return null;
    let raw = parts.map(name => jar.get(name) ?? "").join("");
    const fromB64 = (value: string) => atob(value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "="));
    if (raw.startsWith("base64-")) raw = new TextDecoder().decode(Uint8Array.from(fromB64(raw.slice(7)), c => c.charCodeAt(0)));
    const token = JSON.parse(raw)?.access_token;
    if (typeof token !== "string") return null;
    const sub = JSON.parse(fromB64(token.split(".")[1] ?? ""))?.sub;
    return typeof sub === "string" ? sub : null;
  } catch { return null; }
}

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
    const response = await runWithAuth({ client, config, peekUserId: url.pathname === "/" || url.pathname === "/api/tasks" ? peekSessionUserId(jar) : null }, () => handler.fetch(request, env, ctx));
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

