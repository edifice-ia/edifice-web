import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const DEFAULT_CALENDAR_ID = "primary";

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

export type CalendarSyncState = {
  userId: string | null;
  calendarId: string;
  channelId: string;
  resourceId: string;
  channelToken: string;
  expiresAt: string;
  syncToken: string | null;
  lastSyncedAt: string | null;
};

type CalendarSyncStateRow = {
  user_id: string | null;
  calendar_id: string;
  channel_id: string;
  resource_id: string;
  channel_token: string;
  expires_at: string;
  sync_token: string | null;
  last_synced_at: string | null;
};

function mapRowToSyncState(row: CalendarSyncStateRow): CalendarSyncState {
  return {
    userId: row.user_id,
    calendarId: row.calendar_id,
    channelId: row.channel_id,
    resourceId: row.resource_id,
    channelToken: row.channel_token,
    expiresAt: row.expires_at,
    syncToken: row.sync_token,
    lastSyncedAt: row.last_synced_at,
  };
}

const SYNC_STATE_COLUMNS =
  "user_id,calendar_id,channel_id,resource_id,channel_token,expires_at,sync_token,last_synced_at";

// Upsert cible (user_id, calendar_id) : remplace le canal existant pour cet
// utilisateur/agenda (enregistrement initial ou renouvellement). Le
// sync_token n'est jamais touche ici : un nouveau canal ne change pas ce qui
// a deja ete synchronise, seule performCalendarIncrementalSync le met a jour.
export async function upsertCalendarSyncState({
  userId,
  calendarId = DEFAULT_CALENDAR_ID,
  channelId,
  resourceId,
  channelToken,
  expiresAt,
}: {
  userId: string;
  calendarId?: string;
  channelId: string;
  resourceId: string;
  channelToken: string;
  expiresAt: string;
}): Promise<void> {
  const supabase = getPersonalClient();
  const { error } = await supabase.from("personal_calendar_sync_state").upsert(
    {
      user_id: userId,
      calendar_id: calendarId,
      channel_id: channelId,
      resource_id: resourceId,
      channel_token: channelToken,
      expires_at: expiresAt,
    },
    { onConflict: "user_id,calendar_id" },
  );

  if (error) {
    throw new Error(error.message);
  }
}

export async function updateCalendarSyncToken({
  userId,
  calendarId = DEFAULT_CALENDAR_ID,
  syncToken,
}: {
  userId: string;
  calendarId?: string;
  syncToken: string | null;
}): Promise<void> {
  const supabase = getPersonalClient();
  const { error } = await supabase
    .from("personal_calendar_sync_state")
    .update({ sync_token: syncToken, last_synced_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("calendar_id", calendarId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function getCalendarSyncStateForUser({
  userId,
  calendarId = DEFAULT_CALENDAR_ID,
}: {
  userId: string;
  calendarId?: string;
}): Promise<CalendarSyncState | null> {
  const supabase = getPersonalClient();
  const { data, error } = await supabase
    .from("personal_calendar_sync_state")
    .select(SYNC_STATE_COLUMNS)
    .eq("user_id", userId)
    .eq("calendar_id", calendarId)
    .maybeSingle<CalendarSyncStateRow>();

  if (error) {
    throw new Error(error.message);
  }

  return data ? mapRowToSyncState(data) : null;
}

// Utilise par la route webhook : le seul identifiant que Google fournit dans
// les en-tetes de notification est le channel_id, jamais l'utilisateur.
export async function getCalendarSyncStateByChannelId(
  channelId: string,
): Promise<CalendarSyncState | null> {
  const supabase = getPersonalClient();
  const { data, error } = await supabase
    .from("personal_calendar_sync_state")
    .select(SYNC_STATE_COLUMNS)
    .eq("channel_id", channelId)
    .maybeSingle<CalendarSyncStateRow>();

  if (error) {
    throw new Error(error.message);
  }

  return data ? mapRowToSyncState(data) : null;
}

// Utilise par le cron de renouvellement : traite tous les canaux existants,
// meme esprit que listPersonalGarminDailyStatsUserIds (traite tout ce qui
// est present, sans supposer un unique utilisateur pre-configure).
export async function listCalendarSyncStates(): Promise<CalendarSyncState[]> {
  const supabase = getPersonalClient();
  const { data, error } = await supabase
    .from("personal_calendar_sync_state")
    .select(SYNC_STATE_COLUMNS)
    .returns<CalendarSyncStateRow[]>();

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(mapRowToSyncState);
}
