import "server-only";

import { randomBytes, randomUUID } from "node:crypto";
import { sanitizeCalendarError } from "@/lib/server/calendar/calendar-api";

const CALENDAR_WATCH_CALENDAR_ID = "primary";

type GoogleWatchResponse = {
  id?: string;
  resourceId?: string;
  resourceUri?: string;
  expiration?: string;
  error?: {
    code?: number;
    message?: string;
    errors?: Array<{ reason?: string; message?: string }>;
  };
};

export type CalendarWatchRegistration =
  | {
      ok: true;
      channelId: string;
      resourceId: string;
      channelToken: string;
      expiresAt: string;
    }
  | {
      ok: false;
      error: { code?: string | number; message: string };
    };

// Cree un nouveau canal de notifications push aupres de l'agenda "primary"
// de l'utilisateur connecte. Appelable (a) juste apres l'echange OAuth
// reussi pour demarrer la synchro immediatement, et (b) depuis le cron de
// renouvellement quand un canal existant approche de son expiration.
export async function registerCalendarWatchChannel({
  accessToken,
  address,
}: {
  accessToken: string;
  address: string;
}): Promise<CalendarWatchRegistration> {
  const channelId = randomUUID();
  const channelToken = randomBytes(32).toString("base64url");

  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${CALENDAR_WATCH_CALENDAR_ID}/events/watch`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        id: channelId,
        type: "web_hook",
        address,
        token: channelToken,
      }),
      cache: "no-store",
    },
  );
  const payload = (await response.json()) as GoogleWatchResponse;

  if (!response.ok || payload.error || !payload.resourceId || !payload.expiration) {
    return {
      ok: false,
      error: sanitizeCalendarError(payload, response.status),
    };
  }

  return {
    ok: true,
    channelId: payload.id ?? channelId,
    resourceId: payload.resourceId,
    channelToken,
    expiresAt: new Date(Number(payload.expiration)).toISOString(),
  };
}

// Best-effort : arrete un ancien canal apres son remplacement par un neuf.
// Un echec ici n'est jamais bloquant (le canal expirera de lui-meme cote
// Google) ; l'appelant doit l'entourer d'un try/catch et se contenter de
// logger l'echec.
export async function stopCalendarWatchChannel({
  accessToken,
  channelId,
  resourceId,
}: {
  accessToken: string;
  channelId: string;
  resourceId: string;
}): Promise<void> {
  const response = await fetch("https://www.googleapis.com/calendar/v3/channels/stop", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ id: channelId, resourceId }),
    cache: "no-store",
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(sanitizeCalendarError(payload, response.status).message);
  }
}
