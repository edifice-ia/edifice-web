import assert from "node:assert/strict";
import { createHash } from "node:crypto";

process.env.OAUTH_STATE_SECRET = "test-secret-not-for-production";

const { createGarminOAuthState, verifyGarminOAuthState } = await import(
  "../lib/server/oauth/garmin-state.ts"
);
const {
  buildGarminTokenExchangeBody,
  deriveGarminTokenFields,
  exchangeGarminAuthorizationCode,
  GARMIN_TOKEN_URL,
} = await import("../lib/server/oauth/garmin-token-exchange.ts");

// --- PKCE state generation and verification ---

const first = createGarminOAuthState();
const second = createGarminOAuthState();
assert.ok(first, "state should be generated when OAUTH_STATE_SECRET is set");
assert.notEqual(first.state, second.state, "state must be unpredictable across calls");
assert.notEqual(
  first.codeChallenge,
  second.codeChallenge,
  "code_challenge must be unpredictable across calls",
);

const codeVerifier = first.state.split(".")[2];
const expectedChallenge = createHash("sha256").update(codeVerifier).digest("base64url");
assert.equal(
  first.codeChallenge,
  expectedChallenge,
  "code_challenge must be SHA256(code_verifier) base64url (RFC 7636 S256)",
);

const validResult = verifyGarminOAuthState(first.state);
assert.equal(validResult.valid, true, "a freshly generated state must verify as valid");
assert.equal(
  validResult.codeVerifier,
  codeVerifier,
  "verification must return the same code_verifier embedded at creation",
);

const tampered = `${first.state.slice(0, -1)}${first.state.at(-1) === "a" ? "b" : "a"}`;
assert.equal(
  verifyGarminOAuthState(tampered).valid,
  false,
  "a tampered signature must be rejected",
);

assert.equal(
  verifyGarminOAuthState("not.enough.parts").valid,
  false,
  "a malformed state must be rejected",
);

assert.equal(
  verifyGarminOAuthState(null).valid,
  false,
  "a missing state must be rejected",
);

{
  const [nonce, , verifier, signature] = first.state.split(".");
  const expiredIssuedAt = (Math.floor(Date.now() / 1000) - 3600).toString();
  const staleButUnsignedState = [nonce, expiredIssuedAt, verifier, signature].join(".");
  assert.equal(
    verifyGarminOAuthState(staleButUnsignedState).valid,
    false,
    "an expired issuedAt must be rejected even if the rest looks well-formed",
  );
}

console.log("PKCE state generation and verification checks passed.");

// --- Token exchange request shape ---

const exchangeParams = {
  clientId: "mock-client-id",
  clientSecret: "mock-client-secret",
  redirectUri: "https://example.test/api/oauth/garmin/callback",
  code: "mock-authorization-code",
  codeVerifier,
};

const body = buildGarminTokenExchangeBody(exchangeParams);
assert.equal(body.get("grant_type"), "authorization_code");
assert.equal(body.get("code"), exchangeParams.code);
assert.equal(body.get("code_verifier"), codeVerifier);
assert.equal(body.get("client_id"), exchangeParams.clientId);
assert.equal(body.get("client_secret"), exchangeParams.clientSecret);
assert.equal(body.get("redirect_uri"), exchangeParams.redirectUri);

console.log("Token exchange request shape checks passed.");

// --- Token field derivation ---

const now = Date.parse("2026-07-08T00:00:00.000Z");
const fields = deriveGarminTokenFields(
  { access_token: "mock-access-token", refresh_token: "mock-refresh-token", expires_in: 3600 },
  now,
);
assert.ok(fields, "a payload with access_token must derive fields");
assert.equal(fields.accessToken, "mock-access-token");
assert.equal(fields.expiresAt, new Date(now + 3600 * 1000).toISOString());
assert.equal(deriveGarminTokenFields({ error: "invalid_grant" }), null, "a payload without access_token must derive to null");

console.log("Token field derivation checks passed.");

// --- Full exchange, network fully mocked (no real HTTP call) ---

let fetchCalls = 0;
const mockFetch = async (url, init) => {
  fetchCalls += 1;
  assert.equal(url, GARMIN_TOKEN_URL, "exchange must target the Garmin token endpoint constant");
  assert.equal(init.method, "POST");
  assert.equal(
    new URLSearchParams(init.body).get("code_verifier"),
    codeVerifier,
    "the mocked request must carry the PKCE code_verifier",
  );

  return {
    ok: true,
    status: 200,
    json: async () => ({
      access_token: "mock-access-token",
      refresh_token: "mock-refresh-token",
      token_type: "Bearer",
      expires_in: 3600,
    }),
  };
};

const exchangeResult = await exchangeGarminAuthorizationCode(exchangeParams, mockFetch);
assert.equal(fetchCalls, 1, "the mocked fetch must be called exactly once (no real network call)");
assert.equal(exchangeResult.ok, true);
assert.equal(exchangeResult.fields.accessToken, "mock-access-token");

const failingFetch = async () => ({
  ok: false,
  status: 400,
  json: async () => ({ error: "invalid_grant" }),
});
const failingResult = await exchangeGarminAuthorizationCode(exchangeParams, failingFetch);
assert.equal(failingResult.ok, false);
assert.equal(failingResult.error, "invalid_grant");

console.log("Mocked token exchange checks passed (no real network call to Garmin).");

console.log("Garmin OAuth2 + PKCE checks passed.");
