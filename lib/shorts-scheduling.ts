export type ShortsSchedulePlatform = "tiktok" | "instagram" | "youtube";
export type ShortsScheduleFrequency = 1 | 2 | 3;
export type ShortsScheduleRecommendationSource = "default" | "historical" | "account_analytics" | "manual";
export type ShortsScheduleRecommendationConfidence = "low" | "medium" | "high";

export type RecommendedSlot = {
  confidence: ShortsScheduleRecommendationConfidence;
  label: string;
  recommendationSource: Exclude<ShortsScheduleRecommendationSource, "manual">;
  time: string;
};

export const DEFAULT_SHORTS_SCHEDULE_TIMEZONE = "Europe/Paris";

export const DEFAULT_RECOMMENDED_SHORTS_SLOTS: Record<ShortsSchedulePlatform, RecommendedSlot[]> = {
  instagram: [
    { confidence: "medium", label: "Midi", recommendationSource: "default", time: "12:30" },
    { confidence: "medium", label: "Fin d'apres-midi", recommendationSource: "default", time: "18:30" },
    { confidence: "medium", label: "Soiree", recommendationSource: "default", time: "20:30" },
  ],
  tiktok: [
    { confidence: "medium", label: "Pause dejeuner", recommendationSource: "default", time: "13:00" },
    { confidence: "medium", label: "Apres-travail", recommendationSource: "default", time: "19:00" },
    { confidence: "medium", label: "Soiree", recommendationSource: "default", time: "21:00" },
  ],
  youtube: [
    { confidence: "medium", label: "Matinee", recommendationSource: "default", time: "11:00" },
    { confidence: "medium", label: "Fin d'apres-midi", recommendationSource: "default", time: "17:30" },
    { confidence: "medium", label: "Soiree", recommendationSource: "default", time: "20:00" },
  ],
};

export const SHORTS_SCHEDULE_PLATFORM_LABELS: Record<ShortsSchedulePlatform, string> = {
  instagram: "Instagram",
  tiktok: "TikTok",
  youtube: "YouTube Shorts",
};

export const SHORTS_SCHEDULE_RECOMMENDATION_SOURCE_LABELS: Record<ShortsScheduleRecommendationSource, string> = {
  account_analytics: "Analytics de compte",
  default: "Recommandations par defaut",
  historical: "Performances historiques",
  manual: "Choix manuel",
};

export const SHORTS_SCHEDULE_RECOMMENDATION_CONFIDENCE_LABELS: Record<ShortsScheduleRecommendationConfidence, string> = {
  high: "Confiance haute",
  low: "Confiance basse",
  medium: "Confiance moyenne",
};

export type ShortsScheduleCandidate = {
  confidence: ShortsScheduleRecommendationConfidence;
  localDate: string;
  localTime: string;
  platform: ShortsSchedulePlatform;
  recommendationSource: ShortsScheduleRecommendationSource;
  scheduledAt: string;
  slotLabel: string;
};

export type BuildShortsScheduleCandidatesInput = {
  daysCount: number;
  frequency: ShortsScheduleFrequency;
  now?: Date;
  platforms: ShortsSchedulePlatform[];
  startDate: string;
  timezone?: string;
};

export type BuildShortsScheduleCandidatesResult = {
  candidates: ShortsScheduleCandidate[];
  effectiveStartDate: string;
  skippedPastSlotCount: number;
  timezone: string;
};

type ZonedParts = {
  day: number;
  hour: number;
  minute: number;
  month: number;
  second: number;
  year: number;
};

const dateValuePattern = /^\d{4}-\d{2}-\d{2}$/;
const timeValuePattern = /^\d{2}:\d{2}$/;

function pad2(value: number) {
  return String(value).padStart(2, "0");
}

function parseDateValue(dateValue: string) {
  if (!dateValuePattern.test(dateValue)) {
    return null;
  }

  const [year, month, day] = dateValue.split("-").map(Number);
  if (!year || !month || !day) {
    return null;
  }

  return { day, month, year };
}

function parseTimeValue(timeValue: string) {
  if (!timeValuePattern.test(timeValue)) {
    return null;
  }

  const [hour, minute] = timeValue.split(":").map(Number);
  if (hour > 23 || minute > 59) {
    return null;
  }

  return { hour, minute };
}

function formatDateValue(parts: Pick<ZonedParts, "day" | "month" | "year">) {
  return `${parts.year}-${pad2(parts.month)}-${pad2(parts.day)}`;
}

function zonedParts(date: Date, timezone: string): ZonedParts {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
    minute: "2-digit",
    month: "2-digit",
    second: "2-digit",
    timeZone: timezone,
    year: "numeric",
  });
  const values = Object.fromEntries(
    formatter.formatToParts(date)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number(part.value)]),
  );

  return {
    day: values.day,
    hour: values.hour,
    minute: values.minute,
    month: values.month,
    second: values.second,
    year: values.year,
  };
}

