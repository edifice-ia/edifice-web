import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export const CONTENT_ASSETS_BUCKET = "content-assets";
export const VISUAL_LIBRARY_BUCKET = "content-assets";
export const VISUAL_LIBRARY_PATH = "lignes-interieures/visuels";

type ContentAssetType = "image" | "audio" | "video" | "subtitle";

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
