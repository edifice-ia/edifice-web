import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export const CONTENT_ASSETS_BUCKET = "content-assets";
export const VISUAL_LIBRARY_BUCKET = "content-assets";
export const VISUAL_LIBRARY_PATH = "lignes-interieures/visuels";

type ContentAssetType = "image" | "audio" | "video" | "subtitle";

export type VisualAssetMetadata = {
  title: string;
  description: string;
  prompt: string;
  tags: string[];
  theme: string;
  emotion: string;
  ambiance: string;
  visual_style: string;
  scene_type: string;
  character_type: string;
  color_palette: string[];
  generation_quality: string;
  gpt_vision_score: number | null;
  validated: boolean;
  validated_at: string | null;
  source_draft_id: string | null;
  source_scene_number: number | null;
};

export type SaveVisualMetadataInput = Partial<VisualAssetMetadata> & {
  assetId: string;
  scoreBreakdown?: Record<string, unknown>;
  scoreSource?: string;
};

type ContentAssetRow = {
  id: string;
  created_at: string;
  asset_type: ContentAssetType;
  file_name: string;
  bucket_name: string;
  storage_path: string;
  public_url: string;
  status: string;
  source: string;
  metadata: Record<string, unknown>;
  usage_count: number;
  linked_draft_id: string | null;
};

export type ContentAsset = {
  id: string;
  createdAt: string;
  draftId: string | null;
  assetType: ContentAssetType;
  bucket: string;
  fileName: string;
  storagePath: string;
  publicUrl: string;
  originalFilename: string | null;
  contentType: string | null;
  sizeBytes: number | null;
  status: string;
  source: string;
  metadata: Record<string, unknown>;
  usageCount: number;
};

let contentAssetsClient: SupabaseClient | null = null;

const visualMetadataDefaults: VisualAssetMetadata = {
  title: "",
  description: "",
  prompt: "",
  tags: [],
  theme: "",
  emotion: "",
  ambiance: "",
  visual_style: "",
  scene_type: "",
  character_type: "",
  color_palette: [],
  generation_quality: "",
  gpt_vision_score: null,
  validated: false,
  validated_at: null,
  source_draft_id: null,
  source_scene_number: null,
};

function getContentAssetsClient() {
  if (contentAssetsClient) {
    return contentAssetsClient;
  }

  const supabaseUrl =
    process.env.SUPABASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Content asset storage requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
    );
  }

  contentAssetsClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return contentAssetsClient;
}

function mapAssetRow(row: ContentAssetRow): ContentAsset {
  const originalFilename =
    typeof row.metadata.original_filename === "string"
      ? row.metadata.original_filename
      : row.file_name;
  const contentType =
    typeof row.metadata.content_type === "string"
      ? row.metadata.content_type
      : null;
  const sizeBytes =
    typeof row.metadata.size_bytes === "number"
      ? row.metadata.size_bytes
      : null;

  return {
    id: row.id,
    createdAt: row.created_at,
    draftId: row.linked_draft_id,
    assetType: row.asset_type,
    bucket: row.bucket_name,
    fileName: row.file_name,
    storagePath: row.storage_path,
    publicUrl: row.public_url,
    originalFilename,
    contentType,
    sizeBytes,
    status: row.status,
    source: row.source,
    metadata: row.metadata,
    usageCount: row.usage_count,
  };
}

function visualLibraryStoragePath(fileName: string) {
  return `${VISUAL_LIBRARY_PATH}/${fileName}`;
}

