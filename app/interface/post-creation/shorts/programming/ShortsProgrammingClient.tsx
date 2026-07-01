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

type PublicationStatus =
  | "draft"
  | "ready"
  | "scheduled"
  | "due"
  | "publishing"
  | "processing_media"
  | "sending_to_tiktok"
  | "uploaded_to_tiktok"
  | "awaiting_tiktok_confirmation"
  | "published"
  | "failed"
  | "cancelled";
type PublicationVisibility = "private" | "unlisted" | "public";
type SchedulePlatformChoice = ShortsSchedulePlatform | "all";
type PublicationPlatformFilter = "all" | ShortsSchedulePlatform;
type PublicationStatusTab = "prepare" | "scheduled" | "published" | "failed" | "cancelled";

type ShortsPublicationItem = {
  accountLabel: string;
  costTotalEstimatedEur: number | null;
  description: string;
  draftId: string;
  errorMessage: string | null;
  hashtags: string[];
  instagramMediaId: string | null;
  instagramPermalink: string | null;
  isPastDue: boolean;
  manifestUrl: string | null;
  outputUrl: string | null;
  platform: ShortsSchedulePlatform;
  publicationId: string | null;
  publishedAt: string | null;
  scheduleId: string;
  scheduledAt: string;
  status: PublicationStatus | "ready";
  tiktokDirectPostAvailable: boolean;
  tiktokPublishId: string | null;
  tiktokUrl: string | null;
  tiktokUploadId: string | null;
  timezone: string;
  title: string;
  validated: boolean;
  visibility: PublicationVisibility;
  youtubeUrl: string | null;
  youtubeVideoId: string | null;
};

