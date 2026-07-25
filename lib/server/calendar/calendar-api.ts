import "server-only";

type GoogleCalendarApiError = {
  error?: {
    code?: number;
    message?: string;
    errors?: Array<{
      reason?: string;
      message?: string;
    }>;
  };
};

type GoogleCalendarListResponse = GoogleCalendarApiError & {
  items?: Array<{
    id?: string;
    summary?: string;
    primary?: boolean;
  }>;
};

export type CalendarDiagnostic =
  | {
      ok: true;
      calendarDetected: true;
      calendarId: string;
      calendarSummary: string;
    }
  | {
      ok: false;
      calendarDetected: false;
      error: {
        code?: string | number;
        message: string;
      };
    };

export function sanitizeCalendarError(payload: unknown, fallbackStatus?: number) {
  if (!payload || typeof payload !== "object") {
    return {
      code: fallbackStatus,
      message: "Google Calendar API request failed.",
    };
  }

  const record = payload as GoogleCalendarApiError;
  const firstReason = record.error?.errors?.[0]?.reason;

  return {
    code: firstReason ?? record.error?.code ?? fallbackStatus,
    message:
      record.error?.message ??
      record.error?.errors?.[0]?.message ??
      "Google Calendar API request failed.",
  };
}

export async function getPrimaryCalendar(
  accessToken: string,
): Promise<CalendarDiagnostic> {
  const url = new URL(
    "https://www.googleapis.com/calendar/v3/users/me/calendarList",
  );
  url.searchParams.set("minAccessRole", "reader");

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    cache: "no-store",
  });
  const payload = (await response.json()) as GoogleCalendarListResponse;

  if (!response.ok || payload.error) {
    return {
      ok: false,
      calendarDetected: false,
      error: sanitizeCalendarError(payload, response.status),
    };
  }

  const calendar =
    payload.items?.find((item) => item.primary) ?? payload.items?.[0];

  if (!calendar?.id) {
    return {
      ok: false,
      calendarDetected: false,
      error: {
        code: "missing_calendar",
        message: "Aucun agenda Google Calendar trouve pour ce token.",
      },
    };
  }

  return {
    ok: true,
    calendarDetected: true,
    calendarId: calendar.id,
    calendarSummary: calendar.summary ?? "Agenda Google",
  };
}
