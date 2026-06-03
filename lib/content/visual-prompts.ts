export const VISUAL_PROMPT_COUNT = 7;

const promptMarkerPattern = /(?:^|\n)\s*Prompt\s+([1-7])\s*(?:[-:])?[^\n]*\n?/gi;

export function parseVisualPrompts(rawVisualPrompt: string) {
  const raw = rawVisualPrompt.trim();

  if (!raw) {
    return Array.from({ length: VISUAL_PROMPT_COUNT }, () => "");
  }

  const matches = [...raw.matchAll(promptMarkerPattern)]
    .map((match) => ({
      index: Number(match[1]) - 1,
      start: match.index ?? 0,
      contentStart: (match.index ?? 0) + match[0].length,
    }))
    .filter((match) => match.index >= 0 && match.index < VISUAL_PROMPT_COUNT);

  if (matches.length === 0) {
    return [
      raw.replace(/^(?:Scene|Prompt)\s+\d+\s*(?:[-:])?\s*/i, "").trim(),
      ...Array.from({ length: VISUAL_PROMPT_COUNT - 1 }, () => ""),
    ];
  }

  const prompts = Array.from({ length: VISUAL_PROMPT_COUNT }, () => "");

  matches.forEach((match, position) => {
    const nextMatch = matches[position + 1];
    const end = nextMatch ? nextMatch.start : raw.length;
    prompts[match.index] = raw.slice(match.contentStart, end).trim();
  });

  return prompts;
}

export function formatVisualPrompts(prompts: string[]) {
  return Array.from({ length: VISUAL_PROMPT_COUNT }, (_, index) => {
    const cleaned = (prompts[index] ?? "")
      .replace(/^(?:Scene|Prompt)\s+\d+\s*(?:[-:])?[^\n]*\n?/i, "")
      .trim();

    return `Prompt ${index + 1}\n${cleaned}`;
  }).join("\n\n");
}

