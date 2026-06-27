import {
  DEFAULT_RECOMMENDED_SHORTS_SLOTS,
  DEFAULT_SHORTS_SCHEDULE_TIMEZONE,
  type ShortsScheduleFrequency,
  type ShortsSchedulePlatform,
} from "@/lib/shorts-scheduling";
import type { SubtitleMode } from "@/lib/subtitles";

export type SettingsTab =
  | "general"
  | "accounts"
  | "shorts"
  | "voice"
  | "programming"
  | "connections"
  | "security";

export type RenderProfile = "web_standard" | "web_high";

export type ContentAccountSettings = {
  active?: boolean;
  brandType?: string;
  defaultScheduleDays?: number;
  defaultSubtitleStyle?: SubtitleMode;
  defaultVoiceStyle?: string;
  destinationUrl?: string;
  displayName?: string;
  platformPrimary?: ShortsSchedulePlatform | "pinterest";
  platforms?: Array<ShortsSchedulePlatform | "pinterest">;
  postingFrequency?: ShortsScheduleFrequency;
  timezone?: string;
};

export type GlobalSettingsPreferences = {
  defaultInterfaceLanguage: "fr" | "en";
  defaultScheduleDays: number;
  defaultSubtitleStyle: SubtitleMode;
  defaultTimezone: string;
  defaultVoiceId: string;
  defaultVoiceStyle: string;
  enabledPlatforms: ShortsSchedulePlatform[];
  interfaceDensity: "comfortable" | "compact";
  renderProfile: RenderProfile;
  requirePublishConfirmation: boolean;
  requireSubtitleRegenerationConfirmation: boolean;
  requireVideoRegenerationConfirmation: boolean;
  requireVoiceRegenerationConfirmation: boolean;
  showVoiceCostEstimate: boolean;
  shortsDefaultDurationSeconds: number;
  subtitleVerticalPosition: "safe_low" | "standard" | "high";
  videoConcurrentRenderLimit: number;
  visualCountByDuration: {
    "10_15": number;
    "20_30": number;
    "30_45": number;
    "45_60": number;
  };
  weeklyPostingFrequency: ShortsScheduleFrequency;
};

export type KnownContentAccount = {
  accountKey: string;
  color?: string;
  displayName: string;
  source: "shorts" | "pinterest_oauth";
};

export type SettingsPreferencesState = {
  accountPreferences: Record<string, ContentAccountSettings>;
  accounts: KnownContentAccount[];
  globalPreferences: GlobalSettingsPreferences;
  storageAvailable: boolean;
  updatedAt: string | null;
};

export const SETTINGS_TABS: Array<{ id: SettingsTab; label: string }> = [
  { id: "general", label: "General" },
  { id: "accounts", label: "Comptes" },
  { id: "shorts", label: "Shorts" },
  { id: "voice", label: "Voix" },
  { id: "programming", label: "Programmation" },
  { id: "connections", label: "Connexions" },
  { id: "security", label: "Securite" },
];

export const DEFAULT_GLOBAL_SETTINGS: GlobalSettingsPreferences = {
  defaultInterfaceLanguage: "fr",
  defaultScheduleDays: 7,
  defaultSubtitleStyle: "karaoke",
  defaultTimezone: DEFAULT_SHORTS_SCHEDULE_TIMEZONE,
  defaultVoiceId: "elevenlabs_default",
  defaultVoiceStyle: "",
  enabledPlatforms: ["tiktok", "instagram", "youtube"],
  interfaceDensity: "comfortable",
  renderProfile: "web_standard",
  requirePublishConfirmation: true,
  requireSubtitleRegenerationConfirmation: true,
  requireVideoRegenerationConfirmation: true,
  requireVoiceRegenerationConfirmation: true,
  showVoiceCostEstimate: true,
  shortsDefaultDurationSeconds: 30,
  subtitleVerticalPosition: "safe_low",
  videoConcurrentRenderLimit: 1,
  visualCountByDuration: {
    "10_15": 3,
    "20_30": 5,
    "30_45": 7,
    "45_60": 9,
  },
  weeklyPostingFrequency: 1,
};

export const DEFAULT_ACCOUNT_SETTINGS: Record<string, ContentAccountSettings> = {
  lignes_interieures: {
    active: true,
    brandType: "Shorts interieur",
    displayName: "Lignes Interieures",
    platformPrimary: "tiktok",
    platforms: ["tiktok", "instagram", "youtube"],
  },
  edifice_discipline: {
    active: true,
    brandType: "Pinterest discipline",
    displayName: "Edifice Discipline",
    platformPrimary: "pinterest",
    platforms: ["pinterest"],
  },
  solution_sommeil: {
    active: true,
    brandType: "Pinterest sommeil",
    displayName: "Solution Sommeil",
    platformPrimary: "pinterest",
    platforms: ["pinterest"],
  },
};

export const DEFAULT_PROGRAMMING_SLOTS = DEFAULT_RECOMMENDED_SHORTS_SLOTS;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function asFrequency(value: unknown, fallback: ShortsScheduleFrequency): ShortsScheduleFrequency {
  return value === 1 || value === 2 || value === 3 ? value : fallback;
}

function asSubtitleMode(value: unknown, fallback: SubtitleMode): SubtitleMode {
  return value === "classic" || value === "karaoke" ? value : fallback;
}

function asPlatform(value: unknown): ShortsSchedulePlatform | null {
  return value === "tiktok" || value === "instagram" || value === "youtube" ? value : null;
}

