import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

type OpenAIResponsePayload = {
  output_text?: string;
  output?: Array<{
    content?: Array<{
      text?: string;
      type?: string;
    }>;
  }>;
};

export type ContentWorkshopInput = {
  theme: string;
  angle: string | null;
  emotion: string | null;
  objective: string | null;
  platform: string;
  format: ContentFormat;
};

export type ContentDraft = {
  concept: string;
  hook: string;
  script: string;
  scriptUltraShort: string;
  scriptShort: string;
  scriptMedium: string;
  scriptLong: string;
  recommendedScript: string;
  title: string;
  caption: string;
  hashtags: string[];
  visualPrompt: string;
  angle: string;
  voiceStyle: string;
  score: {
    viral: number;
    hook: number;
    emotion: number;
    retention: number;
    clarity: number;
    total: number;
    reason: string;
  };
};

export type ContentDraftVariant = {
  id: string;
  title: string;
  hook: string;
  script: string;
  caption: string;
  hashtags: string[];
  mainEmotion: string;
  mainAngle: string;
  visualPrompts: string[];
  visualPrompt: string;
  voiceStyle: string;
  score: {
    emotionalImpact: number;
    clarity: number;
    shareability: number;
    total: number;
  };
};

export type SavedContentDraft = ContentDraft & {
  id: string;
  createdAt: string;
  updatedAt: string | null;
  project: string;
  platformTargets: string[];
  theme: string;
  status: string;
  source: string;
  userId: string | null;
};

type ContentDraftRow = {
  id: string;
  created_at: string;
  updated_at: string | null;
  project: string | null;
  platform_targets: string[] | null;
  theme: string | null;
  angle: string | null;
  hook: string | null;
  script: string | null;
  title: string | null;
  caption: string | null;
  hashtags: string[] | null;
  visual_prompt: string | null;
  voice_style: string | null;
  status: string | null;
  source: string | null;
  user_id: string | null;
  score: Record<string, unknown> | null;
};

const hashtagBuckets = [
  ["#psychologie", "#mindset"],
  ["#solitude", "#amour", "#silence", "#relations"],
  ["#manipulation", "#darkpsychology", "#stoicisme", "#attachement"],
  ["#respect", "#detachement", "#comportementhumain", "#lucidite"],
  ["#fyp", "#viral", "#reels", "#shorts"],
];

const visualStages = [
  {
    label: "Hook visuel",
    englishLabel: "Visual hook",
    narrativeBeat:
      "open with an immediately striking image that makes the viewer stop scrolling",
  },
  {
    label: "Mise en situation",
    englishLabel: "Situation setup",
    narrativeBeat:
      "establish the main character, the place, and the emotional context",
  },
  {
    label: "Developpement",
    englishLabel: "Development",
    narrativeBeat:
      "show the central situation growing with clear visual continuity",
  },
  {
    label: "Tension",
    englishLabel: "Tension",
    narrativeBeat:
      "increase emotional pressure without changing character, location, or style",
  },
  {
    label: "Revelation",
    englishLabel: "Revelation",
    narrativeBeat:
      "make the internal truth visible through a subtle photorealistic moment",
  },
  {
    label: "Conclusion",
    englishLabel: "Conclusion",
    narrativeBeat:
      "resolve the story with calm, dignity, and emotional clarity",
  },
  {
    label: "Derniere image memorable",
    englishLabel: "Memorable final image",
    narrativeBeat:
      "finish with a symbolic final frame that remains in memory",
  },
];

const contentFormats = [
  "ultra_short",
  "short",
  "medium",
  "long",
] as const;

type ContentFormat = typeof contentFormats[number];

const scriptTargets: Record<ContentFormat, { label: string; maxWords: number }> = {
  ultra_short: { label: "10-15 secondes", maxWords: 38 },
  short: { label: "20-30 secondes", maxWords: 75 },
  medium: { label: "35-45 secondes", maxWords: 112 },
  long: { label: "50-60 secondes maximum", maxWords: 150 },
};

type ContentDraftInsertColumn =
  | "project"
  | "platform_targets"
  | "theme"
  | "angle"
  | "hook"
  | "script"
  | "title"
  | "caption"
  | "hashtags"
  | "visual_prompt"
  | "voice_style"
  | "status"
  | "source"
  | "user_id"
  | "score";

type ContentDraftUpdateColumn = Exclude<ContentDraftInsertColumn, "user_id" | "score">;

const contentDraftInsertColumns: ContentDraftInsertColumn[] = [
  "project",
  "platform_targets",
  "theme",
  "angle",
  "hook",
  "script",
  "title",
  "caption",
  "hashtags",
  "visual_prompt",
  "voice_style",
  "status",
  "source",
  "user_id",
  "score",
];

