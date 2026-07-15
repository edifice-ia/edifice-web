import {
  garminMockDailyFixture,
  mapGarminFixtureToDailyStats,
  type GarminHealthApiDailyFixture,
} from "@/lib/personal/connectors/garmin";
import type { PersonalConnectorSyncResult } from "@/lib/personal/connectors/types";
import { todayInParis } from "./daily-brief-engine";
import { upsertPersonalGarminDailyStats } from "./garmin-stats-store";

export type SyncGarminConnectorParams = {
  userId: string;
  date?: string;
  // NOTE (DEC-006) : tant que l'acces Garmin Developer Program n'est pas
  // approuve, seule la fixture mockee doit etre utilisee. Le parametre reste
  // injectable pour brancher une reponse API reelle une fois l'acces
  // confirme, sans reecrire l'implementation.
  fixture?: GarminHealthApiDailyFixture;
  upsert?: typeof upsertPersonalGarminDailyStats;
};

// Implementation reelle de la synchronisation Garmin pour
// personal_garmin_daily_stats. Vit cote serveur (lib/server/personal) et non
// dans lib/personal/connectors/garmin.ts, qui est importe transitivement par
// PersonalDashboardClient.tsx (composant client) : y placer un client
// Supabase service-role casserait la regle "aucun secret Supabase cote
// client" (10_Conventions.md).
export async function syncGarminConnector({
  userId,
  date = todayInParis(),
  fixture = garminMockDailyFixture,
  upsert = upsertPersonalGarminDailyStats,
}: SyncGarminConnectorParams): Promise<PersonalConnectorSyncResult> {
  try {
    const stats = mapGarminFixtureToDailyStats(fixture, date);
    await upsert({ userId, stats });

    return {
      provider: "garmin",
      success: true,
      syncedAt: new Date().toISOString(),
      recordsSynced: 1,
    };
  } catch (error) {
    return {
      provider: "garmin",
      success: false,
      reason: error instanceof Error ? error.message : "Erreur de synchronisation Garmin.",
    };
  }
}
