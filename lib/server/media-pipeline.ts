import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { parseVisualPrompts } from "@/lib/content/visual-prompts";
import { buildVisualMetadata, saveVisualMetadata } from "@/lib/server/content-assets";

type MediaPipelineStatus =
  | "draft"
  | "validated"
  | "media_preparing"
  | "media_ready"
  | "visual_ready"
  | "ready_to_publish";

type VisualDecisionMode = "reuse_existing" | "generate_new";
type AssetSource = "library" | "generated";
type GenerationSource = "library" | "generated" | "regenerated" | "upload";
type GenerationQuality = "low" | "medium" | "high";
type VisualSelectionDecision = "selected" | "proposed" | "rejected" | "generated";
type GenerationStatus =
  | "pending"
  | "searching_library"
  | "selected_from_library"
  | "scoring"
  | "generating"
  | "uploading"
  | "ready"
  | "error"
  | "retained"
  | "rejected";
type ScoreSource = "heuristic" | "gpt_vision" | "none";

const PENDING_SCENE_TIMEOUT_MS = 5_000;
const LIBRARY_SEARCH_TIMEOUT_MS = 5_000;
const SCORING_TIMEOUT_MS = 20_000;
const IMAGE_GENERATION_TIMEOUT_MS = 30_000;
const UPLOAD_TIMEOUT_MS = 30_000;
const VISION_SCORING_TIMEOUT_MS = SCORING_TIMEOUT_MS;
const VISUAL_SELECTION_THRESHOLD = 70;
export const VISUAL_LIBRARY_BUCKET = "content-assets";
export const VISUAL_LIBRARY_PATH = "lignes-interieures/visuels";

type DraftRow = {
  id: string;
  user_id: string;
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
  protected: boolean | null;
  protected_at: string | null;
  visual_status: string | null;
  visuals_validated_at: string | null;
};

type MediaPipelineErrorContext = {
  draftId?: string;
  draftStatus?: string | null;
  contentAssetsCount?: number;
  mediaPipelineStatus?: MediaPipelineStatus;
  sceneIndex?: number;
  timeoutMs?: number;
  visualDecisionMode?: VisualDecisionMode;
  validation?: string;
};

export class MediaPipelineError extends Error {
  context: MediaPipelineErrorContext;

  constructor(message: string, context: MediaPipelineErrorContext = {}) {
    super(message);
    this.name = "MediaPipelineError";
    this.context = context;
  }
}

type ContentAssetRow = {
  id: string;
  asset_type: "image" | "audio" | "video" | "subtitle";
  file_name: string;
  bucket_name: string;
  storage_path: string;
  public_url: string;
  source: string;
  status: string;
  metadata: Record<string, unknown>;
  usage_count: number;
  linked_draft_id: string | null;
  created_at: string;
};

type MediaPlanRow = {
  id: string;
  draft_id: string;
  action: string;
  media_pipeline_status: MediaPipelineStatus;
  visual_decision_mode: VisualDecisionMode | null;
  visual_decision: VisualDecision;
  missing_visual_needs: string[] | null;
  assets_found: number | null;
  assets_selected: number | null;
  generation_requested: boolean | null;
  generation_reason: string | null;
  last_run_at: string | null;
  created_at: string;
  updated_at: string;
};

type AssetLinkRow = {
  id: string;
  draft_id: string;
  asset_id: string | null;
  asset_source: AssetSource;
  score: number | null;
  position: number | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

type VisualSceneRow = {
  id: string;
  draft_id: string;
  asset_id: string | null;
  visual_prompt_index: number;
  visual_prompt_text: string;
  generation_source: string;
  generation_quality: GenerationQuality | null;
  generation_status: string;
  image_url: string | null;
  storage_path: string | null;
  score_total: number | null;
  score_breakdown: Record<string, unknown>;
  score_source: ScoreSource;
  error_message: string | null;
  locked: boolean | null;
  retained_at: string | null;
  retained_by: string | null;
  created_at: string;
  updated_at: string;
};

export type VisualAsset = {
  id: string;
  assetType: ContentAssetRow["asset_type"];
  fileName: string;
  bucketName: string;
  storagePath: string;
  publicUrl: string;
  source: string;
  status: string;
  metadata: Record<string, unknown>;
  usageCount: number;
  linkedDraftId: string | null;
  createdAt: string;
  score: number;
  scoreReason: string;
  scoreBreakdown: VisualScoreBreakdown;
};

export type SelectedDraftAsset = VisualAsset & {
  linkId: string;
  assetSource: AssetSource;
  usageOrder: number;
};

export type VisualDecision = {
  mode: VisualDecisionMode;
  reason: string;
  confidence: number;
  matched_assets: Array<{
    asset_id: string;
    file_name: string;
    score: number;
    reason: string;
    score_breakdown?: VisualScoreBreakdown;
  }>;
  missing_visual_needs: string[];
};

export type VisualScoreBreakdown = {
  total: number;
  promptImage: number;
  imageDraft: number;
  visualQuality: number;
  narrativeContinuity: number;
  editorialSafety: number;
  estimatedWithoutVision: boolean;
  reason: string;
  matchedTerms: string[];
  sceneIndex: number | null;
};

export type VisualGenerationInput = {
  script: string | null;
  subject: string | null;
  angle: string | null;
  emotion: string | null;
  visualPrompts: string[];
};

export type MediaPipelineState = {
  mediaPipelineStatus: MediaPipelineStatus;
  visualDecision: VisualDecision | null;
  selectedAssets: SelectedDraftAsset[];
  suggestedAssets: VisualAsset[];
  assetsFound: number;
  assetsSelected: number;
  generationRequested: boolean;
  generationReason: string | null;
  lastRunAt: string | null;
  visualScenes: VisualScene[];
};

export type VisualScene = {
  id: string;
  draftId: string;
  assetId: string | null;
  visualPromptIndex: number;
  visualPromptText: string;
  generationSource: GenerationSource;
  generationQuality: GenerationQuality;
  generationStatus: GenerationStatus;
  imageUrl: string | null;
  storagePath: string | null;
  scoreTotal: number | null;
  scoreBreakdown: Record<string, unknown>;
  scoreSource: ScoreSource;
  errorMessage: string | null;
  locked: boolean;
  retainedAt: string | null;
  retainedBy: string | null;
  createdAt: string;
  updatedAt: string;
};

let mediaPipelineClient: SupabaseClient | null = null;

function getMediaPipelineClient() {
  if (mediaPipelineClient) {
    return mediaPipelineClient;
  }

  const supabaseUrl =
    process.env.SUPABASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Media pipeline requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
    );
  }

  mediaPipelineClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return mediaPipelineClient;
}

function isMissingTableError(error: unknown) {
  if (!error || typeof error !== "object") {
    return false;
  }

  const record = error as Record<string, unknown>;
  const message = String(record.message ?? "");
  const code = String(record.code ?? "");

  return (
    code === "42P01" ||
    code === "PGRST205" ||
    message.includes("Could not find the table") ||
    message.includes("relation") && message.includes("does not exist")
  );
}

function missingMediaTablesError(tableName: string, draftId?: string) {
  return new MediaPipelineError(
    `Table media manquante: ${tableName}. Applique la migration Supabase 20260603110000_create_content_draft_media_pipeline.sql.`,
    {
      draftId,
      validation: `${tableName}.missing`,
    },
  );
}

function tokenize(value: string) {
  const stopWords = new Set([
    "avec",
    "dans",
    "des",
    "elle",
    "est",
    "les",
    "pour",
    "que",
    "qui",
    "the",
    "une",
    "vous",
  ]);

  return [
    ...new Set(
      value
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "")
        .toLowerCase()
        .split(/[^a-z0-9#]+/u)
        .map((token) => token.trim())
        .filter((token) => token.length >= 3)
        .filter((token) => !/^\d+$/.test(token))
        .filter((token) => !stopWords.has(token)),
    ),
  ];
}

function assetKeywords(asset: ContentAssetRow) {
  const metadataKeywords = Array.isArray(asset.metadata.keywords)
    ? asset.metadata.keywords.filter((item): item is string => typeof item === "string")
    : [];
  const metadataText = [
    asset.metadata.prompt,
    asset.metadata.visual_prompt,
    asset.metadata.source_prompt,
    asset.metadata.generation_prompt,
    asset.metadata.scene_prompt,
    asset.metadata.mood,
    asset.metadata.subject,
    asset.metadata.style,
  ]
    .filter((item): item is string => typeof item === "string")
    .join(" ");

  return tokenize(
    [
      asset.file_name,
      asset.storage_path,
      asset.source,
      metadataKeywords.join(" "),
      metadataText,
    ].join(" "),
  );
}

function draftSearchText(draft: DraftRow) {
  return [
    draft.title,
    draft.theme,
    draft.angle,
    draft.hook,
    draft.caption,
    draft.hashtags?.join(" "),
    draft.voice_style,
    draft.script,
    draft.visual_prompt,
  ]
    .filter(Boolean)
    .join(" ");
}

function metadataString(asset: ContentAssetRow, keys: string[]) {
  for (const key of keys) {
    const value = asset.metadata[key];

    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return "";
}

function metadataNumber(asset: ContentAssetRow, keys: string[]) {
  for (const key of keys) {
    const value = asset.metadata[key];
    const number = typeof value === "number" ? value : Number(value);

    if (Number.isFinite(number)) {
      return number;
    }
  }

  return null;
}

function numericScore(value: number, max: number) {
  return Math.max(0, Math.min(max, Math.round(value)));
}

function visualPromptsForDraft(draft: DraftRow) {
  return parseVisualPrompts(draft.visual_prompt ?? "").filter(Boolean);
}

function scenePromptForAsset(
  draft: DraftRow,
  asset: ContentAssetRow,
  sceneIndex?: number | null,
) {
  const prompts = visualPromptsForDraft(draft);
  const metadataSceneIndex = metadataNumber(asset, ["scene_index", "sceneIndex"]);
  const normalizedSceneIndex =
    typeof sceneIndex === "number"
      ? sceneIndex
      : metadataSceneIndex
        ? metadataSceneIndex - 1
        : null;

  if (
    normalizedSceneIndex !== null &&
    prompts[normalizedSceneIndex]
  ) {
    return {
      prompt: prompts[normalizedSceneIndex],
      sceneIndex: normalizedSceneIndex,
    };
  }

  const assetTokens = assetKeywords(asset);
  const scoredPrompts = prompts.map((prompt, index) => {
    const promptTokens = tokenize(prompt);
    const matches = promptTokens.filter((token) => assetTokens.includes(token));
    return { index, matches, prompt };
  });
  const best = scoredPrompts.sort(
    (left, right) => right.matches.length - left.matches.length,
  )[0];

  return {
    prompt: best?.prompt ?? "",
    sceneIndex: best && best.matches.length > 0 ? best.index : null,
  };
}

function scoreAsset(
  draft: DraftRow,
  asset: ContentAssetRow,
  sceneIndex?: number | null,
) {
  const draftTokens = tokenize(draftSearchText(draft));
  const keywords = assetKeywords(asset);
  const draftMatches = keywords.filter((keyword) => draftTokens.includes(keyword));
  const scene = scenePromptForAsset(draft, asset, sceneIndex);
  const promptTokens = tokenize(scene.prompt);
  const promptMatches = keywords.filter((keyword) => promptTokens.includes(keyword));
  const declaredPrompt = metadataString(asset, [
    "prompt",
    "visual_prompt",
    "source_prompt",
    "generation_prompt",
    "scene_prompt",
  ]);
  const declaredSubject = metadataString(asset, ["subject", "theme"]);
  const declaredMood = metadataString(asset, ["mood", "emotion", "tone"]);
  const declaredStyle = metadataString(asset, ["style", "visual_style"]);
  const promptImage = numericScore(
    promptMatches.length * 5 +
      (declaredPrompt ? 6 : 0) +
      (scene.prompt ? 4 : 0),
    30,
  );
  const imageDraft = numericScore(
    draftMatches.length * 4 +
      (declaredSubject && draftSearchText(draft).toLowerCase().includes(declaredSubject.toLowerCase()) ? 5 : 0) +
      (declaredMood && draftSearchText(draft).toLowerCase().includes(declaredMood.toLowerCase()) ? 4 : 0),
    25,
  );
  const qualityHints = [
    asset.storage_path.includes("9x16") || asset.storage_path.includes("vertical"),
    asset.file_name.includes("9x16") || asset.file_name.includes("vertical"),
    metadataString(asset, ["aspect_ratio", "ratio"]).includes("9:16"),
    metadataString(asset, ["quality", "resolution"]).length > 0,
  ].filter(Boolean).length;
  const visualQuality = numericScore(
    8 +
      qualityHints * 3 +
      (asset.status === "available" ? 3 : 0) +
      (asset.public_url ? 3 : 0),
    20,
  );
  const continuityHints = [
    scene.sceneIndex !== null,
    declaredSubject.length > 0,
    declaredMood.length > 0,
    declaredStyle.length > 0,
  ].filter(Boolean).length;
  const narrativeContinuity = numericScore(
    5 + continuityHints * 2.5,
    15,
  );
  const unsafeTerms = ["logo", "watermark", "texte", "text", "caption"];
  const hasUnsafeHint = unsafeTerms.some((term) =>
    [...keywords, asset.storage_path.toLowerCase(), asset.file_name.toLowerCase()].some(
      (value) => value.includes(term),
    ),
  );
  const editorialSafety = numericScore(
    5 +
      (asset.storage_path.includes("lignes-interieures") ? 3 : 0) +
      (declaredStyle.toLowerCase().includes("edifice") ||
      declaredStyle.toLowerCase().includes("lignes") ? 2 : 0) -
      (hasUnsafeHint ? 4 : 0),
    10,
  );
const score =
    promptImage +
    imageDraft +
    visualQuality +
    narrativeContinuity +
    editorialSafety;
  const matches = Array.from(new Set([...promptMatches, ...draftMatches]));
  const reason =
    matches.length > 0
      ? `Estime sans analyse visuelle IA. Correspondances: ${matches.slice(0, 6).join(", ")}.`
      : "Estime sans analyse visuelle IA. Coherence visuelle a valider manuellement.";
  const scoreBreakdown: VisualScoreBreakdown = {
    total: score,
    promptImage,
    imageDraft,
    visualQuality,
    narrativeContinuity,
    editorialSafety,
    estimatedWithoutVision: true,
    reason,
    matchedTerms: matches.slice(0, 12),
    sceneIndex: scene.sceneIndex,
  };

  return { score, reason, scoreBreakdown };
}

function openAIKey() {
  return process.env.OPENAI_API_KEY?.trim() ?? "";
}

function visualLibraryStoragePath(fileName: string) {
  return `${VISUAL_LIBRARY_PATH}/${fileName}`;
}

function readableVisualSlug(input: string) {
  const fallback = "calme_interieur";
  const stopWords = new Set([
    "a",
    "an",
    "and",
    "avec",
    "dans",
    "de",
    "des",
    "du",
    "for",
    "in",
    "la",
    "le",
    "les",
    "of",
    "on",
    "pour",
    "the",
    "to",
    "un",
    "une",
    "with",
  ]);
  const normalized = input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s_-]/g, " ");
  const concepts: Array<[RegExp, string]> = [
    [/\b(man|male|person|protagonist|homme)\b/, "homme"],
    [/\b(woman|female|femme)\b/, "femme"],
    [/\b(colleague|coworker|collegue)\b/, "collegue"],
    [/\b(calm|quiet|peaceful|calme)\b/, "calme"],
    [/\b(angry|anger|colere|rage)\b/, "colere"],
    [/\b(tension|stress|conflict|conflit)\b/, "tension"],
    [/\b(reflection|thinking|thoughtful|introspection|reflexion)\b/, "reflexion"],
    [/\b(determined|determination|resolve|determination)\b/, "determination"],
    [/\b(discussion|conversation|meeting|dialogue)\b/, "discussion"],
    [/\b(office|workplace|bureau)\b/, "bureau"],
    [/\b(rooftop|roof|terrace|toit)\b/, "toit"],
    [/\b(city|urban|street|ville)\b/, "ville"],
    [/\b(skyline|horizon)\b/, "skyline"],
    [/\b(sunset|dusk|evening|twilight|soir)\b/, "soir"],
    [/\b(night|nuit)\b/, "nuit"],
    [/\b(window|fenetre)\b/, "fenetre"],
    [/\b(silhouette|shadow)\b/, "silhouette"],
    [/\b(interior|inside|room|interieur)\b/, "interieur"],
  ];
  const conceptWords = concepts
    .filter(([pattern]) => pattern.test(normalized))
    .map(([, word]) => word);
  const rawWords = normalized
    .split(/[\s_-]+/)
    .map((word) => word.trim())
    .filter((word) => {
      if (word.length < 3 || stopWords.has(word)) {
        return false;
      }

      return ![
        "cinematic",
        "frame",
        "hook",
        "image",
        "photo",
        "photorealistic",
        "prompt",
        "scene",
        "short",
        "shorts",
        "vertical",
        "visual",
        "visuel",
      ].includes(word);
    });
  const words = [...conceptWords, ...rawWords].filter(
    (word, index, list) => list.indexOf(word) === index,
  ).slice(0, 4);

  return (words.length ? words : fallback.split("_")).join("_");
}

