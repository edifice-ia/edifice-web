"use client";

import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { useMemo, useState } from "react";
import { ConstructionJournal } from "@/components/cockpit/ConstructionJournal";
import { ProjectMemoryPanel } from "@/components/cockpit/ProjectMemoryPanel";
import { SectionContainer } from "@/components/cockpit/SectionContainer";
import { StatusBadge } from "@/components/cockpit/StatusBadge";
import type {
  CockpitLog,
  CockpitReadOnlyState,
  CockpitStatus,
  ObservatoryItem,
  ProjectMemoryEntry,
} from "@/types/cockpit";
import { ObservatoryCostsPanel } from "./ObservatoryCostsPanel";
import { PublicationPerformancePanel } from "./PublicationPerformancePanel";

type DashboardTab =
  | "summary"
  | "costs"
  | "performance"
  | "publications"
  | "connections"
  | "infrastructure"
  | "journal";

type CostSummary = ComponentProps<typeof ObservatoryCostsPanel>["initialCosts"];
type PerformanceSummary = ComponentProps<typeof PublicationPerformancePanel>["initialPerformance"];

type PublicationPlatform = "youtube" | "instagram" | "tiktok";
type PublicationItem = {
  accountLabel: string;
  costTotalEstimatedEur: number | null;
  draftId: string;
  errorMessage: string | null;
  instagramPermalink: string | null;
  isPastDue: boolean;
  outputUrl: string | null;
  platform: PublicationPlatform;
  publicationId: string | null;
  publishedAt: string | null;
  scheduleId: string;
  scheduledAt: string;
  status: string;
  title: string;
  tiktokUrl: string | null;
  youtubeUrl: string | null;
};

type PublicationSummary = {
  instagramConnected: boolean;
  instagramError: string | null;
  items: PublicationItem[];
  tiktokConnected: boolean;
  tiktokDirectPostAvailable: boolean;
  tiktokError: string | null;
  tiktokScopes: string[];
  youtubeConnected: boolean;
  youtubeError: string | null;
};

type MonitoringProjectMemory = {
  cockpitRole: string;
  cockpitState: CockpitReadOnlyState;
  nextRecommendedAction: string;
  observatoryItems: ObservatoryItem[];
  overview: {
    blocked: number;
    nextRecommendedAction: string;
    operational: number;
    totalModules: number;
  };
  projectMemoryEntries: ProjectMemoryEntry[];
  safeguards: string[];
};

type MonitoringDashboardClientProps = {
  costs: CostSummary;
  logs: CockpitLog[];
  performance: PerformanceSummary;
  projectMemory: MonitoringProjectMemory;
  publications: PublicationSummary;
  reviewCount: number;
};

const tabs: Array<{ id: DashboardTab; label: string }> = [
  { id: "summary", label: "Resume" },
  { id: "costs", label: "Couts" },
  { id: "performance", label: "Performances" },
  { id: "publications", label: "Publications" },
  { id: "connections", label: "Connexions" },
  { id: "infrastructure", label: "Infrastructure" },
  { id: "journal", label: "Journal" },
];

const platformLabels: Record<PublicationPlatform, string> = {
  instagram: "Instagram",
  tiktok: "TikTok",
  youtube: "YouTube Shorts",
};

const activePublicationStatuses = new Set([
  "draft",
  "ready",
  "scheduled",
  "due",
  "publishing",
  "processing_media",
  "sending_to_tiktok",
  "uploaded_to_tiktok",
  "awaiting_tiktok_confirmation",
]);

function formatCurrency(value: number | null) {
  if (value === null || !Number.isFinite(value)) {
    return "Non estime";
  }

  return new Intl.NumberFormat("fr-FR", {
    currency: "EUR",
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
    style: "currency",
  }).format(value);
}

function formatDateTime(value: string | null) {
  if (!value) {
    return "Non disponible";
  }

  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    timeZone: "Europe/Paris",
    year: "numeric",
  }).format(new Date(value));
}

