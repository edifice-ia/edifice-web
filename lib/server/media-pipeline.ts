import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { parseVisualPrompts } from "@/lib/content/visual-prompts";

type MediaPipelineStatus =
  | "draft"
  | "validated"
  | "media_preparing"
  | "media_ready"
  | "ready_to_publish";

type VisualDecisionMode = "reuse_existing" | "generate_new";
type AssetSource = "library" | "generated";
type GenerationSource = "library" | "generated" | "regenerated";
type GenerationQuality = "low" | "medium" | "high";
type GenerationStatus =
  | "pending"
  | "generated"
  | "failed"
  | "selected"
  | "retained"
  | "rejected";
type ScoreSource = "heuristic" | "gpt_vision" | "none";

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
};

type MediaPipelineErrorContext = {
  draftId?: string;
  draftStatus?: string | null;
  contentAssetsCount?: number;
  mediaPipelineStatus?: MediaPipelineStatus;
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
  generation_source: GenerationSource;
  generation_quality: GenerationQuality | null;
  generation_status: GenerationStatus;
  image_url: string | null;
  storage_path: string | null;
  score_total: number | null;
  score_breakdown: Record<string, unknown>;
  score_source: ScoreSource;
  error_message: string | null;
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

function extractBase64Image(payload: unknown) {
  const record = payload && typeof payload === "object"
    ? payload as Record<string, unknown>
    : {};
  const data = Array.isArray(record.data) ? record.data : [];

  for (const item of data) {
    const image = item && typeof item === "object"
      ? item as Record<string, unknown>
      : {};

    if (typeof image.b64_json === "string" && image.b64_json) {
      return image.b64_json;
    }
  }

  throw new MediaPipelineError("OpenAI n'a pas renvoye d'image exploitable.", {
    validation: "openai.image.empty",
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

  if (!apiKey) {
    throw new MediaPipelineError(
      "OPENAI_API_KEY est requis pour generer les visuels Shorts.",
      {
        draftId: draft.id,
        validation: "openai.api_key.missing",
      },
    );
  }

  const response = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: imageGenerationModel(),
      prompt: [
        "Vertical 9:16 photorealistic cinematic frame for a short video.",
        "No text, no subtitles, no logo, no watermark.",
        `Draft title: ${draft.title ?? draft.theme ?? "Shorts"}.`,
        `Narrative angle: ${draft.angle ?? "intimate cinematic story"}.`,
        `Scene ${sceneIndex}: ${prompt}`,
      ].join("\n"),
      size: "1024x1536",
      quality,
      n: 1,
      response_format: "b64_json",
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new MediaPipelineError(
      `Generation OpenAI impossible: ${text.slice(0, 300)}`,
      {
        draftId: draft.id,
        validation: "openai.image_generation",
      },
    );
  }

  return Buffer.from(extractBase64Image(await response.json()), "base64");
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
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const fileName = `shorts-scene-${sceneIndex}-${timestamp}.png`;
  const storagePath = `drafts/${draft.id}/images/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from("content-assets")
    .upload(storagePath, bytes, {
      contentType: "image/png",
      upsert: true,
    });

  if (uploadError) {
    throw new MediaPipelineError(
      `Upload du visuel genere impossible: ${uploadError.message}`,
      {
        draftId: draft.id,
        validation: "supabase.storage.upload",
      },
    );
  }

  const { data: publicUrlData } = supabase.storage
    .from("content-assets")
    .getPublicUrl(storagePath);

  const publicUrl = publicUrlData.publicUrl;
  const { data, error } = await supabase
    .from("content_assets")
    .insert({
      asset_type: "image",
      file_name: fileName,
      bucket_name: "content-assets",
      storage_path: storagePath,
      public_url: publicUrl,
      source: "shorts_visual_generation",
      status: "available",
      linked_draft_id: draft.id,
      metadata: {
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
      validation: "content_assets.generated_insert",
    });
  }

  return data;
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
    total: normalizeVisionScore(parsed.total, 100),
    prompt_image: normalizeVisionScore(parsed.prompt_image, 30),
    image_draft: normalizeVisionScore(parsed.image_draft, 25),
    quality: normalizeVisionScore(parsed.quality, 20),
    continuity: normalizeVisionScore(parsed.continuity, 15),
    safety_style: normalizeVisionScore(parsed.safety_style, 10),
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

  if (!apiKey) {
    throw new MediaPipelineError(
      "OPENAI_API_KEY est requis pour analyser les visuels avec Vision.",
      {
        draftId: draft.id,
        validation: "openai.api_key.missing",
      },
    );
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: visionScoringModel(),
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: [
                "Analyse cette image pour un Short L'Edifice.",
                "Compare l'image au prompt, au script, et a la position narrative.",
                "Retourne uniquement ce JSON strict:",
                '{"total":number,"prompt_image":number,"image_draft":number,"quality":number,"continuity":number,"safety_style":number,"decision":"retain|review|reject","reason":"courte explication","warnings":[]}',
                "Baremes: prompt_image /30, image_draft /25, quality /20, continuity /15, safety_style /10, total /100.",
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
  });

  if (!response.ok) {
    const text = await response.text();
    throw new MediaPipelineError(
      `Analyse Vision impossible: ${text.slice(0, 300)}`,
      {
        draftId: draft.id,
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
      validation: "openai.vision_empty",
    });
  }

  return parseVisionJson(content);
}

function visionScoreToBreakdown(score: ReturnType<typeof parseVisionJson>) {
  return {
    total: score.total,
    promptImage: score.prompt_image,
    imageDraft: score.image_draft,
    visualQuality: score.quality,
    narrativeContinuity: score.continuity,
    editorialSafety: score.safety_style,
    estimatedWithoutVision: false,
    reason: score.reason,
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
  const supabase = getMediaPipelineClient();
  const { data } = await supabase
    .from("content_assets")
    .select("metadata")
    .eq("id", assetId)
    .maybeSingle<{ metadata: Record<string, unknown> }>();

  await supabase
    .from("content_assets")
    .update({
      metadata: {
        ...(data?.metadata ?? {}),
        score_breakdown: scoreBreakdown,
        score_source: scoreSource,
      },
    })
    .eq("id", assetId);
}

async function fallbackLibraryScene({
  draft,
  errorMessage,
  generationQuality,
  sceneIndex,
}: {
  draft: DraftRow;
  errorMessage: string;
  generationQuality: GenerationQuality;
  sceneIndex: number;
}) {
  const suggestions = await scoreLibraryForDraft(draft);
  const asset =
    suggestions.find(
      (item) => item.scoreBreakdown.sceneIndex === sceneIndex - 1,
    ) ?? suggestions[sceneIndex - 1] ?? suggestions[0] ?? null;

  if (!asset) {
    await upsertVisualScene({
      draft,
      errorMessage,
      generationQuality,
      generationSource: "library",
      generationStatus: "failed",
      scoreSource: "none",
      visualPromptIndex: sceneIndex,
    });
    return;
  }

  await upsertVisualScene({
    assetId: asset.id,
    draft,
    errorMessage,
    generationQuality,
    generationSource: "library",
    generationStatus: "selected",
    imageUrl: asset.publicUrl,
    scoreBreakdown: asset.scoreBreakdown,
    scoreSource: "heuristic",
    scoreTotal: asset.score,
    storagePath: asset.storagePath,
    visualPromptIndex: sceneIndex,
  });
}

async function generateSceneVisual({
  draft,
  generationQuality,
  generationSource,
  sceneIndex,
}: {
  draft: DraftRow;
  generationQuality: GenerationQuality;
  generationSource: GenerationSource;
  sceneIndex: number;
}) {
  const prompt = parseVisualPrompts(draft.visual_prompt ?? "")[sceneIndex - 1] ?? "";

  await upsertVisualScene({
    draft,
    generationQuality,
    generationSource,
    generationStatus: "pending",
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
    const asset = await storeGeneratedImage({
      bytes,
      draft,
      generationSource,
      generationQuality,
      prompt,
      sceneIndex,
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
      scoreTotal = visionScore.total;
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
      scoreBreakdown,
      scoreSource,
    });
    await upsertVisualScene({
      assetId: asset.id,
      draft,
      generationQuality,
      generationSource,
      generationStatus: "generated",
      imageUrl: asset.public_url,
      scoreBreakdown,
      scoreSource,
      scoreTotal,
      storagePath: asset.storage_path,
      visualPromptIndex: sceneIndex,
    });
  } catch (error) {
    await fallbackLibraryScene({
      draft,
      errorMessage: error instanceof Error ? error.message : String(error),
      generationQuality,
      sceneIndex,
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
    generationSource: row.generation_source,
    generationQuality: normalizeGenerationQuality(row.generation_quality),
    generationStatus: row.generation_status,
    imageUrl: row.image_url,
    storagePath: row.storage_path,
    scoreTotal: row.score_total,
    scoreBreakdown: row.score_breakdown ?? {},
    scoreSource: row.score_source,
    errorMessage: row.error_message,
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
  return status === "approved" || status === "validated" || status === "ready_to_publish";
}

async function readDraft(draftId: string, userId: string) {
  const supabase = getMediaPipelineClient();
  const { data, error } = await supabase
    .from("content_drafts")
    .select(
      "id, user_id, theme, angle, hook, script, title, caption, hashtags, visual_prompt, voice_style, status",
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
    .eq("status", "available")
    .order("usage_count", { ascending: true })
    .order("created_at", { ascending: false })
    .limit(120)
    .returns<ContentAssetRow[]>();

  if (error) {
    throw new MediaPipelineError(
      `Lecture de la bibliotheque visuelle impossible: ${error.message}`,
      {
        validation: "content_assets.select",
      },
    );
  }

  return data ?? [];
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
      "id, draft_id, asset_id, visual_prompt_index, visual_prompt_text, generation_source, generation_quality, generation_status, image_url, storage_path, score_total, score_breakdown, score_source, error_message, created_at, updated_at",
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

  const byIndex = new Map(
    (data ?? []).map((scene) => [scene.visual_prompt_index, mapVisualScene(scene)]),
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
  userId,
}: {
  draftId: string;
  userId: string;
}) {
  const draft = await readDraft(draftId, userId);

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
    generationRequested: false,
    generationReason: null,
  });
  await replaceSelectedAssets({
    draftId,
    assets: hasEnoughLibraryAssets ? selectedAssets : [],
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

  const generationInput = buildVisualGenerationInput(draft);
  const prompts = parseVisualPrompts(draft.visual_prompt ?? "");

  for (let index = 1; index <= 7; index += 1) {
    if (prompts[index - 1]?.trim()) {
      await generateSceneVisual({
        draft,
        generationQuality: normalizedGenerationQuality,
        generationSource: "generated",
        sceneIndex: index,
      });
    }
  }

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
            : scene.errorMessage ?? "Scene visuelle preparee.",
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

  if (!isDraftValidatedForMedia(draft.status)) {
    throw new MediaPipelineError("Valide le brouillon avant de regenerer une scene.", {
      draftId,
      draftStatus: draft.status,
      validation: "draft.status",
    });
  }

  await generateSceneVisual({
    draft,
    generationQuality: normalizedGenerationQuality,
    generationSource: "regenerated",
    sceneIndex: Math.max(1, Math.min(7, Math.round(sceneIndex))),
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

  await upsertVisualScene({
    assetId: scene.assetId,
    draft,
    generationQuality: scene.generationQuality,
    generationSource: scene.generationSource,
    generationStatus: status,
    imageUrl: scene.imageUrl,
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
  }

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
