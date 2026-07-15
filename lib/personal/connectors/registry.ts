import { googleCalendarConnector } from "./calendar";
import { financeConnector } from "./finance";
import { garminConnector } from "./garmin";
import { notionConnector } from "./notion";
import { stravaConnector } from "./strava";
import type {
  PersonalConnector,
  PersonalConnectorCategory,
  PersonalConnectorProvider,
} from "./types";

const manualConnector: PersonalConnector = {
  id: "manual-entry",
  provider: "manual",
  label: "Saisie manuelle",
  description:
    "Source locale prévue pour journal, notes et décisions saisies directement dans l'espace intérieur.",
  status: "À connecter",
  category: "notes",
  capabilities: ["notes", "tasks"],
  requiredEnvVars: [],
  syncStrategy: "manual",
  lastSyncAt: null,
  connectUrl: null,
  isEnabled: false,
};

const personalConnectors: PersonalConnector[] = [
  garminConnector,
  googleCalendarConnector,
  stravaConnector,
  notionConnector,
  financeConnector,
  manualConnector,
];

export function getPersonalConnectors() {
  return personalConnectors;
}

export function getPersonalConnectorByProvider(
  provider: PersonalConnectorProvider,
) {
  return personalConnectors.find((connector) => connector.provider === provider) ?? null;
}

export function getEnabledPersonalConnectors() {
  return personalConnectors.filter((connector) => connector.isEnabled);
}

export function getConnectorsByCategory(category: PersonalConnectorCategory) {
  return personalConnectors.filter((connector) => connector.category === category);
}
