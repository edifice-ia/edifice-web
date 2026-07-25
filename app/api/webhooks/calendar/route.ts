import { timingSafeEqual } from "node:crypto";
import { after, NextResponse } from "next/server";
import { performCalendarIncrementalSync } from "@/lib/server/calendar/calendar-sync";
import { getCalendarSyncStateByChannelId } from "@/lib/server/calendar/calendar-sync-state-store";

export const runtime = "nodejs";

function safeEqual(a: string, b: string) {
  const aBuffer = Buffer.from(a);
  const bBuffer = Buffer.from(b);

  if (aBuffer.length !== bBuffer.length) {
    return false;
  }

  return timingSafeEqual(aBuffer, bBuffer);
}

// Google Calendar push notifications : pas de corps JSON, tout est dans les
// en-tetes X-Goog-*. Doc : https://developers.google.com/calendar/api/guides/push
export async function POST(request: Request) {
  const channelId = request.headers.get("x-goog-channel-id");
  const channelToken = request.headers.get("x-goog-channel-token");
  const resourceState = request.headers.get("x-goog-resource-state");

  if (!channelId || !channelToken) {
    console.warn("[Calendar Webhook] notification sans channel-id/channel-token, rejetee");
    return NextResponse.json({ error: "Notification invalide." }, { status: 401 });
  }

  const syncState = await getCalendarSyncStateByChannelId(channelId).catch((error) => {
    console.error("[Calendar Webhook] lecture sync_state impossible", {
      message: error instanceof Error ? error.message : "Erreur inconnue.",
    });
    return null;
  });

  if (!syncState || !safeEqual(syncState.channelToken, channelToken)) {
    console.warn("[Calendar Webhook] canal ou jeton inconnu, rejetee", {
      channelId,
      channelKnown: Boolean(syncState),
    });
    return NextResponse.json({ error: "Canal ou jeton inconnu." }, { status: 401 });
  }

  // "sync" est l'accuse de reception initial envoye par Google juste apres
  // events.watch() : aucune donnee n'a change, ne declenche jamais de sync.
  if (resourceState === "sync") {
    console.info("[Calendar Webhook] accuse de reception initial (sync)", { channelId });
    return NextResponse.json({ ok: true, acknowledged: "sync" });
  }

  if (!syncState.userId) {
    console.warn("[Calendar Webhook] sync_state sans user_id, synchronisation ignoree", {
      channelId,
    });
    return NextResponse.json({ ok: true, skipped: true });
  }

  const userId = syncState.userId;

  // Repond vite a Google : le traitement (appel Google API, upserts
  // Supabase) se fait apres l'envoi de la reponse via after(), qui prolonge
  // l'invocation serverless au-dela du retour de la Response (waitUntil sur
  // Vercel) sans bloquer l'accuse de reception.
  after(async () => {
    try {
      await performCalendarIncrementalSync({ userId });
    } catch (error) {
      console.error("[Calendar Webhook] synchronisation differee en echec", {
        userId,
        message: error instanceof Error ? error.message : "Erreur inconnue.",
      });
    }
  });

  console.info("[Calendar Webhook] notification recue, synchronisation planifiee", {
    channelId,
    resourceState,
  });

  return NextResponse.json({ ok: true });
}