async function uniqueVisualFileName(baseSlug: string) {
  const supabase = getMediaPipelineClient();
  const cleanSlug = readableVisualSlug(baseSlug);
  const { data, error } = await supabase
    .from("content_assets")
    .select("storage_path")
    .eq("bucket_name", VISUAL_LIBRARY_BUCKET)
    .like("storage_path", `${VISUAL_LIBRARY_PATH}/${cleanSlug}%`);

  if (error) {
    throw new MediaPipelineError(`Verification du nom de visuel impossible: ${error.message}`, {
      validation: "content_assets.visual_name_unique",
    });
  }

  const existing = new Set((data ?? []).map((row) => row.storage_path));
  const firstName = `${cleanSlug}.png`;

  if (!existing.has(visualLibraryStoragePath(firstName))) {
    return firstName;
  }

  for (let index = 1; index < 100; index += 1) {
    const candidate = `${cleanSlug}_${String(index).padStart(2, "0")}.png`;

    if (!existing.has(visualLibraryStoragePath(candidate))) {
      return candidate;
    }
  }

  throw new MediaPipelineError("Impossible de trouver un nom disponible pour ce visuel.", {
    validation: "content_assets.visual_name_exhausted",
  });
}

function inferVisualMetadata({
  draft,
  generationQuality,
  prompt,
  sceneIndex,
}: {
  draft: DraftRow;
  generationQuality: GenerationQuality;
  prompt: string;
  sceneIndex: number;
}) {
  const scenePrompt = prompt.match(/Scene\s+\d+\s*:\s*(.+)$/im)?.[1] ?? prompt;
  const title = readableVisualSlug(scenePrompt).replace(/_/g, " ");
  const promptText = prompt.trim();
  const combined = [
    scenePrompt,
    draft.title,
    draft.theme,
    draft.angle,
    draft.voice_style,
  ]
    .filter((item): item is string => typeof item === "string")
    .join(" ")
    .toLowerCase();
  const has = (pattern: RegExp) => pattern.test(combined);
  const sceneType = has(/\b(toit|rooftop|skyline|ville|city|street)\b/)
    ? "exterieur urbain"
    : has(/\b(bureau|office|meeting|workplace)\b/)
      ? "bureau"
      : has(/\b(fenetre|interieur|inside|room)\b/)
        ? "interieur"
        : "scene narrative";
  const characterType = has(/\b(femme|woman|female)\b/)
    ? "femme"
    : has(/\b(collegue|coworker|colleague)\b/)
      ? "collegue"
      : has(/\b(homme|man|male|protagonist|personnage)\b/)
        ? "homme"
        : "personnage";
  const emotion = has(/\b(colere|angry|anger|rage)\b/)
    ? "colere"
    : has(/\b(tension|stress|conflict|conflit)\b/)
      ? "tension"
      : has(/\b(reflexion|thinking|thoughtful|introspection)\b/)
        ? "reflexion"
        : has(/\b(calme|calm|peaceful|silence)\b/)
          ? "calme"
          : draft.voice_style ?? "";
  const ambiance = has(/\b(nuit|night)\b/)
    ? "nuit"
    : has(/\b(soir|sunset|dusk|evening|twilight)\b/)
      ? "soir"
      : has(/\b(sombre|dark|shadow)\b/)
        ? "sombre"
        : "cinematographique";
  const colorPalette = [
    has(/\b(nuit|night|dark|sombre)\b/) ? "bleu nuit" : null,
    has(/\b(soir|sunset|dusk|orange|warm)\b/) ? "chaud" : null,
    has(/\b(bureau|office|interieur|inside)\b/) ? "neutre" : null,
  ].filter((item): item is string => Boolean(item));

  return buildVisualMetadata({
    title,
    description: `Scene ${sceneIndex}/7 - ${scenePrompt.trim().slice(0, 180)}`,
    prompt: promptText,
    tags: [],
    theme: draft.theme ?? draft.title ?? "",
    emotion,
    ambiance,
    visual_style: "cinematique vertical 9:16",
    scene_type: sceneType,
    character_type: characterType,
    color_palette: colorPalette,
    generation_quality: generationQuality,
    source_draft_id: draft.id,
    source_scene_number: sceneIndex,
  });
}

function imageGenerationModel() {
  return process.env.OPENAI_IMAGE_MODEL?.trim() || "gpt-image-1";
}

function visionScoringModel() {
  return process.env.OPENAI_VISION_MODEL?.trim() ||
    process.env.OPENAI_MODEL?.trim() ||
    "gpt-4.1-mini";
}

function normalizeGenerationQuality(value: unknown): GenerationQuality {
  return value === "low" || value === "high" || value === "medium"
    ? value
    : "medium";
}

function buildImageGenerationPrompt({
  draft,
  prompt,
  sceneIndex,
}: {
  draft: DraftRow;
  prompt: string;
  sceneIndex: number;
}) {
  return [
    "Vertical 9:16 photorealistic cinematic frame for a short video.",
    "No text, no subtitles, no logo, no watermark.",
    `Draft title: ${draft.title ?? draft.theme ?? "Shorts"}.`,
    `Narrative angle: ${draft.angle ?? "intimate cinematic story"}.`,
    `Scene ${sceneIndex}: ${prompt}`,
  ].join("\n");
}

function normalizeGenerationSource(value: unknown): GenerationSource {
  return value === "generated" ||
    value === "regenerated" ||
    value === "upload" ||
    value === "library"
    ? value
    : "library";
}

function normalizeGenerationStatus(value: unknown): GenerationStatus {
  if (
    value === "pending" ||
    value === "searching_library" ||
    value === "selected_from_library" ||
    value === "scoring" ||
    value === "generating" ||
    value === "uploading" ||
    value === "ready" ||
    value === "error" ||
    value === "retained" ||
    value === "rejected"
  ) {
    return value;
  }

  if (value === "selected") {
    return "selected_from_library";
  }

  if (value === "generated") {
    return "ready";
  }

  if (value === "failed") {
    return "error";
  }

  return "pending";
}

