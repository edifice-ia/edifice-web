import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";
import { buildAbsoluteOAuthReturnUrl } from "@/lib/server/oauth/oauth-redirects";

export const META_AUTH_URL = "https://www.facebook.com/v19.0/dialog/oauth";
export const META_TOKEN_URL =
  "https://graph.facebook.com/v19.0/oauth/access_token";
export const META_PERMISSIONS_URL =
  "https://graph.facebook.com/v19.0/me/permissions";
export const META_ACCOUNTS_URL = "https://graph.facebook.com/v19.0/me/accounts";

export const META_MINIMAL_SCOPES = ["public_profile"];

export const META_INSTAGRAM_GRAPH_SCOPES = [
  "pages_show_list",
  "pages_read_engagement",
  "instagram_basic",
  "instagram_content_publish",
];

export const META_BUSINESS_MANAGEMENT_SCOPES = ["business_management"];

export function isMetaInstagramScopesEnabled() {
  return true;
}

export function getActiveMetaScopes() {
  return [
    ...META_MINIMAL_SCOPES,
    ...META_INSTAGRAM_GRAPH_SCOPES,
    ...META_BUSINESS_MANAGEMENT_SCOPES,
  ];
}

export const META_SCOPES = [
  ...META_MINIMAL_SCOPES,
  ...META_INSTAGRAM_GRAPH_SCOPES,
  ...META_BUSINESS_MANAGEMENT_SCOPES,
];

export const META_REQUIRED_ENV = [
  "META_APP_ID",
  "META_APP_SECRET",
  "META_REDIRECT_URI",
  "NEXT_PUBLIC_APP_URL",
  "OAUTH_STATE_SECRET",
];

export type MetaOAuthStatus =
  | "success"
  | "refused"
  | "oauth_error"
  | "insufficient_permissions"
  | "missing_env"
  | "callback_inaccessible";

export function getAppUrl(request: NextRequest) {
  return process.env.NEXT_PUBLIC_APP_URL?.trim() || request.nextUrl.origin;
}

export function getMetaRedirectUri(request: NextRequest) {
  return (
    process.env.META_REDIRECT_URI?.trim() ||
    `${getAppUrl(request)}/api/meta/callback`
  );
}

export function getMissingMetaEnv() {
  return META_REQUIRED_ENV.filter((name) => {
    const value = process.env[name];
    return typeof value !== "string" || value.trim().length === 0;
  });
}

export function createMetaState(userId: string) {
  const secret = process.env.OAUTH_STATE_SECRET;

  if (!secret) {
    return null;
  }

  const nonce = randomBytes(16).toString("hex");
  const timestamp = Date.now().toString();
  const encodedUserId = Buffer.from(userId).toString("hex");
  const payload = `${nonce}.${timestamp}.${encodedUserId}`;
  const signature = createHmac("sha256", secret).update(payload).digest("hex");

  return `${payload}.${signature}`;
}

export function verifyMetaState(state: string, userId: string) {
  const secret = process.env.OAUTH_STATE_SECRET;

  if (!secret) {
    return false;
  }

  const [nonce, timestamp, encodedUserId, signature] = state.split(".");

  if (!nonce || !timestamp || !encodedUserId || !signature) {
    return false;
  }

  const issuedAt = Number(timestamp);

  if (!Number.isFinite(issuedAt) || Date.now() - issuedAt > 10 * 60 * 1000) {
    return false;
  }

  const payload = `${nonce}.${timestamp}.${encodedUserId}`;
  const expected = createHmac("sha256", secret).update(payload).digest("hex");

  let signatureValid: boolean;

  try {
    signatureValid = timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    signatureValid = false;
  }

  if (!signatureValid) {
    return false;
  }

  const stateUserId = Buffer.from(encodedUserId, "hex").toString();

  return stateUserId === userId;
}

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

export async function hasRequiredMetaPermissions(accessToken: string) {
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

export function buildMetaErrorRedirect(
  request: NextRequest,
  status: MetaOAuthStatus,
) {
  void status;
  return buildAbsoluteOAuthReturnUrl(request, "meta", false, "oauth");
}

export function buildMetaSuccessRedirect(request: NextRequest) {
  return buildAbsoluteOAuthReturnUrl(request, "meta", true);
}
