import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const CONTENT_ASSETS_BUCKET = "content-assets";

type ContentAssetType = "image" | "audio" | "video";

type ContentAssetRow = {
  id: string;
  created_at: string;
  draft_id: string;
  user_id: string | null;
  asset_type: ContentAssetType;
  bucket: string;
  storage_path: string;
  public_url: string;
  original_filename: string | null;
  content_type: string | null;
  size_bytes: number | null;
  status: string;
  source: string;
};

export type ContentAsset = {
  id: string;
  createdAt: string;
  draftId: string;
  userId: string | null;
  assetType: ContentAssetType;
  bucket: string;
  storagePath: string;
  publicUrl: string;
  originalFilename: string | null;
  contentType: string | null;
  sizeBytes: number | null;
  status: string;
  source: string;
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
  return {
    id: row.id,
    createdAt: row.created_at,
    draftId: row.draft_id,
    userId: row.user_id,
    assetType: row.asset_type,
    bucket: row.bucket,
    storagePath: row.storage_path,
    publicUrl: row.public_url,
    originalFilename: row.original_filename,
    contentType: row.content_type,
    sizeBytes: row.size_bytes,
    status: row.status,
    source: row.source,
  };
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

  throw new Error(
    "Type de fichier non supporte. Images, audios et videos uniquement.",
  );
}

function getAssetFolder(assetType: ContentAssetType) {
  if (assetType === "image") {
    return "images";
  }

  if (assetType === "audio") {
    return "audio";
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
      "id, created_at, draft_id, user_id, asset_type, bucket, storage_path, public_url, original_filename, content_type, size_bytes, status, source",
    )
    .eq("draft_id", draftId)
    .eq("user_id", userId)
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
  const filename = normalizeFilename(file.name);
  const storagePath = `drafts/${draftId}/${folder}/${timestamp}-${filename}`;
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
      draft_id: draftId,
      user_id: userId,
      asset_type: assetType,
      bucket: CONTENT_ASSETS_BUCKET,
      storage_path: storagePath,
      public_url: publicUrl,
      original_filename: file.name,
      content_type: contentType,
      size_bytes: file.size,
      status: "stored",
      source: "content_workshop_upload",
    })
    .select(
      "id, created_at, draft_id, user_id, asset_type, bucket, storage_path, public_url, original_filename, content_type, size_bytes, status, source",
    )
    .single<ContentAssetRow>();

  if (error) {
    throw new Error(`Trace Supabase impossible: ${error.message}`);
  }

  return mapAssetRow(data);
}
