import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";

export const META_AUTH_URL = "https://www.facebook.com/v19.0/dialog/oauth";
export const META_TOKEN_URL = "https://graph.facebook.com/v19.0/oauth/access_token";
export const META_PERMISSIONS_URL =
  "https://graph.facebook.com/v19.0/me/permissions";

// TODO: Réactiver scopes Instagram Graph API après validation App Review Meta.
export const META_SCOPES = ["public_profile", "email"];

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

export function createMetaState() {
  const secret = process.env.OAUTH_STATE_SECRET;

  if (!secret) {
    return null;
  }

  const nonce = randomBytes(16).toString("hex");
  const timestamp = Date.now().toString();
  const payload = `${nonce}.${timestamp}`;
  const signature = createHmac("sha256", secret).update(payload).digest("hex");

  return `${payload}.${signature}`;
}

export function verifyMetaState(state: string) {
  const secret = process.env.OAUTH_STATE_SECRET;

  if (!secret) {
    return false;
  }

  const [nonce, timestamp, signature] = state.split(".");

  if (!nonce || !timestamp || !signature) {
    return false;
  }

  const issuedAt = Number(timestamp);

  if (!Number.isFinite(issuedAt) || Date.now() - issuedAt > 10 * 60 * 1000) {
    return false;
  }

  const payload = `${nonce}.${timestamp}`;
  const expected = createHmac("sha256", secret).update(payload).digest("hex");

  try {
    return timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}

export function buildMetaErrorRedirect(
  request: NextRequest,
  status: MetaOAuthStatus,
) {
  const target = new URL("/interface/settings/connections", getAppUrl(request));
  target.searchParams.set("provider", "meta");
  target.searchParams.set("status", status);
  return target;
}

export function buildMetaSuccessRedirect(request: NextRequest) {
  const target = new URL("/dashboard", getAppUrl(request));
  target.searchParams.set("provider", "meta");
  target.searchParams.set("connected", "1");
  return target;
}
