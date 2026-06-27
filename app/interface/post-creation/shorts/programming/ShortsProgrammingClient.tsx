"use client";

import { useEffect, useMemo, useState } from "react";
import {
  DEFAULT_SHORTS_SCHEDULE_TIMEZONE,
  SHORTS_SCHEDULE_RECOMMENDATION_CONFIDENCE_LABELS,
  SHORTS_SCHEDULE_RECOMMENDATION_SOURCE_LABELS,
  SHORTS_SCHEDULE_PLATFORM_LABELS,
  addDaysToDateValue,
  buildShortsScheduleCandidates,
  clampScheduleStartDate,
  getDateValueInTimezone,
  normalizeScheduleTimezone,
  scheduleDateTimeToIso,
  type ShortsScheduleFrequency,
  type ShortsSchedulePlatform,
  type ShortsScheduleRecommendationConfidence,
  type ShortsScheduleRecommendationSource,
} from "@/lib/shorts-scheduling";

type SchedulableShortVideo = {
  draftId: string;
  title: string;
  outputUrl: string | null;
  renderedAt: string | null;
  validatedAt: string | null;
};

type ShortVideoSchedule = {
  id: string;
  draftId: string;
  platform: ShortsSchedulePlatform;
  scheduledAt: string;
  timezone: string;
  status: "scheduled" | "cancelled" | "published" | "failed";
  recommendationSource: ShortsScheduleRecommendationSource;
  createdAt: string;
  updatedAt: string;
};

type SchedulingPayload = {
  schedules?: ShortVideoSchedule[];
  videos?: SchedulableShortVideo[];
  error?: string;
};

type PlanningRow = {
  draftId: string;
  localDate: string;
  localTime: string;
  platform: ShortsSchedulePlatform;
  recommendationConfidence: ShortsScheduleRecommendationConfidence;
  recommendationSource: ShortsScheduleRecommendationSource;
  rowId: string;
  slotLabel: string;
  status: "draft" | "scheduled";
};

const platforms: ShortsSchedulePlatform[] = ["tiktok", "instagram", "youtube"];
const frequencies: ShortsScheduleFrequency[] = [1, 2, 3];

function todayDateValue() {
  return getDateValueInTimezone(new Date(), DEFAULT_SHORTS_SCHEDULE_TIMEZONE);
}

function scheduleIso(dateValue: string, timeValue: string, timezone: string) {
  return scheduleDateTimeToIso(dateValue, timeValue, timezone);
}

function safeScheduleIso(dateValue: string, timeValue: string, timezone: string) {
  try {
    return scheduleIso(dateValue, timeValue, timezone);
  } catch {
    return `${dateValue}T${timeValue}`;
  }
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
  }).format(new Date(value));
}

