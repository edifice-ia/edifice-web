"use client";

import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { SectionContainer } from "@/components/cockpit/SectionContainer";

type PublicationPlatform = "youtube" | "instagram" | "tiktok";
type PerformancePeriod = "7d" | "30d" | "month" | "all";
type PublicationStatusFilter = "all" | "published" | "scheduled" | "ready" | "failed";

type PerformanceState = {
  averageRetentionPercentage: number | null;
  availableAccounts: Array<{ accountId: string; label: string }>;
  byAccount: Array<{
    accountId: string;
    averageEngagementRate: number | null;
    interactions: number;
    sampleSize: number;
    views: number;
  }>;
  byDay: Array<{ date: string; interactions: number; views: number }>;
  byPlatform: Array<{
    averageEngagementRate: number | null;
    interactions: number;
    platform: PublicationPlatform;
    sampleSize: number;
    views: number;
  }>;
  filters: {
    accountId: string | null;
    period: PerformancePeriod;
    platform: PublicationPlatform | "all";
    status: PublicationStatusFilter;
  };
  lastSyncAt: string | null;
  limitationNotes: string[];
  recommendations: Array<{
    confidence: "low" | "medium" | "high";
    detail: string;
    key: string;
    sampleSize: number;
    source: "available_data";
    title: string;
  }>;
  sampleSize: number;
  sync: {
    instagram: {
      connected: boolean;
      lastResult: string | null;
      missingPermissions: string[];
    };
    tiktok: {
      enabled: false;
      message: string;
    };
    youtube: {
      connected: boolean;
      lastResult: string | null;
      missingPermissions: string[];
    };
  };
  topPublications: Array<{
    engagementRate: number | null;
    interactions: number;
    platform: PublicationPlatform;
    publicationId: string;
    title: string;
    views: number | null;
  }>;
  totalComments: number;
  totalInteractions: number;
  totalLikes: number;
  totalReach: number | null;
  totalSaves: number;
  totalShares: number;
  totalViews: number;
};

type PerformancePayload = {
  error?: string;
  performance?: PerformanceState;
  result?: {
    message?: string;
    snapshots?: number;
  };
};

const periodOptions: Array<{ label: string; value: PerformancePeriod }> = [
  { label: "7 jours", value: "7d" },
  { label: "30 jours", value: "30d" },
  { label: "Ce mois-ci", value: "month" },
  { label: "Tout", value: "all" },
];

const platformLabels: Record<PublicationPlatform | "all", string> = {
  all: "Toutes plateformes",
  instagram: "Instagram",
  tiktok: "TikTok",
  youtube: "YouTube Shorts",
};

const statusOptions: Array<{ label: string; value: PublicationStatusFilter }> = [
  { label: "Tous statuts", value: "all" },
  { label: "Publiees", value: "published" },
  { label: "Programmees", value: "scheduled" },
  { label: "Pretes", value: "ready" },
  { label: "Echecs", value: "failed" },
];

function formatNumber(value: number | null) {
  if (value === null || !Number.isFinite(value)) {
    return "Non disponible";
  }

  return new Intl.NumberFormat("fr-FR").format(value);
}

function formatPercent(value: number | null) {
  if (value === null || !Number.isFinite(value)) {
    return "Non disponible";
  }

  return new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits: 1,
    minimumFractionDigits: 1,
    style: "percent",
  }).format(value);
}

function formatRetention(value: number | null) {
  if (value === null || !Number.isFinite(value)) {
    return "Non disponible";
  }

  return `${new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits: 1,
    minimumFractionDigits: 1,
  }).format(value)} %`;
}

function formatDateTime(value: string | null) {
  if (!value) {
    return "Aucune synchronisation";
  }

  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    timeZone: "Europe/Paris",
  }).format(new Date(value));
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-md border border-[#1D2A44] bg-[#08111A] px-4 py-3">
      <p className="truncate text-sm text-[#A7B0C0]">{label}</p>
      <p className="mt-2 truncate text-2xl font-semibold text-[#F8FAFC]" title={value}>
        {value}
      </p>
    </div>
  );
}

function SelectControl({
  children,
  label,
  onChange,
  value,
}: {
  children: ReactNode;
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <label className="grid min-w-0 gap-2 text-sm font-semibold text-[#F8FAFC]">
      <span className="truncate">{label}</span>
      <select
        className="min-w-0 rounded-md border border-[#1D2A44] bg-[#03070B] px-3 py-2 text-sm font-medium text-[#F8FAFC] outline-none transition focus:border-[#39E6D0]"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        {children}
      </select>
    </label>
  );
}

