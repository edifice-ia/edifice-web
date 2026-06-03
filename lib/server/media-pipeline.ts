import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

type MediaPipelineStatus =
  | "draft"
  | "validated"
  | "media_preparing"
  | "media_ready"
  | "ready_to_publish";

type VisualDecisionMode = "reuse_existing" | "generate_new";
type AssetSource = "library" | "generated";

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
  draft_id: string;
  media_pipeline_status: MediaPipelineStatus;
  visual_decision: VisualDecision;
  created_at: string;
  updated_at: string;
};

type AssetLinkRow = {
  id: string;
  draft_id: string;
  asset_id: string | null;
  asset_source: AssetSource;
  score: number;
  usage_order: number;
  created_at: string;
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
  }>;
  missing_visual_needs: string[];
};

export type MediaPipelineState = {
  mediaPipelineStatus: MediaPipelineStatus;
  visualDecision: VisualDecision | null;
  selectedAssets: SelectedDraftAsset[];
  suggestedAssets: VisualAsset[];
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

  return tokenize(
    [
      asset.file_name,
      asset.storage_path,
      asset.source,
      metadataKeywords.join(" "),
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

function scoreAsset(draftTokens: string[], asset: ContentAssetRow) {
  const keywords = assetKeywords(asset);
  const matches = keywords.filter((keyword) => draftTokens.includes(keyword));
  const keywordScore = Math.min(matches.length * 16, 72);
  const eliteBonus = asset.storage_path.includes("lignes-interieures/elite")
    ? 10
    : 0;
  const statusBonus = asset.status === "available" ? 8 : 0;
  const score = Math.min(keywordScore + eliteBonus + statusBonus, 100);
  const reason =
    matches.length > 0
      ? `Correspondances: ${matches.slice(0, 5).join(", ")}.`
      : "Visuel disponible dans la bibliotheque Elite, coherence a valider manuellement.";

  return { score, reason };
}

function mapAsset(asset: ContentAssetRow, score = 0, scoreReason = ""): VisualAsset {
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
  };
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
    throw new Error(`Lecture du brouillon impossible: ${error.message}`);
  }

  if (!data) {
    throw new Error("Brouillon introuvable ou non autorise.");
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
    throw new Error(`Lecture de la bibliotheque visuelle impossible: ${error.message}`);
  }

  return data ?? [];
}

async function scoreLibraryForDraft(draft: DraftRow) {
  const draftTokens = tokenize(draftSearchText(draft));
  const assets = await readLibraryAssets();

  return assets
    .map((asset) => {
      const { score, reason } = scoreAsset(draftTokens, asset);
      return mapAsset(asset, score, reason);
    })
    .sort((a, b) => b.score - a.score || a.usageCount - b.usageCount)
    .slice(0, 12);
}

async function readPlan(draftId: string) {
  const supabase = getMediaPipelineClient();
  const { data, error } = await supabase
    .from("content_draft_media_plans")
    .select("draft_id, media_pipeline_status, visual_decision, created_at, updated_at")
    .eq("draft_id", draftId)
    .maybeSingle<MediaPlanRow>();

  if (error) {
    throw new Error(`Lecture du plan media impossible: ${error.message}`);
  }

  return data;
}

async function readSelectedAssets(draftId: string) {
  const supabase = getMediaPipelineClient();
  const { data: links, error } = await supabase
    .from("content_draft_asset_links")
    .select("id, draft_id, asset_id, asset_source, score, usage_order, created_at")
    .eq("draft_id", draftId)
    .order("usage_order", { ascending: true })
    .returns<AssetLinkRow[]>();

  if (error) {
    throw new Error(`Lecture des visuels selectionnes impossible: ${error.message}`);
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
    throw new Error(`Lecture des assets selectionnes impossible: ${assetError.message}`);
  }

  const assetById = new Map((assets ?? []).map((asset) => [asset.id, asset]));

  return (links ?? [])
    .map((link) => {
      const asset = link.asset_id ? assetById.get(link.asset_id) : null;
      if (!asset) {
        return null;
      }

      return {
        ...mapAsset(asset, Number(link.score), "Selection persistante du brouillon."),
        linkId: link.id,
        assetSource: link.asset_source,
        usageOrder: link.usage_order,
      };
    })
    .filter((asset): asset is SelectedDraftAsset => Boolean(asset));
}

async function savePlan({
  draftId,
  mediaPipelineStatus,
  visualDecision,
}: {
  draftId: string;
  mediaPipelineStatus: MediaPipelineStatus;
  visualDecision: VisualDecision;
}) {
  const supabase = getMediaPipelineClient();
  const { error } = await supabase
    .from("content_draft_media_plans")
    .upsert({
      draft_id: draftId,
      media_pipeline_status: mediaPipelineStatus,
      visual_decision: visualDecision,
    });

  if (error) {
    throw new Error(`Sauvegarde du plan media impossible: ${error.message}`);
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
    throw new Error(`Reset des visuels impossible: ${deleteError.message}`);
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
      usage_order: index + 1,
    })),
  );

  if (error) {
    throw new Error(`Selection des visuels impossible: ${error.message}`);
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
    readSelectedAssets(draft.id),
  ]);

  return {
    mediaPipelineStatus:
      plan?.media_pipeline_status ??
      (draft.status === "approved" ? "validated" : "draft"),
    visualDecision: plan?.visual_decision ?? null,
    selectedAssets,
    suggestedAssets: includeSuggestions ? await scoreLibraryForDraft(draft) : [],
  };
}

export async function prepareDraftMedia({
  draftId,
  userId,
}: {
  draftId: string;
  userId: string;
}) {
  const draft = await readDraft(draftId, userId);

  if (draft.status !== "approved") {
    throw new Error("Valide le brouillon pour preparer les medias.");
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
    })),
    missing_visual_needs: missingVisualNeeds,
  };

  await savePlan({
    draftId,
    mediaPipelineStatus: hasEnoughLibraryAssets ? "media_ready" : "media_preparing",
    visualDecision,
  });
  await replaceSelectedAssets({
    draftId,
    assets: hasEnoughLibraryAssets ? selectedAssets : [],
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

  if (draft.status !== "approved") {
    throw new Error("Valide le brouillon pour preparer les medias.");
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

  if (draft.status !== "approved") {
    throw new Error("Valide le brouillon pour preparer les medias.");
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
    .upsert(
      {
        draft_id: draftId,
        asset_id: selectedAsset.id,
        asset_source: "library",
        score: selectedAsset.score,
        usage_order: normalizedOrder,
      },
      { onConflict: "draft_id,usage_order" },
    );

  if (error) {
    throw new Error(`Selection manuelle impossible: ${error.message}`);
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
    throw new Error(`Lecture du visuel impossible: ${error.message}`);
  }

  if (!data) {
    throw new Error("Visuel introuvable dans la bibliotheque.");
  }

  return data;
}
