import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getOAuthToken } from "@/lib/server/oauth/token-store";
import {
  getYouTubeChannel,
  sanitizeYouTubeError,
} from "@/lib/server/youtube/youtube-api";
import {
  YOUTUBE_UPLOAD_SCOPE,
  buildYouTubeScopeDiagnostic,
  ensureYouTubeAccessToken,
  readYouTubeGrantedScopes,
} from "@/lib/server/youtube/youtube-oauth";

type PublicationPlatform = "youtube" | "instagram" | "tiktok";
type PublicationStatus = "draft" | "ready" | "publishing" | "scheduled" | "published" | "failed" | "cancelled";
type PublicationVisibility = "private" | "unlisted" | "public";

type ScheduleRow = {
  id: string;
  draft_id: string;
  platform: PublicationPlatform;
  scheduled_at: string;
  status: string;
  timezone: string;
};

type DraftRow = {
  caption: string | null;
  hashtags: string[] | null;
  id: string;
  status: string | null;
  title: string | null;
};

type RenderJobRow = {
  completed_at: string | null;
  draft_id: string;
  metadata: Record<string, unknown>;
  output_path: string | null;
  output_url: string | null;
  status: string;
};

type CostRow = {
  actual_cost_eur: number | null;
  draft_id: string | null;
  estimated_cost_eur: number | null;
};

type PublicationRow = {
  account_id: string | null;
  created_at: string;
  description: string | null;
  draft_id: string;
  error_message: string | null;
  hashtags: string[];
  id: string;
  metadata: Record<string, unknown>;
  platform: PublicationPlatform;
  published_at: string | null;
  schedule_id: string;
  scheduled_at: string;
  status: PublicationStatus;
  timezone: string;
  title: string;
  updated_at: string;
  visibility: PublicationVisibility;
  youtube_url: string | null;
  youtube_video_id: string | null;
};

export type ShortsPublicationItem = {
  accountLabel: string;
  costTotalEstimatedEur: number | null;
  description: string;
  draftId: string;
  errorMessage: string | null;
  hashtags: string[];
  isPastDue: boolean;
  outputUrl: string | null;
  platform: PublicationPlatform;
  publicationId: string | null;
  publishedAt: string | null;
  scheduleId: string;
  scheduledAt: string;
  status: PublicationStatus | "ready";
  timezone: string;
  title: string;
  validated: boolean;
  visibility: PublicationVisibility;
  youtubeUrl: string | null;
  youtubeVideoId: string | null;
};

export type ShortsPublicationState = {
  items: ShortsPublicationItem[];
  youtubeConnected: boolean;
  youtubeChannelTitle: string | null;
  youtubeError: string | null;
};

let publicationClient: SupabaseClient | null = null;

function getPublicationClient() {
  if (publicationClient) {
    return publicationClient;
  }

  const supabaseUrl =
    process.env.SUPABASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Shorts publication requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  }

  publicationClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return publicationClient;
}

function costValue(row: CostRow) {
  return row.actual_cost_eur ?? row.estimated_cost_eur ?? 0;
}

function metadataString(metadata: Record<string, unknown> | null | undefined, key: string) {
  const value = metadata?.[key];
  return typeof value === "string" ? value : null;
}