function readableVisualSlug(input: string) {
  const normalized = input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s_-]/g, " ");
  const stopWords = new Set([
    "avec",
    "dans",
    "des",
    "les",
    "pour",
    "the",
    "with",
  ]);
  const concepts: Array<[RegExp, string]> = [
    [/\b(man|male|person|protagonist|homme)\b/, "homme"],
    [/\b(woman|female|femme)\b/, "femme"],
    [/\b(colleague|coworker|collegue)\b/, "collegue"],
    [/\b(calm|quiet|peaceful|calme)\b/, "calme"],
    [/\b(angry|anger|colere|rage)\b/, "colere"],
    [/\b(tension|stress|conflict|conflit)\b/, "tension"],
    [/\b(reflection|thinking|thoughtful|introspection|reflexion)\b/, "reflexion"],
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

  return (words.length ? words : ["calme", "interieur"]).join("_");
}

async function uniqueVisualFileName(baseName: string) {
  const supabase = getContentAssetsClient();
  const cleanSlug = readableVisualSlug(baseName);
  const { data, error } = await supabase
    .from("content_assets")
    .select("storage_path")
    .eq("bucket_name", VISUAL_LIBRARY_BUCKET)
    .like("storage_path", `${VISUAL_LIBRARY_PATH}/${cleanSlug}%`);

  if (error) {
    throw new Error(`Verification du nom de visuel impossible: ${error.message}`);
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

  throw new Error("Impossible de trouver un nom disponible pour ce visuel.");
}

function getAssetType(contentType: string): ContentAssetType {
  if (contentType.startsWith("image/")) {
    return "image";
  }

  if (contentType.startsWith("audio/")) {
    return "audio";
  }

  if (contentType.startsWith("video/")) {
    return "video";
  }

  if (
    contentType === "text/vtt" ||
    contentType === "application/x-subrip" ||
    contentType === "text/plain"
  ) {
    return "subtitle";
  }

  throw new Error(
    "Type de fichier non supporte. Images, audios, videos et sous-titres uniquement.",
  );
}

function getAssetFolder(assetType: ContentAssetType) {
  if (assetType === "image") {
    return "images";
  }

  if (assetType === "audio") {
    return "audio";
  }

  if (assetType === "subtitle") {
    return "subtitles";
  }

  return "videos";
}

function normalizeFilename(filename: string) {
  const normalized = filename
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();

  return normalized || "asset";
}

function normalizeStringList(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean)
    .filter((item, index, list) => list.indexOf(item) === index);
}

function normalizeScore(value: unknown) {
  const score = Number(value);

  return Number.isFinite(score) ? Math.max(0, Math.min(100, Math.round(score))) : null;
}

function inferVisualTags(input: Partial<VisualAssetMetadata>) {
  const sourceText = [
    input.title,
    input.description,
    input.prompt,
    input.theme,
    input.emotion,
    input.ambiance,
    input.visual_style,
    input.scene_type,
    input.character_type,
  ]
    .filter((item): item is string => typeof item === "string")
    .join(" ")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  const concepts: Array<[RegExp, string]> = [
    [/\b(homme|man|male|personnage|protagonist)\b/, "homme"],
    [/\b(femme|woman|female)\b/, "femme"],
    [/\b(collegue|coworker|colleague)\b/, "collegue"],
    [/\b(toit|rooftop|roof|terrasse)\b/, "toit"],
    [/\b(ville|city|urban|skyline)\b/, "ville"],
    [/\b(bureau|office|workplace)\b/, "bureau"],
    [/\b(fenetre|window)\b/, "fenetre"],
    [/\b(silhouette|ombre|shadow)\b/, "silhouette"],
    [/\b(calme|calm|peaceful|silence)\b/, "calme"],
    [/\b(tension|conflit|conflict|stress)\b/, "tension"],
    [/\b(colere|anger|angry)\b/, "colere"],
    [/\b(reflexion|reflection|thinking|introspection)\b/, "reflexion"],
    [/\b(soir|sunset|dusk|evening|twilight)\b/, "soir"],
    [/\b(nuit|night)\b/, "nuit"],
    [/\b(interieur|inside|room|interior)\b/, "interieur"],
  ];

  return concepts
    .filter(([pattern]) => pattern.test(sourceText))
    .map(([, tag]) => tag);
}