function mergeGlobalPreferences(input: unknown): GlobalSettingsPreferences {
  if (!isRecord(input)) {
    return DEFAULT_GLOBAL_SETTINGS;
  }

  const enabledPlatforms = Array.isArray(input.enabledPlatforms)
    ? input.enabledPlatforms.map(asPlatform).filter((platform): platform is ShortsSchedulePlatform => Boolean(platform))
    : DEFAULT_GLOBAL_SETTINGS.enabledPlatforms;

  return {
    ...DEFAULT_GLOBAL_SETTINGS,
    defaultInterfaceLanguage: input.defaultInterfaceLanguage === "en" ? "en" : "fr",
    defaultScheduleDays: Number(input.defaultScheduleDays) || DEFAULT_GLOBAL_SETTINGS.defaultScheduleDays,
    defaultSubtitleStyle: asSubtitleMode(input.defaultSubtitleStyle, DEFAULT_GLOBAL_SETTINGS.defaultSubtitleStyle),
    defaultTimezone: typeof input.defaultTimezone === "string" && input.defaultTimezone.trim()
      ? input.defaultTimezone.trim()
      : DEFAULT_GLOBAL_SETTINGS.defaultTimezone,
    defaultVoiceId: typeof input.defaultVoiceId === "string" ? input.defaultVoiceId : DEFAULT_GLOBAL_SETTINGS.defaultVoiceId,
    defaultVoiceStyle: typeof input.defaultVoiceStyle === "string" ? input.defaultVoiceStyle : "",
    enabledPlatforms: enabledPlatforms.length ? enabledPlatforms : DEFAULT_GLOBAL_SETTINGS.enabledPlatforms,
    interfaceDensity: input.interfaceDensity === "compact" ? "compact" : "comfortable",
    renderProfile: input.renderProfile === "web_high" ? "web_high" : "web_standard",
    requirePublishConfirmation: input.requirePublishConfirmation !== false,
    requireSubtitleRegenerationConfirmation: input.requireSubtitleRegenerationConfirmation !== false,
    requireVideoRegenerationConfirmation: input.requireVideoRegenerationConfirmation !== false,
    requireVoiceRegenerationConfirmation: input.requireVoiceRegenerationConfirmation !== false,
    showVoiceCostEstimate: input.showVoiceCostEstimate !== false,
    shortsDefaultDurationSeconds: Number(input.shortsDefaultDurationSeconds) || DEFAULT_GLOBAL_SETTINGS.shortsDefaultDurationSeconds,
    subtitleVerticalPosition: input.subtitleVerticalPosition === "high" || input.subtitleVerticalPosition === "standard"
      ? input.subtitleVerticalPosition
      : "safe_low",
    videoConcurrentRenderLimit: 1,
    visualCountByDuration: DEFAULT_GLOBAL_SETTINGS.visualCountByDuration,
    weeklyPostingFrequency: asFrequency(input.weeklyPostingFrequency, DEFAULT_GLOBAL_SETTINGS.weeklyPostingFrequency),
  };
}

function mergeAccountPreferences(input: unknown): Record<string, ContentAccountSettings> {
  const source = isRecord(input) ? input : {};
  const merged: Record<string, ContentAccountSettings> = {};

  Object.entries({ ...DEFAULT_ACCOUNT_SETTINGS, ...source }).forEach(([accountKey, value]) => {
    const record = isRecord(value) ? value : {};
    merged[accountKey] = {
      ...DEFAULT_ACCOUNT_SETTINGS[accountKey],
      active: typeof record.active === "boolean" ? record.active : DEFAULT_ACCOUNT_SETTINGS[accountKey]?.active,
      brandType: typeof record.brandType === "string" ? record.brandType : DEFAULT_ACCOUNT_SETTINGS[accountKey]?.brandType,
      defaultScheduleDays: Number(record.defaultScheduleDays) || undefined,
      defaultSubtitleStyle: asSubtitleMode(record.defaultSubtitleStyle, DEFAULT_ACCOUNT_SETTINGS[accountKey]?.defaultSubtitleStyle ?? "karaoke"),
      defaultVoiceStyle: typeof record.defaultVoiceStyle === "string" ? record.defaultVoiceStyle : undefined,
      destinationUrl: typeof record.destinationUrl === "string" ? record.destinationUrl : undefined,
      displayName: typeof record.displayName === "string" ? record.displayName : DEFAULT_ACCOUNT_SETTINGS[accountKey]?.displayName,
      platformPrimary: record.platformPrimary === "pinterest" ? "pinterest" : asPlatform(record.platformPrimary) ?? DEFAULT_ACCOUNT_SETTINGS[accountKey]?.platformPrimary,
      platforms: Array.isArray(record.platforms)
        ? record.platforms.filter((platform) => platform === "pinterest" || asPlatform(platform))
        : DEFAULT_ACCOUNT_SETTINGS[accountKey]?.platforms,
      postingFrequency: asFrequency(record.postingFrequency, DEFAULT_ACCOUNT_SETTINGS[accountKey]?.postingFrequency ?? 1),
      timezone: typeof record.timezone === "string" ? record.timezone : undefined,
    };
  });

  return merged;
}

export function normalizeSettingsPreferences(input: {
  accountPreferences?: unknown;
  globalPreferences?: unknown;
}): Pick<SettingsPreferencesState, "accountPreferences" | "globalPreferences"> {
  return {
    accountPreferences: mergeAccountPreferences(input.accountPreferences),
    globalPreferences: mergeGlobalPreferences(input.globalPreferences),
  };
}

export function resolveAccountSetting<K extends keyof ContentAccountSettings>(
  account: ContentAccountSettings,
  global: GlobalSettingsPreferences,
  key: K,
) {
  return account[key] ?? global[key as unknown as keyof GlobalSettingsPreferences] ?? DEFAULT_ACCOUNT_SETTINGS.lignes_interieures[key];
}
