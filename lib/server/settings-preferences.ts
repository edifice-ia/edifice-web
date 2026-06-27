import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { pinterestOAuthAccounts } from "@/lib/server/oauth/pinterest-accounts";
import {
  DEFAULT_ACCOUNT_SETTINGS,
  type SettingsPreferencesState,
  normalizeSettingsPreferences,
} from "@/lib/settings-preferences";

type UserPreferencesRow = {
  account_preferences: Record<string, unknown> | null;
  global_preferences: Record<string, unknown> | null;
  updated_at: string | null;
  user_id: string;
};

let settingsClient: SupabaseClient | null = null;

function getSettingsClient() {
  if (settingsClient) {
    return settingsClient;
  }

  const supabaseUrl =
    process.env.SUPABASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Settings preferences require SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  }

  settingsClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return settingsClient;
}

function buildKnownAccounts() {
  const pinterestAccounts = pinterestOAuthAccounts.map((account) => ({
    accountKey: account.accountKey,
    color: account.accountKey === "solution_sommeil" ? "#7DD3FC" : "#39E6D0",
    displayName: DEFAULT_ACCOUNT_SETTINGS[account.accountKey]?.displayName ?? account.label.replace("Pinterest - ", ""),
    source: "pinterest_oauth" as const,
  }));

  return [
    {
      accountKey: "lignes_interieures",
      color: "#F8FAFC",
      displayName: DEFAULT_ACCOUNT_SETTINGS.lignes_interieures.displayName ?? "Lignes Interieures",
      source: "shorts" as const,
    },
    ...pinterestAccounts,
  ];
}

function fallbackState(): SettingsPreferencesState {
  const normalized = normalizeSettingsPreferences({});
  return {
    ...normalized,
    accounts: buildKnownAccounts(),
    storageAvailable: false,
    updatedAt: null,
  };
}

export async function readSettingsPreferences(userId: string): Promise<SettingsPreferencesState> {
  try {
    const { data, error } = await getSettingsClient()
      .from("user_preferences")
      .select("user_id,global_preferences,account_preferences,updated_at")
      .eq("user_id", userId)
      .maybeSingle<UserPreferencesRow>();

    if (error) {
      throw error;
    }

    const normalized = normalizeSettingsPreferences({
      accountPreferences: data?.account_preferences,
      globalPreferences: data?.global_preferences,
    });

    return {
      ...normalized,
      accounts: buildKnownAccounts(),
      storageAvailable: true,
      updatedAt: data?.updated_at ?? null,
    };
  } catch (error) {
    console.warn("[Settings Preferences] fallback", {
      message: error instanceof Error ? error.message : "unknown",
    });
    return fallbackState();
  }
}

export async function saveSettingsPreferences({
  accountPreferences,
  globalPreferences,
  userId,
}: {
  accountPreferences: unknown;
  globalPreferences: unknown;
  userId: string;
}) {
  const normalized = normalizeSettingsPreferences({
    accountPreferences,
    globalPreferences,
  });

  const { error } = await getSettingsClient()
    .from("user_preferences")
    .upsert(
      {
        account_preferences: normalized.accountPreferences,
        global_preferences: normalized.globalPreferences,
        user_id: userId,
      },
      { onConflict: "user_id" },
    );

  if (error) {
    throw new Error(`Enregistrement des reglages impossible: ${error.message}`);
  }

  return readSettingsPreferences(userId);
}

export async function resetSettingsPreferences(userId: string) {
  const normalized = normalizeSettingsPreferences({});
  return saveSettingsPreferences({
    accountPreferences: normalized.accountPreferences,
    globalPreferences: normalized.globalPreferences,
    userId,
  });
}
