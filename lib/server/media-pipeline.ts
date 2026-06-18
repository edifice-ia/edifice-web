import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  getRequiredVisualSceneCount,
  parseVisualPrompts,
} from "@/lib/content/visual-prompts";
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
const VISUAL_LIBRARY_RELEVANCE_THRESHOLD = 60;
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
  score: Record<string, unknown> | null;
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
  tagsMatch?: number;
  themeMatch?: number;
  emotionMatch?: number;
  ambianceMatch?: number;
  characterMatch?: number;
  styleMatch?: number;
  promptMatch?: number;
  visionScoreBonus?: number;
  metadataScoreTotal?: number;
  metadataSourceScores?: Record<string, number>;
  tags_score?: number;
  theme_score?: number;
  emotion_score?: number;
  ambiance_score?: number;
  character_score?: number;
  style_score?: number;
  vision_quality_bonus?: number;
  total_score?: number;
  subject_score?: number;
  location_score?: number;
  mood_score?: number;
  action_score?: number;
  penalties?: Array<{ reason: string; value: number }>;
  penalty_total?: number;
  matched_tags?: string[];
  rejected_because?: string | null;
  sceneConcepts?: Record<string, string[]>;
  assetConcepts?: Record<string, string[]>;
  metadataMatches?: {
    emotion: string | null;
    tags: string[];
    theme: string | null;
    visualStyle: string | null;
    characterType: string | null;
  };
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

