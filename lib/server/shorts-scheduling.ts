import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  DEFAULT_SHORTS_SCHEDULE_TIMEZONE,
  normalizeScheduleTimezone,
  type ShortsSchedulePlatform,
  type ShortsScheduleRecommendationSource,
} from "@/lib/shorts-scheduling";

type ScheduleStatus = "scheduled" | "cancelled" | "published" | "failed";
type SchedulePlatformInput = ShortsSchedulePlatform | "all";

type ValidatedDraftRow = {
  id: string;
  title: string | null;
  status: string | null;
  created_at: string;
};

type RenderJobRow = {
  draft_id: string;
  output_path: string | null;
  output_url: string | null;
  metadata: Record<string, unknown>;
  completed_at: string | null;
  status: string;
};

type ScheduleRow = {
  id: string;
  draft_id: string;
  platform: ShortsSchedulePlatform;
  scheduled_at: string;
  timezone: string;
  status: ScheduleStatus;
  recommendation_source: ShortsScheduleRecommendationSource;
  created_at: string;
  updated_at: string;
};

type SchedulePublicationRow = {
  draft_id: string;
  instagram_media_id: string | null;
  instagram_permalink: string | null;
  platform: ShortsSchedulePlatform;
  published_at: string | null;
  schedule_id: string;
  scheduled_at: string;
  status: string;
  tiktok_url: string | null;
  youtube_url: string | null;
  youtube_video_id: string | null;
};

export type SchedulableShortVideo = {
  draftId: string;
  title: string;
  outputUrl: string | null;
  renderedAt: string | null;
  validatedAt: string | null;
};

export type VideoProgrammabilityDiagnostic = {
  draftId: string;
  draftStatus: string | null;
  finalVideoUrlPresent: boolean;
  reason: "programmable" | "video_finale_introuvable" | "statut_video_incoherent" | "rendu_video_incomplet";
  renderStatus: string | null;
  videoStatus: string | null;
};

export type ShortVideoSchedule = {
  draftTitle: string;
  id: string;
  draftId: string;
  platform: ShortsSchedulePlatform;
  scheduledAt: string;
  timezone: string;
  status: ScheduleStatus;
  recommendationSource: ShortsScheduleRecommendationSource;
  createdAt: string;
  updatedAt: string;
};

export type ShortVideoScheduleInput = {
  draftId: string;
  platform: SchedulePlatformInput;
  scheduledAt: string;
  timezone: string;
  recommendationSource?: ShortsScheduleRecommendationSource;
};

export type ShortVideoScheduleUpdateInput = Omit<ShortVideoScheduleInput, "platform"> & {
  allowPast?: boolean;
  platform: SchedulePlatformInput;
  scheduleId: string;
};

let schedulingClient: SupabaseClient | null = null;

function getSchedulingClient() {
  if (schedulingClient) {
    return schedulingClient;
  }

  const supabaseUrl =
    process.env.SUPABASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Shorts scheduling requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  }

  schedulingClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return schedulingClient;
}