export function buildVisualMetadata(
  input: Partial<VisualAssetMetadata> & {
    scoreBreakdown?: Record<string, unknown>;
    scoreSource?: string;
  },
) {
  const { scoreBreakdown, scoreSource, ...metadataInput } = input;
  void scoreSource;
  const inferredTags = inferVisualTags(input);
  const tags = [
    ...normalizeStringList(input.tags),
    ...inferredTags,
  ].filter((item, index, list) => list.indexOf(item) === index);
  const score =
    input.gpt_vision_score ??
    normalizeScore(scoreBreakdown?.total_score ?? scoreBreakdown?.total);

  return {
    ...visualMetadataDefaults,
    ...metadataInput,
    title: input.title?.trim() ?? "",
    description: input.description?.trim() ?? "",
    prompt: input.prompt?.trim() ?? "",
    tags,
    theme: input.theme?.trim() ?? "",
    emotion: input.emotion?.trim() ?? "",
    ambiance: input.ambiance?.trim() ?? "",
    visual_style: input.visual_style?.trim() ?? "",
    scene_type: input.scene_type?.trim() ?? "",
    character_type: input.character_type?.trim() ?? "",
    color_palette: normalizeStringList(input.color_palette),
    generation_quality: input.generation_quality?.trim() ?? "",
    gpt_vision_score: normalizeScore(score),
    validated: Boolean(input.validated),
    validated_at: input.validated_at ?? null,
    source_draft_id: input.source_draft_id ?? null,
    source_scene_number:
      typeof input.source_scene_number === "number" ? input.source_scene_number : null,
  } satisfies VisualAssetMetadata;
}

export async function saveVisualMetadata({
  assetId,
  scoreBreakdown,
  scoreSource,
  ...input
}: SaveVisualMetadataInput) {
  const supabase = getContentAssetsClient();
  const { data, error } = await supabase
    .from("content_assets")
    .select("metadata")
    .eq("id", assetId)
    .maybeSingle<{ metadata: Record<string, unknown> }>();

  if (error) {
    throw new Error(`Lecture des metadonnees visuelles impossible: ${error.message}`);
  }

  const currentMetadata = data?.metadata ?? {};
  const metadata = {
    ...currentMetadata,
    ...buildVisualMetadata({
      ...currentMetadata,
      ...input,
      scoreBreakdown,
      scoreSource,
    }),
    score_breakdown: scoreBreakdown ?? currentMetadata.score_breakdown,
    score_source: scoreSource ?? currentMetadata.score_source,
  };

  const { error: updateError } = await supabase
    .from("content_assets")
    .update({ metadata })
    .eq("id", assetId);

  if (updateError) {
    throw new Error(`Sauvegarde des metadonnees visuelles impossible: ${updateError.message}`);
  }

  return metadata;
}

async function searchVisualAssetsByMetadata(metadataFilter: Record<string, unknown>) {
  const supabase = getContentAssetsClient();
  const { data, error } = await supabase
    .from("content_assets")
    .select(
      "id, created_at, asset_type, file_name, bucket_name, storage_path, public_url, status, source, metadata, usage_count, linked_draft_id",
    )
    .eq("asset_type", "image")
    .eq("bucket_name", VISUAL_LIBRARY_BUCKET)
    .like("storage_path", `${VISUAL_LIBRARY_PATH}/%`)
    .contains("metadata", metadataFilter)
    .order("created_at", { ascending: false })
    .limit(50)
    .returns<ContentAssetRow[]>();

  if (error) {
    throw new Error(`Recherche visuelle impossible: ${error.message}`);
  }

  return (data ?? []).map(mapAssetRow);
}

export async function searchByTags(tags: string[]) {
  return searchVisualAssetsByMetadata({ tags: normalizeStringList(tags) });
}

export async function searchByTheme(theme: string) {
  return searchVisualAssetsByMetadata({ theme });
}

