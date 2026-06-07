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
const PINTEREST_PROFILE_URL = "https://api.pinterest.com/v5/user_account";
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

type PinterestOAuthDiagnostic = {
  code_received: boolean;
  state_valid: boolean;
  token_exchange_success: boolean;
  profile_fetch_success: boolean;
};

const emptyDiagnostic: PinterestOAuthDiagnostic = {
  code_received: false,
  state_valid: false,
  token_exchange_success: false,
  profile_fetch_success: false,
};

function redactPinterestSecrets(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(redactPinterestSecrets);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [
        key,
        /token|secret|authorization/i.test(key) ? "[masked]" : redactPinterestSecrets(entry),
      ]),
    );
  }

  if (typeof value === "string") {
    return value
      .replace(/("(?:access_token|refresh_token|id_token|client_secret)"\s*:\s*")[^"]+/gi, "$1[masked]")
      .replace(/(Bearer\s+)[A-Za-z0-9._~+/=-]+/gi, "$1[masked]");
  }

  return value;
}

async function readPinterestBody(response: Response) {
  const bodyText = await response.text();

  try {
    const payload = JSON.parse(bodyText) as unknown;
    return {
      payload,
      maskedPayload: redactPinterestSecrets(payload),
    };
  } catch {
    return {
      payload: {},
      maskedPayload: redactPinterestSecrets(bodyText),
    };
  }
}

function logPinterestStep(
  step: string,
  details: Record<string, unknown> = {},
  level: "info" | "warn" | "error" = "info",
) {
  console[level]("[Pinterest OAuth Callback]", { step, ...details });
}

