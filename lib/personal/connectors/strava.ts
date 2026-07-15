import type { PersonalConnector } from "./types";

export const stravaConnector: PersonalConnector = {
  id: "strava",
  provider: "strava",
  label: "Strava",
  description:
    "Préparation du futur connecteur sport pour activités, effort et suivi d'entraînement.",
  status: "Préparé",
  category: "sport",
  capabilities: ["activities", "recovery"],
  requiredEnvVars: [
    "STRAVA_CLIENT_ID",
    "STRAVA_CLIENT_SECRET",
    "STRAVA_REDIRECT_URI",
  ],
  syncStrategy: "oauth",
  lastSyncAt: null,
  connectUrl: null,
  isEnabled: false,
};
