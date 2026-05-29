import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const STATE_MAX_AGE_SECONDS = 10 * 60;

function getStateSecret() {
  const secret = process.env.OAUTH_STATE_SECRET?.trim();
  return secret && secret.length > 0 ? secret : null;
}

function signStatePayload(payload: string, secret: string) {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

function safeEqual(a: string, b: string) {
  const aBuffer = Buffer.from(a);
  const bBuffer = Buffer.from(b);

  if (aBuffer.length !== bBuffer.length) {
    return false;
  }

  return timingSafeEqual(aBuffer, bBuffer);
}

export const TIKTOK_STATE_COOKIE = "edifice_tiktok_oauth_state";
export const TIKTOK_STATE_MAX_AGE_SECONDS = STATE_MAX_AGE_SECONDS;

export function createTikTokOAuthState() {
  const secret = getStateSecret();

  if (!secret) {
    return null;
  }

  const nonce = randomBytes(32).toString("base64url");
  const issuedAt = Math.floor(Date.now() / 1000).toString();
  const payload = `${nonce}.${issuedAt}`;
  const signature = signStatePayload(payload, secret);

  return `${payload}.${signature}`;
}

export function verifyTikTokOAuthState(receivedState: string | null) {
  const secret = getStateSecret();

  if (!secret || !receivedState) {
    return false;
  }

  const parts = receivedState.split(".");

  if (parts.length !== 3) {
    return false;
  }

  const [nonce, issuedAt, signature] = parts;
  const issuedAtSeconds = Number(issuedAt);

  if (!nonce || !Number.isFinite(issuedAtSeconds)) {
    return false;
  }

  const ageSeconds = Math.floor(Date.now() / 1000) - issuedAtSeconds;

  if (ageSeconds < 0 || ageSeconds > STATE_MAX_AGE_SECONDS) {
    return false;
  }

  const expectedSignature = signStatePayload(`${nonce}.${issuedAt}`, secret);

  return safeEqual(signature, expectedSignature);
}
