import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getOAuthProvider, getRequiredEnvNames } from "@/lib/oauth/providers";
import {
  buildOAuthStartUrl,
  getOAuthConfigState,
  isTokenExchangeEnabled,
} from "@/lib/oauth/server";

export async function GET(
  request: NextRequest,
  context: RouteContext<"/api/oauth/[provider]/start">,
) {
  const { provider: providerKey } = await context.params;
  const provider = getOAuthProvider(providerKey);

  if (!provider) {
    return Response.json(
      { ok: false, error: "Unsupported OAuth provider." },
      { status: 404 },
    );
  }

  const state = getOAuthConfigState(provider);

  if (!state.configured) {
    return Response.json(
      {
        ok: false,
        provider: provider.key,
        error: "OAuth configuration is incomplete.",
        missing: state.missing,
        required: getRequiredEnvNames(provider),
      },
      { status: 400 },
    );
  }

  const authorizationUrl = buildOAuthStartUrl(provider);
  const isTest = request.nextUrl.searchParams.get("mode") === "test";
  const isDebug = request.nextUrl.searchParams.get("debug") === "1";
  const tokenExchangeEnabled = isTokenExchangeEnabled(provider);

  if (isTest || isDebug) {
    return Response.json({
      ok: true,
      provider: provider.key,
      configured: true,
      authorizationUrl,
      authorizationUrlPrepared: Boolean(authorizationUrl),
      tokenExchangeEnabled,
      tokenStorageEnabled: false,
      message: tokenExchangeEnabled
        ? "Configuration presente. Echange de token active cote serveur, stockage des tokens desactive."
        : "Configuration presente. Aucun token n'est echange ni stocke.",
    });
  }

  if (provider.key === "youtube") {
    if (!authorizationUrl) {
      return Response.json(
        {
          ok: false,
          provider: provider.key,
          error: "authorization_url_unavailable",
        },
        { status: 500 },
      );
    }

    return NextResponse.redirect(authorizationUrl);
  }

  return Response.json({
    ok: true,
    provider: provider.key,
    authorizationUrl,
    tokenExchangeEnabled,
    tokenStorageEnabled: false,
    message:
      "URL OAuth preparee. Redirection et stockage de state a securiser avant activation reelle.",
  });
}
