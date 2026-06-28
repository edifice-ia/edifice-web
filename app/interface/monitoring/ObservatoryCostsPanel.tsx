"use client";

import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { SectionContainer } from "@/components/cockpit/SectionContainer";

type CostCategory =
  | "image_generation"
  | "image_analysis"
  | "voice_generation"
  | "subtitle_generation"
  | "video_render"
  | "storage"
  | "other";

type CostProvider = "openai" | "elevenlabs" | "railway" | "supabase" | "internal";
type CostPeriod = "today" | "7d" | "30d" | "month";

type CostSummary = {
  averagePerCompletedVideoEur: number | null;
  availableAccounts: Array<{ accountId: string; label: string }>;
  availableCategories: CostCategory[];
  availableProviders: CostProvider[];
  byAccount: Array<{ accountId: string; totalEur: number }>;
  byCategory: Array<{ category: CostCategory; totalEur: number }>;
  byDay: Array<{ date: string; totalEur: number }>;
  byProvider: Array<{ provider: CostProvider; totalEur: number }>;
  costSevenDaysEur: number;
  costThirtyDaysEur: number;
  costThisMonthEur: number;
  costTodayEur: number;
  costTotalEur: number;
  estimatedEventsCount: number;
  eventsCount: number;
  filters: {
    accountId: string | null;
    category: CostCategory | "all";
    period: CostPeriod;
    provider: CostProvider | "all";
  };
  lastUpdatedAt: string | null;
  periodCostEur: number;
  periodEventsCount: number;
  previousPeriodEur: number | null;
  reconciledEventsCount: number;
};

type CostBackfillPayload = {
  action?: "preview" | "run";
  backfill?: {
    createdEventsCount: number;
    draftCount: number;
    estimatedTotalEur: number;
    nonEstimableCount: number;
  };
  error?: string;
};

const periodOptions: Array<{ label: string; value: CostPeriod }> = [
  { label: "Aujourd'hui", value: "today" },
  { label: "7 jours", value: "7d" },
  { label: "30 jours", value: "30d" },
  { label: "Ce mois-ci", value: "month" },
];

const providerLabels: Record<CostProvider, string> = {
  elevenlabs: "ElevenLabs",
  internal: "Interne",
  openai: "OpenAI",
  railway: "Railway",
  supabase: "Supabase",
};

const categoryLabels: Record<CostCategory, string> = {
  image_analysis: "Analyse visuelle",
  image_generation: "Generation d'image",
  other: "Autres",
  storage: "Stockage",
  subtitle_generation: "Sous-titres",
  video_render: "Rendu video",
  voice_generation: "Voix",
};

const requiredBreakdown = [
  { categories: ["image_generation", "image_analysis"] as CostCategory[], label: "Visuels" },
  { categories: ["voice_generation"] as CostCategory[], label: "Voix" },
  { categories: ["subtitle_generation"] as CostCategory[], label: "Sous-titres" },
  { categories: ["video_render"] as CostCategory[], label: "Rendu video" },
];

