import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const VIDEO_RENDERER_BUCKET = "content-assets";

type RenderJobStatus = "queued" | "processing" | "completed" | "failed";

type RenderJobRow = {
  id: string;
  draft_id: string;
  manifest_id: string | null;
  manifest_path: string | null;
  status: RenderJobStatus;
  requested_at: string;
  started_at: string | null;
  completed_at: string | null;
  error_message: string | null;
  output_path: string | null;
  output_url: string | null;
  metadata: Record<string, unknown>;
};

type VideoManifestAssetRow = {
  id: string;
  bucket_name: string;
  created_at: string;
  metadata: Record<string, unknown>;
  public_url: string;
  storage_path: string;
};

type RenderedAssetRow = {
  created_at: string;
  metadata: Record<string, unknown>;
};

export type VideoRenderJobState = {
  id: string;
  draftId: string;
  manifestId: string | null;
  manifestPath: string | null;
  status: RenderJobStatus;
  requestedAt: string;
  startedAt: string | null;
  completedAt: string | null;
  errorMessage: string | null;
  outputPath: string | null;
  outputUrl: string | null;
  durationSeconds: number | null;
  renderedAt: string | null;
};

let videoRendererClient: SupabaseClient | null = null;

function getVideoRendererClient() {
  if (videoRendererClient) {
    return videoRendererClient;
  }

  const supabaseUrl =
    process.env.SUPABASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Video renderer requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  }

  videoRendererClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return videoRendererClient;
}

function mapJob(row: RenderJobRow, renderedAsset?: RenderedAssetRow | null): VideoRenderJobState {
  const duration = renderedAsset?.metadata?.duration_seconds;
  const durationSeconds = typeof duration === "number" ? duration : Number(duration);

  return {
    id: row.id,
    draftId: row.draft_id,
    manifestId: row.manifest_id,
    manifestPath: row.manifest_path,
    status: row.status,
    requestedAt: row.requested_at,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    errorMessage: row.error_message,
    outputPath: row.output_path,
    outputUrl: row.output_url,
    durationSeconds: Number.isFinite(durationSeconds) ? durationSeconds : null,
    renderedAt: renderedAsset?.created_at ?? row.completed_at,
  };
}

