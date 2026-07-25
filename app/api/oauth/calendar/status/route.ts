import { getPrimaryCalendar } from "@/lib/server/calendar/calendar-api";
import {
  buildCalendarScopeDiagnostic,
  ensureCalendarAccessToken,
  readCalendarGrantedScopes,
} from "@/lib/server/calendar/calendar-oauth";
import {
  getOAuthToken,
  getOAuthTokenStatus,
} from "@/lib/server/oauth/token-store";

export async function GET() {
  console.info("[Calendar OAuth Status] status requested");

  const status = await getOAuthTokenStatus("calendar");
  const token = await getOAuthToken("calendar");
  const tokenState = await ensureCalendarAccessToken(token);

  if (!tokenState.ok) {
    return Response.json({
      ...status,
      connected: false,
      calendarDetected: false,
      calendarSummary: null,
      calendarId: null,
      scopes: buildCalendarScopeDiagnostic([]),
      logs: tokenState.logs,
      error: tokenState.error,
    });
  }

  const tokenInfo = await readCalendarGrantedScopes(tokenState.accessToken);
  const grantedScopes =
    tokenInfo.scopes ??
    tokenState.token.scope?.split(/[\s,]+/).filter(Boolean) ??
    [];
  const calendar = await getPrimaryCalendar(tokenState.accessToken);

  if (calendar.ok) {
    console.info("[Calendar OAuth Status] calendar detected", {
      calendarId: calendar.calendarId,
      calendarSummary: calendar.calendarSummary,
    });
  }

  return Response.json({
    ...status,
    connected: status.present && calendar.ok,
    token: {
      present: status.present,
      storageMode: status.storageMode,
      expiresAt: tokenState.token.expiresAt ?? status.expiresAt,
    },
    calendarDetected: calendar.ok,
    calendarSummary: calendar.ok ? calendar.calendarSummary : null,
    calendarId: calendar.ok ? calendar.calendarId : null,
    scopes: {
      ...buildCalendarScopeDiagnostic(grantedScopes),
      source: tokenInfo.source,
      isValid: tokenInfo.isValid,
      expiresAt: tokenInfo.expiresAt,
      error: tokenInfo.error,
    },
    logs: [
      ...tokenState.logs,
      calendar.ok
        ? "Agenda Google Calendar detecte."
        : "Agenda Google Calendar non detecte.",
    ],
    error: calendar.ok ? null : calendar.error,
  });
}
