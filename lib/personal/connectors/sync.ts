import { garminConnector } from "./garmin";
import { getEnabledPersonalConnectors } from "./registry";
import type {
  PersonalConnectorProvider,
  PersonalConnectorSyncResult,
} from "./types";

export async function syncPersonalConnector(
  userId: string,
  provider: PersonalConnectorProvider,
): Promise<PersonalConnectorSyncResult> {
  if (provider === "garmin") {
    // Defense in depth (DEC-006) : cette fonction ne doit jamais synchroniser
    // Garmin tant que isEnabled est false, quel que soit l'appelant.
    // syncAllPersonalConnectors filtre deja via getEnabledPersonalConnectors,
    // mais cette garantie ne doit pas reposer uniquement sur l'appelant.
    if (!garminConnector.isEnabled) {
      return {
        provider,
        success: false,
        reason: "Connecteur Garmin desactive (isEnabled: false).",
      };
    }

    // Import differe : garmin-sync.ts touche Supabase (service role) et ne
    // doit jamais faire partie d'un bundle client. sync.ts n'est pas exporte
    // par lib/personal/connectors/index.ts et n'est donc jamais atteint
    // depuis PersonalDashboardClient.tsx, mais l'import dynamique reste une
    // garantie supplementaire si ce fichier venait a etre importe ailleurs.
    const { syncGarminConnector } = await import("@/lib/server/personal/garmin-sync");
    return syncGarminConnector({ userId });
  }

  return {
    provider,
    success: false,
    reason: "Connector not implemented yet",
  };
}

export async function syncAllPersonalConnectors(
  userId: string,
): Promise<PersonalConnectorSyncResult[]> {
  const connectors = getEnabledPersonalConnectors();

  return Promise.all(
    connectors.map((connector) =>
      syncPersonalConnector(userId, connector.provider),
    ),
  );
}
