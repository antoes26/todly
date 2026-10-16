import { requireAuthService } from "../../../lib/auth-context";

export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams;
    const token_hash = params.get("token_hash");
    const type = params.get("type");
    if (token_hash && (type === "signup" || type === "recovery" || type === "email")) {
      const { client, config } = requireAuthService();
      const { error } = await client.auth.verifyOtp({ token_hash, type });
      if (!error) return Response.redirect(`${config.origin}${type === "recovery" ? "/auth/update-password" : "/"}`, 303);
    }
  } catch { /* Never reflect tokens in error responses. */ }
  return new Response(null, { status: 303, headers: { Location: "/?auth_error=expired" } });
}