type PublicationPayload = {
  error?: string;
  instagramAccountLabel?: string | null;
  instagramConnected?: boolean;
  instagramError?: string | null;
  instagramMissingPermissions?: string[];
  items?: ShortsPublicationItem[];
  tiktokConnected?: boolean;
  tiktokDirectPostAvailable?: boolean;
  tiktokError?: string | null;
  tiktokScopes?: string[];
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
  if (status === "processing_media") {
    return "Traitement media";
  }
  if (status === "sending_to_tiktok") {
    return "Envoi vers TikTok";
  }
  if (status === "uploaded_to_tiktok" || status === "awaiting_tiktok_confirmation") {
    return "Envoyee a TikTok";
  }
  if (status === "due") {
    return "Publication due";
  }
  if (isPastDue) {
    return "Creneau depasse";
  }
  if (status === "ready") {
    return "Prete a publier";
  }
  if (status === "scheduled") {
    return "Programmee";
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
  return normalizePublicationHashtags(hashtags).map((tag) => `#${tag}`).join(" ");
}

function expandPlatformChoice(platform: SchedulePlatformChoice): ShortsSchedulePlatform[] {
  return platform === "all" ? platforms : [platform];
}

function publicationStatusTabFor(item: ShortsPublicationItem): PublicationStatusTab {
  if (item.status === "published") {
    return "published";
  }
  if (item.status === "failed") {
    return "failed";
  }
  if (item.status === "cancelled") {
    return "cancelled";
  }
  if (
    item.status === "scheduled" ||
    item.status === "due" ||
    item.status === "publishing" ||
    item.status === "processing_media" ||
    item.status === "sending_to_tiktok" ||
    item.status === "uploaded_to_tiktok" ||
    item.status === "awaiting_tiktok_confirmation"
  ) {
    return "scheduled";
  }

  return "prepare";
}

function normalizePublicationHashtags(value: string[] | string) {
  const rawItems = Array.isArray(value)
    ? value.map((item) => String(item))
    : value.split(/[,\s]+/);
  const seen = new Set<string>();

  return rawItems
    .map((item) => item.trim().replace(/^#+/, ""))
    .filter(Boolean)
    .filter((item) => {
      const key = item.toLocaleLowerCase("fr-FR");
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
}

function separatePublicationDescription(description: string, hashtags: string[] | string) {
  const extracted = normalizePublicationHashtags(description.match(/#[\p{L}\p{N}_-]+/gu) ?? []);
  const cleanDescription = description
    .replace(/#[\p{L}\p{N}_-]+/gu, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();

  return {
    description: cleanDescription,
    hashtags: normalizePublicationHashtags([...extracted, ...normalizePublicationHashtags(hashtags)]),
  };
}

function composeFinalPublicationDescription(description: string, hashtags: string[] | string) {
  const separated = separatePublicationDescription(description, hashtags);
  const hashtagText = separated.hashtags.map((tag) => `#${tag}`).join(" ");

  return [separated.description, hashtagText].filter(Boolean).join("\n\n");
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
  const [publicationPlatformFilter, setPublicationPlatformFilter] = useState<PublicationPlatformFilter>("all");
  const [publicationStatusTab, setPublicationStatusTab] = useState<PublicationStatusTab>("prepare");
  const [publicationError, setPublicationError] = useState<string | null>(null);
  const [publicationNotice, setPublicationNotice] = useState<string | null>(null);
  const [youtubeConnected, setYoutubeConnected] = useState(false);
  const [youtubeChannelTitle, setYoutubeChannelTitle] = useState<string | null>(null);
  const [youtubeDiagnostic, setYoutubeDiagnostic] = useState<PublicationPayload["youtubeDiagnostic"]>(null);
  const [youtubeError, setYoutubeError] = useState<string | null>(null);
  const [instagramConnected, setInstagramConnected] = useState(false);
  const [instagramAccountLabel, setInstagramAccountLabel] = useState<string | null>(null);
  const [instagramError, setInstagramError] = useState<string | null>(null);
  const [instagramMissingPermissions, setInstagramMissingPermissions] = useState<string[]>([]);
  const [tiktokConnected, setTiktokConnected] = useState(false);
  const [tiktokDirectPostAvailable, setTiktokDirectPostAvailable] = useState(false);
  const [tiktokError, setTiktokError] = useState<string | null>(null);
  const [tiktokScopes, setTiktokScopes] = useState<string[]>([]);
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
  const activePlatformsByDraft = useMemo(() => {
    const groups = new Map<string, Set<ShortsSchedulePlatform>>();
    schedules
      .filter((schedule) => !["cancelled", "failed", "published"].includes(schedule.status))
      .forEach((schedule) => {
        const group = groups.get(schedule.draftId) ?? new Set<ShortsSchedulePlatform>();
        group.add(schedule.platform);
        groups.set(schedule.draftId, group);
      });

    return groups;
  }, [schedules]);
  const isDraftAvailableForPlatformChoice = (draftId: string, platform: SchedulePlatformChoice) =>
    expandPlatformChoice(platform).some((targetPlatform) => !activePlatformsByDraft.get(draftId)?.has(targetPlatform));
  const activePlatformNamesForDraft = (draftId: string) =>
    [...(activePlatformsByDraft.get(draftId) ?? new Set<ShortsSchedulePlatform>())]
      .map((platform) => SHORTS_SCHEDULE_PLATFORM_LABELS[platform])
      .join(", ");
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
  const blockedRows = planningRows.filter((row) =>
    videoById.has(row.draftId) && !isDraftAvailableForPlatformChoice(row.draftId, row.platform),
  );
  const selectedPlatformAvailabilityLabel = selectedPlatforms.length === platforms.length
    ? "toutes les plateformes selectionnees"
    : selectedPlatforms.length === 1
      ? SHORTS_SCHEDULE_PLATFORM_LABELS[selectedPlatforms[0]]
      : "les plateformes selectionnees";
  const hiddenVideoCount = videos.filter((video) =>
    !selectedPlatforms.some((platform) => isDraftAvailableForPlatformChoice(video.draftId, platform)),
  ).length;
  const effectiveStartDate = clampScheduleStartDate(startDate, normalizedTimezone);
  const periodEnd = addDaysToDateValue(effectiveStartDate, Math.max(0, daysCount - 1));
  const filteredPublicationItems = useMemo(() => {
    return publicationItems.filter((item) => {
      const statusMatches = publicationStatusTabFor(item) === publicationStatusTab;
      const platformMatches = publicationPlatformFilter === "all" || item.platform === publicationPlatformFilter;
      return statusMatches && platformMatches;
    });
  }, [publicationItems, publicationPlatformFilter, publicationStatusTab]);
  const youtubePendingCount = publicationItems.filter((item) =>
    item.platform === "youtube" && !["published", "failed", "cancelled"].includes(item.status),
  ).length;
  const youtubeCardMessage = youtubePendingCount === 0
    ? "Aucune video prete a publier pour le moment."
    : youtubeConnected
      ? `Connecte: ${youtubeChannelTitle ?? "chaine YouTube"}`
      : sanitizePublicationMessage(youtubeError) ?? "Le compte YouTube n'est pas connecte.";
  const youtubeCardIsNeutral = youtubePendingCount === 0;
  const instagramPendingCount = publicationItems.filter((item) =>
    item.platform === "instagram" && !["published", "failed", "cancelled"].includes(item.status),
  ).length;
  const instagramCardMessage = instagramPendingCount === 0
    ? "Aucune programmation Instagram a traiter."
    : instagramConnected
      ? `Connecte: ${instagramAccountLabel ?? "compte Instagram"}`
      : instagramError ?? "Le compte Instagram Business/Creator n'est pas connecte.";
  const tiktokPendingCount = publicationItems.filter((item) =>
    item.platform === "tiktok" && !["published", "failed", "cancelled"].includes(item.status),
  ).length;
  const tiktokCardMessage = tiktokPendingCount === 0
    ? "Aucune programmation TikTok a traiter."
    : tiktokConnected
      ? "Connecte: TikTok"
      : tiktokError ?? "Le compte TikTok n'est pas connecte.";
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
  const selectedPublicationLocked = selectedPublication
    ? ["published", "publishing", "processing_media", "sending_to_tiktok", "uploaded_to_tiktok", "awaiting_tiktok_confirmation"].includes(selectedPublication.status) ||
      (selectedPublication.platform === "youtube" && selectedPublication.status === "scheduled")
    : false;
  const selectedPublicationSupportsPreparation = selectedPublication
    ? selectedPublication.platform === "youtube" || selectedPublication.platform === "instagram" || selectedPublication.platform === "tiktok"
    : false;
  const publicationFinalDescriptionPreview = publicationForm
    ? composeFinalPublicationDescription(publicationForm.description, publicationForm.hashtags)
    : "";

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
      setInstagramConnected(Boolean(payload.instagramConnected));
      setInstagramAccountLabel(payload.instagramAccountLabel ?? null);
      setInstagramError(payload.instagramError ?? null);
      setInstagramMissingPermissions(payload.instagramMissingPermissions ?? []);
      setTiktokConnected(Boolean(payload.tiktokConnected));
      setTiktokDirectPostAvailable(Boolean(payload.tiktokDirectPostAvailable));
      setTiktokError(payload.tiktokError ?? null);
      setTiktokScopes(payload.tiktokScopes ?? []);
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
    const separated = separatePublicationDescription(item.description, item.hashtags);
    setSelectedPublication(item);
    setPublicationForm({
      description: separated.description,
      hashtags: hashtagsToText(separated.hashtags),
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
      const action = selectedPublication.platform === "instagram"
        ? "prepare_instagram"
        : selectedPublication.platform === "tiktok"
          ? "prepare_tiktok"
          : "prepare_youtube";
      const response = await fetch("/api/content-workshop/shorts-publications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action,
          scheduleId: selectedPublication.scheduleId,
          data: {
            description: separatePublicationDescription(publicationForm.description, publicationForm.hashtags).description,
            hashtags: hashtagsToText(separatePublicationDescription(publicationForm.description, publicationForm.hashtags).hashtags),
            scheduledAt: inputDateTimeToIso(publicationForm.scheduledAt),
            title: publicationForm.title,
            visibility: selectedPublicationIsFuture ? "private" : publicationForm.visibility,
          },
        }),
      });
      const payload = (await response.json()) as PublicationPayload;

      if (!response.ok || !payload.items) {
        throw new Error(payload.error ?? "Preparation publication indisponible.");
      }

      setPublicationItems(payload.items);
      const next = payload.items.find((item) => item.scheduleId === selectedPublication.scheduleId) ?? null;
      setSelectedPublication(next);
      if (next) {
        const separated = separatePublicationDescription(next.description, next.hashtags);
        setPublicationForm({
          description: separated.description,
          hashtags: hashtagsToText(separated.hashtags),
          scheduledAt: formatDateTimeInput(next.scheduledAt),
          title: next.title,
          visibility: next.visibility,
        });
      }
      setPublicationNotice(
        selectedPublication.platform === "instagram" && next?.status === "scheduled"
          ? "Preparation enregistree. Publication automatique Instagram activee."
          : "Preparation enregistree. Aucune video n'a encore ete envoyee.",
      );
    } catch (caughtError) {
      setPublicationError(
        caughtError instanceof Error
          ? caughtError.message
          : "Preparation publication indisponible.",
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
      const action = selectedPublication.platform === "instagram"
        ? "publish_instagram"
        : selectedPublication.platform === "tiktok"
          ? "send_tiktok"
          : "publish_youtube";
      const response = await fetch("/api/content-workshop/shorts-publications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action,
          publicationId: selectedPublication.publicationId,
          data: {
            description: separatePublicationDescription(publicationForm.description, publicationForm.hashtags).description,
            hashtags: hashtagsToText(separatePublicationDescription(publicationForm.description, publicationForm.hashtags).hashtags),
            scheduledAt: inputDateTimeToIso(publicationForm.scheduledAt),
            title: publicationForm.title,
            visibility: selectedPublicationIsFuture ? "private" : publicationForm.visibility,
          },
        }),
      });
      const payload = (await response.json()) as PublicationPayload;

      if (!response.ok || !payload.items) {
        throw new Error(payload.error ?? "Publication indisponible.");
      }

      setPublicationItems(payload.items);
      const next = payload.items.find((item) => item.publicationId === selectedPublication.publicationId) ?? null;
      setSelectedPublication(next);
      setConfirmingPublicationId(null);
      setPublicationNotice(
        selectedPublication.platform === "instagram"
          ? "Publie sur Instagram."
          : selectedPublication.platform === "tiktok"
            ? "Envoyee vers TikTok. Finalise la publication depuis ton compte TikTok."
            : "Programmee sur YouTube. La publication automatique sera geree par YouTube.",
      );
    } catch (caughtError) {
      setPublicationError(
        caughtError instanceof Error
          ? caughtError.message
          : "Publication indisponible.",
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

    let videoIndex = 0;
    const rows: PlanningRow[] = [];
    proposal.candidates.forEach((slot, index) => {
      if (rows.length >= videos.length) {
        return;
      }

      const availableVideos = videos.filter((video) =>
        isDraftAvailableForPlatformChoice(video.draftId, slot.platform),
      );
      if (availableVideos.length === 0) {
        return;
      }

      const video = availableVideos[videoIndex % availableVideos.length];
      videoIndex += 1;
      rows.push({
        draftId: video.draftId,
        recommendationConfidence: slot.confidence,
        localDate: slot.localDate,
        localTime: slot.localTime,
        platform: slot.platform,
        recommendationSource: slot.recommendationSource,
        rowId: `proposal-${index}-${slot.platform}-${slot.localDate}-${slot.localTime}`,
        slotLabel: slot.slotLabel,
        status: scheduledKeys.has(`${video.draftId}:${slot.platform}:${slot.scheduledAt}`)
          ? "scheduled"
          : "draft",
      });
    });

    if (rows.length === 0) {
      setPlanningRows([]);
      setError("Aucune video disponible pour les plateformes selectionnees. Les doublons actifs sont masques.");
      return;
    }

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

  async function cancelPublicationSchedule(scheduleId: string) {
    setIsPublicationSaving(true);
    setPublicationError(null);
    setPublicationNotice(null);

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
      setPublicationNotice("Programmation annulee. Aucune publication automatique ne sera declenchee.");
      await loadPublicationState();
    } catch (caughtError) {
      setPublicationError(
        caughtError instanceof Error
          ? caughtError.message
          : "Annulation de la programmation indisponible.",
      );
    } finally {
      setIsPublicationSaving(false);
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

    if (blockedRows.length > 0) {
      setError("Planning invalide: une video est deja programmee sur toutes les plateformes ciblees.");
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
              {youtubeDiagnostic && youtubePendingCount > 0 ? (
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
            <div className={`rounded-md border p-4 ${
              instagramPendingCount === 0
                ? "border-[#1D2A44] bg-[#08111A]"
                : instagramConnected
                  ? "border-[#39E6D0]/35 bg-[#39E6D0]/10"
                  : "border-[#F97316]/35 bg-[#F97316]/10"
            }`}>
              <p className="text-sm font-semibold text-[#F8FAFC]">Instagram Reels</p>
              <p className="mt-2 min-w-0 truncate text-sm text-[#A7B0C0]" title={instagramCardMessage}>
                {instagramPendingCount
                  ? `${instagramPendingCount} programmation(s) Instagram a traiter.`
                  : instagramCardMessage}
              </p>
              {instagramPendingCount > 0 ? (
                <p className="mt-2 text-xs font-semibold text-[#A7B0C0]">
                  {instagramConnected ? `Compte cible: ${instagramAccountLabel ?? "Instagram"}` : instagramCardMessage}
                </p>
              ) : null}
              {instagramMissingPermissions.length > 0 ? (
                <p className="mt-2 text-xs font-semibold text-[#FDBA74]">
                  Permission manquante: {instagramMissingPermissions.join(", ")}
                </p>
              ) : null}
            </div>
            <div className={`rounded-md border p-4 ${
              tiktokPendingCount === 0
                ? "border-[#1D2A44] bg-[#08111A]"
                : tiktokConnected
                  ? "border-[#39E6D0]/35 bg-[#39E6D0]/10"
                  : "border-[#F97316]/35 bg-[#F97316]/10"
            }`}>
              <p className="text-sm font-semibold text-[#F8FAFC]">TikTok</p>
              <p className="mt-2 min-w-0 truncate text-sm text-[#A7B0C0]" title={tiktokCardMessage}>
                {tiktokPendingCount
                  ? `${tiktokPendingCount} programmation(s) TikTok a traiter.`
                  : tiktokCardMessage}
              </p>
              <p className="mt-2 text-xs font-semibold text-[#A7B0C0]">
                Scopes: {tiktokScopes.length ? tiktokScopes.join(", ") : "non detectes"}
              </p>
              {tiktokDirectPostAvailable ? (
                <p className="mt-2 w-fit rounded-md border border-[#39E6D0]/35 bg-[#39E6D0]/10 px-2 py-1 text-xs font-semibold text-[#39E6D0]">
                  Publication directe disponible
                </p>
              ) : null}
              {!tiktokConnected && tiktokPendingCount > 0 ? (
                <p className="mt-2 text-xs font-semibold text-[#FDBA74]">
                  {tiktokCardMessage}
                </p>
              ) : null}
            </div>
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

          <div className="grid gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#A7B0C0]">Plateforme</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {([
                  ["all", "Toutes plateformes"],
                  ["tiktok", "TikTok"],
                  ["instagram", "Instagram"],
                  ["youtube", "YouTube Shorts"],
                ] as const satisfies Array<readonly [PublicationPlatformFilter, string]>).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setPublicationPlatformFilter(value)}
                    className={`rounded-md border px-3 py-2 text-sm font-semibold transition ${
                      publicationPlatformFilter === value
                        ? "border-[#39E6D0]/50 bg-[#39E6D0]/10 text-[#39E6D0]"
                        : "border-[#1D2A44] bg-[#08111A] text-[#A7B0C0] hover:border-[#39E6D0]/40 hover:text-[#F8FAFC]"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#A7B0C0]">Statut</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {([
                  ["prepare", "A preparer"],
                  ["scheduled", "Programmees"],
                  ["published", "Publiees"],
                  ["failed", "Echecs"],
                  ["cancelled", "Annulees"],
                ] as const satisfies Array<readonly [PublicationStatusTab, string]>).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setPublicationStatusTab(value)}
                className={`rounded-md border px-3 py-2 text-sm font-semibold transition ${
                  publicationStatusTab === value
                    ? "border-[#39E6D0]/50 bg-[#39E6D0]/10 text-[#39E6D0]"
                    : "border-[#1D2A44] bg-[#08111A] text-[#A7B0C0] hover:border-[#39E6D0]/40 hover:text-[#F8FAFC]"
                }`}
              >
                {label}
              </button>
            ))}
              </div>
            </div>
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
                      {item.platform === "instagram" && item.status === "ready" ? (
                        <p className="mt-3 rounded-md border border-[#1D2A44] bg-[#03070B] px-3 py-2 text-sm font-semibold text-[#A7B0C0]">
                          Programmation enregistree - publication manuelle requise pour le moment.
                        </p>
                      ) : null}
                      {item.platform === "instagram" && item.status === "scheduled" ? (
                        <p className="mt-3 rounded-md border border-[#39E6D0]/35 bg-[#39E6D0]/10 px-3 py-2 text-sm font-semibold text-[#39E6D0]">
                          Programmee automatiquement - publication Instagram prevue autour de {formatDateTime(item.scheduledAt)}.
                        </p>
                      ) : null}
                      {item.platform === "instagram" && item.status === "due" ? (
                        <p className="mt-3 rounded-md border border-[#F97316]/35 bg-[#F97316]/10 px-3 py-2 text-sm font-semibold text-[#FDBA74]">
                          Horaire atteint - publication au prochain passage du cron.
                        </p>
                      ) : null}
                      {item.platform === "instagram" && item.status === "processing_media" ? (
                        <p className="mt-3 rounded-md border border-[#39E6D0]/35 bg-[#39E6D0]/10 px-3 py-2 text-sm font-semibold text-[#39E6D0]">
                          Traitement du Reel en cours chez Instagram.
                        </p>
                      ) : null}
                      {item.platform === "tiktok" && item.status === "ready" ? (
                        <p className="mt-3 rounded-md border border-[#1D2A44] bg-[#03070B] px-3 py-2 text-sm font-semibold text-[#A7B0C0]">
                          Programmation enregistree - envoi TikTok manuel requis pour le moment.
                        </p>
                      ) : null}
                      {item.platform === "tiktok" && ["sending_to_tiktok", "uploaded_to_tiktok", "awaiting_tiktok_confirmation"].includes(item.status) ? (
                        <p className="mt-3 rounded-md border border-[#39E6D0]/35 bg-[#39E6D0]/10 px-3 py-2 text-sm font-semibold text-[#39E6D0]">
                          Envoyee a TikTok - finalisation requise depuis ton compte.
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
                      ) : item.instagramPermalink ? (
                        <a
                          className="mt-3 inline-flex rounded-md border border-[#39E6D0]/50 bg-[#39E6D0]/10 px-3 py-2 text-sm font-semibold text-[#39E6D0] transition hover:text-[#F8FAFC]"
                          href={item.instagramPermalink}
                          rel="noreferrer"
                          target="_blank"
                        >
                          Ouvrir sur Instagram
                        </a>
                      ) : item.tiktokUrl ? (
                        <a
                          className="mt-3 inline-flex rounded-md border border-[#39E6D0]/50 bg-[#39E6D0]/10 px-3 py-2 text-sm font-semibold text-[#39E6D0] transition hover:text-[#F8FAFC]"
                          href={item.tiktokUrl}
                          rel="noreferrer"
                          target="_blank"
                        >
                          Ouvrir sur TikTok
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
                    {selectedPublication.instagramPermalink ? (
                      <a
                        className="min-w-0 overflow-hidden rounded-md border border-[#1D2A44] bg-[#03070B] px-3 py-2 font-semibold text-[#39E6D0] transition hover:text-[#F8FAFC]"
                        href={selectedPublication.instagramPermalink}
                        rel="noreferrer"
                        target="_blank"
                      >
                        Ouvrir le Reel Instagram
                      </a>
                    ) : null}
                    {selectedPublication.tiktokPublishId ? (
                      <InfoLine label="TikTok publish_id" value={selectedPublication.tiktokPublishId} />
                    ) : null}
                  </div>
                  <label className="grid gap-1 text-sm font-semibold text-[#F8FAFC]">
                    {selectedPublication.platform === "instagram" || selectedPublication.platform === "tiktok" ? "Titre interne" : "Titre"}
                    <input
                      value={publicationForm.title}
                      onChange={(event) => setPublicationForm({ ...publicationForm, title: event.target.value })}
                      readOnly={!selectedPublicationSupportsPreparation || selectedPublicationLocked}
                      className="min-w-0 rounded-md border border-[#1D2A44] bg-[#03070B] px-3 py-2 text-sm font-medium text-[#F8FAFC] outline-none"
                    />
                  </label>
                  <label className="grid gap-1 text-sm font-semibold text-[#F8FAFC]">
                    {selectedPublication.platform === "instagram" || selectedPublication.platform === "tiktok" ? "Legende" : "Description"}
                    <textarea
                      rows={5}
                      value={publicationForm.description}
                      onChange={(event) => setPublicationForm({ ...publicationForm, description: event.target.value })}
                      readOnly={!selectedPublicationSupportsPreparation || selectedPublicationLocked}
                      className="min-w-0 resize-y rounded-md border border-[#1D2A44] bg-[#03070B] px-3 py-2 text-sm font-medium text-[#F8FAFC] outline-none"
                    />
                  </label>
                  <label className="grid gap-1 text-sm font-semibold text-[#F8FAFC]">
                    Hashtags
                    <input
                      value={publicationForm.hashtags}
                      onChange={(event) => setPublicationForm({ ...publicationForm, hashtags: event.target.value })}
                      readOnly={!selectedPublicationSupportsPreparation || selectedPublicationLocked}
                      className="min-w-0 rounded-md border border-[#1D2A44] bg-[#03070B] px-3 py-2 text-sm font-medium text-[#F8FAFC] outline-none"
                    />
                  </label>
                  <div className="rounded-md border border-[#1D2A44] bg-[#03070B] px-3 py-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#A7B0C0]">
                      {selectedPublication.platform === "instagram" || selectedPublication.platform === "tiktok" ? "Legende finale publiee" : "Description finale publiee"}
                    </p>
                    <p className="mt-2 whitespace-pre-line text-sm leading-6 text-[#F8FAFC]">
                      {publicationFinalDescriptionPreview || "Aucune description finale."}
                    </p>
                  </div>
                  {selectedPublication.platform === "youtube" || selectedPublication.platform === "instagram" || selectedPublication.platform === "tiktok" ? (
                    <div className="grid gap-3 sm:grid-cols-2">
                    {selectedPublication.platform === "youtube" ? (
                    <label className="grid gap-1 text-sm font-semibold text-[#F8FAFC]">
                      Visibilite
                      <select
                        value={selectedPublicationIsFuture ? "private" : publicationForm.visibility}
                        onChange={(event) => setPublicationForm({ ...publicationForm, visibility: event.target.value as PublicationVisibility })}
                        disabled={selectedPublicationIsFuture || selectedPublicationLocked}
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
                    ) : null}
                    <label className="grid gap-1 text-sm font-semibold text-[#F8FAFC]">
                      Date et heure
                      <input
                        type="datetime-local"
                        value={publicationForm.scheduledAt}
                        onChange={(event) => setPublicationForm({ ...publicationForm, scheduledAt: event.target.value })}
                        disabled={selectedPublicationLocked}
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
                  ) : selectedPublication.platform === "instagram" ? (
                    selectedPublication.status === "published" ? (
                      <p className="rounded-md border border-[#39E6D0]/35 bg-[#39E6D0]/10 px-3 py-2 text-sm font-semibold text-[#39E6D0]">
                        Publie sur Instagram{selectedPublication.publishedAt ? ` le ${formatDateTime(selectedPublication.publishedAt)}` : ""}.
                      </p>
                    ) : selectedPublication.status === "processing_media" || selectedPublication.status === "publishing" ? (
                      <p className="rounded-md border border-[#39E6D0]/35 bg-[#39E6D0]/10 px-3 py-2 text-sm font-semibold text-[#39E6D0]">
                        Envoi Instagram en cours. Le Reel sera publie lorsque le conteneur sera pret.
                      </p>
                    ) : selectedPublication.status === "scheduled" ? (
                      <p className="rounded-md border border-[#39E6D0]/35 bg-[#39E6D0]/10 px-3 py-2 text-sm font-semibold text-[#39E6D0]">
                        Programmee automatiquement - publication Instagram prevue autour de {formatDateTime(selectedPublication.scheduledAt)} selon le passage du cron Vercel.
                      </p>
                    ) : selectedPublication.status === "due" ? (
                      <p className="rounded-md border border-[#F97316]/35 bg-[#F97316]/10 px-3 py-2 text-sm font-semibold text-[#FDBA74]">
                        Horaire atteint - publication automatique en attente du prochain passage du cron.
                      </p>
                    ) : selectedPublicationIsFuture ? (
                      <p className="rounded-md border border-[#1D2A44] bg-[#03070B] px-3 py-2 text-sm font-semibold text-[#A7B0C0]">
                        Enregistre la preparation pour activer la publication automatique Instagram autour de cette heure.
                      </p>
                    ) : (
                      <p className="rounded-md border border-[#39E6D0]/35 bg-[#39E6D0]/10 px-3 py-2 text-sm font-semibold text-[#39E6D0]">
                        Prete pour une publication immediate sur Instagram Reels.
                      </p>
                    )
                  ) : selectedPublication.platform === "tiktok" ? (
                    selectedPublication.status === "awaiting_tiktok_confirmation" ||
                    selectedPublication.status === "uploaded_to_tiktok" ||
                    selectedPublication.status === "sending_to_tiktok" ? (
                      <p className="rounded-md border border-[#39E6D0]/35 bg-[#39E6D0]/10 px-3 py-2 text-sm font-semibold text-[#39E6D0]">
                        Envoyee a TikTok - ouvre TikTok pour finaliser ou publier la video.
                      </p>
                    ) : selectedPublicationIsFuture ? (
                      <p className="rounded-md border border-[#1D2A44] bg-[#03070B] px-3 py-2 text-sm font-semibold text-[#A7B0C0]">
                        Programmation enregistree - envoi TikTok manuel requis pour le moment.
                      </p>
                    ) : (
                      <p className="rounded-md border border-[#39E6D0]/35 bg-[#39E6D0]/10 px-3 py-2 text-sm font-semibold text-[#39E6D0]">
                        La video sera envoyee a TikTok pour etre finalisee et publiee depuis ton compte.
                      </p>
                    )
                  ) : (
                    <p className="rounded-md border border-[#1D2A44] bg-[#03070B] px-3 py-2 text-sm font-semibold text-[#A7B0C0]">
                      Publication bientot disponible.
                    </p>
                  )}
                  {selectedPublicationSupportsPreparation ? (
                    <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={isPublicationSaving || selectedPublicationLocked}
                      onClick={() => void savePublicationPreparation()}
                      className="rounded-md border border-[#1D2A44] bg-[#03070B] px-3 py-2 text-sm font-semibold text-[#A7B0C0] transition hover:border-[#39E6D0]/50 hover:text-[#F8FAFC] disabled:opacity-55"
                      >
                        Enregistrer la preparation
                      </button>
                    {selectedPublication.platform === "instagram" ? (
                      <>
                      <button
                        type="button"
                        disabled={
                          isPublicationSaving ||
                          !selectedPublication.publicationId ||
                          !selectedPublication.validated ||
                          !selectedPublication.outputUrl ||
                          !instagramConnected ||
                          !publicationForm.title.trim() ||
                          !publicationFinalDescriptionPreview.trim() ||
                          selectedPublicationLocked
                        }
                        onClick={() => setConfirmingPublicationId(selectedPublication.publicationId)}
                        className="rounded-md border border-[#39E6D0]/50 bg-[#39E6D0]/10 px-3 py-2 text-sm font-semibold text-[#39E6D0] transition hover:bg-[#1D2A44] hover:text-[#F8FAFC] disabled:cursor-not-allowed disabled:opacity-55"
                      >
                        {selectedPublication.status === "failed" ? "Reessayer maintenant sur Instagram" : "Publier maintenant sur Instagram"}
                      </button>
                      <button
                        type="button"
                        disabled={isPublicationSaving || selectedPublicationLocked || selectedPublication.status === "cancelled"}
                        onClick={() => void cancelPublicationSchedule(selectedPublication.scheduleId)}
                        className="rounded-md border border-[#F97316]/40 bg-[#F97316]/10 px-3 py-2 text-sm font-semibold text-[#FDBA74] transition hover:text-[#F8FAFC] disabled:cursor-not-allowed disabled:opacity-55"
                      >
                        Annuler
                      </button>
                      </>
                    ) : selectedPublication.platform === "tiktok" ? (
                      <>
                      {tiktokDirectPostAvailable ? (
                        <span className="rounded-md border border-[#39E6D0]/35 bg-[#39E6D0]/10 px-3 py-2 text-sm font-semibold text-[#39E6D0]">
                          Publication directe disponible
                        </span>
                      ) : null}
                      <button
                        type="button"
                        disabled={
                          isPublicationSaving ||
                          !selectedPublication.publicationId ||
                          !selectedPublication.validated ||
                          !selectedPublication.outputUrl ||
                          !tiktokConnected ||
                          !publicationForm.title.trim() ||
                          !publicationFinalDescriptionPreview.trim() ||
                          selectedPublicationLocked
                        }
                        onClick={() => setConfirmingPublicationId(selectedPublication.publicationId)}
                        className="rounded-md border border-[#39E6D0]/50 bg-[#39E6D0]/10 px-3 py-2 text-sm font-semibold text-[#39E6D0] transition hover:bg-[#1D2A44] hover:text-[#F8FAFC] disabled:cursor-not-allowed disabled:opacity-55"
                      >
                        {selectedPublication.status === "failed" ? "Reessayer l'envoi TikTok" : "Envoyer vers TikTok"}
                      </button>
                      <button
                        type="button"
                        disabled={isPublicationSaving || selectedPublicationLocked || selectedPublication.status === "cancelled"}
                        onClick={() => void cancelPublicationSchedule(selectedPublication.scheduleId)}
                        className="rounded-md border border-[#F97316]/40 bg-[#F97316]/10 px-3 py-2 text-sm font-semibold text-[#FDBA74] transition hover:text-[#F8FAFC] disabled:cursor-not-allowed disabled:opacity-55"
                      >
                        Annuler
                      </button>
                      </>
                    ) : (
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
                        selectedPublicationLocked
                      }
                      onClick={() => setConfirmingPublicationId(selectedPublication.publicationId)}
                      className="rounded-md border border-[#39E6D0]/50 bg-[#39E6D0]/10 px-3 py-2 text-sm font-semibold text-[#39E6D0] transition hover:bg-[#1D2A44] hover:text-[#F8FAFC] disabled:cursor-not-allowed disabled:opacity-55"
                    >
                      Programmer sur YouTube
                    </button>
                    )}
                    </div>
                  ) : null}
                  {confirmingPublicationId ? (
                    <div className="rounded-md border border-[#39E6D0]/30 bg-[#03070B] p-3 text-sm text-[#A7B0C0]">
                      <p className="font-semibold text-[#F8FAFC]">
                        {selectedPublication.platform === "instagram"
                          ? "Publier ce Reel sur Instagram ?"
                          : selectedPublication.platform === "tiktok"
                            ? "Envoyer cette video vers TikTok ?"
                          : "Programmer cette video sur YouTube ?"}
                      </p>
                      <p className="mt-2 leading-6">
                        {selectedPublication.platform === "instagram"
                          ? "La video sera envoyee maintenant au compte Instagram connecte et publiee des que le media est pret."
                          : selectedPublication.platform === "tiktok"
                            ? "La video sera envoyee a TikTok pour etre finalisee et publiee depuis ton compte."
                          : `La video sera envoyee maintenant en prive a YouTube, puis publiee automatiquement le ${publicationForm ? formatDateTime(safeInputDateTimeToIso(publicationForm.scheduledAt)) : ""} selon le fuseau Europe/Paris.`}
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
                          {isPublicationSaving
                            ? selectedPublication.platform === "instagram" ? "Publication..." : "Programmation..."
                            : selectedPublication.platform === "instagram"
                              ? "Confirmer la publication"
                              : selectedPublication.platform === "tiktok"
                                ? "Confirmer l'envoi"
                                : "Confirmer la programmation"}
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
          {hiddenVideoCount > 0 ? (
            <p className="rounded-md border border-[#1D2A44] bg-[#08111A] px-4 py-3 text-sm text-[#A7B0C0]">
              {hiddenVideoCount} video(s) masquee(s) car deja programmee(s) sur {selectedPlatformAvailabilityLabel}.
            </p>
          ) : null}

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
                  const blocked = videoById.has(row.draftId) && !isDraftAvailableForPlatformChoice(row.draftId, row.platform);
                  const selectableVideos = videos.filter((video) =>
                    video.draftId === row.draftId || isDraftAvailableForPlatformChoice(video.draftId, row.platform),
                  );
                  return (
                    <tr key={row.rowId} className={duplicate || platformTimeDuplicate || blocked ? "bg-[#F97316]/10" : "bg-[#03070B]"}>
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
                          {selectableVideos.map((video) => (
                            <option key={video.draftId} value={video.draftId}>
                              {video.title}
                            </option>
                          ))}
                        </select>
                        {activePlatformNamesForDraft(row.draftId) ? (
                          <p className="mt-1 text-xs text-[#A7B0C0]">
                            Deja programmee: {activePlatformNamesForDraft(row.draftId)}
                          </p>
                        ) : null}
                        {blocked ? (
                          <p className="mt-1 text-xs font-semibold text-[#FDBA74]">
                            Cette video est deja programmee sur les plateformes ciblees.
                          </p>
                        ) : null}
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
                  const selectableEditVideos = isEditing
                    ? videos.filter((video) =>
                      video.draftId === schedule.draftId ||
                      video.draftId === scheduleEditForm.draftId ||
                      isDraftAvailableForPlatformChoice(video.draftId, scheduleEditForm.platform),
                    )
                    : videos;

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
                              {selectableEditVideos.map((video) => (
                                <option key={video.draftId} value={video.draftId}>
                                  {video.title}
                                </option>
                              ))}
                            </select>
                            {scheduleEditForm && activePlatformNamesForDraft(scheduleEditForm.draftId) ? (
                              <p className="text-xs text-[#A7B0C0]">
                                Deja programmee: {activePlatformNamesForDraft(scheduleEditForm.draftId)}
                              </p>
                            ) : null}
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