async function withTimeout<T>({
  draftId,
  label,
  promise,
  sceneIndex,
  timeoutMs,
  validation,
}: {
  draftId: string;
  label: string;
  promise: Promise<T>;
  sceneIndex: number;
  timeoutMs: number;
  validation: string;
}) {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(
        new MediaPipelineError(`${label} a depasse le delai autorise.`, {
          draftId,
          sceneIndex,
          timeoutMs,
          validation,
        }),
      );
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

function logVisualPipeline({
  action,
  assetId,
  draftId,
  durationMs,
  endpoint,
  error,
  imageUrl,
  model,
  sceneIndex,
  step,
  success,
}: {
  action:
    | "library_search"
    | "vision_score"
    | "image_generation"
    | "upload"
    | "visual_selection";
  assetId?: string | null;
  draftId: string;
  durationMs: number;
  endpoint: string;
  error?: unknown;
  imageUrl?: string | null;
  model: string;
  sceneIndex: number;
  step?: string;
  success: boolean;
}) {
  const payload = {
    action,
    asset_id: assetId ?? null,
    draft_id: draftId,
    duration_ms: durationMs,
    endpoint,
    error: error instanceof Error ? error.message : error ? String(error) : null,
    image_url: imageUrl ?? null,
    model,
    scene_index: sceneIndex,
    step: step ?? action,
    success,
  };

  if (success) {
    console.info("[Shorts Visual Pipeline]", payload);
  } else {
    console.warn("[Shorts Visual Pipeline]", payload);
  }
}

async function extractImageBytes(payload: unknown, draftId: string, sceneIndex: number) {
  const record = payload && typeof payload === "object"
    ? payload as Record<string, unknown>
    : {};
  const data = Array.isArray(record.data) ? record.data : [];

  for (const item of data) {
    const image = item && typeof item === "object"
      ? item as Record<string, unknown>
      : {};

    if (typeof image.b64_json === "string" && image.b64_json) {
      return Buffer.from(image.b64_json, "base64");
    }

    if (typeof image.url === "string" && image.url) {
      const response = await withTimeout({
        draftId,
        label: "Telechargement de l'image OpenAI",
        promise: fetch(image.url),
        sceneIndex,
        timeoutMs: UPLOAD_TIMEOUT_MS,
        validation: "openai.image_url.fetch_timeout",
      });

      if (!response.ok) {
        throw new MediaPipelineError("Image OpenAI distante inaccessible.", {
          draftId,
          validation: "openai.image_url.fetch",
        });
      }

      return Buffer.from(
        await withTimeout({
          draftId,
          label: "Telechargement de l'image OpenAI",
          promise: response.arrayBuffer(),
          sceneIndex,
          timeoutMs: UPLOAD_TIMEOUT_MS,
          validation: "openai.image_url.download_timeout",
        }),
      );
    }
  }

  throw new MediaPipelineError("OpenAI n'a pas renvoye d'image exploitable.", {
    draftId,
    sceneIndex,
    validation: "openai.image.empty",
  });
}

function logVisualSceneStatusTransition({
  draftId,
  elapsedMs,
  newStatus,
  previousStatus,
  sceneIndex,
  startedAt,
  timeoutReason,
}: {
  draftId: string;
  elapsedMs: number;
  newStatus: GenerationStatus;
  previousStatus: GenerationStatus;
  sceneIndex: number;
  startedAt: string | null;
  timeoutReason: string;
}) {
  console.info("[Shorts Visual Scene Status]", {
    current_step: newStatus,
    draft_id: draftId,
    elapsed_time: elapsedMs,
    new_status: newStatus,
    previous_status: previousStatus,
    scene_index: sceneIndex,
    started_at: startedAt,
    timeout_reason: timeoutReason,
  });
}

function logVisualSceneStep({
  assetId,
  draftId,
  error,
  sceneIndex,
  step,
}: {
  assetId?: string | null;
  draftId: string;
  error?: unknown;
  sceneIndex: number;
  step:
    | "asset_found"
    | "asset_not_found"
    | "fallback_generation"
    | "generation_completed"
    | "search_completed"
    | "search_started";
}) {
  console.info("[Shorts Visual Pipeline Step]", {
    asset_id: assetId ?? null,
    draft_id: draftId,
    error: error instanceof Error ? error.message : error ? String(error) : null,
    scene_index: sceneIndex,
    step,
  });
}

async function generateOpenAIImage({
  draft,
  prompt,
  quality,
  sceneIndex,
}: {
  draft: DraftRow;
  prompt: string;
  quality: GenerationQuality;
  sceneIndex: number;
}) {
  const apiKey = openAIKey();
  const endpoint = "https://api.openai.com/v1/images/generations";
  const model = imageGenerationModel();
  const startedAt = Date.now();
  const generationPrompt = buildImageGenerationPrompt({ draft, prompt, sceneIndex });

  if (!apiKey) {
    throw new MediaPipelineError(
      "OPENAI_API_KEY est requis pour generer les visuels Shorts.",
      {
        draftId: draft.id,
        validation: "openai.api_key.missing",
      },
    );
  }

  try {
    const response = await withTimeout({
      draftId: draft.id,
      label: "Generation IA",
      promise: fetch(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          prompt: generationPrompt,
          size: "1024x1536",
          quality,
          n: 1,
        }),
      }),
      sceneIndex,
      timeoutMs: IMAGE_GENERATION_TIMEOUT_MS,
      validation: "openai.image_generation_timeout",
    });

    if (!response.ok) {
      const text = await response.text();
      throw new MediaPipelineError(
        `Generation OpenAI impossible: ${text.slice(0, 300)}`,
        {
          draftId: draft.id,
          sceneIndex,
          validation: "openai.image_generation",
        },
      );
    }

    const bytes = await extractImageBytes(await response.json(), draft.id, sceneIndex);
    logVisualPipeline({
      action: "image_generation",
      draftId: draft.id,
      durationMs: Date.now() - startedAt,
      endpoint,
      model,
      sceneIndex,
      step: "image_generation",
      success: true,
    });

    return bytes;
  } catch (error) {
    logVisualPipeline({
      action: "image_generation",
      draftId: draft.id,
      durationMs: Date.now() - startedAt,
      endpoint,
      error,
      model,
      sceneIndex,
      step: "image_generation",
      success: false,
    });
    throw error;
  }
}

async function storeGeneratedImage({
  bytes,
  draft,
  generationSource,
  generationQuality,
  prompt,
  sceneIndex,
}: {
  bytes: Buffer;
  draft: DraftRow;
  generationSource: GenerationSource;
  generationQuality: GenerationQuality;
  prompt: string;
  sceneIndex: number;
}) {
  const supabase = getMediaPipelineClient();
  const fileName = await uniqueVisualFileName(
    `${prompt} ${draft.title ?? draft.theme ?? ""}`,
  );
  const storagePath = visualLibraryStoragePath(fileName);
  const endpoint = "supabase.storage.content-assets";
  const startedAt = Date.now();
  const visualMetadata = inferVisualMetadata({
    draft,
    generationQuality,
    prompt: buildImageGenerationPrompt({ draft, prompt, sceneIndex }),
    sceneIndex,
  });

  try {
    const { error: uploadError } = await withTimeout({
      draftId: draft.id,
      label: "Upload Supabase",
      promise: supabase.storage
        .from(VISUAL_LIBRARY_BUCKET)
        .upload(storagePath, bytes, {
          contentType: "image/png",
          upsert: false,
        }),
      sceneIndex,
      timeoutMs: UPLOAD_TIMEOUT_MS,
      validation: "supabase.storage.upload_timeout",
    });

    if (uploadError) {
      throw new MediaPipelineError(
        `Upload du visuel genere impossible: ${uploadError.message}`,
        {
          draftId: draft.id,
          sceneIndex,
          validation: "supabase.storage.upload",
        },
      );
    }

    const { data: publicUrlData } = supabase.storage
      .from(VISUAL_LIBRARY_BUCKET)
      .getPublicUrl(storagePath);

    const publicUrl = publicUrlData.publicUrl;
    const { data, error } = await supabase
      .from("content_assets")
      .insert({
        asset_type: "image",
        file_name: fileName,
        bucket_name: VISUAL_LIBRARY_BUCKET,
        storage_path: storagePath,
        public_url: publicUrl,
        source: "shorts_visual_generation",
        status: "available",
        linked_draft_id: draft.id,
        metadata: {
          ...visualMetadata,
          visual_prompt: prompt,
          scene_prompt: prompt,
          scene_index: sceneIndex,
          generation_source: generationSource,
          generation_quality: generationQuality,
          generated_by: "openai",
          image_model: imageGenerationModel(),
          aspect_ratio: "9:16",
        },
      })
      .select(
        "id, asset_type, file_name, bucket_name, storage_path, public_url, source, status, metadata, usage_count, linked_draft_id, created_at",
      )
      .single<ContentAssetRow>();

    if (error) {
      throw new MediaPipelineError(`Trace du visuel genere impossible: ${error.message}`, {
        draftId: draft.id,
        sceneIndex,
        validation: "content_assets.generated_insert",
      });
    }

    await saveVisualMetadata({
      ...visualMetadata,
      assetId: data.id,
    });

    logVisualPipeline({
      action: "upload",
      draftId: draft.id,
      durationMs: Date.now() - startedAt,
      endpoint,
      assetId: data.id,
      imageUrl: publicUrl,
      model: "supabase",
      sceneIndex,
      step: "upload",
      success: true,
    });

    return data;
  } catch (error) {
    logVisualPipeline({
      action: "upload",
      draftId: draft.id,
      durationMs: Date.now() - startedAt,
      endpoint,
      error,
      model: "supabase",
      sceneIndex,
      step: "upload",
      success: false,
    });
    throw error;
  }
}

function normalizeVisionScore(value: unknown, max: number) {
  const number = Number(value);
  return Number.isFinite(number)
    ? Math.max(0, Math.min(max, Math.round(number)))
    : 0;
}

function parseVisionJson(text: string) {
  const cleaned = text
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : cleaned) as Record<string, unknown>;

  return {
    color_score: normalizeVisionScore(parsed.color_score, 15),
    composition_score: normalizeVisionScore(parsed.composition_score, 15),
    explanation:
      typeof parsed.explanation === "string" ? parsed.explanation.slice(0, 700) : "",
    location_score: normalizeVisionScore(parsed.location_score, 25),
    mood_score: normalizeVisionScore(parsed.mood_score, 20),
    subject_score: normalizeVisionScore(parsed.subject_score, 25),
    total_score: normalizeVisionScore(parsed.total_score ?? parsed.total, 100),
    total: normalizeVisionScore(parsed.total ?? parsed.total_score, 100),
    prompt_image: normalizeVisionScore(parsed.prompt_image ?? parsed.subject_score, 30),
    image_draft: normalizeVisionScore(parsed.image_draft ?? parsed.location_score, 25),
    quality: normalizeVisionScore(parsed.quality ?? parsed.mood_score, 20),
    continuity: normalizeVisionScore(parsed.continuity ?? parsed.composition_score, 15),
    safety_style: normalizeVisionScore(parsed.safety_style ?? parsed.color_score, 10),
    decision:
      parsed.decision === "retain" ||
      parsed.decision === "review" ||
      parsed.decision === "reject"
        ? parsed.decision
        : "review",
    reason: typeof parsed.reason === "string" ? parsed.reason.slice(0, 500) : "",
    warnings: Array.isArray(parsed.warnings)
      ? parsed.warnings.filter((item): item is string => typeof item === "string")
      : [],
  };
}

async function scoreImageWithVision({
  draft,
  imageUrl,
  prompt,
  sceneIndex,
}: {
  draft: DraftRow;
  imageUrl: string;
  prompt: string;
  sceneIndex: number;
}) {
  const apiKey = openAIKey();
  const endpoint = "https://api.openai.com/v1/chat/completions";
  const model = visionScoringModel();
  const startedAt = Date.now();

  if (!apiKey) {
    throw new MediaPipelineError(
      "OPENAI_API_KEY est requis pour analyser les visuels avec Vision.",
      {
        draftId: draft.id,
        validation: "openai.api_key.missing",
      },
    );
  }

  try {
    const response = await withTimeout({
      draftId: draft.id,
      label: "Analyse Vision",
      promise: fetch(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: [
                    "Analyse cette image pour un Short L'Edifice.",
                    "Compare strictement l'image au prompt, au script, et a la position narrative.",
                    "Si le lieu demande par le prompt est absent ou contradictoire, baisse fortement location_score et total_score.",
                    "Retourne uniquement ce JSON strict:",
                    '{"subject_score":number,"location_score":number,"mood_score":number,"composition_score":number,"color_score":number,"total_score":number,"explanation":"courte explication"}',
                    "Baremes: subject_score /25, location_score /25, mood_score /20, composition_score /15, color_score /15, total_score /100.",
                    "Exemple: prompt toit/ville/coucher de soleil + image interieur sombre => location_score faible et total_score sous 70.",
                    `Scene: ${sceneIndex}/7`,
                    `Prompt scene: ${prompt}`,
                    `Titre: ${draft.title ?? ""}`,
                    `Angle: ${draft.angle ?? ""}`,
                    `Script: ${(draft.script ?? "").slice(0, 2500)}`,
                  ].join("\n"),
                },
                {
                  type: "image_url",
                  image_url: { url: imageUrl },
                },
              ],
            },
          ],
          max_completion_tokens: 500,
        }),
      }),
      sceneIndex,
      timeoutMs: VISION_SCORING_TIMEOUT_MS,
      validation: "openai.vision_scoring_timeout",
    });

    if (!response.ok) {
      const text = await response.text();
      throw new MediaPipelineError(
        `Analyse Vision impossible: ${text.slice(0, 300)}`,
        {
          draftId: draft.id,
          sceneIndex,
          validation: "openai.vision_scoring",
        },
      );
    }

    const payload = await response.json() as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = payload.choices?.[0]?.message?.content;

    if (!content) {
      throw new MediaPipelineError("Analyse Vision sans reponse exploitable.", {
        draftId: draft.id,
        sceneIndex,
        validation: "openai.vision_empty",
      });
    }

    const score = parseVisionJson(content);
    logVisualPipeline({
      action: "vision_score",
      draftId: draft.id,
      durationMs: Date.now() - startedAt,
      endpoint,
      model,
      sceneIndex,
      step: "vision_score",
      success: true,
    });

    return score;
  } catch (error) {
    logVisualPipeline({
      action: "vision_score",
      draftId: draft.id,
      durationMs: Date.now() - startedAt,
      endpoint,
      error,
      model,
      sceneIndex,
      step: "vision_score",
      success: false,
    });
    throw error;
  }
}

function visionScoreToBreakdown(score: ReturnType<typeof parseVisionJson>) {
  return {
    total: score.total_score || score.total,
    total_score: score.total_score || score.total,
    subject_score: score.subject_score,
    location_score: score.location_score,
    mood_score: score.mood_score,
    composition_score: score.composition_score,
    color_score: score.color_score,
    promptImage: score.prompt_image,
    imageDraft: score.image_draft,
    visualQuality: score.quality,
    narrativeContinuity: score.continuity,
    editorialSafety: score.safety_style,
    estimatedWithoutVision: false,
    reason: score.explanation || score.reason,
    explanation: score.explanation || score.reason,
    matchedTerms: [],
    sceneIndex: null,
    decision: score.decision,
    warnings: score.warnings,
  };
}

