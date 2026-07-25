import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { ensureCalendarAccessToken } from "@/lib/server/calendar/calendar-oauth";
import { performCalendarIncrementalSync } from "@/lib/server/calendar/calendar-sync";
import { registerCalendarWatchChannel } from "@/lib/server/calendar/calendar-watch";
import { upsertCalendarSyncState } from "@/lib/server/calendar/calendar-sync-state-store";
import { resolveCalendarWebhookAddress } from "@/lib/server/oauth/calendar-redirect";
import { getOAuthToken } from "@/lib/server/oauth/token-store";
import { canAccessPrivateCockpit } from "@/src/lib/auth/roles";
import { getCurrentUser } from "@/src/lib/supabase/server";

export const runtime = "nodejs";

// Outil de rattrapage manuel : enregistre (ou remplace) le canal de
// notifications push pour l'utilisateur connecte, puis declenche
// immediatement une synchronisation (complete si aucun sync_token n'existe
// encore, incrementale sinon) au lieu d'attendre la premiere notification
// Google reelle. Utile a la fois pour le tout premier enregistrement une
// fois les tables Supabase creees, et comme "forcer une resynchronisation"
// generique plus tard. Session cookie requis (meme garde que le reste du
// cockpit) : a appeler depuis le navigateur, connecte, pas via curl seul.
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !canAccessPrivateCockpit(user)) {
    return NextResponse.json({ error: "Acces refuse." }, { status: 403 });
  }

  const token = await getOAuthToken("calendar");
  const tokenState = await ensureCalendarAccessToken(token);

  if (!tokenState.ok) {
    console.warn("[Calendar Register Channel] token Google Calendar indisponible", {
      error: tokenState.error,
    });
    return NextResponse.json({ ok: false, step: "token", error: tokenState.error }, { status: 400 });
  }

  const address = resolveCalendarWebhookAddress(request.nextUrl.origin);
  const registration = await registerCalendarWatchChannel({
    accessToken: tokenState.accessToken,
    address,
  });

  if (!registration.ok) {
    console.error("[Calendar Register Channel] echec events.watch", {
      error: registration.error,
    });
    return NextResponse.json(
      { ok: false, step: "watch", error: registration.error },
      { status: 502 },
    );
  }

  await upsertCalendarSyncState({
    userId: user.id,
    channelId: registration.channelId,
    resourceId: registration.resourceId,
    channelToken: registration.channelToken,
    expiresAt: registration.expiresAt,
  });

  console.info("[Calendar Register Channel] canal enregistre, synchronisation initiale demarree", {
    channelId: registration.channelId,
    expiresAt: registration.expiresAt,
  });

  const syncResult = await performCalendarIncrementalSync({ userId: user.id });

  return NextResponse.json({
    ok: true,
    channel: {
      channelId: registration.channelId,
      resourceId: registration.resourceId,
      expiresAt: registration.expiresAt,
    },
    sync: syncResult,
  });
}
