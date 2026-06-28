import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  DEFAULT_SHORTS_SCHEDULE_TIMEZONE,
  normalizeScheduleTimezone,
  type ShortsSchedulePlatform,
  type ShortsScheduleRecommendationSource,
} from "@/lib/shorts-scheduling";

type ScheduleStatus = "scheduled" | "cancelled" | "published" | "failed";

type ValidatedDraftRow = {
  id: string;
  title: string | null;
  status: string | null;
  created_at: string;
};

type RenderJobRow = {
  draft_id: string;
  output_url: string | null;
  metadata: Record<string, unknown>;
  completed_at: string | null;
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

export type SchedulableShortVideo = {
  draftId: string;
  title: string;
  outputUrl: string | null;
  renderedAt: string | null;
  validatedAt: string | null;
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
  platform: ShortsSchedulePlatform;
  scheduledAt: string;
  timezone: string;
  recommendationSource?: ShortsScheduleRecommendationSource;
};

export type ShortVideoScheduleUpdateInput = ShortVideoScheduleInput & {
  allowPast?: boolean;
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

function normalizeScheduleInput(input: ShortVideoScheduleInput, options: { allowPast?: boolean } = {}): ShortVideoScheduleInput {
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
  const validatedDraftRows = (draftRows ?? []).filter((draft) =>
    ["video_validated", "ready_to_publish"].includes(draft.status ?? ""),
  );
  const validatedDraftIds = validatedDraftRows.map((draft) => draft.id);
  const { data: jobs, error: jobsError } = validatedDraftIds.length > 0
    ? await supabase
      .from("video_render_jobs")
      .select("draft_id,output_url,metadata,completed_at")
      .in("draft_id", validatedDraftIds)
      .eq("status", "completed")
      .not("output_url", "is", null)
      .order("completed_at", { ascending: false })
      .returns<RenderJobRow[]>()
    : { data: [], error: null };

  if (jobsError) {
    throw new Error(`Lecture des rendus valides impossible: ${jobsError.message}`);
  }

  const latestValidatedJobByDraft = new Map<string, RenderJobRow>();
  (jobs ?? []).forEach((job) => {
    if (
      !latestValidatedJobByDraft.has(job.draft_id) &&
      job.metadata?.video_validation_status === "validated"
    ) {
      latestValidatedJobByDraft.set(job.draft_id, job);
    }
  });

  const videos = validatedDraftRows
    .map((draft): SchedulableShortVideo | null => {
      const job = latestValidatedJobByDraft.get(draft.id);
      if (!job) {
        return null;
      }

      return {
        draftId: draft.id,
        title: draft.title ?? "Sans titre",
        outputUrl: job.output_url,
        renderedAt: job.completed_at,
        validatedAt: typeof job.metadata.video_validated_at === "string"
          ? job.metadata.video_validated_at
          : null,
      };
    })
    .filter((video): video is SchedulableShortVideo => Boolean(video));

  const { data: schedules, error: scheduleError } = await supabase
    .from("short_video_schedules")
    .select("id,draft_id,platform,scheduled_at,timezone,status,recommendation_source,created_at,updated_at")
    .in("draft_id", allDraftIds.length ? allDraftIds : ["00000000-0000-0000-0000-000000000000"])
    .order("scheduled_at", { ascending: true })
    .returns<ScheduleRow[]>();

  if (scheduleError) {
    throw new Error(`Lecture des programmations impossible: ${scheduleError.message}`);
  }

  const draftById = new Map((draftRows ?? []).map((draft) => [draft.id, draft]));

  return {
    schedules: (schedules ?? []).map((schedule) => mapSchedule(schedule, draftById)),
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
  const normalizedEntries = entries.map((entry) => normalizeScheduleInput(entry));
  const uniqueKey = new Set<string>();
  const platformSlotKey = new Set<string>();
  normalizedEntries.forEach((entry) => {
    const key = `${entry.draftId}:${entry.platform}:${entry.scheduledAt}`;
    if (uniqueKey.has(key)) {
      throw new Error("Planning invalide: doublon exact brouillon + plateforme + horaire.");
    }
    uniqueKey.add(key);
    const slotKey = `${entry.platform}:${entry.scheduledAt}`;
    if (platformSlotKey.has(slotKey)) {
      throw new Error("Planning invalide: deux publications de la meme plateforme au meme horaire.");
    }
    platformSlotKey.add(slotKey);
  });

  const allowedDraftIds = await ensureDraftAccess(
    [...new Set(normalizedEntries.map((entry) => entry.draftId))],
    userId,
  );
  const state = await readShortsSchedulingState({ userId });
  const validatedDraftIds = new Set(state.videos.map((video) => video.draftId));

  normalizedEntries.forEach((entry) => {
    if (!allowedDraftIds.has(entry.draftId)) {
      throw new Error(`Brouillon non autorise pour la programmation: ${entry.draftId}.`);
    }
    if (!validatedDraftIds.has(entry.draftId)) {
      throw new Error(`Video non validee: ${entry.draftId}. Valide la video avant programmation.`);
    }
  });

  const { data, error } = await getSchedulingClient()
    .from("short_video_schedules")
    .upsert(
      normalizedEntries.map((entry) => ({
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
  platform,
  scheduledAt,
  scheduleId,
}: {
  platform: ShortsSchedulePlatform;
  scheduledAt: string;
  scheduleId: string;
}) {
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

  const normalized = normalizeScheduleInput(input, { allowPast: input.allowPast });
  const allowedDraftIds = await ensureDraftAccess([normalized.draftId], userId);
  const state = await readShortsSchedulingState({ userId });
  const validatedDraftIds = new Set(state.videos.map((video) => video.draftId));

  if (!allowedDraftIds.has(normalized.draftId)) {
    throw new Error(`Brouillon non autorise pour la programmation: ${normalized.draftId}.`);
  }
  if (!validatedDraftIds.has(normalized.draftId)) {
    throw new Error(`Video non validee: ${normalized.draftId}. Valide la video avant programmation.`);
  }

  await ensureNoScheduleCollision({
    platform: normalized.platform,
    scheduledAt: normalized.scheduledAt,
    scheduleId: existing.id,
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
    throw new Error(`Modification de la programmation impossible: ${error.message}`);
  }

  await getSchedulingClient()
    .from("short_video_publications")
    .update({
      draft_id: normalized.draftId,
      platform: normalized.platform,
      scheduled_at: normalized.scheduledAt,
      timezone: normalized.timezone,
    })
    .eq("schedule_id", existing.id)
    .in("status", ["draft", "ready", "scheduled", "failed"]);

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