async function updateGeneratedAssetScore({
  assetId,
  scoreBreakdown,
  scoreSource,
}: {
  assetId: string;
  scoreBreakdown: Record<string, unknown>;
  scoreSource: ScoreSource;
}) {
  await saveVisualMetadata({
    assetId,
    gpt_vision_score:
      scoreSource === "gpt_vision"
        ? Number(scoreBreakdown.total_score ?? scoreBreakdown.total ?? 0)
        : null,
    scoreBreakdown,
    scoreSource,
  });
}

function isCanonicalVisualAsset(asset: Pick<ContentAssetRow, "bucket_name" | "storage_path">) {
  return (
    asset.bucket_name === VISUAL_LIBRARY_BUCKET &&
    asset.storage_path.startsWith(`${VISUAL_LIBRARY_PATH}/`)
  );
}

function libraryVisionDecision(scoreBreakdown: Record<string, unknown>): VisualSelectionDecision {
  const total = Number(scoreBreakdown.total_score ?? scoreBreakdown.total ?? 0);
  const location = Number(scoreBreakdown.location_score ?? 0);

  if (!Number.isFinite(total) || total < VISUAL_SELECTION_THRESHOLD || location < 18) {
    return "rejected";
  }

  return total >= 80 ? "selected" : "proposed";
}

function visualSelectionReason(
  decision: VisualSelectionDecision,
  scoreBreakdown: Record<string, unknown>,
) {
  const total = Number(scoreBreakdown.total_score ?? scoreBreakdown.total ?? 0);
  const explanation =
    typeof scoreBreakdown.explanation === "string"
      ? scoreBreakdown.explanation
      : typeof scoreBreakdown.reason === "string"
        ? scoreBreakdown.reason
        : "";

  if (decision === "selected") {
    return `Bibliotheque validee ${Math.round(total)}/100. ${explanation}`.trim();
  }

  if (decision === "proposed") {
    return `Bibliotheque acceptable / ameliorable ${Math.round(total)}/100. ${explanation}`.trim();
  }

  if (decision === "generated") {
    return `Image generee validee ${Math.round(total)}/100. ${explanation}`.trim();
  }

  return `Bibliotheque rejetee ${Math.round(total)}/100. ${explanation}`.trim();
}

function scoreOutOf100(value: unknown) {
  const score = Number(value);

  return Number.isFinite(score) ? Math.max(0, Math.min(100, Math.round(score))) : 0;
}

function logVisualSelection({
  assetId,
  decision,
  draftId,
  reason,
  sceneIndex,
  score,
}: {
  assetId: string | null;
  decision: VisualSelectionDecision;
  draftId: string;
  reason: string;
  sceneIndex: number;
  score: number;
}) {
  logVisualPipeline({
    action: "visual_selection",
    assetId,
    draftId,
    durationMs: 0,
    endpoint: "content_assets.library",
    error: decision === "rejected" ? reason : undefined,
    model: "gpt_vision",
    sceneIndex,
    step: decision,
    success: decision !== "rejected",
  });
  console.info("[Shorts Visual Selection]", {
    asset_id: assetId,
    decision,
    draft_id: draftId,
    reason,
    scene_index: sceneIndex,
    score,
  });
}

function visualSceneSelectionDebug({
  assetsFound,
  assetsSelected,
  bestCandidateScore,
  fallbackTriggered,
  generationRequested,
  generationStartedAt = null,
  generationSource,
  generationStatus,
  selectionDecision,
}: {
  assetsFound: number;
  assetsSelected: number;
  bestCandidateScore: number;
  fallbackTriggered: boolean;
  generationRequested: boolean;
  generationStartedAt?: string | null;
  generationSource: GenerationSource;
  generationStatus: GenerationStatus;
  selectionDecision: string;
}) {
  return {
    assetsFound,
    assetsSelected,
    bestCandidateScore,
    fallbackTriggered,
    generationRequested,
    generationStartedAt,
    generationSource,
    generationStatus,
    selectionDecision,
    selectionThreshold: VISUAL_SELECTION_THRESHOLD,
  };
}