async function ensureDraftAccess(draftId: string, userId: string) {
  const { data, error } = await getVideoRendererClient()
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

async function readLatestManifest(draftId: string) {
  const { data, error } = await getVideoRendererClient()
    .from("content_assets")
    .select("id,bucket_name,created_at,metadata,public_url,storage_path")
    .eq("linked_draft_id", draftId)
    .eq("asset_type", "video")
    .eq("source", "video_preparation")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<VideoManifestAssetRow>();

  if (error) {
    throw new Error(`Lecture du manifest video impossible: ${error.message}`);
  }

  if (!data || data.metadata?.video_preparation_status !== "ready") {
    throw new Error("Manifest video pret introuvable. Preparez la video avant le rendu.");
  }

  return data;
}

async function readRenderedAsset(outputPath: string | null) {
  if (!outputPath) {
    return null;
  }

  const { data, error } = await getVideoRendererClient()
    .from("content_assets")
    .select("created_at,metadata")
    .eq("storage_path", outputPath)
    .eq("source", "shorts_renderer")
    .maybeSingle<RenderedAssetRow>();

  if (error) {
    throw new Error(`Lecture de la video rendue impossible: ${error.message}`);
  }

  return data ?? null;
}

export async function readVideoRenderJobState({
  draftId,
  userId,
}: {
  draftId: string;
  userId: string;
}) {
  await ensureDraftAccess(draftId, userId);

  const { data, error } = await getVideoRendererClient()
    .from("video_render_jobs")
    .select("id,draft_id,manifest_id,manifest_path,status,requested_at,started_at,completed_at,error_message,output_path,output_url,metadata")
    .eq("draft_id", draftId)
    .order("requested_at", { ascending: false })
    .limit(1)
    .maybeSingle<RenderJobRow>();

  if (error) {
    throw new Error(`Lecture du job de rendu impossible: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  return mapJob(data, await readRenderedAsset(data.output_path));
}

async function readActiveJob(draftId: string) {
  const { data, error } = await getVideoRendererClient()
    .from("video_render_jobs")
    .select("id,draft_id,manifest_id,manifest_path,status,requested_at,started_at,completed_at,error_message,output_path,output_url,metadata")
    .eq("draft_id", draftId)
    .in("status", ["queued", "processing"])
    .order("requested_at", { ascending: true })
    .limit(1)
    .maybeSingle<RenderJobRow>();

  if (error) {
    throw new Error(`Lecture du job actif impossible: ${error.message}`);
  }

  return data ?? null;
}

async function readLatestFailedJob(draftId: string) {
  const { data, error } = await getVideoRendererClient()
    .from("video_render_jobs")
    .select("id,draft_id,manifest_id,manifest_path,status,requested_at,started_at,completed_at,error_message,output_path,output_url,metadata")
    .eq("draft_id", draftId)
    .eq("status", "failed")
    .order("requested_at", { ascending: false })
    .limit(1)
    .maybeSingle<RenderJobRow>();

  if (error) {
    throw new Error(`Lecture du dernier echec de rendu impossible: ${error.message}`);
  }

  return data ?? null;
}

async function createRenderJob(draftId: string, manifest: VideoManifestAssetRow) {
  const { data, error } = await getVideoRendererClient()
    .from("video_render_jobs")
    .insert({
      draft_id: draftId,
      manifest_id: manifest.id,
      manifest_path: manifest.storage_path,
      metadata: {
        manifest_bucket: manifest.bucket_name || VIDEO_RENDERER_BUCKET,
        manifest_created_at: manifest.created_at,
        manifest_public_url: manifest.public_url,
        renderer_source: "vercel_route",
      },
      status: "queued",
    })
    .select("id,draft_id,manifest_id,manifest_path,status,requested_at,started_at,completed_at,error_message,output_path,output_url,metadata")
    .single<RenderJobRow>();

  if (error) {
    if (error.code === "23505") {
      const activeJob = await readActiveJob(draftId);
      if (activeJob) {
        return activeJob;
      }
    }

    throw new Error(`Creation du job de rendu impossible: ${error.message}`);
  }

  return data;
}

async function retryFailedJob(job: RenderJobRow, manifest: VideoManifestAssetRow) {
  const { data, error } = await getVideoRendererClient()
    .from("video_render_jobs")
    .update({
      completed_at: null,
      error_message: null,
      manifest_id: manifest.id,
      manifest_path: manifest.storage_path,
      metadata: {
        ...job.metadata,
        manifest_bucket: manifest.bucket_name || VIDEO_RENDERER_BUCKET,
        manifest_created_at: manifest.created_at,
        manifest_public_url: manifest.public_url,
        retried_at: new Date().toISOString(),
      },
      output_path: null,
      output_url: null,
      requested_at: new Date().toISOString(),
      started_at: null,
      status: "queued",
    })
    .eq("id", job.id)
    .eq("status", "failed")
    .select("id,draft_id,manifest_id,manifest_path,status,requested_at,started_at,completed_at,error_message,output_path,output_url,metadata")
    .single<RenderJobRow>();

  if (error) {
    throw new Error(`Relance du job de rendu impossible: ${error.message}`);
  }

  return data;
}

export async function createOrReuseVideoRenderJob({
  draftId,
  mode,
  userId,
}: {
  draftId: string;
  mode: "start" | "retry" | "regenerate";
  userId: string;
}) {
  await ensureDraftAccess(draftId, userId);

  const activeJob = await readActiveJob(draftId);
  if (activeJob) {
    return {
      job: mapJob(activeJob),
      reusedActiveJob: true,
    };
  }

  const manifest = await readLatestManifest(draftId);

  if (mode === "retry") {
    const failedJob = await readLatestFailedJob(draftId);
    if (failedJob) {
      return {
        job: mapJob(await retryFailedJob(failedJob, manifest)),
        reusedActiveJob: false,
      };
    }
  }

  return {
    job: mapJob(await createRenderJob(draftId, manifest)),
    reusedActiveJob: false,
  };
}

export async function dispatchVideoRenderJob(jobId: string) {
  const rendererBaseUrl = process.env.RENDERER_BASE_URL?.trim();
  const rendererSecret = process.env.RENDERER_SHARED_SECRET?.trim();

  if (!rendererBaseUrl || !rendererSecret) {
    throw new Error("Renderer Railway non configure cote serveur.");
  }

  const endpoint = new URL(`/internal/render-jobs/${jobId}/dispatch`, rendererBaseUrl);
  const response = await fetch(endpoint, {
    cache: "no-store",
    headers: {
      "X-Renderer-Secret": rendererSecret,
    },
    method: "POST",
  });

  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const detail =
      payload && typeof payload === "object" && "detail" in payload
        ? String((payload as { detail?: unknown }).detail)
        : response.statusText;
    throw new Error(`Renderer Railway indisponible (${response.status}): ${detail}`);
  }

  return payload;
}