function redirectToConnections(
  request: NextRequest,
  connected: boolean,
  error?: string,
  diagnostic: PinterestOAuthDiagnostic = emptyDiagnostic,
) {
  const target = buildAbsoluteOAuthReturnUrl(request, "pinterest", connected, error);
  target.searchParams.set("code_received", diagnostic.code_received ? "1" : "0");
  target.searchParams.set("state_valid", diagnostic.state_valid ? "1" : "0");
  target.searchParams.set(
    "token_exchange_success",
    diagnostic.token_exchange_success ? "1" : "0",
  );
  target.searchParams.set(
    "profile_fetch_success",
    diagnostic.profile_fetch_success ? "1" : "0",
  );
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
  const diagnostic = { ...emptyDiagnostic };

  logPinterestStep("callback_received");

  const user = await getCurrentUser();
  if (!user || !canAccessPrivateCockpit(user)) {
    logPinterestStep("access_check_failed", { failureStep: "access_check" }, "warn");
    return redirectToConnections(request, false, "access_denied", diagnostic);
  }

  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const oauthError = request.nextUrl.searchParams.get("error");
  const cookieState = request.cookies.get(PINTEREST_STATE_COOKIE)?.value ?? null;
  diagnostic.code_received = Boolean(code);
  const stateValid =
    Boolean(state && cookieState && state === cookieState) &&
    verifyPinterestOAuthState(state, user.id);
  diagnostic.state_valid = stateValid;

  logPinterestStep("oauth_parameters_received", {
    code_received: diagnostic.code_received,
    state_valid: diagnostic.state_valid,
    oauthErrorPresent: Boolean(oauthError),
    cookieStatePresent: Boolean(cookieState),
  });

  if (oauthError || !code || !stateValid) {
    const failureStep = oauthError
      ? "oauth_provider_error"
      : !code
        ? "code_missing"
        : "state_validation";
    logPinterestStep("oauth_preflight_failed", {
      failureStep,
      tokenStored: false,
    }, "warn");
    return redirectToConnections(request, false, oauthError ? "refused" : "oauth", diagnostic);
  }

  const clientId = process.env.PINTEREST_CLIENT_ID?.trim();
  const clientSecret = process.env.PINTEREST_CLIENT_SECRET?.trim();
  const redirectUri = process.env.PINTEREST_REDIRECT_URI?.trim();
  logPinterestStep("server_configuration_checked", {
    clientIdPresent: Boolean(clientId),
    clientSecretPresent: Boolean(clientSecret),
    redirectUriMatchesExpected: redirectUri === PINTEREST_REDIRECT_URI,
  });

  if (!clientId || !clientSecret || redirectUri !== PINTEREST_REDIRECT_URI) {
    logPinterestStep("server_configuration_failed", {
      failureStep: "server_configuration",
      redirectUri,
      expectedRedirectUri: PINTEREST_REDIRECT_URI,
    }, "warn");
    return redirectToConnections(request, false, "missing_env", diagnostic);
  }

  try {
    logPinterestStep("token_exchange_started", {
      tokenUrl: PINTEREST_TOKEN_URL,
    });

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
    const { payload: rawTokenPayload, maskedPayload: maskedTokenPayload } =
      await readPinterestBody(tokenResponse);
    const tokenPayload = rawTokenPayload as PinterestTokenResponse;
    diagnostic.token_exchange_success = Boolean(tokenResponse.ok && tokenPayload.access_token);

    logPinterestStep("token_exchange_response_received", {
      token_exchange_success: diagnostic.token_exchange_success,
      status: tokenResponse.status,
      pinterestResponseBody: maskedTokenPayload,
      refreshTokenPresent: Boolean(tokenPayload.refresh_token),
    });

    if (!tokenResponse.ok || !tokenPayload.access_token) {
      logPinterestStep("token_exchange_failed", {
        failureStep: "token_exchange",
        status: tokenResponse.status,
        error: tokenPayload.error ?? tokenPayload.message ?? "unknown",
      }, "warn");
      return redirectToConnections(request, false, "token_exchange", diagnostic);
    }

    logPinterestStep("token_exchange_succeeded", {
      token_exchange_success: true,
    });

    logPinterestStep("profile_fetch_started", {
      profileUrl: PINTEREST_PROFILE_URL,
    });

    const profileResponse = await fetch(PINTEREST_PROFILE_URL, {
      headers: {
        Authorization: `Bearer ${tokenPayload.access_token}`,
        Accept: "application/json",
      },
      cache: "no-store",
    });
    const { maskedPayload: profilePayload } = await readPinterestBody(profileResponse);
    diagnostic.profile_fetch_success = profileResponse.ok;

    logPinterestStep("profile_fetch_response_received", {
      profile_fetch_success: diagnostic.profile_fetch_success,
      status: profileResponse.status,
      pinterestResponseBody: profilePayload,
    });

    if (!profileResponse.ok) {
      logPinterestStep("profile_fetch_failed", {
        failureStep: "profile_fetch",
        status: profileResponse.status,
      }, "warn");
      return redirectToConnections(request, false, "profile_fetch", diagnostic);
    }

    logPinterestStep("token_store_started", {
      userIdPresent: Boolean(user.id),
      accessTokenPresent: Boolean(tokenPayload.access_token),
      refreshTokenPresent: Boolean(tokenPayload.refresh_token),
      expiresInPresent: typeof tokenPayload.expires_in === "number",
      scopePresent: Boolean(tokenPayload.scope),
    });

    try {
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
    } catch (storeError) {
      logPinterestStep("token_store_failed", {
        failureStep: "token_store",
        message:
          storeError instanceof Error
            ? storeError.message
            : "Erreur stockage token Pinterest inconnue",
      }, "error");
      return redirectToConnections(request, false, "token_store", diagnostic);
    }

    logPinterestStep("token_store_succeeded", {
      tokenStored: true,
      message: "Token OAuth Pinterest enregistre dans Supabase.",
    });
    return redirectToConnections(request, true, undefined, diagnostic);
  } catch (error) {
    logPinterestStep("callback_exception", {
      failureStep: "exception",
      message: error instanceof Error ? error.message : "Erreur OAuth Pinterest inconnue",
    }, "error");
    return redirectToConnections(request, false, "oauth", diagnostic);
  }
}