async function fallbackLibraryScene({
  draft,
  generationQuality,
  sceneIndex,
}: {
  draft: DraftRow;
  generationQuality: GenerationQuality;
  sceneIndex: number;
}) {
  const startedAt = Date.now();
  const prompt = parseVisualPrompts(draft.visual_prompt ?? "")[sceneIndex - 1] ?? "";
  logVisualSceneStep({
    draftId: draft.id,
    sceneIndex,
    step: "search_started",
  });
  await upsertVisualScene({
    draft,
    generationQuality,
    generationSource: "library",
    generationStatus: "searching_library",
    scoreSource: "none",
    visualPromptIndex: sceneIndex,
  });

  let suggestions: VisualAsset[] = [];

  try {
    suggestions = await withTimeout({
      draftId: draft.id,
      label: "Recherche bibliotheque",
      promise: scoreLibraryForDraft(draft),
      sceneIndex,
      timeoutMs: LIBRARY_SEARCH_TIMEOUT_MS,
      validation: "content_assets.library_search_timeout",
    });
    logVisualSceneStep({
      draftId: draft.id,
      sceneIndex,
      step: "search_completed",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await upsertVisualScene({
      draft,
      errorMessage: `Bibliotheque trop lente, generation IA. ${message}`,
      generationQuality,
      generationSource: "library",
      generationStatus: "generating",
      scoreSource: "none",
      visualPromptIndex: sceneIndex,
    });
    logVisualSceneStatusTransition({
      draftId: draft.id,
      elapsedMs: Date.now() - startedAt,
      newStatus: "generating",
      previousStatus: "searching_library",
      sceneIndex,
      startedAt: new Date(startedAt).toISOString(),
      timeoutReason: "library_search_timeout",
    });
    logVisualPipeline({
      action: "library_search",
      draftId: draft.id,
      durationMs: Date.now() - startedAt,
      endpoint: "content_assets.library",
      error,
      model: "heuristic",
      sceneIndex,
      step: "library_search",
      success: false,
    });
    logVisualSceneStep({
      draftId: draft.id,
      error,
      sceneIndex,
      step: "fallback_generation",
    });
    return false;
  }

  const candidates = suggestions
    .filter((item) =>
      item.scoreBreakdown.sceneIndex === sceneIndex - 1 ||
      item.score >= 35,
    )
    .slice(0, 5);
  let bestCandidateScore = candidates.length
    ? Math.max(...candidates.map((asset) => scoreOutOf100(asset.score)))
    : 0;

  for (const asset of candidates) {
    let scoreBreakdown: Record<string, unknown>;
    let scoreSource: ScoreSource = "gpt_vision";
    let scoreTotal = asset.score;

    try {
      const visionScore = await scoreImageWithVision({
        draft,
        imageUrl: asset.publicUrl,
        prompt,
        sceneIndex,
      });
      scoreBreakdown = {
        ...visionScoreToBreakdown(visionScore),
        selection_source: "library",
      };
      scoreTotal = visionScore.total_score || visionScore.total;
    } catch (error) {
      scoreSource = "heuristic";
      scoreBreakdown = {
        ...asset.scoreBreakdown,
        selection_source: "library",
        selection_warning: error instanceof Error ? error.message : String(error),
      };
      scoreTotal = asset.score;
    }
    bestCandidateScore = Math.max(bestCandidateScore, scoreOutOf100(scoreTotal));

    await updateGeneratedAssetScore({
      assetId: asset.id,
      scoreBreakdown,
      scoreSource,
    });

    const decision = libraryVisionDecision(scoreBreakdown);
    const reason = visualSelectionReason(decision, scoreBreakdown);

    logVisualSelection({
      assetId: asset.id,
      decision,
      draftId: draft.id,
      reason,
      sceneIndex,
      score: scoreTotal,
    });

    if (decision === "selected" || decision === "proposed") {
      logVisualSceneStep({
        assetId: asset.id,
        draftId: draft.id,
        sceneIndex,
        step: "asset_found",
      });
      await upsertVisualScene({
        assetId: asset.id,
        draft,
        errorMessage: null,
        generationQuality,
        generationSource: "library",
        generationStatus: "ready",
        imageUrl: asset.publicUrl,
        scoreBreakdown: {
          ...scoreBreakdown,
          ...visualSceneSelectionDebug({
            assetsFound: suggestions.length,
            assetsSelected: 1,
            bestCandidateScore: scoreOutOf100(scoreTotal),
            fallbackTriggered: false,
            generationRequested: false,
            generationSource: "library",
            generationStatus: "ready",
            selectionDecision: decision,
          }),
          selection_decision: decision,
          selection_reason: reason,
        },
        scoreSource: "gpt_vision",
        scoreTotal,
        storagePath: asset.storagePath,
        visualPromptIndex: sceneIndex,
      });
      logVisualPipeline({
        action: "library_search",
        draftId: draft.id,
        durationMs: Date.now() - startedAt,
        endpoint: "content_assets.library",
        assetId: asset.id,
        imageUrl: asset.publicUrl,
        model: "gpt_vision",
        sceneIndex,
        step: decision,
        success: true,
      });

      return true;
    }
  }

  logVisualSceneStep({
    draftId: draft.id,
    sceneIndex,
    step: "asset_not_found",
  });
  await upsertVisualScene({
    draft,
    errorMessage:
      suggestions.length > 0
        ? `Aucun visuel pertinent trouve dans la bibliotheque. Meilleur score trouve : ${bestCandidateScore}/100. Seuil requis : ${VISUAL_SELECTION_THRESHOLD}/100. Generation IA lancee automatiquement.`
        : "Aucun visuel disponible dans la bibliotheque. Generation IA lancee automatiquement.",
    generationQuality,
    generationSource: "generated",
    generationStatus: "generating",
    scoreBreakdown: visualSceneSelectionDebug({
      assetsFound: suggestions.length,
      assetsSelected: 0,
      bestCandidateScore,
      fallbackTriggered: true,
      generationRequested: true,
      generationStartedAt: new Date().toISOString(),
      generationSource: "generated",
      generationStatus: "generating",
      selectionDecision: suggestions.length > 0 ? "asset_not_relevant" : "library_empty",
    }),
    scoreSource: "none",
    visualPromptIndex: sceneIndex,
  });
  logVisualPipeline({
    action: "library_search",
    draftId: draft.id,
    durationMs: Date.now() - startedAt,
    endpoint: "content_assets.library",
    error: "Aucun candidat bibliotheque n'atteint 70/100 avec lieu coherent.",
    model: "gpt_vision",
    sceneIndex,
    step: "rejected",
    success: false,
  });
  logVisualSceneStep({
    draftId: draft.id,
    sceneIndex,
    step: "fallback_generation",
  });

  return false;
}

async function generateSceneVisual({
  draft,
  generationQuality,
  generationSource,
  sceneIndex,
  skipLibrary = false,
}: {
  draft: DraftRow;
  generationQuality: GenerationQuality;
  generationSource: GenerationSource;
  sceneIndex: number;
  skipLibrary?: boolean;
}) {
  const prompt = parseVisualPrompts(draft.visual_prompt ?? "")[sceneIndex - 1] ?? "";

  const librarySelected = skipLibrary
    ? false
    : await fallbackLibraryScene({
        draft,
        generationQuality,
        sceneIndex,
      });

  if (librarySelected) {
    return;
  }

  const currentSceneAfterLibrary = (await readVisualScenes(draft)).find(
    (scene) => scene.visualPromptIndex === sceneIndex,
  );
  await upsertVisualScene({
    draft,
    errorMessage:
      currentSceneAfterLibrary?.errorMessage ??
      "Generation IA necessaire: aucun visuel bibliotheque pertinent.",
    generationQuality,
    generationSource: "generated",
    generationStatus: "generating",
    scoreBreakdown:
      Object.keys(currentSceneAfterLibrary?.scoreBreakdown ?? {}).length > 0
        ? currentSceneAfterLibrary?.scoreBreakdown ?? {}
        : visualSceneSelectionDebug({
            assetsFound: 0,
            assetsSelected: 0,
            bestCandidateScore: 0,
            fallbackTriggered: true,
            generationRequested: true,
            generationStartedAt: new Date().toISOString(),
            generationSource: "generated",
            generationStatus: "generating",
            selectionDecision: "fallback_generation",
          }),
    scoreSource: "none",
    visualPromptIndex: sceneIndex,
  });

  try {
    const bytes = await generateOpenAIImage({
      draft,
      prompt,
      quality: generationQuality,
      sceneIndex,
    });
    await upsertVisualScene({
      draft,
      generationQuality,
      generationSource,
      generationStatus: "uploading",
      scoreSource: "none",
      visualPromptIndex: sceneIndex,
    });
    const asset = await storeGeneratedImage({
      bytes,
      draft,
      generationSource,
      generationQuality,
      prompt,
      sceneIndex,
    });
    await upsertVisualScene({
      assetId: asset.id,
      draft,
      generationQuality,
      generationSource,
      generationStatus: "scoring",
      imageUrl: asset.public_url,
      scoreSource: "none",
      storagePath: asset.storage_path,
      visualPromptIndex: sceneIndex,
    });
    let scoreSource: ScoreSource = "heuristic";
    let scoreBreakdown: Record<string, unknown>;
    let scoreTotal: number;

    try {
      const visionScore = await scoreImageWithVision({
        draft,
        imageUrl: asset.public_url,
        prompt,
        sceneIndex,
      });
      scoreBreakdown = visionScoreToBreakdown(visionScore);
      scoreTotal = visionScore.total_score || visionScore.total;
      scoreSource = "gpt_vision";
    } catch (error) {
      const scored = scoreAsset(draft, asset, sceneIndex - 1);
      scoreBreakdown = scored.scoreBreakdown;
      scoreTotal = scored.score;
      scoreSource = "heuristic";
      console.warn("[Media Pipeline] Vision scoring fallback", {
        draftId: draft.id,
        sceneIndex,
        error: error instanceof Error ? error.message : String(error),
      });
    }

    await updateGeneratedAssetScore({
      assetId: asset.id,
      scoreBreakdown: {
        ...scoreBreakdown,
        ...visualSceneSelectionDebug({
          assetsFound: Number(currentSceneAfterLibrary?.scoreBreakdown.assetsFound ?? 0),
          assetsSelected: 1,
          bestCandidateScore: Number(currentSceneAfterLibrary?.scoreBreakdown.bestCandidateScore ?? 0),
          fallbackTriggered: true,
          generationRequested: true,
          generationStartedAt:
            typeof currentSceneAfterLibrary?.scoreBreakdown.generationStartedAt === "string"
              ? currentSceneAfterLibrary.scoreBreakdown.generationStartedAt
              : null,
          generationSource: "generated",
          generationStatus: "ready",
          selectionDecision: "generated",
        }),
        selection_decision: "generated",
        selection_reason: visualSelectionReason("generated", scoreBreakdown),
      },
      scoreSource,
    });
    await upsertVisualScene({
      assetId: asset.id,
      draft,
      generationQuality,
      generationSource,
      generationStatus: "ready",
      imageUrl: asset.public_url,
      scoreBreakdown: {
        ...scoreBreakdown,
        ...visualSceneSelectionDebug({
          assetsFound: Number(currentSceneAfterLibrary?.scoreBreakdown.assetsFound ?? 0),
          assetsSelected: 1,
          bestCandidateScore: Number(currentSceneAfterLibrary?.scoreBreakdown.bestCandidateScore ?? 0),
          fallbackTriggered: true,
          generationRequested: true,
          generationStartedAt:
            typeof currentSceneAfterLibrary?.scoreBreakdown.generationStartedAt === "string"
              ? currentSceneAfterLibrary.scoreBreakdown.generationStartedAt
              : null,
          generationSource: "generated",
          generationStatus: "ready",
          selectionDecision: "generated",
        }),
        selection_decision: "generated",
        selection_reason: visualSelectionReason("generated", scoreBreakdown),
      },
      scoreSource,
      scoreTotal,
      storagePath: asset.storage_path,
      visualPromptIndex: sceneIndex,
    });
    logVisualSceneStep({
      assetId: asset.id,
      draftId: draft.id,
      sceneIndex,
      step: "generation_completed",
    });
    logVisualSelection({
      assetId: asset.id,
      decision: "generated",
      draftId: draft.id,
      reason: visualSelectionReason("generated", scoreBreakdown),
      sceneIndex,
      score: scoreTotal,
    });
  } catch (error) {
    await upsertVisualScene({
      draft,
      errorMessage: error instanceof Error ? error.message : String(error),
      generationQuality,
      generationSource: "generated",
      generationStatus: "error",
      scoreSource: "none",
      visualPromptIndex: sceneIndex,
    });
  }
}

function shouldRetryVisualScene(scene: VisualScene) {
  return !scene.locked && (
    scene.generationStatus === "pending" ||
    scene.generationStatus === "error" ||
    isStuckVisualScene(scene)
  );
}

function visualSceneStatusTimeoutMs(status: GenerationStatus) {
  if (status === "pending") {
    return PENDING_SCENE_TIMEOUT_MS;
  }

  if (status === "searching_library") {
    return LIBRARY_SEARCH_TIMEOUT_MS;
  }

  if (status === "scoring") {
    return SCORING_TIMEOUT_MS;
  }

  if (status === "generating") {
    return IMAGE_GENERATION_TIMEOUT_MS;
  }

  if (status === "uploading") {
    return UPLOAD_TIMEOUT_MS;
  }

  return null;
}

function visualSceneElapsedMs(scene: VisualScene) {
  const updatedAt = new Date(scene.updatedAt).getTime();

  return Number.isFinite(updatedAt) ? Date.now() - updatedAt : 0;
}

function isStuckVisualScene(scene: VisualScene) {
  if (scene.locked) {
    return false;
  }

  const timeout = visualSceneStatusTimeoutMs(scene.generationStatus);

  return timeout !== null && visualSceneElapsedMs(scene) > timeout;
}

async function processDraftVisualScenes({
  draft,
  generationQuality,
  generationSource,
  onlyBlocked = false,
}: {
  draft: DraftRow;
  generationQuality: GenerationQuality;
  generationSource: GenerationSource;
  onlyBlocked?: boolean;
}) {
  const prompts = parseVisualPrompts(draft.visual_prompt ?? "");
  const currentScenes = await readVisualScenes(draft);
  const targetScenes = currentScenes.filter((scene) =>
    onlyBlocked ? shouldRetryVisualScene(scene) : !scene.locked,
  );

  for (const scene of targetScenes) {
    const prompt = prompts[scene.visualPromptIndex - 1]?.trim() ?? "";

    if (prompt) {
      await upsertVisualScene({
        draft,
        errorMessage: null,
        generationQuality,
        generationSource: "library",
        generationStatus: "searching_library",
        scoreSource: "none",
        visualPromptIndex: scene.visualPromptIndex,
      });
      logVisualSceneStatusTransition({
        draftId: draft.id,
        elapsedMs: 0,
        newStatus: "searching_library",
        previousStatus: scene.generationStatus,
        sceneIndex: scene.visualPromptIndex,
        startedAt: scene.updatedAt,
        timeoutReason: onlyBlocked ? "retry_blocked_scene" : "prepare_visuals_start",
      });
    }
  }

  for (const scene of targetScenes) {
    const prompt = prompts[scene.visualPromptIndex - 1]?.trim() ?? "";

    if (!prompt) {
      await upsertVisualScene({
        draft,
        errorMessage: "Prompt visuel manquant pour cette scene.",
        generationQuality,
        generationSource,
        generationStatus: "error",
        scoreSource: "none",
        visualPromptIndex: scene.visualPromptIndex,
      });
      continue;
    }

    await generateSceneVisual({
      draft,
      generationQuality,
      generationSource,
      sceneIndex: scene.visualPromptIndex,
    });
  }
}

async function markDraftVisualScenesSearching({
  draft,
  generationQuality,
}: {
  draft: DraftRow;
  generationQuality: GenerationQuality;
}) {
  const prompts = parseVisualPrompts(draft.visual_prompt ?? "");
  const currentScenes = await readVisualScenes(draft);

  for (const scene of currentScenes.filter((item) => !item.locked)) {
    const prompt = prompts[scene.visualPromptIndex - 1]?.trim() ?? "";

    if (!prompt) {
      continue;
    }

    await upsertVisualScene({
      draft,
      errorMessage: null,
      generationQuality,
      generationSource: "library",
      generationStatus: "searching_library",
      scoreSource: "none",
      visualPromptIndex: scene.visualPromptIndex,
    });
    logVisualSceneStatusTransition({
      draftId: draft.id,
      elapsedMs: visualSceneElapsedMs(scene),
      newStatus: "searching_library",
      previousStatus: scene.generationStatus,
      sceneIndex: scene.visualPromptIndex,
      startedAt: scene.updatedAt,
      timeoutReason: "prepare_visuals_started",
    });
  }
}

function fallbackScoreBreakdown(
  score: number,
  scoreReason: string,
): VisualScoreBreakdown {
  return {
    total: score,
    promptImage: 0,
    imageDraft: 0,
    visualQuality: 0,
    narrativeContinuity: 0,
    editorialSafety: 0,
    estimatedWithoutVision: true,
    reason: scoreReason || "Score historique sans detail.",
    matchedTerms: [],
    sceneIndex: null,
  };
}

function mapAsset(
  asset: ContentAssetRow,
  score = 0,
  scoreReason = "",
  scoreBreakdown: VisualScoreBreakdown = fallbackScoreBreakdown(score, scoreReason),
): VisualAsset {
  return {
    id: asset.id,
    assetType: asset.asset_type,
    fileName: asset.file_name,
    bucketName: asset.bucket_name,
    storagePath: asset.storage_path,
    publicUrl: asset.public_url,
    source: asset.source,
    status: asset.status,
    metadata: asset.metadata,
    usageCount: asset.usage_count,
    linkedDraftId: asset.linked_draft_id,
    createdAt: asset.created_at,
    score,
    scoreReason,
    scoreBreakdown,
  };
}

function mapVisualScene(row: VisualSceneRow): VisualScene {
  return {
    id: row.id,
    draftId: row.draft_id,
    assetId: row.asset_id,
    visualPromptIndex: row.visual_prompt_index,
    visualPromptText: row.visual_prompt_text,
    generationSource: normalizeGenerationSource(row.generation_source),
    generationQuality: normalizeGenerationQuality(row.generation_quality),
    generationStatus: normalizeGenerationStatus(row.generation_status),
    imageUrl: row.image_url,
    storagePath: row.storage_path,
    scoreTotal: row.score_total,
    scoreBreakdown: row.score_breakdown ?? {},
    scoreSource: row.score_source,
    errorMessage: row.error_message,
    locked: Boolean(row.locked),
    retainedAt: row.retained_at,
    retainedBy: row.retained_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function defaultVisualScenes(draft: DraftRow): VisualScene[] {
  const prompts = parseVisualPrompts(draft.visual_prompt ?? "");
  const now = new Date().toISOString();

  return Array.from({ length: 7 }, (_, index) => ({
    id: `scene-${index + 1}`,
    draftId: draft.id,
    assetId: null,
    visualPromptIndex: index + 1,
    visualPromptText: prompts[index] ?? "",
    generationSource: "library" as GenerationSource,
    generationQuality: "medium" as GenerationQuality,
    generationStatus: "pending" as GenerationStatus,
    imageUrl: null,
    storagePath: null,
    scoreTotal: null,
    scoreBreakdown: {},
    scoreSource: "none" as ScoreSource,
    errorMessage: null,
    locked: false,
    retainedAt: null,
    retainedBy: null,
    createdAt: now,
    updatedAt: now,
  }));
}

function defaultVisualDecision(): VisualDecision {
  return {
    mode: "generate_new",
    reason: "Aucune decision visuelle n'a encore ete preparee.",
    confidence: 0,
    matched_assets: [],
    missing_visual_needs: [],
  };
}

function isDraftValidatedForMedia(status: string | null) {
  return (
    status === "approved" ||
    status === "validated" ||
    status === "visual_ready" ||
    status === "visuels_prets" ||
    status === "ready_to_publish"
  );
}

function isDraftProtectedForVisuals(draft: DraftRow) {
  return Boolean(
    draft.protected ||
      draft.status === "visual_ready" ||
      draft.status === "visuels_prets" ||
      draft.visual_status === "visual_ready",
  );
}

function assertDraftVisualsCanChange(draft: DraftRow, draftId: string) {
  if (isDraftProtectedForVisuals(draft)) {
    throw new MediaPipelineError("Ce brouillon est protege car ses visuels sont prets.", {
      draftId,
      draftStatus: draft.status,
      validation: "draft.protected",
    });
  }
}

async function readDraft(draftId: string, userId: string) {
  const supabase = getMediaPipelineClient();
  const { data, error } = await supabase
    .from("content_drafts")
    .select(
      "id, user_id, theme, angle, hook, script, title, caption, hashtags, visual_prompt, voice_style, status, protected, protected_at, visual_status, visuals_validated_at",
    )
    .eq("id", draftId)
    .eq("user_id", userId)
    .maybeSingle<DraftRow>();

  if (error) {
    throw new MediaPipelineError(
      `Lecture du brouillon impossible: ${error.message}`,
      {
        draftId,
        validation: "content_drafts.select",
      },
    );
  }

  if (!data) {
    throw new MediaPipelineError("Brouillon introuvable ou non autorise.", {
      draftId,
      validation: "content_drafts.missing",
    });
  }

  return data;
}

async function readLibraryAssets() {
  const supabase = getMediaPipelineClient();
  const { data, error } = await supabase
    .from("content_assets")
    .select(
      "id, asset_type, file_name, bucket_name, storage_path, public_url, source, status, metadata, usage_count, linked_draft_id, created_at",
    )
    .eq("asset_type", "image")
    .eq("bucket_name", VISUAL_LIBRARY_BUCKET)
    .eq("status", "available")
    .order("usage_count", { ascending: true })
    .order("created_at", { ascending: false })
    .limit(240)
    .returns<ContentAssetRow[]>();

  if (error) {
    throw new MediaPipelineError(
      `Lecture de la bibliotheque visuelle impossible: ${error.message}`,
      {
        validation: "content_assets.select",
      },
    );
  }

  return (data ?? [])
    .filter((asset) => isCanonicalVisualAsset(asset))
    .slice(0, 120);
}

async function scoreLibraryForDraft(draft: DraftRow) {
  const assets = await readLibraryAssets();

  return assets
    .map((asset) => {
      const { score, reason, scoreBreakdown } = scoreAsset(draft, asset);
      return mapAsset(asset, score, reason, scoreBreakdown);
    })
    .sort((a, b) => b.score - a.score || a.usageCount - b.usageCount)
    .slice(0, 12);
}

async function readPlan(draftId: string) {
  const supabase = getMediaPipelineClient();
  const { data, error } = await supabase
    .from("content_draft_media_plans")
    .select("id, draft_id, action, media_pipeline_status, visual_decision_mode, visual_decision, missing_visual_needs, assets_found, assets_selected, generation_requested, generation_reason, last_run_at, created_at, updated_at")
    .eq("draft_id", draftId)
    .maybeSingle<MediaPlanRow>();

  if (error) {
    if (isMissingTableError(error)) {
      throw missingMediaTablesError("content_draft_media_plans", draftId);
    }

    throw new MediaPipelineError(
      `Lecture du plan media impossible: ${error.message}`,
      {
        draftId,
        validation: "content_draft_media_plans.select",
      },
    );
  }

  return data;
}

async function readSelectedAssets(draft: DraftRow) {
  const supabase = getMediaPipelineClient();
  const draftId = draft.id;
  const { data: links, error } = await supabase
    .from("content_draft_asset_links")
    .select("id, draft_id, asset_id, asset_source, score, position, metadata, created_at")
    .eq("draft_id", draft.id)
    .order("position", { ascending: true })
    .returns<AssetLinkRow[]>();

  if (error) {
    if (isMissingTableError(error)) {
      throw missingMediaTablesError("content_draft_asset_links", draftId);
    }

    throw new MediaPipelineError(
      `Lecture des visuels selectionnes impossible: ${error.message}`,
      {
        draftId,
        validation: "content_draft_asset_links.select",
      },
    );
  }

  const assetIds = (links ?? [])
    .map((link) => link.asset_id)
    .filter((assetId): assetId is string => Boolean(assetId));

  if (assetIds.length === 0) {
    return [];
  }

  const { data: assets, error: assetError } = await supabase
    .from("content_assets")
    .select(
      "id, asset_type, file_name, bucket_name, storage_path, public_url, source, status, metadata, usage_count, linked_draft_id, created_at",
    )
    .in("id", assetIds)
    .returns<ContentAssetRow[]>();

  if (assetError) {
    throw new MediaPipelineError(
      `Lecture des assets selectionnes impossible: ${assetError.message}`,
      {
        draftId,
        validation: "content_assets.selected_assets",
      },
    );
  }

  const assetById = new Map((assets ?? []).map((asset) => [asset.id, asset]));

  return (links ?? [])
    .map((link) => {
      const asset = link.asset_id ? assetById.get(link.asset_id) : null;
      if (!asset) {
        return null;
      }
      const { score, reason, scoreBreakdown } = scoreAsset(
        draft,
        asset,
        (link.position ?? 1) - 1,
      );

      return {
        ...mapAsset(asset, score, reason, scoreBreakdown),
        linkId: link.id,
        assetSource: link.asset_source,
        usageOrder: link.position ?? 1,
      };
    })
    .filter((asset): asset is SelectedDraftAsset => Boolean(asset));
}

async function readVisualScenes(draft: DraftRow) {
  const supabase = getMediaPipelineClient();
  const { data, error } = await supabase
    .from("content_draft_visual_scenes")
    .select(
      "id, draft_id, asset_id, visual_prompt_index, visual_prompt_text, generation_source, generation_quality, generation_status, image_url, storage_path, score_total, score_breakdown, score_source, error_message, locked, retained_at, retained_by, created_at, updated_at",
    )
    .eq("draft_id", draft.id)
    .order("visual_prompt_index", { ascending: true })
    .returns<VisualSceneRow[]>();

  if (error) {
    if (isMissingTableError(error)) {
      return defaultVisualScenes(draft);
    }

    throw new MediaPipelineError(
      `Lecture des scenes visuelles impossible: ${error.message}`,
      {
        draftId: draft.id,
        validation: "content_draft_visual_scenes.select",
      },
    );
  }

  const rows = data ?? [];
  const assetIds = rows
    .map((scene) => scene.asset_id)
    .filter((assetId): assetId is string => Boolean(assetId));
  const assetById = new Map<string, ContentAssetRow>();

  if (assetIds.length > 0) {
    const { data: assets } = await supabase
      .from("content_assets")
      .select(
        "id, asset_type, file_name, bucket_name, storage_path, public_url, source, status, metadata, usage_count, linked_draft_id, created_at",
      )
      .in("id", assetIds)
      .returns<ContentAssetRow[]>();
    (assets ?? []).forEach((asset) => assetById.set(asset.id, asset));
  }

  const normalizedRows: VisualSceneRow[] = [];

  for (const scene of rows) {
    const asset = scene.asset_id ? assetById.get(scene.asset_id) : null;
    const normalizedScene = asset
      ? {
          ...scene,
          image_url: asset.public_url,
          storage_path: asset.storage_path,
        }
      : scene;

    if (
      asset &&
      (scene.image_url !== asset.public_url || scene.storage_path !== asset.storage_path)
    ) {
      await supabase
        .from("content_draft_visual_scenes")
        .update({
          image_url: asset.public_url,
          storage_path: asset.storage_path,
        })
        .eq("id", scene.id);
    }

    normalizedRows.push(normalizedScene);
  }

  const byIndex = new Map(
    normalizedRows.map((scene) => [
      scene.visual_prompt_index,
      mapVisualScene(scene),
    ]),
  );

  return defaultVisualScenes(draft).map(
    (scene) => byIndex.get(scene.visualPromptIndex) ?? scene,
  );
}

async function upsertVisualScene({
  assetId = null,
  draft,
  errorMessage = null,
  generationQuality = "medium",
  generationSource,
  generationStatus,
  imageUrl = null,
  locked = false,
  retainedAt = null,
  retainedBy = null,
  scoreBreakdown = {},
  scoreSource = "none",
  scoreTotal = null,
  storagePath = null,
  visualPromptIndex,
}: {
  assetId?: string | null;
  draft: DraftRow;
  errorMessage?: string | null;
  generationQuality?: GenerationQuality;
  generationSource: GenerationSource;
  generationStatus: GenerationStatus;
  imageUrl?: string | null;
  locked?: boolean;
  retainedAt?: string | null;
  retainedBy?: string | null;
  scoreBreakdown?: Record<string, unknown>;
  scoreSource?: ScoreSource;
  scoreTotal?: number | null;
  storagePath?: string | null;
  visualPromptIndex: number;
}) {
  const supabase = getMediaPipelineClient();
  const prompts = parseVisualPrompts(draft.visual_prompt ?? "");
  const { error } = await supabase
    .from("content_draft_visual_scenes")
    .upsert(
      {
        draft_id: draft.id,
        asset_id: assetId,
        visual_prompt_index: visualPromptIndex,
        visual_prompt_text: prompts[visualPromptIndex - 1] ?? "",
        generation_source: generationSource,
        generation_quality: generationQuality,
        generation_status: generationStatus,
        image_url: imageUrl,
        locked,
        retained_at: retainedAt,
        retained_by: retainedBy,
        storage_path: storagePath,
        score_total: scoreTotal,
        score_breakdown: scoreBreakdown,
        score_source: scoreSource,
        error_message: errorMessage,
      },
      { onConflict: "draft_id,visual_prompt_index" },
    );

  if (error) {
    if (isMissingTableError(error)) {
      throw missingMediaTablesError("content_draft_visual_scenes", draft.id);
    }

    throw new MediaPipelineError(
      `Sauvegarde de la scene visuelle impossible: ${error.message}`,
      {
        draftId: draft.id,
        validation: "content_draft_visual_scenes.upsert",
      },
    );
  }
}

async function savePlan({
  draftId,
  mediaPipelineStatus,
  visualDecision,
  assetsFound = visualDecision.matched_assets.length,
  assetsSelected = visualDecision.matched_assets.length,
  generationRequested = false,
  generationReason = null,
}: {
  draftId: string;
  mediaPipelineStatus: MediaPipelineStatus;
  visualDecision: VisualDecision;
  assetsFound?: number;
  assetsSelected?: number;
  generationRequested?: boolean;
  generationReason?: string | null;
}) {
  const supabase = getMediaPipelineClient();
  console.log(
    "[MEDIA PLAN UPSERT]",
    draftId,
    mediaPipelineStatus,
    visualDecision.mode,
  );
  const { error } = await supabase
    .from("content_draft_media_plans")
    .upsert(
      {
        draft_id: draftId,
        action: "prepare_media",
        media_pipeline_status: mediaPipelineStatus,
        visual_decision_mode: visualDecision.mode,
        visual_decision: visualDecision,
        missing_visual_needs: visualDecision.missing_visual_needs,
        assets_found: assetsFound,
        assets_selected: assetsSelected,
        generation_requested: generationRequested,
        generation_reason: generationReason,
        last_run_at: new Date().toISOString(),
      },
      { onConflict: "draft_id" },
    );

  if (error) {
    if (isMissingTableError(error)) {
      throw missingMediaTablesError("content_draft_media_plans", draftId);
    }

    throw new MediaPipelineError(
      `Sauvegarde du plan media impossible: ${error.message}`,
      {
        draftId,
        mediaPipelineStatus,
        visualDecisionMode: visualDecision.mode,
        validation: "content_draft_media_plans.upsert",
      },
    );
  }
}

async function replaceSelectedAssets({
  draftId,
  assets,
}: {
  draftId: string;
  assets: VisualAsset[];
}) {
  const supabase = getMediaPipelineClient();
  const { error: deleteError } = await supabase
    .from("content_draft_asset_links")
    .delete()
    .eq("draft_id", draftId);

  if (deleteError) {
    if (isMissingTableError(deleteError)) {
      throw missingMediaTablesError("content_draft_asset_links", draftId);
    }

    throw new MediaPipelineError(
      `Reset des visuels impossible: ${deleteError.message}`,
      {
        draftId,
        validation: "content_draft_asset_links.delete",
      },
    );
  }

  if (assets.length === 0) {
    return;
  }

  const { error } = await supabase.from("content_draft_asset_links").insert(
    assets.map((asset, index) => ({
      draft_id: draftId,
      asset_id: asset.id,
      asset_source: "library",
      score: asset.score,
      position: index + 1,
      metadata: {
        score_reason: asset.scoreReason,
        score_breakdown: asset.scoreBreakdown,
        estimated_without_vision: asset.scoreBreakdown.estimatedWithoutVision,
      },
    })),
  );

  if (error) {
    if (isMissingTableError(error)) {
      throw missingMediaTablesError("content_draft_asset_links", draftId);
    }

    throw new MediaPipelineError(
      `Selection des visuels impossible: ${error.message}`,
      {
        draftId,
        validation: "content_draft_asset_links.insert",
      },
    );
  }
}

export async function readMediaPipelineState({
  draftId,
  userId,
  includeSuggestions = false,
}: {
  draftId: string;
  userId: string;
  includeSuggestions?: boolean;
}): Promise<MediaPipelineState> {
  const draft = await readDraft(draftId, userId);
  const [plan, selectedAssets] = await Promise.all([
    readPlan(draft.id),
    readSelectedAssets(draft),
  ]);
  const visualScenes = await readVisualScenes(draft);

  return {
    mediaPipelineStatus:
      plan?.media_pipeline_status ??
      (isDraftValidatedForMedia(draft.status) ? "validated" : "draft"),
    visualDecision: plan?.visual_decision ?? null,
    selectedAssets,
    suggestedAssets: includeSuggestions ? await scoreLibraryForDraft(draft) : [],
    assetsFound:
      plan?.assets_found ??
      plan?.visual_decision?.matched_assets?.length ??
      selectedAssets.length,
    assetsSelected: plan?.assets_selected ?? selectedAssets.length,
    generationRequested: plan?.generation_requested ?? false,
    generationReason: plan?.generation_reason ?? null,
    lastRunAt: plan?.last_run_at ?? plan?.updated_at ?? null,
    visualScenes,
  };
}

export function buildVisualGenerationInput(draft: DraftRow): VisualGenerationInput {
  return {
    script: draft.script,
    subject: draft.theme ?? draft.title,
    angle: draft.angle,
    emotion: draft.voice_style,
    visualPrompts: draft.visual_prompt
      ? draft.visual_prompt
          .split(/\n+/)
          .map((prompt) => prompt.trim())
          .filter(Boolean)
      : [],
  };
}

export async function generateNewVisuals(draft: VisualGenerationInput) {
  void draft;

  throw new MediaPipelineError(
    "Le module de generation visuelle n'est pas encore connecte.",
    {
      validation: "visual_generation.not_connected",
    },
  );
}

export async function prepareDraftMedia({
  draftId,
  generationQuality,
  userId,
}: {
  draftId: string;
  generationQuality?: unknown;
  userId: string;
}) {
  const draft = await readDraft(draftId, userId);
  const normalizedGenerationQuality = normalizeGenerationQuality(generationQuality);

  if (!isDraftValidatedForMedia(draft.status)) {
    console.error("[Media Pipeline] prepare blocked", {
      draftId,
      draftStatus: draft.status,
      validation: "draft.status",
    });
    throw new MediaPipelineError("Valide le brouillon avant de preparer les medias.", {
      draftId,
      draftStatus: draft.status,
      validation: "draft.status",
    });
  }
  assertDraftVisualsCanChange(draft, draftId);

  const initialScenes = await readVisualScenes(draft);
  console.info("[Media Pipeline] prepare visuals started", {
    draft_id: draftId,
    number_of_scenes: initialScenes.length,
  });
  await markDraftVisualScenesSearching({
    draft,
    generationQuality: normalizedGenerationQuality,
  });

  const suggestedAssets = await scoreLibraryForDraft(draft);
  const relevantAssets = suggestedAssets.filter((asset) => asset.score >= 18);
  const selectedAssets = relevantAssets.slice(0, 7);
  const hasEnoughLibraryAssets = relevantAssets.length >= 3;
  const missingVisualNeeds = hasEnoughLibraryAssets
    ? []
    : [
        "Visuels supplementaires alignes sur le personnage principal.",
        "Plans verticaux 9:16 coherents avec les prompts visuels.",
        "Transitions visuelles adaptees au rythme du script.",
      ];
  const visualDecision: VisualDecision = {
    mode: hasEnoughLibraryAssets ? "reuse_existing" : "generate_new",
    reason: hasEnoughLibraryAssets
      ? `${relevantAssets.length} visuel(s) de la bibliotheque correspondent au brouillon.`
      : "La bibliotheque ne contient pas encore assez de visuels pertinents pour couvrir le script.",
    confidence: hasEnoughLibraryAssets
      ? Math.min(0.95, 0.55 + relevantAssets.length * 0.06)
      : Math.max(0.25, relevantAssets.length * 0.12),
    matched_assets: relevantAssets.slice(0, 7).map((asset) => ({
      asset_id: asset.id,
      file_name: asset.fileName,
      score: asset.score,
      reason: asset.scoreReason,
      score_breakdown: asset.scoreBreakdown,
    })),
    missing_visual_needs: missingVisualNeeds,
  };
  const mediaPipelineStatus: MediaPipelineStatus = hasEnoughLibraryAssets
    ? "media_ready"
    : "media_preparing";

  console.info("[Media Pipeline] visual decision", {
    draftId,
    draftStatus: draft.status,
    contentAssetsCount: suggestedAssets.length,
    relevantAssetsCount: relevantAssets.length,
    mediaPipelineStatus,
    visualDecisionMode: visualDecision.mode,
  });

  await savePlan({
    draftId,
    mediaPipelineStatus,
    visualDecision,
    assetsFound: relevantAssets.length,
    assetsSelected: hasEnoughLibraryAssets ? selectedAssets.length : 0,
    generationRequested: !hasEnoughLibraryAssets,
    generationReason: hasEnoughLibraryAssets
      ? null
      : relevantAssets.length > 0
        ? "library_assets_below_scene_threshold"
        : "library_empty",
  });
  await replaceSelectedAssets({
    draftId,
    assets: hasEnoughLibraryAssets ? selectedAssets : [],
  });

  await processDraftVisualScenes({
    draft,
    generationQuality: normalizedGenerationQuality,
    generationSource: "library",
  });

  return readMediaPipelineState({ draftId, userId, includeSuggestions: true });
}

export async function requestDraftVisualGeneration({
  draftId,
  generationQuality,
  userId,
}: {
  draftId: string;
  generationQuality?: unknown;
  userId: string;
}) {
  const draft = await readDraft(draftId, userId);
  const normalizedGenerationQuality = normalizeGenerationQuality(generationQuality);

  if (!isDraftValidatedForMedia(draft.status)) {
    throw new MediaPipelineError("Valide le brouillon avant de demander de nouveaux visuels.", {
      draftId,
      draftStatus: draft.status,
      validation: "draft.status",
    });
  }
  assertDraftVisualsCanChange(draft, draftId);

  const generationInput = buildVisualGenerationInput(draft);
  await processDraftVisualScenes({
    draft,
    generationQuality: normalizedGenerationQuality,
    generationSource: "generated",
  });

  const currentState = await readMediaPipelineState({
    draftId,
    userId,
    includeSuggestions: true,
  });
  const visualDecision: VisualDecision = {
    ...(currentState.visualDecision ?? defaultVisualDecision()),
    mode: "generate_new",
    reason:
      "Generation ou fallback bibliotheque execute scene par scene pour ce brouillon.",
    matched_assets: currentState.visualScenes
      .filter((scene) => scene.assetId)
      .map((scene) => ({
        asset_id: scene.assetId ?? "",
        file_name: `Scene ${scene.visualPromptIndex}`,
        score: scene.scoreTotal ?? 0,
        reason:
          typeof scene.scoreBreakdown.reason === "string"
            ? scene.scoreBreakdown.reason
            : "Scene visuelle preparee.",
        score_breakdown: scene.scoreBreakdown as VisualScoreBreakdown,
      })),
    missing_visual_needs: currentState.visualScenes
      .filter((scene) => !scene.imageUrl)
      .map((scene) => `Scene ${scene.visualPromptIndex}: image manquante.`),
  };

  await savePlan({
    draftId,
    mediaPipelineStatus: currentState.mediaPipelineStatus,
    visualDecision,
    assetsFound: currentState.assetsFound,
    assetsSelected: currentState.selectedAssets.length,
    generationRequested: true,
    generationReason: "manual_user_request",
  });

  console.info("[Media Pipeline] visual generation requested", {
    draftId,
    visualDecisionMode: visualDecision.mode,
    generationReason: "manual_user_request",
    visualPromptsCount: generationInput.visualPrompts.length,
    generationQuality: normalizedGenerationQuality,
  });

  return readMediaPipelineState({ draftId, userId, includeSuggestions: true });
}

export async function retryBlockedDraftVisualScenes({
  draftId,
  generationQuality,
  userId,
}: {
  draftId: string;
  generationQuality?: unknown;
  userId: string;
}) {
  const draft = await readDraft(draftId, userId);
  const normalizedGenerationQuality = normalizeGenerationQuality(generationQuality);

  if (!isDraftValidatedForMedia(draft.status)) {
    throw new MediaPipelineError("Valide le brouillon avant de relancer les scenes bloquees.", {
      draftId,
      draftStatus: draft.status,
      validation: "draft.status",
    });
  }
  assertDraftVisualsCanChange(draft, draftId);

  await processDraftVisualScenes({
    draft,
    generationQuality: normalizedGenerationQuality,
    generationSource: "regenerated",
    onlyBlocked: true,
  });

  return readMediaPipelineState({ draftId, userId, includeSuggestions: true });
}

export async function recoverStuckDraftVisualScenes({
  draftId,
  generationQuality,
  userId,
}: {
  draftId: string;
  generationQuality?: unknown;
  userId: string;
}) {
  const draft = await readDraft(draftId, userId);
  const normalizedGenerationQuality = normalizeGenerationQuality(generationQuality);

  if (!isDraftValidatedForMedia(draft.status)) {
    throw new MediaPipelineError("Valide le brouillon avant de surveiller les scenes.", {
      draftId,
      draftStatus: draft.status,
      validation: "draft.status",
    });
  }
  assertDraftVisualsCanChange(draft, draftId);

  const scenes = await readVisualScenes(draft);
  const stuckScenes = scenes.filter(isStuckVisualScene);

  for (const scene of stuckScenes) {
    const elapsedMs = visualSceneElapsedMs(scene);
    const previousStatus = scene.generationStatus;
    const timeoutReason = `${previousStatus}_timeout`;

    if (previousStatus === "pending") {
      logVisualSceneStatusTransition({
        draftId,
        elapsedMs,
        newStatus: "searching_library",
        previousStatus,
        sceneIndex: scene.visualPromptIndex,
        startedAt: scene.updatedAt,
        timeoutReason,
      });
      await generateSceneVisual({
        draft,
        generationQuality: normalizedGenerationQuality,
        generationSource: "regenerated",
        sceneIndex: scene.visualPromptIndex,
      });
      continue;
    }

    if (previousStatus === "searching_library") {
      await upsertVisualScene({
        draft,
        errorMessage: "Recherche trop longue, generation IA...",
        generationQuality: normalizedGenerationQuality,
        generationSource: "generated",
        generationStatus: "generating",
        scoreSource: "none",
        visualPromptIndex: scene.visualPromptIndex,
      });
      logVisualSceneStatusTransition({
        draftId,
        elapsedMs,
        newStatus: "generating",
        previousStatus,
        sceneIndex: scene.visualPromptIndex,
        startedAt: scene.updatedAt,
        timeoutReason,
      });
      await generateSceneVisual({
        draft,
        generationQuality: normalizedGenerationQuality,
        generationSource: "generated",
        sceneIndex: scene.visualPromptIndex,
        skipLibrary: true,
      });
      continue;
    }

    if (previousStatus === "scoring" && scene.imageUrl) {
      await upsertVisualScene({
        assetId: scene.assetId,
        draft,
        errorMessage: "Scoring trop long, image conservee sans nouvelle analyse.",
        generationQuality: scene.generationQuality,
        generationSource: scene.generationSource,
        generationStatus: "ready",
        imageUrl: scene.imageUrl,
        scoreBreakdown: scene.scoreBreakdown,
        scoreSource: scene.scoreSource,
        scoreTotal: scene.scoreTotal,
        storagePath: scene.storagePath,
        visualPromptIndex: scene.visualPromptIndex,
      });
      logVisualSceneStatusTransition({
        draftId,
        elapsedMs,
        newStatus: "ready",
        previousStatus,
        sceneIndex: scene.visualPromptIndex,
        startedAt: scene.updatedAt,
        timeoutReason,
      });
      continue;
    }

    await upsertVisualScene({
      assetId: scene.assetId,
      draft,
      errorMessage: "La selection automatique a expire.",
      generationQuality: scene.generationQuality,
      generationSource: scene.generationSource,
      generationStatus: "error",
      imageUrl: scene.imageUrl,
      scoreBreakdown: scene.scoreBreakdown,
      scoreSource: scene.scoreSource,
      scoreTotal: scene.scoreTotal,
      storagePath: scene.storagePath,
      visualPromptIndex: scene.visualPromptIndex,
    });
    logVisualSceneStatusTransition({
      draftId,
      elapsedMs,
      newStatus: "error",
      previousStatus,
      sceneIndex: scene.visualPromptIndex,
      startedAt: scene.updatedAt,
      timeoutReason,
    });
  }

  return readMediaPipelineState({ draftId, userId, includeSuggestions: true });
}

export async function regenerateDraftVisualScene({
  draftId,
  generationQuality,
  sceneIndex,
  userId,
}: {
  draftId: string;
  generationQuality?: unknown;
  sceneIndex: number;
  userId: string;
}) {
  const draft = await readDraft(draftId, userId);
  const normalizedGenerationQuality = normalizeGenerationQuality(generationQuality);
  const normalizedSceneIndex = Math.max(1, Math.min(7, Math.round(sceneIndex)));
  const scene = (await readVisualScenes(draft)).find(
    (item) => item.visualPromptIndex === normalizedSceneIndex,
  );

  if (!isDraftValidatedForMedia(draft.status)) {
    throw new MediaPipelineError("Valide le brouillon avant de regenerer une scene.", {
      draftId,
      draftStatus: draft.status,
      validation: "draft.status",
    });
  }
  assertDraftVisualsCanChange(draft, draftId);

  if (scene?.locked) {
    throw new MediaPipelineError("Cette scene est verrouillee. Clique sur Modifier pour la remplacer.", {
      draftId,
      sceneIndex: normalizedSceneIndex,
      validation: "visual_scene.locked",
    });
  }

  await generateSceneVisual({
    draft,
    generationQuality: normalizedGenerationQuality,
    generationSource: "regenerated",
    sceneIndex: normalizedSceneIndex,
  });

  return readMediaPipelineState({ draftId, userId, includeSuggestions: true });
}

export async function analyzeDraftVisualScene({
  draftId,
  sceneIndex,
  userId,
}: {
  draftId: string;
  sceneIndex: number;
  userId: string;
}) {
  const draft = await readDraft(draftId, userId);
  const normalizedSceneIndex = Math.max(1, Math.min(7, Math.round(sceneIndex)));
  const scene = (await readVisualScenes(draft)).find(
    (item) => item.visualPromptIndex === normalizedSceneIndex,
  );

  if (!scene?.imageUrl) {
    throw new MediaPipelineError("Aucune image a analyser pour cette scene.", {
      draftId,
      validation: "visual_scene.image_required",
    });
  }

  if (scene.locked) {
    throw new MediaPipelineError("Cette scene est verrouillee. Clique sur Modifier pour l'analyser ou la remplacer.", {
      draftId,
      sceneIndex: normalizedSceneIndex,
      validation: "visual_scene.locked",
    });
  }

  const score = await scoreImageWithVision({
    draft,
    imageUrl: scene.imageUrl,
    prompt: scene.visualPromptText,
    sceneIndex: normalizedSceneIndex,
  });
  const scoreBreakdown = visionScoreToBreakdown(score);

  await upsertVisualScene({
    assetId: scene.assetId,
    draft,
    generationQuality: scene.generationQuality,
    generationSource: scene.generationSource,
    generationStatus: scene.generationStatus,
    imageUrl: scene.imageUrl,
    scoreBreakdown,
    scoreSource: "gpt_vision",
    scoreTotal: score.total,
    storagePath: scene.storagePath,
    visualPromptIndex: normalizedSceneIndex,
  });

  if (scene.assetId) {
    await updateGeneratedAssetScore({
      assetId: scene.assetId,
      scoreBreakdown,
      scoreSource: "gpt_vision",
    });
  }

  return readMediaPipelineState({ draftId, userId, includeSuggestions: true });
}

export async function updateDraftVisualSceneStatus({
  draftId,
  sceneIndex,
  status,
  userId,
}: {
  draftId: string;
  sceneIndex: number;
  status: "retained" | "rejected";
  userId: string;
}) {
  const draft = await readDraft(draftId, userId);
  const normalizedSceneIndex = Math.max(1, Math.min(7, Math.round(sceneIndex)));
  const scene = (await readVisualScenes(draft)).find(
    (item) => item.visualPromptIndex === normalizedSceneIndex,
  );

  if (!scene) {
    throw new MediaPipelineError("Scene visuelle introuvable.", {
      draftId,
      validation: "visual_scene.missing",
    });
  }

  if (scene.locked && status !== "retained") {
    throw new MediaPipelineError("Cette scene est verrouillee. Clique sur Modifier avant de la modifier.", {
      draftId,
      sceneIndex: normalizedSceneIndex,
      validation: "visual_scene.locked",
    });
  }

  await upsertVisualScene({
    assetId: scene.assetId,
    draft,
    generationQuality: scene.generationQuality,
    generationSource: scene.generationSource,
    generationStatus: status,
    imageUrl: scene.imageUrl,
    locked: status === "retained",
    retainedAt: status === "retained" ? new Date().toISOString() : scene.retainedAt,
    retainedBy: status === "retained" ? userId : scene.retainedBy,
    scoreBreakdown: scene.scoreBreakdown,
    scoreSource: scene.scoreSource,
    scoreTotal: scene.scoreTotal,
    storagePath: scene.storagePath,
    visualPromptIndex: normalizedSceneIndex,
  });

  if (status === "retained" && scene.assetId) {
    await selectDraftVisualAsset({
      assetId: scene.assetId,
      draftId,
      usageOrder: normalizedSceneIndex,
      userId,
    });
    await saveVisualMetadata({
      assetId: scene.assetId,
      generation_quality: scene.generationQuality,
      gpt_vision_score:
        scene.scoreSource === "gpt_vision" && scene.scoreTotal !== null
          ? scene.scoreTotal
          : null,
      prompt: scene.visualPromptText,
      scoreBreakdown: scene.scoreBreakdown,
      scoreSource: scene.scoreSource,
      source_draft_id: draftId,
      source_scene_number: normalizedSceneIndex,
      validated: true,
      validated_at: new Date().toISOString(),
    });
  }

  return readMediaPipelineState({ draftId, userId, includeSuggestions: true });
}

export async function unlockDraftVisualScene({
  draftId,
  sceneIndex,
  userId,
}: {
  draftId: string;
  sceneIndex: number;
  userId: string;
}) {
  const draft = await readDraft(draftId, userId);
  const normalizedSceneIndex = Math.max(1, Math.min(7, Math.round(sceneIndex)));
  const scene = (await readVisualScenes(draft)).find(
    (item) => item.visualPromptIndex === normalizedSceneIndex,
  );

  if (!scene) {
    throw new MediaPipelineError("Scene visuelle introuvable.", {
      draftId,
      validation: "visual_scene.missing",
    });
  }

  await upsertVisualScene({
    assetId: scene.assetId,
    draft,
    generationQuality: scene.generationQuality,
    generationSource: scene.generationSource,
    generationStatus: scene.imageUrl ? "ready" : "pending",
    imageUrl: scene.imageUrl,
    locked: false,
    retainedAt: null,
    retainedBy: null,
    scoreBreakdown: scene.scoreBreakdown,
    scoreSource: scene.scoreSource,
    scoreTotal: scene.scoreTotal,
    storagePath: scene.storagePath,
    visualPromptIndex: normalizedSceneIndex,
  });

  return readMediaPipelineState({ draftId, userId, includeSuggestions: true });
}

export async function validateDraftVisuals({
  draftId,
  userId,
}: {
  draftId: string;
  userId: string;
}) {
  const draft = await readDraft(draftId, userId);
  const scenes = await readVisualScenes(draft);
  const retainedScenes = scenes.filter((scene) => scene.locked || scene.generationStatus === "retained");

  if (retainedScenes.length !== 7) {
    throw new MediaPipelineError(`${retainedScenes.length}/7 visuels retenus.`, {
      draftId,
      validation: "visual_scenes.retained_count",
    });
  }

  const supabase = getMediaPipelineClient();
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("content_drafts")
    .update({
      protected: true,
      protected_at: now,
      status: "visual_ready",
      visual_status: "visual_ready",
      visuals_validated_at: now,
    })
    .eq("id", draftId)
    .eq("user_id", userId);

  if (error) {
    throw new MediaPipelineError(`Validation des visuels impossible: ${error.message}`, {
      draftId,
      validation: "content_drafts.visuals_validate",
    });
  }

  await savePlan({
    draftId,
    mediaPipelineStatus: "visual_ready",
    visualDecision: defaultVisualDecision(),
    assetsFound: retainedScenes.length,
    assetsSelected: retainedScenes.length,
    generationRequested: false,
    generationReason: "visuals_validated",
  });

  return readMediaPipelineState({ draftId, userId, includeSuggestions: true });
}

export async function refreshDraftMediaSuggestions({
  draftId,
  userId,
}: {
  draftId: string;
  userId: string;
}) {
  const draft = await readDraft(draftId, userId);

  if (!isDraftValidatedForMedia(draft.status)) {
    throw new MediaPipelineError("Valide le brouillon avant de preparer les medias.", {
      draftId,
      draftStatus: draft.status,
      validation: "draft.status",
    });
  }
  assertDraftVisualsCanChange(draft, draftId);

  return readMediaPipelineState({ draftId, userId, includeSuggestions: true });
}

export async function selectDraftVisualAsset({
  draftId,
  userId,
  assetId,
  usageOrder,
}: {
  draftId: string;
  userId: string;
  assetId: string;
  usageOrder: number;
}) {
  const draft = await readDraft(draftId, userId);

  if (!isDraftValidatedForMedia(draft.status)) {
    throw new MediaPipelineError("Valide le brouillon avant de preparer les medias.", {
      draftId,
      draftStatus: draft.status,
      validation: "draft.status",
    });
  }
  assertDraftVisualsCanChange(draft, draftId);

  const suggestedAssets = await scoreLibraryForDraft(draft);
  const selectedAsset =
    suggestedAssets.find((asset) => asset.id === assetId) ??
    mapAsset(
      await readAssetById(assetId),
      0,
      "Selection manuelle hors suggestions.",
    );
  const supabase = getMediaPipelineClient();
  const normalizedOrder = Math.max(1, Math.min(7, Math.round(usageOrder)));

  const { error } = await supabase
    .from("content_draft_asset_links")
    .delete()
    .eq("draft_id", draftId)
    .eq("position", normalizedOrder);

  if (error) {
    if (isMissingTableError(error)) {
      throw missingMediaTablesError("content_draft_asset_links", draftId);
    }

    throw new MediaPipelineError(`Selection manuelle impossible: ${error.message}`, {
      draftId,
      validation: "content_draft_asset_links.delete_position",
    });
  }

  const { error: upsertError } = await supabase
    .from("content_draft_asset_links")
    .upsert(
      {
        draft_id: draftId,
        asset_id: selectedAsset.id,
        asset_source: "library",
        score: selectedAsset.score,
        position: normalizedOrder,
        metadata: {
          score_reason: selectedAsset.scoreReason,
          score_breakdown: selectedAsset.scoreBreakdown,
          estimated_without_vision:
            selectedAsset.scoreBreakdown.estimatedWithoutVision,
          selected_manually: true,
        },
      },
      { onConflict: "draft_id,asset_id" },
    );

  if (upsertError) {
    if (isMissingTableError(upsertError)) {
      throw missingMediaTablesError("content_draft_asset_links", draftId);
    }

    throw new MediaPipelineError(`Selection manuelle impossible: ${upsertError.message}`, {
      draftId,
      validation: "content_draft_asset_links.upsert",
    });
  }

  const currentState = await readMediaPipelineState({
    draftId,
    userId,
    includeSuggestions: true,
  });
  const selectedCount = currentState.selectedAssets.length;
  await savePlan({
    draftId,
    mediaPipelineStatus: selectedCount >= 3 ? "media_ready" : "media_preparing",
    visualDecision: currentState.visualDecision ?? defaultVisualDecision(),
    assetsFound: currentState.assetsFound,
    assetsSelected: selectedCount,
  });

  return readMediaPipelineState({ draftId, userId, includeSuggestions: true });
}

export async function removeDraftVisualAsset({
  draftId,
  userId,
  assetId,
}: {
  draftId: string;
  userId: string;
  assetId: string;
}) {
  const draft = await readDraft(draftId, userId);

  if (!isDraftValidatedForMedia(draft.status)) {
    throw new MediaPipelineError("Valide le brouillon avant de modifier les visuels.", {
      draftId,
      draftStatus: draft.status,
      validation: "draft.status",
    });
  }
  assertDraftVisualsCanChange(draft, draftId);

  const supabase = getMediaPipelineClient();
  const { error } = await supabase
    .from("content_draft_asset_links")
    .delete()
    .eq("draft_id", draftId)
    .eq("asset_id", assetId);

  if (error) {
    if (isMissingTableError(error)) {
      throw missingMediaTablesError("content_draft_asset_links", draftId);
    }

    throw new MediaPipelineError(`Retrait du visuel impossible: ${error.message}`, {
      draftId,
      validation: "content_draft_asset_links.delete_asset",
    });
  }

  const currentState = await readMediaPipelineState({
    draftId,
    userId,
    includeSuggestions: true,
  });
  const selectedCount = currentState.selectedAssets.length;

  await savePlan({
    draftId,
    mediaPipelineStatus: selectedCount >= 3 ? "media_ready" : "media_preparing",
    visualDecision: currentState.visualDecision ?? defaultVisualDecision(),
    assetsFound: currentState.assetsFound,
    assetsSelected: selectedCount,
  });

  return readMediaPipelineState({ draftId, userId, includeSuggestions: true });
}

async function readAssetById(assetId: string) {
  const supabase = getMediaPipelineClient();
  const { data, error } = await supabase
    .from("content_assets")
    .select(
      "id, asset_type, file_name, bucket_name, storage_path, public_url, source, status, metadata, usage_count, linked_draft_id, created_at",
    )
    .eq("id", assetId)
    .eq("asset_type", "image")
    .maybeSingle<ContentAssetRow>();

  if (error) {
    throw new MediaPipelineError(`Lecture du visuel impossible: ${error.message}`, {
      validation: "content_assets.asset_by_id",
    });
  }

  if (!data) {
    throw new MediaPipelineError("Visuel introuvable dans la bibliotheque.", {
      validation: "content_assets.asset_missing",
    });
  }

  return data;
}
