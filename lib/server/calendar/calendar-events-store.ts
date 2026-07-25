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

export type CalendarEventStatus = "confirmed" | "tentative" | "cancelled";

export type CalendarEventRecord = {
  googleEventId: string;
  title: string | null;
  location: string | null;
  startsAt: string | null;
  endsAt: string | null;
  isAllDay: boolean;
  attendees: unknown;
  status: CalendarEventStatus;
};

// Upsert en lot cible (user_id, calendar_id, google_event_id). Un evenement
// supprime cote Google revient avec status="cancelled" (showDeleted=true est
// demande explicitement dans calendar-sync.ts) : il est conserve avec ce
// statut plutot que supprime physiquement, pour garder une trace coherente
// avec le flux incremental de Google (qui ne renvoie jamais de "delete").
export async function upsertCalendarEvents({
  userId,
  calendarId = DEFAULT_CALENDAR_ID,
  events,
}: {
  userId: string;
  calendarId?: string;
  events: CalendarEventRecord[];
}): Promise<void> {
  if (events.length === 0) {
    return;
  }

  const supabase = getPersonalClient();
  const rows = events.map((event) => ({
    user_id: userId,
    calendar_id: calendarId,
    google_event_id: event.googleEventId,
    title: event.title,
    location: event.location,
    starts_at: event.startsAt,
    ends_at: event.endsAt,
    is_all_day: event.isAllDay,
    attendees: event.attendees,
    status: event.status,
    synced_at: new Date().toISOString(),
  }));

  const { error } = await supabase
    .from("personal_calendar_events")
    .upsert(rows, { onConflict: "user_id,calendar_id,google_event_id" });

  if (error) {
    throw new Error(error.message);
  }
}
