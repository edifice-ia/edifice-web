export type MetaTokenRecord = {
  provider: "meta";
  tokenType: string | null;
  accessToken: string;
  expiresAt: string | null;
  savedAt: string;
};

let metaToken: MetaTokenRecord | null = null;

function toExpiresAt(seconds: unknown) {
  if (typeof seconds !== "number" || !Number.isFinite(seconds)) {
    return null;
  }

  return new Date(Date.now() + seconds * 1000).toISOString();
}

export async function saveMetaToken(token: {
  access_token: string;
  token_type?: string;
  expires_in?: number;
}) {
  // TODO: remplacer ce stockage memoire dev par une table DB/Supabase chiffree
  // avant toute utilisation durable en production.
  metaToken = {
    provider: "meta",
    tokenType: token.token_type ?? null,
    accessToken: token.access_token,
    expiresAt: toExpiresAt(token.expires_in),
    savedAt: new Date().toISOString(),
  };
}

export function hasStoredMetaToken() {
  return Boolean(metaToken?.accessToken);
}

export function getMetaTokenStatus() {
  return {
    present: Boolean(metaToken?.accessToken),
    expiresAt: metaToken?.expiresAt ?? null,
  };
}
