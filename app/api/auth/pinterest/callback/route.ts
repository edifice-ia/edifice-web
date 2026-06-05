import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { buildAbsoluteOAuthReturnUrl } from "@/lib/server/oauth/oauth-redirects";
import {
  PINTEREST_STATE_COOKIE,
  verifyPinterestOAuthState,
} from "@/lib/server/oauth/pinterest-state";
import { saveOAuthToken } from "@/lib/server/oauth/token-store";
import { canAccessPrivateCockpit } from "@/src/lib/auth/roles";
import { getCurrentUser } from "@/src/lib/supabase/server";

const PINTEREST_TOKEN_URL = "https://api.pinterest.com/v5/oauth/token";
const PINTEREST_REDIRECT_URI = "https://www.edificeia.com/api/auth/pinterest/callback";

type PinterestTokenResponse = {
  access_token?: string;
  refresh_token?: string;
  token_type?: string;
  expires_in?: number;
  refresh_token_expires_in?: number;
  scope?: string;
  error?: string;
  message?: string;
};

function redirectToConnections(request: NextRequest, connected: boolean, error?: string) {
  const target = buildAbsoluteOAuthReturnUrl(request, "pinterest", connected, error);
  const response = NextResponse.redirect(target);
  response.cookies.set(PINTEREST_STATE_COOKIE, "", {
    httpOnly: true,
    secure: request.nextUrl.protocol === "https:",
    sameSite: "lax",
    maxAge: 0,
    path: "/api/auth/pinterest",
  });
  return response;
}

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !canAccessPrivateCockpit(user)) {
    return redirectToConnections(request, false, "access_denied");
  }

  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const oauthError = request.nextUrl.searchParams.get("error");
  const cookieState = request.cookies.get(PINTEREST_STATE_COOKIE)?.value ?? null;
  const stateValid =
    Boolean(state && cookieState && state === cookieState) &&
    verifyPinterestOAuthState(state, user.id);

  console.info("[Pinterest OAuth Callback] Callback recu", {
    codePresent: Boolean(code),
    stateValid,
    oauthErrorPresent: Boolean(oauthError),
  });

  if (oauthError || !code || !stateValid) {
    console.info("[Pinterest OAuth Callback] token stocke", { stored: false });
    return redirectToConnections(request, false, oauthError ? "refused" : "oauth");
  }

  const clientId = process.env.PINTEREST_CLIENT_ID?.trim();
  const clientSecret = process.env.PINTEREST_CLIENT_SECRET?.trim();
  const redirectUri = process.env.PINTEREST_REDIRECT_URI?.trim();
  if (!clientId || !clientSecret || redirectUri !== PINTEREST_REDIRECT_URI) {
    console.warn("[Pinterest OAuth Callback] configuration incomplete ou redirect URI incorrecte", {
      redirectUri,
      expectedRedirectUri: PINTEREST_REDIRECT_URI,
    });
    return redirectToConnections(request, false, "missing_env");
  }

  try {
    const tokenResponse = await fetch(PINTEREST_TOKEN_URL, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
        continuous_refresh: "true",
      }),
      cache: "no-store",
    });
    const tokenPayload = (await tokenResponse.json()) as PinterestTokenResponse;

    console.info("[Pinterest OAuth Callback] echange de token termine", {
      success: Boolean(tokenResponse.ok && tokenPayload.access_token),
      status: tokenResponse.status,
      refreshTokenPresent: Boolean(tokenPayload.refresh_token),
    });

    if (!tokenResponse.ok || !tokenPayload.access_token) {
      console.warn("[Pinterest OAuth Callback] echec echange token", {
        status: tokenResponse.status,
        error: tokenPayload.error ?? tokenPayload.message ?? "unknown",
      });
      return redirectToConnections(request, false, "token_exchange");
    }

    console.info("[Pinterest OAuth Callback] Echange de token reussi", {
      success: true,
    });
    await saveOAuthToken(
      "pinterest",
      {
        access_token: tokenPayload.access_token,
        refresh_token: tokenPayload.refresh_token,
        token_type: tokenPayload.token_type,
        expires_in: tokenPayload.expires_in,
        refresh_expires_in: tokenPayload.refresh_token_expires_in,
        scope: tokenPayload.scope,
      },
      user.id,
    );

    console.info("[Pinterest OAuth Callback] Token stocke", { stored: true });
    return redirectToConnections(request, true);
  } catch (error) {
    console.error("[Pinterest OAuth Callback] exception", {
      message: error instanceof Error ? error.message : "Erreur OAuth Pinterest inconnue",
    });
    return redirectToConnections(request, false, "oauth");
  }
}
