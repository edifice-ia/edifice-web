import { generateDailyBrief, todayInParis } from "@/lib/server/personal/daily-brief-engine";
import { listPersonalGarminDailyStatsUserIds } from "@/lib/server/personal/garmin-stats-store";

export const runtime = "nodejs";

// Exported (in addition to the Next.js route conventions below) so
// verification scripts can exercise the auth check without a real Supabase
// call. Next.js only special-cases GET/POST/... and a small set of config
// exports; extra named exports are ignored by the framework, not rejected.
export function isAuthorized(request: Request) {
  // NOTE: This route is intended for Vercel Cron or an internal caller only.
  // Never call it from the browser; CRON_SECRET must stay server-side.
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    return false;
  }

  const authorization = request.headers.get("authorization") ?? "";
  const headerSecret = request.headers.get("x-cron-secret") ?? "";

  return authorization === `Bearer ${secret}` || headerSecret === secret;
}

// Vercel Cron schedules (vercel.json) are UTC-only and Hobby plan limits each
// entry to once a day, so a single fixed UTC schedule would drift by one hour
// across the Europe/Paris DST transition. Instead, vercel.json declares two
// daily entries ("0 6 * * *" and "0 7 * * *") covering both possible UTC
// offsets, and this check decides which of the two invocations is the real
// one: only the call that actually lands at 8am Europe/Paris runs the brief
// generation; the other is a silent no-op, same spirit as the "no data yet"
// case (never an error).
export function isParisHour8(now = new Date()) {
  const parisHour = Number(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/Paris",
      hourCycle: "h23",
      hour: "2-digit",
    }).format(now),
  );

  return parisHour === 8;
}

export type PersonalDailyBriefCronFailure = {
  userId: string;
  message: string;
};

export type PersonalDailyBriefCronResult = {
  date: string;
  generated: number;
  userIds: string[];
  failed: PersonalDailyBriefCronFailure[];
};

// Mirrors processScheduledInstagramPublications: processes whatever is ready
// (every user_id with a Garmin sync for today) instead of assuming a single
// pre-configured owner user. An empty list is the normal, non-error shape of
// "no Garmin data yet for today" (connector not enabled, webhook not
// received, migrations not applied) : it must never surface as an error.
//
// Mirrors its per-item isolation too (shorts-publication.ts:2150-2189): each
// user is processed in its own try/catch so one failure (transient Supabase
// error, malformed row, ...) never blocks the rest of the batch or fails the
// whole cron run.
export async function runPersonalDailyBriefCron({
  date = todayInParis(),
  listUserIds = listPersonalGarminDailyStatsUserIds,
  generate = generateDailyBrief,
}: {
  date?: string;
  listUserIds?: typeof listPersonalGarminDailyStatsUserIds;
  generate?: typeof generateDailyBrief;
} = {}): Promise<PersonalDailyBriefCronResult> {
  const userIds = await listUserIds({ date });

  if (userIds.length === 0) {
    console.info("[Personal Daily Brief Cron] aucune donnee Garmin pour aujourd'hui, aucun brief genere.", {
      date,
    });
    return { date, generated: 0, userIds: [], failed: [] };
  }

  const succeeded: string[] = [];
  const failed: PersonalDailyBriefCronFailure[] = [];

  for (const userId of userIds) {
    try {
      await generate({ userId, date });
      succeeded.push(userId);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Generation du brief indisponible.";
      console.error("[Personal Daily Brief Cron] brief generation failed", {
        user_id: userId,
        date,
        message,
      });
      failed.push({ userId, message });
    }
  }

  return { date, generated: succeeded.length, userIds: succeeded, failed };
}

export async function GET(request: Request) {
  // Import differe : "next/server" ne resout que sous le bundler Next et
  // casserait l'import de ce module par un script de verification en Node
  // pur. GET n'est jamais appele par ces scripts, donc ce chemin n'est
  // declenche qu'en execution reelle.
  const { NextResponse } = await import("next/server");

  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Acces refuse." }, { status: 401 });
  }

  if (!isParisHour8()) {
    console.info("[Personal Daily Brief Cron] hors fenetre 8h Europe/Paris, aucun traitement.", {
      invokedAtUtc: new Date().toISOString(),
    });
    return NextResponse.json({ ok: true, skipped: true, reason: "not_paris_8am" });
  }

  try {
    const result = await runPersonalDailyBriefCron();
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Generation du brief indisponible.";
    console.error("[Personal Daily Brief Cron] failed", { message });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
