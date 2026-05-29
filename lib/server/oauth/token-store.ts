import { createClient, type SupabaseClient } from "@supabase/supabase-js";

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

type OAuthTokenRow = {
  provider: OAuthTokenProvider;
  access_token: string | null;
  refresh_token: string | null;
  token_type: string | null;
  scope: string | null;
  expires_at: string | null;
  updated_at: string;
};

type OAuthTokenStatus = {
  present: boolean;
  storageEnabled: true;
  storageMode: "supabase";
  expiresAt: string | null;
  updatedAt: string | null;
};

let supabaseAdmin: SupabaseClient | null = null;

function getSupabaseAdminClient() {
  if (supabaseAdmin) {
    return supabaseAdmin;
  }

  const supabaseUrl = process.env.SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "OAuth token storage requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
    );
  }

  console.info("[OAuth Token Store] storage=supabase");

  supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return supabaseAdmin;
}

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

function mapRowToRecord(row: OAuthTokenRow): OAuthTokenRecord {
  return {
    provider: row.provider,
    accessToken: row.access_token,
    refreshToken: row.refresh_token,
    tokenType: row.token_type,
    scope: row.scope,
    openId: null,
    expiresAt: row.expires_at,
    refreshExpiresAt: null,
    updatedAt: row.updated_at,
  };
}

export async function saveOAuthToken(
  provider: OAuthTokenProvider,
  tokenPayload: OAuthTokenPayload,
) {
  if (!tokenPayload.access_token) {
    throw new Error(`Cannot save empty OAuth token for provider ${provider}.`);
  }

  const now = new Date().toISOString();
  const updatedAt = tokenPayload.updated_at ?? now;
  const supabase = getSupabaseAdminClient();

  console.info(`[OAuth Token Store] save provider=${provider}`);

  const { error } = await supabase.from("oauth_tokens").upsert(
    {
      provider,
      access_token: tokenPayload.access_token ?? null,
      refresh_token: tokenPayload.refresh_token ?? null,
      token_type: tokenPayload.token_type ?? null,
      scope: tokenPayload.scope ?? null,
      expires_at: normalizeExpiresAt(tokenPayload),
      updated_at: updatedAt,
    },
    { onConflict: "provider" },
  );

  if (error) {
    throw new Error(`Failed to save OAuth token for provider ${provider}.`);
  }
}

export async function getOAuthTokenStatus(
  provider: OAuthTokenProvider,
): Promise<OAuthTokenStatus> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("oauth_tokens")
    .select("access_token, expires_at, updated_at")
    .eq("provider", provider)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to read OAuth token status for provider ${provider}.`);
  }

  const tokenPresent = Boolean(data?.access_token);

  console.info(
    `[OAuth Token Store] status provider=${provider} token present ${
      tokenPresent ? "yes" : "no"
    }`,
  );

  return {
    present: tokenPresent,
    storageEnabled: true,
    storageMode: "supabase",
    expiresAt: data?.expires_at ?? null,
    updatedAt: data?.updated_at ?? null,
  };
}

export async function getOAuthToken(provider: OAuthTokenProvider) {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("oauth_tokens")
    .select("provider, access_token, refresh_token, token_type, scope, expires_at, updated_at")
    .eq("provider", provider)
    .maybeSingle<OAuthTokenRow>();

  if (error) {
    throw new Error(`Failed to read OAuth token for provider ${provider}.`);
  }

  return data ? mapRowToRecord(data) : null;
}

export async function clearOAuthToken(provider: OAuthTokenProvider) {
  const supabase = getSupabaseAdminClient();
  const { error } = await supabase
    .from("oauth_tokens")
    .delete()
    .eq("provider", provider);

  if (error) {
    throw new Error(`Failed to clear OAuth token for provider ${provider}.`);
  }
}
