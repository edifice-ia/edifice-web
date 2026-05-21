import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getOAuthProvider } from "@/lib/oauth/providers";
import { isTokenExchangeEnabled } from "@/lib/oauth/server";

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
  const isDebug = request.nextUrl.searchParams.get("debug") === "1";
  const tokenExchangeEnabled = isTokenExchangeEnabled(provider);
  const payload = {
    ok: true,
    provider: provider.key,
    receivedCode: Boolean(code),
    receivedState: Boolean(state),
    tokenExchangeEnabled,
    tokenStorageEnabled: false,
    message: tokenExchangeEnabled
      ? "Callback OAuth pret pour echange de token cote serveur. Stockage des tokens desactive."
      : "Callback OAuth placeholder. Aucun token n'est echange, stocke ou utilise pour publier.",
  };

  if (isDebug) {
    return Response.json(payload);
  }

  if (provider.key === "youtube" && code) {
    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL?.trim() || request.nextUrl.origin;
    const redirectTarget = new URL("/interface", appUrl);
    redirectTarget.searchParams.set("provider", "youtube");
    redirectTarget.searchParams.set("connected", "1");

    return NextResponse.redirect(redirectTarget);
  }

  return Response.json(payload);
}
