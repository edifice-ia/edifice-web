import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { saveOAuthToken } from "@/lib/server/oauth/token-store";
import {
  verifyYouTubeOAuthState,
  YOUTUBE_STATE_COOKIE,
} from "@/lib/server/oauth/youtube-state";

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const YOUTUBE_RETURN_PATH = "/interface/reglages/connexions";

type GoogleTokenResponse = {
  access_token?: string;
  refresh_token?: string;
  token_type?: string;
  scope?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
};

function buildYouTubeReturnUrl(request: NextRequest, connected: boolean) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim() || request.nextUrl.origin;
  const target = new URL(YOUTUBE_RETURN_PATH, appUrl);
  target.searchParams.set("provider", "youtube");
  target.searchParams.set("connected", connected ? "1" : "0");

  if (!connected) {
    target.searchParams.set("error", "oauth");
  }

  return target;
}

function redirectToYouTubeReturn(request: NextRequest, connected: boolean) {
  const target = buildYouTubeReturnUrl(request, connected);
  console.info(`[OAuth Callback] final redirect=${target.toString()}`, {
    provider: "youtube",
    finalRedirect: target.toString(),
  });

  const response = NextResponse.redirect(target);
  response.cookies.set(YOUTUBE_STATE_COOKIE, "", {
    httpOnly: true,
    secure: request.nextUrl.protocol === "https:",
    sameSite: "lax",
    maxAge: 0,
    path: "/api/oauth/youtube",
  });

  return response;
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const cookieState = request.cookies.get(YOUTUBE_STATE_COOKIE)?.value ?? null;
  const stateValid =
    Boolean(state && cookieState && state === cookieState) &&
    verifyYouTubeOAuthState(state);

  console.info("[OAuth Callback] provider=youtube");
  console.info("[YouTube OAuth Callback] code present yes/no", {
    present: Boolean(code),
  });
  console.info("[YouTube OAuth Callback] state valid yes/no", {
    valid: stateValid,
  });

  if (!code || !stateValid) {
    console.info("[YouTube OAuth Callback] token exchange success yes/no", {
      success: false,
    });
    console.info("[YouTube OAuth Callback] token stored yes/no", {
      stored: false,
    });
    return redirectToYouTubeReturn(request, false);
  }

  const clientId = process.env.YOUTUBE_CLIENT_ID?.trim();
  const clientSecret = process.env.YOUTUBE_CLIENT_SECRET?.trim();
  const redirectUri = process.env.YOUTUBE_REDIRECT_URI?.trim();

  if (!clientId || !clientSecret || !redirectUri) {
    console.warn("[YouTube OAuth Callback] missing server configuration", {
      clientIdPresent: Boolean(clientId),
      clientSecretPresent: Boolean(clientSecret),
      redirectUriPresent: Boolean(redirectUri),
    });
    console.info("[YouTube OAuth Callback] token exchange success yes/no", {
      success: false,
    });
    console.info("[YouTube OAuth Callback] token stored yes/no", {
      stored: false,
    });
    return redirectToYouTubeReturn(request, false);
  }

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    grant_type: "authorization_code",
    code,
  });

  console.info("[YouTube OAuth Callback] token exchange started");

  try {
    const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body,
      cache: "no-store",
    });
    const tokenPayload = (await tokenResponse.json()) as GoogleTokenResponse;
    const exchangeSuccess = Boolean(
      tokenResponse.ok && tokenPayload.access_token,
    );

    console.info("[YouTube OAuth Callback] token exchange success yes/no", {
      success: exchangeSuccess,
    });

    if (!exchangeSuccess || !tokenPayload.access_token) {
      console.warn("[YouTube OAuth Callback] token exchange failed", {
        status: tokenResponse.status,
        error: tokenPayload.error,
      });
      console.info("[YouTube OAuth Callback] token stored yes/no", {
        stored: false,
      });
      return redirectToYouTubeReturn(request, false);
    }

    const updatedAt = new Date().toISOString();
    const expiresAt =
      typeof tokenPayload.expires_in === "number"
        ? new Date(Date.now() + tokenPayload.expires_in * 1000).toISOString()
        : null;

    await saveOAuthToken("youtube", {
      access_token: tokenPayload.access_token,
      refresh_token: tokenPayload.refresh_token,
      token_type: tokenPayload.token_type,
      scope: tokenPayload.scope,
      expires_in: tokenPayload.expires_in,
      expires_at: expiresAt,
      updated_at: updatedAt,
    });

    console.info("[YouTube OAuth Callback] token stored yes/no", {
      stored: true,
    });

    return redirectToYouTubeReturn(request, true);
  } catch (error) {
    console.error("[YouTube OAuth Callback] token exchange exception", {
      message:
        error instanceof Error
          ? error.message
          : "Unknown YouTube token exchange error",
    });
    console.info("[YouTube OAuth Callback] token exchange success yes/no", {
      success: false,
    });
    console.info("[YouTube OAuth Callback] token stored yes/no", {
      stored: false,
    });
    return redirectToYouTubeReturn(request, false);
  }
}
