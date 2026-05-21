import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import {
  buildMetaErrorRedirect,
  buildMetaSuccessRedirect,
  getMissingMetaEnv,
  getMetaRedirectUri,
  META_PERMISSIONS_URL,
  META_REQUIRED_ENV,
  META_SCOPES,
  META_TOKEN_URL,
  verifyMetaState,
} from "@/lib/oauth/meta";

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

type MetaPermissionsResponse = {
  data?: Array<{
    permission?: string;
    status?: string;
  }>;
  error?: {
    message?: string;
    type?: string;
    code?: number;
  };
};

async function hasRequiredPermissions(accessToken: string) {
  const permissionsUrl = new URL(META_PERMISSIONS_URL);
  permissionsUrl.searchParams.set("access_token", accessToken);

  const response = await fetch(permissionsUrl, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
    cache: "no-store",
  });
  const payload = (await response.json()) as MetaPermissionsResponse;

  if (!response.ok) {
    console.error("[meta-oauth] permissions check rejected", {
      status: response.status,
      metaErrorCode: payload.error?.code,
      metaErrorType: payload.error?.type,
    });
    return false;
  }

  const granted = new Set(
    payload.data
      ?.filter((item) => item.status === "granted")
      .map((item) => item.permission),
  );
  return META_SCOPES.every((scope) => granted.has(scope));
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
      hasDescription: Boolean(errorDescription),
    });

    return Response.redirect(buildMetaErrorRedirect(request, "refused"));
  }

  if (!code) {
    return Response.json({ ok: false, error: "missing_code" }, { status: 400 });
  }

  const missingEnv = getMissingMetaEnv();

  if (missingEnv.length > 0) {
    console.error("[meta-oauth] missing server configuration", {
      missing: missingEnv,
      required: META_REQUIRED_ENV,
    });

    return Response.redirect(buildMetaErrorRedirect(request, "missing_env"));
  }

  const cookieStore = await cookies();
  const expectedState = cookieStore.get("meta_oauth_state")?.value;
  cookieStore.delete("meta_oauth_state");

  if (!state || !expectedState || state !== expectedState || !verifyMetaState(state)) {
    console.warn("[meta-oauth] invalid state", {
      hasState: Boolean(state),
      hasCookieState: Boolean(expectedState),
    });

    return Response.redirect(buildMetaErrorRedirect(request, "oauth_error"));
  }

  const tokenUrl = new URL(META_TOKEN_URL);
  tokenUrl.searchParams.set("client_id", process.env.META_APP_ID as string);
  tokenUrl.searchParams.set("redirect_uri", getMetaRedirectUri(request));
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

    return Response.redirect(buildMetaErrorRedirect(request, "oauth_error"));
  }

  const tokenPayload = (await tokenResponse.json()) as MetaTokenResponse;

  if (!tokenResponse.ok || !tokenPayload.access_token) {
    console.error("[meta-oauth] token exchange rejected", {
      status: tokenResponse.status,
      metaErrorCode: tokenPayload.error?.code,
      metaErrorType: tokenPayload.error?.type,
    });

    return Response.redirect(buildMetaErrorRedirect(request, "oauth_error"));
  }

  const permissionsOk = await hasRequiredPermissions(tokenPayload.access_token);

  if (!permissionsOk) {
    console.warn("[meta-oauth] required permissions are missing");
    return Response.redirect(
      buildMetaErrorRedirect(request, "insufficient_permissions"),
    );
  }

  console.info("[meta-oauth] token exchange succeeded", {
    tokenType: tokenPayload.token_type,
    expiresIn: tokenPayload.expires_in,
  });

  return Response.redirect(buildMetaSuccessRedirect(request));
}
