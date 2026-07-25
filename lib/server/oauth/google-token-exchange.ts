import "server-only";

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_TOKENINFO_URL = "https://oauth2.googleapis.com/tokeninfo";

export type GoogleTokenResponse = {
  access_token?: string;
  refresh_token?: string;
  token_type?: string;
  scope?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
};

export type GoogleTokenInfoResponse = {
  scope?: string;
  expires_in?: string | number;
  error?: string;
  error_description?: string;
};

async function postGoogleToken(body: URLSearchParams) {
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body,
    cache: "no-store",
  });
  const payload = (await response.json()) as GoogleTokenResponse;

  return { response, payload };
}

export async function exchangeGoogleAuthorizationCode(params: {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  code: string;
}) {
  return postGoogleToken(
    new URLSearchParams({
      client_id: params.clientId,
      client_secret: params.clientSecret,
      redirect_uri: params.redirectUri,
      grant_type: "authorization_code",
      code: params.code,
    }),
  );
}

export async function refreshGoogleAccessToken(params: {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
}) {
  return postGoogleToken(
    new URLSearchParams({
      client_id: params.clientId,
      client_secret: params.clientSecret,
      refresh_token: params.refreshToken,
      grant_type: "refresh_token",
    }),
  );
}

export async function readGoogleTokenInfo(accessToken: string) {
  const tokenInfoUrl = new URL(GOOGLE_TOKENINFO_URL);
  tokenInfoUrl.searchParams.set("access_token", accessToken);

  const response = await fetch(tokenInfoUrl, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
    cache: "no-store",
  });
  const payload = (await response.json()) as GoogleTokenInfoResponse;

  return { response, payload };
}