function metadataStringList(asset: ContentAssetRow, keys: string[]) {
  const values: string[] = [];

  for (const key of keys) {
    const value = asset.metadata[key];

    if (Array.isArray(value)) {
      values.push(
        ...value.filter((item): item is string => typeof item === "string"),
      );
    } else if (typeof value === "string" && value.trim()) {
      values.push(value.trim());
    }
  }

  return values;
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

function hasEnrichedVisualMetadata(metadata: Record<string, unknown>) {
  return (
    metadataStringList({ metadata } as ContentAssetRow, ["tags"]).length > 0 ||
    typeof metadata.theme === "string" ||
    typeof metadata.emotion === "string" ||
    typeof metadata.ambiance === "string" ||
    typeof metadata.character_type === "string" ||
    typeof metadata.visual_style === "string" ||
    typeof metadata.gpt_vision_score === "number"
  );
}

function numericScore(value: number, max: number) {
  return Math.max(0, Math.min(max, Math.round(value)));
}

function overlapScore({
  candidate,
  max,
  reference,
  weight = 1,
}: {
  candidate: string;
  max: number;
  reference: string;
  weight?: number;
}) {
  const candidateTokens = tokenize(candidate);

  if (candidateTokens.length === 0) {
    return 0;
  }

  const referenceTokens = tokenize(reference);
  const matches = candidateTokens.filter((token) => referenceTokens.includes(token));

  return numericScore(matches.length * weight, max);
}

function visualPromptsForDraft(draft: DraftRow) {
  return parseVisualPrompts(draft.visual_prompt ?? "", requiredVisualSceneCountForDraft(draft)).filter(Boolean);
}

function durationPresetForDraft(draft: DraftRow) {
  const preset = draft.score?.duration_preset;

  return typeof preset === "string" ? preset : undefined;
}

function durationSecondsForDraft(draft: DraftRow) {
  const seconds = draft.score?.duration_seconds;
  const numericSeconds = typeof seconds === "number" ? seconds : Number(seconds);

  return Number.isFinite(numericSeconds) ? numericSeconds : null;
}

function requiredVisualSceneCountForDraft(draft: DraftRow) {
  const explicitCount = Number(draft.score?.required_visual_scene_count);

  if ([3, 5, 7, 9].includes(explicitCount)) {
    return explicitCount;
  }

  return getRequiredVisualSceneCount(durationPresetForDraft(draft), durationSecondsForDraft(draft));
}

function requiredVisualSceneCountForScenes(draft: DraftRow, rows: VisualSceneRow[]) {
  const existingCount = rows.length;

  if (existingCount > 0) {
    return existingCount;
  }

  return requiredVisualSceneCountForDraft(draft);
}

function normalizeVisualSceneIndex(draft: DraftRow, sceneIndex: number, scenes?: VisualScene[]) {
  const requiredSceneCount = scenes?.length || requiredVisualSceneCountForDraft(draft);

  return Math.max(1, Math.min(requiredSceneCount, Math.round(sceneIndex)));
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

type SceneConcepts = {
  action: string[];
  emotion: string[];
  location: string[];
  mood: string[];
  style: string[];
  subject: string[];
  theme: string[];
  time_of_day: string[];
};

const conceptLexicon: Record<keyof SceneConcepts, Record<string, string[]>> = {
  action: {
    discussion: ["discussion", "conversation", "parle", "dialogue", "echange"],
    marche: ["marche", "marcher", "walking", "walk"],
    observe: ["observe", "regarde", "watching", "looking"],
    reflexion: ["reflexion", "pensee", "penser", "introspection", "meditation"],
  },
  emotion: {
    calme: ["calme", "apaisement", "serenite", "paisible", "peaceful", "quiet"],
    colere: ["colere", "furieux", "rage", "angry"],
    determination: ["determination", "determine", "volonte", "resolve"],
    peur: ["peur", "anxiete", "angoisse", "fear"],
    tension: ["tension", "conflit", "stress", "pression", "hostile"],
    tristesse: ["tristesse", "melancolie", "sad"],
  },
  location: {
    bureau: ["bureau", "office", "open-space", "meeting"],
    interieur: ["interieur", "inside", "indoor", "piece", "salle"],
    nature: ["nature", "parc", "park", "jardin", "foret", "arbre", "arbres"],
    rue: ["rue", "street", "route"],
    toit: ["toit", "rooftop", "terrasse"],
    ville: ["ville", "urbain", "urban", "skyline", "city", "immeuble"],
  },
  mood: {
    douceur: ["douce", "doux", "soft", "lumiere douce", "warm"],
    introspection: ["introspection", "interieur", "reflexion", "solitude"],
    solitude: ["seul", "seule", "solitude", "alone", "isolated"],
    tension: ["tension", "conflit", "stress", "pression"],
  },
  style: {
    cinematic: ["cinematic", "cinematique", "film", "dramatique"],
    closeup: ["close", "close-up", "gros plan", "portrait"],
    sombre: ["sombre", "dark", "low-key"],
    vertical: ["vertical", "9:16", "portrait"],
  },
  subject: {
    couple: ["couple", "duo", "deux personnes"],
    femme: ["femme", "female", "woman", "elle", "collegue femme"],
    groupe: ["groupe", "equipe", "plusieurs", "crowd"],
    homme: ["homme", "male", "man", "lui", "masculin"],
    silhouette: ["silhouette", "ombre", "personne"],
  },
  theme: {
    conflit: ["conflit", "tension", "opposition"],
    discipline: ["discipline", "maitrise", "rigueur"],
    introspection: ["introspection", "reflexion", "interieur"],
    solitude: ["solitude", "isolement", "seul"],
    transformation: ["transformation", "changement", "evolution"],
  },
  time_of_day: {
    crepuscule: ["crepuscule", "coucher", "sunset", "dusk", "soir"],
    jour: ["jour", "day", "matin", "morning"],
    nuit: ["nuit", "night", "nocturne"],
  },
};

function normalizedText(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

function includesConceptTerm(text: string, term: string) {
  return normalizedText(text).includes(normalizedText(term));
}

function extractSceneConcepts(text: string): SceneConcepts {
  const concepts: SceneConcepts = {
    action: [],
    emotion: [],
    location: [],
    mood: [],
    style: [],
    subject: [],
    theme: [],
    time_of_day: [],
  };

  for (const [category, groups] of Object.entries(conceptLexicon) as Array<
    [keyof SceneConcepts, Record<string, string[]>]
  >) {
    for (const [concept, terms] of Object.entries(groups)) {
      if (terms.some((term) => includesConceptTerm(text, term))) {
        concepts[category].push(concept);
      }
    }
  }

  return concepts;
}

function conceptOverlapScore(
  sceneValues: string[],
  assetValues: string[],
  max: number,
) {
  if (sceneValues.length === 0 || assetValues.length === 0) {
    return 0;
  }

  const matches = sceneValues.filter((value) => assetValues.includes(value));
  const ratio = matches.length / sceneValues.length;

  return numericScore(max * ratio, max);
}

function visualAssetMetadataText(asset: ContentAssetRow) {
  return [
    asset.file_name,
    asset.storage_path,
    metadataStringList(asset, ["tags", "keywords"]).join(" "),
    metadataString(asset, ["title"]),
    metadataString(asset, ["description"]),
    metadataString(asset, ["theme", "subject"]),
    metadataString(asset, ["emotion", "mood", "tone"]),
    metadataString(asset, ["ambiance"]),
    metadataString(asset, ["character_type", "character"]),
    metadataString(asset, ["visual_style", "style"]),
    metadataString(asset, [
      "prompt",
      "visual_prompt",
      "source_prompt",
      "generation_prompt",
      "scene_prompt",
    ]),
  ]
    .filter(Boolean)
    .join(" ");
}

function conflictPenalty({
  assetConcepts,
  sceneConcepts,
  usedAssetIds,
  assetId,
}: {
  assetConcepts: SceneConcepts;
  sceneConcepts: SceneConcepts;
  usedAssetIds?: Set<string>;
  assetId: string;
}) {
  const penalties: Array<{ reason: string; value: number }> = [];

  if (sceneConcepts.subject.includes("homme") && assetConcepts.subject.includes("femme")) {
    penalties.push({ reason: "personnage_femme_pour_prompt_homme", value: 35 });
  }

  if (sceneConcepts.subject.includes("femme") && assetConcepts.subject.includes("homme")) {
    penalties.push({ reason: "personnage_homme_pour_prompt_femme", value: 35 });
  }

  if (
    sceneConcepts.location.includes("nature") &&
    (assetConcepts.location.includes("ville") || assetConcepts.location.includes("bureau")) &&
    !assetConcepts.location.includes("nature")
  ) {
    penalties.push({ reason: "lieu_urbain_ou_bureau_pour_prompt_nature", value: 30 });
  }

  if (
    sceneConcepts.location.includes("toit") &&
    (assetConcepts.location.includes("interieur") || assetConcepts.location.includes("bureau")) &&
    !assetConcepts.location.includes("toit")
  ) {
    penalties.push({ reason: "lieu_interieur_pour_prompt_toit", value: 30 });
  }

  if (
    (sceneConcepts.emotion.includes("calme") ||
      sceneConcepts.mood.includes("solitude") ||
      sceneConcepts.mood.includes("introspection")) &&
    (assetConcepts.emotion.includes("tension") || assetConcepts.mood.includes("tension")) &&
    !assetConcepts.emotion.includes("calme")
  ) {
    penalties.push({ reason: "ambiance_tension_pour_prompt_calme", value: 25 });
  }

  if (usedAssetIds?.has(assetId)) {
    penalties.push({ reason: "asset_deja_propose_ou_retenu_pour_ce_brouillon", value: 45 });
  }

  return penalties;
}

function scoreAsset(
  draft: DraftRow,
  asset: ContentAssetRow,
  sceneIndex?: number | null,
  options: { usedAssetIds?: Set<string> } = {},
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
  const declaredTags = metadataStringList(asset, ["tags", "keywords"]);
  const declaredTheme = metadataString(asset, ["theme", "subject"]);
  const declaredEmotion = metadataString(asset, ["emotion", "mood", "tone"]);
  const declaredAmbiance = metadataString(asset, ["ambiance"]);
  const declaredCharacterType = metadataString(asset, ["character_type", "character"]);
  const declaredStyle = metadataString(asset, ["visual_style", "style"]);
  const declaredDescription = metadataString(asset, ["description"]);
  const gptVisionScore = metadataNumber(asset, ["gpt_vision_score", "vision_score"]);
  const sceneText = scene.prompt;
  const visualPromptText = draft.visual_prompt ?? "";
  const sceneReference = `${sceneText} ${visualPromptText}`;
  const draftReference = `${draft.title ?? ""} ${draft.hook ?? ""} ${draft.angle ?? ""} ${draft.theme ?? ""}`;
  const semanticReference = `${sceneReference} ${draftReference}`;
  const declaredPromptText = `${declaredPrompt} ${declaredDescription}`;
  const sceneReferenceTokens = tokenize(sceneReference);
  const draftReferenceTokens = tokenize(draftReference);
  const referenceTokens = [...new Set([...sceneReferenceTokens, ...draftReferenceTokens])];
  const matchingTags = declaredTags.filter((tag) => {
    const tagTokens = tokenize(tag);

    return tagTokens.some((token) => referenceTokens.includes(token));
  });
  const tagsScore = numericScore(
    matchingTags.length * 4,
    25,
  );
  const themeMatch = Math.max(
    overlapScore({
      candidate: declaredTheme,
      max: 20,
      reference: semanticReference,
      weight: 5,
    }),
    overlapScore({
      candidate: declaredPromptText,
      max: 20,
      reference: semanticReference,
      weight: 2,
    }),
  );
  const emotionMatch = overlapScore({
    candidate: declaredEmotion,
    max: 15,
    reference: semanticReference,
    weight: 5,
  });
  const ambianceMatch = overlapScore({
    candidate: declaredAmbiance,
    max: 15,
    reference: semanticReference,
    weight: 5,
  });
  const characterMatch = overlapScore({
    candidate: declaredCharacterType,
    max: 10,
    reference: semanticReference,
    weight: 5,
  });
  const styleMatch = overlapScore({
    candidate: declaredStyle,
    max: 10,
    reference: `${sceneReference} cinematic cinematique vertical 9:16`,
    weight: 3,
  });
  const promptMatch = overlapScore({
    candidate: declaredPromptText,
    max: 20,
    reference: semanticReference,
    weight: 2,
  });
  const visionQualityBonus =
    gptVisionScore !== null && gptVisionScore >= 90
      ? 5
      : gptVisionScore !== null && gptVisionScore >= 80
        ? 3
        : gptVisionScore !== null && gptVisionScore >= 70
          ? 1
          : 0;
  const sceneConcepts = extractSceneConcepts(`${sceneReference} ${draftReference}`);
  const assetConcepts = extractSceneConcepts(visualAssetMetadataText(asset));
  const subjectScore = conceptOverlapScore(sceneConcepts.subject, assetConcepts.subject, 25);
  const locationScore = conceptOverlapScore(sceneConcepts.location, assetConcepts.location, 20);
  const moodScore = numericScore(
    conceptOverlapScore(
      [...sceneConcepts.emotion, ...sceneConcepts.mood],
      [...assetConcepts.emotion, ...assetConcepts.mood],
      20,
    ),
    20,
  );
  const actionScore = conceptOverlapScore(sceneConcepts.action, assetConcepts.action, 15);
  const weightedStyleScore = conceptOverlapScore(sceneConcepts.style, assetConcepts.style, 10);
  const weightedThemeScore = conceptOverlapScore(sceneConcepts.theme, assetConcepts.theme, 10);
  const matchedConceptTags = Array.from(
    new Set([
      ...sceneConcepts.subject.filter((value) => assetConcepts.subject.includes(value)),
      ...sceneConcepts.location.filter((value) => assetConcepts.location.includes(value)),
      ...sceneConcepts.emotion.filter((value) => assetConcepts.emotion.includes(value)),
      ...sceneConcepts.mood.filter((value) => assetConcepts.mood.includes(value)),
      ...sceneConcepts.action.filter((value) => assetConcepts.action.includes(value)),
      ...sceneConcepts.style.filter((value) => assetConcepts.style.includes(value)),
      ...sceneConcepts.theme.filter((value) => assetConcepts.theme.includes(value)),
      ...matchingTags,
    ]),
  );
  const penalties = conflictPenalty({
    assetConcepts,
    assetId: asset.id,
    sceneConcepts,
    usedAssetIds: options.usedAssetIds,
  });
  const penaltyTotal = penalties.reduce((sum, penalty) => sum + penalty.value, 0);
  const metadataRelevanceScore = numericScore(
    subjectScore +
      locationScore +
      moodScore +
      actionScore +
      weightedStyleScore +
      weightedThemeScore +
      visionQualityBonus -
      penaltyTotal,
    100,
  );
  const metadataSourceScores = {
    action: actionScore,
    ambiance: ambianceMatch,
    character_type: subjectScore || characterMatch,
    emotion: moodScore || emotionMatch,
    gpt_vision_bonus: visionQualityBonus,
    location: locationScore,
    penalty_total: -penaltyTotal,
    scene_prompt: promptMatch,
    tags: tagsScore,
    theme: weightedThemeScore || themeMatch,
    visual_style: weightedStyleScore || styleMatch,
  };
  const metadataScoreTotal = Object.values(metadataSourceScores).reduce(
    (sum, value) => sum + value,
    0,
  );
  const promptImage = numericScore(
    promptMatch +
      Math.round(tagsScore * 0.45) +
      promptMatches.length * 2,
    30,
  );
  const imageDraft = numericScore(
    themeMatch +
      emotionMatch +
      ambianceMatch +
      characterMatch +
      draftMatches.length,
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
    declaredTheme.length > 0,
    declaredEmotion.length > 0,
    declaredAmbiance.length > 0,
    declaredCharacterType.length > 0,
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
  const score = metadataRelevanceScore;
  const matches = Array.from(new Set([...promptMatches, ...draftMatches]));
  const metadataMatches = Object.entries(metadataSourceScores)
    .filter(([, value]) => value > 0)
    .map(([key, value]) => `${key}:${value}`);
  const rejectedBecause = penalties.length
    ? penalties.map((penalty) => penalty.reason).join(", ")
    : score < VISUAL_LIBRARY_RELEVANCE_THRESHOLD
      ? "score_trop_faible"
      : null;
  const reason =
    matchedConceptTags.length > 0
      ? `Estime sans analyse visuelle IA. Concepts: ${matchedConceptTags.slice(0, 8).join(", ")}.`
      : metadataMatches.length > 0
        ? `Estime sans analyse visuelle IA. Metadata prioritaires: ${metadataMatches.join(", ")}.`
      : matches.length > 0
        ? `Estime sans analyse visuelle IA. Correspondances texte: ${matches.slice(0, 6).join(", ")}.`
        : "Estime sans analyse visuelle IA. Coherence visuelle a valider manuellement.";
  const scoreBreakdown: VisualScoreBreakdown = {
    total: score,
    total_score: score,
    promptImage,
    imageDraft,
    visualQuality,
    narrativeContinuity,
    editorialSafety,
    estimatedWithoutVision: true,
    reason,
    matchedTerms: matches.slice(0, 12),
    sceneIndex: scene.sceneIndex,
    tagsMatch: tagsScore,
    themeMatch,
    emotionMatch,
    ambianceMatch,
    characterMatch,
    styleMatch,
    promptMatch,
    visionScoreBonus: visionQualityBonus,
    metadataScoreTotal,
    metadataSourceScores,
    tags_score: tagsScore,
    theme_score: weightedThemeScore || themeMatch,
    emotion_score: moodScore || emotionMatch,
    ambiance_score: ambianceMatch,
    character_score: subjectScore || characterMatch,
    style_score: weightedStyleScore || styleMatch,
    vision_quality_bonus: visionQualityBonus,
    subject_score: subjectScore,
    location_score: locationScore,
    mood_score: moodScore,
    action_score: actionScore,
    penalties,
    penalty_total: penaltyTotal,
    matched_tags: matchedConceptTags,
    rejected_because: rejectedBecause,
    sceneConcepts,
    assetConcepts,
    metadataMatches: {
      characterType: subjectScore > 0 || characterMatch > 0 ? declaredCharacterType || null : null,
      emotion: moodScore > 0 || emotionMatch > 0 ? declaredEmotion || null : null,
      tags: matchedConceptTags.slice(0, 8),
      theme: weightedThemeScore > 0 || themeMatch > 0 ? declaredTheme || null : null,
      visualStyle: weightedStyleScore > 0 || styleMatch > 0 ? declaredStyle || null : null,
    },
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
    description: `Scene ${sceneIndex}/${requiredVisualSceneCountForDraft(draft)} - ${scenePrompt.trim().slice(0, 180)}`,
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
                    `Scene: ${sceneIndex}/${requiredVisualSceneCountForDraft(draft)}`,
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

function storagePathFromAssetUrl(url: string) {
  if (!url || url.includes("undefined") || url.includes("null")) {
    return "";
  }

  try {
    const parsed = new URL(url);
    const decodedPath = decodeURIComponent(parsed.pathname);
    const marker = `${VISUAL_LIBRARY_PATH}/`;
    const markerIndex = decodedPath.indexOf(marker);

    return markerIndex >= 0 ? decodedPath.slice(markerIndex) : "";
  } catch {
    const marker = `${VISUAL_LIBRARY_PATH}/`;
    const markerIndex = url.indexOf(marker);

    return markerIndex >= 0 ? url.slice(markerIndex) : "";
  }
}

function metadataStringValue(metadata: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = metadata[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return "";
}

function stripBucketPrefix(path: string, bucketName: string) {
  const normalized = path.trim().replace(/^\/+/, "");
  const bucketPrefix = `${bucketName}/`;

  return normalized.startsWith(bucketPrefix)
    ? normalized.slice(bucketPrefix.length)
    : normalized;
}

function knownStoragePathsForFile(fileName: string, bucketName: string) {
  if (!fileName.trim()) {
    return [];
  }

  return [
    `${VISUAL_LIBRARY_PATH}/${fileName}`,
    `shorts/${fileName}`,
    `visuels/${fileName}`,
    `Lignes Interieures/visuels/${fileName}`,
    `final_pins/${fileName}`,
  ].map((path) => stripBucketPrefix(path, bucketName));
}

function normalizedLibraryAsset(asset: ContentAssetRow): ContentAssetRow {
  const metadataAssetUrl = metadataStringValue(asset.metadata, [
    "asset_url",
    "assetUrl",
    "url",
    "image_url",
    "imageUrl",
  ]);
  const metadataPath = metadataStringValue(asset.metadata, [
    "path",
    "storage_path",
    "storagePath",
  ]);
  const storagePath =
    asset.storage_path?.trim() ||
    stripBucketPrefix(metadataPath, asset.bucket_name || VISUAL_LIBRARY_BUCKET) ||
    storagePathFromAssetUrl(asset.public_url ?? "") ||
    storagePathFromAssetUrl(metadataAssetUrl);

  return {
    ...asset,
    bucket_name: asset.bucket_name?.trim() || VISUAL_LIBRARY_BUCKET,
    storage_path: storagePath,
  };
}

function isCanonicalVisualAsset(asset: Pick<ContentAssetRow, "bucket_name" | "storage_path">) {
  return (
    asset.bucket_name === VISUAL_LIBRARY_BUCKET &&
    asset.storage_path.startsWith(`${VISUAL_LIBRARY_PATH}/`)
  );
}

async function signedVisualAssetPreviewUrl({
  assetUrl,
  assetId,
  bucketName,
  fileName,
  publicUrl,
  storagePath,
}: {
  assetUrl?: string;
  assetId: string;
  bucketName: string;
  fileName: string;
  publicUrl?: string;
  storagePath: string;
}) {
  const supabase = getMediaPipelineClient();
  const candidatePaths = [
    storagePath,
    ...knownStoragePathsForFile(fileName, bucketName),
  ]
    .map((path) => stripBucketPrefix(path, bucketName))
    .filter((path, index, paths): path is string => Boolean(path) && paths.indexOf(path) === index);

  for (const candidatePath of candidatePaths) {
    const { data, error } = await supabase.storage
      .from(bucketName)
      .createSignedUrl(candidatePath, 60 * 60);
    const previewUrl = error ? "" : data?.signedUrl ?? "";

    if (previewUrl) {
      const resolutionMethod = candidatePath === storagePath
        ? "signed_url_storage_path"
        : "signed_url_known_path";
      console.info("[LIBRARY_PREVIEW_DEBUG]", {
        asset_id: assetId,
        asset_url: assetUrl ?? null,
        bucket_name: bucketName,
        file_name: fileName,
        public_url: publicUrl ?? null,
        resolved_preview_url: previewUrl,
        resolution_method: resolutionMethod,
        storage_path: candidatePath,
      });
      return {
        bucketName,
        previewUrl,
        resolutionMethod,
        storagePath: candidatePath,
      };
    }
  }

  const fallbackUrl =
    assetUrl?.startsWith("https://")
      ? assetUrl
      : publicUrl?.startsWith("https://")
        ? publicUrl
        : "";
  const fallbackMethod =
    assetUrl?.startsWith("https://")
      ? "asset_url"
      : publicUrl?.startsWith("https://")
        ? "public_url"
        : "missing";

  console.info("[LIBRARY_PREVIEW_DEBUG]", {
      asset_id: assetId,
      asset_url: assetUrl ?? null,
      bucket_name: bucketName,
      file_name: fileName,
      public_url: publicUrl ?? null,
      resolved_preview_url: fallbackUrl || null,
      resolution_method: fallbackMethod,
      storage_path: storagePath,
  });

  return {
    bucketName,
    previewUrl: fallbackUrl,
    resolutionMethod: fallbackMethod,
    storagePath,
  };
}

function libraryVisionDecision(scoreBreakdown: Record<string, unknown>): VisualSelectionDecision {
  const total = Number(scoreBreakdown.total_score ?? scoreBreakdown.total ?? 0);
  const rawLocation = scoreBreakdown.location_score;
  const location = Number(rawLocation ?? 0);
  const sceneConcepts = scoreBreakdown.sceneConcepts as Partial<SceneConcepts> | undefined;
  const needsLocationMatch =
    Array.isArray(sceneConcepts?.location) && sceneConcepts.location.length > 0;

  if (
    !Number.isFinite(total) ||
    total < VISUAL_LIBRARY_RELEVANCE_THRESHOLD ||
    (needsLocationMatch && location < 12)
  ) {
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

function metadataMatchValue(
  matches: VisualScoreBreakdown["metadataMatches"] | undefined,
  key: keyof NonNullable<VisualScoreBreakdown["metadataMatches"]>,
) {
  const value = matches?.[key];

  return Array.isArray(value) ? value : value ? [value] : [];
}

async function visualLibraryMatchSummary(asset: VisualAsset) {
  const matches = asset.scoreBreakdown.metadataMatches;
  const penalties = Array.isArray(asset.scoreBreakdown.penalties)
    ? asset.scoreBreakdown.penalties
    : [];
  const storagePath =
    asset.storagePath || storagePathFromAssetUrl(asset.publicUrl);
  const bucketName = asset.bucketName || VISUAL_LIBRARY_BUCKET;
  const assetUrl = metadataStringValue(asset.metadata, [
    "asset_url",
    "assetUrl",
    "url",
    "image_url",
    "imageUrl",
  ]);
  const preview = await signedVisualAssetPreviewUrl({
    assetUrl,
    assetId: asset.id,
    bucketName,
    fileName: asset.fileName,
    publicUrl: asset.publicUrl,
    storagePath,
  });

  return {
    asset_id: asset.id,
    assetId: asset.id,
    bucket_name: preview.bucketName,
    bucketName: preview.bucketName,
    emotionMatched: metadataMatchValue(matches, "emotion"),
    file_name: asset.fileName,
    fileName: asset.fileName,
    asset_url: assetUrl,
    imageUrl: preview.previewUrl || asset.publicUrl || assetUrl,
    publicUrl: asset.publicUrl,
    pertinenceScore: scoreOutOf100(asset.score),
    preview_url: preview.previewUrl,
    previewUrl: preview.previewUrl,
    reason: asset.scoreReason,
    resolution_method: preview.resolutionMethod,
    resolutionMethod: preview.resolutionMethod,
    scoreBreakdown: {
      characterMatch: asset.scoreBreakdown.characterMatch ?? 0,
      ambianceMatch: asset.scoreBreakdown.ambianceMatch ?? 0,
      emotionMatch: asset.scoreBreakdown.emotionMatch ?? 0,
      gptVisionScoreBonus: asset.scoreBreakdown.visionScoreBonus ?? 0,
      styleMatch: asset.scoreBreakdown.styleMatch ?? 0,
      tagsMatch: asset.scoreBreakdown.tagsMatch ?? 0,
      themeMatch: asset.scoreBreakdown.themeMatch ?? 0,
    },
    subject_score: asset.scoreBreakdown.subject_score ?? 0,
    location_score: asset.scoreBreakdown.location_score ?? 0,
    mood_score: asset.scoreBreakdown.mood_score ?? 0,
    style_score: asset.scoreBreakdown.style_score ?? 0,
    action_score: asset.scoreBreakdown.action_score ?? 0,
    theme_score: asset.scoreBreakdown.theme_score ?? 0,
    penalties,
    matched_tags: asset.scoreBreakdown.matched_tags ?? [],
    rejected_because: asset.scoreBreakdown.rejected_because ?? null,
    storage_path: preview.storagePath,
    storagePath: preview.storagePath,
    tagsMatched: metadataMatchValue(matches, "tags"),
    themeMatched: metadataMatchValue(matches, "theme"),
    visualStyleMatched: metadataMatchValue(matches, "visualStyle"),
  };
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
  assetsTotal = assetsFound,
  assetsWithMetadata = 0,
  fallbackReason = "unknown",
  assetsRejected = 0,
  assetsScored = 0,
  bestAssetId = null,
  assetsSelected,
  bestCandidate = null,
  bestCandidateScore,
  fallbackTriggered,
  generationRequested,
  generationStartedAt = null,
  generationSource,
  generationStatus,
  rejectionReason = "",
  selectionReason = "",
  searchDurationMs = 0,
  selectionDecision,
}: {
  assetsFound: number;
  assetsTotal?: number;
  assetsWithMetadata?: number;
  fallbackReason?: "no_assets" | "no_metadata" | "no_candidates" | "score_too_low" | "timeout" | "supabase_error" | "unknown";
  assetsRejected?: number;
  assetsScored?: number;
  bestAssetId?: string | null;
  assetsSelected: number;
  bestCandidate?: string | null;
  bestCandidateScore: number;
  fallbackTriggered: boolean;
  generationRequested: boolean;
  generationStartedAt?: string | null;
  generationSource: GenerationSource;
  generationStatus: GenerationStatus;
  rejectionReason?: string;
  selectionReason?: string;
  searchDurationMs?: number;
  selectionDecision: string;
}) {
  return {
    assetsFound,
    assetsTotal,
    assetsWithMetadata,
    assetsRejected,
    assetsScored,
    assetsSelected,
    bestAssetId,
    bestCandidate,
    bestCandidateScore,
    bestFileName: bestCandidate,
    bestScore: bestCandidateScore,
    fallbackReason,
    search_duration_ms: searchDurationMs,
    searchDurationMs,
    fallbackTriggered,
    generationRequested,
    generationStartedAt,
    generationSource,
    generationStatus,
    rejectionReason,
    selectionReason,
    selectionDecision,
    selectionThreshold: VISUAL_SELECTION_THRESHOLD,
  };
}

function libraryFallbackReasonFromError(error: unknown) {
  if (error instanceof MediaPipelineError) {
    if (error.context.validation?.includes("timeout")) {
      return "timeout" as const;
    }
    if (error.context.validation?.startsWith("content_assets.")) {
      return "supabase_error" as const;
    }
  }

  const message = error instanceof Error ? error.message : String(error);
  if (message.toLowerCase().includes("timeout")) {
    return "timeout" as const;
  }
  if (message.toLowerCase().includes("supabase") || message.toLowerCase().includes("content_assets")) {
    return "supabase_error" as const;
  }

  return "unknown" as const;
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
    const usedAssetIds = await usedVisualAssetIdsForDraft(draft, sceneIndex);
    suggestions = await withTimeout({
      draftId: draft.id,
      label: "Recherche bibliotheque",
      promise: scoreLibraryForDraft(draft, sceneIndex - 1, usedAssetIds),
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
    const fallbackReason = libraryFallbackReasonFromError(error);
    await upsertVisualScene({
      draft,
      errorMessage: `Aucun visuel pertinent trouve. Recherche bibliotheque trop lente. ${message}`,
      generationQuality,
      generationSource: "library",
      generationStatus: "error",
      scoreBreakdown: visualSceneSelectionDebug({
        assetsFound: 0,
        assetsScored: 0,
        assetsSelected: 0,
        assetsTotal: 0,
        bestCandidateScore: 0,
        fallbackReason,
        fallbackTriggered: true,
        generationRequested: false,
        generationSource: "library",
        generationStatus: "error",
        searchDurationMs: Date.now() - startedAt,
        selectionDecision: "timeout",
      }),
      scoreSource: "none",
      visualPromptIndex: sceneIndex,
    });
    logVisualSceneStatusTransition({
      draftId: draft.id,
      elapsedMs: Date.now() - startedAt,
      newStatus: "error",
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
      step: "asset_not_found",
    });
    return false;
  }

  const candidates = suggestions.slice(0, 5);
  const topLibraryMatches = await Promise.all(candidates.map(visualLibraryMatchSummary));
  const assetsWithMetadata = suggestions.filter((asset) =>
    hasEnrichedVisualMetadata(asset.metadata),
  ).length;
  let bestCandidateScore = candidates.length
    ? Math.max(...candidates.map((asset) => scoreOutOf100(asset.score)))
    : 0;
  let bestCandidate: VisualAsset | null = candidates
    .slice()
    .sort((left, right) => right.score - left.score)[0] ?? null;
  let lastRejectionReason = "";

  for (const asset of candidates) {
    const scoreBreakdown: Record<string, unknown> = {
      ...asset.scoreBreakdown,
      selection_source: "library_metadata",
    };
    const scoreTotal = asset.score;
    bestCandidateScore = Math.max(bestCandidateScore, scoreOutOf100(scoreTotal));
    if (!bestCandidate || scoreTotal > bestCandidate.score) {
      bestCandidate = asset;
    }

    const decision = libraryVisionDecision(scoreBreakdown);
    const reason = visualSelectionReason(decision, scoreBreakdown);
    if (decision === "rejected") {
      lastRejectionReason = reason;
    }

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
          libraryMatches: topLibraryMatches,
          libraryRelevant: bestCandidateScore >= VISUAL_LIBRARY_RELEVANCE_THRESHOLD,
          libraryRelevanceThreshold: VISUAL_LIBRARY_RELEVANCE_THRESHOLD,
          ...visualSceneSelectionDebug({
            assetsFound: suggestions.length,
            assetsRejected: Math.max(0, candidates.length - 1),
            assetsScored: candidates.length,
            assetsSelected: 1,
            assetsTotal: suggestions.length,
            assetsWithMetadata,
            bestAssetId: asset.id,
            bestCandidate: asset.fileName,
            bestCandidateScore: scoreOutOf100(scoreTotal),
            fallbackReason: "unknown",
            fallbackTriggered: false,
            generationRequested: false,
            generationSource: "library",
            generationStatus: "ready",
            searchDurationMs: Date.now() - startedAt,
            selectionReason: reason,
            selectionDecision: decision,
          }),
          selection_decision: decision,
          selection_reason: reason,
        },
        scoreSource: "heuristic",
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
        model: "metadata",
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
        ? "Aucun visuel pertinent trouve dans la bibliotheque."
        : "Aucun visuel disponible dans la bibliotheque.",
    generationQuality,
    generationSource: "library",
    generationStatus: "error",
    scoreBreakdown: {
      libraryMatches: topLibraryMatches,
      libraryRelevant: bestCandidateScore >= VISUAL_LIBRARY_RELEVANCE_THRESHOLD,
      libraryRelevanceThreshold: VISUAL_LIBRARY_RELEVANCE_THRESHOLD,
      ...visualSceneSelectionDebug({
        assetsFound: suggestions.length,
        assetsTotal: suggestions.length,
        assetsWithMetadata,
        assetsRejected: candidates.length,
        assetsScored: candidates.length,
        assetsSelected: 0,
        bestAssetId: bestCandidate?.id ?? null,
        bestCandidate: bestCandidate?.fileName ?? null,
        bestCandidateScore,
        fallbackReason:
          suggestions.length === 0
            ? "no_assets"
            : assetsWithMetadata === 0
              ? "no_metadata"
              : candidates.length === 0
                ? "no_candidates"
                : bestCandidateScore < VISUAL_LIBRARY_RELEVANCE_THRESHOLD
                  ? "score_too_low"
                  : "unknown",
        fallbackTriggered: true,
        generationRequested: false,
        generationStartedAt: null,
        generationSource: "library",
        generationStatus: "error",
        searchDurationMs: Date.now() - startedAt,
        rejectionReason:
          lastRejectionReason ||
          (suggestions.length > 0
            ? `Meilleur score ${bestCandidateScore}/100 sous le seuil ${VISUAL_LIBRARY_RELEVANCE_THRESHOLD}/100.`
            : "Bibliotheque vide."),
        selectionDecision: suggestions.length > 0 ? "asset_not_relevant" : "library_empty",
      }),
    },
    scoreSource: "none",
    visualPromptIndex: sceneIndex,
  });
  logVisualPipeline({
    action: "library_search",
    draftId: draft.id,
    durationMs: Date.now() - startedAt,
    endpoint: "content_assets.library",
    error: "Aucun candidat bibliotheque n'atteint 60/100 avec concepts coherents.",
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
  allowGeneration = false,
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
  allowGeneration?: boolean;
  skipLibrary?: boolean;
}) {
  const prompt = parseVisualPrompts(
    draft.visual_prompt ?? "",
    requiredVisualSceneCountForDraft(draft),
  )[sceneIndex - 1] ?? "";

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

  if (!allowGeneration) {
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
    scene.generationStatus === "searching_library" ||
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
  allowGeneration = false,
  draft,
  generationQuality,
  generationSource,
  onlyBlocked = false,
  skipLibrary = false,
}: {
  allowGeneration?: boolean;
  draft: DraftRow;
  generationQuality: GenerationQuality;
  generationSource: GenerationSource;
  onlyBlocked?: boolean;
  skipLibrary?: boolean;
}) {
  const currentScenes = await readVisualScenes(draft);
  const prompts = parseVisualPrompts(draft.visual_prompt ?? "", currentScenes.length || requiredVisualSceneCountForDraft(draft));
  const targetScenes = currentScenes.filter((scene) =>
    onlyBlocked ? shouldRetryVisualScene(scene) : !scene.locked && shouldRetryVisualScene(scene),
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
      allowGeneration,
      draft,
      generationQuality,
      generationSource,
      sceneIndex: scene.visualPromptIndex,
      skipLibrary,
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
  const currentScenes = await readVisualScenes(draft);
  const prompts = parseVisualPrompts(draft.visual_prompt ?? "", currentScenes.length || requiredVisualSceneCountForDraft(draft));

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

async function enrichStoredLibraryMatches(matches: unknown) {
  if (!Array.isArray(matches)) {
    return matches;
  }

  const assetIds = matches
    .map((match) => {
      if (!match || typeof match !== "object") {
        return "";
      }
      const record = match as Record<string, unknown>;
      return typeof record.assetId === "string"
        ? record.assetId
        : typeof record.asset_id === "string"
          ? record.asset_id
          : "";
    })
    .filter((assetId): assetId is string => Boolean(assetId));
  const assetById = new Map<string, ContentAssetRow>();
  const supabase = getMediaPipelineClient();

  if (assetIds.length > 0) {
    const { data } = await supabase
      .from("content_assets")
      .select(
        "id, asset_type, file_name, bucket_name, storage_path, public_url, source, status, metadata, usage_count, linked_draft_id, created_at",
      )
      .in("id", assetIds)
      .returns<ContentAssetRow[]>();

    (data ?? []).map(normalizedLibraryAsset).forEach((asset) => {
      assetById.set(asset.id, asset);
    });
  }

  return Promise.all(
    matches.map(async (match) => {
      if (!match || typeof match !== "object") {
        return match;
      }

      const record = match as Record<string, unknown>;
      const assetId =
        typeof record.assetId === "string"
          ? record.assetId
          : typeof record.asset_id === "string"
            ? record.asset_id
            : "";
      const asset = assetById.get(assetId);
      const fileName =
        asset?.file_name ||
        (typeof record.fileName === "string"
          ? record.fileName
          : typeof record.file_name === "string"
            ? record.file_name
            : "");
      const bucketName =
        asset?.bucket_name ||
        (typeof record.bucketName === "string"
          ? record.bucketName
          : typeof record.bucket_name === "string"
            ? record.bucket_name
            : VISUAL_LIBRARY_BUCKET);
      const publicUrl =
        asset?.public_url ||
        (typeof record.publicUrl === "string"
          ? record.publicUrl
          : typeof record.public_url === "string"
            ? record.public_url
            : typeof record.imageUrl === "string"
              ? record.imageUrl
              : "");
      const assetUrl =
        metadataStringValue(asset?.metadata ?? {}, [
          "asset_url",
          "assetUrl",
          "url",
          "image_url",
          "imageUrl",
        ]) ||
        (typeof record.asset_url === "string" ? record.asset_url : "");
      const storagePath =
        asset?.storage_path ||
        (typeof record.storagePath === "string"
          ? record.storagePath
          : typeof record.storage_path === "string"
            ? record.storage_path
            : storagePathFromAssetUrl(publicUrl) || storagePathFromAssetUrl(assetUrl));
      const preview = await signedVisualAssetPreviewUrl({
        assetId,
        assetUrl,
        bucketName,
        fileName,
        publicUrl,
        storagePath,
      });

      return {
        ...record,
        asset_id: assetId,
        assetId,
        asset_url: assetUrl,
        bucket_name: preview.bucketName,
        bucketName: preview.bucketName,
        file_name: fileName,
        fileName,
        imageUrl: preview.previewUrl || publicUrl || assetUrl,
        publicUrl,
        preview_url: preview.previewUrl,
        previewUrl: preview.previewUrl,
        resolution_method: preview.resolutionMethod,
        resolutionMethod: preview.resolutionMethod,
        storage_path: preview.storagePath,
        storagePath: preview.storagePath,
      };
    }),
  );
}

async function enrichVisualSceneLibraryMatches(scene: VisualScene) {
  const libraryMatches = await enrichStoredLibraryMatches(scene.scoreBreakdown.libraryMatches);

  if (!Array.isArray(libraryMatches)) {
    return scene;
  }

  return {
    ...scene,
    scoreBreakdown: {
      ...scene.scoreBreakdown,
      libraryMatches,
    },
  };
}

function defaultVisualScenes(draft: DraftRow): VisualScene[] {
  const requiredSceneCount = requiredVisualSceneCountForDraft(draft);
  const prompts = parseVisualPrompts(draft.visual_prompt ?? "", requiredSceneCount);
  const now = new Date().toISOString();

  return Array.from({ length: requiredSceneCount }, (_, index) => ({
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
      "id, user_id, theme, angle, hook, script, title, caption, hashtags, visual_prompt, voice_style, status, protected, protected_at, visual_status, visuals_validated_at, score",
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
    .map(normalizedLibraryAsset)
    .filter((asset) => isCanonicalVisualAsset(asset))
    .slice(0, 120);
}

async function scoreLibraryForDraft(
  draft: DraftRow,
  sceneIndex?: number | null,
  usedAssetIds?: Set<string>,
) {
  const assets = await readLibraryAssets();

  return assets
    .map((asset) => {
      const { score, reason, scoreBreakdown } = scoreAsset(draft, asset, sceneIndex, {
        usedAssetIds,
      });
      return mapAsset(asset, score, reason, scoreBreakdown);
    })
    .sort((a, b) => b.score - a.score || a.usageCount - b.usageCount);
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

  const requiredSceneCount = requiredVisualSceneCountForScenes(draft, normalizedRows);
  const defaultScenes = Array.from({ length: requiredSceneCount }, (_, index) => {
    const prompts = parseVisualPrompts(draft.visual_prompt ?? "", requiredSceneCount);
    const now = new Date().toISOString();
    return {
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
    };
  });
  const byIndex = new Map(
    normalizedRows.map((scene) => [
      scene.visual_prompt_index,
      mapVisualScene(scene),
    ]),
  );

  const scenes = defaultScenes.map(
    (scene) => byIndex.get(scene.visualPromptIndex) ?? scene,
  );

  return Promise.all(scenes.map(enrichVisualSceneLibraryMatches));
}

async function usedVisualAssetIdsForDraft(draft: DraftRow, currentSceneIndex: number) {
  const usedAssetIds = new Set<string>();
  const scenes = await readVisualScenes(draft);

  for (const scene of scenes) {
    if (scene.visualPromptIndex === currentSceneIndex) {
      continue;
    }

    if (scene.assetId) {
      usedAssetIds.add(scene.assetId);
    }

    const matches = scene.scoreBreakdown.libraryMatches;
    if (!Array.isArray(matches)) {
      continue;
    }

    for (const match of matches) {
      if (
        match &&
        typeof match === "object" &&
        "assetId" in match &&
        typeof match.assetId === "string"
      ) {
        usedAssetIds.add(match.assetId);
      }
    }
  }

  return usedAssetIds;
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
  const prompts = parseVisualPrompts(draft.visual_prompt ?? "", requiredVisualSceneCountForDraft(draft));
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
    visualPrompts: parseVisualPrompts(
      draft.visual_prompt ?? "",
      requiredVisualSceneCountForDraft(draft),
    ).filter(Boolean),
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
  const requiredSceneCount = initialScenes.length || requiredVisualSceneCountForDraft(draft);
  const selectedAssets = relevantAssets.slice(0, requiredSceneCount);
  const hasEnoughLibraryAssets = relevantAssets.length >= Math.min(3, requiredSceneCount);
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
    matched_assets: relevantAssets.slice(0, requiredSceneCount).map((asset) => ({
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
    generationRequested: false,
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
    allowGeneration: true,
    draft,
    generationQuality: normalizedGenerationQuality,
    generationSource: "generated",
    skipLibrary: true,
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
        errorMessage: "Aucun visuel pertinent trouve.",
        generationQuality: normalizedGenerationQuality,
        generationSource: "library",
        generationStatus: "error",
        scoreSource: "none",
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
  const scenes = await readVisualScenes(draft);
  const normalizedSceneIndex = normalizeVisualSceneIndex(draft, sceneIndex, scenes);
  const scene = scenes.find(
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
    allowGeneration: true,
    draft,
    generationQuality: normalizedGenerationQuality,
    generationSource: "regenerated",
    sceneIndex: normalizedSceneIndex,
    skipLibrary: true,
  });

  return readMediaPipelineState({ draftId, userId, includeSuggestions: true });
}

export async function retryDraftVisualSceneSearch({
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
  const scenes = await readVisualScenes(draft);
  const normalizedSceneIndex = normalizeVisualSceneIndex(draft, sceneIndex, scenes);
  const scene = scenes.find(
    (item) => item.visualPromptIndex === normalizedSceneIndex,
  );

  if (!isDraftValidatedForMedia(draft.status)) {
    throw new MediaPipelineError("Valide le brouillon avant de relancer la recherche.", {
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
    allowGeneration: false,
    draft,
    generationQuality: normalizedGenerationQuality,
    generationSource: "library",
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
  const scenes = await readVisualScenes(draft);
  const normalizedSceneIndex = normalizeVisualSceneIndex(draft, sceneIndex, scenes);
  const scene = scenes.find(
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
  const scenes = await readVisualScenes(draft);
  const normalizedSceneIndex = normalizeVisualSceneIndex(draft, sceneIndex, scenes);
  const scene = scenes.find(
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
  const scenes = await readVisualScenes(draft);
  const normalizedSceneIndex = normalizeVisualSceneIndex(draft, sceneIndex, scenes);
  const scene = scenes.find(
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

export async function selectDraftVisualSceneAsset({
  assetId,
  draftId,
  sceneIndex,
  userId,
}: {
  assetId: string;
  draftId: string;
  sceneIndex: number;
  userId: string;
}) {
  const draft = await readDraft(draftId, userId);
  const scenes = await readVisualScenes(draft);
  const normalizedSceneIndex = normalizeVisualSceneIndex(draft, sceneIndex, scenes);

  if (!isDraftValidatedForMedia(draft.status)) {
    throw new MediaPipelineError("Valide le brouillon avant de preparer les medias.", {
      draftId,
      draftStatus: draft.status,
      validation: "draft.status",
    });
  }
  assertDraftVisualsCanChange(draft, draftId);

  const existingScene = scenes.find(
    (scene) => scene.visualPromptIndex === normalizedSceneIndex,
  );

  if (existingScene?.locked) {
    throw new MediaPipelineError("Cette scene est verrouillee. Clique sur Modifier avant de la modifier.", {
      draftId,
      sceneIndex: normalizedSceneIndex,
      validation: "visual_scene.locked",
    });
  }

  const asset = await readAssetById(assetId);
  const { score, reason, scoreBreakdown } = scoreAsset(
    draft,
    asset,
    normalizedSceneIndex - 1,
  );
  const selectionReason = `Selection manuelle bibliotheque. ${reason}`.trim();

  await upsertVisualScene({
    assetId: asset.id,
    draft,
    errorMessage: null,
    generationQuality: existingScene?.generationQuality ?? "medium",
    generationSource: "library",
    generationStatus: "ready",
    imageUrl: asset.public_url,
    locked: false,
    retainedAt: null,
    retainedBy: null,
    scoreBreakdown: {
      ...scoreBreakdown,
      manual_selection: true,
      selection_decision: "manual_library_selection",
      selection_reason: selectionReason,
    },
    scoreSource: "heuristic",
    scoreTotal: score,
    storagePath: asset.storage_path,
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
  const requiredSceneCount = scenes.length || requiredVisualSceneCountForDraft(draft);

  if (retainedScenes.length !== requiredSceneCount) {
    throw new MediaPipelineError(`${retainedScenes.length}/${requiredSceneCount} visuels retenus.`, {
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
  const normalizedOrder = Math.max(
    1,
    Math.min(requiredVisualSceneCountForDraft(draft), Math.round(usageOrder)),
  );

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
