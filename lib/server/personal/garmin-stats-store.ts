import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { PersonalGarminDailyStats } from "@/lib/personal/connectors/garmin";

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

type PersonalGarminDailyStatsRow = {
  date: string;
  sleep_score: number | null;
  sleep_duration_minutes: number | null;
  sleep_deep_minutes: number | null;
  sleep_rem_minutes: number | null;
  sleep_light_minutes: number | null;
  body_battery_min: number | null;
  body_battery_max: number | null;
  body_battery_charged: number | null;
  body_battery_drained: number | null;
  hrv_status: string | null;
  hrv_last_night_avg: number | null;
  resting_heart_rate: number | null;
  stress_avg: number | null;
  stress_max: number | null;
  training_load_7day: number | null;
  training_readiness_score: number | null;
  raw_payload: unknown;
};

function mapRowToStats(row: PersonalGarminDailyStatsRow): PersonalGarminDailyStats {
  return {
    date: row.date,
    sleepScore: row.sleep_score,
    sleepDurationMinutes: row.sleep_duration_minutes,
    sleepDeepMinutes: row.sleep_deep_minutes,
    sleepRemMinutes: row.sleep_rem_minutes,
    sleepLightMinutes: row.sleep_light_minutes,
    bodyBatteryMin: row.body_battery_min,
    bodyBatteryMax: row.body_battery_max,
    bodyBatteryCharged: row.body_battery_charged,
    bodyBatteryDrained: row.body_battery_drained,
    hrvStatus: row.hrv_status,
    hrvLastNightAvg: row.hrv_last_night_avg,
    restingHeartRate: row.resting_heart_rate,
    stressAvg: row.stress_avg,
    stressMax: row.stress_max,
    trainingLoad7Day: row.training_load_7day,
    trainingReadinessScore: row.training_readiness_score,
    rawPayload: row.raw_payload,
  };
}

export async function upsertPersonalGarminDailyStats({
  userId,
  stats,
}: {
  userId: string;
  stats: PersonalGarminDailyStats;
}) {
  const supabase = getPersonalClient();
  const { error } = await supabase.from("personal_garmin_daily_stats").upsert(
    {
      user_id: userId,
      date: stats.date,
      sleep_score: stats.sleepScore,
      sleep_duration_minutes: stats.sleepDurationMinutes,
      sleep_deep_minutes: stats.sleepDeepMinutes,
      sleep_rem_minutes: stats.sleepRemMinutes,
      sleep_light_minutes: stats.sleepLightMinutes,
      body_battery_min: stats.bodyBatteryMin,
      body_battery_max: stats.bodyBatteryMax,
      body_battery_charged: stats.bodyBatteryCharged,
      body_battery_drained: stats.bodyBatteryDrained,
      hrv_status: stats.hrvStatus,
      hrv_last_night_avg: stats.hrvLastNightAvg,
      resting_heart_rate: stats.restingHeartRate,
      stress_avg: stats.stressAvg,
      stress_max: stats.stressMax,
      training_load_7day: stats.trainingLoad7Day,
      training_readiness_score: stats.trainingReadinessScore,
      raw_payload: stats.rawPayload,
      synced_at: new Date().toISOString(),
    },
    { onConflict: "user_id,date" },
  );

  if (error) {
    throw new Error(error.message);
  }
}

export async function readPersonalGarminDailyStats({
  userId,
  date,
}: {
  userId: string;
  date: string;
}): Promise<PersonalGarminDailyStats | null> {
  const supabase = getPersonalClient();
  const { data, error } = await supabase
    .from("personal_garmin_daily_stats")
    .select(
      "date,sleep_score,sleep_duration_minutes,sleep_deep_minutes,sleep_rem_minutes,sleep_light_minutes,body_battery_min,body_battery_max,body_battery_charged,body_battery_drained,hrv_status,hrv_last_night_avg,resting_heart_rate,stress_avg,stress_max,training_load_7day,training_readiness_score,raw_payload",
    )
    .eq("user_id", userId)
    .eq("date", date)
    .maybeSingle<PersonalGarminDailyStatsRow>();

  if (error) {
    throw new Error(error.message);
  }

  return data ? mapRowToStats(data) : null;
}

// Utilise par le cron du brief quotidien : mirrors
// processScheduledInstagramPublications (traite tout ce qui est pret, sans
// supposer un utilisateur unique configure a l'avance). Une liste vide
// signifie simplement qu'aucune synchronisation Garmin n'est arrivee pour
// cette date (connecteur non actif, webhook pas encore recu, etc.).
export async function listPersonalGarminDailyStatsUserIds({
  date,
}: {
  date: string;
}): Promise<string[]> {
  const supabase = getPersonalClient();
  const { data, error } = await supabase
    .from("personal_garmin_daily_stats")
    .select("user_id")
    .eq("date", date)
    .returns<Array<{ user_id: string | null }>>();

  if (error) {
    throw new Error(error.message);
  }

  const userIds = (data ?? [])
    .map((row) => row.user_id)
    .filter((userId): userId is string => Boolean(userId));

  return Array.from(new Set(userIds));
}
