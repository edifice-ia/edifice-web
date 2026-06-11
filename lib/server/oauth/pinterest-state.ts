import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { isPinterestOAuthAccountKey } from "./pinterest-accounts";

export const PINTEREST_STATE_COOKIE = "edifice_pinterest_oauth_state";
export const PINTEREST_STATE_MAX_AGE_SECONDS = 10 * 60;

function getStateSecret() {
  return process.env.OAUTH_STATE_SECRET?.trim() || null;
}

function signStatePayload(payload: string, secret: string) {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  return (
    leftBuffer.length === rightBuffer.length &&
    timingSafeEqual(leftBuffer, rightBuffer)
  );
}

export type PinterestOAuthStateValidation =
  | {
      valid: true;
      accountKey: string;
      oauthEnvironment: "production" | "sandbox";
    }
  | {
      valid: false;
      accountKey: null;
      oauthEnvironment: null;
    };

function normalizeOAuthEnvironment(value: string | null | undefined) {
  return value?.trim().toLowerCase() === "sandbox" ? "sandbox" : "production";
}

export function createPinterestOAuthState(
  userId: string,
  accountKey: string,
  oauthEnvironment?: string | null,
) {
  const secret = getStateSecret();
  if (!secret || !isPinterestOAuthAccountKey(accountKey)) {
    return null;
  }

  const nonce = randomBytes(32).toString("base64url");
  const issuedAt = Math.floor(Date.now() / 1000).toString();
  const encodedUserId = Buffer.from(userId).toString("base64url");
  const encodedAccountKey = Buffer.from(accountKey).toString("base64url");
  const encodedOAuthEnvironment = Buffer.from(
    normalizeOAuthEnvironment(oauthEnvironment),
  ).toString("base64url");
  const payload = `${nonce}.${issuedAt}.${encodedUserId}.${encodedAccountKey}.${encodedOAuthEnvironment}`;

  return `${payload}.${signStatePayload(payload, secret)}`;
}

export function verifyPinterestOAuthState(
  receivedState: string | null,
  userId: string,
): PinterestOAuthStateValidation {
  const secret = getStateSecret();
  if (!secret || !receivedState) {
    return { valid: false, accountKey: null, oauthEnvironment: null };
  }

  const parts = receivedState.split(".");
  if (parts.length !== 5 && parts.length !== 6) {
    return { valid: false, accountKey: null, oauthEnvironment: null };
  }

  const [
    nonce,
    issuedAt,
    encodedUserId,
    encodedAccountKey,
    maybeEncodedOAuthEnvironment,
    maybeSignature,
  ] = parts;
  const encodedOAuthEnvironment = parts.length === 6 ? maybeEncodedOAuthEnvironment : null;
  const signature = parts.length === 6 ? maybeSignature : maybeEncodedOAuthEnvironment;
  const issuedAtSeconds = Number(issuedAt);
  const stateUserId = Buffer.from(encodedUserId, "base64url").toString();
  const accountKey = Buffer.from(encodedAccountKey, "base64url").toString();
  const oauthEnvironment = normalizeOAuthEnvironment(
    encodedOAuthEnvironment
      ? Buffer.from(encodedOAuthEnvironment, "base64url").toString()
      : "production",
  );
  const ageSeconds = Math.floor(Date.now() / 1000) - issuedAtSeconds;
  const payload =
    parts.length === 6
      ? `${nonce}.${issuedAt}.${encodedUserId}.${encodedAccountKey}.${encodedOAuthEnvironment}`
      : `${nonce}.${issuedAt}.${encodedUserId}.${encodedAccountKey}`;

  const valid =
    Boolean(nonce) &&
    Number.isFinite(issuedAtSeconds) &&
    ageSeconds >= 0 &&
    ageSeconds <= PINTEREST_STATE_MAX_AGE_SECONDS &&
    stateUserId === userId &&
    isPinterestOAuthAccountKey(accountKey) &&
    Boolean(signature) &&
    safeEqual(signature, signStatePayload(payload, secret));

  return valid
    ? { valid: true, accountKey, oauthEnvironment }
    : { valid: false, accountKey: null, oauthEnvironment: null };
}
