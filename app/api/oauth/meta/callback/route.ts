import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { verifyMetaState } from "@/lib/oauth/meta";
import { saveOAuthToken } from "@/lib/server/oauth/token-store";

const META_TOKEN_URL = "https://graph.facebook.com/v23.0/oauth/access_token";
const META_RETURN_PATH = "/interface/reglages/connexions";

type MetaTokenResponse = {
  access_token?: string;
  token_type?: string;
  expires_in?: number;
  error?: {
    message?: string;
    type?: string;
    code?: number;
    error_subcode?: number;
    fbtrace_id?: string;
  };
};

function buildMetaReturnUrl(request: NextRequest, connected: boolean) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim() || request.nextUrl.origin;
  const target = new URL(META_RETURN_PATH, appUrl);
  target.searchParams.set("provider", "meta");
  target.searchParams.set("connected", connected ? "1" : "0");

  if (!connected) {
    target.searchParams.set("error", "token_exchange");
  }

  return target;
}

function redirectToMetaReturn(request: NextRequest, connected: boolean) {
  const target = buildMetaReturnUrl(request, connected);
  console.info(`[OAuth Callback] final redirect=${target.toString()}`, {
    provider: "meta",
    finalRedirect: target.toString(),
  });
  return Response.redirect(target);
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const cookieStore = await cookies();
  const expectedState = cookieStore.get("meta_oauth_state")?.value;
  cookieStore.delete("meta_oauth_state");
  const stateValid =
    Boolean(state && expectedState && state === expectedState) &&
    verifyMetaState(state ?? "");

  console.info("[OAuth Callback] provider=meta");
  console.info("[Meta OAuth Callback] code present yes/no", {
    present: Boolean(code),
  });
  console.info("[Meta OAuth Callback] state valid yes/no", {
    valid: stateValid,
  });

  if (!code || !stateValid) {
    console.info("[Meta OAuth Callback] token exchange success yes/no", {
      success: false,
    });
    console.info("[Meta OAuth Callback] token stored yes/no", {
      stored: false,
    });
    return redirectToMetaReturn(request, false);
  }

  const clientId = process.env.META_APP_ID?.trim();
  const clientSecret = process.env.META_APP_SECRET?.trim();
  const redirectUri = process.env.META_REDIRECT_URI?.trim();

  if (!clientId || !clientSecret || !redirectUri) {
    console.warn("[Meta OAuth Callback] missing server configuration", {
      clientIdPresent: Boolean(clientId),
      clientSecretPresent: Boolean(clientSecret),
      redirectUriPresent: Boolean(redirectUri),
    });
    console.info("[Meta OAuth Callback] token exchange success yes/no", {
      success: false,
    });
    console.info("[Meta OAuth Callback] token stored yes/no", {
      stored: false,
    });
    return redirectToMetaReturn(request, false);
  }

  const tokenUrl = new URL(META_TOKEN_URL);
  tokenUrl.searchParams.set("client_id", clientId);
  tokenUrl.searchParams.set("client_secret", clientSecret);
  tokenUrl.searchParams.set("redirect_uri", redirectUri);
  tokenUrl.searchParams.set("code", code);

  console.info("[Meta OAuth Callback] token exchange started");

  try {
    const tokenResponse = await fetch(tokenUrl, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      cache: "no-store",
    });
    const tokenPayload = (await tokenResponse.json()) as MetaTokenResponse;
    const exchangeSuccess = Boolean(
      tokenResponse.ok && tokenPayload.access_token,
    );

    console.info("[Meta OAuth Callback] token exchange success yes/no", {
      success: exchangeSuccess,
    });

    if (!exchangeSuccess || !tokenPayload.access_token) {
      console.warn("[Meta OAuth Callback] token exchange failed", {
        status: tokenResponse.status,
        metaErrorCode: tokenPayload.error?.code,
        metaErrorType: tokenPayload.error?.type,
      });
      console.info("[Meta OAuth Callback] token stored yes/no", {
        stored: false,
      });
      return redirectToMetaReturn(request, false);
    }

    const updatedAt = new Date().toISOString();
    const expiresAt =
      typeof tokenPayload.expires_in === "number"
        ? new Date(Date.now() + tokenPayload.expires_in * 1000).toISOString()
        : null;

    await saveOAuthToken("meta", {
      access_token: tokenPayload.access_token,
      token_type: tokenPayload.token_type,
      expires_in: tokenPayload.expires_in,
      expires_at: expiresAt,
      updated_at: updatedAt,
    });

    console.info("[Meta OAuth Callback] token stored yes/no", {
      stored: true,
    });

    return redirectToMetaReturn(request, true);
  } catch (error) {
    console.error("[Meta OAuth Callback] token exchange exception", {
      message:
        error instanceof Error
          ? error.message
          : "Unknown Meta token exchange error",
    });
    console.info("[Meta OAuth Callback] token exchange success yes/no", {
      success: false,
    });
    console.info("[Meta OAuth Callback] token stored yes/no", {
      stored: false,
    });
    return redirectToMetaReturn(request, false);
  }
}
