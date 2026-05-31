import "server-only";

import { saveOAuthToken, type OAuthTokenRecord } from "@/lib/server/oauth/token-store";

export const YOUTUBE_UPLOAD_SCOPE =
  "https://www.googleapis.com/auth/youtube.upload";
export const YOUTUBE_READONLY_SCOPE =
  "https://www.googleapis.com/auth/youtube.readonly";
export const YOUTUBE_EXPECTED_SCOPES = [
  YOUTUBE_UPLOAD_SCOPE,
  YOUTUBE_READONLY_SCOPE,
];

type GoogleRefreshTokenResponse = {
  access_token?: string;
  expires_in?: number;
  scope?: string;
  token_type?: string;
  error?: string;
  error_description?: string;
};

type GoogleTokenInfoResponse = {
  scope?: string;
  expires_in?: string | number;
  error?: string;
  error_description?: string;
};

export type YouTubeTokenState =
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

export function buildYouTubeScopeDiagnostic(scopes: string[]) {
  return {
    expected: YOUTUBE_EXPECTED_SCOPES,
    granted: scopes,
    missing: YOUTUBE_EXPECTED_SCOPES.filter((scope) => !scopes.includes(scope)),
  };
}

export async function readYouTubeGrantedScopes(accessToken: string) {
  const tokenInfoUrl = new URL("https://oauth2.googleapis.com/tokeninfo");
  tokenInfoUrl.searchParams.set("access_token", accessToken);

  try {
    const response = await fetch(tokenInfoUrl, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      cache: "no-store",
    });
    const payload = (await response.json()) as GoogleTokenInfoResponse;

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

export async function ensureYouTubeAccessToken(
  token: OAuthTokenRecord | null,
): Promise<YouTubeTokenState> {
  const baseLogs = [
    "Token YouTube lu cote serveur.",
    "Aucun token ni secret expose dans la reponse.",
  ];

  if (!token?.accessToken) {
    return {
      ok: false,
      status: "missing_token",
      token,
      logs: baseLogs,
      error: {
        code: "missing_youtube_token",
        message: "Token YouTube absent.",
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
        message: "Reconnecte YouTube pour obtenir un refresh token.",
      },
    };
  }

  const clientId = process.env.YOUTUBE_CLIENT_ID?.trim();
  const clientSecret = process.env.YOUTUBE_CLIENT_SECRET?.trim();

  if (!clientId || !clientSecret) {
    return {
      ok: false,
      status: "refresh_failed",
      token,
      logs: baseLogs,
      error: {
        code: "missing_youtube_oauth_config",
        message: "Configuration serveur YouTube incomplete.",
      },
    };
  }

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: token.refreshToken,
    grant_type: "refresh_token",
  });

  try {
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body,
      cache: "no-store",
    });
    const payload = (await response.json()) as GoogleRefreshTokenResponse;

    if (!response.ok || !payload.access_token) {
      return {
        ok: false,
        status: "refresh_failed",
        token,
        logs: baseLogs,
        error: {
          code: payload.error ?? String(response.status),
          message:
            payload.error_description ?? "Refresh token YouTube refuse.",
        },
      };
    }

    await saveOAuthToken("youtube", {
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
      logs: [...baseLogs, "Token YouTube rafraichi cote serveur."],
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
