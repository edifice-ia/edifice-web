import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { buildAbsoluteOAuthReturnUrl } from "@/lib/server/oauth/oauth-redirects";
import { saveOAuthToken } from "@/lib/server/oauth/token-store";
import {
  TIKTOK_STATE_COOKIE,
  verifyTikTokOAuthState,
} from "@/lib/server/oauth/tiktok-state";

const TIKTOK_TOKEN_URL = "https://open.tiktokapis.com/v2/oauth/token/";

type TikTokTokenResponse = {
  access_token?: string;
  expires_in?: number;
  open_id?: string;
  refresh_expires_in?: number;
  refresh_token?: string;
  scope?: string;
  token_type?: string;
  error?: string;
  error_description?: string;
  log_id?: string;
};

function redirectToInterface(
  request: NextRequest,
  connected: "0" | "1",
  error?: "oauth",
) {
  const redirectTarget = buildAbsoluteOAuthReturnUrl(
    request,
    "tiktok",
    connected === "1",
    error,
  );

  console.info("[TikTok OAuth Callback] redirection finale", {
    connected,
    error,
  });
  console.info(`[OAuth Callback] final redirect=${redirectTarget.toString()}`, {
    provider: "tiktok",
    finalRedirect: redirectTarget.toString(),
  });

  const response = NextResponse.redirect(redirectTarget);
  response.cookies.set(TIKTOK_STATE_COOKIE, "", {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 0,
    path: "/api/oauth/tiktok",
  });

  return response;
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const error = request.nextUrl.searchParams.get("error");
  const errorDescription = request.nextUrl.searchParams.get("error_description");
  const cookieState = request.cookies.get(TIKTOK_STATE_COOKIE)?.value ?? null;
  const stateValid =
    Boolean(state && cookieState && state === cookieState) &&
    verifyTikTokOAuthState(state);

  console.info("[OAuth Callback] provider=tiktok");
  console.info("[TikTok OAuth Callback] callback recu");
  console.info("[TikTok OAuth Callback] code present oui/non", {
    present: Boolean(code),
  });
  console.info("[TikTok OAuth Callback] state recu", {
    present: Boolean(state),
  });
  console.info("[TikTok OAuth Callback] state valide oui/non", {
    valid: stateValid,
  });

  if (error) {
    console.warn("[TikTok OAuth Callback] erreur OAuth TikTok", {
      error,
      errorDescription,
    });
    return redirectToInterface(request, "0", "oauth");
  }

  if (!code) {
    console.warn("[TikTok OAuth Callback] code OAuth manquant");
    return redirectToInterface(request, "0", "oauth");
  }

  if (!stateValid) {
    console.warn("[TikTok OAuth Callback] state OAuth invalide");
    return redirectToInterface(request, "0", "oauth");
  }

  const clientKey = process.env.TIKTOK_CLIENT_KEY?.trim();
  const clientSecret = process.env.TIKTOK_CLIENT_SECRET?.trim();
  const redirectUri = process.env.TIKTOK_REDIRECT_URI?.trim();

  if (!clientKey || !clientSecret || !redirectUri) {
    console.warn("[TikTok OAuth Callback] configuration OAuth incomplete");
    return redirectToInterface(request, "0", "oauth");
  }

  try {
    const body = new URLSearchParams({
      client_key: clientKey,
      client_secret: clientSecret,
      code,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
    });

    console.info("[TikTok OAuth Callback] echange token demarre");

    const tokenResponse = await fetch(TIKTOK_TOKEN_URL, {
      method: "POST",
      headers: {
        "Cache-Control": "no-cache",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
      cache: "no-store",
    });
    const tokenPayload = (await tokenResponse.json()) as TikTokTokenResponse;
    const tokenReceived = Boolean(tokenPayload.access_token);

    console.info("[TikTok OAuth Callback] token recu oui/non", {
      received: tokenReceived,
    });
    console.info("[TikTok OAuth Callback] open_id recu oui/non", {
      received: Boolean(tokenPayload.open_id),
    });

    if (!tokenResponse.ok || !tokenPayload.access_token) {
      console.warn("[TikTok OAuth Callback] echec echange token", {
        status: tokenResponse.status,
        error: tokenPayload.error,
        errorDescription: tokenPayload.error_description,
        logId: tokenPayload.log_id,
      });
      return redirectToInterface(request, "0", "oauth");
    }

    await saveOAuthToken("tiktok", {
      access_token: tokenPayload.access_token,
      refresh_token: tokenPayload.refresh_token,
      expires_in: tokenPayload.expires_in,
      refresh_expires_in: tokenPayload.refresh_expires_in,
      open_id: tokenPayload.open_id,
      scope: tokenPayload.scope,
      token_type: tokenPayload.token_type,
    });

    return redirectToInterface(request, "1");
  } catch (exchangeError) {
    console.error("[TikTok OAuth Callback] exception echange token", {
      message:
        exchangeError instanceof Error
          ? exchangeError.message
          : "Unknown TikTok token exchange error",
    });

    return redirectToInterface(request, "0", "oauth");
  }
}
