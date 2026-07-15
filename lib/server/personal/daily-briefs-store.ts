import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { RecoveryLevel, RecommendedFocusEntry } from "./daily-brief-engine";

let personalClient: SupabaseClient | null = null;

function getPersonalClient() {
  if (personalClient) {
    return personalClient;
  }

  const supabaseUrl =
    process.env.SUPABASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Configuration Supabase Personnel manquante.");
  }

  personalClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return personalClient;
}

// Ecrit uniquement dans personal_daily_briefs. N'importe et n'appelle jamais
// de fonction d'ecriture sur trajectoire_actions ou trajectoire_objectives :
// le brief est une proposition, jamais une mutation directe de Trajectoire.
export async function upsertPersonalDailyBrief({
  userId,
  date,
  recoveryLevel,
  recommendedFocus,
}: {
  userId: string;
  date: string;
  recoveryLevel: RecoveryLevel;
  recommendedFocus: RecommendedFocusEntry[];
}) {
  const supabase = getPersonalClient();
  const { error } = await supabase.from("personal_daily_briefs").upsert(
    {
      user_id: userId,
      date,
      recovery_level: recoveryLevel,
      recommended_focus: recommendedFocus,
      generated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,date" },
  );

  if (error) {
    throw new Error(error.message);
  }
}
