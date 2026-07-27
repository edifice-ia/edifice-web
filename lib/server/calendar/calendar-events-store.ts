import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getOAuthTokenStatus } from "@/lib/server/oauth/token-store";
import type { CockpitCalendarTodayState } from "@/types/cockpit";

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

type CalendarEventReadRow = {
  google_event_id: string;
  title: string | null;
  location: string | null;
  starts_at: string | null;
  ends_at: string | null;
  is_all_day: boolean;
};

function mapReadRowToEvent(
  row: CalendarEventReadRow,
): CockpitCalendarTodayState["events"][number] {
  return {
    id: row.google_event_id,
    title: row.title ?? "Evenement sans titre",
    location: row.location,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    isAllDay: row.is_all_day,
  };
}

function getParisDateString(date: Date) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" }).format(date);
}

function addDaysToDateString(dateString: string, days: number) {
  const [year, month, day] = dateString.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

// Convertit "minuit Europe/Paris" pour une date calendaire (YYYY-MM-DD,
// telle que percue a Paris) en instant UTC precis. Necessaire car
// `${date}T00:00:00Z` ignore le decalage +1h/+2h (CET/CEST) et decalerait
// les bornes de plusieurs heures ; calcule independamment pour chaque borne
// (plutot qu'un simple +24h) pour rester correct les jours de changement
// d'heure, ou minuit a minuit ne fait pas exactement 24h en UTC.
function parisMidnightUtc(dateString: string) {
  const naiveUtc = new Date(`${dateString}T00:00:00Z`);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(naiveUtc);
  const get = (type: string) =>
    Number(parts.find((part) => part.type === type)?.value ?? 0);
  const parisLocalAsUtcMs = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour"),
    get("minute"),
    get("second"),
  );
  const offsetMs = parisLocalAsUtcMs - naiveUtc.getTime();

  return new Date(naiveUtc.getTime() - offsetMs);
}

// Lecture seule partagee entre le Cockpit ("Calendrier du jour") et
// l'Espace interieur (onglet Calendrier) : evenements non annules dont le
// debut tombe dans une plage de jours calendaires Europe/Paris, triee par
// starts_at croissant. startDayOffset=0 + days=1 = aujourd'hui ;
// startDayOffset=1 + days=7 = les 7 prochains jours. "connected" reflete
// l'etat reel du token OAuth (oauth_tokens), pas le flag statique isEnabled
// du connecteur lib/personal/connectors/calendar.ts.
export async function readCalendarEventsForParisRange({
  startDayOffset = 0,
  days = 1,
  now = new Date(),
}: {
  startDayOffset?: number;
  days?: number;
  now?: Date;
} = {}): Promise<CockpitCalendarTodayState> {
  const tokenStatus = await getOAuthTokenStatus("calendar").catch(() => null);
  const connected = Boolean(tokenStatus?.present);

  if (!connected) {
    return { connected: false, events: [], readError: null };
  }

  const todayString = getParisDateString(now);
  const start = parisMidnightUtc(addDaysToDateString(todayString, startDayOffset));
  const end = parisMidnightUtc(addDaysToDateString(todayString, startDayOffset + days));

  let supabase: SupabaseClient;
  try {
    supabase = getPersonalClient();
  } catch {
    return {
      connected,
      events: [],
      readError: "Configuration Supabase serveur absente.",
    };
  }
  const { data, error } = await supabase
    .from("personal_calendar_events")
    .select("google_event_id, title, location, starts_at, ends_at, is_all_day")
    .neq("status", "cancelled")
    .gte("starts_at", start.toISOString())
    .lt("starts_at", end.toISOString())
    .order("starts_at", { ascending: true })
    .returns<CalendarEventReadRow[]>();

  if (error) {
    return {
      connected,
      events: [],
      readError: `Lecture personal_calendar_events impossible: ${error.message}`,
    };
  }

  return {
    connected,
    events: (data ?? []).map(mapReadRowToEvent),
    readError: null,
  };
}
