import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { VISUAL_LIBRARY_BUCKET, VISUAL_LIBRARY_PATH } from "@/lib/server/content-assets";

const VIDEO_RENDERER_BUCKET = "content-assets";
const DEFAULT_STALE_PROCESSING_MINUTES = 45;
const STALE_QUEUED_MINUTES = 5;
const RENDERER_DISPATCH_TIMEOUT_MS = 20000;
const STALE_DRAFT_VISUAL_MESSAGE =
  "Les visuels validés de ce brouillon ne sont plus disponibles pour le montage. Sélectionne ou valide de nouveaux visuels.";

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

type VideoManifestVisual = {
  bucket_name?: unknown;
  bucketName?: unknown;
  storage_path?: unknown;
  storagePath?: unknown;
};

type VideoManifestPayload = {
  visuals?: unknown;
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

function staleProcessingMinutes() {
  const rawValue = process.env.RENDERER_STALE_PROCESSING_MINUTES?.trim();
  const parsed = Number(rawValue);

  return Number.isFinite(parsed) && parsed > 0
    ? parsed
    : DEFAULT_STALE_PROCESSING_MINUTES;
}

function minutesAgo(minutes: number) {
  return new Date(Date.now() - minutes * 60_000).toISOString();
}

function normalizeStoragePath(path: string | null | undefined, bucketName = VIDEO_RENDERER_BUCKET) {
  const normalized = path?.trim().replace(/^\/+/, "") ?? "";
  const bucketPrefix = `${bucketName}/`;

  return normalized.startsWith(bucketPrefix)
    ? normalized.slice(bucketPrefix.length)
    : normalized;
}

function storagePathFileName(storagePath: string) {
  return storagePath.split("/").filter(Boolean).at(-1) ?? storagePath;
}

function storagePathDirectory(storagePath: string) {
  const parts = storagePath.split("/").filter(Boolean);
  parts.pop();

  return parts.join("/");
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function visualStorageRef(visual: VideoManifestVisual) {
  const bucketName = stringValue(visual.bucket_name) || stringValue(visual.bucketName) || VIDEO_RENDERER_BUCKET;
  const storagePath = normalizeStoragePath(
    stringValue(visual.storage_path) || stringValue(visual.storagePath),
    bucketName,
  );

  return { bucketName, storagePath };
}

async function storageObjectExists(bucketName: string, storagePath: string) {
  const cleanPath = normalizeStoragePath(storagePath, bucketName);
  const fileName = storagePathFileName(cleanPath);
  const directory = storagePathDirectory(cleanPath);
  const { data, error } = await getVideoRendererClient()
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

async function downloadManifestPayload(manifest: VideoManifestAssetRow) {
  const bucketName = manifest.bucket_name || VIDEO_RENDERER_BUCKET;
  const storagePath = normalizeStoragePath(manifest.storage_path, bucketName);
  const { data, error } = await getVideoRendererClient()
    .storage
    .from(bucketName)
    .download(storagePath);

  if (error) {
    throw new Error(`Telechargement du manifest video impossible depuis ${bucketName}/${storagePath}: ${error.message}`);
  }

  const text = await data.text();

  try {
    return JSON.parse(text) as VideoManifestPayload;
  } catch {
    throw new Error(`Manifest video invalide: JSON illisible dans ${bucketName}/${storagePath}.`);
  }
}

async function assertManifestVisualsAreRenderable(manifest: VideoManifestAssetRow) {
  const payload = await downloadManifestPayload(manifest);
  const visuals = Array.isArray(payload.visuals)
    ? payload.visuals
    : [];
  const missingDetails: string[] = [];

  visuals.forEach((entry, index) => {
    const visual = entry && typeof entry === "object" ? entry as VideoManifestVisual : {};
    const { bucketName, storagePath } = visualStorageRef(visual);
    const label = `visuel ${index + 1}`;

    if (!storagePath) {
      missingDetails.push(`${label}: chemin Storage absent`);
      return;
    }

    if (bucketName !== VISUAL_LIBRARY_BUCKET || !storagePath.startsWith(`${VISUAL_LIBRARY_PATH}/`)) {
      const detail = storagePath.startsWith("drafts/")
        ? `chemin temporaire ${storagePath}`
        : `${bucketName}/${storagePath}`;
      missingDetails.push(`${label}: ${detail}`);
    }
  });

  if (missingDetails.length === 0) {
    for (const [index, entry] of visuals.entries()) {
      const visual = entry && typeof entry === "object" ? entry as VideoManifestVisual : {};
      const { bucketName, storagePath } = visualStorageRef(visual);
      const exists = await storageObjectExists(bucketName, storagePath);

      if (!exists) {
        missingDetails.push(`visuel ${index + 1}: introuvable dans ${bucketName} a ${storagePath}`);
      }
    }
  }

  if (visuals.length === 0) {
    missingDetails.push("aucun visuel dans le manifest");
  }

  if (missingDetails.length > 0) {
    throw new Error(`${STALE_DRAFT_VISUAL_MESSAGE} Détails: ${missingDetails.join("; ")}.`);
  }
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
  await failStaleVideoRenderJobs(draftId);

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

export async function failStaleVideoRenderJobs(draftId: string) {
  const now = new Date().toISOString();
  const queuedCutoff = minutesAgo(STALE_QUEUED_MINUTES);
  const processingCutoff = minutesAgo(staleProcessingMinutes());
  const { data: queuedJobs, error: queuedError } = await getVideoRendererClient()
    .from("video_render_jobs")
    .update({
      completed_at: now,
      error_message: `Job bloque: reste en attente du renderer depuis plus de ${STALE_QUEUED_MINUTES} minutes. Vous pouvez relancer le rendu.`,
      status: "failed",
    })
    .eq("draft_id", draftId)
    .eq("status", "queued")
    .lt("requested_at", queuedCutoff)
    .select("id");

  if (queuedError) {
    throw new Error(`Recuperation des jobs queued bloques impossible: ${queuedError.message}`);
  }

  const { data: processingJobs, error: processingError } = await getVideoRendererClient()
    .from("video_render_jobs")
    .update({
      completed_at: now,
      error_message: `Job bloque: rendu en cours depuis plus de ${staleProcessingMinutes()} minutes sans finalisation. Vous pouvez relancer le rendu.`,
      status: "failed",
    })
    .eq("draft_id", draftId)
    .eq("status", "processing")
    .lt("started_at", processingCutoff)
    .select("id");

  if (processingError) {
    throw new Error(`Recuperation des jobs processing bloques impossible: ${processingError.message}`);
  }

  const { data: missingStartedAtJobs, error: missingStartedAtError } = await getVideoRendererClient()
    .from("video_render_jobs")
    .update({
      completed_at: now,
      error_message: `Job bloque: rendu marque en cours sans started_at exploitable depuis plus de ${staleProcessingMinutes()} minutes. Vous pouvez relancer le rendu.`,
      status: "failed",
    })
    .eq("draft_id", draftId)
    .eq("status", "processing")
    .is("started_at", null)
    .lt("requested_at", processingCutoff)
    .select("id");

  if (missingStartedAtError) {
    throw new Error(`Recuperation des jobs processing sans started_at impossible: ${missingStartedAtError.message}`);
  }

  return [...(queuedJobs ?? []), ...(processingJobs ?? []), ...(missingStartedAtJobs ?? [])].length;
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
  await failStaleVideoRenderJobs(draftId);

  const activeJob = await readActiveJob(draftId);
  if (activeJob) {
    return {
      job: mapJob(activeJob),
      reusedActiveJob: true,
    };
  }

  const manifest = await readLatestManifest(draftId);
  await assertManifestVisualsAreRenderable(manifest);

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

export async function markVideoRenderJobFailed(jobId: string, message: string) {
  const { error } = await getVideoRendererClient()
    .from("video_render_jobs")
    .update({
      completed_at: new Date().toISOString(),
      error_message: message.slice(0, 4000),
      status: "failed",
    })
    .eq("id", jobId)
    .in("status", ["queued", "processing"]);

  if (error) {
    throw new Error(`Mise a jour du job de rendu impossible: ${error.message}`);
  }
}

export async function cancelActiveVideoRenderJob({
  draftId,
  userId,
}: {
  draftId: string;
  userId: string;
}) {
  await ensureDraftAccess(draftId, userId);

  const { data, error } = await getVideoRendererClient()
    .from("video_render_jobs")
    .update({
      completed_at: new Date().toISOString(),
      error_message: "Job annule manuellement depuis l'interface. Vous pouvez relancer le rendu.",
      status: "failed",
    })
    .eq("draft_id", draftId)
    .in("status", ["queued", "processing"])
    .select("id");

  if (error) {
    throw new Error(`Annulation du job de rendu impossible: ${error.message}`);
  }

  return data?.length ?? 0;
}

function rendererDispatchUrl(jobId: string) {
  const rendererBaseUrl = process.env.RENDERER_BASE_URL?.trim();

  if (!rendererBaseUrl) {
    throw new Error("RENDERER_BASE_URL est absent cote serveur Vercel.");
  }

  let baseUrl: URL;
  try {
    baseUrl = new URL(rendererBaseUrl);
  } catch {
    throw new Error(
      `RENDERER_BASE_URL est invalide cote serveur Vercel: "${rendererBaseUrl}". Utilisez une URL absolue Railway, par exemple https://votre-service.up.railway.app.`,
    );
  }

  if (!["http:", "https:"].includes(baseUrl.protocol)) {
    throw new Error(
      `RENDERER_BASE_URL doit commencer par http:// ou https://. Valeur actuelle: "${rendererBaseUrl}".`,
    );
  }

  return new URL(`/internal/render-jobs/${jobId}/dispatch`, baseUrl);
}

export async function dispatchVideoRenderJob(jobId: string) {
  const rendererSecret = process.env.RENDERER_SHARED_SECRET?.trim();

  if (!rendererSecret) {
    throw new Error("RENDERER_SHARED_SECRET est absent cote serveur Vercel.");
  }

  const endpoint = rendererDispatchUrl(jobId);
  const abortController = new AbortController();
  const timeoutId = setTimeout(() => abortController.abort(), RENDERER_DISPATCH_TIMEOUT_MS);
  let response: Response;

  try {
    response = await fetch(endpoint, {
      cache: "no-store",
      headers: {
        "X-Renderer-Secret": rendererSecret,
      },
      method: "POST",
      signal: abortController.signal,
    });
  } catch (error) {
    const reason = error instanceof Error && error.name === "AbortError"
      ? `timeout apres ${Math.round(RENDERER_DISPATCH_TIMEOUT_MS / 1000)}s`
      : error instanceof Error
        ? error.message
        : "erreur reseau inconnue";
    throw new Error(`Appel Railway impossible: ${reason}`);
  } finally {
    clearTimeout(timeoutId);
  }

  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    throw new Error(`Reponse Railway invalide (${response.status}): JSON attendu.`);
  }

  if (!response.ok) {
    const detail =
      payload && typeof payload === "object" && "detail" in payload
        ? String((payload as { detail?: unknown }).detail)
        : response.statusText;
    throw new Error(`Renderer Railway indisponible (${response.status}): ${detail}`);
  }

  if (!payload || typeof payload !== "object") {
    throw new Error("Reponse Railway invalide: objet JSON attendu.");
  }

  const rendererPayload = payload as {
    error_message?: unknown;
    job_id?: unknown;
    status?: unknown;
  };

  if (rendererPayload.job_id !== jobId) {
    throw new Error("Reponse Railway invalide: job_id inattendu ou absent.");
  }

  if (
    rendererPayload.status !== "queued" &&
    rendererPayload.status !== "processing" &&
    rendererPayload.status !== "completed" &&
    rendererPayload.status !== "failed"
  ) {
    throw new Error("Reponse Railway invalide: status inattendu ou absent.");
  }

  if (rendererPayload.status === "failed") {
    const message = typeof rendererPayload.error_message === "string" && rendererPayload.error_message
      ? rendererPayload.error_message
      : "Le renderer Railway a retourne un echec sans detail.";
    throw new Error(`Renderer Railway a echoue: ${message}`);
  }

  return payload;
}
