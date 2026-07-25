import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getOAuthProvider, getRequiredEnvNames } from "@/lib/oauth/providers";
import {
  createYouTubeOAuthState,
  YOUTUBE_STATE_COOKIE,
  YOUTUBE_STATE_MAX_AGE_SECONDS,
} from "@/lib/server/oauth/youtube-state";
import {
  createCalendarOAuthState,
  CALENDAR_STATE_COOKIE,
  CALENDAR_STATE_MAX_AGE_SECONDS,
} from "@/lib/server/oauth/calendar-state";
import { resolveCalendarRedirectUri } from "@/lib/server/oauth/calendar-redirect";
import {
  buildOAuthStartUrl,
  getOAuthConfigState,
  isTokenExchangeEnabled,
} from "@/lib/oauth/server";
import { canAccessPrivateCockpit } from "@/src/lib/auth/roles";
import { getCurrentUser } from "@/src/lib/supabase/server";

const SIGNED_STATE_PROVIDERS = new Set(["youtube", "calendar"]);

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

  const requiresSignedState = SIGNED_STATE_PROVIDERS.has(provider.key);
  let signedStateUser: Awaited<ReturnType<typeof getCurrentUser>> = null;

  if (requiresSignedState) {
    signedStateUser = await getCurrentUser();
    if (!signedStateUser || !canAccessPrivateCockpit(signedStateUser)) {
      return NextResponse.json({ error: "Acces refuse." }, { status: 403 });
    }
  }

  const signedState =
    requiresSignedState && signedStateUser
      ? provider.key === "youtube"
        ? createYouTubeOAuthState(signedStateUser.id)
        : createCalendarOAuthState(signedStateUser.id)
      : undefined;
  const authorizationUrl = buildOAuthStartUrl(
    provider,
    signedState ?? undefined,
    provider.key === "calendar"
      ? { redirectUriOverride: resolveCalendarRedirectUri(request) }
      : undefined,
  );
  const isTest = request.nextUrl.searchParams.get("mode") === "test";
  const isDebug = request.nextUrl.searchParams.get("debug") === "1";
  const tokenExchangeEnabled = isTokenExchangeEnabled(provider);

  if (isTest || isDebug) {
    if (!requiresSignedState) {
      const diagnosticUser = await getCurrentUser();
      if (!diagnosticUser || !canAccessPrivateCockpit(diagnosticUser)) {
        return NextResponse.json({ error: "Acces refuse." }, { status: 403 });
      }
    }

    return Response.json({
      ok: true,
      provider: provider.key,
      configured: true,
      authorizationUrl,
      authorizationUrlPrepared: Boolean(authorizationUrl),
      tokenExchangeEnabled,
      tokenStorageEnabled: true,
      message: tokenExchangeEnabled
        ? "Configuration presente. Echange de token active cote serveur, stockage des tokens active."
        : "Configuration presente. Aucun token n'est echange ni stocke.",
    });
  }

  if (requiresSignedState) {
    if (!authorizationUrl || !signedState) {
      return Response.json(
        {
          ok: false,
          provider: provider.key,
          error: "authorization_url_or_state_unavailable",
        },
        { status: 500 },
      );
    }

    const stateCookieName =
      provider.key === "youtube" ? YOUTUBE_STATE_COOKIE : CALENDAR_STATE_COOKIE;
    const stateMaxAge =
      provider.key === "youtube"
        ? YOUTUBE_STATE_MAX_AGE_SECONDS
        : CALENDAR_STATE_MAX_AGE_SECONDS;

    const response = NextResponse.redirect(authorizationUrl);
    response.cookies.set(stateCookieName, signedState, {
      httpOnly: true,
      secure: request.nextUrl.protocol === "https:",
      sameSite: "lax",
      maxAge: stateMaxAge,
      path: `/api/oauth/${provider.key}`,
    });

    return response;
  }

  return Response.json({
    ok: true,
    provider: provider.key,
    authorizationUrl,
    tokenExchangeEnabled,
    tokenStorageEnabled: true,
    message:
      "URL OAuth preparee. Redirection et stockage de state a securiser avant activation reelle.",
  });
}
