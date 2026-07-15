export type PersonalConnectorProvider =
  | "garmin"
  | "google_calendar"
  | "strava"
  | "notion"
  | "bank"
  | "manual";

export type PersonalConnectorCategory =
  | "health"
  | "sport"
  | "calendar"
  | "productivity"
  | "finance"
  | "notes";

export type PersonalConnectorCapability =
  | "activities"
  | "heart_rate"
  | "sleep"
  | "stress"
  | "body_battery"
  | "recovery"
  | "vo2max"
  | "calendar_events"
  | "tasks"
  | "notes"
  | "transactions";

export type PersonalConnectorStatus =
  | "À connecter"
  | "Préparé"
  | "Indisponible";

export type PersonalConnectorSyncStrategy =
  | "manual"
  | "oauth"
  | "scheduled";

export type PersonalConnector = {
  id: string;
  provider: PersonalConnectorProvider;
  label: string;
  description: string;
  status: PersonalConnectorStatus;
  category: PersonalConnectorCategory;
  capabilities: PersonalConnectorCapability[];
  requiredEnvVars: string[];
  syncStrategy: PersonalConnectorSyncStrategy;
  lastSyncAt: string | null;
  connectUrl: string | null;
  isEnabled: boolean;
};

export type PersonalConnectorSyncResult =
  | {
      provider: PersonalConnectorProvider;
      success: true;
      syncedAt: string;
      recordsSynced: number;
    }
  | {
      provider: PersonalConnectorProvider;
      success: false;
      reason: string;
    };
