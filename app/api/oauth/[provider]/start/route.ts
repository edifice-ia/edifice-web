import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getOAuthProvider, getRequiredEnvNames } from "@/lib/oauth/providers";
import {
  createYouTubeOAuthState,
  YOUTUBE_STATE_COOKIE,
  YOUTUBE_STATE_MAX_AGE_SECONDS,
} from "@/lib/server/oauth/youtube-state";
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

  const youtubeState =
    provider.key === "youtube" ? createYouTubeOAuthState() : undefined;
  const authorizationUrl = buildOAuthStartUrl(
    provider,
    youtubeState ?? undefined,
  );
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
    if (!authorizationUrl || !youtubeState) {
      return Response.json(
        {
          ok: false,
          provider: provider.key,
          error: "authorization_url_or_state_unavailable",
        },
        { status: 500 },
      );
    }

    const response = NextResponse.redirect(authorizationUrl);
    response.cookies.set(YOUTUBE_STATE_COOKIE, youtubeState, {
      httpOnly: true,
      secure: request.nextUrl.protocol === "https:",
      sameSite: "lax",
      maxAge: YOUTUBE_STATE_MAX_AGE_SECONDS,
      path: "/api/oauth/youtube",
    });

    return response;
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