function normalizeHashtags(value: unknown) {
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item).trim())
      .filter(Boolean)
      .map((item) => item.replace(/^#/, ""));
  }

  if (typeof value === "string") {
    return value
      .split(/[,\s]+/)
      .map((item) => item.trim())
      .filter(Boolean)
      .map((item) => item.replace(/^#/, ""));
  }

  return [];
}

function mapPublication(row: PublicationRow) {
  return {
    accountId: row.account_id,
    description: row.description ?? "",
    draftId: row.draft_id,
    errorMessage: row.error_message,
    hashtags: row.hashtags ?? [],
    id: row.id,
    platform: row.platform,
    publishedAt: row.published_at,
    scheduleId: row.schedule_id,
    scheduledAt: row.scheduled_at,
    status: row.status,
    timezone: row.timezone,
    title: row.title,
    visibility: row.visibility,
    youtubeUrl: row.youtube_url,
    youtubeVideoId: row.youtube_video_id,
  };
}

function defaultTitle(draft: DraftRow | undefined) {
  return draft?.title?.trim() || "Short L'Edifice";
}

function defaultDescription(draft: DraftRow | undefined) {
  const hashtags = normalizeHashtags(draft?.hashtags).map((tag) => `#${tag}`).join(" ");
  return [draft?.caption?.trim(), hashtags].filter(Boolean).join("\n\n");
}

function mapItem({
  costsByDraft,
  draft,
  job,
  publication,
  schedule,
}: {
  costsByDraft: Map<string, number>;
  draft: DraftRow | undefined;
  job: RenderJobRow | undefined;
  publication: ReturnType<typeof mapPublication> | null;
  schedule: ScheduleRow;
}): ShortsPublicationItem {
  const title = publication?.title ?? defaultTitle(draft);
  const scheduledAt = publication?.scheduledAt ?? schedule.scheduled_at;
  return {
    accountLabel: "YouTube connecte",
    costTotalEstimatedEur: costsByDraft.get(schedule.draft_id) ?? null,
    description: publication?.description ?? defaultDescription(draft),
    draftId: schedule.draft_id,
    errorMessage: publication?.errorMessage ?? null,
    hashtags: publication?.hashtags ?? normalizeHashtags(draft?.hashtags),
    isPastDue: Date.parse(scheduledAt) < Date.now(),
    outputUrl: job?.output_url ?? null,
    platform: schedule.platform,
    publicationId: publication?.id ?? null,
    publishedAt: publication?.publishedAt ?? null,
    scheduleId: schedule.id,
    scheduledAt,
    status: publication?.status ?? (schedule.status === "cancelled" ? "cancelled" : "ready"),
    timezone: publication?.timezone ?? schedule.timezone,
    title,
    validated: Boolean(job && draft && ["video_validated", "ready_to_publish"].includes(draft.status ?? "")),
    visibility: publication?.visibility ?? "private",
    youtubeUrl: publication?.youtubeUrl ?? null,
    youtubeVideoId: publication?.youtubeVideoId ?? null,
  };
}

async function readYouTubeConnection() {
  const token = await getOAuthToken("youtube");
  const tokenState = await ensureYouTubeAccessToken(token);

  if (!tokenState.ok) {
    return {
      accessToken: null as string | null,
      connected: false,
      error: tokenState.error.message,
      channelTitle: null as string | null,
    };
  }

  const tokenInfo = await readYouTubeGrantedScopes(tokenState.accessToken);
  if (tokenInfo.error) {
    console.warn("[Shorts Publication YouTube] tokeninfo diagnostic", {
      code: tokenInfo.error.code,
      endpoint: "https://oauth2.googleapis.com/tokeninfo",
      message: tokenInfo.error.message,
      source: tokenInfo.source,
    });
  }
  const grantedScopes =
    tokenInfo.scopes ?? tokenState.token.scope?.split(/[\s,]+/).filter(Boolean) ?? [];
  if (!grantedScopes.includes(YOUTUBE_UPLOAD_SCOPE)) {
    return {
      accessToken: null,
      connected: false,
      error: "Reconnecte YouTube avec le scope youtube.upload.",
      channelTitle: null,
    };
  }

  const channel = await getYouTubeChannel(tokenState.accessToken);
  if (!channel.ok) {
    console.warn("[Shorts Publication YouTube] channel diagnostic", {
      code: channel.error.code,
      endpoint: "https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true",
      message: channel.error.message,
    });
    return {
      accessToken: null,
      connected: false,
      error: "Connexion YouTube detectee, publication a configurer.",
      channelTitle: null,
    };
  }

  return {
    accessToken: tokenState.accessToken,
    connected: true,
    error: null,
    channelTitle: channel.channelTitle,
  };
}

export async function readShortsPublicationState({
  userId,
}: {
  userId: string;
}): Promise<ShortsPublicationState> {
  const supabase = getPublicationClient();
  const { data: schedules, error: scheduleError } = await supabase
    .from("short_video_schedules")
    .select("id,draft_id,platform,scheduled_at,status,timezone")
    .eq("platform", "youtube")
    .in("status", ["scheduled", "cancelled", "published", "failed"])
    .order("scheduled_at", { ascending: true })
    .returns<ScheduleRow[]>();

  if (scheduleError) {
    throw new Error(`Lecture des programmations YouTube impossible: ${scheduleError.message}`);
  }

  const draftIds = [...new Set((schedules ?? []).map((schedule) => schedule.draft_id))];
  const { data: drafts, error: draftError } = draftIds.length
    ? await supabase
      .from("content_drafts")
      .select("id,title,caption,hashtags,status")
      .eq("user_id", userId)
      .in("id", draftIds)
      .returns<DraftRow[]>()
    : { data: [] as DraftRow[], error: null };

  if (draftError) {
    throw new Error(`Lecture des brouillons YouTube impossible: ${draftError.message}`);
  }

  const allowedDraftIds = new Set((drafts ?? []).map((draft) => draft.id));
  const visibleSchedules = (schedules ?? []).filter((schedule) => allowedDraftIds.has(schedule.draft_id));
  const visibleDraftIds = [...new Set(visibleSchedules.map((schedule) => schedule.draft_id))];
  const [jobsResponse, publicationsResponse, costsResponse] = await Promise.all([
    visibleDraftIds.length
      ? supabase
        .from("video_render_jobs")
        .select("draft_id,status,output_url,output_path,metadata,completed_at")
        .in("draft_id", visibleDraftIds)
        .eq("status", "completed")
        .order("completed_at", { ascending: false })
        .returns<RenderJobRow[]>()
      : Promise.resolve({ data: [] as RenderJobRow[], error: null }),
    visibleDraftIds.length
      ? supabase
        .from("short_video_publications")
        .select("id,schedule_id,draft_id,platform,status,title,description,hashtags,visibility,scheduled_at,timezone,account_id,youtube_video_id,youtube_url,published_at,error_message,metadata,created_at,updated_at")
        .in("draft_id", visibleDraftIds)
        .eq("platform", "youtube")
        .returns<PublicationRow[]>()
      : Promise.resolve({ data: [] as PublicationRow[], error: null }),
    visibleDraftIds.length
      ? supabase
        .from("cost_events")
        .select("draft_id,estimated_cost_eur,actual_cost_eur")
        .eq("user_id", userId)
        .in("draft_id", visibleDraftIds)
        .returns<CostRow[]>()
      : Promise.resolve({ data: [] as CostRow[], error: null }),
  ]);

  if (jobsResponse.error) {
    throw new Error(`Lecture des videos finales impossible: ${jobsResponse.error.message}`);
  }
  if (publicationsResponse.error) {
    throw new Error(`Lecture des publications impossible: ${publicationsResponse.error.message}`);
  }
  if (costsResponse.error) {
    throw new Error(`Lecture des couts publication impossible: ${costsResponse.error.message}`);
  }

  const draftById = new Map((drafts ?? []).map((draft) => [draft.id, draft]));
  const latestJobByDraft = new Map<string, RenderJobRow>();
  (jobsResponse.data ?? []).forEach((job) => {
    if (!latestJobByDraft.has(job.draft_id) && metadataString(job.metadata, "video_validation_status") === "validated") {
      latestJobByDraft.set(job.draft_id, job);
    }
  });
  const publicationBySchedule = new Map(
    (publicationsResponse.data ?? []).map((publication) => [
      publication.schedule_id,
      mapPublication(publication),
    ]),
  );
  const costsByDraft = new Map<string, number>();
  (costsResponse.data ?? []).forEach((row) => {
    if (!row.draft_id) {
      return;
    }
    costsByDraft.set(row.draft_id, (costsByDraft.get(row.draft_id) ?? 0) + costValue(row));
  });

  const youtube = await readYouTubeConnection().catch((error) => ({
    accessToken: null,
    connected: false,
    error: error instanceof Error ? error.message : "Lecture YouTube indisponible.",
    channelTitle: null,
  }));

  return {
    items: visibleSchedules.map((schedule) =>
      mapItem({
        costsByDraft,
        draft: draftById.get(schedule.draft_id),
        job: latestJobByDraft.get(schedule.draft_id),
        publication: publicationBySchedule.get(schedule.id) ?? null,
        schedule,
      }),
    ),
    youtubeChannelTitle: youtube.channelTitle,
    youtubeConnected: youtube.connected,
    youtubeError: youtube.error,
  };
}

function normalizeVisibility(value: unknown): PublicationVisibility {
  return value === "public" || value === "unlisted" || value === "private"
    ? value
    : "private";
}

function normalizeText(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

async function readScheduleForPublication(scheduleId: string, userId: string) {
  const supabase = getPublicationClient();
  const { data: schedule, error: scheduleError } = await supabase
    .from("short_video_schedules")
    .select("id,draft_id,platform,scheduled_at,status,timezone")
    .eq("id", scheduleId)
    .eq("platform", "youtube")
    .single<ScheduleRow>();

  if (scheduleError) {
    throw new Error(`Programmation YouTube introuvable: ${scheduleError.message}`);
  }

  const { data: draft, error: draftError } = await supabase
    .from("content_drafts")
    .select("id,title,caption,hashtags,status")
    .eq("id", schedule.draft_id)
    .eq("user_id", userId)
    .single<DraftRow>();

  if (draftError) {
    throw new Error(`Brouillon non autorise pour publication: ${draftError.message}`);
  }

  return { draft, schedule };
}

function normalizePublicationInput(input: Record<string, unknown>, draft: DraftRow, schedule: ScheduleRow) {
  const title = normalizeText(input.title, 100) || defaultTitle(draft);
  const description = normalizeText(input.description, 5000) || defaultDescription(draft);
  const scheduledAt = normalizeText(input.scheduledAt, 80) || schedule.scheduled_at;
  const parsedDate = new Date(scheduledAt);

  if (!title) {
    throw new Error("Titre YouTube obligatoire.");
  }
  if (!Number.isFinite(parsedDate.getTime())) {
    throw new Error("Date de publication invalide.");
  }

  return {
    description,
    hashtags: normalizeHashtags(input.hashtags),
    scheduledAt: parsedDate.toISOString(),
    title,
    visibility: normalizeVisibility(input.visibility),
  };
}

async function latestValidatedJob(draftId: string) {
  const { data, error } = await getPublicationClient()
    .from("video_render_jobs")
    .select("draft_id,status,output_url,output_path,metadata,completed_at")
    .eq("draft_id", draftId)
    .eq("status", "completed")
    .order("completed_at", { ascending: false })
    .limit(10)
    .returns<RenderJobRow[]>();

  if (error) {
    throw new Error(`Lecture video finale impossible: ${error.message}`);
  }

  return (data ?? []).find((job) => metadataString(job.metadata, "video_validation_status") === "validated") ?? null;
}

async function assertNoActiveDuplicate(draftId: string, scheduleId: string) {
  const { data, error } = await getPublicationClient()
    .from("short_video_publications")
    .select("id,status,schedule_id")
    .eq("draft_id", draftId)
    .eq("platform", "youtube")
    .in("status", ["draft", "ready", "publishing", "scheduled"])
    .returns<Array<{ id: string; schedule_id: string; status: PublicationStatus }>>();

  if (error) {
    throw new Error(`Verification anti-doublon impossible: ${error.message}`);
  }

  const duplicate = (data ?? []).find((row) => row.schedule_id !== scheduleId);
  if (duplicate) {
    throw new Error("Publication YouTube active deja existante pour ce brouillon.");
  }
}

export async function prepareYouTubeShortPublication({
  input,
  scheduleId,
  userId,
}: {
  input: Record<string, unknown>;
  scheduleId: string;
  userId: string;
}) {
  const supabase = getPublicationClient();
  const { draft, schedule } = await readScheduleForPublication(scheduleId, userId);
  const normalized = normalizePublicationInput(input, draft, schedule);
  const job = await latestValidatedJob(draft.id);

  if (!job?.output_url && !job?.output_path) {
    throw new Error("Video finale validee introuvable.");
  }

  await assertNoActiveDuplicate(draft.id, schedule.id);

  const row = {
    description: normalized.description,
    draft_id: draft.id,
    hashtags: normalized.hashtags,
    metadata: {
      prepared_from: "shorts_publication_v1",
      video_output_path: job.output_path,
      video_output_url: job.output_url,
    },
    platform: "youtube",
    schedule_id: schedule.id,
    scheduled_at: normalized.scheduledAt,
    status: "ready",
    timezone: schedule.timezone,
    title: normalized.title,
    visibility: normalized.visibility,
  };

  const { error } = await supabase
    .from("short_video_publications")
    .upsert(row, { onConflict: "schedule_id,platform" });

  if (error) {
    throw new Error(`Preparation publication YouTube impossible: ${error.message}`);
  }

  return readShortsPublicationState({ userId });
}

async function readPreparedPublication(publicationId: string, userId: string) {
  const supabase = getPublicationClient();
  const { data: publication, error: publicationError } = await supabase
    .from("short_video_publications")
    .select("id,schedule_id,draft_id,platform,status,title,description,hashtags,visibility,scheduled_at,timezone,account_id,youtube_video_id,youtube_url,published_at,error_message,metadata,created_at,updated_at")
    .eq("id", publicationId)
    .eq("platform", "youtube")
    .single<PublicationRow>();

  if (publicationError) {
    throw new Error(`Publication YouTube introuvable: ${publicationError.message}`);
  }

  const { data: draft, error: draftError } = await supabase
    .from("content_drafts")
    .select("id,title,caption,hashtags,status")
    .eq("id", publication.draft_id)
    .eq("user_id", userId)
    .single<DraftRow>();

  if (draftError) {
    throw new Error(`Brouillon non autorise pour publication: ${draftError.message}`);
  }

  return { draft, publication };
}

async function downloadVideoBytes(job: RenderJobRow) {
  if (job.output_path) {
    const { data, error } = await getPublicationClient()
      .storage
      .from("content-assets")
      .download(job.output_path.replace(/^content-assets\//, ""));

    if (!error && data) {
      return {
        bytes: await data.arrayBuffer(),
        contentType: data.type || "video/mp4",
      };
    }
  }

  if (!job.output_url) {
    throw new Error("Video finale sans chemin ni URL.");
  }

  const response = await fetch(job.output_url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error("Telechargement de la video finale impossible.");
  }

  return {
    bytes: await response.arrayBuffer(),
    contentType: response.headers.get("content-type") ?? "video/mp4",
  };
}

async function uploadYouTubeVideo({
  accessToken,
  description,
  hashtags,
  title,
  video,
  visibility,
}: {
  accessToken: string;
  description: string;
  hashtags: string[];
  title: string;
  video: { bytes: ArrayBuffer; contentType: string };
  visibility: PublicationVisibility;
}) {
  const uploadUrl = new URL("https://www.googleapis.com/upload/youtube/v3/videos");
  uploadUrl.searchParams.set("part", "snippet,status");
  uploadUrl.searchParams.set("uploadType", "resumable");

  const hashtagText = hashtags.map((tag) => `#${tag.replace(/^#/, "")}`).join(" ");
  const metadata = {
    snippet: {
      categoryId: "22",
      description: [description, hashtagText].filter(Boolean).join("\n\n"),
      tags: hashtags,
      title,
    },
    status: {
      privacyStatus: visibility,
      selfDeclaredMadeForKids: false,
    },
  };

  const initResponse = await fetch(uploadUrl, {
    body: JSON.stringify(metadata),
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json; charset=UTF-8",
      "X-Upload-Content-Length": String(video.bytes.byteLength),
      "X-Upload-Content-Type": video.contentType,
    },
    method: "POST",
  });

  if (!initResponse.ok) {
    const payload = await initResponse.json().catch(() => null);
    const sanitized = sanitizeYouTubeError(payload, initResponse.status);
    console.error("[Shorts Publication YouTube] resumable init failed", {
      code: sanitized.code,
      endpoint: "https://www.googleapis.com/upload/youtube/v3/videos",
      message: sanitized.message,
      status: initResponse.status,
    });
    throw new Error(`Erreur YouTube: ${sanitized.message}`);
  }

  const sessionUrl = initResponse.headers.get("location");
  if (!sessionUrl) {
    throw new Error("YouTube n'a pas retourne d'URL de session upload.");
  }

  const uploadResponse = await fetch(sessionUrl, {
    body: video.bytes,
    cache: "no-store",
    headers: {
      "Content-Length": String(video.bytes.byteLength),
      "Content-Type": video.contentType,
    },
    method: "PUT",
  });
  const payload = await uploadResponse.json().catch(() => null) as { id?: string } | null;

  if (!uploadResponse.ok || !payload?.id) {
    const sanitized = sanitizeYouTubeError(payload, uploadResponse.status);
    console.error("[Shorts Publication YouTube] upload failed", {
      code: sanitized.code,
      endpoint: "youtube resumable upload session",
      message: sanitized.message,
      status: uploadResponse.status,
    });
    throw new Error(`Erreur YouTube: ${sanitized.message}`);
  }

  return {
    url: `https://studio.youtube.com/video/${payload.id}/edit`,
    videoId: payload.id,
  };
}

export async function publishYouTubeShort({
  input,
  publicationId,
  userId,
}: {
  input: Record<string, unknown>;
  publicationId: string;
  userId: string;
}) {
  const supabase = getPublicationClient();
  const { draft, publication } = await readPreparedPublication(publicationId, userId);
  const normalized = normalizePublicationInput(input, draft, {
    draft_id: draft.id,
    id: publication.schedule_id,
    platform: "youtube",
    scheduled_at: publication.scheduled_at,
    status: "scheduled",
    timezone: publication.timezone,
  });
  const job = await latestValidatedJob(draft.id);

  if (!["video_validated", "ready_to_publish"].includes(draft.status ?? "")) {
    throw new Error("Video non validee.");
  }
  if (!job?.output_url && !job?.output_path) {
    throw new Error("Video finale disponible introuvable.");
  }

  await assertNoActiveDuplicate(draft.id, publication.schedule_id);

  const youtube = await readYouTubeConnection();
  if (!youtube.connected || !youtube.accessToken) {
    throw new Error(youtube.error ?? "Compte YouTube non connecte.");
  }

  const token = await getOAuthToken("youtube");
  const grantedScopes = token?.scope?.split(/[\s,]+/).filter(Boolean) ?? [];
  const scopeDiagnostic = buildYouTubeScopeDiagnostic(grantedScopes);

  await supabase
    .from("short_video_publications")
    .update({
      description: normalized.description,
      error_message: null,
      hashtags: normalized.hashtags,
      metadata: {
        ...publication.metadata,
        channel_title: youtube.channelTitle,
        scope_diagnostic: scopeDiagnostic,
      },
      scheduled_at: normalized.scheduledAt,
      status: "publishing",
      title: normalized.title,
      visibility: normalized.visibility,
    })
    .eq("id", publication.id);

  try {
    const video = await downloadVideoBytes(job);
    const upload = await uploadYouTubeVideo({
      accessToken: youtube.accessToken,
      description: normalized.description,
      hashtags: normalized.hashtags,
      title: normalized.title,
      video,
      visibility: normalized.visibility,
    });
    const publishedAt = new Date().toISOString();
    const { error } = await supabase
      .from("short_video_publications")
      .update({
        error_message: null,
        published_at: publishedAt,
        status: "published",
        youtube_url: upload.url,
        youtube_video_id: upload.videoId,
        metadata: {
          ...publication.metadata,
          channel_title: youtube.channelTitle,
          publication_event_source: "manual_youtube_shorts_v1",
          video_output_path: job.output_path,
        },
      })
      .eq("id", publication.id);

    if (error) {
      throw new Error(`Publication reussie mais historique impossible: ${error.message}`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Publication YouTube impossible.";
    await supabase
      .from("short_video_publications")
      .update({
        error_message: message,
        status: "failed",
      })
      .eq("id", publication.id);
    throw new Error(message);
  }

  return readShortsPublicationState({ userId });
}
