export type TikTokTokenRecord = {
  provider: "tiktok";
  openId: string | null;
  scope: string | null;
  tokenType: string | null;
  accessToken: string;
  refreshToken: string | null;
  expiresAt: string | null;
  refreshExpiresAt: string | null;
  savedAt: string;
};

const tokenStore = new Map<string, TikTokTokenRecord>();

function toExpiresAt(seconds: unknown) {
  if (typeof seconds !== "number" || !Number.isFinite(seconds)) {
    return null;
  }

  return new Date(Date.now() + seconds * 1000).toISOString();
}

export async function saveTikTokToken(token: {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  refresh_expires_in?: number;
  open_id?: string;
  scope?: string;
  token_type?: string;
}) {
  const openId = token.open_id ?? null;
  const key = openId ?? "sandbox-dev-token";

  // TODO: remplacer ce stockage memoire dev par une table DB/Supabase chiffree
  // avant toute utilisation durable en production.
  tokenStore.set(key, {
    provider: "tiktok",
    openId,
    scope: token.scope ?? null,
    tokenType: token.token_type ?? null,
    accessToken: token.access_token,
    refreshToken: token.refresh_token ?? null,
    expiresAt: toExpiresAt(token.expires_in),
    refreshExpiresAt: toExpiresAt(token.refresh_expires_in),
    savedAt: new Date().toISOString(),
  });
}
