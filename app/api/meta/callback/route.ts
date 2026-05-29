import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import {
  buildMetaErrorRedirect,
  buildMetaSuccessRedirect,
  getActiveMetaScopes,
  getMissingMetaEnv,
  getMetaRedirectUri,
  META_PERMISSIONS_URL,
  META_REQUIRED_ENV,
  META_TOKEN_URL,
  verifyMetaState,
} from "@/lib/oauth/meta";
import { saveMetaToken } from "@/lib/server/oauth/meta-token-store";

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
  return getActiveMetaScopes().every((scope) => granted.has(scope));
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const error = request.nextUrl.searchParams.get("error");
  const errorDescription = request.nextUrl.searchParams.get(
    "error_description",
  );

  console.info("[OAuth Callback] provider=meta");
  console.info("[META CALLBACK] callback received", {
    hasCode: Boolean(code),
    hasState: Boolean(state),
    hasError: Boolean(error),
  });

  if (error) {
    console.warn("[META CALLBACK] provider returned error", {
      error,
      hasDescription: Boolean(errorDescription),
    });

    const redirectTarget = buildMetaErrorRedirect(request, "refused");
    console.info(`[OAuth Callback] final redirect=${redirectTarget.toString()}`, {
      provider: "meta",
      finalRedirect: redirectTarget.toString(),
    });
    return Response.redirect(redirectTarget);
  }

  if (!code) {
    console.warn("[META CALLBACK] missing code");
    const redirectTarget = buildMetaErrorRedirect(request, "oauth_error");
    console.info(`[OAuth Callback] final redirect=${redirectTarget.toString()}`, {
      provider: "meta",
      finalRedirect: redirectTarget.toString(),
    });
    return Response.redirect(redirectTarget);
  }

  const missingEnv = getMissingMetaEnv();

  if (missingEnv.length > 0) {
    console.error("[META CALLBACK] missing server configuration", {
      missing: missingEnv,
      required: META_REQUIRED_ENV,
    });

    const redirectTarget = buildMetaErrorRedirect(request, "missing_env");
    console.info(`[OAuth Callback] final redirect=${redirectTarget.toString()}`, {
      provider: "meta",
      finalRedirect: redirectTarget.toString(),
    });
    return Response.redirect(redirectTarget);
  }

  const cookieStore = await cookies();
  const expectedState = cookieStore.get("meta_oauth_state")?.value;
  cookieStore.delete("meta_oauth_state");

  if (!state || !expectedState || state !== expectedState || !verifyMetaState(state)) {
    console.warn("[META CALLBACK] invalid state", {
      hasState: Boolean(state),
      hasCookieState: Boolean(expectedState),
    });

    const redirectTarget = buildMetaErrorRedirect(request, "oauth_error");
    console.info(`[OAuth Callback] final redirect=${redirectTarget.toString()}`, {
      provider: "meta",
      finalRedirect: redirectTarget.toString(),
    });
    return Response.redirect(redirectTarget);
  }

  const tokenUrl = new URL(META_TOKEN_URL);
  tokenUrl.searchParams.set("client_id", process.env.META_APP_ID as string);
  tokenUrl.searchParams.set("redirect_uri", getMetaRedirectUri(request));
  tokenUrl.searchParams.set("client_secret", process.env.META_APP_SECRET as string);
  tokenUrl.searchParams.set("code", code);

  let tokenResponse: Response;

  try {
    console.info("[META TOKEN EXCHANGE] request started");

    tokenResponse = await fetch(tokenUrl, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      cache: "no-store",
    });
  } catch (exchangeError) {
    console.error("[META TOKEN EXCHANGE] request failed", {
      message:
        exchangeError instanceof Error
          ? exchangeError.message
          : "unknown_exchange_error",
    });

    const redirectTarget = buildMetaErrorRedirect(request, "oauth_error");
    console.info(`[OAuth Callback] final redirect=${redirectTarget.toString()}`, {
      provider: "meta",
      finalRedirect: redirectTarget.toString(),
    });
    return Response.redirect(redirectTarget);
  }

  const tokenPayload = (await tokenResponse.json()) as MetaTokenResponse;

  if (!tokenResponse.ok || !tokenPayload.access_token) {
    console.error("[META TOKEN EXCHANGE] rejected", {
      status: tokenResponse.status,
      metaErrorCode: tokenPayload.error?.code,
      metaErrorType: tokenPayload.error?.type,
    });

    const redirectTarget = buildMetaErrorRedirect(request, "oauth_error");
    console.info(`[OAuth Callback] final redirect=${redirectTarget.toString()}`, {
      provider: "meta",
      finalRedirect: redirectTarget.toString(),
    });
    return Response.redirect(redirectTarget);
  }

  console.info("[META TOKEN EXCHANGE] success", {
    tokenReceived: true,
    tokenType: tokenPayload.token_type,
    expiresInPresent: typeof tokenPayload.expires_in === "number",
  });

  const permissionsOk = await hasRequiredPermissions(tokenPayload.access_token);

  if (!permissionsOk) {
    console.warn("[META CALLBACK] required permissions are missing");
    const redirectTarget = buildMetaErrorRedirect(
      request,
      "insufficient_permissions",
    );
    console.info(`[OAuth Callback] final redirect=${redirectTarget.toString()}`, {
      provider: "meta",
      finalRedirect: redirectTarget.toString(),
    });
    return Response.redirect(redirectTarget);
  }

  await saveMetaToken({
    access_token: tokenPayload.access_token,
    token_type: tokenPayload.token_type,
    expires_in: tokenPayload.expires_in,
  });

  console.info("[META TOKEN STORED]", {
    stored: true,
    tokenType: tokenPayload.token_type,
    expiresInPresent: typeof tokenPayload.expires_in === "number",
  });

  const redirectTarget = buildMetaSuccessRedirect(request);
  console.info(`[OAuth Callback] final redirect=${redirectTarget.toString()}`, {
    provider: "meta",
    finalRedirect: redirectTarget.toString(),
  });
  return Response.redirect(redirectTarget);
}
