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
  draftTitle: string;
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

type PublicationStatus = "draft" | "ready" | "publishing" | "scheduled" | "published" | "failed" | "cancelled";
type PublicationVisibility = "private" | "unlisted" | "public";
type SchedulePlatformChoice = ShortsSchedulePlatform | "all";
type PublicationFilter = "all" | ShortsSchedulePlatform | "scheduled" | "published" | "failed";

type ShortsPublicationItem = {
  accountLabel: string;
  costTotalEstimatedEur: number | null;
  description: string;
  draftId: string;
  errorMessage: string | null;
  hashtags: string[];
  isPastDue: boolean;
  manifestUrl: string | null;
  outputUrl: string | null;
  platform: ShortsSchedulePlatform;
  publicationId: string | null;
  publishedAt: string | null;
  scheduleId: string;
  scheduledAt: string;
  status: PublicationStatus | "ready";
  timezone: string;
  title: string;
  validated: boolean;
  visibility: PublicationVisibility;
  youtubeUrl: string | null;
  youtubeVideoId: string | null;
};

type PublicationPayload = {
  error?: string;
  items?: ShortsPublicationItem[];
  youtubeChannelTitle?: string | null;
  youtubeConnected?: boolean;
  youtubeDiagnostic?: {
    action: string;
    cause: string;
    code: string | number | null;
    scheduleId: string | null;
  } | null;
  youtubeError?: string | null;
};

type PublicationForm = {
  description: string;
  hashtags: string;
  scheduledAt: string;
  title: string;
  visibility: PublicationVisibility;
};

type ScheduleEditForm = {
  draftId: string;
  localDate: string;
  localTime: string;
  platform: SchedulePlatformChoice;
};

type PlanningRow = {
  draftId: string;
  localDate: string;
  localTime: string;
  platform: SchedulePlatformChoice;
  recommendationConfidence: ShortsScheduleRecommendationConfidence;
  recommendationSource: ShortsScheduleRecommendationSource;
  rowId: string;
  slotLabel: string;
  status: "draft" | "scheduled";
};

const platforms: ShortsSchedulePlatform[] = ["tiktok", "instagram", "youtube"];
const platformChoices: SchedulePlatformChoice[] = ["all", "tiktok", "instagram", "youtube"];
const platformChoiceLabels: Record<SchedulePlatformChoice, string> = {
  all: "Toutes les plateformes",
  ...SHORTS_SCHEDULE_PLATFORM_LABELS,
};
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

function formatDateTimeInput(value: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) {
    return "";
  }

  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 16);
}

function inputDateTimeToIso(value: string) {
  const [dateValue, timeValue] = value.split("T");
  if (dateValue && timeValue) {
    return scheduleDateTimeToIso(
      dateValue,
      timeValue.slice(0, 5),
      DEFAULT_SHORTS_SCHEDULE_TIMEZONE,
    );
  }

  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString() : value;
}

function safeInputDateTimeToIso(value: string) {
  try {
    return inputDateTimeToIso(value);
  } catch {
    return value;
  }
}

function scheduleToLocalParts(value: string) {
  const input = formatDateTimeInput(value);
  const [localDate = "", localTime = ""] = input.split("T");

  return {
    localDate,
    localTime,
  };
}

function readableStatus(status: string, isPastDue = false) {
  if (status === "published") {
    return "Publiee";
  }
  if (status === "failed") {
    return "Echec de publication";
  }
  if (status === "cancelled") {
    return "Annulee";
  }
  if (status === "publishing") {
    return "Publication en cours";
  }
  if (isPastDue) {
    return "Creneau depasse";
  }
  if (status === "ready") {
    return "Prete a programmer sur YouTube";
  }
  if (status === "scheduled") {
    return "Programmee sur YouTube";
  }

  return "A programmer";
}

function sanitizePublicationMessage(message: string | null | undefined) {
  if (!message?.trim()) {
    return null;
  }

  if (/bad request/i.test(message)) {
    return "La publication YouTube n'est pas encore configuree.";
  }

  return message;
}

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

function hashtagsToText(hashtags: string[]) {
  return hashtags.map((tag) => `#${tag.replace(/^#/, "")}`).join(" ");
}