export function PublicationPerformancePanel({
  initialPerformance,
}: {
  initialPerformance: PerformanceState;
}) {
  const [performance, setPerformance] = useState(initialPerformance);
  const [period, setPeriod] = useState<PerformancePeriod>(initialPerformance.filters.period);
  const [platform, setPlatform] = useState<PublicationPlatform | "all">(initialPerformance.filters.platform);
  const [status, setStatus] = useState<PublicationStatusFilter>(initialPerformance.filters.status);
  const [accountId, setAccountId] = useState(initialPerformance.filters.accountId ?? "all");
  const [isLoading, setIsLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const maxDaily = Math.max(1, ...performance.byDay.map((day) => day.views));
  const permissionNotes = useMemo(() => {
    const values = new Set(performance.limitationNotes);
    if (performance.sync.youtube.missingPermissions.length) {
      values.add(`YouTube: permission manquante ${performance.sync.youtube.missingPermissions.join(", ")}.`);
    }
    if (performance.sync.instagram.missingPermissions.length) {
      values.add(`Instagram: permission manquante ${performance.sync.instagram.missingPermissions.join(", ")}.`);
    }
    return [...values];
  }, [performance]);

  async function refreshPerformance(nextFilters = {
    accountId,
    period,
    platform,
    status,
  }) {
    setIsLoading(true);
    setError(null);

    const params = new URLSearchParams({
      period: nextFilters.period,
      platform: nextFilters.platform,
      status: nextFilters.status,
    });
    if (nextFilters.accountId !== "all") {
      params.set("accountId", nextFilters.accountId);
    }

    try {
      const response = await fetch(`/api/observatory/publication-performance?${params.toString()}`, {
        cache: "no-store",
      });
      const payload = await response.json() as PerformancePayload;
      if (!response.ok || !payload.performance) {
        throw new Error(payload.error ?? "Lecture des performances indisponible.");
      }
      setPerformance(payload.performance);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Lecture des performances indisponible.");
    } finally {
      setIsLoading(false);
    }
  }

  function updateFilter(nextFilters: {
    accountId?: string;
    period?: PerformancePeriod;
    platform?: PublicationPlatform | "all";
    status?: PublicationStatusFilter;
  }) {
    const merged = {
      accountId: nextFilters.accountId ?? accountId,
      period: nextFilters.period ?? period,
      platform: nextFilters.platform ?? platform,
      status: nextFilters.status ?? status,
    };
    setAccountId(merged.accountId);
    setPeriod(merged.period);
    setPlatform(merged.platform);
    setStatus(merged.status);
    void refreshPerformance(merged);
  }

  async function runAction(action: string, body: Record<string, unknown> = {}) {
    setIsLoading(true);
    setError(null);
    setNotice(null);

    const params = new URLSearchParams({
      period,
      platform,
      status,
    });
    if (accountId !== "all") {
      params.set("accountId", accountId);
    }

    try {
      const response = await fetch(`/api/observatory/publication-performance?${params.toString()}`, {
        body: JSON.stringify({ action, ...body }),
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const payload = await response.json() as PerformancePayload;
      if (!response.ok || !payload.performance) {
        throw new Error(payload.error ?? "Action performance indisponible.");
      }
      setPerformance(payload.performance);
      setNotice(payload.result?.message ?? "Action enregistree.");
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Action performance indisponible.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <SectionContainer className="mt-6 scroll-mt-24" id="publication-performance">
      <div className="flex min-w-0 flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#39E6D0]">
            Performances
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-[#F8FAFC]">
            Performances des publications
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[#A7B0C0]">
            Les donnees viennent uniquement des publications deja envoyees et des permissions disponibles. Les recommandations restent des signaux d&apos;aide, jamais des optimisations automatiques.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <button
            className="rounded-md border border-[#38BDF8]/50 bg-[#38BDF8]/10 px-3 py-2 text-sm font-semibold text-[#7DD3FC] transition hover:bg-[#38BDF8]/20 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isLoading || !performance.sync.youtube.connected}
            onClick={() => runAction("sync_youtube")}
            type="button"
          >
            Synchroniser YouTube
          </button>
          <button
            className="rounded-md border border-[#E879F9]/50 bg-[#E879F9]/10 px-3 py-2 text-sm font-semibold text-[#F0ABFC] transition hover:bg-[#E879F9]/20 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isLoading || !performance.sync.instagram.connected}
            onClick={() => runAction("sync_instagram")}
            type="button"
          >
            Synchroniser Instagram
          </button>
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-4">
        <SelectControl label="Periode" onChange={(value) => updateFilter({ period: value as PerformancePeriod })} value={period}>
          {periodOptions.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </SelectControl>
        <SelectControl label="Plateforme" onChange={(value) => updateFilter({ platform: value as PublicationPlatform | "all" })} value={platform}>
          {Object.entries(platformLabels).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </SelectControl>
        <SelectControl label="Statut" onChange={(value) => updateFilter({ status: value as PublicationStatusFilter })} value={status}>
          {statusOptions.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </SelectControl>
        <SelectControl label="Compte" onChange={(value) => updateFilter({ accountId: value })} value={accountId}>
          <option value="all">Tous les comptes</option>
          {performance.availableAccounts.map((account) => (
            <option key={account.accountId} value={account.accountId}>{account.label}</option>
          ))}
        </SelectControl>
      </div>

      {error ? (
        <p className="mt-4 rounded-md border border-[#f87171]/40 bg-[#f87171]/10 px-3 py-2 text-sm text-[#fecaca]">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p className="mt-4 rounded-md border border-[#39E6D0]/40 bg-[#39E6D0]/10 px-3 py-2 text-sm text-[#A7F3D0]">
          {notice}
        </p>
      ) : null}

      <div className="mt-5 grid gap-3 md:grid-cols-3 xl:grid-cols-5">
        <MetricCard label="Vues" value={formatNumber(performance.totalViews)} />
        <MetricCard label="Interactions" value={formatNumber(performance.totalInteractions)} />
        <MetricCard label="Reach" value={formatNumber(performance.totalReach)} />
        <MetricCard label="Retention moyenne" value={formatRetention(performance.averageRetentionPercentage)} />
        <MetricCard label="Derniere synchro" value={formatDateTime(performance.lastSyncAt)} />
      </div>

      {performance.sampleSize === 0 ? (
        <p className="mt-5 rounded-md border border-[#F97316]/35 bg-[#F97316]/10 px-3 py-2 text-sm text-[#FDBA74]">
          Aucune performance synchronisee pour cette periode. Synchronise YouTube ou Instagram lorsque des publications existent.
        </p>
      ) : null}

      <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <div className="min-w-0 rounded-md border border-[#1D2A44] bg-[#08111A] p-4">
          <h3 className="font-semibold text-[#F8FAFC]">Evolution quotidienne</h3>
          <div className="mt-4 grid gap-2">
            {performance.byDay.length ? performance.byDay.map((day) => (
              <div className="min-w-0" key={day.date}>
                <div className="mb-1 flex min-w-0 items-center justify-between gap-3 text-xs text-[#A7B0C0]">
                  <span className="truncate">{day.date}</span>
                  <span className="shrink-0">{formatNumber(day.views)} vues</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-[#03070B]">
                  <div
                    className="h-full rounded-full bg-[#39E6D0]"
                    style={{ width: `${Math.max(4, Math.min(100, (day.views / maxDaily) * 100))}%` }}
                  />
                </div>
              </div>
            )) : (
              <p className="text-sm text-[#A7B0C0]">Aucun point quotidien disponible.</p>
            )}
          </div>
        </div>

        <div className="min-w-0 rounded-md border border-[#1D2A44] bg-[#08111A] p-4">
          <h3 className="font-semibold text-[#F8FAFC]">Repartition par plateforme</h3>
          <div className="mt-4 grid gap-2">
            {performance.byPlatform.length ? performance.byPlatform.map((item) => (
              <div className="min-w-0 rounded-md border border-[#1D2A44] bg-[#03070B] px-3 py-2" key={item.platform}>
                <div className="flex min-w-0 justify-between gap-3">
                  <p className="truncate text-sm font-semibold text-[#F8FAFC]">{platformLabels[item.platform]}</p>
                  <p className="shrink-0 text-sm text-[#39E6D0]">{formatNumber(item.views)}</p>
                </div>
                <p className="mt-1 truncate text-xs text-[#A7B0C0]">
                  Engagement {formatPercent(item.averageEngagementRate)} / {item.sampleSize} publication(s)
                </p>
              </div>
            )) : (
              <p className="text-sm text-[#A7B0C0]">Aucune plateforme alimentee.</p>
            )}
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-2">
        <div className="min-w-0 rounded-md border border-[#1D2A44] bg-[#08111A] p-4">
          <h3 className="font-semibold text-[#F8FAFC]">Meilleures publications</h3>
          <div className="mt-4 grid gap-2">
            {performance.topPublications.length ? performance.topPublications.map((item) => (
              <div className="min-w-0 rounded-md border border-[#1D2A44] bg-[#03070B] px-3 py-2" key={item.publicationId}>
                <div className="flex min-w-0 justify-between gap-3">
                  <p className="truncate text-sm font-semibold text-[#F8FAFC]" title={item.title}>{item.title}</p>
                  <span className="shrink-0 rounded-md border border-[#39E6D0]/30 px-2 py-0.5 text-xs text-[#39E6D0]">
                    {platformLabels[item.platform]}
                  </span>
                </div>
                <p className="mt-1 truncate text-xs text-[#A7B0C0]">
                  {formatNumber(item.views)} vues / engagement {formatPercent(item.engagementRate)}
                </p>
              </div>
            )) : (
              <p className="text-sm text-[#A7B0C0]">Aucune publication classee.</p>
            )}
          </div>
        </div>

        <div className="min-w-0 rounded-md border border-[#1D2A44] bg-[#08111A] p-4">
          <h3 className="font-semibold text-[#F8FAFC]">Recommandations</h3>
          <p className="mt-1 text-xs leading-5 text-[#A7B0C0]">
            Seuil minimal : 5 publications comparables. Confiance basse a 5, moyenne a 10, haute a 20.
          </p>
          <div className="mt-4 grid gap-2">
            {performance.recommendations.length ? performance.recommendations.map((recommendation) => (
              <div className="min-w-0 rounded-md border border-[#1D2A44] bg-[#03070B] px-3 py-3" key={recommendation.key}>
                <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
                  <p className="min-w-0 truncate text-sm font-semibold text-[#F8FAFC]" title={recommendation.title}>
                    {recommendation.title}
                  </p>
                  <span className="shrink-0 rounded-md border border-[#38BDF8]/30 px-2 py-0.5 text-xs text-[#7DD3FC]">
                    confiance {recommendation.confidence}
                  </span>
                </div>
                <p className="mt-2 line-clamp-2 text-xs leading-5 text-[#A7B0C0]">{recommendation.detail}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    className="rounded-md border border-[#39E6D0]/50 bg-[#39E6D0]/10 px-3 py-1.5 text-xs font-semibold text-[#39E6D0] disabled:opacity-50"
                    disabled={isLoading}
                    onClick={() => runAction("accept_recommendation", {
                      payload: recommendation,
                      recommendationKey: recommendation.key,
                    })}
                    type="button"
                  >
                    Utiliser comme preference
                  </button>
                  <button
                    className="rounded-md border border-[#1D2A44] bg-[#08111A] px-3 py-1.5 text-xs font-semibold text-[#A7B0C0] disabled:opacity-50"
                    disabled={isLoading}
                    onClick={() => runAction("ignore_recommendation", {
                      payload: recommendation,
                      recommendationKey: recommendation.key,
                    })}
                    type="button"
                  >
                    Ignorer
                  </button>
                </div>
              </div>
            )) : (
              <p className="text-sm text-[#A7B0C0]">Pas assez de donnees pour recommander sans inventer.</p>
            )}
          </div>
        </div>
      </div>

      <div className="mt-5 rounded-md border border-[#1D2A44] bg-[#08111A] p-4">
        <button
          className="text-sm font-semibold text-[#39E6D0]"
          onClick={() => setDetailsOpen((value) => !value)}
          type="button"
        >
          {detailsOpen ? "Masquer le detail technique" : "Voir le detail technique"}
        </button>
        {detailsOpen ? (
          <div className="mt-3 grid gap-2 text-sm leading-6 text-[#A7B0C0]">
            <p>
              Likes: <span className="text-[#F8FAFC]">{formatNumber(performance.totalLikes)}</span> / commentaires:{" "}
              <span className="text-[#F8FAFC]">{formatNumber(performance.totalComments)}</span> / partages:{" "}
              <span className="text-[#F8FAFC]">{formatNumber(performance.totalShares)}</span> / sauvegardes:{" "}
              <span className="text-[#F8FAFC]">{formatNumber(performance.totalSaves)}</span>
            </p>
            {permissionNotes.map((note) => (
              <p className="rounded-md border border-[#1D2A44] bg-[#03070B] px-3 py-2" key={note}>
                {note}
              </p>
            ))}
          </div>
        ) : null}
      </div>
    </SectionContainer>
  );
}
