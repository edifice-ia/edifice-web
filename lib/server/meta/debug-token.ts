import "server-only";

import { getActiveMetaScopes } from "@/lib/oauth/meta";

type MetaDebugTokenPayload = {
  data?: {
    app_id?: string;
    type?: string;
    application?: string;
    data_access_expires_at?: number;
    expires_at?: number;
    is_valid?: boolean;
    scopes?: string[];
    user_id?: string;
  };
  error?: {
    message?: string;
    type?: string;
    code?: number;
    error_subcode?: number;
    fbtrace_id?: string;
  };
};

export type MetaTokenScopeDiagnostic = {
  expected: string[];
  granted: string[];
  missing: string[];
  isValid: boolean | null;
  expiresAt: string | null;
  source: "debug_token" | "stored_scope";
  error: {
    code?: string | number;
    message?: string;
  } | null;
};

function toIsoDate(seconds?: number) {
  if (typeof seconds !== "number" || !Number.isFinite(seconds) || seconds <= 0) {
    return null;
  }

  return new Date(seconds * 1000).toISOString();
}

function splitStoredScopes(scope: string | null) {
  return scope?.split(/[\s,]+/).filter(Boolean) ?? [];
}

function buildDiagnostic(options: {
  granted: string[];
  isValid: boolean | null;
  expiresAt: string | null;
  source: MetaTokenScopeDiagnostic["source"];
  error?: MetaTokenScopeDiagnostic["error"];
}): MetaTokenScopeDiagnostic {
  const expected = getActiveMetaScopes();

  return {
    expected,
    granted: options.granted,
    missing: expected.filter((scope) => !options.granted.includes(scope)),
    isValid: options.isValid,
    expiresAt: options.expiresAt,
    source: options.source,
    error: options.error ?? null,
  };
}

export async function getMetaTokenScopeDiagnostic(options: {
  userAccessToken: string;
  storedScope: string | null;
}): Promise<MetaTokenScopeDiagnostic> {
  const appId = process.env.META_APP_ID?.trim();
  const appSecret = process.env.META_APP_SECRET?.trim();
  const fallback = buildDiagnostic({
    granted: splitStoredScopes(options.storedScope),
    isValid: null,
    expiresAt: null,
    source: "stored_scope",
  });

  if (!appId || !appSecret) {
    return {
      ...fallback,
      error: {
        code: "missing_app_credentials",
        message: "Meta Debug Token credentials are not configured.",
      },
    };
  }

  const debugUrl = new URL("https://graph.facebook.com/debug_token");
  debugUrl.searchParams.set("input_token", options.userAccessToken);
  debugUrl.searchParams.set("access_token", `${appId}|${appSecret}`);

  try {
    const response = await fetch(debugUrl, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      cache: "no-store",
    });
    const payload = (await response.json()) as MetaDebugTokenPayload;

    if (!response.ok || payload.error) {
      return {
        ...fallback,
        error: {
          code: payload.error?.code ?? response.status,
          message:
            payload.error?.message ?? "Meta Debug Token request failed.",
        },
      };
    }

    return buildDiagnostic({
      granted: payload.data?.scopes ?? [],
      isValid: payload.data?.is_valid ?? null,
      expiresAt: toIsoDate(payload.data?.expires_at),
      source: "debug_token",
    });
  } catch (error) {
    return {
      ...fallback,
      error: {
        code: "debug_token_request_error",
        message: error instanceof Error ? error.message : "Unknown error.",
      },
    };
  }
}