function expandPlatformChoice(platform: SchedulePlatformChoice): ShortsSchedulePlatform[] {
  return platform === "all" ? platforms : [platform];
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
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [publicationItems, setPublicationItems] = useState<ShortsPublicationItem[]>([]);
  const [publicationFilter, setPublicationFilter] = useState<PublicationFilter>("all");
  const [publicationError, setPublicationError] = useState<string | null>(null);
  const [publicationNotice, setPublicationNotice] = useState<string | null>(null);
  const [youtubeConnected, setYoutubeConnected] = useState(false);
  const [youtubeChannelTitle, setYoutubeChannelTitle] = useState<string | null>(null);
  const [youtubeDiagnostic, setYoutubeDiagnostic] = useState<PublicationPayload["youtubeDiagnostic"]>(null);
  const [youtubeError, setYoutubeError] = useState<string | null>(null);
  const [selectedPublication, setSelectedPublication] = useState<ShortsPublicationItem | null>(null);
  const [publicationForm, setPublicationForm] = useState<PublicationForm | null>(null);
  const [isPublicationLoading, setIsPublicationLoading] = useState(false);
  const [isPublicationSaving, setIsPublicationSaving] = useState(false);
  const [confirmingPublicationId, setConfirmingPublicationId] = useState<string | null>(null);
  const [editingScheduleId, setEditingScheduleId] = useState<string | null>(null);
  const [scheduleEditForm, setScheduleEditForm] = useState<ScheduleEditForm | null>(null);
  const [confirmingScheduleAction, setConfirmingScheduleAction] = useState<{
    action: "cancel" | "past_update";
    scheduleId: string;
  } | null>(null);

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
      expandPlatformChoice(row.platform).forEach((platform) => {
        const key = `${row.draftId}:${platform}:${safeScheduleIso(row.localDate, row.localTime, normalizedTimezone)}`;
        counts.set(key, (counts.get(key) ?? 0) + 1);
      });
    });
    return new Set([...counts.entries()].filter(([, count]) => count > 1).map(([key]) => key));
  }, [normalizedTimezone, planningRows]);
  const platformTimeDuplicates = useMemo(() => {
    const counts = new Map<string, number>();
    planningRows.forEach((row) => {
      expandPlatformChoice(row.platform).forEach((platform) => {
        const key = `${platform}:${safeScheduleIso(row.localDate, row.localTime, normalizedTimezone)}`;
        counts.set(key, (counts.get(key) ?? 0) + 1);
      });
    });
    return new Set([...counts.entries()].filter(([, count]) => count > 1).map(([key]) => key));
  }, [normalizedTimezone, planningRows]);
  const invalidRows = planningRows.filter((row) => !videoById.has(row.draftId));
  const effectiveStartDate = clampScheduleStartDate(startDate, normalizedTimezone);
  const periodEnd = addDaysToDateValue(effectiveStartDate, Math.max(0, daysCount - 1));
  const filteredPublicationItems = useMemo(() => {
    if (publicationFilter === "published") {
      return publicationItems.filter((item) => item.status === "published");
    }
    if (publicationFilter === "failed") {
      return publicationItems.filter((item) => item.status === "failed");
    }
    if (publicationFilter === "scheduled") {
      return publicationItems.filter((item) => item.status === "scheduled");
    }
    if (publicationFilter === "tiktok" || publicationFilter === "instagram" || publicationFilter === "youtube") {
      return publicationItems.filter((item) => item.platform === publicationFilter && item.status !== "cancelled");
    }
    return publicationItems.filter((item) => item.status !== "cancelled");
  }, [publicationFilter, publicationItems]);
  const pendingPublicationCount = useMemo(
    () => publicationItems.filter((item) => !["published", "failed", "cancelled"].includes(item.status)).length,
    [publicationItems],
  );
  const youtubeCardMessage = pendingPublicationCount === 0
    ? "Aucune video prete a publier pour le moment."
    : youtubeConnected
      ? `Connecte: ${youtubeChannelTitle ?? "chaine YouTube"}`
      : sanitizePublicationMessage(youtubeError) ?? "Le compte YouTube n'est pas connecte.";
  const youtubeCardIsNeutral = pendingPublicationCount === 0;
  const publicationCountsByPlatform = useMemo(() => {
    const counts = new Map<ShortsSchedulePlatform, number>(platforms.map((platform) => [platform, 0]));
    publicationItems
      .filter((item) => !["published", "failed", "cancelled"].includes(item.status))
      .forEach((item) => counts.set(item.platform, (counts.get(item.platform) ?? 0) + 1));
    return counts;
  }, [publicationItems]);
  const selectedPublicationScheduledIso = publicationForm
    ? safeInputDateTimeToIso(publicationForm.scheduledAt)
    : "";
  const selectedPublicationIsFuture = Number.isFinite(Date.parse(selectedPublicationScheduledIso)) &&
    Date.parse(selectedPublicationScheduledIso) > nowMs + 60_000;
  const selectedPublicationIsPast = Number.isFinite(Date.parse(selectedPublicationScheduledIso)) &&
    Date.parse(selectedPublicationScheduledIso) <= nowMs;

  const publicationByScheduleId = useMemo(
    () => new Map(publicationItems.map((item) => [item.scheduleId, item])),
    [publicationItems],
  );
  const schedulesByDraft = useMemo(() => {
    const groups = new Map<string, ShortVideoSchedule[]>();
    schedules.forEach((schedule) => {
      const group = groups.get(schedule.draftId) ?? [];
      group.push(schedule);
      groups.set(schedule.draftId, group);
    });

    return [...groups.entries()].map(([draftId, groupSchedules]) => ({
      draftId,
      schedules: groupSchedules,
      title: groupSchedules[0]?.draftTitle ?? draftId,
    }));
  }, [schedules]);

  async function loadSchedulingState() {
    setIsLoading(true);
    setError(null);
    setNowMs(Date.now());

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

  async function loadPublicationState() {
    setIsPublicationLoading(true);
    setPublicationError(null);
    setNowMs(Date.now());

    try {
      const response = await fetch("/api/content-workshop/shorts-publications", {
        cache: "no-store",
      });
      const payload = (await response.json()) as PublicationPayload;

      if (!response.ok || !payload.items) {
        throw new Error(sanitizePublicationMessage(payload.error) ?? "Lecture des publications indisponible.");
      }

      setPublicationItems(payload.items);
      setYoutubeConnected(Boolean(payload.youtubeConnected));
      setYoutubeChannelTitle(payload.youtubeChannelTitle ?? null);
      setYoutubeDiagnostic(payload.youtubeDiagnostic ?? null);
      setYoutubeError(sanitizePublicationMessage(payload.youtubeError));
      if (selectedPublication) {
        setSelectedPublication(payload.items.find((item) => item.scheduleId === selectedPublication.scheduleId) ?? null);
      }
    } catch (caughtError) {
      setPublicationError(
        caughtError instanceof Error
          ? sanitizePublicationMessage(caughtError.message) ?? "Lecture des publications indisponible."
          : "Lecture des publications indisponible.",
      );
    } finally {
      setIsPublicationLoading(false);
    }
  }

  function openPublicationPreparation(item: ShortsPublicationItem) {
    setSelectedPublication(item);
    setPublicationForm({
      description: item.description,
      hashtags: hashtagsToText(item.hashtags),
      scheduledAt: formatDateTimeInput(item.scheduledAt),
      title: item.title,
      visibility: item.visibility,
    });
    setPublicationNotice(null);
    setPublicationError(null);
    setConfirmingPublicationId(null);
  }

  async function savePublicationPreparation() {
    if (!selectedPublication || !publicationForm) {
      return;
    }

    setIsPublicationSaving(true);
    setPublicationError(null);
    setPublicationNotice(null);

    try {
      const response = await fetch("/api/content-workshop/shorts-publications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "prepare_youtube",
          scheduleId: selectedPublication.scheduleId,
          data: {
            description: publicationForm.description,
            hashtags: publicationForm.hashtags,
            scheduledAt: inputDateTimeToIso(publicationForm.scheduledAt),
            title: publicationForm.title,
            visibility: selectedPublicationIsFuture ? "private" : publicationForm.visibility,
          },
        }),
      });
      const payload = (await response.json()) as PublicationPayload;

      if (!response.ok || !payload.items) {
        throw new Error(payload.error ?? "Preparation YouTube indisponible.");
      }

      setPublicationItems(payload.items);
      const next = payload.items.find((item) => item.scheduleId === selectedPublication.scheduleId) ?? null;
      setSelectedPublication(next);
      if (next) {
        setPublicationForm({
          description: next.description,
          hashtags: hashtagsToText(next.hashtags),
          scheduledAt: formatDateTimeInput(next.scheduledAt),
          title: next.title,
          visibility: next.visibility,
        });
      }
      setPublicationNotice("Preparation enregistree. Aucune video n'a encore ete envoyee.");
    } catch (caughtError) {
      setPublicationError(
        caughtError instanceof Error
          ? caughtError.message
          : "Preparation YouTube indisponible.",
      );
    } finally {
      setIsPublicationSaving(false);
    }
  }

  async function publishSelectedPublication() {
    if (!selectedPublication?.publicationId || !publicationForm) {
      return;
    }

    setIsPublicationSaving(true);
    setPublicationError(null);
    setPublicationNotice(null);

    try {
      const response = await fetch("/api/content-workshop/shorts-publications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "publish_youtube",
          publicationId: selectedPublication.publicationId,
          data: {
            description: publicationForm.description,
            hashtags: publicationForm.hashtags,
            scheduledAt: inputDateTimeToIso(publicationForm.scheduledAt),
            title: publicationForm.title,
            visibility: selectedPublicationIsFuture ? "private" : publicationForm.visibility,
          },
        }),
      });
      const payload = (await response.json()) as PublicationPayload;

      if (!response.ok || !payload.items) {
        throw new Error(payload.error ?? "Publication YouTube indisponible.");
      }

      setPublicationItems(payload.items);
      const next = payload.items.find((item) => item.publicationId === selectedPublication.publicationId) ?? null;
      setSelectedPublication(next);
      setConfirmingPublicationId(null);
      setPublicationNotice("Programmee sur YouTube. La publication automatique sera geree par YouTube.");
    } catch (caughtError) {
      setPublicationError(
        caughtError instanceof Error
          ? caughtError.message
          : "Publication YouTube indisponible.",
      );
    } finally {
      setIsPublicationSaving(false);
    }
  }

  function togglePlatform(platform: SchedulePlatformChoice) {
    if (platform === "all") {
      setSelectedPlatforms((current) => current.length === platforms.length ? [] : platforms);
      return;
    }

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

  function startScheduleEdit(schedule: ShortVideoSchedule) {
    const parts = scheduleToLocalParts(schedule.scheduledAt);
    setEditingScheduleId(schedule.id);
    setScheduleEditForm({
      draftId: schedule.draftId,
      localDate: parts.localDate,
      localTime: parts.localTime,
      platform: schedule.platform,
    });
    setConfirmingScheduleAction(null);
    setError(null);
    setNotice(null);
  }

  function duplicateSchedule(schedule: ShortVideoSchedule) {
    const parts = scheduleToLocalParts(schedule.scheduledAt);
    setPlanningRows((current) => [
      ...current,
      {
        draftId: schedule.draftId,
        localDate: parts.localDate,
        localTime: parts.localTime,
        platform: schedule.platform,
        recommendationConfidence: "medium",
        recommendationSource: "manual",
        rowId: `duplicate-${schedule.id}-${Date.now()}`,
        slotLabel: "Duplication manuelle",
        status: "draft",
      },
    ]);
    setNotice("Programmation dupliquee dans le planning a valider.");
  }

  async function saveScheduleEdit(options: { allowPast?: boolean } = {}) {
    if (!editingScheduleId || !scheduleEditForm) {
      return;
    }

    const scheduledAt = safeScheduleIso(
      scheduleEditForm.localDate,
      scheduleEditForm.localTime,
      normalizedTimezone,
    );

    if (!options.allowPast && Date.parse(scheduledAt) <= Date.now()) {
      setConfirmingScheduleAction({ action: "past_update", scheduleId: editingScheduleId });
      return;
    }

    setIsSaving(true);
    setError(null);
    setNotice(null);

    try {
      const response = await fetch("/api/content-workshop/shorts-schedules", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "update_schedule",
          data: {
            allowPast: Boolean(options.allowPast),
            draftId: scheduleEditForm.draftId,
            platform: scheduleEditForm.platform,
            recommendationSource: "manual",
            scheduleId: editingScheduleId,
            scheduledAt,
            timezone: normalizedTimezone,
          },
        }),
      });
      const payload = (await response.json()) as SchedulingPayload;

      if (!response.ok || !payload.schedules) {
        throw new Error(payload.error ?? "Modification de la programmation indisponible.");
      }

      setSchedules(payload.schedules);
      setEditingScheduleId(null);
      setScheduleEditForm(null);
      setConfirmingScheduleAction(null);
      setNotice("Programmation modifiee. Aucune publication n'a ete declenchee.");
      if (activeTab === "publication") {
        void loadPublicationState();
      }
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Modification de la programmation indisponible.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function cancelSchedule(scheduleId: string) {
    setIsSaving(true);
    setError(null);
    setNotice(null);

    try {
      const response = await fetch("/api/content-workshop/shorts-schedules", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "cancel_schedule",
          scheduleId,
        }),
      });
      const payload = (await response.json()) as SchedulingPayload;

      if (!response.ok || !payload.schedules) {
        throw new Error(payload.error ?? "Annulation de la programmation indisponible.");
      }

      setSchedules(payload.schedules);
      setConfirmingScheduleAction(null);
      setEditingScheduleId(null);
      setScheduleEditForm(null);
      setNotice("Programmation annulee. Aucune publication n'a ete declenchee.");
      if (activeTab === "publication") {
        void loadPublicationState();
      }
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Annulation de la programmation indisponible.",
      );
    } finally {
      setIsSaving(false);
    }
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
          onClick={() => {
            setActiveTab("publication");
            void loadPublicationState();
          }}
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
        <section className="space-y-5 rounded-md border border-[#1D2A44] bg-[#03070B] p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#39E6D0]">
                Publication
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-[#F8FAFC]">
                Publication YouTube Shorts
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-[#A7B0C0]">
                Publication v1 manuelle. Aucun envoi ne part sans confirmation explicite.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void loadPublicationState()}
              className="rounded-md border border-[#1D2A44] bg-[#08111A] px-3 py-2 text-xs font-semibold text-[#A7B0C0] transition hover:border-[#39E6D0]/50 hover:text-[#F8FAFC]"
            >
              {isPublicationLoading ? "Actualisation..." : "Actualiser"}
            </button>
          </div>

          <div className="grid gap-3 lg:grid-cols-3">
            <div className={`rounded-md border p-4 ${
              youtubeCardIsNeutral
                ? "border-[#1D2A44] bg-[#08111A]"
                : youtubeConnected
                  ? "border-[#39E6D0]/35 bg-[#39E6D0]/10"
                  : "border-[#F97316]/35 bg-[#F97316]/10"
            }`}>
              <p className="text-sm font-semibold text-[#F8FAFC]">YouTube Shorts</p>
              <p className="mt-2 min-w-0 truncate text-sm text-[#A7B0C0]">
                {publicationCountsByPlatform.get("youtube")
                  ? `${publicationCountsByPlatform.get("youtube")} programmation(s) YouTube a traiter.`
                  : youtubeCardMessage}
              </p>
              {youtubeDiagnostic && pendingPublicationCount > 0 ? (
                <details className="mt-3 rounded-md border border-[#1D2A44] bg-[#03070B] px-3 py-2 text-xs text-[#A7B0C0]">
                  <summary className="cursor-pointer font-semibold text-[#F8FAFC]">
                    Detail technique
                  </summary>
                  <div className="mt-2 grid gap-1">
                    <p><span className="text-[#A7B0C0]">Code: </span>{youtubeDiagnostic.code ?? "n/a"}</p>
                    <p><span className="text-[#A7B0C0]">Cause: </span>{youtubeDiagnostic.cause}</p>
                    <p><span className="text-[#A7B0C0]">Programmation: </span>{youtubeDiagnostic.scheduleId ?? "n/a"}</p>
                    <p><span className="text-[#A7B0C0]">Action: </span>{youtubeDiagnostic.action}</p>
                  </div>
                </details>
              ) : null}
            </div>
            <ComingSoonPlatform
              count={publicationCountsByPlatform.get("instagram") ?? 0}
              title="Instagram"
            />
            <ComingSoonPlatform
              count={publicationCountsByPlatform.get("tiktok") ?? 0}
              title="TikTok"
            />
          </div>

          {publicationError ? (
            <p className="rounded-md border border-[#F97316]/40 bg-[#F97316]/10 px-4 py-3 text-sm font-semibold text-[#FDBA74]">
              {publicationError}
            </p>
          ) : null}
          {publicationNotice ? (
            <p className="rounded-md border border-[#39E6D0]/35 bg-[#39E6D0]/10 px-4 py-3 text-sm font-semibold text-[#39E6D0]">
              {publicationNotice}
            </p>
          ) : null}

          <div className="flex flex-wrap gap-2">
            {([
              ["all", "Toutes"],
              ["tiktok", "TikTok"],
              ["instagram", "Instagram"],
              ["youtube", "YouTube Shorts"],
              ["scheduled", "Programmees"],
              ["published", "Publiees"],
              ["failed", "Echecs"],
            ] as const satisfies Array<readonly [PublicationFilter, string]>).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setPublicationFilter(value)}
                className={`rounded-md border px-3 py-2 text-sm font-semibold transition ${
                  publicationFilter === value
                    ? "border-[#39E6D0]/50 bg-[#39E6D0]/10 text-[#39E6D0]"
                    : "border-[#1D2A44] bg-[#08111A] text-[#A7B0C0] hover:border-[#39E6D0]/40 hover:text-[#F8FAFC]"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
            <div className="grid gap-3">
              {filteredPublicationItems.length ? filteredPublicationItems.map((item) => (
                <article
                  key={item.scheduleId}
                  className="min-w-0 overflow-hidden rounded-md border border-[#1D2A44] bg-[#08111A] p-4"
                >
                  <div className="grid gap-4 md:grid-cols-[180px_minmax(0,1fr)]">
                    <div className="overflow-hidden rounded-md border border-[#1D2A44] bg-[#03070B]">
                      {item.outputUrl ? (
                        <video
                          className="aspect-[9/16] h-52 w-full object-cover"
                          controls
                          preload="metadata"
                          src={item.outputUrl}
                        />
                      ) : (
                        <div className="flex aspect-[9/16] h-52 items-center justify-center px-3 text-center text-sm text-[#A7B0C0]">
                          Video finale indisponible
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#39E6D0]">
                            {SHORTS_SCHEDULE_PLATFORM_LABELS[item.platform]}
                          </p>
                          <h3 className="mt-1 truncate text-lg font-semibold text-[#F8FAFC]" title={item.title}>
                            {item.title}
                          </h3>
                        </div>
                        <span className="w-fit rounded-md border border-[#1D2A44] bg-[#03070B] px-2.5 py-1 text-xs font-semibold text-[#A7B0C0]">
                          {readableStatus(item.status, item.isPastDue)}
                        </span>
                      </div>
                      <div className="mt-3 grid gap-2 text-sm text-[#A7B0C0] sm:grid-cols-2">
                        <InfoLine label="Compte" value={item.accountLabel} />
                        <InfoLine label="Horaire" value={formatDateTime(item.scheduledAt)} />
                        <InfoLine label="Cout estime" value={formatEuro(item.costTotalEstimatedEur)} />
                        <InfoLine label="Validation" value={item.validated ? "Video validee" : "Video non validee"} />
                      </div>
                      {item.isPastDue && item.status !== "published" ? (
                        <p className="mt-3 rounded-md border border-[#F97316]/35 bg-[#F97316]/10 px-3 py-2 text-sm text-[#FDBA74]">
                          Creneau depasse - publication manuelle requise.
                        </p>
                      ) : null}
                      {item.status === "scheduled" && item.platform === "youtube" ? (
                        <p className="mt-3 rounded-md border border-[#39E6D0]/35 bg-[#39E6D0]/10 px-3 py-2 text-sm font-semibold text-[#39E6D0]">
                          Envoyee a YouTube - publication automatique prevue le {formatDateTime(item.scheduledAt)}.
                        </p>
                      ) : null}
                      {item.errorMessage ? (
                        <p className="mt-3 rounded-md border border-[#F97316]/35 bg-[#F97316]/10 px-3 py-2 text-sm text-[#FDBA74]">
                          {item.errorMessage}
                        </p>
                      ) : null}
                      {item.youtubeUrl ? (
                        <a
                          className="mt-3 inline-flex rounded-md border border-[#39E6D0]/50 bg-[#39E6D0]/10 px-3 py-2 text-sm font-semibold text-[#39E6D0] transition hover:text-[#F8FAFC]"
                          href={item.youtubeUrl}
                          rel="noreferrer"
                          target="_blank"
                        >
                          Ouvrir sur YouTube Studio
                        </a>
                      ) : (
                        <button
                          type="button"
                          onClick={() => openPublicationPreparation(item)}
                          className="mt-3 rounded-md border border-[#39E6D0]/50 bg-[#39E6D0]/10 px-3 py-2 text-sm font-semibold text-[#39E6D0] transition hover:bg-[#1D2A44] hover:text-[#F8FAFC]"
                        >
                          Voir le detail
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              )) : (
                <p className="rounded-md border border-[#1D2A44] bg-[#08111A] px-4 py-6 text-sm text-[#A7B0C0]">
                  Aucun element dans cette section.
                </p>
              )}
            </div>

            <aside className="min-w-0 rounded-md border border-[#1D2A44] bg-[#08111A] p-4">
              {selectedPublication && publicationForm ? (
                <div className="grid gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#39E6D0]">
                      Detail publication
                    </p>
                    <h3 className="mt-2 truncate text-xl font-semibold text-[#F8FAFC]" title={selectedPublication.title}>
                      {selectedPublication.title}
                    </h3>
                  </div>
                  {selectedPublication.outputUrl ? (
                    <video
                      className="aspect-[9/16] max-h-[420px] w-full rounded-md border border-[#1D2A44] bg-[#03070B] object-contain"
                      controls
                      preload="metadata"
                      src={selectedPublication.outputUrl}
                    />
                  ) : null}
                  <div className="grid gap-2 text-sm text-[#A7B0C0]">
                    <InfoLine label="Plateforme" value={SHORTS_SCHEDULE_PLATFORM_LABELS[selectedPublication.platform]} />
                    <InfoLine label="Compte" value={selectedPublication.accountLabel} />
                    <InfoLine label="Date programmee" value={formatDateTime(selectedPublication.scheduledAt)} />
                    <InfoLine label="Statut" value={readableStatus(selectedPublication.status, selectedPublication.isPastDue)} />
                    <InfoLine label="Cout estime" value={formatEuro(selectedPublication.costTotalEstimatedEur)} />
                    <a
                      className="min-w-0 overflow-hidden rounded-md border border-[#1D2A44] bg-[#03070B] px-3 py-2 font-semibold text-[#39E6D0] transition hover:text-[#F8FAFC]"
                      href={`/interface/post-creation/shorts/drafts?draft_id=${selectedPublication.draftId}`}
                    >
                      Ouvrir le brouillon
                    </a>
                    {selectedPublication.manifestUrl ? (
                      <a
                        className="min-w-0 overflow-hidden rounded-md border border-[#1D2A44] bg-[#03070B] px-3 py-2 font-semibold text-[#39E6D0] transition hover:text-[#F8FAFC]"
                        href={selectedPublication.manifestUrl}
                        rel="noreferrer"
                        target="_blank"
                      >
                        Voir le manifest
                      </a>
                    ) : (
                      <InfoLine label="Manifest" value="Lien indisponible" />
                    )}
                  </div>
                  <label className="grid gap-1 text-sm font-semibold text-[#F8FAFC]">
                    Titre
                    <input
                      value={publicationForm.title}
                      onChange={(event) => setPublicationForm({ ...publicationForm, title: event.target.value })}
                      readOnly={selectedPublication.platform !== "youtube"}
                      className="min-w-0 rounded-md border border-[#1D2A44] bg-[#03070B] px-3 py-2 text-sm font-medium text-[#F8FAFC] outline-none"
                    />
                  </label>
                  <label className="grid gap-1 text-sm font-semibold text-[#F8FAFC]">
                    Description
                    <textarea
                      rows={5}
                      value={publicationForm.description}
                      onChange={(event) => setPublicationForm({ ...publicationForm, description: event.target.value })}
                      readOnly={selectedPublication.platform !== "youtube"}
                      className="min-w-0 resize-y rounded-md border border-[#1D2A44] bg-[#03070B] px-3 py-2 text-sm font-medium text-[#F8FAFC] outline-none"
                    />
                  </label>
                  <label className="grid gap-1 text-sm font-semibold text-[#F8FAFC]">
                    Hashtags
                    <input
                      value={publicationForm.hashtags}
                      onChange={(event) => setPublicationForm({ ...publicationForm, hashtags: event.target.value })}
                      readOnly={selectedPublication.platform !== "youtube"}
                      className="min-w-0 rounded-md border border-[#1D2A44] bg-[#03070B] px-3 py-2 text-sm font-medium text-[#F8FAFC] outline-none"
                    />
                  </label>
                  {selectedPublication.platform === "youtube" ? (
                    <div className="grid gap-3 sm:grid-cols-2">
                    <label className="grid gap-1 text-sm font-semibold text-[#F8FAFC]">
                      Visibilite
                      <select
                        value={selectedPublicationIsFuture ? "private" : publicationForm.visibility}
                        onChange={(event) => setPublicationForm({ ...publicationForm, visibility: event.target.value as PublicationVisibility })}
                        disabled={selectedPublicationIsFuture || ["scheduled", "published", "publishing"].includes(selectedPublication.status)}
                        className="min-w-0 rounded-md border border-[#1D2A44] bg-[#03070B] px-3 py-2 text-sm font-medium text-[#F8FAFC] outline-none"
                      >
                        {selectedPublicationIsFuture ? (
                          <option value="private">Programmee publique par YouTube (upload prive)</option>
                        ) : (
                          <>
                            <option value="private">Privee</option>
                            <option value="unlisted">Non repertoriee</option>
                            <option value="public">Publique</option>
                          </>
                        )}
                      </select>
                    </label>
                    <label className="grid gap-1 text-sm font-semibold text-[#F8FAFC]">
                      Date et heure
                      <input
                        type="datetime-local"
                        value={publicationForm.scheduledAt}
                        onChange={(event) => setPublicationForm({ ...publicationForm, scheduledAt: event.target.value })}
                        disabled={["scheduled", "published", "publishing"].includes(selectedPublication.status)}
                        className="min-w-0 rounded-md border border-[#1D2A44] bg-[#03070B] px-3 py-2 text-sm font-medium text-[#F8FAFC] outline-none"
                      />
                    </label>
                    </div>
                  ) : null}
                  {selectedPublication.platform === "youtube" ? (
                    selectedPublication.status === "scheduled" ? (
                      <p className="rounded-md border border-[#39E6D0]/35 bg-[#39E6D0]/10 px-3 py-2 text-sm font-semibold text-[#39E6D0]">
                        Programmee sur YouTube - publication automatique par YouTube le {formatDateTime(selectedPublication.scheduledAt)}.
                      </p>
                    ) : selectedPublicationIsPast ? (
                      <p className="rounded-md border border-[#F97316]/35 bg-[#F97316]/10 px-3 py-2 text-sm font-semibold text-[#FDBA74]">
                        Creneau depasse - publier immediatement ou reprogrammer.
                      </p>
                    ) : (
                      <p className="rounded-md border border-[#39E6D0]/35 bg-[#39E6D0]/10 px-3 py-2 text-sm font-semibold text-[#39E6D0]">
                        Prete a programmer sur YouTube. L&apos;upload sera envoye maintenant en prive avec une publication automatique par YouTube.
                      </p>
                    )
                  ) : (
                    <p className="rounded-md border border-[#1D2A44] bg-[#03070B] px-3 py-2 text-sm font-semibold text-[#A7B0C0]">
                      Publication bientot disponible.
                    </p>
                  )}
                  {selectedPublication.platform === "youtube" ? (
                    <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={isPublicationSaving || ["scheduled", "published", "publishing"].includes(selectedPublication.status)}
                      onClick={() => void savePublicationPreparation()}
                      className="rounded-md border border-[#1D2A44] bg-[#03070B] px-3 py-2 text-sm font-semibold text-[#A7B0C0] transition hover:border-[#39E6D0]/50 hover:text-[#F8FAFC] disabled:opacity-55"
                    >
                      Enregistrer la preparation
                    </button>
                    <button
                      type="button"
                      disabled={
                        isPublicationSaving ||
                        !selectedPublication.publicationId ||
                        !selectedPublication.validated ||
                        !selectedPublication.outputUrl ||
                        !youtubeConnected ||
                        !publicationForm.title.trim() ||
                        !Number.isFinite(Date.parse(selectedPublicationScheduledIso)) ||
                        selectedPublicationIsPast ||
                        ["scheduled", "published", "publishing"].includes(selectedPublication.status)
                      }
                      onClick={() => setConfirmingPublicationId(selectedPublication.publicationId)}
                      className="rounded-md border border-[#39E6D0]/50 bg-[#39E6D0]/10 px-3 py-2 text-sm font-semibold text-[#39E6D0] transition hover:bg-[#1D2A44] hover:text-[#F8FAFC] disabled:cursor-not-allowed disabled:opacity-55"
                    >
                      Programmer sur YouTube
                    </button>
                    </div>
                  ) : null}
                  {confirmingPublicationId ? (
                    <div className="rounded-md border border-[#39E6D0]/30 bg-[#03070B] p-3 text-sm text-[#A7B0C0]">
                      <p className="font-semibold text-[#F8FAFC]">
                        Programmer cette video sur YouTube ?
                      </p>
                      <p className="mt-2 leading-6">
                        La video sera envoyee maintenant en prive a YouTube, puis publiee automatiquement le {publicationForm ? formatDateTime(safeInputDateTimeToIso(publicationForm.scheduledAt)) : ""} selon le fuseau Europe/Paris.
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => setConfirmingPublicationId(null)}
                          disabled={isPublicationSaving}
                          className="rounded-md border border-[#64748b]/50 bg-[#64748b]/10 px-3 py-2 text-xs font-semibold text-[#cbd5e1] transition hover:text-[#F8FAFC]"
                        >
                          Annuler
                        </button>
                        <button
                          type="button"
                          onClick={() => void publishSelectedPublication()}
                          disabled={isPublicationSaving}
                          className="rounded-md border border-[#39E6D0]/50 bg-[#39E6D0]/10 px-3 py-2 text-xs font-semibold text-[#39E6D0] transition hover:text-[#F8FAFC] disabled:opacity-55"
                        >
                          {isPublicationSaving ? "Programmation..." : "Confirmer la programmation"}
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : (
                <p className="text-sm leading-6 text-[#A7B0C0]">
                  Selectionne une video programmee, puis ouvre sa fiche detail.
                </p>
              )}
            </aside>
          </div>
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
                {platformChoices.map((platform) => (
                  (() => {
                    const selected = platform === "all"
                      ? selectedPlatforms.length === platforms.length
                      : selectedPlatforms.includes(platform);

                    return (
                  <button
                    key={platform}
                    type="button"
                    onClick={() => togglePlatform(platform)}
                    className={`rounded-md border px-3 py-2 text-xs font-semibold transition ${
                      selected
                        ? "border-[#39E6D0]/55 bg-[#39E6D0]/10 text-[#39E6D0]"
                        : "border-[#1D2A44] bg-[#03070B] text-[#A7B0C0] hover:border-[#39E6D0]/45 hover:text-[#F8FAFC]"
                    }`}
                  >
                    {platformChoiceLabels[platform]}
                  </button>
                    );
                  })()
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
                  const rowPlatforms = expandPlatformChoice(row.platform);
                  const duplicate = rowPlatforms.some((platform) =>
                    duplicateKeys.has(`${row.draftId}:${platform}:${safeScheduleIso(row.localDate, row.localTime, normalizedTimezone)}`),
                  );
                  const platformTimeDuplicate = rowPlatforms.some((platform) =>
                    platformTimeDuplicates.has(`${platform}:${safeScheduleIso(row.localDate, row.localTime, normalizedTimezone)}`),
                  );
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
                          onChange={(event) => updatePlanningRow(row.rowId, { platform: event.target.value as SchedulePlatformChoice })}
                          className="w-40 rounded-md border border-[#1D2A44] bg-[#08111A] px-2 py-2 text-[#F8FAFC] outline-none"
                        >
                          {platformChoices.map((platform) => (
                            <option key={platform} value={platform}>
                              {platformChoiceLabels[platform]}
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
                {schedulesByDraft.map((group) => (
                  <div key={group.draftId} className="grid gap-2 rounded-md border border-[#1D2A44] bg-[#08111A] p-3">
                    <p className="truncate text-sm font-semibold text-[#F8FAFC]" title={group.title}>
                      {group.title}
                    </p>
                    {group.schedules.map((schedule) => {
                  const publication = publicationByScheduleId.get(schedule.id);
                  const locked = publication?.status === "publishing" || publication?.status === "published";
                  const isEditing = editingScheduleId === schedule.id && scheduleEditForm;
                  const isPastDue = Date.parse(schedule.scheduledAt) < nowMs && schedule.status !== "published";

                  return (
                    <article
                      key={schedule.id}
                      className="min-w-0 overflow-hidden rounded-md border border-[#1D2A44] bg-[#03070B] p-3 text-sm text-[#A7B0C0]"
                    >
                      {isEditing ? (
                        <div className="grid gap-3 lg:grid-cols-[minmax(120px,160px)_110px_minmax(130px,160px)_minmax(180px,1fr)_auto] lg:items-end">
                          <label className="grid gap-1">
                            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[#A7B0C0]">Date</span>
                            <input
                              type="date"
                              value={scheduleEditForm.localDate}
                              onChange={(event) => setScheduleEditForm({ ...scheduleEditForm, localDate: event.target.value })}
                              disabled={locked}
                              className="min-w-0 rounded-md border border-[#1D2A44] bg-[#08111A] px-2 py-2 text-[#F8FAFC] outline-none disabled:opacity-55"
                            />
                          </label>
                          <label className="grid gap-1">
                            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[#A7B0C0]">Heure</span>
                            <input
                              type="time"
                              value={scheduleEditForm.localTime}
                              onChange={(event) => setScheduleEditForm({ ...scheduleEditForm, localTime: event.target.value })}
                              disabled={locked}
                              className="min-w-0 rounded-md border border-[#1D2A44] bg-[#08111A] px-2 py-2 text-[#F8FAFC] outline-none disabled:opacity-55"
                            />
                          </label>
                          <label className="grid gap-1">
                            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[#A7B0C0]">Plateforme</span>
                            <select
                          value={scheduleEditForm.platform}
                              onChange={(event) => setScheduleEditForm({ ...scheduleEditForm, platform: event.target.value as SchedulePlatformChoice })}
                              disabled={locked}
                              className="min-w-0 rounded-md border border-[#1D2A44] bg-[#08111A] px-2 py-2 text-[#F8FAFC] outline-none disabled:opacity-55"
                            >
                              {platformChoices.map((platform) => (
                                <option key={platform} value={platform}>
                                  {platformChoiceLabels[platform]}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label className="grid gap-1">
                            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[#A7B0C0]">Video</span>
                            <select
                              value={scheduleEditForm.draftId}
                              onChange={(event) => setScheduleEditForm({ ...scheduleEditForm, draftId: event.target.value })}
                              disabled={locked}
                              className="min-w-0 rounded-md border border-[#1D2A44] bg-[#08111A] px-2 py-2 text-[#F8FAFC] outline-none disabled:opacity-55"
                            >
                              {videos.map((video) => (
                                <option key={video.draftId} value={video.draftId}>
                                  {video.title}
                                </option>
                              ))}
                            </select>
                          </label>
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => void saveScheduleEdit()}
                              disabled={isSaving || locked}
                              className="rounded-md border border-[#39E6D0]/50 bg-[#39E6D0]/10 px-3 py-2 text-xs font-semibold text-[#39E6D0] transition hover:text-[#F8FAFC] disabled:opacity-55"
                            >
                              Enregistrer
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingScheduleId(null);
                                setScheduleEditForm(null);
                                setConfirmingScheduleAction(null);
                              }}
                              className="rounded-md border border-[#64748b]/50 bg-[#64748b]/10 px-3 py-2 text-xs font-semibold text-[#cbd5e1] transition hover:text-[#F8FAFC]"
                            >
                              Fermer
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-[#F8FAFC]" title={schedule.draftTitle}>
                              {schedule.draftTitle}
                            </p>
                            <p className="mt-1 text-sm text-[#A7B0C0]">
                              {SHORTS_SCHEDULE_PLATFORM_LABELS[schedule.platform]} - {formatDateTime(schedule.scheduledAt)}
                            </p>
                            <p className="mt-1 text-xs font-semibold text-[#A7B0C0]">
                              {readableStatus(schedule.status, isPastDue)}
                            </p>
                            {isPastDue ? (
                              <p className="mt-2 rounded-md border border-[#F97316]/35 bg-[#F97316]/10 px-3 py-2 text-xs font-semibold text-[#FDBA74]">
                                Creneau depasse - publication manuelle requise.
                              </p>
                            ) : null}
                            {locked ? (
                              <p className="mt-2 text-xs text-[#A7B0C0]">
                                Champs verrouilles: publication en cours ou deja publiee.
                              </p>
                            ) : null}
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => startScheduleEdit(schedule)}
                              disabled={locked || schedule.status === "cancelled"}
                              className="rounded-md border border-[#1D2A44] bg-[#08111A] px-3 py-2 text-xs font-semibold text-[#A7B0C0] transition hover:border-[#39E6D0]/50 hover:text-[#F8FAFC] disabled:opacity-55"
                            >
                              Modifier
                            </button>
                            <button
                              type="button"
                              onClick={() => duplicateSchedule(schedule)}
                              className="rounded-md border border-[#1D2A44] bg-[#08111A] px-3 py-2 text-xs font-semibold text-[#A7B0C0] transition hover:border-[#39E6D0]/50 hover:text-[#F8FAFC]"
                            >
                              Dupliquer
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmingScheduleAction({ action: "cancel", scheduleId: schedule.id })}
                              disabled={locked || schedule.status === "cancelled"}
                              className="rounded-md border border-[#F97316]/40 bg-[#F97316]/10 px-3 py-2 text-xs font-semibold text-[#FDBA74] transition hover:text-[#F8FAFC] disabled:opacity-55"
                            >
                              Annuler la programmation
                            </button>
                          </div>
                        </div>
                      )}
                      {confirmingScheduleAction?.scheduleId === schedule.id ? (
                        <div className="mt-3 rounded-md border border-[#F97316]/35 bg-[#08111A] p-3 text-sm text-[#A7B0C0]">
                          <p className="font-semibold text-[#F8FAFC]">
                            {confirmingScheduleAction.action === "cancel"
                              ? "Annuler cette programmation ?"
                              : "Enregistrer un creneau deja depasse ?"}
                          </p>
                          <p className="mt-2 leading-6">
                            {confirmingScheduleAction.action === "cancel"
                              ? "La programmation restera dans l'historique comme annulee et ne publiera rien automatiquement."
                              : "Le creneau restera visible comme depasse et demandera une publication manuelle."}
                          </p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => setConfirmingScheduleAction(null)}
                              className="rounded-md border border-[#64748b]/50 bg-[#64748b]/10 px-3 py-2 text-xs font-semibold text-[#cbd5e1] transition hover:text-[#F8FAFC]"
                            >
                              Annuler
                            </button>
                            <button
                              type="button"
                              onClick={() => confirmingScheduleAction.action === "cancel"
                                ? void cancelSchedule(schedule.id)
                                : void saveScheduleEdit({ allowPast: true })}
                              disabled={isSaving}
                              className="rounded-md border border-[#F97316]/40 bg-[#F97316]/10 px-3 py-2 text-xs font-semibold text-[#FDBA74] transition hover:text-[#F8FAFC] disabled:opacity-55"
                            >
                              Confirmer
                            </button>
                          </div>
                        </div>
                      ) : null}
                    </article>
                  );
                    })}
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </section>
      )}
    </div>
  );
}

function ComingSoonPlatform({ count, title }: { count: number; title: string }) {
  return (
    <div className="rounded-md border border-[#1D2A44] bg-[#08111A] p-4">
      <p className="truncate text-sm font-semibold text-[#F8FAFC]" title={title}>
        {title}
      </p>
      <p className="mt-2 text-sm text-[#A7B0C0]">
        {count > 0 ? `${count} programmation(s) a traiter.` : "Aucune programmation pour le moment."}
      </p>
      <p className="mt-2 text-xs font-semibold text-[#A7B0C0]">
        Publication bientot disponible.
      </p>
    </div>
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <p className="min-w-0 overflow-hidden rounded-md border border-[#1D2A44] bg-[#03070B] px-3 py-2">
      <span className="text-[#A7B0C0]">{label}: </span>
      <span className="inline-block max-w-full truncate align-bottom font-semibold text-[#F8FAFC]" title={value}>
        {value}
      </span>
    </p>
  );
}
