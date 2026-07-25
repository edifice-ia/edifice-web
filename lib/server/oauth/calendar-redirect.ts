import "server-only";

import type { NextRequest } from "next/server";

const CALENDAR_CALLBACK_PATH = "/api/oauth/calendar/callback";

// Domaines enregistres comme redirect URI cote Google Cloud pour le client
// OAuth "Edifice IA". www.edificeia.com est le domaine canonique ; l'URL
// Vercel reste acceptee pour les previews/anciens acces mais n'est jamais le
// choix par defaut (cf. LEGACY_DOMAIN dans lib/server/oauth/oauth-status.ts).
const CALENDAR_ALLOWED_ORIGINS = [
  "https://www.edificeia.com",
  "https://edifice-web.vercel.app",
];

export function resolveCalendarRedirectUri(request: NextRequest) {
  const origin = request.nextUrl.origin;
  const matchedOrigin = CALENDAR_ALLOWED_ORIGINS.includes(origin)
    ? origin
    : CALENDAR_ALLOWED_ORIGINS[0];

  return `${matchedOrigin}${CALENDAR_CALLBACK_PATH}`;
}
