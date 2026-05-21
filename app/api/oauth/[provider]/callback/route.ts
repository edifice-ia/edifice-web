import type { NextRequest } from "next/server";
import { getOAuthProvider } from "@/lib/oauth/providers";

export async function GET(
  request: NextRequest,
  context: RouteContext<"/api/oauth/[provider]/callback">,
) {
  const { provider: providerKey } = await context.params;
  const provider = getOAuthProvider(providerKey);

  if (!provider) {
    return Response.json(
      { ok: false, error: "Unsupported OAuth provider." },
      { status: 404 },
    );
  }

  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");

  return Response.json({
    ok: true,
    provider: provider.key,
    receivedCode: Boolean(code),
    receivedState: Boolean(state),
    tokenExchangeEnabled: false,
    tokenStorageEnabled: false,
    message:
      "Callback OAuth placeholder. Aucun token n'est echange, stocke ou utilise pour publier.",
  });
}
