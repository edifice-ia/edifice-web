export type SubtitleMode = "karaoke" | "classic";

export const DEFAULT_SUBTITLE_MODE: SubtitleMode = "karaoke";

export function normalizeSubtitleMode(value: unknown): SubtitleMode {
  return value === "classic" || value === "srt" ? "classic" : DEFAULT_SUBTITLE_MODE;
}

export function subtitleModeToLocalMode(mode: SubtitleMode) {
  return mode === "classic" ? "srt" : "karaoke";
}

export function subtitleModeLabel(mode: SubtitleMode) {
  return mode === "classic" ? "Classique" : "Karaok\u00e9";
}
