import "server-only";

import {
  readGoogleTokenInfo,
  refreshGoogleAccessToken,
} from "@/lib/server/oauth/google-token-exchange";
import { saveOAuthToken, type OAuthTokenRecord } from "@/lib/server/oauth/token-store";

export const CALENDAR_READONLY_SCOPE =
  "https://www.googleapis.com/auth/calendar.readonly";
export const CALENDAR_EXPECTED_SCOPES = [CALENDAR_READONLY_SCOPE];

export type CalendarTokenState =
  | {
      ok: true;
      token: OAuthTokenRecord;
      accessToken: string;
      refreshed: boolean;
      logs: string[];
    }
  | {
      ok: false;
      status: "missing_token" | "token_expired" | "refresh_failed";
      token: OAuthTokenRecord | null;
      logs: string[];
      error: {
        code: string;
        message: string;
      };
    };

function isExpired(expiresAt: string | null) {
  if (!expiresAt) {
    return false;
  }

  const time = new Date(expiresAt).getTime();

  return Number.isFinite(time) && time <= Date.now() + 30_000;
}

function splitScopes(scope: string | null | undefined) {
  return scope?.split(/[\s,]+/).filter(Boolean) ?? [];
}

function getExpiresAt(seconds?: number) {
  if (typeof seconds !== "number" || !Number.isFinite(seconds)) {
    return null;
  }

  return new Date(Date.now() + seconds * 1000).toISOString();
}

export function buildCalendarScopeDiagnostic(scopes: string[]) {
  return {
    expected: CALENDAR_EXPECTED_SCOPES,
    granted: scopes,
    missing: CALENDAR_EXPECTED_SCOPES.filter((scope) => !scopes.includes(scope)),
  };
}

export async function readCalendarGrantedScopes(accessToken: string) {
  try {
    const { response, payload } = await readGoogleTokenInfo(accessToken);

    if (!response.ok || payload.error) {
      return {
        source: "stored_scope" as const,
        scopes: null,
        isValid: false,
        expiresAt: null,
        error: {
          code: payload.error ?? String(response.status),
          message:
            payload.error_description ?? "Google tokeninfo request failed.",
        },
      };
    }

    const expiresIn =
      typeof payload.expires_in === "string"
        ? Number(payload.expires_in)
        : payload.expires_in;

    return {
      source: "tokeninfo" as const,
      scopes: splitScopes(payload.scope),
      isValid: true,
      expiresAt: getExpiresAt(expiresIn),
      error: null,
    };
  } catch (error) {
    return {
      source: "stored_scope" as const,
      scopes: null,
      isValid: false,
      expiresAt: null,
      error: {
        code: "tokeninfo_request_error",
        message: error instanceof Error ? error.message : "Unknown error.",
      },
    };
  }
}

export async function ensureCalendarAccessToken(
  token: OAuthTokenRecord | null,
): Promise<CalendarTokenState> {
  const baseLogs = [
    "Token Google Calendar lu cote serveur.",
    "Aucun token ni secret expose dans la reponse.",
  ];

  if (!token?.accessToken) {
    return {
      ok: false,
      status: "missing_token",
      token,
      logs: baseLogs,
      error: {
        code: "missing_calendar_token",
        message: "Token Google Calendar absent.",
      },
    };
  }

  if (!isExpired(token.expiresAt)) {
    return {
      ok: true,
      token,
      accessToken: token.accessToken,
      refreshed: false,
      logs: baseLogs,
    };
  }

  if (!token.refreshToken) {
    return {
      ok: false,
      status: "token_expired",
      token,
      logs: [...baseLogs, "Refresh token absent."],
      error: {
        code: "missing_refresh_token",
        message: "Reconnecte Google Calendar pour obtenir un refresh token.",
      },
    };
  }

  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();

  if (!clientId || !clientSecret) {
    return {
      ok: false,
      status: "refresh_failed",
      token,
      logs: baseLogs,
      error: {
        code: "missing_calendar_oauth_config",
        message: "Configuration serveur Google Calendar incomplete.",
      },
    };
  }

  try {
    const { response, payload } = await refreshGoogleAccessToken({
      clientId,
      clientSecret,
      refreshToken: token.refreshToken,
    });

    if (!response.ok || !payload.access_token) {
      return {
        ok: false,
        status: "refresh_failed",
        token,
        logs: baseLogs,
        error: {
          code: payload.error ?? String(response.status),
          message:
            payload.error_description ?? "Refresh token Google Calendar refuse.",
        },
      };
    }

    await saveOAuthToken("calendar", {
      access_token: payload.access_token,
      refresh_token: token.refreshToken,
      token_type: payload.token_type ?? token.tokenType ?? undefined,
      scope: payload.scope ?? token.scope ?? undefined,
      expires_in: payload.expires_in,
    });

    return {
      ok: true,
      token: {
        ...token,
        accessToken: payload.access_token,
        tokenType: payload.token_type ?? token.tokenType,
        scope: payload.scope ?? token.scope,
        expiresAt: getExpiresAt(payload.expires_in),
      },
      accessToken: payload.access_token,
      refreshed: true,
      logs: [...baseLogs, "Token Google Calendar rafraichi cote serveur."],
    };
  } catch (error) {
    return {
      ok: false,
      status: "refresh_failed",
      token,
      logs: baseLogs,
      error: {
        code: "refresh_request_error",
        message: error instanceof Error ? error.message : "Unknown error.",
      },
    };
  }
}