function wallTimeUtcMs(parts: ZonedParts) {
  return Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
}

export function normalizeScheduleTimezone(timezone?: string) {
  const candidate = timezone?.trim() || DEFAULT_SHORTS_SCHEDULE_TIMEZONE;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: candidate }).format(new Date(0));
    return candidate;
  } catch {
    return DEFAULT_SHORTS_SCHEDULE_TIMEZONE;
  }
}

export function getDateValueInTimezone(date = new Date(), timezone = DEFAULT_SHORTS_SCHEDULE_TIMEZONE) {
  return formatDateValue(zonedParts(date, normalizeScheduleTimezone(timezone)));
}

export function addDaysToDateValue(dateValue: string, days: number) {
  const parts = parseDateValue(dateValue);
  if (!parts) {
    return getDateValueInTimezone();
  }

  const date = new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function clampScheduleStartDate(
  startDate: string,
  timezone = DEFAULT_SHORTS_SCHEDULE_TIMEZONE,
  now = new Date(),
) {
  const normalizedTimezone = normalizeScheduleTimezone(timezone);
  const today = getDateValueInTimezone(now, normalizedTimezone);
  if (!parseDateValue(startDate) || startDate < today) {
    return today;
  }

  return startDate;
}

export function scheduleDateTimeToIso(
  dateValue: string,
  timeValue: string,
  timezone = DEFAULT_SHORTS_SCHEDULE_TIMEZONE,
) {
  const normalizedTimezone = normalizeScheduleTimezone(timezone);
  const dateParts = parseDateValue(dateValue);
  const timeParts = parseTimeValue(timeValue);
  if (!dateParts || !timeParts) {
    throw new Error(`Date ou heure de programmation invalide: ${dateValue} ${timeValue}.`);
  }

  const targetWallTime: ZonedParts = {
    day: dateParts.day,
    hour: timeParts.hour,
    minute: timeParts.minute,
    month: dateParts.month,
    second: 0,
    year: dateParts.year,
  };
  let instantMs = wallTimeUtcMs(targetWallTime);

  for (let index = 0; index < 3; index += 1) {
    const renderedWallTime = zonedParts(new Date(instantMs), normalizedTimezone);
    const diffMs = wallTimeUtcMs(targetWallTime) - wallTimeUtcMs(renderedWallTime);
    if (diffMs === 0) {
      break;
    }
    instantMs += diffMs;
  }

  return new Date(instantMs).toISOString();
}

export function isScheduleInPast(
  dateValue: string,
  timeValue: string,
  timezone = DEFAULT_SHORTS_SCHEDULE_TIMEZONE,
  now = new Date(),
) {
  return Date.parse(scheduleDateTimeToIso(dateValue, timeValue, timezone)) <= now.getTime();
}

export function buildShortsScheduleCandidates({
  daysCount,
  frequency,
  now = new Date(),
  platforms,
  startDate,
  timezone = DEFAULT_SHORTS_SCHEDULE_TIMEZONE,
}: BuildShortsScheduleCandidatesInput): BuildShortsScheduleCandidatesResult {
  const normalizedTimezone = normalizeScheduleTimezone(timezone);
  const effectiveStartDate = clampScheduleStartDate(startDate, normalizedTimezone, now);
  const candidates: ShortsScheduleCandidate[] = [];
  let skippedPastSlotCount = 0;

  for (let day = 0; day < Math.max(1, daysCount); day += 1) {
    const localDate = addDaysToDateValue(effectiveStartDate, day);
    platforms.forEach((platform) => {
      DEFAULT_RECOMMENDED_SHORTS_SLOTS[platform]
        .slice(0, frequency)
        .forEach((slot) => {
          const scheduledAt = scheduleDateTimeToIso(localDate, slot.time, normalizedTimezone);
          if (Date.parse(scheduledAt) <= now.getTime()) {
            skippedPastSlotCount += 1;
            return;
          }

          candidates.push({
            confidence: slot.confidence,
            localDate,
            localTime: slot.time,
            platform,
            recommendationSource: slot.recommendationSource,
            scheduledAt,
            slotLabel: slot.label,
          });
        });
    });
  }

  candidates.sort((left, right) => {
    const timeDiff = Date.parse(left.scheduledAt) - Date.parse(right.scheduledAt);
    if (timeDiff !== 0) {
      return timeDiff;
    }
    return platforms.indexOf(left.platform) - platforms.indexOf(right.platform);
  });

  return {
    candidates,
    effectiveStartDate,
    skippedPastSlotCount,
    timezone: normalizedTimezone,
  };
}