const contentDraftUpdateColumns: ContentDraftUpdateColumn[] = [
  "project",
  "platform_targets",
  "theme",
  "angle",
  "hook",
  "script",
  "title",
  "caption",
  "hashtags",
  "visual_prompt",
  "voice_style",
  "status",
  "source",
];

const contentDraftStatuses = [
  "draft",
  "approved",
  "rejected",
  "ready_to_publish",
] as const;

type ContentDraftStatus = typeof contentDraftStatuses[number];

const contentDraftSelectColumns = [
  "id",
  "created_at",
  "updated_at",
  ...contentDraftInsertColumns,
].join(", ");

let contentDraftsClient: SupabaseClient | null = null;

function getContentDraftsClient() {
  if (contentDraftsClient) {
    return contentDraftsClient;
  }

  const supabaseUrl =
    process.env.SUPABASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Content drafts require SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
    );
  }

  contentDraftsClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return contentDraftsClient;
}

function normalizeText(value: unknown, maxLength: number) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().replace(/\s+/g, " ");
  return normalized.length > 0 ? normalized.slice(0, maxLength) : null;
}

function requireText(value: unknown, maxLength: number, label: string) {
  const normalized = normalizeText(value, maxLength);

  if (!normalized) {
    throw new Error(`${label} est obligatoire.`);
  }

  return normalized;
}

function requireScript(value: unknown, maxLength: number, label: string) {
  const script = requireText(value, maxLength, label);
  const wordCount = script.split(/\s+/).filter(Boolean).length;

  if (wordCount > scriptTargets.long.maxWords) {
    throw new Error(
      `${label} ne doit pas depasser 60 secondes environ (${scriptTargets.long.maxWords} mots maximum).`,
    );
  }

  return script;
}

export function sanitizeContentWorkshopInput(
  input: unknown,
): ContentWorkshopInput {
  const record = input && typeof input === "object" ? input as Record<string, unknown> : {};
  const theme = normalizeText(record.theme, 180);
  const format = normalizeText(record.format, 40) ?? "short";

  if (!theme) {
    throw new Error("Le sujet de depart est obligatoire.");
  }

  if (!contentFormats.includes(format as ContentFormat)) {
    throw new Error(
      `Format souhaite invalide. Formats attendus: ${contentFormats.join(", ")}.`,
    );
  }

  return {
    theme,
    angle: normalizeText(record.angle, 240),
    emotion: normalizeText(record.emotion, 80),
    objective: normalizeText(record.objective, 180),
    platform: normalizeText(record.platform, 80) ?? "Multi-plateforme",
    format: format as ContentFormat,
  };
}

function extractOpenAIText(payload: OpenAIResponsePayload) {
  if (payload.output_text?.trim()) {
    return payload.output_text.trim();
  }

  return (
    payload.output
      ?.flatMap((item) => item.content ?? [])
      .map((content) => content.text)
      .filter((text): text is string => Boolean(text?.trim()))
      .join("\n")
      .trim() ?? ""
  );
}

function extractJsonObject(text: string) {
  const trimmed = text.trim();

  try {
    return JSON.parse(trimmed) as Record<string, unknown>;
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");

    if (start >= 0 && end > start) {
      return JSON.parse(trimmed.slice(start, end + 1)) as Record<string, unknown>;
    }

    throw new Error("La generation n'a pas retourne de JSON exploitable.");
  }
}