function statusForOverview(projectMemory: MonitoringProjectMemory): CockpitStatus {
  if (projectMemory.overview.blocked > 0) {
    return "Review";
  }
  if (projectMemory.overview.operational >= projectMemory.overview.totalModules) {
    return "Operationnel";
  }
  return "En cours";
}

function MetricCard({
  label,
  status,
  value,
}: {
  label: string;
  status?: CockpitStatus;
  value: string;
}) {
  return (
    <SectionContainer>
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm text-[#A7B0C0]">{label}</p>
          <p className="mt-2 truncate text-2xl font-semibold text-[#F8FAFC]" title={value}>
            {value}
          </p>
        </div>
        {status ? <StatusBadge status={status} /> : null}
      </div>
    </SectionContainer>
  );
}

function RefreshButton() {
  return (
    <button
      className="shrink-0 rounded-md border border-[#39E6D0]/50 bg-[#39E6D0]/10 px-3 py-2 text-sm font-semibold text-[#39E6D0] transition hover:bg-[#39E6D0]/20"
      onClick={() => window.location.reload()}
      type="button"
    >
      Actualiser
    </button>
  );
}

function TabHeading({
  children,
  refresh,
  title,
}: {
  children: ReactNode;
  refresh?: boolean;
  title: string;
}) {
  return (
    <div className="mb-5 flex min-w-0 flex-col gap-3 md:flex-row md:items-start md:justify-between">
      <div className="min-w-0">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#39E6D0]">
          Observatoire
        </p>
        <h2 className="mt-2 text-2xl font-semibold text-[#F8FAFC]">{title}</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-[#A7B0C0]">{children}</p>
      </div>
      {refresh ? <RefreshButton /> : null}
    </div>
  );
}

function InfoCard({
  children,
  title,
}: {
  children: ReactNode;
  title: string;
}) {
  return (
    <div className="min-w-0 rounded-md border border-[#1D2A44] bg-[#08111A] p-4">
      <h3 className="truncate text-sm font-semibold text-[#F8FAFC]" title={title}>
        {title}
      </h3>
      <div className="mt-3 min-w-0 text-sm leading-6 text-[#A7B0C0]">{children}</div>
    </div>
  );
}

function platformLink(item: PublicationItem) {
  return item.youtubeUrl ?? item.instagramPermalink ?? item.tiktokUrl ?? item.outputUrl;
}

function renderPublicationBadge(item: PublicationItem) {
  if (item.isPastDue && item.status !== "published" && item.status !== "cancelled") {
    return "Creneau depasse - publication manuelle requise";
  }
  if (item.status === "published") {
    return "Publiee";
  }
  if (item.status === "failed") {
    return "Echec";
  }
  if (item.status === "scheduled") {
    return "Programmee";
  }
  return "A preparer";
}

export function MonitoringDashboardClient({
  costs,
  logs,
  performance,
  projectMemory,
  publications,
  reviewCount,
}: MonitoringDashboardClientProps) {
  const [activeTab, setActiveTab] = useState<DashboardTab>(() => {
    if (typeof window === "undefined") {
      return "summary";
    }
    const saved = window.sessionStorage.getItem("observatory-active-tab");
    return saved && tabs.some((tab) => tab.id === saved) ? (saved as DashboardTab) : "summary";
  });

  function selectTab(tab: DashboardTab) {
    window.sessionStorage.setItem("observatory-active-tab", tab);
    setActiveTab(tab);
  }

  const publicationGroups = useMemo(() => {
    const items = publications.items;
    return {
      failed: items.filter((item) => item.status === "failed"),
      pastDue: items.filter(
        (item) => item.isPastDue && item.status !== "published" && item.status !== "cancelled",
      ),
      published: items.filter((item) => item.status === "published"),
      scheduled: items.filter((item) => activePublicationStatuses.has(item.status)),
    };
  }, [publications.items]);

  const latestPublication = publications.items
    .slice()
    .sort((left, right) => Date.parse(right.scheduledAt) - Date.parse(left.scheduledAt))[0];
  const connections = projectMemory.cockpitState.platformStatuses.filter((platform) =>
    ["youtube", "instagram", "meta", "tiktok", "pinterest"].some((key) =>
      platform.key.toLowerCase().includes(key) || platform.name.toLowerCase().includes(key),
    ),
  );
  const infrastructureItems = projectMemory.observatoryItems.filter(
    (item) => item.area === "Infrastructure",
  );
  const technicalLogs = logs.filter((log) => log.type === "api" || log.type === "system");

  return (
    <div>
      <div className="sticky top-0 z-20 mb-6 -mx-2 overflow-x-auto border-b border-[#1D2A44] bg-[#02060A]/95 px-2 py-3 backdrop-blur">
        <div className="flex min-w-max gap-2">
          {tabs.map((tab) => (
            <button
              className={`shrink-0 rounded-md border px-4 py-2 text-sm font-semibold transition ${
                activeTab === tab.id
                  ? "border-[#39E6D0]/60 bg-[#39E6D0]/15 text-[#39E6D0]"
                  : "border-[#1D2A44] bg-[#08111A] text-[#A7B0C0] hover:border-[#39E6D0]/40 hover:text-[#F8FAFC]"
              }`}
              key={tab.id}
              onClick={() => selectTab(tab.id)}
              type="button"
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === "summary" ? (
        <div className="grid gap-6">
          <TabHeading title="Resume">
            Etat synthetique du cockpit avec les raccourcis vers les blocs detailles.
          </TabHeading>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Etat global"
              status={statusForOverview(projectMemory)}
              value={statusForOverview(projectMemory)}
            />
            <MetricCard label="Modules suivis" value={String(projectMemory.overview.totalModules)} />
            <MetricCard label="Operationnels" status="Operationnel" value={String(projectMemory.overview.operational)} />
            <MetricCard label="Blocages" status={projectMemory.overview.blocked ? "Bloque" : "Operationnel"} value={String(projectMemory.overview.blocked)} />
            <MetricCard label="En review" status="Review" value={String(reviewCount)} />
            <MetricCard label="Cout ce mois-ci" value={formatCurrency(costs.costThisMonthEur)} />
            <MetricCard label="Publications programmees" value={String(publicationGroups.scheduled.length)} />
            <MetricCard label="Echecs publication" status={publicationGroups.failed.length ? "Bloque" : "Operationnel"} value={String(publicationGroups.failed.length)} />
          </div>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
            <InfoCard title="Derniere synchronisation performances">
              <p>{formatDateTime(performance.lastSyncAt)}</p>
              <p className="mt-2">
                Echantillon suivi : <span className="text-[#F8FAFC]">{performance.sampleSize}</span> publication(s).
              </p>
            </InfoCard>
            <InfoCard title="Derniere activite publication">
              {latestPublication ? (
                <>
                  <p className="truncate text-[#F8FAFC]" title={latestPublication.title}>
                    {latestPublication.title}
                  </p>
                  <p className="mt-1">
                    {platformLabels[latestPublication.platform]} - {renderPublicationBadge(latestPublication)}
                  </p>
                  <p>{formatDateTime(latestPublication.scheduledAt)}</p>
                </>
              ) : (
                <p>Aucune publication suivie pour le moment.</p>
              )}
            </InfoCard>
          </div>

          <SectionContainer>
            <h3 className="text-lg font-semibold text-[#F8FAFC]">Raccourcis</h3>
            <div className="mt-4 flex flex-wrap gap-2">
              {tabs.filter((tab) => tab.id !== "summary").map((tab) => (
                <button
                  className="rounded-md border border-[#1D2A44] bg-[#08111A] px-3 py-2 text-sm font-semibold text-[#A7B0C0] transition hover:border-[#39E6D0]/50 hover:text-[#F8FAFC]"
                  key={tab.id}
                  onClick={() => selectTab(tab.id)}
                  type="button"
                >
                  Voir {tab.label}
                </button>
              ))}
            </div>
          </SectionContainer>
        </div>
      ) : null}

      {activeTab === "costs" ? (
        <div>
          <TabHeading refresh title="Couts">
            Suivi detaille des couts par periode, provider, compte et categorie.
          </TabHeading>
          <ObservatoryCostsPanel initialCosts={costs} />
        </div>
      ) : null}

      {activeTab === "performance" ? (
        <div>
          <TabHeading refresh title="Performances">
            Donnees de vues, interactions, synchronisations et recommandations disponibles.
          </TabHeading>
          <PublicationPerformancePanel initialPerformance={performance} />
        </div>
      ) : null}

      {activeTab === "publications" ? (
        <div>
          <TabHeading refresh title="Publications">
            Vue de controle en lecture seule des programmations et publications existantes.
          </TabHeading>
          <div className="grid gap-4 md:grid-cols-4">
            <MetricCard label="Programmees" value={String(publicationGroups.scheduled.length)} />
            <MetricCard label="Publiees" value={String(publicationGroups.published.length)} />
            <MetricCard label="Echecs" status={publicationGroups.failed.length ? "Bloque" : "Operationnel"} value={String(publicationGroups.failed.length)} />
            <MetricCard label="Creneaux depasses" status={publicationGroups.pastDue.length ? "Review" : "Operationnel"} value={String(publicationGroups.pastDue.length)} />
          </div>
          <div className="mt-5 grid gap-3">
            {publications.items.length ? publications.items.map((item) => {
              const externalLink = platformLink(item);
              return (
                <div
                  className="grid min-w-0 gap-3 rounded-md border border-[#1D2A44] bg-[#08111A] p-4 md:grid-cols-[minmax(0,1fr)_190px_170px_auto]"
                  key={`${item.scheduleId}-${item.platform}`}
                >
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-[#F8FAFC]" title={item.title}>
                      {item.title}
                    </p>
                    <p className="mt-1 truncate text-sm text-[#A7B0C0]">
                      {item.accountLabel} - {platformLabels[item.platform]}
                    </p>
                    {item.errorMessage ? (
                      <p className="mt-2 line-clamp-2 text-sm text-[#fecaca]">{item.errorMessage}</p>
                    ) : null}
                  </div>
                  <p className="text-sm text-[#A7B0C0]">{formatDateTime(item.scheduledAt)}</p>
                  <p className="text-sm font-semibold text-[#39E6D0]">{renderPublicationBadge(item)}</p>
                  <div className="flex flex-wrap gap-2 md:justify-end">
                    <Link
                      className="rounded-md border border-[#1D2A44] bg-[#03070B] px-3 py-2 text-sm font-semibold text-[#A7B0C0] transition hover:text-[#F8FAFC]"
                      href="/interface/post-creation/shorts/programming"
                    >
                      Detail
                    </Link>
                    {externalLink ? (
                      <a
                        className="rounded-md border border-[#39E6D0]/50 bg-[#39E6D0]/10 px-3 py-2 text-sm font-semibold text-[#39E6D0]"
                        href={externalLink}
                        rel="noreferrer"
                        target="_blank"
                      >
                        Lien
                      </a>
                    ) : null}
                  </div>
                </div>
              );
            }) : (
              <SectionContainer>
                <p className="text-sm text-[#A7B0C0]">Aucune programmation ou publication suivie.</p>
              </SectionContainer>
            )}
          </div>
        </div>
      ) : null}

      {activeTab === "connections" ? (
        <div>
          <TabHeading refresh title="Connexions">
            Etat OAuth, permissions connues et prochaines actions par plateforme.
          </TabHeading>
          <div className="grid gap-4 lg:grid-cols-2">
            {connections.map((connection) => (
              <InfoCard key={connection.key} title={connection.name}>
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <span className="rounded-md border border-[#1D2A44] bg-[#03070B] px-2 py-1 text-xs font-semibold text-[#F8FAFC]">
                    {connection.label}
                  </span>
                  <span className="truncate text-xs text-[#A7B0C0]">{connection.source}</span>
                </div>
                <p className="mt-3">{connection.summary}</p>
                <ul className="mt-3 grid gap-2">
                  {connection.details.map((detail) => (
                    <li className="line-clamp-2 rounded-md border border-[#1D2A44] bg-[#03070B] px-3 py-2" key={detail}>
                      {detail}
                    </li>
                  ))}
                </ul>
              </InfoCard>
            ))}
          </div>
        </div>
      ) : null}

      {activeTab === "infrastructure" ? (
        <div>
          <TabHeading title="Infrastructure">
            Etat technique de Vercel, Supabase, Railway, buckets et signaux de rendu.
          </TabHeading>
          <div className="grid gap-4 xl:grid-cols-2">
            {infrastructureItems.map((item) => (
              <InfoCard key={item.id} title={item.name}>
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <StatusBadge status={item.status} />
                  {!item.source ? (
                    <span
                      className="rounded-md border border-[#f59e0b]/40 bg-[#f59e0b]/10 px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#fbbf24]"
                      title="Statut renseigne manuellement, aucune sonde live ne le verifie pour le moment."
                    >
                      Declaratif, non verifie
                    </span>
                  ) : null}
                </div>
                <p>{item.summary}</p>
                <p className="mt-2 text-[#F8FAFC]">Action : {item.nextAction}</p>
                {item.detail ? (
                  <details className="mt-3 rounded-md border border-[#1D2A44] bg-[#03070B] px-3 py-2">
                    <summary className="cursor-pointer text-sm font-semibold text-[#39E6D0]">
                      Voir le detail
                    </summary>
                    <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-[#A7B0C0]">
                      {item.detail}
                    </p>
                  </details>
                ) : null}
              </InfoCard>
            ))}
          </div>
          <div className="mt-5 grid gap-4 xl:grid-cols-2">
            <InfoCard title="Dependances">
              <div className="grid gap-2">
                {projectMemory.cockpitState.dependencies.map((dependency) => (
                  <p className="rounded-md border border-[#1D2A44] bg-[#03070B] px-3 py-2" key={dependency.name}>
                    <span className="text-[#F8FAFC]">{dependency.name}</span> - {dependency.status} - {dependency.note}
                  </p>
                ))}
              </div>
            </InfoCard>
            <InfoCard title="Erreurs et rendus recents">
              <span
                className="mb-3 inline-flex rounded-md border border-[#f59e0b]/40 bg-[#f59e0b]/10 px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#fbbf24]"
                title="Liste codee en dur (page.tsx), aucune sonde live de rendu ou d'erreur ne l'alimente pour le moment."
              >
                Declaratif, non verifie
              </span>
              {technicalLogs.length ? (
                <div className="grid gap-2">
                  {technicalLogs.map((log) => (
                    <p className="line-clamp-2 rounded-md border border-[#1D2A44] bg-[#03070B] px-3 py-2" key={`${log.timestamp}-${log.message}`}>
                      {log.timestamp} - {log.message}
                    </p>
                  ))}
                </div>
              ) : (
                <p>Aucun signal technique recent.</p>
              )}
            </InfoCard>
          </div>
        </div>
      ) : null}

      {activeTab === "journal" ? (
        <div>
          <TabHeading title="Journal">
            Decisions, blocages, prochaines etapes et memoire projet lisible par l&apos;assistant.
          </TabHeading>
          <div className="grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
            <ProjectMemoryPanel
              cockpitRole={projectMemory.cockpitRole}
              safeguards={projectMemory.safeguards}
              nextRecommendedAction={projectMemory.nextRecommendedAction}
            />
            <ConstructionJournal initialEntries={projectMemory.projectMemoryEntries} />
          </div>
        </div>
      ) : null}
    </div>
  );
}
