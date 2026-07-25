import type { PersonalConnector } from "./types";

export const googleCalendarConnector: PersonalConnector = {
  id: "google-calendar",
  provider: "google_calendar",
  label: "Google Calendar",
  description:
    "Préparation du futur connecteur calendrier pour rendez-vous, blocs de temps et repères quotidiens.",
  status: "Préparé",
  category: "calendar",
  capabilities: ["calendar_events"],
  requiredEnvVars: ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"],
  syncStrategy: "oauth",
  lastSyncAt: null,
  connectUrl: null,
  isEnabled: false,
};
