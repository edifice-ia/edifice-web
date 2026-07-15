// NOTE (DEC-006): endpoint non confirme. A verifier contre la documentation
// officielle Garmin Developer Program avant toute activation reelle.
export const GARMIN_TOKEN_URL = "https://diauth.garmin.com/di-oauth2-service/oauth/token";

export type GarminTokenExchangeParams = {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  code: string;
  codeVerifier: string;
};

// Builds the OAuth2 + PKCE authorization_code exchange body. Pure and
// deterministic so it can be asserted against without a network call.
export function buildGarminTokenExchangeBody({
  clientId,
  clientSecret,
  redirectUri,
  code,
  codeVerifier,
}: GarminTokenExchangeParams) {
  return new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    grant_type: "authorization_code",
    code,
    code_verifier: codeVerifier,
  });
}

export type GarminTokenResponse = {
  access_token?: string;
  refresh_token?: string;
  token_type?: string;
  scope?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
};

export type GarminTokenFields = {
  accessToken: string;
  refreshToken: string | undefined;
  tokenType: string | undefined;
  scope: string | undefined;
  expiresIn: number | undefined;
  expiresAt: string | null;
};

// Derives the fields saved via saveOAuthToken from a token response. Returns
// null when the response carries no access_token (failed exchange).
export function deriveGarminTokenFields(
  payload: GarminTokenResponse,
  now = Date.now(),
): GarminTokenFields | null {
  if (!payload.access_token) {
    return null;
  }

  const expiresAt =
    typeof payload.expires_in === "number"
      ? new Date(now + payload.expires_in * 1000).toISOString()
      : null;

  return {
    accessToken: payload.access_token,
    refreshToken: payload.refresh_token,
    tokenType: payload.token_type,
    scope: payload.scope,
    expiresIn: payload.expires_in,
    expiresAt,
  };
}

export type GarminTokenExchangeResult =
  | { ok: true; fields: GarminTokenFields }
  | { ok: false; status: number; error: string | null };

// Performs the real HTTP exchange. `fetchImpl` is injectable so tests can
// simulate a response without ever calling the network.
export async function exchangeGarminAuthorizationCode(
  params: GarminTokenExchangeParams,
  fetchImpl: typeof fetch = fetch,
): Promise<GarminTokenExchangeResult> {
  const body = buildGarminTokenExchangeBody(params);
  const response = await fetchImpl(GARMIN_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body,
    cache: "no-store",
  });
  const payload = (await response.json()) as GarminTokenResponse;
  const fields = deriveGarminTokenFields(payload);

  if (!response.ok || !fields) {
    return {
      ok: false,
      status: response.status,
      error: payload.error ?? null,
    };
  }

  return { ok: true, fields };
}
