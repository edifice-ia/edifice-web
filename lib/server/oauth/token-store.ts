export type OAuthTokenProvider = "youtube" | "tiktok" | "meta" | "pinterest";

export type OAuthTokenPayload = {
  access_token?: string;
  refresh_token?: string;
  token_type?: string;
  expires_in?: number;
  refresh_expires_in?: number;
  expires_at?: string | null;
  updated_at?: string | null;
  scope?: string;
  open_id?: string;
};

export type OAuthTokenRecord = {
  provider: OAuthTokenProvider;
  accessToken: string | null;
  refreshToken: string | null;
  tokenType: string | null;
  scope: string | null;
  openId: string | null;
  expiresAt: string | null;
  refreshExpiresAt: string | null;
  updatedAt: string;
};

const tokenStore = new Map<OAuthTokenProvider, OAuthTokenRecord>();

function toExpiresAt(seconds: unknown) {
  if (typeof seconds !== "number" || !Number.isFinite(seconds)) {
    return null;
  }

  return new Date(Date.now() + seconds * 1000).toISOString();
}

function normalizeExpiresAt(tokenPayload: OAuthTokenPayload) {
  if (tokenPayload.expires_at) {
    return tokenPayload.expires_at;
  }

  return toExpiresAt(tokenPayload.expires_in);
}

export async function saveOAuthToken(
  provider: OAuthTokenProvider,
  tokenPayload: OAuthTokenPayload,
) {
  // TODO: remplacer ce stockage memoire dev par une table Supabase chiffree
  // avant toute utilisation durable en production.
  tokenStore.set(provider, {
    provider,
    accessToken: tokenPayload.access_token ?? null,
    refreshToken: tokenPayload.refresh_token ?? null,
    tokenType: tokenPayload.token_type ?? null,
    scope: tokenPayload.scope ?? null,
    openId: tokenPayload.open_id ?? null,
    expiresAt: normalizeExpiresAt(tokenPayload),
    refreshExpiresAt: toExpiresAt(tokenPayload.refresh_expires_in),
    updatedAt: tokenPayload.updated_at ?? new Date().toISOString(),
  });

  console.info(`[OAuth Token Store] save provider=${provider}`, {
    tokenPresent: Boolean(tokenPayload.access_token),
    expiresAtPresent: Boolean(
      tokenPayload.expires_at || tokenPayload.expires_in,
    ),
  });
}

export function getOAuthTokenStatus(provider: OAuthTokenProvider) {
  const record = tokenStore.get(provider) ?? null;
  const tokenPresent = Boolean(record?.accessToken);

  console.info(`[OAuth Token Store] status provider=${provider}`);
  console.info("[OAuth Token Store] token present yes/no", {
    provider,
    present: tokenPresent,
  });

  return {
    present: tokenPresent,
    storageEnabled: true,
    expiresAt: record?.expiresAt ?? null,
    updatedAt: record?.updatedAt ?? null,
  };
}

export function getOAuthToken(provider: OAuthTokenProvider) {
  return tokenStore.get(provider) ?? null;
}

export function clearOAuthToken(provider: OAuthTokenProvider) {
  tokenStore.delete(provider);
}
