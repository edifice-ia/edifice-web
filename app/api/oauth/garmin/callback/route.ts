import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { saveOAuthToken } from "@/lib/server/oauth/token-store";
import {
  GARMIN_STATE_COOKIE,
  verifyGarminOAuthState,
} from "@/lib/server/oauth/garmin-state";
import { exchangeGarminAuthorizationCode } from "@/lib/server/oauth/garmin-token-exchange";
import { canAccessPrivateCockpit } from "@/src/lib/auth/roles";
import { getCurrentUser } from "@/src/lib/supabase/server";

const GARMIN_RETURN_PATH = "/interface/personnel";

function buildGarminReturnUrl(request: NextRequest, connected: boolean) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim() || request.nextUrl.origin;
  const target = new URL(GARMIN_RETURN_PATH, appUrl);
  target.searchParams.set("provider", "garmin");
  target.searchParams.set("connected", connected ? "1" : "0");

  if (!connected) {
    target.searchParams.set("error", "oauth");
  }

  return target;
}

function redirectToGarminReturn(request: NextRequest, connected: boolean) {
  const target = buildGarminReturnUrl(request, connected);
  console.info(`[Garmin OAuth Callback] final redirect=${target.toString()}`, {
    provider: "garmin",
    finalRedirect: target.toString(),
  });

  const response = NextResponse.redirect(target);
  response.cookies.set(GARMIN_STATE_COOKIE, "", {
    httpOnly: true,
    secure: request.nextUrl.protocol === "https:",
    sameSite: "lax",
    maxAge: 0,
    path: "/api/oauth/garmin",
  });

  return response;
}

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();

  if (!user || !canAccessPrivateCockpit(user)) {
    console.warn("[Garmin OAuth Callback] acces refuse", {
      failureStep: "access_check",
    });
    return redirectToGarminReturn(request, false);
  }

  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const cookieState = request.cookies.get(GARMIN_STATE_COOKIE)?.value ?? null;
  const stateResult = verifyGarminOAuthState(state, user.id);
  const stateValid = Boolean(state && cookieState && state === cookieState) && stateResult.valid;

  console.info("[OAuth Callback] provider=garmin");
  console.info("[Garmin OAuth Callback] code present yes/no", {
    present: Boolean(code),
  });
  console.info("[Garmin OAuth Callback] state valid yes/no", {
    valid: stateValid,
  });

  if (!code || !stateValid || !stateResult.valid) {
    console.info("[Garmin OAuth Callback] token exchange success yes/no", {
      success: false,
    });
    console.info("[Garmin OAuth Callback] token stored yes/no", {
      stored: false,
    });
    return redirectToGarminReturn(request, false);
  }

  const clientId = process.env.GARMIN_CLIENT_ID?.trim();
  const clientSecret = process.env.GARMIN_CLIENT_SECRET?.trim();
  const redirectUri = process.env.GARMIN_REDIRECT_URI?.trim();

  if (!clientId || !clientSecret || !redirectUri) {
    console.warn("[Garmin OAuth Callback] missing server configuration", {
      clientIdPresent: Boolean(clientId),
      clientSecretPresent: Boolean(clientSecret),
      redirectUriPresent: Boolean(redirectUri),
    });
    console.info("[Garmin OAuth Callback] token exchange success yes/no", {
      success: false,
    });
    console.info("[Garmin OAuth Callback] token stored yes/no", {
      stored: false,
    });
    return redirectToGarminReturn(request, false);
  }

  console.info("[Garmin OAuth Callback] token exchange started");

  try {
    const result = await exchangeGarminAuthorizationCode({
      clientId,
      clientSecret,
      redirectUri,
      code,
      codeVerifier: stateResult.codeVerifier,
    });

    console.info("[Garmin OAuth Callback] token exchange success yes/no", {
      success: result.ok,
    });

    if (!result.ok) {
      console.warn("[Garmin OAuth Callback] token exchange failed", {
        status: result.status,
        error: result.error,
      });
      console.info("[Garmin OAuth Callback] token stored yes/no", {
        stored: false,
      });
      return redirectToGarminReturn(request, false);
    }

    await saveOAuthToken("garmin", {
      access_token: result.fields.accessToken,
      refresh_token: result.fields.refreshToken,
      token_type: result.fields.tokenType,
      scope: result.fields.scope,
      expires_in: result.fields.expiresIn,
      expires_at: result.fields.expiresAt,
      updated_at: new Date().toISOString(),
    });

    console.info("[Garmin OAuth Callback] token stored yes/no", {
      stored: true,
    });

    return redirectToGarminReturn(request, true);
  } catch (error) {
    console.error("[Garmin OAuth Callback] token exchange exception", {
      message:
        error instanceof Error ? error.message : "Unknown Garmin token exchange error",
    });
    console.info("[Garmin OAuth Callback] token exchange success yes/no", {
      success: false,
    });
    console.info("[Garmin OAuth Callback] token stored yes/no", {
      stored: false,
    });
    return redirectToGarminReturn(request, false);
  }
}