function normalizeHashtag(rawTag: unknown) {
  const tag = String(rawTag ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[^\p{L}\p{N}#]/gu, "");

  if (!tag) {
    return "";
  }

  return (tag.startsWith("#") ? tag : `#${tag}`).slice(0, 32);
}

function normalizeHashtags(value: unknown) {
  const rawTags = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(/\s+/)
      : [];
  const normalized = rawTags
    .map(normalizeHashtag)
    .filter((tag, index, tags) => tag && tags.indexOf(tag) === index);
  const finalTags: string[] = [];

  for (const bucket of hashtagBuckets) {
    const selected = normalized.find((tag) => bucket.includes(tag)) ?? bucket[0];
    if (!finalTags.includes(selected)) {
      finalTags.push(selected);
    }
  }

  for (const tag of normalized) {
    if (finalTags.length >= 5) {
      break;
    }
    if (!finalTags.includes(tag)) {
      finalTags.push(tag);
    }
  }

  return finalTags.slice(0, 5);
}

function sanitizeHashtagList(value: unknown) {
  const hashtags = normalizeHashtags(value);

  if (hashtags.length === 0) {
    throw new Error("Les hashtags sont obligatoires.");
  }

  return hashtags;
}

function normalizePlatformTargets(platform: string) {
  if (platform === "Multi-plateforme") {
    return ["YouTube Shorts", "TikTok", "Instagram Reels", "Pinterest"];
  }

  return [platform];
}

function sanitizePlatformTargets(value: unknown) {
  const targets = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(",")
      : [];
  const normalized = targets
    .map((target) => normalizeText(target, 80))
    .filter((target): target is string => Boolean(target));

  if (normalized.length === 0) {
    throw new Error("Au moins une plateforme cible est obligatoire.");
  }

  return [...new Set(normalized)];
}

function clampScore(value: unknown) {
  const score = Number(value);
  return Number.isFinite(score) ? Math.max(0, Math.min(10, score)) : 0;
}

function fallbackVisualScene(
  input: ContentWorkshopInput,
  angle: string,
  emotion: string,
  index: number,
) {
  const stage = visualStages[index] ?? visualStages[0];
  const protagonist =
    "the same solitary adult protagonist, understated dark clothing, expressive but restrained face";
  const setting =
    "the same quiet urban apartment at night, rain on the window, muted blue gray walls, a wooden table, one warm practical lamp";

  return [
    `${stage.englishLabel}. Create a photorealistic vertical 9:16 image prompt for an AI image generator.`,
    `It continues one coherent story about ${input.theme}, seen through ${angle}.`,
    `Keep ${protagonist}. Keep ${setting}.`,
    `This beat must ${stage.narrativeBeat}.`,
    `The emotional tone is ${emotion}: contained, intimate, cinematic, human, never theatrical.`,
    "Describe subject, environment, atmosphere, light, lens, framing, composition, and subtle body language.",
    "Use realistic skin texture, natural proportions, cinematic shallow depth of field, soft contrast, no text, no logo, no watermark.",
  ].join(" ");
}

function normalizeVisualPromptScenes(
  value: unknown,
  input: ContentWorkshopInput,
  angle: string,
  emotion: string,
) {
  const rawScenes = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value
          .split(/(?:\n\s*){2,}|(?:Scene|Prompt)\s+\d+\s*(?:[-:])?/i)
          .map((scene) => scene.trim())
          .filter(Boolean)
      : [];
  const scenes = rawScenes
    .map((scene, index) => {
      const normalized = normalizeText(scene, 1400);
      if (!normalized) {
        return null;
      }

      return /^(?:Scene|Prompt)\s+\d+/i.test(normalized)
        ? normalized
        : `Prompt ${index + 1}: ${normalized}`;
    })
    .filter((scene): scene is string => Boolean(scene))
    .slice(0, 7);

  while (scenes.length < 7) {
    scenes.push(fallbackVisualScene(input, angle, emotion, scenes.length));
  }

  return scenes;
}

function formatVisualPromptScenes(scenes: string[]) {
  return scenes
    .slice(0, 7)
    .map((scene, index) => {
      const stage = visualStages[index] ?? visualStages[0];
      const cleaned = scene
        .replace(/^(?:Scene|Prompt)\s+\d+\s*(?:[-:])?\s*/i, "")
        .trim();
      return `Prompt ${index + 1} - ${stage.label}\n${cleaned}`;
    })
    .join("\n\n");
}

function limitScriptToWords(script: string, maxWords: number) {
  const lines = script
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
  const words: string[] = [];
  const finalLines: string[] = [];

  for (const line of lines) {
    const nextWords = line.split(/\s+/).filter(Boolean);

    if (words.length + nextWords.length > maxWords) {
      const remaining = maxWords - words.length;
      if (remaining > 0) {
        finalLines.push(nextWords.slice(0, remaining).join(" "));
      }
      break;
    }

    words.push(...nextWords);
    finalLines.push(line);
  }

  const limited = finalLines.join("\n").trim();
  return limited || script.split(/\s+/).slice(0, maxWords).join(" ").trim();
}

function normalizeScriptVariant(
  value: unknown,
  fallback: string,
  format: ContentFormat,
) {
  const raw =
    typeof value === "string" && value.trim()
      ? value.trim()
      : fallback;

  return limitScriptToWords(raw, scriptTargets[format].maxWords);
}

function normalizeVariantScore(value: unknown) {
  const score = value && typeof value === "object"
    ? value as Record<string, unknown>
    : {};
  const emotionalImpact = clampScore(
    score.emotional_impact ?? score.emotionalImpact ?? score.emotion,
  );
  const clarity = clampScore(score.clarity ?? score.clarte);
  const shareability = clampScore(
    score.shareability ?? score.partageabilite ?? score.shareability_score,
  );
  const values = [emotionalImpact, clarity, shareability].map((item) =>
    item > 0 ? item : 7,
  );
  const total = Number(
    (values.reduce((sum, item) => sum + item, 0) / values.length).toFixed(1),
  );

  return {
    emotionalImpact: values[0],
    clarity: values[1],
    shareability: values[2],
    total,
  };
}

function serializeDraftScore(score: ContentDraft["score"]) {
  const viral = clampScore(score.viral);
  const hook = clampScore(score.hook);
  const emotion = clampScore(score.emotion);
  const retention = clampScore(score.retention);
  const clarity = clampScore(score.clarity);
  const total = clampScore(score.total);

  return {
    viral,
    hook,
    emotion,
    retention,
    clarity,
    total,
    reason:
      normalizeText(score.reason, 500) ??
      "Score editorial calcule dans l'Atelier de contenu.",
    emotional_impact: emotion,
    shareability: viral,
    source: "content_workshop",
    schema_version: 1,
  };
}

function normalizeStoredDraftScore(value: unknown): ContentDraft["score"] {
  const score = value && typeof value === "object"
    ? value as Record<string, unknown>
    : {};
  const hasStoredScore = Object.keys(score).length > 0;
  const viral = clampScore(
    score.viral ?? score.shareability ?? score.shareability_score,
  );
  const hook = clampScore(score.hook ?? score.hook_score ?? score.clarity);
  const emotion = clampScore(
    score.emotion ?? score.emotional_impact ?? score.emotionalImpact,
  );
  const retention = clampScore(score.retention ?? score.clarity);
  const clarity = clampScore(score.clarity ?? score.clarte);
  const calculatedTotal = [viral, hook, emotion, retention, clarity]
    .filter((item) => item > 0);
  const storedTotal = clampScore(score.total ?? score.global ?? score.score);
  const total = storedTotal > 0
    ? storedTotal
    : calculatedTotal.length > 0
      ? Number(
        (
          calculatedTotal.reduce((sum, item) => sum + item, 0) /
          calculatedTotal.length
        ).toFixed(1),
      )
      : 0;

  return {
    viral,
    hook,
    emotion,
    retention,
    clarity,
    total,
    reason:
      normalizeText(score.reason, 500) ??
      (hasStoredScore
        ? "Score editorial recharge depuis content_drafts."
        : "Score non disponible pour ce brouillon."),
  };
}

function normalizeGeneratedVariant(
  value: unknown,
  input: ContentWorkshopInput,
  index: number,
) {
  const data = value && typeof value === "object"
    ? value as Record<string, unknown>
    : {};
  const mainAngle =
    normalizeText(data.main_angle ?? data.mainAngle ?? data.angle, 240) ??
    input.angle ??
    "Transformer une tension interieure en clarification simple.";
  const mainEmotion =
    normalizeText(data.main_emotion ?? data.mainEmotion ?? data.emotion, 80) ??
    input.emotion ??
    "Lucidite calme";
  const script = normalizeScriptVariant(
    data.script,
    [
      "Ce que tu gardes en silence finit par changer ta posture.",
      "Pas parce que tu deviens froid.",
      "Mais parce que tu redeviens clair.",
    ].join("\n"),
    input.format,
  );
  const visualPrompts = normalizeVisualPromptScenes(
    data.visual_prompts ?? data.visualPrompts ?? data.visual_prompt,
    input,
    mainAngle,
    mainEmotion,
  );

  return {
    id: normalizeText(data.id, 60) ?? `variant-${index + 1}`,
    title: normalizeText(data.title, 120) ?? `${input.theme} ${index + 1}`,
    hook:
      normalizeText(data.hook, 240) ??
      "Ce que tu refuses de regarder finit toujours par parler plus fort.",
    script,
    caption:
      normalizeText(data.caption, 500) ??
      "Certaines verites deviennent legeres quand on arrete de les fuir.",
    hashtags: normalizeHashtags(data.hashtags),
    mainEmotion,
    mainAngle,
    visualPrompts,
    visualPrompt: formatVisualPromptScenes(visualPrompts),
    voiceStyle:
      normalizeText(data.voice_style ?? data.voiceStyle, 240) ??
      "Voix calme, grave, intime, rythme oral, tension contenue.",
    score: normalizeVariantScore(data.score),
  } satisfies ContentDraftVariant;
}

function normalizeVariantList(payload: Record<string, unknown>, input: ContentWorkshopInput) {
  const rawVariants = Array.isArray(payload.variants)
    ? payload.variants
    : Array.isArray(payload.drafts)
      ? payload.drafts
      : [];
  const variants = rawVariants
    .slice(0, 3)
    .map((variant, index) => normalizeGeneratedVariant(variant, input, index));

  while (variants.length < 3) {
    variants.push(generateFallbackVariant(input, variants.length));
  }

  return variants
    .map((variant, index) => ({ ...variant, id: `variant-${index + 1}` }))
    .sort((a, b) => b.score.total - a.score.total);
}

export function contentDraftFromVariant(
  input: ContentWorkshopInput,
  variant: ContentDraftVariant,
) {
  return {
    concept: `${input.theme}: ${variant.mainAngle}`,
    hook: variant.hook,
    script: variant.script,
    scriptUltraShort: "",
    scriptShort: "",
    scriptMedium: "",
    scriptLong: "",
    recommendedScript: variant.script,
    title: variant.title,
    caption: variant.caption,
    hashtags: variant.hashtags,
    visualPrompt: formatVisualPromptScenes(variant.visualPrompts),
    angle: variant.mainAngle,
    voiceStyle: variant.voiceStyle,
    score: {
      viral: variant.score.shareability,
      hook: variant.score.clarity,
      emotion: variant.score.emotionalImpact,
      retention: variant.score.clarity,
      clarity: variant.score.clarity,
      total: variant.score.total,
      reason: "Score editorial calcule avant sauvegarde dans l'Atelier de contenu.",
    },
  } satisfies ContentDraft;
}

export function sanitizeSelectedContentVariant(
  input: ContentWorkshopInput,
  value: unknown,
) {
  return normalizeGeneratedVariant(value, input, 0);
}

function buildPrompt(input: ContentWorkshopInput) {
  return [
    `Sujet: ${input.theme}`,
    `Angle: ${input.angle ?? "a proposer"}`,
    `Emotion recherchee: ${input.emotion ?? "lucidite calme"}`,
    `Objectif: ${input.objective ?? "brouillon complet a valider"}`,
    `Plateforme: ${input.platform}`,
    `Format souhaite: ${input.format} (${scriptTargets[input.format].label})`,
    "",
    "Genere 3 variantes de brouillon pour L'Edifice, en francais.",
    "Style: sombre, humain, psychologique, introspectif, socialement lucide.",
    "Contraintes editoriales:",
    "- les 3 variantes restent sur le meme sujet",
    "- chaque variante explore un angle different et une emotion differente",
    "- eviter les doublons de titre, hook, script et legende",
    "- hook direct et comprehensible en moins de 2 secondes",
    "- script oral avec progression: observation, tension psychologique, verite emotionnelle, phrase finale memorable",
    "- aucun script ne doit depasser 60 secondes",
    "- phrases courtes, rythme oral, une seule idee centrale",
    "- adapte a TikTok, Instagram Reels et YouTube Shorts",
    "- titre court, humain, non abstrait",
    "- legende: 1 phrase maximum, 500 caracteres maximum",
    "- exactement 5 hashtags courts et pertinents",
    "- generer exactement 7 visual_prompts par variante",
    "- structure obligatoire des visual_prompts: 1 Hook visuel, 2 Mise en situation, 3 Developpement, 4 Tension, 5 Revelation, 6 Conclusion, 7 Derniere image memorable",
    "- tous les prompts visuels racontent la meme histoire",
    "- conserver le meme personnage principal, le meme decor et la meme coherence emotionnelle sur les 7 prompts",
    "- chaque prompt visuel est en anglais, photorealiste, vertical 9:16, optimise generation IA",
    "- chaque prompt visuel contient 80 a 150 mots",
    "- chaque prompt visuel decrit sujet, decor, ambiance, lumiere, cadrage, composition et langage corporel",
    "- aucun prompt ne declenche de generation image; texte uniquement",
    "- no text, no logo, no watermark",
    "- aucune publication, aucun planning, aucune generation video",
    "",
    "Reponds uniquement en JSON valide avec ces cles:",
    "{ variants: [ { title, hook, script, caption, hashtags, main_emotion, main_angle, visual_prompts, voice_style, score } ] }",
    "score contient: emotional_impact, clarity, shareability. Chaque score est sur 10.",
  ].join("\n");
}

async function generateWithOpenAI(input: ContentWorkshopInput) {
  const apiKey = process.env.OPENAI_API_KEY?.trim();

  if (!apiKey) {
    return null;
  }

  const model = process.env.OPENAI_MODEL?.trim() || "gpt-4.1-mini";
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      instructions: [
        "Tu es l'Atelier de contenu de L'Edifice.",
        "Tu reprends uniquement la brique texte de l'ancien pipeline Lignes Interieures.",
        "Tu ne declenches aucune publication, aucun montage, aucune voix, aucun planning.",
        "Tu reponds uniquement en JSON valide.",
      ].join("\n"),
      input: buildPrompt(input),
      max_output_tokens: 7200,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI response failed with status ${response.status}.`);
  }

  const text = extractOpenAIText(await response.json() as OpenAIResponsePayload);
  return normalizeVariantList(extractJsonObject(text), input);
}

function generateFallbackVariant(input: ContentWorkshopInput, index: number) {
  const fallbackAngles = [
    input.angle ??
      "Montrer comment le calme change le rapport de force sans bruit.",
    "Raconter le moment ou l'on cesse de convaincre et ou la posture revient.",
    "Transformer une blessure discrete en clarification interieure.",
  ];
  const fallbackEmotions = [
    input.emotion ?? "Lucidite calme",
    "Fierte silencieuse",
    "Detachement doux",
  ];
  const angle = fallbackAngles[index] ?? fallbackAngles[0];
  const emotion = fallbackEmotions[index] ?? fallbackEmotions[0];
  const hooks = [
    `Le plus dur, ce n'est pas ${input.theme.toLowerCase()}. C'est ce que ca revele.`,
    "Tu ne changes pas quand tu parles plus fort. Tu changes quand tu arretes de negocier avec l'evidence.",
    "Il y a des silences qui ne fuient rien. Ils remettent simplement les choses a leur place.",
  ];
  const scripts = [
    [
      hooks[0],
      "Au debut, tu crois que c'est juste un detail.",
      "Puis tu remarques qu'il revient quand tout devient silencieux.",
      "Ce n'est pas un hasard.",
      "C'est souvent la partie de toi qui a compris avant tes mots.",
    ],
    [
      hooks[1],
      "Tu peux expliquer longtemps.",
      "Mais certaines personnes ne respectent que ce qu'elles sentent partir.",
      "Alors tu deviens plus simple.",
      "Moins disponible. Plus clair.",
    ],
    [
      hooks[2],
      "Tu ne cherches plus a prouver.",
      "Tu observes.",
      "Et dans cette distance, quelque chose se reconstruit.",
      "Pas une durete. Une dignite.",
    ],
  ];
  const script = normalizeScriptVariant(
    (scripts[index] ?? scripts[0]).join("\n"),
    hooks[index] ?? hooks[0],
    input.format,
  );
  const visualPrompts = normalizeVisualPromptScenes([], input, angle, emotion);
  const score = [
    { emotionalImpact: 8.4, clarity: 8.1, shareability: 7.8, total: 8.1 },
    { emotionalImpact: 7.9, clarity: 8.5, shareability: 8.2, total: 8.2 },
    { emotionalImpact: 8.2, clarity: 7.8, shareability: 7.7, total: 7.9 },
  ][index] ?? { emotionalImpact: 7.5, clarity: 7.5, shareability: 7.5, total: 7.5 };

  return {
    id: `variant-${index + 1}`,
    title: index === 0
      ? input.theme
      : `${input.theme} - angle ${index + 1}`,
    hook: hooks[index] ?? hooks[0],
    script,
    caption: "Certaines verites ne crient jamais, elles attendent juste ton silence.",
    hashtags: normalizeHashtags(["#psychologie", "#silence", "#stoicisme", "#lucidite", "#shorts"]),
    mainEmotion: emotion,
    mainAngle: angle,
    visualPrompts,
    visualPrompt: formatVisualPromptScenes(visualPrompts),
    voiceStyle: "Voix calme, grave, intime, rythme oral, tension contenue.",
    score,
  } satisfies ContentDraftVariant;
}

export async function generateContentDraft(input: ContentWorkshopInput) {
  const variants = await generateContentDraftVariants(input);
  return contentDraftFromVariant(input, variants[0]);
}

export async function generateContentDraftVariants(input: ContentWorkshopInput) {
  try {
    const variants = await generateWithOpenAI(input);
    if (variants) {
      return variants;
    }
  } catch {
    // The workshop must remain usable even before the LLM key is configured.
  }

  return [0, 1, 2]
    .map((index) => generateFallbackVariant(input, index))
    .sort((a, b) => b.score.total - a.score.total);
}

function validateContentDraftInsertPayload(
  payload: Record<ContentDraftInsertColumn, unknown>,
) {
  const payloadColumns = Object.keys(payload);
  const missingColumns = contentDraftInsertColumns.filter(
    (column) => !(column in payload),
  );
  const unexpectedColumns = payloadColumns.filter(
    (column) => !contentDraftInsertColumns.includes(column as ContentDraftInsertColumn),
  );
  const emptyColumns = contentDraftInsertColumns.filter((column) => {
    const value = payload[column];

    return (
      value === null ||
      value === undefined ||
      (typeof value === "string" && value.trim().length === 0) ||
      (Array.isArray(value) && value.length === 0)
    );
  });

  if (
    missingColumns.length > 0 ||
    unexpectedColumns.length > 0 ||
    emptyColumns.length > 0
  ) {
    throw new Error(
      [
        "Payload content_drafts invalide avant insertion.",
        `Colonnes attendues: ${contentDraftInsertColumns.join(", ")}.`,
        `Colonnes manquantes: ${missingColumns.length ? missingColumns.join(", ") : "aucune"}.`,
        `Colonnes inattendues: ${unexpectedColumns.length ? unexpectedColumns.join(", ") : "aucune"}.`,
        `Colonnes vides: ${emptyColumns.length ? emptyColumns.join(", ") : "aucune"}.`,
      ].join(" "),
    );
  }
}

function validateContentDraftUpdatePayload(
  payload: Record<ContentDraftUpdateColumn, unknown>,
) {
  const payloadColumns = Object.keys(payload);
  const missingColumns = contentDraftUpdateColumns.filter(
    (column) => !(column in payload),
  );
  const unexpectedColumns = payloadColumns.filter(
    (column) => !contentDraftUpdateColumns.includes(column as ContentDraftUpdateColumn),
  );
  const emptyColumns = contentDraftUpdateColumns.filter((column) => {
    const value = payload[column];

    return (
      value === null ||
      value === undefined ||
      (typeof value === "string" && value.trim().length === 0) ||
      (Array.isArray(value) && value.length === 0)
    );
  });

  if (
    missingColumns.length > 0 ||
    unexpectedColumns.length > 0 ||
    emptyColumns.length > 0
  ) {
    throw new Error(
      [
        "Payload content_drafts invalide avant mise a jour.",
        `Colonnes attendues: ${contentDraftUpdateColumns.join(", ")}.`,
        `Colonnes manquantes: ${missingColumns.length ? missingColumns.join(", ") : "aucune"}.`,
        `Colonnes inattendues: ${unexpectedColumns.length ? unexpectedColumns.join(", ") : "aucune"}.`,
        `Colonnes vides: ${emptyColumns.length ? emptyColumns.join(", ") : "aucune"}.`,
      ].join(" "),
    );
  }
}

function mapContentDraftRow(row: ContentDraftRow): SavedContentDraft {
  const theme = row.theme ?? "Brouillon sans theme";
  const angle = row.angle ?? "Angle a preciser";

  return {
    id: row.id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    project: row.project ?? "Lignes Interieures",
    platformTargets: row.platform_targets ?? [],
    theme,
    status: row.status ?? "draft",
    source: row.source ?? "content_workshop",
    userId: row.user_id,
    concept: `${theme}: ${angle}`,
    angle,
    hook: row.hook ?? "",
    script: row.script ?? "",
    scriptUltraShort: "",
    scriptShort: "",
    scriptMedium: "",
    scriptLong: "",
    recommendedScript: row.script ?? "",
    title: row.title ?? theme,
    caption: row.caption ?? "",
    hashtags: row.hashtags ?? [],
    visualPrompt: row.visual_prompt ?? "",
    voiceStyle: row.voice_style ?? "",
    score: normalizeStoredDraftScore(row.score),
  };
}

export function sanitizeContentDraftUpdateInput(input: unknown) {
  const record = input && typeof input === "object" ? input as Record<string, unknown> : {};
  const status = requireText(record.status, 80, "Le statut");

  if (!contentDraftStatuses.includes(status as typeof contentDraftStatuses[number])) {
    throw new Error(
      `Statut invalide. Statuts attendus: ${contentDraftStatuses.join(", ")}.`,
    );
  }

  const payload: Record<ContentDraftUpdateColumn, unknown> = {
    project: requireText(record.project, 120, "Le projet"),
    platform_targets: sanitizePlatformTargets(record.platformTargets ?? record.platform_targets),
    theme: requireText(record.theme, 180, "Le theme"),
    angle: requireText(record.angle, 240, "L'angle"),
    hook: requireText(record.hook, 240, "Le hook"),
    script: requireScript(record.script, 4000, "Le script"),
    title: requireText(record.title, 120, "Le titre"),
    caption: requireText(record.caption, 500, "La legende"),
    hashtags: sanitizeHashtagList(record.hashtags),
    visual_prompt: requireText(record.visualPrompt ?? record.visual_prompt, 14000, "Le prompt visuel"),
    voice_style: requireText(record.voiceStyle ?? record.voice_style, 240, "Le style voix"),
    status,
    source: requireText(record.source, 120, "La source"),
  };

  validateContentDraftUpdatePayload(payload);
  return payload;
}

export function sanitizeContentDraftStatusInput(input: unknown) {
  const record = input && typeof input === "object" ? input as Record<string, unknown> : {};
  const status = requireText(record.status, 80, "Le statut");

  if (!contentDraftStatuses.includes(status as ContentDraftStatus)) {
    throw new Error(
      `Statut invalide. Statuts attendus: ${contentDraftStatuses.join(", ")}.`,
    );
  }

  return status as ContentDraftStatus;
}

export async function readContentDrafts({
  status,
  userId,
}: {
  status?: string | null;
  userId: string;
}) {
  const supabase = getContentDraftsClient();
  const statusFilter = normalizeText(status, 80);

  console.info("[Content Workshop] read drafts");

  let query = supabase
    .from("content_drafts")
    .select(contentDraftSelectColumns)
    .eq("user_id", userId);

  if (statusFilter && statusFilter !== "all") {
    query = query.eq("status", statusFilter);
  }

  const { data, error } = await query
    .order("created_at", { ascending: false })
    .limit(100)
    .returns<ContentDraftRow[]>();

  if (error) {
    throw new Error(`Failed to read content drafts: ${error.message}`);
  }

  return (data ?? []).map(mapContentDraftRow);
}

export async function updateContentDraft({
  draftId,
  input,
  userId,
}: {
  draftId: string;
  input: Record<ContentDraftUpdateColumn, unknown>;
  userId: string;
}) {
  const supabase = getContentDraftsClient();

  console.info("[Content Workshop] update draft");

  const { data, error } = await supabase
    .from("content_drafts")
    .update(input)
    .eq("id", draftId)
    .eq("user_id", userId)
    .select(contentDraftSelectColumns)
    .single<ContentDraftRow>();

  if (error) {
    throw new Error(`Failed to update content draft: ${error.message}`);
  }

  return mapContentDraftRow(data);
}

export async function updateContentDraftStatus({
  draftId,
  status,
  userId,
}: {
  draftId: string;
  status: ContentDraftStatus;
  userId: string;
}) {
  const supabase = getContentDraftsClient();

  console.info("[Content Workshop] update draft status", {
    draftId,
    status,
  });

  const { data, error } = await supabase
    .from("content_drafts")
    .update({ status })
    .eq("id", draftId)
    .eq("user_id", userId)
    .select(contentDraftSelectColumns)
    .single<ContentDraftRow>();

  if (error) {
    throw new Error(`Failed to update content draft status: ${error.message}`);
  }

  return mapContentDraftRow(data);
}

export async function deleteContentDraft({
  draftId,
  userId,
}: {
  draftId: string;
  userId: string;
}) {
  const supabase = getContentDraftsClient();

  console.info("[Content Workshop] delete draft");

  const { error } = await supabase
    .from("content_drafts")
    .delete()
    .eq("id", draftId)
    .eq("user_id", userId);

  if (error) {
    throw new Error(`Failed to delete content draft: ${error.message}`);
  }
}

export async function saveContentDraft({
  input,
  draft,
  userId,
}: {
  input: ContentWorkshopInput;
  draft: ContentDraft;
  userId: string;
}): Promise<SavedContentDraft> {
  const supabase = getContentDraftsClient();

  console.info("[Content Workshop] save draft");

  const insertPayload: Record<ContentDraftInsertColumn, unknown> = {
    project: "Lignes Interieures",
    platform_targets: normalizePlatformTargets(input.platform),
    theme: input.theme,
    angle: draft.angle,
    hook: draft.hook,
    script: draft.script,
    title: draft.title,
    caption: draft.caption,
    hashtags: draft.hashtags,
    visual_prompt: draft.visualPrompt,
    voice_style: draft.voiceStyle,
    status: "draft",
    source: "content_workshop",
    user_id: userId,
    score: serializeDraftScore(draft.score),
  };

  validateContentDraftInsertPayload(insertPayload);

  const { data, error } = await supabase
    .from("content_drafts")
    .insert(insertPayload)
    .select(contentDraftSelectColumns)
    .single<ContentDraftRow>();

  if (error) {
    throw new Error(`Failed to save content draft: ${error.message}`);
  }

  return mapContentDraftRow(data);
}
