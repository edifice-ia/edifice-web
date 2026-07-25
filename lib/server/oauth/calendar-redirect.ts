import "server-only";

import type { NextRequest } from "next/server";

const CALENDAR_CALLBACK_PATH = "/api/oauth/calendar/callback";
const CALENDAR_WEBHOOK_PATH = "/api/webhooks/calendar";

// Domaines enregistres comme redirect URI cote Google Cloud pour le client
// OAuth "Edifice IA". www.edificeia.com est le domaine canonique ; l'URL
// Vercel reste acceptee pour les previews/anciens acces mais n'est jamais le
// choix par defaut (cf. LEGACY_DOMAIN dans lib/server/oauth/oauth-status.ts).
// Reutilise pour l'adresse du webhook de notifications push (meme liste
// blanche, une seule source de verite pour les deux usages).
const CALENDAR_ALLOWED_ORIGINS = [
  "https://www.edificeia.com",
  "https://edifice-web.vercel.app",
];

export function resolveCalendarOrigin(origin: string | null | undefined) {
  return origin && CALENDAR_ALLOWED_ORIGINS.includes(origin)
    ? origin
    : CALENDAR_ALLOWED_ORIGINS[0];
}

export function resolveCalendarRedirectUri(request: NextRequest) {
  return `${resolveCalendarOrigin(request.nextUrl.origin)}${CALENDAR_CALLBACK_PATH}`;
}

// Pas de NextRequest disponible depuis le cron de renouvellement (pas de
// requete navigateur entrante) : origin est optionnel et retombe sur le
// domaine canonique dans ce cas, comme pour tout domaine hors liste blanche.
export function resolveCalendarWebhookAddress(origin?: string | null) {
  return `${resolveCalendarOrigin(origin)}${CALENDAR_WEBHOOK_PATH}`;
}
