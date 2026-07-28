import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export const GARMIN_STATE_COOKIE = "edifice_garmin_oauth_state";
export const GARMIN_STATE_MAX_AGE_SECONDS = 10 * 60;

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

export type GarminOAuthState = {
  state: string;
  codeChallenge: string;
};

// Generates a PKCE code_verifier/code_challenge pair (RFC 7636, S256) and
// embeds the verifier in the signed state so the callback can retrieve it
// without a second server-side store.
//
// The state is also bound to the user who started the flow, as done for TikTok
// and YouTube: without that binding, an anonymous visitor could start a flow
// and have the callback store a token in the shared token store. The user id
// is signed, not merely carried, so it cannot be swapped in transit.
export function createGarminOAuthState(userId: string): GarminOAuthState | null {
  const secret = getStateSecret();

  if (!secret || !userId) {
    return null;
  }

  const codeVerifier = randomBytes(32).toString("base64url");
  const codeChallenge = createHash("sha256").update(codeVerifier).digest("base64url");
  const nonce = randomBytes(16).toString("base64url");
  const issuedAt = Math.floor(Date.now() / 1000).toString();
  const encodedUserId = Buffer.from(userId).toString("base64url");
  const payload = `${nonce}.${issuedAt}.${encodedUserId}.${codeVerifier}`;
  const signature = signStatePayload(payload, secret);

  return {
    state: `${payload}.${signature}`,
    codeChallenge,
  };
}

export type GarminOAuthStateValidation =
  | { valid: true; codeVerifier: string }
  | { valid: false; codeVerifier: null };

export function verifyGarminOAuthState(
  receivedState: string | null,
  userId: string,
): GarminOAuthStateValidation {
  const secret = getStateSecret();

  if (!secret || !receivedState || !userId) {
    return { valid: false, codeVerifier: null };
  }

  const parts = receivedState.split(".");

  if (parts.length !== 5) {
    return { valid: false, codeVerifier: null };
  }

  const [nonce, issuedAt, encodedUserId, codeVerifier, signature] = parts;
  const issuedAtSeconds = Number(issuedAt);

  if (!nonce || !encodedUserId || !codeVerifier || !Number.isFinite(issuedAtSeconds)) {
    return { valid: false, codeVerifier: null };
  }

  const ageSeconds = Math.floor(Date.now() / 1000) - issuedAtSeconds;

  if (ageSeconds < 0 || ageSeconds > GARMIN_STATE_MAX_AGE_SECONDS) {
    return { valid: false, codeVerifier: null };
  }

  const expectedSignature = signStatePayload(
    `${nonce}.${issuedAt}.${encodedUserId}.${codeVerifier}`,
    secret,
  );

  if (!safeEqual(signature, expectedSignature)) {
    return { valid: false, codeVerifier: null };
  }

  // Signature checked first: the decoded user id is only trusted once the
  // payload it belongs to is proven intact.
  const stateUserId = Buffer.from(encodedUserId, "base64url").toString();

  if (stateUserId !== userId) {
    return { valid: false, codeVerifier: null };
  }

  return { valid: true, codeVerifier };
}
