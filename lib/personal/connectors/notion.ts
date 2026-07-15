import type { PersonalConnector } from "./types";

export const notionConnector: PersonalConnector = {
  id: "notion",
  provider: "notion",
  label: "Notion",
  description:
    "Préparation du futur connecteur productivité pour notes, tâches et bases personnelles.",
  status: "Préparé",
  category: "productivity",
  capabilities: ["tasks", "notes"],
  requiredEnvVars: [
    "NOTION_CLIENT_ID",
    "NOTION_CLIENT_SECRET",
    "NOTION_REDIRECT_URI",
  ],
  syncStrategy: "oauth",
  lastSyncAt: null,
  connectUrl: null,
  isEnabled: false,
};
