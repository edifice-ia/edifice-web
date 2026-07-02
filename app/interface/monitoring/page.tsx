import type { Metadata } from "next";
import { CockpitHeader } from "@/components/cockpit/CockpitHeader";
import { readObservatoryCostSummary } from "@/lib/server/cost-tracking";
import { getLiveProjectMemory } from "@/lib/server/observatory/read-model";
import { readPublicationPerformanceState } from "@/lib/server/publication-performance";
import { readShortsPublicationState } from "@/lib/server/shorts-publication";
import { getCurrentUser } from "@/src/lib/supabase/server";
import { MonitoringDashboardClient } from "./MonitoringDashboardClient";

export const metadata: Metadata = {
  title: "Observatoire - L'\u00c9difice",
};

const logs = [
  {
    timestamp: "12:00",
    type: "system" as const,
    message: "M\u00e9moire projet charg\u00e9e dans le cockpit.",
    status: "En cours" as const,
  },
  {
    timestamp: "12:04",
    type: "security" as const,
    message: "Garde-fous actifs: aucune publication r\u00e9elle d\u00e9clench\u00e9e.",
    status: "Operationnel" as const,
  },
  {
    timestamp: "12:08",
    type: "assistant" as const,
    message: "Prochaine pierre disponible depuis la m\u00e9moire projet.",
    status: "Review" as const,
  },
];

export default async function MonitoringPage() {
  const [projectMemory, user] = await Promise.all([
    getLiveProjectMemory(),
    getCurrentUser(),
  ]);
  const costSummary = user
    ? await readObservatoryCostSummary(user.id).catch(() => null)
    : null;
  const performanceSummary = user
    ? await readPublicationPerformanceState(user.id).catch(() => null)
    : null;
  const publicationSummary = user
    ? await readShortsPublicationState({ userId: user.id }).catch(() => null)
    : null;
  const reviewCount = projectMemory.observatoryItems.filter(
    (item) => item.status === "Review",
  ).length;

  return (
    <div>
      <CockpitHeader
        eyebrow="Observatoire"
        title="Observatoire projet"
        description={
          "Le cockpit de suivi de L'\u00c9difice: OAuth, agents, infrastructure, journal de chantier et prochaine pierre a poser."
        }
        status="En cours"
      />

      <MonitoringDashboardClient
        costs={costSummary ?? {
          averagePerCompletedVideoEur: null,
          availableAccounts: [],
          availableCategories: [],
          availableProviders: [],
          byAccount: [],
          byCategory: [],
          byDay: [],
          byProvider: [],
          costSevenDaysEur: 0,
          costThirtyDaysEur: 0,
          costThisMonthEur: 0,
          costTodayEur: 0,
          costTotalEur: 0,
          estimatedEventsCount: 0,
          eventsCount: 0,
          filters: {
            accountId: null,
            category: "all",
            period: "30d",
            provider: "all",
          },
          lastUpdatedAt: null,
          periodCostEur: 0,
          periodEventsCount: 0,
          previousPeriodEur: null,
          reconciledEventsCount: 0,
        }}
        logs={logs}
        performance={performanceSummary ?? {
          averageRetentionPercentage: null,
          availableAccounts: [],
          byAccount: [],
          byDay: [],
          byPlatform: [],
          filters: {
            accountId: null,
            period: "30d",
            platform: "all",
            status: "all",
          },
          lastSyncAt: null,
          limitationNotes: [
            "Aucune table de performance lue pour le moment ou migration non appliquee.",
          ],
          recommendations: [],
          sampleSize: 0,
          sync: {
            instagram: {
              connected: false,
              lastResult: null,
              missingPermissions: [],
            },
            tiktok: {
              enabled: false,
              message: "TikTok reste en lecture placeholder pour cette v1.",
            },
            youtube: {
              connected: false,
              lastResult: null,
              missingPermissions: [],
            },
          },
          topPublications: [],
          totalComments: 0,
          totalInteractions: 0,
          totalLikes: 0,
          totalReach: null,
          totalSaves: 0,
          totalShares: 0,
          totalViews: 0,
        }}
        projectMemory={projectMemory}
        publications={publicationSummary ?? {
          instagramConnected: false,
          instagramError: null,
          items: [],
          tiktokConnected: false,
          tiktokDirectPostAvailable: false,
          tiktokError: null,
          tiktokScopes: [],
          youtubeConnected: false,
          youtubeError: null,
        }}
        reviewCount={reviewCount}
      />
    </div>
  );
}
