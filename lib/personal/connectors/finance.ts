import type { PersonalConnector } from "./types";

export const financeConnector: PersonalConnector = {
  id: "bank-finance",
  provider: "bank",
  label: "Banque / finances",
  description:
    "Préparation d'une source finances pour transactions et repères budgétaires personnels.",
  status: "Indisponible",
  category: "finance",
  capabilities: ["transactions"],
  requiredEnvVars: [],
  syncStrategy: "oauth",
  lastSyncAt: null,
  connectUrl: null,
  isEnabled: false,
};
