export const DEFAULT_VISUAL_PROMPT_COUNT = 7;
export const MAX_VISUAL_PROMPT_COUNT = 9;
export const VISUAL_PROMPT_COUNT = DEFAULT_VISUAL_PROMPT_COUNT;

type DurationPreset = "ultra_short" | "short" | "medium" | "long" | string | null | undefined;

export function getRequiredVisualSceneCount(
  durationPreset?: DurationPreset,
  durationSeconds?: number | null,
) {
  if (typeof durationSeconds === "number" && Number.isFinite(durationSeconds)) {
    if (durationSeconds <= 15) {
      return 3;
    }
    if (durationSeconds <= 30) {
      return 5;
    }
    if (durationSeconds <= 45) {
      return 7;
    }
    return 9;
  }

  if (durationPreset === "ultra_short") {
    return 3;
  }
  if (durationPreset === "short") {
    return 5;
  }
  if (durationPreset === "long") {
    return 9;
  }

  return 7;
}

const promptMarkerPattern = /Prompt\s+([1-9])\s*(?:[-:])?\s*/gi;

export function parseVisualPrompts(
  rawVisualPrompt: string,
  count = DEFAULT_VISUAL_PROMPT_COUNT,
) {
  const promptCount = Math.max(1, Math.min(MAX_VISUAL_PROMPT_COUNT, Math.round(count)));
  const raw = rawVisualPrompt.trim();

  if (!raw) {
    return Array.from({ length: promptCount }, () => "");
  }

  const matches = [...raw.matchAll(promptMarkerPattern)]
    .map((match) => ({
      index: Number(match[1]) - 1,
      start: match.index ?? 0,
      contentStart: (match.index ?? 0) + match[0].length,
    }))
    .filter((match) => match.index >= 0 && match.index < promptCount);

  if (matches.length === 0) {
    return [
      raw.replace(/^(?:Scene|Prompt)\s+\d+\s*(?:[-:])?\s*/i, "").trim(),
      ...Array.from({ length: promptCount - 1 }, () => ""),
    ];
  }

  const prompts = Array.from({ length: promptCount }, () => "");

  matches.forEach((match, position) => {
    const nextMatch = matches[position + 1];
    const end = nextMatch ? nextMatch.start : raw.length;
    prompts[match.index] = raw.slice(match.contentStart, end).trim();
  });

  return prompts;
}

export function normalizeVisualPrompts(
  input: string | string[],
  count = DEFAULT_VISUAL_PROMPT_COUNT,
) {
  const promptCount = Math.max(1, Math.min(MAX_VISUAL_PROMPT_COUNT, Math.round(count)));
  const raw = Array.isArray(input) ? input.join("\n\n") : input;
  const parsed = parseVisualPrompts(raw, promptCount);
  const parsedNonEmptyCount = parsed.filter(Boolean).length;

  if (parsedNonEmptyCount > 1 || !Array.isArray(input)) {
    return parsed;
  }

  return Array.from({ length: promptCount }, (_, index) =>
    (input[index] ?? "")
      .replace(/^(?:Scene|Prompt)\s+\d+\s*(?:[-:])?\s*/i, "")
      .trim(),
  );
}

export function formatVisualPrompts(
  prompts: string[],
  count = prompts.length || DEFAULT_VISUAL_PROMPT_COUNT,
) {
  const promptCount = Math.max(1, Math.min(MAX_VISUAL_PROMPT_COUNT, Math.round(count)));

  return Array.from({ length: promptCount }, (_, index) => {
    const cleaned = (prompts[index] ?? "")
      .replace(/^(?:Scene|Prompt)\s+\d+\s*(?:[-:])?[^\n]*\n?/i, "")
      .trim();

    return `Prompt ${index + 1}\n${cleaned}`;
  }).join("\n\n");
}
