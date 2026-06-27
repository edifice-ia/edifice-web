export type ShortsSchedulePlatform = "tiktok" | "instagram" | "youtube";
export type ShortsScheduleFrequency = 1 | 2 | 3;

export type RecommendedSlot = {
  label: string;
  time: string;
};

export const DEFAULT_SHORTS_SCHEDULE_TIMEZONE = "Europe/Paris";

export const DEFAULT_RECOMMENDED_SHORTS_SLOTS: Record<ShortsSchedulePlatform, RecommendedSlot[]> = {
  instagram: [
    { label: "Midi", time: "12:30" },
    { label: "Fin d'apres-midi", time: "18:30" },
    { label: "Soiree", time: "20:30" },
  ],
  tiktok: [
    { label: "Pause dejeuner", time: "13:00" },
    { label: "Apres-travail", time: "19:00" },
    { label: "Soiree", time: "21:00" },
  ],
  youtube: [
    { label: "Matinee", time: "11:00" },
    { label: "Fin d'apres-midi", time: "17:30" },
    { label: "Soiree", time: "20:00" },
  ],
};

export const SHORTS_SCHEDULE_PLATFORM_LABELS: Record<ShortsSchedulePlatform, string> = {
  instagram: "Instagram",
  tiktok: "TikTok",
  youtube: "YouTube Shorts",
};
