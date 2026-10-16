import { requireAuthService } from "../../../lib/auth-context";

export async function GET(request: Request) {
  try {
    const code = new URL(request.url).searchParams.get("code");
    if (code) {
      const { client, config } = requireAuthService();
      const { error } = await client.auth.exchangeCodeForSession(code);
      if (!error) return Response.redirect(`${config.origin}/`, 303);
    }
  } catch { /* Never reflect provider errors or tokens. */ }
  return new Response(null, { status: 303, headers: { Location: "/?auth_error=callback" } });
}
