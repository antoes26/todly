import { requireAuthService } from "../../../lib/auth-context";

export async function GET() {
  try {
    const { client, config } = requireAuthService();
    const { data, error } = await client.auth.signInWithOAuth({
      provider: "google", options: { redirectTo: `${config.origin}/auth/callback`, skipBrowserRedirect: true },
    });
    if (!error && data.url) return Response.redirect(data.url, 303);
  } catch { /* Configuration or upstream failure. */ }
  return new Response(null, { status: 303, headers: { Location: "/?auth_error=google" } });
}
