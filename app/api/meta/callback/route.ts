import type { NextRequest } from "next/server";

const META_TOKEN_URL = "https://graph.facebook.com/v19.0/oauth/access_token";

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

function getAppUrl(request: NextRequest) {
  return process.env.NEXT_PUBLIC_APP_URL?.trim() || request.nextUrl.origin;
}

function getRedirectUri(request: NextRequest) {
  const explicitRedirectUri = process.env.META_REDIRECT_URI?.trim();

  if (explicitRedirectUri) {
    return explicitRedirectUri;
  }

  return `${getAppUrl(request)}/api/meta/callback`;
}

function getMissingEnv() {
  return [
    ["META_APP_ID", process.env.META_APP_ID],
    ["META_APP_SECRET", process.env.META_APP_SECRET],
    ["NEXT_PUBLIC_APP_URL", process.env.NEXT_PUBLIC_APP_URL],
  ]
    .filter(([, value]) => !value || value.trim().length === 0)
    .map(([name]) => name);
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const error = request.nextUrl.searchParams.get("error");
  const errorDescription = request.nextUrl.searchParams.get(
    "error_description",
  );

  console.info("[meta-oauth] callback received", {
    hasCode: Boolean(code),
    hasState: Boolean(state),
    hasError: Boolean(error),
  });

  if (error) {
    console.warn("[meta-oauth] provider returned error", {
      error,
      hasState: Boolean(state),
    });

    return Response.json(
      {
        ok: false,
        error,
        error_description: errorDescription,
        state_received: Boolean(state),
      },
      { status: 400 },
    );
  }

  if (!code) {
    return Response.json({ ok: false, error: "missing_code" }, { status: 400 });
  }

  const missingEnv = getMissingEnv();

  if (missingEnv.length > 0) {
    console.error("[meta-oauth] missing server configuration", {
      missing: missingEnv,
    });

    return Response.json(
      {
        ok: false,
        error: "missing_meta_oauth_config",
        missing: missingEnv,
      },
      { status: 500 },
    );
  }

  const redirectUri = getRedirectUri(request);
  const expectedRedirectUri = `${getAppUrl(request)}/api/meta/callback`;

  if (redirectUri !== expectedRedirectUri) {
    console.info("[meta-oauth] using explicit META_REDIRECT_URI", {
      matchesDefaultCallback: false,
    });
  }

  const tokenUrl = new URL(META_TOKEN_URL);
  tokenUrl.searchParams.set("client_id", process.env.META_APP_ID as string);
  tokenUrl.searchParams.set("redirect_uri", redirectUri);
  tokenUrl.searchParams.set("client_secret", process.env.META_APP_SECRET as string);
  tokenUrl.searchParams.set("code", code);

  let tokenResponse: Response;

  try {
    tokenResponse = await fetch(tokenUrl, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      cache: "no-store",
    });
  } catch (exchangeError) {
    console.error("[meta-oauth] token exchange request failed", {
      message:
        exchangeError instanceof Error
          ? exchangeError.message
          : "unknown_exchange_error",
    });

    return Response.json(
      { ok: false, error: "token_exchange_request_failed" },
      { status: 502 },
    );
  }

  const tokenPayload = (await tokenResponse.json()) as MetaTokenResponse;

  if (!tokenResponse.ok || !tokenPayload.access_token) {
    console.error("[meta-oauth] token exchange rejected", {
      status: tokenResponse.status,
      metaErrorCode: tokenPayload.error?.code,
      metaErrorType: tokenPayload.error?.type,
    });

    return Response.json(
      {
        ok: false,
        error: "token_exchange_failed",
        meta_error: tokenPayload.error
          ? {
              message: tokenPayload.error.message,
              type: tokenPayload.error.type,
              code: tokenPayload.error.code,
            }
          : undefined,
      },
      { status: 502 },
    );
  }

  console.info("[meta-oauth] token exchange succeeded", {
    tokenType: tokenPayload.token_type,
    expiresIn: tokenPayload.expires_in,
    hasState: Boolean(state),
  });

  const appUrl = getAppUrl(request);
  const redirectTarget = new URL("/dashboard", appUrl);
  redirectTarget.searchParams.set("provider", "meta");
  redirectTarget.searchParams.set("connected", "1");

  return Response.redirect(redirectTarget);
}
