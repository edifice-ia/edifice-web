import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getRequiredVisualSceneCount } from "@/lib/content/visual-prompts";
import { VISUAL_LIBRARY_BUCKET, VISUAL_LIBRARY_PATH } from "@/lib/server/content-assets";
import { normalizeSubtitleMode, subtitleModeToLocalMode } from "@/lib/subtitles";

const VIDEO_PREPARATION_BUCKET = "content-assets";
const VIDEO_PREPARATION_PATH = "lignes-interieures/video-preparation";
const STALE_DRAFT_VISUAL_MESSAGE =
  "Les visuels validés de ce brouillon ne sont plus disponibles pour le montage. Sélectionne ou valide de nouveaux visuels.";

type DraftRow = {
  id: string;
  user_id: string;
  script: string | null;
  status: string | null;
  title: string | null;
  visual_prompt: string | null;
  visual_status: string | null;
  visuals_validated_at: string | null;
  voice_asset_id: string | null;
  voice_status: string | null;
  voice_validated_at: string | null;
  score: Record<string, unknown> | null;
};

type ContentAssetRow = {
  id: string;
  asset_type: "image" | "audio" | "video" | "subtitle";
  bucket_name: string;
  created_at: string;
  file_name: string;
  linked_draft_id: string | null;
  metadata: Record<string, unknown>;
  public_url: string;
  source: string;
  status: string;
  storage_path: string;
};

type VisualSceneRow = {
  id: string;
  asset_id: string | null;
  visual_prompt_index: number;
  visual_prompt_text: string;
  generation_status: string | null;
  image_url: string | null;
  storage_path: string | null;
  locked: boolean | null;
  retained_at: string | null;
};

type AssetLinkRow = {
  asset_id: string | null;
  position: number | null;
};

type PreparedVisual = {
  assetId: string | null;
  bucketName: string | null;
  fileName: string;
  publicUrl: string | null;
  sceneIndex: number;
  storagePath: string | null;
};

type PreparedSubtitle = {
  bucketName: string;
  format: "json" | "srt" | "vtt";
  publicUrl: string;
  storagePath: string;
};

export type DraftVideoPreparationState = {
  manifestStoragePath: string | null;
  manifestUrl: string | null;
  preparedAt: string | null;
  status: "pending" | "ready";
};

let videoPreparationClient: SupabaseClient | null = null;

function getVideoPreparationClient() {
  if (videoPreparationClient) {
    return videoPreparationClient;
  }

  const supabaseUrl =
    process.env.SUPABASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Video preparation requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  }

  videoPreparationClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return videoPreparationClient;
}

function metadataString(asset: ContentAssetRow | null | undefined, key: string) {
  const value = asset?.metadata?.[key];

  return typeof value === "string" ? value : null;
}