export async function searchByEmotion(emotion: string) {
  return searchVisualAssetsByMetadata({ emotion });
}

async function ensureDraftBelongsToUser({
  draftId,
  userId,
}: {
  draftId: string;
  userId: string;
}) {
  const supabase = getContentAssetsClient();

  const { data, error } = await supabase
    .from("content_drafts")
    .select("id")
    .eq("id", draftId)
    .eq("user_id", userId)
    .maybeSingle<{ id: string }>();

  if (error) {
    throw new Error(`Verification du brouillon impossible: ${error.message}`);
  }

  if (!data) {
    throw new Error("Brouillon introuvable ou non autorise.");
  }
}

export async function readContentAssets({
  draftId,
  userId,
}: {
  draftId: string;
  userId: string;
}) {
  await ensureDraftBelongsToUser({ draftId, userId });

  const supabase = getContentAssetsClient();
  const { data, error } = await supabase
    .from("content_assets")
    .select(
      "id, created_at, asset_type, file_name, bucket_name, storage_path, public_url, status, source, metadata, usage_count, linked_draft_id",
    )
    .eq("linked_draft_id", draftId)
    .order("created_at", { ascending: false })
    .returns<ContentAssetRow[]>();

  if (error) {
    throw new Error(`Lecture des assets impossible: ${error.message}`);
  }

  return (data ?? []).map(mapAssetRow);
}

export async function uploadContentAsset({
  draftId,
  userId,
  file,
}: {
  draftId: string;
  userId: string;
  file: File;
}) {
  await ensureDraftBelongsToUser({ draftId, userId });

  if (file.size <= 0) {
    throw new Error("Le fichier est vide.");
  }

  const contentType = file.type || "application/octet-stream";
  const assetType = getAssetType(contentType);
  const folder = getAssetFolder(assetType);
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = assetType === "image"
    ? await uniqueVisualFileName(file.name)
    : normalizeFilename(file.name);
  const storagePath = assetType === "image"
    ? visualLibraryStoragePath(filename)
    : `drafts/${draftId}/${folder}/${timestamp}-${filename}`;
  const supabase = getContentAssetsClient();
  const bytes = Buffer.from(await file.arrayBuffer());
  const visualMetadata =
    assetType === "image"
      ? buildVisualMetadata({
          title: filename.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " "),
          description: `Image importee depuis ${file.name}`,
          generation_quality: "manual",
          source_draft_id: draftId,
        })
      : {};

  console.info("[Content Assets] upload", {
    assetType,
    storagePath,
    size: file.size,
  });

  const { error: uploadError } = await supabase.storage
    .from(CONTENT_ASSETS_BUCKET)
    .upload(storagePath, bytes, {
      contentType,
      upsert: false,
    });

  if (uploadError) {
    throw new Error(`Upload Supabase Storage impossible: ${uploadError.message}`);
  }

  const { data: publicUrlData } = supabase.storage
    .from(CONTENT_ASSETS_BUCKET)
    .getPublicUrl(storagePath);

  const publicUrl = publicUrlData.publicUrl;

  const { data, error } = await supabase
    .from("content_assets")
    .insert({
      asset_type: assetType,
      file_name: filename,
      bucket_name: CONTENT_ASSETS_BUCKET,
      storage_path: storagePath,
      public_url: publicUrl,
      metadata: {
        ...visualMetadata,
        content_type: contentType,
        original_filename: file.name,
        size_bytes: file.size,
        uploaded_by: userId,
      },
      status: "available",
      source: "content_workshop_upload",
      linked_draft_id: draftId,
    })
    .select(
      "id, created_at, asset_type, file_name, bucket_name, storage_path, public_url, status, source, metadata, usage_count, linked_draft_id",
    )
    .single<ContentAssetRow>();

  if (error) {
    throw new Error(`Trace Supabase impossible: ${error.message}`);
  }

  return mapAssetRow(data);
}
