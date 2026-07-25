import { ensureCalendarAccessToken } from "@/lib/server/calendar/calendar-oauth";
import {
  registerCalendarWatchChannel,
  stopCalendarWatchChannel,
} from "@/lib/server/calendar/calendar-watch";
import {
  listCalendarSyncStates,
  upsertCalendarSyncState,
  type CalendarSyncState,
} from "@/lib/server/calendar/calendar-sync-state-store";
import { resolveCalendarWebhookAddress } from "@/lib/server/oauth/calendar-redirect";
import { getOAuthToken } from "@/lib/server/oauth/token-store";

export const runtime = "nodejs";

const RENEWAL_THRESHOLD_MS = 48 * 60 * 60 * 1000;

// Meme garde CRON_SECRET que les autres routes cron internes (voir
// app/api/internal/cron/personal-daily-brief/route.ts) : jamais appelable
// depuis le navigateur, le secret ne doit jamais quitter le serveur.
export function isAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    return false;
  }

  const authorization = request.headers.get("authorization") ?? "";
  const headerSecret = request.headers.get("x-cron-secret") ?? "";

  return authorization === `Bearer ${secret}` || headerSecret === secret;
}

// Meme raisonnement DST que personal-daily-brief/route.ts (isParisHour8) :
// Vercel Cron est fige en UTC et le plan Hobby limite chaque entree a une
// fois par jour, donc vercel.json declare deux entrees quotidiennes ("0 3"
// et "0 4") couvrant les deux decalages UTC possibles pour 5h Europe/Paris ;
// seul l'appel qui tombe reellement a 5h Paris execute le renouvellement,
// l'autre est un no-op silencieux.
export function isParisHour5(now = new Date()) {
  const parisHour = Number(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/Paris",
      hourCycle: "h23",
      hour: "2-digit",
    }).format(now),
  );

  return parisHour === 5;
}

export type CalendarChannelRenewalFailure = {
  userId: string | null;
  channelId: string;
  message: string;
};

export type CalendarChannelRenewalResult = {
  checked: number;
  renewed: number;
  skipped: number;
  failed: CalendarChannelRenewalFailure[];
};

async function renewChannel(state: CalendarSyncState) {
  if (!state.userId) {
    throw new Error("Canal sans user_id, renouvellement impossible.");
  }

  const token = await getOAuthToken("calendar");
  const tokenState = await ensureCalendarAccessToken(token);

  if (!tokenState.ok) {
    throw new Error(tokenState.error.message);
  }

  const address = resolveCalendarWebhookAddress(null);
  const registration = await registerCalendarWatchChannel({
    accessToken: tokenState.accessToken,
    address,
  });

  if (!registration.ok) {
    throw new Error(registration.error.message);
  }

  await upsertCalendarSyncState({
    userId: state.userId,
    calendarId: state.calendarId,
    channelId: registration.channelId,
    resourceId: registration.resourceId,
    channelToken: registration.channelToken,
    expiresAt: registration.expiresAt,
  });

  // Best-effort : l'ancien canal expirera de lui-meme cote Google si l'appel
  // stop echoue, ce n'est jamais bloquant pour le renouvellement.
  try {
    await stopCalendarWatchChannel({
      accessToken: tokenState.accessToken,
      channelId: state.channelId,
      resourceId: state.resourceId,
    });
  } catch (error) {
    console.warn("[Calendar Channel Renewal] arret de l'ancien canal echoue (non bloquant)", {
      channelId: state.channelId,
      message: error instanceof Error ? error.message : "Erreur inconnue.",
    });
  }
}

// Isolation par utilisateur/canal, meme esprit que
// runPersonalDailyBriefCron : un echec sur un canal ne doit jamais bloquer
// le renouvellement des autres.
export async function runCalendarChannelRenewalCron({
  list = listCalendarSyncStates,
  renew = renewChannel,
  now = new Date(),
}: {
  list?: typeof listCalendarSyncStates;
  renew?: typeof renewChannel;
  now?: Date;
} = {}): Promise<CalendarChannelRenewalResult> {
  const states = await list();

  if (states.length === 0) {
    console.info("[Calendar Channel Renewal] aucun canal enregistre, rien a faire.");
    return { checked: 0, renewed: 0, skipped: 0, failed: [] };
  }

  let renewed = 0;
  let skipped = 0;
  const failed: CalendarChannelRenewalFailure[] = [];

  for (const state of states) {
    const expiresInMs = new Date(state.expiresAt).getTime() - now.getTime();

    if (!Number.isFinite(expiresInMs) || expiresInMs > RENEWAL_THRESHOLD_MS) {
      skipped += 1;
      continue;
    }

    try {
      await renew(state);
      renewed += 1;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Renouvellement du canal indisponible.";
      console.error("[Calendar Channel Renewal] renouvellement echoue", {
        user_id: state.userId,
        channel_id: state.channelId,
        message,
      });
      failed.push({ userId: state.userId, channelId: state.channelId, message });
    }
  }

  return { checked: states.length, renewed, skipped, failed };
}

export async function GET(request: Request) {
  // Import differe : voir personal-daily-brief/route.ts pour la raison
  // (next/server ne resout que sous le bundler Next).
  const { NextResponse } = await import("next/server");

  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Acces refuse." }, { status: 401 });
  }

  if (!isParisHour5()) {
    console.info("[Calendar Channel Renewal] hors fenetre 5h Europe/Paris, aucun traitement.", {
      invokedAtUtc: new Date().toISOString(),
    });
    return NextResponse.json({ ok: true, skipped: true, reason: "not_paris_5am" });
  }

  try {
    const result = await runCalendarChannelRenewalCron();
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Renouvellement du canal indisponible.";
    console.error("[Calendar Channel Renewal] failed", { message });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