function metadataNumber(asset: ContentAssetRow | null | undefined, key: string) {
  const value = asset?.metadata?.[key];
  const number = typeof value === "number" ? value : Number(value);

  return Number.isFinite(number) ? number : null;
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

function hasValidatedText(draft: DraftRow) {
  return [
    "approved",
    "validated",
    "visual_ready",
    "visuels_prets",
    "voix_en_attente",
    "voix_prete",
    "voix_prête",
    "voix_validée",
    "voix_validee",
    "sous_titres_prêts",
    "sous_titres_prets",
    "video_en_attente",
    "video_ready",
    "ready_to_publish",
  ].includes(draft.status ?? "");
}

function hasValidatedVoice(draft: DraftRow) {
  return Boolean(draft.voice_asset_id) &&
    (
      draft.voice_status === "validated" ||
      Boolean(draft.voice_validated_at) ||
      draft.status === "voix_validée" ||
      draft.status === "voix_validee" ||
      draft.status === "video_en_attente" ||
      draft.status === "video_ready"
    );
}

function isRetainedScene(scene: VisualSceneRow) {
  return Boolean(scene.locked) ||
    Boolean(scene.retained_at) ||
    scene.generation_status === "retained";
}

function normalizeStoragePath(path: string | null | undefined, bucketName = VIDEO_PREPARATION_BUCKET) {
  const normalized = path?.trim().replace(/^\/+/, "") ?? "";
  const bucketPrefix = `${bucketName}/`;

  return normalized.startsWith(bucketPrefix)
    ? normalized.slice(bucketPrefix.length)
    : normalized;
}

function isCanonicalVisualStorage(bucketName: string | null | undefined, storagePath: string | null | undefined) {
  return bucketName === VISUAL_LIBRARY_BUCKET &&
    normalizeStoragePath(storagePath, bucketName).startsWith(`${VISUAL_LIBRARY_PATH}/`);
}

function storagePathFileName(storagePath: string) {
  return storagePath.split("/").filter(Boolean).at(-1) ?? storagePath;
}

function storagePathDirectory(storagePath: string) {
  const parts = storagePath.split("/").filter(Boolean);
  parts.pop();

  return parts.join("/");
}

async function storageObjectExists(bucketName: string, storagePath: string) {
  const cleanPath = normalizeStoragePath(storagePath, bucketName);
  const fileName = storagePathFileName(cleanPath);
  const directory = storagePathDirectory(cleanPath);
  const { data, error } = await getVideoPreparationClient()
    .storage
    .from(bucketName)
    .list(directory, {
      limit: 100,
      search: fileName,
    });

  if (error) {
    throw new Error(`Verification Storage impossible pour ${bucketName}/${cleanPath}: ${error.message}`);
  }

  return (data ?? []).some((item) => item.name === fileName);
}

async function readDraft(draftId: string, userId: string) {
  const { data, error } = await getVideoPreparationClient()
    .from("content_drafts")
    .select("id, user_id, script, status, title, visual_prompt, visual_status, visuals_validated_at, voice_asset_id, voice_status, voice_validated_at, score")
    .eq("id", draftId)
    .eq("user_id", userId)
    .maybeSingle<DraftRow>();

  if (error) {
    throw new Error(`Lecture du brouillon video impossible: ${error.message}`);
  }

  if (!data) {
    throw new Error("Brouillon introuvable ou non autorise.");
  }

  return data;
}

async function readAsset(assetId: string) {
  const { data, error } = await getVideoPreparationClient()
    .from("content_assets")
    .select("id, asset_type, bucket_name, created_at, file_name, linked_draft_id, metadata, public_url, source, status, storage_path")
    .eq("id", assetId)
    .maybeSingle<ContentAssetRow>();

  if (error) {
    throw new Error(`Lecture asset impossible: ${error.message}`);
  }

  return data ?? null;
}

async function readVisualScenes(draftId: string) {
  const { data, error } = await getVideoPreparationClient()
    .from("content_draft_visual_scenes")
    .select("id, asset_id, visual_prompt_index, visual_prompt_text, generation_status, image_url, storage_path, locked, retained_at")
    .eq("draft_id", draftId)
    .order("visual_prompt_index", { ascending: true })
    .returns<VisualSceneRow[]>();

  if (error) {
    throw new Error(`Lecture des scenes video impossible: ${error.message}`);
  }

  return data ?? [];
}

async function readSelectedAssets(draftId: string) {
  const { data: links, error } = await getVideoPreparationClient()
    .from("content_draft_asset_links")
    .select("asset_id, position")
    .eq("draft_id", draftId)
    .order("position", { ascending: true })
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

  const { data: assets, error: assetError } = await getVideoPreparationClient()
    .from("content_assets")
    .select("id, asset_type, bucket_name, created_at, file_name, linked_draft_id, metadata, public_url, source, status, storage_path")
    .in("id", assetIds)
    .returns<ContentAssetRow[]>();

  if (assetError) {
    throw new Error(`Lecture des assets visuels impossible: ${assetError.message}`);
  }

  const assetById = new Map((assets ?? []).map((asset) => [asset.id, asset]));

  return (links ?? [])
    .map((link, index): PreparedVisual | null => {
      const asset = link.asset_id ? assetById.get(link.asset_id) : null;
      if (!asset) {
        return null;
      }

      return {
        assetId: asset.id,
        bucketName: asset.bucket_name,
        fileName: asset.file_name,
        publicUrl: asset.public_url,
        sceneIndex: link.position ?? index + 1,
        storagePath: normalizeStoragePath(asset.storage_path, asset.bucket_name),
      };
    })
    .filter((asset): asset is PreparedVisual => Boolean(asset));
}

async function readPreparedVisuals(draft: DraftRow) {
  const scenes = await readVisualScenes(draft.id);
  const retainedScenes = scenes.filter(isRetainedScene);
  const assetIds = retainedScenes
    .map((scene) => scene.asset_id)
    .filter((assetId): assetId is string => Boolean(assetId));
  const assetById = new Map<string, ContentAssetRow>();

  if (assetIds.length > 0) {
    const { data: assets, error } = await getVideoPreparationClient()
      .from("content_assets")
      .select("id, asset_type, bucket_name, created_at, file_name, linked_draft_id, metadata, public_url, source, status, storage_path")
      .in("id", assetIds)
      .returns<ContentAssetRow[]>();

    if (error) {
      throw new Error(`Lecture des assets de scenes impossible: ${error.message}`);
    }

    (assets ?? []).forEach((asset) => assetById.set(asset.id, asset));
  }

  const visualScenes = retainedScenes.map((scene) => {
    const asset = scene.asset_id ? assetById.get(scene.asset_id) : null;

    return {
      assetId: scene.asset_id,
      bucketName: asset?.bucket_name ?? null,
      fileName: asset?.file_name ?? `scene-${scene.visual_prompt_index}`,
      publicUrl: asset?.public_url ?? scene.image_url,
      sceneIndex: scene.visual_prompt_index,
      storagePath: asset ? normalizeStoragePath(asset.storage_path, asset.bucket_name) : null,
    };
  });

  if (visualScenes.length > 0) {
    return visualScenes.sort((a, b) => a.sceneIndex - b.sceneIndex);
  }

  return readSelectedAssets(draft.id);
}

async function readLatestSubtitleAssets(draftId: string, voiceAssetId: string | null) {
  const { data, error } = await getVideoPreparationClient()
    .from("content_assets")
    .select("id, asset_type, bucket_name, created_at, file_name, linked_draft_id, metadata, public_url, source, status, storage_path")
    .eq("linked_draft_id", draftId)
    .eq("asset_type", "subtitle")
    .eq("source", "elevenlabs")
    .order("created_at", { ascending: false })
    .limit(40)
    .returns<ContentAssetRow[]>();

  if (error) {
    throw new Error(`Lecture des sous-titres video impossible: ${error.message}`);
  }

  const assets = data ?? [];
  const matchingVoiceAssets = voiceAssetId
    ? assets.filter((asset) => metadataString(asset, "source_voice_asset_id") === voiceAssetId)
    : assets;
  const jsonAsset = matchingVoiceAssets.find(
    (asset) =>
      metadataString(asset, "subtitle_format") === "json" &&
      metadataString(asset, "subtitle_validation_status") === "validated",
  );

  if (!jsonAsset) {
    return null;
  }

  const groupId = metadataString(jsonAsset, "subtitle_group_id");
  const groupAssets = groupId
    ? assets.filter((asset) => metadataString(asset, "subtitle_group_id") === groupId)
    : matchingVoiceAssets;
  const srtAsset = groupAssets.find((asset) => metadataString(asset, "subtitle_format") === "srt");
  const vttAsset = groupAssets.find((asset) => metadataString(asset, "subtitle_format") === "vtt");

  if (!srtAsset || !vttAsset) {
    return null;
  }

  return { jsonAsset, srtAsset, vttAsset };
}

async function readLatestVideoPreparationAsset(draftId: string) {
  const { data, error } = await getVideoPreparationClient()
    .from("content_assets")
    .select("id, asset_type, bucket_name, created_at, file_name, linked_draft_id, metadata, public_url, source, status, storage_path")
    .eq("linked_draft_id", draftId)
    .eq("asset_type", "video")
    .eq("source", "video_preparation")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<ContentAssetRow>();

  if (error) {
    throw new Error(`Lecture du manifest video impossible: ${error.message}`);
  }

  return data ?? null;
}

async function supersedePreviousVideoPreparationAssets({
  draftId,
  newStoragePath,
  supersededAt,
}: {
  draftId: string;
  newStoragePath: string;
  supersededAt: string;
}) {
  const supabase = getVideoPreparationClient();
  const { data, error } = await supabase
    .from("content_assets")
    .select("id, metadata, storage_path")
    .eq("linked_draft_id", draftId)
    .eq("asset_type", "video")
    .eq("source", "video_preparation")
    .neq("storage_path", newStoragePath)
    .returns<Array<{ id: string; metadata: Record<string, unknown> | null; storage_path: string }>>();

  if (error) {
    throw new Error(`Lecture des anciens manifests video impossible: ${error.message}`);
  }

  await Promise.all((data ?? []).map(async (asset) => {
    const metadata = asset.metadata ?? {};
    if (metadata.video_preparation_status !== "ready") {
      return;
    }

    const { error: updateError } = await supabase
      .from("content_assets")
      .update({
        metadata: {
          ...metadata,
          superseded_at: supersededAt,
          superseded_by: newStoragePath,
          video_preparation_status: "superseded",
        },
      })
      .eq("id", asset.id);

    if (updateError) {
      throw new Error(`Remplacement de l'ancien manifest video impossible: ${updateError.message}`);
    }
  }));
}

export async function readDraftVideoPreparationState({
  draftId,
}: {
  draftId: string;
  userId: string;
}): Promise<DraftVideoPreparationState> {
  const asset = await readLatestVideoPreparationAsset(draftId);
  const preparedAt = metadataString(asset, "prepared_at") ?? asset?.created_at ?? null;
  const ready = metadataString(asset, "video_preparation_status") === "ready";

  return {
    manifestStoragePath: asset?.storage_path ?? null,
    manifestUrl: asset?.public_url ?? null,
    preparedAt,
    status: ready ? "ready" : "pending",
  };
}

function preparedSubtitle(asset: ContentAssetRow, format: PreparedSubtitle["format"]): PreparedSubtitle {
  return {
    bucketName: asset.bucket_name,
    format,
    publicUrl: asset.public_url,
    storagePath: asset.storage_path,
  };
}

function buildLocalFileName(index: number, visual: PreparedVisual) {
  const extension = visual.fileName.includes(".")
    ? visual.fileName.slice(visual.fileName.lastIndexOf("."))
    : ".jpg";

  return `${index.toString().padStart(3, "0")}${extension}`;
}

async function validatePreparedVisualsForManifest({
  draftId,
  requiredVisualCount,
  visuals,
}: {
  draftId: string;
  requiredVisualCount: number;
  visuals: PreparedVisual[];
}) {
  const selectedVisuals = visuals.slice(0, requiredVisualCount);
  const missingDetails: string[] = [];

  selectedVisuals.forEach((visual, index) => {
    const label = `visuel ${index + 1}`;
    const storagePath = normalizeStoragePath(visual.storagePath, visual.bucketName ?? undefined);

    if (!visual.assetId) {
      missingDetails.push(`${label}: aucun asset valide selectionne`);
      return;
    }

    if (!visual.bucketName || !storagePath) {
      missingDetails.push(`${label}: chemin Storage absent`);
      return;
    }

    if (!isCanonicalVisualStorage(visual.bucketName, storagePath)) {
      const detail = storagePath.startsWith("drafts/")
        ? `chemin temporaire ${storagePath}`
        : `${visual.bucketName}/${storagePath}`;
      missingDetails.push(`${label}: ${detail}`);
    }
  });

  if (missingDetails.length === 0) {
    for (const [index, visual] of selectedVisuals.entries()) {
      const bucketName = visual.bucketName ?? "";
      const storagePath = normalizeStoragePath(visual.storagePath, bucketName);
      const exists = await storageObjectExists(bucketName, storagePath);

      if (!exists) {
        missingDetails.push(`visuel ${index + 1}: introuvable dans ${bucketName} a ${storagePath}`);
      }
    }
  }

  if (missingDetails.length > 0) {
    throw new Error(`${STALE_DRAFT_VISUAL_MESSAGE} Détails: ${missingDetails.join("; ")}. draft_id=${draftId}`);
  }

  return selectedVisuals.map((visual) => ({
    ...visual,
    bucketName: VISUAL_LIBRARY_BUCKET,
    storagePath: normalizeStoragePath(visual.storagePath, VISUAL_LIBRARY_BUCKET),
  }));
}

export async function prepareDraftVideo({
  draftId,
  userId,
}: {
  draftId: string;
  userId: string;
}) {
  const supabase = getVideoPreparationClient();
  const draft = await readDraft(draftId, userId);
  const requiredVisualCount = requiredVisualSceneCountForDraft(draft);
  const [visuals, voiceAsset, subtitleAssets] = await Promise.all([
    readPreparedVisuals(draft),
    draft.voice_asset_id ? readAsset(draft.voice_asset_id) : Promise.resolve(null),
    readLatestSubtitleAssets(draft.id, draft.voice_asset_id),
  ]);
  const textValidated = hasValidatedText(draft);
  const visualsValidated = Boolean(draft.visuals_validated_at) ||
    draft.visual_status === "visual_ready" ||
    draft.status === "video_en_attente" ||
    draft.status === "video_ready";
  const voiceValidated = hasValidatedVoice(draft) && Boolean(voiceAsset?.public_url);
  const subtitlesValidated = Boolean(subtitleAssets);
  const blockingReasons = [
    textValidated ? null : "Texte non valide.",
    visualsValidated && visuals.length >= requiredVisualCount
      ? null
      : `Visuels incomplets: ${visuals.length}/${requiredVisualCount} valides.`,
    voiceValidated ? null : "Voix non validee ou audio manquant.",
    subtitlesValidated ? null : "Sous-titres non valides ou exports manquants.",
  ].filter((reason): reason is string => Boolean(reason));

  if (blockingReasons.length > 0) {
    throw new Error(blockingReasons.join(" "));
  }

  const jsonSubtitle = subtitleAssets!.jsonAsset;
  const srtSubtitle = subtitleAssets!.srtAsset;
  const vttSubtitle = subtitleAssets!.vttAsset;
  const subtitleMode = normalizeSubtitleMode(metadataString(jsonSubtitle, "mode"));
  const localSubtitleMode = subtitleModeToLocalMode(subtitleMode);
  const audioDurationSeconds =
    metadataNumber(jsonSubtitle, "duration_seconds") ??
    metadataNumber(voiceAsset, "estimated_duration_seconds") ??
    0;
  const targetDurationSeconds = durationSecondsForDraft(draft) ?? audioDurationSeconds;
  const preparedAt = new Date().toISOString();
  const timestamp = preparedAt.replace(/[:.]/g, "-");
  const fileName = `video-manifest-${timestamp}.json`;
  const storagePath = `${VIDEO_PREPARATION_PATH}/${draft.id}/${fileName}`;
  const orderedVisuals = await validatePreparedVisualsForManifest({
    draftId: draft.id,
    requiredVisualCount,
    visuals,
  });
  const manifest = {
    draft_id: draft.id,
    prepared_at: preparedAt,
    script: draft.script ?? "",
    subtitle_mode: subtitleMode,
    local_subtitle_mode: localSubtitleMode,
    validation: {
      text: "validated",
      visuals: "validated",
      voice: "validated",
      subtitles: "validated",
      video_preparation: "ready",
    },
    duration: {
      estimated_seconds: targetDurationSeconds,
      audio_seconds: audioDurationSeconds,
      target_seconds: targetDurationSeconds,
    },
    visuals: orderedVisuals.map((visual, index) => ({
      asset_id: visual.assetId,
      assetId: visual.assetId,
      bucket_name: visual.bucketName,
      bucketName: visual.bucketName,
      file_name: visual.fileName,
      fileName: visual.fileName,
      local_file: `visuals/${buildLocalFileName(index + 1, visual)}`,
      public_url: visual.publicUrl,
      publicUrl: visual.publicUrl,
      scene_index: visual.sceneIndex,
      sceneIndex: visual.sceneIndex,
      storage_path: visual.storagePath,
      storagePath: visual.storagePath,
    })),
    audio: {
      asset_id: voiceAsset!.id,
      bucket_name: voiceAsset!.bucket_name,
      file_name: voiceAsset!.file_name,
      local_file: "voice.mp3",
      public_url: voiceAsset!.public_url,
      storage_path: voiceAsset!.storage_path,
    },
    subtitles: {
      json: preparedSubtitle(jsonSubtitle, "json"),
      local_mode: localSubtitleMode,
      mode: subtitleMode,
      srt: preparedSubtitle(srtSubtitle, "srt"),
      vtt: preparedSubtitle(vttSubtitle, "vtt"),
      word_timestamps_source: "subtitles.json",
    },
    local_pipeline_contract: {
      script: "agents/lignes_interieures/shorts_montage/shorts_montage.py",
      expected_post_folder: {
        audio: "voice.mp3",
        subtitles: "subtitles.srt",
        visuals_dir: "visuals/",
        word_timestamps_candidates: [
          "word_timestamps.json",
          "alignment.json",
          "subtitles_words.json",
        ],
      },
      note: "Le pipeline local attend des fichiers materiels; ce manifest stocke les references web necessaires pour les reconstruire.",
    },
  };
  const manifestBuffer = Buffer.from(JSON.stringify(manifest, null, 2), "utf-8");

  const { error: uploadError } = await supabase.storage
    .from(VIDEO_PREPARATION_BUCKET)
    .upload(storagePath, manifestBuffer, {
      contentType: "application/json",
      upsert: false,
    });

  if (uploadError) {
    throw new Error(`Stockage du manifest video impossible: ${uploadError.message}`);
  }

  const { data: publicUrlData } = supabase.storage
    .from(VIDEO_PREPARATION_BUCKET)
    .getPublicUrl(storagePath);

  const { error: assetError } = await supabase
    .from("content_assets")
    .upsert({
      asset_type: "video",
      bucket_name: VIDEO_PREPARATION_BUCKET,
      file_name: fileName,
      linked_draft_id: draft.id,
      metadata: {
        asset_role: "short_video_preparation_manifest",
        audio_duration_seconds: audioDurationSeconds,
        content_type: "application/json",
        local_subtitle_mode: localSubtitleMode,
        prepared_at: preparedAt,
        required_visual_count: requiredVisualCount,
        source_draft_id: draft.id,
        subtitle_mode: subtitleMode,
        target_duration_seconds: targetDurationSeconds,
        video_preparation_status: "ready",
        visual_count: orderedVisuals.length,
      },
      public_url: publicUrlData.publicUrl,
      source: "video_preparation",
      status: "available",
      storage_path: storagePath,
    }, { onConflict: "storage_path" });

  if (assetError) {
    throw new Error(`Indexation du manifest video impossible: ${assetError.message}`);
  }

  await supersedePreviousVideoPreparationAssets({
    draftId: draft.id,
    newStoragePath: storagePath,
    supersededAt: preparedAt,
  });

  const { error: planError } = await supabase
    .from("content_draft_media_plans")
    .upsert({
      action: "prepare_video",
      assets_found: orderedVisuals.length,
      assets_selected: orderedVisuals.length,
      draft_id: draft.id,
      generation_reason: "video_manifest_prepared",
      generation_requested: false,
      last_run_at: preparedAt,
      media_pipeline_status: "video_ready",
      missing_visual_needs: [],
      visual_decision: {
        confidence: 1,
        matched_assets: orderedVisuals.map((visual) => ({
          asset_id: visual.assetId,
          file_name: visual.fileName,
          reason: "validated_for_video_preparation",
          score: 100,
        })),
        missing_visual_needs: [],
        mode: "reuse_existing",
        reason: "video_manifest_prepared",
      },
      visual_decision_mode: "reuse_existing",
    }, { onConflict: "draft_id" });

  if (planError) {
    throw new Error(`Mise a jour du plan video impossible: ${planError.message}`);
  }

  return readDraftVideoPreparationState({ draftId, userId });
}