function formatEuro(value: number | null) {
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

function formatUpdatedAt(value: string | null) {
  if (!value) {
    return "Aucune mise a jour";
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
    <div className="rounded-md border border-[#1D2A44] bg-[#08111A] px-4 py-3">
      <p className="text-sm text-[#A7B0C0]">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-[#F8FAFC]">{value}</p>
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
    <label className="grid gap-2 text-sm font-semibold text-[#F8FAFC]">
      {label}
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

export function ObservatoryCostsPanel({
  initialCosts,
}: {
  initialCosts: CostSummary;
}) {
  const [costs, setCosts] = useState(initialCosts);
  const [period, setPeriod] = useState<CostPeriod>(initialCosts.filters.period);
  const [accountId, setAccountId] = useState(initialCosts.filters.accountId ?? "all");
  const [provider, setProvider] = useState<CostProvider | "all">(initialCosts.filters.provider);
  const [category, setCategory] = useState<CostCategory | "all">(initialCosts.filters.category);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [backfill, setBackfill] = useState<CostBackfillPayload["backfill"] | null>(null);
  const [backfillError, setBackfillError] = useState<string | null>(null);
  const [backfillNotice, setBackfillNotice] = useState<string | null>(null);
  const [isBackfilling, setIsBackfilling] = useState(false);

  const visualBreakdown = useMemo(() => {
    const values = new Map(costs.byCategory.map((item) => [item.category, item.totalEur]));
    const visible = requiredBreakdown.map((item) => ({
      label: item.label,
      value: item.categories.reduce((sum, itemCategory) => sum + (values.get(itemCategory) ?? 0), 0),
    }));
    const used = new Set(requiredBreakdown.flatMap((item) => item.categories));
    const otherValue = costs.byCategory
      .filter((item) => !used.has(item.category))
      .reduce((sum, item) => sum + item.totalEur, 0);

    return otherValue > 0 ? [...visible, { label: "Autres", value: otherValue }] : visible;
  }, [costs.byCategory]);
  const maxDaily = Math.max(1, ...costs.byDay.map((day) => day.totalEur));

  async function refreshCosts(nextFilters = {
    accountId,
    category,
    period,
    provider,
  }) {
    setIsLoading(true);
    setLoadError(null);

    const params = new URLSearchParams({
      category: nextFilters.category,
      period: nextFilters.period,
      provider: nextFilters.provider,
    });
    if (nextFilters.accountId !== "all") {
      params.set("accountId", nextFilters.accountId);
    }

    try {
      const response = await fetch(`/api/observatory/costs?${params.toString()}`, {
        cache: "no-store",
      });
      const payload = (await response.json()) as { costs?: CostSummary; error?: string };
      if (!response.ok || !payload.costs) {
        throw new Error(payload.error ?? "Lecture des couts indisponible.");
      }
      setCosts(payload.costs);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Lecture des couts indisponible.");
    } finally {
      setIsLoading(false);
    }
  }

  function updateFilter(nextFilters: {
    accountId?: string;
    category?: CostCategory | "all";
    period?: CostPeriod;
    provider?: CostProvider | "all";
  }) {
    const merged = {
      accountId: nextFilters.accountId ?? accountId,
      category: nextFilters.category ?? category,
      period: nextFilters.period ?? period,
      provider: nextFilters.provider ?? provider,
    };
    setAccountId(merged.accountId);
    setCategory(merged.category);
    setPeriod(merged.period);
    setProvider(merged.provider);
    void refreshCosts(merged);
  }

  async function runBackfill(action: "preview" | "run") {
    setIsBackfilling(true);
    setBackfillError(null);
    setBackfillNotice(null);

    try {
      const response = await fetch("/api/observatory/costs/backfill", {
        body: JSON.stringify({ action, days: 30 }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const payload = (await response.json()) as CostBackfillPayload;
      if (!response.ok || !payload.backfill) {
        throw new Error(payload.error ?? "Backfill indisponible.");
      }
      setBackfill(payload.backfill);
      if (action === "run") {
        setBackfillNotice("Estimations historiques ajoutees.");
        await refreshCosts();
      }
    } catch (error) {
      setBackfillError(error instanceof Error ? error.message : "Backfill indisponible.");
    } finally {
      setIsBackfilling(false);
    }
  }

  return (
    <SectionContainer className="mt-6 scroll-mt-24" id="costs">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#39E6D0]">
            Coûts
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-[#F8FAFC]">
            Suivi des coûts de production
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[#A7B0C0]">
            Les montants sont des estimations de production tant qu&apos;ils ne sont pas reconcilies avec une facture fournisseur.
          </p>
        </div>
        <button
          className="rounded-md border border-[#1D2A44] bg-[#03070B] px-4 py-2 text-sm font-semibold text-[#A7B0C0] transition hover:border-[#39E6D0]/50 hover:text-[#F8FAFC] disabled:opacity-55"
          disabled={isLoading}
          onClick={() => void refreshCosts()}
          type="button"
        >
          {isLoading ? "Actualisation..." : "Actualiser"}
        </button>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <SelectControl
          label="Période"
          onChange={(value) => updateFilter({ period: value as CostPeriod })}
          value={period}
        >
          {periodOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </SelectControl>
        <SelectControl
          label="Compte"
          onChange={(value) => updateFilter({ accountId: value })}
          value={accountId}
        >
          <option value="all">Tous les comptes</option>
          {costs.availableAccounts.map((account) => (
            <option key={account.accountId} value={account.accountId}>
              {account.label}
            </option>
          ))}
        </SelectControl>
        <SelectControl
          label="Provider"
          onChange={(value) => updateFilter({ provider: value as CostProvider | "all" })}
          value={provider}
        >
          <option value="all">Tous les providers</option>
          {costs.availableProviders.map((item) => (
            <option key={item} value={item}>
              {providerLabels[item] ?? item}
            </option>
          ))}
        </SelectControl>
        <SelectControl
          label="Catégorie"
          onChange={(value) => updateFilter({ category: value as CostCategory | "all" })}
          value={category}
        >
          <option value="all">Toutes les catégories</option>
          {costs.availableCategories.map((item) => (
            <option key={item} value={item}>
              {categoryLabels[item] ?? item}
            </option>
          ))}
        </SelectControl>
      </div>

      {loadError ? (
        <p className="mt-4 rounded-md border border-[#F97316]/35 bg-[#F97316]/10 px-3 py-2 text-sm text-[#FDBA74]">
          {loadError}
        </p>
      ) : null}

      <div className="mt-5 grid gap-3 md:grid-cols-3">
        <MetricCard label="Coût aujourd'hui" value={formatEuro(costs.costTodayEur)} />
        <MetricCard label="Coût sur 7 jours" value={formatEuro(costs.costSevenDaysEur)} />
        <MetricCard label="Coût sur 30 jours" value={formatEuro(costs.costThirtyDaysEur)} />
        <MetricCard label="Coût ce mois-ci" value={formatEuro(costs.costThisMonthEur)} />
        <MetricCard label="Coût total" value={formatEuro(costs.costTotalEur)} />
        <MetricCard label="Coût moyen par vidéo terminée" value={formatEuro(costs.averagePerCompletedVideoEur)} />
      </div>

      <div className="mt-5 rounded-md border border-[#1D2A44] bg-[#08111A] p-4">
        <div className="grid gap-3 text-sm text-[#A7B0C0] md:grid-cols-4">
          <p>
            Période sélectionnée : <span className="font-semibold text-[#F8FAFC]">{formatEuro(costs.periodCostEur)}</span>
          </p>
          <p>
            <span className="font-semibold text-[#F8FAFC]">{costs.estimatedEventsCount}</span> événements estimés
          </p>
          <p>
            <span className="font-semibold text-[#F8FAFC]">{costs.reconciledEventsCount}</span> événements réconciliés
          </p>
          <p>
            Dernière mise à jour : <span className="font-semibold text-[#F8FAFC]">{formatUpdatedAt(costs.lastUpdatedAt)}</span>
          </p>
        </div>
        {costs.periodEventsCount === 0 ? (
          <p className="mt-3 rounded-md border border-[#F97316]/35 bg-[#F97316]/10 px-3 py-2 text-sm text-[#FDBA74]">
            Aucun coût enregistré pour cette période.
          </p>
        ) : null}
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="rounded-md border border-[#1D2A44] bg-[#08111A] p-4">
          <h3 className="font-semibold text-[#F8FAFC]">Évolution quotidienne</h3>
          <div className="mt-4 grid gap-2">
            {costs.byDay.length ? costs.byDay.map((day) => (
              <div key={day.date} className="rounded-md border border-[#1D2A44] bg-[#03070B] px-3 py-2">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="font-semibold text-[#F8FAFC]">{day.date}</span>
                  <span className="text-[#A7B0C0]">{formatEuro(day.totalEur)}</span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#08111A]">
                  <div
                    className="h-full rounded-full bg-[#39E6D0]"
                    style={{ width: `${Math.min(100, (day.totalEur / maxDaily) * 100)}%` }}
                  />
                </div>
              </div>
            )) : (
              <p className="rounded-md border border-[#1D2A44] bg-[#03070B] px-3 py-2 text-sm text-[#A7B0C0]">
                Aucun coût enregistré pour cette période.
              </p>
            )}
          </div>
        </div>

        <div className="rounded-md border border-[#1D2A44] bg-[#08111A] p-4">
          <h3 className="font-semibold text-[#F8FAFC]">Répartition des coûts</h3>
          <div className="mt-4 grid gap-3">
            {visualBreakdown.map((item) => (
              <div
                className="rounded-md border border-[#1D2A44] bg-[#03070B] px-4 py-3"
                key={item.label}
              >
                <p className="text-sm font-semibold text-[#F8FAFC]">{item.label}</p>
                <p className="mt-2 text-xl font-semibold text-[#39E6D0]">{formatEuro(item.value)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        <BreakdownList
          empty="Aucune catégorie."
          items={costs.byCategory.map((item) => ({
            label: categoryLabels[item.category] ?? item.category,
            value: item.totalEur,
          }))}
          title="Par catégorie"
        />
        <BreakdownList
          empty="Aucun provider."
          items={costs.byProvider.map((item) => ({
            label: providerLabels[item.provider] ?? item.provider,
            value: item.totalEur,
          }))}
          title="Par provider"
        />
        <BreakdownList
          empty="Aucun compte."
          items={costs.byAccount.map((item) => ({
            label: item.accountId,
            value: item.totalEur,
          }))}
          title="Par compte"
        />
      </div>

      <div className="mt-5 rounded-md border border-[#1D2A44] bg-[#08111A] p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="font-semibold text-[#F8FAFC]">Calculer les estimations des brouillons récents</p>
            <p className="mt-2 text-sm leading-6 text-[#A7B0C0]">
              Les coûts historiques ajoutés ici sont des estimations reconstruites à partir des actions enregistrées.
            </p>
          </div>
          <button
            className="rounded-md border border-[#1D2A44] bg-[#03070B] px-3 py-2 text-xs font-semibold text-[#A7B0C0] transition hover:border-[#39E6D0]/50 hover:text-[#F8FAFC] disabled:opacity-55"
            disabled={isBackfilling}
            onClick={() => void runBackfill("preview")}
            type="button"
          >
            {isBackfilling ? "Analyse..." : "Calculer les estimations"}
          </button>
        </div>
        {backfill ? (
          <div className="mt-4 rounded-md border border-[#39E6D0]/30 bg-[#39E6D0]/10 p-3 text-sm text-[#A7B0C0]">
            <p className="font-semibold text-[#F8FAFC]">Aperçu avant ajout</p>
            <div className="mt-2 grid gap-2 md:grid-cols-4">
              <p>Brouillons analysés : <span className="font-semibold text-[#F8FAFC]">{backfill.draftCount}</span></p>
              <p>Événements à créer : <span className="font-semibold text-[#F8FAFC]">{backfill.createdEventsCount}</span></p>
              <p>Total estimatif : <span className="font-semibold text-[#F8FAFC]">{formatEuro(backfill.estimatedTotalEur)}</span></p>
              <p>Non estimables : <span className="font-semibold text-[#F8FAFC]">{backfill.nonEstimableCount}</span></p>
            </div>
            <div className="mt-3 flex flex-wrap gap-3">
              <button
                className="rounded-md border border-[#39E6D0]/50 bg-[#39E6D0]/10 px-3 py-2 text-xs font-semibold text-[#39E6D0] transition hover:bg-[#1D2A44] hover:text-[#F8FAFC] disabled:opacity-55"
                disabled={isBackfilling || backfill.createdEventsCount === 0}
                onClick={() => void runBackfill("run")}
                type="button"
              >
                Confirmer le backfill
              </button>
              <button
                className="rounded-md border border-[#1D2A44] bg-[#03070B] px-3 py-2 text-xs font-semibold text-[#A7B0C0] transition hover:border-[#F97316]/50 hover:text-[#FDBA74]"
                onClick={() => setBackfill(null)}
                type="button"
              >
                Annuler
              </button>
            </div>
          </div>
        ) : null}
        {backfillError ? (
          <p className="mt-3 rounded-md border border-[#F97316]/35 bg-[#F97316]/10 px-3 py-2 text-sm text-[#FDBA74]">
            {backfillError}
          </p>
        ) : null}
        {backfillNotice ? (
          <p className="mt-3 rounded-md border border-[#39E6D0]/35 bg-[#39E6D0]/10 px-3 py-2 text-sm text-[#39E6D0]">
            {backfillNotice}
          </p>
        ) : null}
      </div>
    </SectionContainer>
  );
}

function BreakdownList({
  empty,
  items,
  title,
}: {
  empty: string;
  items: Array<{ label: string; value: number }>;
  title: string;
}) {
  return (
    <div className="rounded-md border border-[#1D2A44] bg-[#08111A] p-4">
      <h3 className="font-semibold text-[#F8FAFC]">{title}</h3>
      <div className="mt-3 grid gap-2">
        {items.length ? items.map((item) => (
          <p
            className="rounded-md border border-[#1D2A44] bg-[#03070B] px-3 py-2 text-sm text-[#A7B0C0]"
            key={item.label}
          >
            <span className="font-semibold text-[#F8FAFC]">{item.label}</span>
            {" - "}
            {formatEuro(item.value)}
          </p>
        )) : (
          <p className="rounded-md border border-[#1D2A44] bg-[#03070B] px-3 py-2 text-sm text-[#A7B0C0]">
            {empty}
          </p>
        )}
      </div>
    </div>
  );
}
