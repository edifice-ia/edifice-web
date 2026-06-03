const rawVisualPrompt = `
Prompt 1 - Hook visuel
A photorealistic vertical 9:16 opening image with a calm protagonist.
Prompt 2 - Mise en situation
The same protagonist sits near a window in the same apartment.
Prompt 3 - Developpement
The story continues with the same light and emotional restraint.
Prompt 4 - Tension
The character feels the pressure rising without changing location.
Prompt 5 - Revelation
A subtle truth appears in the character's expression.
Prompt 6 - Conclusion
The room becomes calmer and the posture is clearer.
Prompt 7 - Derniere image memorable
The final frame stays quiet, symbolic, and unforgettable.
`;

const inlineVisualPrompt = "Prompt 1 - One. Prompt 2 - Two. Prompt 3 - Three. Prompt 4 - Four. Prompt 5 - Five. Prompt 6 - Six. Prompt 7 - Seven.";

function parseVisualPrompts(raw) {
  const markerPattern = /Prompt\s+([1-7])\s*(?:[-:])?\s*/gi;
  const trimmed = raw.trim();
  const matches = [...trimmed.matchAll(markerPattern)]
    .map((match) => ({
      index: Number(match[1]) - 1,
      start: match.index ?? 0,
      contentStart: (match.index ?? 0) + match[0].length,
    }))
    .filter((match) => match.index >= 0 && match.index < 7);
  const prompts = Array.from({ length: 7 }, () => "");

  matches.forEach((match, position) => {
    const nextMatch = matches[position + 1];
    prompts[match.index] = trimmed
      .slice(match.contentStart, nextMatch ? nextMatch.start : trimmed.length)
      .trim();
  });

  return prompts;
}

const parsed = parseVisualPrompts(rawVisualPrompt);
const inlineParsed = parseVisualPrompts(inlineVisualPrompt);
const failures = parsed
  .map((prompt, index) => ({ index: index + 1, prompt }))
  .filter(({ prompt }) => !prompt || /Prompt\s+[1-7]/i.test(prompt));
const inlineFailures = inlineParsed
  .map((prompt, index) => ({ index: index + 1, prompt }))
  .filter(({ prompt }) => !prompt || /Prompt\s+[1-7]/i.test(prompt));

console.log(JSON.stringify({ prompts: parsed, inlinePrompts: inlineParsed, failures, inlineFailures }, null, 2));

if (
  parsed.length !== 7 ||
  failures.length > 0 ||
  inlineParsed.length !== 7 ||
  inlineFailures.length > 0
) {
  process.exit(1);
}