function mapSchedule(row: ScheduleRow, draftById = new Map<string, ValidatedDraftRow>()): ShortVideoSchedule {
  return {
    draftTitle: draftById.get(row.draft_id)?.title ?? "Sans titre",
    id: row.id,
    draftId: row.draft_id,
    platform: row.platform,
    scheduledAt: row.scheduled_at,
    timezone: row.timezone,
    status: row.status,
    recommendationSource: row.recommendation_source,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function isPlatform(value: string): value is ShortsSchedulePlatform {
  return value === "tiktok" || value === "instagram" || value === "youtube";
}

const allSchedulePlatforms: ShortsSchedulePlatform[] = ["tiktok", "instagram", "youtube"];

function expandSchedulePlatforms(platform: SchedulePlatformInput): ShortsSchedulePlatform[] {
  return platform === "all" ? allSchedulePlatforms : [platform];
}

function normalizeScheduleInput(input: ShortVideoScheduleInput, options: { allowPast?: boolean } = {}): ShortVideoScheduleInput & { platform: ShortsSchedulePlatform } {
  const platform = input.platform;
  const timezone = normalizeScheduleTimezone(input.timezone || DEFAULT_SHORTS_SCHEDULE_TIMEZONE);
  const scheduledAt = new Date(input.scheduledAt);

  if (!input.draftId) {
    throw new Error("draft_id manquant dans le planning.");
  }

  if (!isPlatform(platform)) {
    throw new Error(`Plateforme non supportee: ${String(platform)}.`);
  }

  if (!Number.isFinite(scheduledAt.getTime())) {
    throw new Error(`Date de programmation invalide: ${input.scheduledAt}.`);
  }

  if (!options.allowPast && scheduledAt.getTime() <= Date.now()) {
    throw new Error("Date de programmation invalide: le creneau est deja passe.");
  }

  return {
    draftId: input.draftId,
    platform,
    scheduledAt: scheduledAt.toISOString(),
    timezone,
    recommendationSource: input.recommendationSource ?? "default",
  };
}

function expandScheduleInputs(entries: ShortVideoScheduleInput[]) {
  return entries.flatMap((entry) =>
    expandSchedulePlatforms(entry.platform).map((platform) => ({
      ...entry,
      platform,
    })),
  );
}

function isActiveScheduleStatus(status: ScheduleStatus) {
  return status !== "cancelled" && status !== "failed" && status !== "published";
}

function publicationLooksPublished(publication: SchedulePublicationRow) {
  // NOTE: Platforms do not expose the same publication signal. Reconcile the
  // schedule from internal status, published dates and stored external media ids.
  if (publication.status === "published" || publication.published_at) {
    return true;
  }

  if (publication.platform === "instagram") {
    return Boolean(publication.instagram_media_id || publication.instagram_permalink);
  }

  if (publication.platform === "tiktok") {
    return Boolean(publication.tiktok_url);
  }

  return Boolean(
    publication.platform === "youtube" &&
      publication.youtube_video_id &&
      Date.parse(publication.scheduled_at) <= Date.now(),
  );
}

async function readSchedulePublications(scheduleIds: string[]) {
  if (scheduleIds.length === 0) {
    return [];
  }

  const { data, error } = await getSchedulingClient()
    .from("short_video_publications")
    .select("schedule_id,draft_id,platform,status,scheduled_at,published_at,youtube_video_id,youtube_url,instagram_media_id,instagram_permalink,tiktok_url")
    .in("schedule_id", scheduleIds)
    .returns<SchedulePublicationRow[]>();

  if (error) {
    throw new Error(`Lecture des publications liees impossible: ${error.message}`);
  }

  return data ?? [];
}

async function reconcilePublishedSchedules(schedules: ScheduleRow[]) {
  // NOTE: readShortsSchedulingState intentionally has a small side effect:
  // it fixes old schedules when a linked publication proves the content is
  // already published. This prevents false "past due" states.
  const publications = await readSchedulePublications(schedules.map((schedule) => schedule.id));
  const publishedByScheduleId = new Map<string, SchedulePublicationRow>();

  publications.forEach((publication) => {
    if (publicationLooksPublished(publication)) {
      publishedByScheduleId.set(publication.schedule_id, publication);
    }
  });

  const schedulesToMark = schedules.filter(
    (schedule) =>
      schedule.status !== "published" &&
      schedule.status !== "cancelled" &&
      Boolean(publishedByScheduleId.get(schedule.id)),
  );

  if (schedulesToMark.length > 0) {
    const scheduleIds = schedulesToMark.map((schedule) => schedule.id);
    const { error } = await getSchedulingClient()
      .from("short_video_schedules")
      .update({ status: "published" })
      .in("id", scheduleIds);

    if (error) {
      console.error("[Shorts Scheduling] published schedule reconciliation failed", {
        scheduleIds,
        supabaseError: error.message,
      });
    } else {
      console.info("[Shorts Scheduling] published schedule reconciliation", {
        scheduleIds,
        publications: schedulesToMark.map((schedule) => {
          const publication = publishedByScheduleId.get(schedule.id);
          return {
            scheduleId: schedule.id,
            draftId: schedule.draft_id,
            platform: schedule.platform,
            publicationStatus: publication?.status,
            publishedAt: publication?.published_at,
          };
        }),
      });
      schedulesToMark.forEach((schedule) => {
        schedule.status = "published";
      });
    }
  }

  const publicationsToMark = publications.filter(
    (publication) => publicationLooksPublished(publication) && publication.status !== "published",
  );
  if (publicationsToMark.length > 0) {
    const publicationScheduleIds = publicationsToMark.map((publication) => publication.schedule_id);
    const { error } = await getSchedulingClient()
      .from("short_video_publications")
      .update({
        published_at: new Date().toISOString(),
        status: "published",
      })
      .in("schedule_id", publicationScheduleIds)
      .neq("status", "published");

    if (error) {
      console.error("[Shorts Scheduling] publication status reconciliation failed", {
        scheduleIds: publicationScheduleIds,
        supabaseError: error.message,
      });
    }
  }

  return schedules;
}

async function ensureDraftAccess(draftIds: string[], userId: string) {
  if (draftIds.length === 0) {
    return new Set<string>();
  }

  const { data, error } = await getSchedulingClient()
    .from("content_drafts")
    .select("id")
    .eq("user_id", userId)
    .in("id", draftIds)
    .returns<Array<{ id: string }>>();

  if (error) {
    throw new Error(`Verification des brouillons impossible: ${error.message}`);
  }

  return new Set((data ?? []).map((row) => row.id));
}

function metadataString(metadata: Record<string, unknown> | null | undefined, key: string) {
  const value = metadata?.[key];
  return typeof value === "string" ? value : null;
}

function isVideoProgrammable(draft: ValidatedDraftRow, job: RenderJobRow | undefined): {
  diagnostic: VideoProgrammabilityDiagnostic;
  video: SchedulableShortVideo | null;
} {
  // NOTE: Video preparation and scheduling must share this rule: a programmable
  // video is primarily a validated final render in video_render_jobs.
  // content_drafts.status can be stale and is only a compatibility fallback.
  const videoStatus = metadataString(job?.metadata, "video_validation_status");
  const validatedAt = metadataString(job?.metadata, "video_validated_at");
  const finalVideoUrlPresent = Boolean(job?.output_url);
  const draftVideoValidated = ["video_validated", "ready_to_publish"].includes(draft.status ?? "");
  const jobVideoValidated = videoStatus === "validated" && Boolean(validatedAt);
  const hasCompletedRender = job?.status === "completed";
  const hasFinalVideo = Boolean(job?.output_url || job?.output_path);

  let reason: VideoProgrammabilityDiagnostic["reason"] = "programmable";
  if (!job) {
    reason = "video_finale_introuvable";
  } else if (!hasCompletedRender) {
    reason = "rendu_video_incomplet";
  } else if (!hasFinalVideo) {
    reason = "video_finale_introuvable";
  } else if (!jobVideoValidated && !draftVideoValidated) {
    reason = "statut_video_incoherent";
  }

  const diagnostic: VideoProgrammabilityDiagnostic = {
    draftId: draft.id,
    draftStatus: draft.status,
    finalVideoUrlPresent,
    reason,
    renderStatus: job?.status ?? null,
    videoStatus,
  };

  if (reason !== "programmable" || !job?.output_url) {
    return { diagnostic, video: null };
  }

  return {
    diagnostic,
    video: {
      draftId: draft.id,
      title: draft.title ?? "Sans titre",
      outputUrl: job.output_url,
      renderedAt: job.completed_at,
      validatedAt,
    },
  };
}

function renderJobPriority(job: RenderJobRow) {
  // NOTE: A newer incomplete render must not hide an older validated MP4, so
  // prefer the latest completed and validated job explicitly.
  if (
    job.status === "completed" &&
    job.output_url &&
    metadataString(job.metadata, "video_validation_status") === "validated"
  ) {
    return 3;
  }
  if (job.status === "completed" && (job.output_url || job.output_path)) {
    return 2;
  }
  return 1;
}

function videoProgrammabilityReasonMessage(draftId: string, state: { diagnostics?: VideoProgrammabilityDiagnostic[] }) {
  const diagnostic = state.diagnostics?.find((item) => item.draftId === draftId);
  if (!diagnostic) {
    return `Video finale introuvable: ${draftId}.`;
  }
  if (diagnostic.reason === "video_finale_introuvable") {
    return `Video finale introuvable: ${draftId}.`;
  }
  if (diagnostic.reason === "rendu_video_incomplet") {
    return `Rendu video incomplet: ${draftId}.`;
  }
  if (diagnostic.reason === "statut_video_incoherent") {
    return `Statut video incoherent: ${draftId}. La video finale existe peut-etre, mais elle n'est pas validee pour la programmation.`;
  }

  return `Video non programmable: ${draftId}.`;
}

export async function readShortsSchedulingState({ userId }: { userId: string }) {
  const supabase = getSchedulingClient();
  const { data: draftRows, error: draftError } = await supabase
    .from("content_drafts")
    .select("id,title,status,created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .returns<ValidatedDraftRow[]>();

  if (draftError) {
    throw new Error(`Lecture des videos validees impossible: ${draftError.message}`);
  }

  const allDraftIds = (draftRows ?? []).map((draft) => draft.id);
  const { data: jobs, error: jobsError } = allDraftIds.length > 0
    ? await supabase
      .from("video_render_jobs")
      .select("draft_id,status,output_path,output_url,metadata,completed_at")
      .in("draft_id", allDraftIds)
      .order("completed_at", { ascending: false })
      .returns<RenderJobRow[]>()
    : { data: [], error: null };

  if (jobsError) {
    throw new Error(`Lecture des rendus valides impossible: ${jobsError.message}`);
  }

  const latestValidatedJobByDraft = new Map<string, RenderJobRow>();
  (jobs ?? []).forEach((job) => {
    const existing = latestValidatedJobByDraft.get(job.draft_id);
    if (!existing || renderJobPriority(job) > renderJobPriority(existing)) {
      latestValidatedJobByDraft.set(job.draft_id, job);
    }
  });

  const videoDiagnostics: VideoProgrammabilityDiagnostic[] = [];
  const videos = (draftRows ?? [])
    .map((draft): SchedulableShortVideo | null => {
      const result = isVideoProgrammable(draft, latestValidatedJobByDraft.get(draft.id));
      videoDiagnostics.push(result.diagnostic);
      return result.video;
    })
    .filter((video): video is SchedulableShortVideo => Boolean(video));

  const excludedDiagnostics = videoDiagnostics.filter((diagnostic) => diagnostic.reason !== "programmable");
  if (excludedDiagnostics.length > 0) {
    console.info("[Shorts Scheduling] video programmability exclusions", {
      count: excludedDiagnostics.length,
      exclusions: excludedDiagnostics.slice(0, 20),
    });
  }
  console.info("[Shorts Scheduling] programmable videos loaded", {
    count: videos.length,
    videos: videos.map((video) => ({
      draftId: video.draftId,
      finalVideoUrlPresent: Boolean(video.outputUrl),
      validatedAt: video.validatedAt,
    })),
  });

  const { data: schedules, error: scheduleError } = await supabase
    .from("short_video_schedules")
    .select("id,draft_id,platform,scheduled_at,timezone,status,recommendation_source,created_at,updated_at")
    .in("draft_id", allDraftIds.length ? allDraftIds : ["00000000-0000-0000-0000-000000000000"])
    .order("scheduled_at", { ascending: true })
    .returns<ScheduleRow[]>();

  if (scheduleError) {
    throw new Error(`Lecture des programmations impossible: ${scheduleError.message}`);
  }

  const reconciledSchedules = await reconcilePublishedSchedules(schedules ?? []);
  const draftById = new Map((draftRows ?? []).map((draft) => [draft.id, draft]));

  return {
    diagnostics: videoDiagnostics,
    schedules: reconciledSchedules.map((schedule) => mapSchedule(schedule, draftById)),
    videos,
  };
}

export async function saveShortVideoSchedules({
  entries,
  userId,
}: {
  entries: ShortVideoScheduleInput[];
  userId: string;
}) {
  const normalizedEntries = expandScheduleInputs(entries).map((entry) => normalizeScheduleInput(entry));
  const uniqueKey = new Set<string>();
  const platformSlotKey = new Set<string>();
  normalizedEntries.forEach((entry) => {
    const key = `${entry.draftId}:${entry.platform}:${entry.scheduledAt}`;
    if (uniqueKey.has(key)) {
      throw new Error("Doublon detecte: ce brouillon est deja programme sur cette plateforme a cet horaire.");
    }
    uniqueKey.add(key);
    const slotKey = `${entry.platform}:${entry.scheduledAt}`;
    if (platformSlotKey.has(slotKey)) {
      throw new Error("Collision: meme plateforme au meme horaire.");
    }
    platformSlotKey.add(slotKey);
  });

  const allowedDraftIds = await ensureDraftAccess(
    [...new Set(normalizedEntries.map((entry) => entry.draftId))],
    userId,
  );
  const state = await readShortsSchedulingState({ userId });
  const validatedDraftIds = new Set(state.videos.map((video) => video.draftId));
  const activeDraftPlatformKeys = new Set(
    state.schedules
      .filter((schedule) => isActiveScheduleStatus(schedule.status))
      .map((schedule) => `${schedule.draftId}:${schedule.platform}`),
  );

  normalizedEntries.forEach((entry) => {
    if (!allowedDraftIds.has(entry.draftId)) {
      throw new Error(`Brouillon non autorise pour la programmation: ${entry.draftId}.`);
    }
    if (!validatedDraftIds.has(entry.draftId)) {
      throw new Error(videoProgrammabilityReasonMessage(entry.draftId, state));
    }
  });

  const rowsToSave = normalizedEntries.filter((entry) =>
    !activeDraftPlatformKeys.has(`${entry.draftId}:${entry.platform}`),
  );

  if (rowsToSave.length === 0) {
    throw new Error("Aucune nouvelle programmation: les plateformes ciblees sont deja programmees pour ces videos.");
  }

  const { data, error } = await getSchedulingClient()
    .from("short_video_schedules")
    .upsert(
      rowsToSave.map((entry) => ({
        draft_id: entry.draftId,
        platform: entry.platform,
        recommendation_source: entry.recommendationSource ?? "default",
        scheduled_at: entry.scheduledAt,
        status: "scheduled",
        timezone: entry.timezone,
      })),
      { onConflict: "draft_id,platform,scheduled_at" },
    )
    .select("id,draft_id,platform,scheduled_at,timezone,status,recommendation_source,created_at,updated_at")
    .returns<ScheduleRow[]>();

  if (error) {
    throw new Error(`Enregistrement du planning impossible: ${error.message}`);
  }

  return (data ?? []).map((schedule) => mapSchedule(schedule));
}

async function readScheduleForUpdate(scheduleId: string, userId: string) {
  const supabase = getSchedulingClient();
  const { data: schedule, error: scheduleError } = await supabase
    .from("short_video_schedules")
    .select("id,draft_id,platform,scheduled_at,timezone,status,recommendation_source,created_at,updated_at")
    .eq("id", scheduleId)
    .single<ScheduleRow>();

  if (scheduleError) {
    throw new Error(`Programmation introuvable: ${scheduleError.message}`);
  }

  const allowedDraftIds = await ensureDraftAccess([schedule.draft_id], userId);
  if (!allowedDraftIds.has(schedule.draft_id)) {
    throw new Error("Programmation non autorisee.");
  }

  return schedule;
}

async function ensureScheduleIsEditable(scheduleId: string) {
  const { data, error } = await getSchedulingClient()
    .from("short_video_publications")
    .select("id,status")
    .eq("schedule_id", scheduleId)
    .in("status", ["publishing", "published"])
    .limit(1)
    .returns<Array<{ id: string; status: string }>>();

  if (error) {
    throw new Error(`Verification publication impossible: ${error.message}`);
  }

  if ((data ?? []).length > 0) {
    throw new Error("Programmation verrouillee: une publication est en cours ou deja publiee.");
  }
}

async function ensureNoScheduleCollision({
  draftId,
  platform,
  scheduledAt,
  scheduleId,
}: {
  draftId: string;
  platform: ShortsSchedulePlatform;
  scheduledAt: string;
  scheduleId: string;
}) {
  // NOTE: Two distinct guards: no two posts for the same platform at the same
  // instant, and no active duplicate draft/platform schedule. The current
  // schedule id is excluded to keep edits possible.
  const { data, error } = await getSchedulingClient()
    .from("short_video_schedules")
    .select("id")
    .eq("platform", platform)
    .eq("scheduled_at", scheduledAt)
    .neq("id", scheduleId)
    .neq("status", "cancelled")
    .limit(1)
    .returns<Array<{ id: string }>>();

  if (error) {
    throw new Error(`Verification collision impossible: ${error.message}`);
  }

  if ((data ?? []).length > 0) {
    throw new Error("Collision: meme plateforme au meme horaire.");
  }

  const { data: duplicateDraftRows, error: duplicateDraftError } = await getSchedulingClient()
    .from("short_video_schedules")
    .select("id")
    .eq("draft_id", draftId)
    .eq("platform", platform)
    .neq("id", scheduleId)
    .in("status", ["scheduled"])
    .limit(1)
    .returns<Array<{ id: string }>>();

  if (duplicateDraftError) {
    throw new Error(`Verification doublon impossible: ${duplicateDraftError.message}`);
  }

  if ((duplicateDraftRows ?? []).length > 0) {
    throw new Error("Doublon detecte: cette video est deja programmee sur cette plateforme.");
  }
}

export async function updateShortVideoSchedule({
  input,
  userId,
}: {
  input: ShortVideoScheduleUpdateInput;
  userId: string;
}) {
  const existing = await readScheduleForUpdate(input.scheduleId, userId);
  await ensureScheduleIsEditable(existing.id);
  const targetPlatforms = expandSchedulePlatforms(input.platform);
  const normalized = normalizeScheduleInput({
    ...input,
    platform: targetPlatforms.includes(existing.platform) ? existing.platform : targetPlatforms[0],
  }, { allowPast: input.allowPast });
  const allowedDraftIds = await ensureDraftAccess([normalized.draftId], userId);
  const state = await readShortsSchedulingState({ userId });
  const validatedDraftIds = new Set(state.videos.map((video) => video.draftId));

  if (!allowedDraftIds.has(normalized.draftId)) {
    throw new Error(`Brouillon non autorise pour la programmation: ${normalized.draftId}.`);
  }
  if (!validatedDraftIds.has(normalized.draftId)) {
    throw new Error(videoProgrammabilityReasonMessage(normalized.draftId, state));
  }

  await ensureNoScheduleCollision({
    draftId: normalized.draftId,
    platform: normalized.platform,
    scheduledAt: normalized.scheduledAt,
    scheduleId: existing.id,
  });

  console.info("[Shorts Scheduling] updating schedule", {
    scheduleId: existing.id,
    previousDraftId: existing.draft_id,
    previousPlatform: existing.platform,
    previousScheduledAt: existing.scheduled_at,
    nextDraftId: normalized.draftId,
    nextPlatform: normalized.platform,
    nextScheduledAt: normalized.scheduledAt,
    timezone: normalized.timezone,
  });

  const { error } = await getSchedulingClient()
    .from("short_video_schedules")
    .update({
      draft_id: normalized.draftId,
      platform: normalized.platform,
      recommendation_source: normalized.recommendationSource ?? "manual",
      scheduled_at: normalized.scheduledAt,
      status: "scheduled",
      timezone: normalized.timezone,
    })
    .eq("id", existing.id);

  if (error) {
    console.error("[Shorts Scheduling] schedule update failed", {
      scheduleId: existing.id,
      previousScheduledAt: existing.scheduled_at,
      nextScheduledAt: normalized.scheduledAt,
      platform: normalized.platform,
      supabaseError: error.message,
    });
    throw new Error(`Modification de la programmation impossible: ${error.message}`);
  }

  if (input.platform === "all") {
    const missingPlatforms = targetPlatforms.filter((platform) => platform !== normalized.platform);
    const existingState = await readShortsSchedulingState({ userId });
    const activeKeys = new Set(
      existingState.schedules
        .filter((schedule) => isActiveScheduleStatus(schedule.status))
        .map((schedule) => `${schedule.draftId}:${schedule.platform}`),
    );
    const rowsToInsert = missingPlatforms
      .map((platform) => ({
        draft_id: normalized.draftId,
        platform,
        recommendation_source: normalized.recommendationSource ?? "manual",
        scheduled_at: normalized.scheduledAt,
        status: "scheduled",
        timezone: normalized.timezone,
      }))
      .filter((row) => !activeKeys.has(`${row.draft_id}:${row.platform}`));

    if (rowsToInsert.length > 0) {
      const { error: insertError } = await getSchedulingClient()
        .from("short_video_schedules")
        .insert(rowsToInsert);

      if (insertError) {
        console.error("[Shorts Scheduling] missing platform insert failed", {
          scheduleId: existing.id,
          nextScheduledAt: normalized.scheduledAt,
          rowsCount: rowsToInsert.length,
          supabaseError: insertError.message,
        });
        throw new Error(`Creation des plateformes manquantes impossible: ${insertError.message}`);
      }
    }
  }

  const { error: publicationUpdateError } = await getSchedulingClient()
    .from("short_video_publications")
    .update({
      draft_id: normalized.draftId,
      platform: normalized.platform,
      scheduled_at: normalized.scheduledAt,
      timezone: normalized.timezone,
    })
    .eq("schedule_id", existing.id)
    .in("status", ["draft", "ready", "scheduled", "failed"]);

  if (publicationUpdateError) {
    console.error("[Shorts Scheduling] linked publication update failed", {
      scheduleId: existing.id,
      previousScheduledAt: existing.scheduled_at,
      nextScheduledAt: normalized.scheduledAt,
      platform: normalized.platform,
      supabaseError: publicationUpdateError.message,
    });
  }

  console.info("[Shorts Scheduling] schedule updated", {
    scheduleId: existing.id,
    previousScheduledAt: existing.scheduled_at,
    nextScheduledAt: normalized.scheduledAt,
    platform: normalized.platform,
  });

  return readShortsSchedulingState({ userId });
}

export async function cancelShortVideoSchedule({
  scheduleId,
  userId,
}: {
  scheduleId: string;
  userId: string;
}) {
  const existing = await readScheduleForUpdate(scheduleId, userId);
  await ensureScheduleIsEditable(existing.id);

  const { error } = await getSchedulingClient()
    .from("short_video_schedules")
    .update({ status: "cancelled" })
    .eq("id", existing.id);

  if (error) {
    throw new Error(`Annulation de la programmation impossible: ${error.message}`);
  }

  await getSchedulingClient()
    .from("short_video_publications")
    .update({ status: "cancelled" })
    .eq("schedule_id", existing.id)
    .in("status", ["draft", "ready", "scheduled", "failed"]);

  return readShortsSchedulingState({ userId });
}

export async function markShortVideoSchedulePublished({
  scheduleId,
  userId,
}: {
  scheduleId: string;
  userId: string;
}) {
  const existing = await readScheduleForUpdate(scheduleId, userId);
  const publishedAt = new Date().toISOString();

  console.info("[Shorts Scheduling] mark schedule published", {
    scheduleId: existing.id,
    draftId: existing.draft_id,
    platform: existing.platform,
    scheduledAt: existing.scheduled_at,
  });

  const { error } = await getSchedulingClient()
    .from("short_video_schedules")
    .update({ status: "published" })
    .eq("id", existing.id);

  if (error) {
    console.error("[Shorts Scheduling] mark schedule published failed", {
      scheduleId: existing.id,
      platform: existing.platform,
      supabaseError: error.message,
    });
    throw new Error(`Marquage publication impossible: ${error.message}`);
  }

  const { error: publicationError } = await getSchedulingClient()
    .from("short_video_publications")
    .update({
      published_at: publishedAt,
      status: "published",
    })
    .eq("schedule_id", existing.id)
    .eq("platform", existing.platform)
    .neq("status", "published");

  if (publicationError) {
    console.error("[Shorts Scheduling] linked publication mark published failed", {
      scheduleId: existing.id,
      platform: existing.platform,
      supabaseError: publicationError.message,
    });
  }

  return readShortsSchedulingState({ userId });
}