export function ShortsProgrammingClient() {
  const [activeTab, setActiveTab] = useState<"programming" | "publication">("programming");
  const [frequency, setFrequency] = useState<ShortsScheduleFrequency>(1);
  const [timezone, setTimezone] = useState(DEFAULT_SHORTS_SCHEDULE_TIMEZONE);
  const [startDate, setStartDate] = useState(todayDateValue());
  const [daysCount, setDaysCount] = useState(7);
  const [selectedPlatforms, setSelectedPlatforms] = useState<ShortsSchedulePlatform[]>(["tiktok", "instagram", "youtube"]);
  const [videos, setVideos] = useState<SchedulableShortVideo[]>([]);
  const [schedules, setSchedules] = useState<ShortVideoSchedule[]>([]);
  const [planningRows, setPlanningRows] = useState<PlanningRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const videoById = useMemo(
    () => new Map(videos.map((video) => [video.draftId, video])),
    [videos],
  );
  const normalizedTimezone = normalizeScheduleTimezone(timezone);
  const scheduledKeys = useMemo(
    () => new Set(schedules.map((schedule) => `${schedule.draftId}:${schedule.platform}:${new Date(schedule.scheduledAt).toISOString()}`)),
    [schedules],
  );
  const duplicateKeys = useMemo(() => {
    const counts = new Map<string, number>();
    planningRows.forEach((row) => {
      const key = `${row.draftId}:${row.platform}:${safeScheduleIso(row.localDate, row.localTime, normalizedTimezone)}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    });
    return new Set([...counts.entries()].filter(([, count]) => count > 1).map(([key]) => key));
  }, [normalizedTimezone, planningRows]);
  const platformTimeDuplicates = useMemo(() => {
    const counts = new Map<string, number>();
    planningRows.forEach((row) => {
      const key = `${row.platform}:${safeScheduleIso(row.localDate, row.localTime, normalizedTimezone)}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    });
    return new Set([...counts.entries()].filter(([, count]) => count > 1).map(([key]) => key));
  }, [normalizedTimezone, planningRows]);
  const invalidRows = planningRows.filter((row) => !videoById.has(row.draftId));
  const effectiveStartDate = clampScheduleStartDate(startDate, normalizedTimezone);
  const periodEnd = addDaysToDateValue(effectiveStartDate, Math.max(0, daysCount - 1));

  async function loadSchedulingState() {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/content-workshop/shorts-schedules", {
        cache: "no-store",
      });
      const payload = (await response.json()) as SchedulingPayload;

      if (!response.ok || !payload.videos || !payload.schedules) {
        throw new Error(payload.error ?? "Lecture de la programmation indisponible.");
      }

      setVideos(payload.videos);
      setSchedules(payload.schedules);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Lecture de la programmation indisponible.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  function togglePlatform(platform: ShortsSchedulePlatform) {
    setSelectedPlatforms((current) =>
      current.includes(platform)
        ? current.filter((item) => item !== platform)
        : [...current, platform],
    );
  }

  function proposePlanning() {
    setError(null);
    setNotice(null);

    if (videos.length === 0) {
      setPlanningRows([]);
      setError("Aucune video validee disponible. Valide une video avant de programmer.");
      return;
    }

    if (selectedPlatforms.length === 0) {
      setError("Selectionne au moins une plateforme.");
      return;
    }

    const proposal = buildShortsScheduleCandidates({
      daysCount,
      frequency,
      platforms: selectedPlatforms,
      startDate,
      timezone: normalizedTimezone,
    });

    if (proposal.effectiveStartDate !== startDate) {
      setStartDate(proposal.effectiveStartDate);
    }
    if (proposal.timezone !== timezone) {
      setTimezone(proposal.timezone);
    }

    const rows = proposal.candidates.slice(0, videos.length).map((slot, index): PlanningRow => ({
      draftId: videos[index % videos.length].draftId,
      recommendationConfidence: slot.confidence,
      localDate: slot.localDate,
      localTime: slot.localTime,
      platform: slot.platform,
      recommendationSource: slot.recommendationSource,
      rowId: `proposal-${index}-${slot.platform}-${slot.localDate}-${slot.localTime}`,
      slotLabel: slot.slotLabel,
      status: scheduledKeys.has(`${videos[index % videos.length].draftId}:${slot.platform}:${slot.scheduledAt}`)
        ? "scheduled"
        : "draft",
    }));

    setPlanningRows(rows);
    setNotice(
      `${rows.length} creneau(x) proposes a partir des recommandations par defaut.${
        proposal.skippedPastSlotCount > 0
          ? ` ${proposal.skippedPastSlotCount} creneau(x) deja passes ont ete ignores.`
          : ""
      }`,
    );
  }

  function updatePlanningRow(rowId: string, patch: Partial<PlanningRow>) {
    setPlanningRows((current) =>
      current.map((row) =>
        row.rowId === rowId
          ? {
            ...row,
            ...patch,
            recommendationConfidence: "high",
            recommendationSource: "manual",
            slotLabel: "Choix manuel",
          }
          : row,
      ),
    );
  }

  async function savePlanning() {
    setError(null);
    setNotice(null);

    if (planningRows.length === 0) {
      setError("Propose un planning avant de le valider.");
      return;
    }

    if (invalidRows.length > 0) {
      setError("Certaines lignes ciblent une video non validee. Corrige le brouillon avant validation.");
      return;
    }

    if (duplicateKeys.size > 0 || platformTimeDuplicates.size > 0) {
      setError(
        duplicateKeys.size > 0
          ? "Planning invalide: doublon exact brouillon + plateforme + horaire."
          : "Planning invalide: deux publications de la meme plateforme au meme horaire.",
      );
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch("/api/content-workshop/shorts-schedules", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          entries: planningRows.map((row) => ({
            draftId: row.draftId,
            platform: row.platform,
            recommendationSource: row.recommendationSource,
            scheduledAt: scheduleIso(row.localDate, row.localTime, normalizedTimezone),
            timezone: normalizedTimezone,
          })),
        }),
      });
      const payload = (await response.json()) as SchedulingPayload;

      if (!response.ok || !payload.schedules) {
        throw new Error(payload.error ?? "Validation du planning indisponible.");
      }

      setSchedules(payload.schedules);
      setPlanningRows((current) => current.map((row) => ({ ...row, status: "scheduled" })));
      setNotice("Planning enregistre. Aucune publication n'a ete declenchee.");
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Validation du planning indisponible.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadSchedulingState();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2 rounded-md border border-[#1D2A44] bg-[#03070B] p-2">
        <button
          type="button"
          onClick={() => setActiveTab("programming")}
          className={`rounded-md px-4 py-2 text-sm font-semibold transition ${
            activeTab === "programming"
              ? "bg-[#39E6D0]/12 text-[#39E6D0]"
              : "text-[#A7B0C0] hover:bg-[#08111A] hover:text-[#F8FAFC]"
          }`}
        >
          Programmation
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("publication")}
          className={`rounded-md px-4 py-2 text-sm font-semibold transition ${
            activeTab === "publication"
              ? "bg-[#39E6D0]/12 text-[#39E6D0]"
              : "text-[#A7B0C0] hover:bg-[#08111A] hover:text-[#F8FAFC]"
          }`}
        >
          Publication
        </button>
      </div>

      {activeTab === "publication" ? (
        <section className="rounded-md border border-[#1D2A44] bg-[#03070B] p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#39E6D0]">
            Publication
          </p>
          <h2 className="mt-3 text-2xl font-semibold text-[#F8FAFC]">
            Publication
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#A7B0C0]">
            Les videos programmees apparaitront ici. La publication multi-plateforme sera activee dans une prochaine etape.
          </p>
        </section>
      ) : (
        <section className="space-y-5 rounded-md border border-[#1D2A44] bg-[#03070B] p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#39E6D0]">
                Programmation
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-[#F8FAFC]">
                Planifier les videos validees
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-[#A7B0C0]">
                Les creneaux proposes sont des recommandations heuristiques configurables, pas des meilleures heures garanties.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void loadSchedulingState()}
              className="rounded-md border border-[#1D2A44] bg-[#08111A] px-3 py-2 text-xs font-semibold text-[#A7B0C0] transition hover:border-[#39E6D0]/50 hover:text-[#F8FAFC]"
            >
              {isLoading ? "Actualisation..." : "Actualiser"}
            </button>
          </div>

          {error ? (
            <p className="rounded-md border border-[#F97316]/40 bg-[#F97316]/10 px-4 py-3 text-sm font-semibold text-[#FDBA74]">
              {error}
            </p>
          ) : null}
          {videos.length === 0 ? (
            <p className="rounded-md border border-[#F97316]/35 bg-[#F97316]/10 px-4 py-3 text-sm text-[#FDBA74]">
              Aucune video validée n&apos;est programmable pour l&apos;instant. Termine un rendu, puis valide manuellement la video dans l&apos;onglet Preparer la video.
            </p>
          ) : null}
          {notice ? (
            <p className="rounded-md border border-[#39E6D0]/35 bg-[#39E6D0]/10 px-4 py-3 text-sm font-semibold text-[#39E6D0]">
              {notice}
            </p>
          ) : null}

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,360px)]">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[#A7B0C0]">Frequence</span>
                <select
                  value={frequency}
                  onChange={(event) => setFrequency(Number(event.target.value) as ShortsScheduleFrequency)}
                  className="mt-2 w-full rounded-md border border-[#1D2A44] bg-[#08111A] px-3 py-2.5 text-sm text-[#F8FAFC] outline-none"
                >
                  {frequencies.map((value) => (
                    <option key={value} value={value}>
                      {value} post{value > 1 ? "s" : ""} / jour
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[#A7B0C0]">Fuseau horaire</span>
                <input
                  value={timezone}
                  onChange={(event) => setTimezone(event.target.value)}
                  className="mt-2 w-full rounded-md border border-[#1D2A44] bg-[#08111A] px-3 py-2.5 text-sm text-[#F8FAFC] outline-none"
                />
              </label>
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[#A7B0C0]">Date de debut</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(event) => setStartDate(event.target.value)}
                  className="mt-2 w-full rounded-md border border-[#1D2A44] bg-[#08111A] px-3 py-2.5 text-sm text-[#F8FAFC] outline-none"
                />
              </label>
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[#A7B0C0]">Nombre de jours</span>
                <input
                  type="number"
                  min={1}
                  max={60}
                  value={daysCount}
                  onChange={(event) => setDaysCount(Math.max(1, Number(event.target.value)))}
                  className="mt-2 w-full rounded-md border border-[#1D2A44] bg-[#08111A] px-3 py-2.5 text-sm text-[#F8FAFC] outline-none"
                />
              </label>
            </div>

            <div className="rounded-md border border-[#1D2A44] bg-[#08111A] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#A7B0C0]">Plateformes</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {platforms.map((platform) => (
                  <button
                    key={platform}
                    type="button"
                    onClick={() => togglePlatform(platform)}
                    className={`rounded-md border px-3 py-2 text-xs font-semibold transition ${
                      selectedPlatforms.includes(platform)
                        ? "border-[#39E6D0]/55 bg-[#39E6D0]/10 text-[#39E6D0]"
                        : "border-[#1D2A44] bg-[#03070B] text-[#A7B0C0] hover:border-[#39E6D0]/45 hover:text-[#F8FAFC]"
                    }`}
                  >
                    {SHORTS_SCHEDULE_PLATFORM_LABELS[platform]}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid gap-3 rounded-md border border-[#1D2A44] bg-[#08111A] p-4 text-sm text-[#A7B0C0] md:grid-cols-2 xl:grid-cols-5">
            <p><span className="font-semibold text-[#F8FAFC]">{videos.length}</span> videos disponibles</p>
            <p><span className="font-semibold text-[#F8FAFC]">{planningRows.length}</span> creneaux generes</p>
            <p className="[overflow-wrap:anywhere]">{selectedPlatforms.map((platform) => SHORTS_SCHEDULE_PLATFORM_LABELS[platform]).join(", ") || "Aucune plateforme"}</p>
            <p>{formatDate(effectiveStartDate)} - {formatDate(periodEnd)}</p>
            <p>{normalizedTimezone}</p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={proposePlanning}
              className="rounded-md border border-[#39E6D0]/50 bg-[#39E6D0]/10 px-4 py-2.5 text-sm font-semibold text-[#39E6D0] transition hover:bg-[#1D2A44] hover:text-[#F8FAFC]"
            >
              Proposer un planning
            </button>
            <button
              type="button"
              disabled={isSaving || planningRows.length === 0}
              onClick={() => void savePlanning()}
              className="rounded-md border border-[#1D2A44] bg-[#08111A] px-4 py-2.5 text-sm font-semibold text-[#A7B0C0] transition hover:border-[#39E6D0]/50 hover:text-[#F8FAFC] disabled:cursor-not-allowed disabled:opacity-55"
            >
              {isSaving ? "Enregistrement..." : "Valider le planning"}
            </button>
          </div>

          <div className="overflow-x-auto rounded-md border border-[#1D2A44]">
            <table className="min-w-full border-collapse text-left text-sm">
              <thead className="bg-[#08111A] text-xs uppercase tracking-[0.14em] text-[#A7B0C0]">
                <tr>
                  <th className="px-3 py-3">Date</th>
                  <th className="px-3 py-3">Heure</th>
                  <th className="px-3 py-3">Plateforme</th>
                  <th className="px-3 py-3">Brouillon / titre</th>
                  <th className="px-3 py-3">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1D2A44]">
                {planningRows.length === 0 ? (
                  <tr>
                    <td className="px-3 py-6 text-center text-[#A7B0C0]" colSpan={5}>
                      Aucun planning propose pour le moment.
                    </td>
                  </tr>
                ) : planningRows.map((row) => {
                  const duplicate = duplicateKeys.has(`${row.draftId}:${row.platform}:${safeScheduleIso(row.localDate, row.localTime, normalizedTimezone)}`);
                  const platformTimeDuplicate = platformTimeDuplicates.has(`${row.platform}:${safeScheduleIso(row.localDate, row.localTime, normalizedTimezone)}`);
                  return (
                    <tr key={row.rowId} className={duplicate || platformTimeDuplicate ? "bg-[#F97316]/10" : "bg-[#03070B]"}>
                      <td className="px-3 py-3">
                        <input
                          type="date"
                          value={row.localDate}
                          onChange={(event) => updatePlanningRow(row.rowId, { localDate: event.target.value })}
                          className="w-40 rounded-md border border-[#1D2A44] bg-[#08111A] px-2 py-2 text-[#F8FAFC] outline-none"
                        />
                      </td>
                      <td className="px-3 py-3">
                        <input
                          type="time"
                          value={row.localTime}
                          onChange={(event) => updatePlanningRow(row.rowId, { localTime: event.target.value })}
                          className="w-28 rounded-md border border-[#1D2A44] bg-[#08111A] px-2 py-2 text-[#F8FAFC] outline-none"
                        />
                      </td>
                      <td className="px-3 py-3">
                        <select
                          value={row.platform}
                          onChange={(event) => updatePlanningRow(row.rowId, { platform: event.target.value as ShortsSchedulePlatform })}
                          className="w-40 rounded-md border border-[#1D2A44] bg-[#08111A] px-2 py-2 text-[#F8FAFC] outline-none"
                        >
                          {platforms.map((platform) => (
                            <option key={platform} value={platform}>
                              {SHORTS_SCHEDULE_PLATFORM_LABELS[platform]}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="min-w-[260px] px-3 py-3">
                        <select
                          value={row.draftId}
                          onChange={(event) => updatePlanningRow(row.rowId, { draftId: event.target.value })}
                          className="w-full rounded-md border border-[#1D2A44] bg-[#08111A] px-2 py-2 text-[#F8FAFC] outline-none"
                        >
                          {videos.map((video) => (
                            <option key={video.draftId} value={video.draftId}>
                              {video.title}
                            </option>
                          ))}
                        </select>
                        {duplicate ? (
                          <p className="mt-1 text-xs font-semibold text-[#FDBA74]">
                            Doublon exact detecte.
                          </p>
                        ) : null}
                        {platformTimeDuplicate ? (
                          <p className="mt-1 text-xs font-semibold text-[#FDBA74]">
                            Meme plateforme au meme horaire.
                          </p>
                        ) : null}
                      </td>
                      <td className="px-3 py-3">
                        <span className={`rounded-md border px-2 py-1 text-xs font-semibold ${
                          row.status === "scheduled"
                            ? "border-[#22C55E]/35 bg-[#22C55E]/10 text-[#86EFAC]"
                            : "border-[#39E6D0]/35 bg-[#39E6D0]/10 text-[#39E6D0]"
                        }`}>
                          {row.status === "scheduled" ? "Programme" : "A programmer"}
                        </span>
                        <p className="mt-2 text-xs leading-5 text-[#A7B0C0]">
                          {SHORTS_SCHEDULE_RECOMMENDATION_SOURCE_LABELS[row.recommendationSource]} - {SHORTS_SCHEDULE_RECOMMENDATION_CONFIDENCE_LABELS[row.recommendationConfidence]}
                        </p>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {schedules.length > 0 ? (
            <div className="rounded-md border border-[#1D2A44] bg-[#08111A] p-4">
              <p className="text-sm font-semibold text-[#F8FAFC]">Programmations enregistrees</p>
              <div className="mt-3 grid gap-2">
                {schedules.slice(0, 10).map((schedule) => (
                  <p key={schedule.id} className="rounded-md border border-[#1D2A44] bg-[#03070B] px-3 py-2 text-sm text-[#A7B0C0]">
                    <span className="font-semibold text-[#F8FAFC]">{SHORTS_SCHEDULE_PLATFORM_LABELS[schedule.platform]}</span>
                    {" - "}
                    {formatDateTime(schedule.scheduledAt)}
                    {" - "}
                    {videoById.get(schedule.draftId)?.title ?? schedule.draftId}
                  </p>
                ))}
              </div>
            </div>
          ) : null}
        </section>
      )}
    </div>
  );
}
