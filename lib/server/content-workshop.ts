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
};

export type ContentDraft = {
  concept: string;
  hook: string;
  script: string;
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

export type SavedContentDraft = ContentDraft & {
  id: string;
  createdAt: string;
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
};

const hashtagBuckets = [
  ["#psychologie", "#mindset"],
  ["#solitude", "#amour", "#silence", "#relations"],
  ["#manipulation", "#darkpsychology", "#stoicisme", "#attachement"],
  ["#respect", "#detachement", "#comportementhumain", "#lucidite"],
  ["#fyp", "#viral", "#reels", "#shorts"],
];

const visualStages = [
  "strong visual hook",
  "isolated character",
  "emotional close-up",
  "inner tension",
  "symbolic environment",
  "moment of revelation",
  "memorable final image",
];

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
  | "user_id";

type ContentDraftUpdateColumn = Exclude<ContentDraftInsertColumn, "user_id">;

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

const contentDraftSelectColumns = [
  "id",
  "created_at",
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

export function sanitizeContentWorkshopInput(
  input: unknown,
): ContentWorkshopInput {
  const record = input && typeof input === "object" ? input as Record<string, unknown> : {};
  const theme = normalizeText(record.theme, 180);

  if (!theme) {
    throw new Error("Le sujet de depart est obligatoire.");
  }

  return {
    theme,
    angle: normalizeText(record.angle, 240),
    emotion: normalizeText(record.emotion, 80),
    objective: normalizeText(record.objective, 180),
    platform: normalizeText(record.platform, 80) ?? "Multi-plateforme",
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

function buildVisualPrompt(theme: string, stage: string, angle: string) {
  return [
    `${stage} about ${theme}`,
    angle,
    "dark cinematic faceless scene",
    "precise emotional storytelling",
    "realistic human posture",
    "psychological tension",
    "moody atmosphere",
    "dramatic shadows",
    "realistic lighting",
    "vertical 9:16",
    "no text",
    "no logo",
    "no watermark",
  ].join(", ");
}

function normalizeDraft(data: Record<string, unknown>, input: ContentWorkshopInput) {
  const score = data.score && typeof data.score === "object"
    ? data.score as Record<string, unknown>
    : {};
  const hashtags = normalizeHashtags(data.hashtags);
  const angle =
    normalizeText(data.angle, 220) ??
    input.angle ??
    "Une verite emotionnelle simple, humaine et difficile a regarder.";
  const fallbackVisuals = visualStages.map((stage) =>
    buildVisualPrompt(input.theme, stage, angle),
  );

  return {
    concept:
      normalizeText(data.concept, 500) ??
      `${input.theme}: transformer une tension interieure en brouillon court.`,
    hook:
      normalizeText(data.hook, 240) ??
      "Ce que tu refuses de regarder finit toujours par parler plus fort.",
    script:
      typeof data.script === "string" && data.script.trim()
        ? data.script.trim().slice(0, 3000)
        : [
            "Tu peux faire semblant longtemps.",
            "Mais ton calme finit par raconter ce que tes mots evitent.",
            "Le vrai changement commence souvent au moment ou tu arretes de negocier avec l'evidence.",
          ].join("\n"),
    title: normalizeText(data.title, 90) ?? input.theme,
    caption:
      normalizeText(data.caption, 150) ??
      normalizeText(data.description, 150) ??
      "Certaines verites deviennent legeres quand on arrete de les fuir.",
    hashtags,
    visualPrompt:
      normalizeText(data.visualPrompt, 900) ??
      normalizeText(data.visual_prompt, 900) ??
      fallbackVisuals[0],
    angle,
    voiceStyle:
      normalizeText(data.voiceStyle, 160) ??
      normalizeText(data.voice_style, 160) ??
      "Voix calme, grave, intime, rythme lent et tension contenue.",
    score: {
      viral: clampScore(score.viral ?? score.viral_score),
      hook: clampScore(score.hook ?? score.hook_score),
      emotion: clampScore(score.emotion ?? score.emotion_score),
      retention: clampScore(score.retention ?? score.retention_score),
      clarity: clampScore(score.clarity ?? score.clarity_score),
      total: clampScore(score.total ?? score.total_score),
      reason:
        normalizeText(score.reason, 400) ??
        "Brouillon coherent pour valider le ton avant toute production.",
    },
  } satisfies ContentDraft;
}

function buildPrompt(input: ContentWorkshopInput) {
  return [
    `Sujet: ${input.theme}`,
    `Angle: ${input.angle ?? "a proposer"}`,
    `Emotion recherchee: ${input.emotion ?? "lucidite calme"}`,
    `Objectif: ${input.objective ?? "brouillon complet a valider"}`,
    `Plateforme: ${input.platform}`,
    "",
    "Genere un seul brouillon complet pour L'Edifice, en francais.",
    "Style: sombre, humain, psychologique, introspectif, socialement lucide.",
    "Contraintes reprises de l'ancien atelier local:",
    "- hook direct et comprehensible en moins de 2 secondes",
    "- script oral avec progression: observation, tension psychologique, verite emotionnelle, phrase finale memorable",
    "- titre court, humain, non abstrait",
    "- legende: 1 phrase maximum, 150 caracteres maximum",
    "- exactement 5 hashtags courts et pertinents",
    "- exactement 7 prompts visuels en anglais, sombres, narratifs, vertical 9:16, no text, no logo, no watermark",
    "- aucune publication, aucun planning, aucune generation video",
    "",
    "Reponds uniquement en JSON valide avec ces cles:",
    "{ concept, angle, hook, script, title, caption, hashtags, visualPrompt, voiceStyle, score }",
    "score contient: viral, hook, emotion, retention, clarity, total, reason.",
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
      max_output_tokens: 2200,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI response failed with status ${response.status}.`);
  }

  const text = extractOpenAIText(await response.json() as OpenAIResponsePayload);
  return normalizeDraft(extractJsonObject(text), input);
}

function generateFallbackDraft(input: ContentWorkshopInput) {
  const angle =
    input.angle ??
    "Ce qu'on evite de regarder finit par devenir le vrai point de depart.";
  const title = input.theme.length > 58 ? input.theme.slice(0, 55).trim() : input.theme;
  const hook = `Le plus dur, ce n'est pas ${input.theme.toLowerCase()}. C'est ce que ca revele.`;
  const visualPromptSeries = visualStages.map((stage) =>
    buildVisualPrompt(input.theme, stage, angle),
  );

  return {
    concept: `${input.theme}: partir d'une verite intime et la transformer en format court, clair, sans forcer la morale.`,
    hook,
    script: [
      hook,
      "Au debut, tu crois que c'est juste une pensee qui passe.",
      "Puis tu remarques qu'elle revient quand tout devient silencieux.",
      "Ce n'est pas un hasard.",
      "C'est souvent la partie de toi que tu as repoussee trop longtemps.",
      "Et le jour ou tu l'ecoutes vraiment, quelque chose cesse de te tenir a distance de toi-meme.",
    ].join("\n"),
    title,
    caption: "Certaines verites ne crient jamais, elles attendent juste ton silence.",
    hashtags: normalizeHashtags(["#psychologie", "#silence", "#stoicisme", "#lucidite", "#shorts"]),
    visualPrompt: visualPromptSeries[0],
    angle,
    voiceStyle: "Voix calme, grave, intime, rythme lent et tension contenue.",
    score: {
      viral: 7,
      hook: 7,
      emotion: 8,
      retention: 7,
      clarity: 8,
      total: 7.4,
      reason: "Fallback local: structure claire pour valider le brouillon sans appel externe.",
    },
  } satisfies ContentDraft;
}

export async function generateContentDraft(input: ContentWorkshopInput) {
  try {
    const draft = await generateWithOpenAI(input);
    if (draft) {
      return draft;
    }
  } catch {
    // The workshop must remain usable even before the LLM key is configured.
  }

  return generateFallbackDraft(input);
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
    title: row.title ?? theme,
    caption: row.caption ?? "",
    hashtags: row.hashtags ?? [],
    visualPrompt: row.visual_prompt ?? "",
    voiceStyle: row.voice_style ?? "",
    score: {
      viral: 0,
      hook: 0,
      emotion: 0,
      retention: 0,
      clarity: 0,
      total: 0,
      reason: "Score non stocke dans le schema actuel content_drafts.",
    },
  };
}

export function sanitizeContentDraftUpdateInput(input: unknown) {
  const record = input && typeof input === "object" ? input as Record<string, unknown> : {};
  const payload: Record<ContentDraftUpdateColumn, unknown> = {
    project: requireText(record.project, 120, "Le projet"),
    platform_targets: sanitizePlatformTargets(record.platformTargets ?? record.platform_targets),
    theme: requireText(record.theme, 180, "Le theme"),
    angle: requireText(record.angle, 240, "L'angle"),
    hook: requireText(record.hook, 240, "Le hook"),
    script: requireText(record.script, 4000, "Le script"),
    title: requireText(record.title, 120, "Le titre"),
    caption: requireText(record.caption, 500, "La legende"),
    hashtags: sanitizeHashtagList(record.hashtags),
    visual_prompt: requireText(record.visualPrompt ?? record.visual_prompt, 1400, "Le prompt visuel"),
    voice_style: requireText(record.voiceStyle ?? record.voice_style, 240, "Le style voix"),
    status: requireText(record.status, 80, "Le statut"),
    source: requireText(record.source, 120, "La source"),
  };

  validateContentDraftUpdatePayload(payload);
  return payload;
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
  };

  validateContentDraftInsertPayload(insertPayload);

  const { data, error } = await supabase
    .from("content_drafts")
    .insert(insertPayload)
    .select("id, created_at")
    .single<{ id: string; created_at: string }>();

  if (error) {
    throw new Error(`Failed to save content draft: ${error.message}`);
  }

  return {
    ...draft,
    id: data.id,
    createdAt: data.created_at,
    project: String(insertPayload.project),
    platformTargets: insertPayload.platform_targets as string[],
    theme: String(insertPayload.theme),
    status: String(insertPayload.status),
    source: String(insertPayload.source),
    userId,
  };
}
