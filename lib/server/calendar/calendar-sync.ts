import "server-only";

import { sanitizeCalendarError } from "@/lib/server/calendar/calendar-api";
import { ensureCalendarAccessToken } from "@/lib/server/calendar/calendar-oauth";
import {
  getCalendarSyncStateForUser,
  updateCalendarSyncToken,
} from "@/lib/server/calendar/calendar-sync-state-store";
import {
  upsertCalendarEvents,
  type CalendarEventRecord,
  type CalendarEventStatus,
} from "@/lib/server/calendar/calendar-events-store";
import { getOAuthToken } from "@/lib/server/oauth/token-store";

const CALENDAR_ID = "primary";
const EVENTS_PAGE_SIZE = 250;
// Fenetre de rattrapage pour la toute premiere synchronisation complete
// (aucun sync_token stocke). Google deconseille un events.list sans borne de
// temps : sans limite, la premiere synchro remonterait potentiellement des
// annees d'historique.
const INITIAL_SYNC_LOOKBACK_DAYS = 30;
// Garde-fou anti-boucle infinie : une resynchronisation complete apres 410
// GONE relance la pagination depuis le debut, ce compteur couvre a la fois
// les pages normales et un eventuel redemarrage complet sans jamais boucler
// indefiniment en cas de reponse Google inattendue.
const MAX_PAGES_PER_RUN = 50;

type GoogleEventDateTime = { date?: string; dateTime?: string };
type GoogleCalendarEvent = {
  id?: string;
  status?: string;
  summary?: string;
  location?: string;
  start?: GoogleEventDateTime;
  end?: GoogleEventDateTime;
  attendees?: unknown;
};
type GoogleEventsListResponse = {
  items?: GoogleCalendarEvent[];
  nextPageToken?: string;
  nextSyncToken?: string;
  error?: {
    code?: number;
    message?: string;
    errors?: Array<{ reason?: string; message?: string }>;
  };
};

function toEventStatus(status: string | undefined): CalendarEventStatus {
  if (status === "cancelled" || status === "tentative") {
    return status;
  }

  return "confirmed";
}

function mapGoogleEvent(event: GoogleCalendarEvent): CalendarEventRecord | null {
  if (!event.id) {
    return null;
  }

  const isAllDay = Boolean(event.start?.date);

  return {
    googleEventId: event.id,
    title: event.summary ?? null,
    location: event.location ?? null,
    startsAt: event.start?.dateTime ?? (event.start?.date ? `${event.start.date}T00:00:00Z` : null),
    endsAt: event.end?.dateTime ?? (event.end?.date ? `${event.end.date}T00:00:00Z` : null),
    isAllDay,
    attendees: event.attendees ?? null,
    status: toEventStatus(event.status),
  };
}

async function fetchEventsPage({
  accessToken,
  syncToken,
  pageToken,
  timeMin,
}: {
  accessToken: string;
  syncToken?: string;
  pageToken?: string;
  timeMin?: string;
}) {
  const url = new URL(`https://www.googleapis.com/calendar/v3/calendars/${CALENDAR_ID}/events`);
  url.searchParams.set("maxResults", String(EVENTS_PAGE_SIZE));

  if (pageToken) {
    url.searchParams.set("pageToken", pageToken);
  }

  // Regle Google : une fois un sync_token utilise, aucun autre parametre de
  // filtre (timeMin, singleEvents, showDeleted...) n'est accepte (400). Les
  // deux modes sont donc mutuellement exclusifs.
  if (syncToken) {
    url.searchParams.set("syncToken", syncToken);
  } else {
    url.searchParams.set("singleEvents", "true");
    url.searchParams.set("showDeleted", "true");
    if (timeMin) {
      url.searchParams.set("timeMin", timeMin);
    }
  }

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    cache: "no-store",
  });
  const payload = (await response.json()) as GoogleEventsListResponse;

  return { response, payload };
}

export type CalendarSyncResult =
  | { ok: true; userId: string; mode: "full" | "incremental"; eventsSynced: number }
  | { ok: false; userId: string; error: { code?: string | number; message: string } };

// Point d'entree unique de la synchro (webhook et, potentiellement, tout
// futur appelant manuel) : reutilise ensureCalendarAccessToken pour le
// rafraichissement de token plutot que de le reimplementer ici.
export async function performCalendarIncrementalSync({
  userId,
}: {
  userId: string;
}): Promise<CalendarSyncResult> {
  const syncState = await getCalendarSyncStateForUser({ userId, calendarId: CALENDAR_ID });

  if (!syncState) {
    return {
      ok: false,
      userId,
      error: {
        code: "missing_sync_state",
        message: "Aucun canal Google Calendar enregistre pour cet utilisateur.",
      },
    };
  }

  const token = await getOAuthToken("calendar");
  const tokenState = await ensureCalendarAccessToken(token);

  if (!tokenState.ok) {
    return { ok: false, userId, error: tokenState.error };
  }

  let syncToken = syncState.syncToken;
  let mode: "full" | "incremental" = syncToken ? "incremental" : "full";
  let pageToken: string | undefined;
  let eventsSynced = 0;
  let nextSyncToken: string | null = null;
  const timeMin = new Date(
    Date.now() - INITIAL_SYNC_LOOKBACK_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();

  for (let page = 0; page < MAX_PAGES_PER_RUN; page += 1) {
    const { response, payload } = await fetchEventsPage({
      accessToken: tokenState.accessToken,
      syncToken: syncToken ?? undefined,
      pageToken,
      timeMin: mode === "full" ? timeMin : undefined,
    });

    if (response.status === 410) {
      console.warn(
        "[Calendar Sync] sync_token expire (410 GONE), resynchronisation complete",
        { userId },
      );
      await updateCalendarSyncToken({ userId, calendarId: CALENDAR_ID, syncToken: null });
      syncToken = null;
      mode = "full";
      pageToken = undefined;
      continue;
    }

    if (!response.ok || payload.error) {
      return { ok: false, userId, error: sanitizeCalendarError(payload, response.status) };
    }

    const events = (payload.items ?? [])
      .map(mapGoogleEvent)
      .filter((event): event is CalendarEventRecord => event !== null);

    if (events.length > 0) {
      await upsertCalendarEvents({ userId, calendarId: CALENDAR_ID, events });
      eventsSynced += events.length;
    }

    if (payload.nextSyncToken) {
      nextSyncToken = payload.nextSyncToken;
    }

    pageToken = payload.nextPageToken;

    if (!pageToken) {
      break;
    }
  }

  if (nextSyncToken) {
    await updateCalendarSyncToken({ userId, calendarId: CALENDAR_ID, syncToken: nextSyncToken });
  }

  console.info("[Calendar Sync] synchronisation terminee", { userId, mode, eventsSynced });

  return { ok: true, userId, mode, eventsSynced };
}
