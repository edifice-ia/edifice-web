import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  estimateImageAnalysisCost,
  estimateImageGenerationCost,
  estimateSubtitleCost,
  estimateVideoRenderCost,
  estimateVoiceCost,
  type CostCategory,
  type CostEstimate,
  type CostProvider,
} from "@/lib/server/cost-rates";

type CostStatus = "estimated" | "recorded" | "reconciled" | "failed";

type CostEventRow = {
  account_id: string | null;
  actual_cost_eur: number | null;
  category: CostCategory;
  created_at: string;
  currency: "EUR";
  draft_id: string | null;
  estimated_cost_eur: number | null;
  event_key: string;
  id: string;
  metadata: Record<string, unknown>;
  occurred_at: string;
  platform: string | null;
  provider: CostProvider;
  quantity: number | null;
  status: CostStatus;
  unit: string | null;
  user_id: string | null;
};

export type DraftCostSummary = {
  alreadyRecordedEur: number | null;
  currency: "EUR";
  details: Array<CostEstimate & { label: string; recordedCostEur: number | null }>;
  events: CostEventRow[];
  remainingEstimatedEur: number | null;
  totalEstimatedEur: number | null;
};

export type ObservatoryCostSummary = {
  availableAccounts: Array<{ accountId: string; label: string }>;
  availableCategories: CostCategory[];
  availableProviders: CostProvider[];
  byAccount: Array<{ accountId: string; totalEur: number }>;
  byCategory: Array<{ category: CostCategory; totalEur: number }>;
  byDay: Array<{ date: string; totalEur: number }>;
  byProvider: Array<{ provider: CostProvider; totalEur: number }>;
  costThisMonthEur: number;
  costThirtyDaysEur: number;
  costTodayEur: number;
  costTotalEur: number;
  costSevenDaysEur: number;
  averagePerCompletedVideoEur: number | null;
  estimatedEventsCount: number;
  eventsCount: number;
  filters: ObservatoryCostFilters;
  lastUpdatedAt: string | null;
  periodCostEur: number;
  periodEventsCount: number;
  previousPeriodEur: number | null;
  reconciledEventsCount: number;
};

export type ObservatoryCostPeriod = "today" | "7d" | "30d" | "month";

export type ObservatoryCostFilters = {
  accountId: string | null;
  category: CostCategory | "all";
  period: ObservatoryCostPeriod;
  provider: CostProvider | "all";
};

export type CostBackfillPreview = {
  createdEventsCount: number;
  draftCount: number;
  estimatedTotalEur: number;
  nonEstimableCount: number;
};

type DraftRow = {
  created_at: string;
  id: string;
  score: Record<string, unknown> | null;
  script: string | null;
  user_id: string | null;
  voice_asset_id?: string | null;
  voice_generated_at?: string | null;
};

type ContentAssetRow = {
  asset_type: "image" | "audio" | "video" | "subtitle";
  created_at: string;
  id: string;
  linked_draft_id: string | null;
  metadata: Record<string, unknown>;
};

type VisualSceneRow = {
  asset_id: string | null;
  created_at: string;
  draft_id: string;
  generation_source: string;
  generation_status: string;
  id: string;
  score_source: string;
  updated_at: string;
  visual_prompt_index: number;
};

type VideoRenderJobRow = {
  completed_at: string | null;
  draft_id: string;
  id: string;
  metadata: Record<string, unknown>;
  status: string;
};

let costClient: SupabaseClient | null = null;

function getCostClient() {
  if (costClient) {
    return costClient;
  }

  const supabaseUrl =
    process.env.SUPABASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Cost tracking requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  }

  costClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return costClient;
}

function sumKnown(values: Array<number | null | undefined>) {
  let hasKnown = false;
  const total = values.reduce<number>((sum, value) => {
    if (typeof value === "number" && Number.isFinite(value)) {
      hasKnown = true;
      return sum + value;
    }
    return sum;
  }, 0);

  return hasKnown ? Math.round(total * 1_000_000) / 1_000_000 : null;
}

function eventCost(row: CostEventRow) {
  return row.actual_cost_eur ?? row.estimated_cost_eur ?? 0;
}

function dateKeyParis(value: string) {
  return new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "Europe/Paris",
    year: "numeric",
  }).format(new Date(value));
}

function startOfParisDay(date = new Date()) {
  const parts = dateKeyParis(date.toISOString()).split("-").map(Number);
  return new Date(Date.UTC(parts[0], parts[1] - 1, parts[2], -2, 0, 0));
}

function addUtcDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function startOfParisMonth(date = new Date()) {
  const parts = dateKeyParis(date.toISOString()).split("-").map(Number);
  return new Date(Date.UTC(parts[0], parts[1] - 1, 1, -2, 0, 0));
}

function getCostPeriodBounds(period: ObservatoryCostPeriod, now = new Date()) {
  const todayStart = startOfParisDay(now);
  const tomorrowStart = addUtcDays(todayStart, 1);

  if (period === "today") {
    return {
      currentEnd: tomorrowStart,
      currentStart: todayStart,
      previousEnd: todayStart,
      previousStart: addUtcDays(todayStart, -1),
    };
  }

  if (period === "month") {
    const currentStart = startOfParisMonth(now);
    const previousMonthProbe = new Date(currentStart);
    previousMonthProbe.setUTCDate(0);
    const previousStart = startOfParisMonth(previousMonthProbe);
    return {
      currentEnd: tomorrowStart,
      currentStart,
      previousEnd: currentStart,
      previousStart,
    };
  }

  const days = period === "7d" ? 7 : 30;
  const currentStart = addUtcDays(todayStart, -(days - 1));
  return {
    currentEnd: tomorrowStart,
    currentStart,
    previousEnd: currentStart,
    previousStart: addUtcDays(currentStart, -days),
  };
}

function normalizeObservatoryCostFilters(
  filters: Partial<ObservatoryCostFilters> = {},
): ObservatoryCostFilters {
  const period = filters.period === "today" ||
    filters.period === "7d" ||
    filters.period === "30d" ||
    filters.period === "month"
    ? filters.period
    : "30d";

  return {
    accountId: filters.accountId?.trim() || null,
    category: filters.category ?? "all",
    period,
    provider: filters.provider ?? "all",
  };
}

async function readDraftCostEvents(draftId: string, userId: string) {
  const { data, error } = await getCostClient()
    .from("cost_events")
    .select("id,user_id,draft_id,account_id,platform,provider,category,quantity,unit,estimated_cost_eur,actual_cost_eur,currency,status,event_key,metadata,occurred_at,created_at")
    .eq("user_id", userId)
    .eq("draft_id", draftId)
    .order("occurred_at", { ascending: true })
    .returns<CostEventRow[]>();

  if (error) {
    throw new Error(`Lecture des couts impossible: ${error.message}`);
  }

  return data ?? [];
}

export async function recordCostEvent({
  accountId = "lignes_interieures",
  draftId,
  estimate,
  eventKey,
  metadata = {},
  occurredAt = new Date().toISOString(),
  platform = null,
  status = "estimated",
  userId,
}: {
  accountId?: string | null;
  draftId?: string | null;
  estimate: CostEstimate;
  eventKey: string;
  metadata?: Record<string, unknown>;
  occurredAt?: string;
  platform?: string | null;
  status?: CostStatus;
  userId?: string | null;
}) {
  if (!eventKey) {
    return;
  }

  const { error } = await getCostClient()
    .from("cost_events")
    .upsert(
      {
        account_id: accountId,
        actual_cost_eur: null,
        category: estimate.category,
        currency: "EUR",
        draft_id: draftId ?? null,
        estimated_cost_eur: estimate.estimatedCostEur,
        event_key: eventKey,
        metadata: {
          ...metadata,
          estimate_note: estimate.note,
        },
        occurred_at: occurredAt,
        platform,
        provider: estimate.provider,
        quantity: estimate.quantity,
        status,
        unit: estimate.unit,
        user_id: userId ?? null,
      },
      { onConflict: "event_key" },
    );

  if (error) {
    console.warn("[Cost Tracking] event save failed", {
      eventKey,
      message: error.message,
    });
  }
}

export async function recordVoiceCostFromMedia({
  action,
  draftId,
  media,
  userId,
}: {
  action: string;
  draftId: string;
  media: { voice?: { generatedAt: string | null; wordCount?: number; durationEstimateSeconds?: number } | null };
  userId: string;
}) {
  const voice = media.voice;
  if (!voice?.generatedAt) {
    return;
  }

  await recordCostEvent({
    draftId,
    estimate: estimateVoiceCost(typeof voice.wordCount === "number" ? voice.wordCount * 6 : null),
    eventKey: `shorts:${draftId}:voice:${voice.generatedAt}`,
    metadata: {
      action,
      estimated_character_count: typeof voice.wordCount === "number" ? voice.wordCount * 6 : null,
      duration_seconds: voice.durationEstimateSeconds ?? null,
      word_count: voice.wordCount ?? null,
    },
    occurredAt: voice.generatedAt,
    userId,
  });
}

export async function recordSubtitleCostFromMedia({
  action,
  draftId,
  media,
  userId,
}: {
  action: string;
  draftId: string;
  media: { subtitles?: { durationSeconds?: number; generatedAt: string | null; mode?: string; segmentsCount?: number } | null };
  userId: string;
}) {
  const subtitles = media.subtitles;
  if (!subtitles?.generatedAt) {
    return;
  }

  await recordCostEvent({
    draftId,
    estimate: estimateSubtitleCost(subtitles.durationSeconds ?? null),
    eventKey: `shorts:${draftId}:subtitles:${subtitles.generatedAt}`,
    metadata: {
      action,
      duration_seconds: subtitles.durationSeconds ?? null,
      mode: subtitles.mode ?? null,
      segments_count: subtitles.segmentsCount ?? null,
    },
    occurredAt: subtitles.generatedAt,
    userId,
  });
}

export async function recordVideoRenderCost({
  draftId,
  userId,
  videoRender,
}: {
  draftId: string;
  userId: string;
  videoRender: { completedAt: string | null; durationSeconds: number | null; id: string; status: string };
}) {
  if (videoRender.status !== "completed" || !videoRender.completedAt) {
    return;
  }

  await recordCostEvent({
    draftId,
    estimate: estimateVideoRenderCost(videoRender.durationSeconds),
    eventKey: `shorts:${draftId}:video_render:${videoRender.id}`,
    metadata: {
      duration_seconds: videoRender.durationSeconds,
      job_id: videoRender.id,
    },
    occurredAt: videoRender.completedAt,
    userId,
  });
}

export async function recordVisualCost({
  action,
  draftId,
  sceneIndex,
  userId,
}: {
  action: string;
  draftId: string;
  sceneIndex?: number;
  userId: string;
}) {
  const isAnalysis = action === "analyze_scene";
  const estimate = isAnalysis
    ? estimateImageAnalysisCost(1)
    : estimateImageGenerationCost(1);

  await recordCostEvent({
    draftId,
    estimate,
    eventKey: `shorts:${draftId}:visual:${action}:${sceneIndex ?? "all"}:${new Date().toISOString()}`,
    metadata: {
      action,
      scene_index: sceneIndex ?? null,
    },
    userId,
  });
}

function metadataNumber(metadata: Record<string, unknown>, key: string) {
  const value = metadata[key];
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function draftDurationSeconds(draft: DraftRow) {
  return metadataNumber(draft.score ?? {}, "duration_seconds");
}

async function readExistingEventKeys(userId: string, eventKeys: string[]) {
  if (eventKeys.length === 0) {
    return new Set<string>();
  }

  const { data, error } = await getCostClient()
    .from("cost_events")
    .select("event_key")
    .eq("user_id", userId)
    .in("event_key", eventKeys)
    .returns<Array<{ event_key: string }>>();

  if (error) {
    throw new Error(`Lecture des couts existants impossible: ${error.message}`);
  }

  return new Set((data ?? []).map((row) => row.event_key));
}

async function buildBackfillCandidates(userId: string, days = 30) {
  const since = new Date(Date.now() - Math.max(1, days) * 86_400_000).toISOString();
  const supabase = getCostClient();
  const { data: drafts, error: draftError } = await supabase
    .from("content_drafts")
    .select("id,user_id,script,score,created_at,voice_asset_id,voice_generated_at")
    .eq("user_id", userId)
    .gte("created_at", since)
    .returns<DraftRow[]>();

  if (draftError) {
    throw new Error(`Lecture des brouillons pour backfill impossible: ${draftError.message}`);
  }

  const draftRows = drafts ?? [];
  const draftIds = draftRows.map((draft) => draft.id);
  const draftById = new Map(draftRows.map((draft) => [draft.id, draft]));
  if (draftIds.length === 0) {
    return { candidates: [], draftCount: 0, nonEstimableCount: 0 };
  }

  const [assetsResponse, scenesResponse, jobsResponse] = await Promise.all([
    supabase
      .from("content_assets")
      .select("id,asset_type,linked_draft_id,metadata,created_at")
      .in("linked_draft_id", draftIds)
      .gte("created_at", since)
      .returns<ContentAssetRow[]>(),
    supabase
      .from("content_draft_visual_scenes")
      .select("id,draft_id,asset_id,visual_prompt_index,generation_source,generation_status,score_source,created_at,updated_at")
      .in("draft_id", draftIds)
      .returns<VisualSceneRow[]>(),
    supabase
      .from("video_render_jobs")
      .select("id,draft_id,status,completed_at,metadata")
      .in("draft_id", draftIds)
      .eq("status", "completed")
      .gte("completed_at", since)
      .returns<VideoRenderJobRow[]>(),
  ]);

  if (assetsResponse.error) {
    throw new Error(`Lecture assets pour backfill impossible: ${assetsResponse.error.message}`);
  }
  if (scenesResponse.error) {
    throw new Error(`Lecture scenes visuelles pour backfill impossible: ${scenesResponse.error.message}`);
  }
  if (jobsResponse.error) {
    throw new Error(`Lecture rendus pour backfill impossible: ${jobsResponse.error.message}`);
  }

  const candidates: Array<{
    draftId: string;
    estimate: CostEstimate;
    eventKey: string;
    metadata: Record<string, unknown>;
    occurredAt: string;
  }> = [];
  let nonEstimableCount = 0;

  for (const asset of assetsResponse.data ?? []) {
    const draftId = asset.linked_draft_id;
    if (!draftId) {
      continue;
    }
    const draft = draftById.get(draftId);
    if (!draft) {
      continue;
    }

    if (asset.asset_type === "audio") {
      const characterCount = metadataNumber(asset.metadata, "script_character_count") ??
        metadataNumber(asset.metadata, "character_count") ??
        (draft.script?.length ?? null);
      candidates.push({
        draftId,
        estimate: estimateVoiceCost(characterCount),
        eventKey: `shorts:${draftId}:voice:asset:${asset.id}`,
        metadata: { backfill: true, asset_id: asset.id },
        occurredAt: asset.created_at,
      });
    }

    if (asset.asset_type === "subtitle" && asset.metadata?.subtitle_format === "json") {
      const durationSeconds = metadataNumber(asset.metadata, "duration_seconds") ?? draftDurationSeconds(draft);
      if (durationSeconds === null) {
        nonEstimableCount += 1;
      }
      candidates.push({
        draftId,
        estimate: estimateSubtitleCost(durationSeconds),
        eventKey: `shorts:${draftId}:subtitles:asset:${asset.id}`,
        metadata: { backfill: true, asset_id: asset.id, subtitle_format: asset.metadata.subtitle_format },
        occurredAt: asset.created_at,
      });
    }
  }

  for (const scene of scenesResponse.data ?? []) {
    if (scene.score_source === "gpt_vision") {
      candidates.push({
        draftId: scene.draft_id,
        estimate: estimateImageAnalysisCost(1),
        eventKey: `shorts:${scene.draft_id}:visual_analysis:scene:${scene.id}`,
        metadata: { backfill: true, scene_id: scene.id, visual_prompt_index: scene.visual_prompt_index },
        occurredAt: scene.updated_at ?? scene.created_at,
      });
    }
    if (scene.generation_source === "generated" || scene.generation_source === "regenerated") {
      candidates.push({
        draftId: scene.draft_id,
        estimate: estimateImageGenerationCost(1),
        eventKey: `shorts:${scene.draft_id}:image_generation:scene:${scene.id}`,
        metadata: { backfill: true, scene_id: scene.id, generation_source: scene.generation_source },
        occurredAt: scene.updated_at ?? scene.created_at,
      });
    }
  }

  for (const job of jobsResponse.data ?? []) {
    const draft = draftById.get(job.draft_id);
    const durationSeconds = metadataNumber(job.metadata, "duration_seconds") ?? (draft ? draftDurationSeconds(draft) : null);
    if (durationSeconds === null) {
      nonEstimableCount += 1;
    }
    candidates.push({
      draftId: job.draft_id,
      estimate: estimateVideoRenderCost(durationSeconds),
      eventKey: `shorts:${job.draft_id}:video_render:${job.id}`,
      metadata: { backfill: true, job_id: job.id },
      occurredAt: job.completed_at ?? new Date().toISOString(),
    });
  }

  const existingKeys = await readExistingEventKeys(userId, candidates.map((candidate) => candidate.eventKey));
  return {
    candidates: candidates.filter((candidate) => !existingKeys.has(candidate.eventKey)),
    draftCount: draftIds.length,
    nonEstimableCount,
  };
}

export async function previewCostBackfill({
  days = 30,
  userId,
}: {
  days?: number;
  userId: string;
}): Promise<CostBackfillPreview> {
  const { candidates, draftCount, nonEstimableCount } = await buildBackfillCandidates(userId, days);
  return {
    createdEventsCount: candidates.length,
    draftCount,
    estimatedTotalEur: candidates.reduce((sum, candidate) => sum + (candidate.estimate.estimatedCostEur ?? 0), 0),
    nonEstimableCount,
  };
}

export async function runCostBackfill({
  days = 30,
  userId,
}: {
  days?: number;
  userId: string;
}): Promise<CostBackfillPreview> {
  const { candidates, draftCount, nonEstimableCount } = await buildBackfillCandidates(userId, days);
  for (const candidate of candidates) {
    await recordCostEvent({
      draftId: candidate.draftId,
      estimate: candidate.estimate,
      eventKey: candidate.eventKey,
      metadata: candidate.metadata,
      occurredAt: candidate.occurredAt,
      status: "estimated",
      userId,
    });
  }

  return {
    createdEventsCount: candidates.length,
    draftCount,
    estimatedTotalEur: candidates.reduce((sum, candidate) => sum + (candidate.estimate.estimatedCostEur ?? 0), 0),
    nonEstimableCount,
  };
}

export async function readDraftCostSummary({
  draftId,
  durationSeconds,
  userId,
  visualCount,
  voiceCharacterCount,
}: {
  draftId: string;
  durationSeconds?: number | null;
  userId: string;
  visualCount?: number | null;
  voiceCharacterCount?: number | null;
}): Promise<DraftCostSummary> {
  const events = await readDraftCostEvents(draftId, userId);
  const details = [
    { ...estimateImageGenerationCost(visualCount ?? null), label: "Visuels" },
    { ...estimateVoiceCost(voiceCharacterCount ?? null), label: "Voix" },
    { ...estimateSubtitleCost(durationSeconds ?? null), label: "Sous-titres" },
    { ...estimateVideoRenderCost(durationSeconds ?? null), label: "Rendu video" },
  ].map((detail) => ({
    ...detail,
    recordedCostEur: sumKnown(
      events
        .filter((event) => event.category === detail.category)
        .map((event) => event.actual_cost_eur ?? event.estimated_cost_eur),
    ),
  }));
  const alreadyRecordedEur = sumKnown(events.map((event) => event.actual_cost_eur ?? event.estimated_cost_eur));
  const totalEstimatedEur = sumKnown(details.map((detail) => detail.estimatedCostEur));
  const remainingEstimatedEur = totalEstimatedEur === null || alreadyRecordedEur === null
    ? null
    : Math.max(0, totalEstimatedEur - alreadyRecordedEur);

  return {
    alreadyRecordedEur,
    currency: "EUR",
    details,
    events,
    remainingEstimatedEur,
    totalEstimatedEur,
  };
}

export async function readObservatoryCostSummary(
  userId: string,
  filters: Partial<ObservatoryCostFilters> = {},
): Promise<ObservatoryCostSummary> {
  const { data, error } = await getCostClient()
    .from("cost_events")
    .select("id,user_id,draft_id,account_id,platform,provider,category,quantity,unit,estimated_cost_eur,actual_cost_eur,currency,status,event_key,metadata,occurred_at,created_at")
    .eq("user_id", userId)
    .order("occurred_at", { ascending: true })
    .returns<CostEventRow[]>();

  if (error) {
    throw new Error(`Lecture Observatoire couts impossible: ${error.message}`);
  }

  const allEvents = data ?? [];
  const normalizedFilters = normalizeObservatoryCostFilters(filters);
  const events = allEvents.filter((event) => {
    if (normalizedFilters.accountId && event.account_id !== normalizedFilters.accountId) {
      return false;
    }
    if (normalizedFilters.provider !== "all" && event.provider !== normalizedFilters.provider) {
      return false;
    }
    if (normalizedFilters.category !== "all" && event.category !== normalizedFilters.category) {
      return false;
    }
    return true;
  });
  const now = new Date();
  const todayStart = startOfParisDay(now);
  const tomorrowStart = addUtcDays(todayStart, 1);
  const sevenStart = new Date(todayStart);
  sevenStart.setUTCDate(sevenStart.getUTCDate() - 6);
  const thirtyStart = new Date(todayStart);
  thirtyStart.setUTCDate(thirtyStart.getUTCDate() - 29);
  const monthStart = startOfParisMonth(now);
  const periodBounds = getCostPeriodBounds(normalizedFilters.period, now);

  const sumSince = (start: Date) =>
    events
      .filter((event) => {
        const occurredAt = new Date(event.occurred_at);
        return occurredAt >= start && occurredAt < tomorrowStart;
      })
      .reduce((sum, event) => sum + eventCost(event), 0);
  const sumBetween = (start: Date, end: Date) =>
    events
      .filter((event) => {
        const occurredAt = new Date(event.occurred_at);
        return occurredAt >= start && occurredAt < end;
      })
      .reduce((sum, event) => sum + eventCost(event), 0);
  const group = <K extends string>(getKey: (event: CostEventRow) => K) => {
    const values = new Map<K, number>();
    events.forEach((event) => {
      const key = getKey(event);
      values.set(key, (values.get(key) ?? 0) + eventCost(event));
    });
    return [...values.entries()].map(([key, totalEur]) => ({ key, totalEur }));
  };
  const groupPeriodByDay = () => {
    const values = new Map<string, number>();
    events
      .filter((event) => {
        const occurredAt = new Date(event.occurred_at);
        return occurredAt >= periodBounds.currentStart && occurredAt < periodBounds.currentEnd;
      })
      .forEach((event) => {
        const key = dateKeyParis(event.occurred_at);
        values.set(key, (values.get(key) ?? 0) + eventCost(event));
      });

    return [...values.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([date, totalEur]) => ({ date, totalEur }));
  };

  const completedVideoDrafts = new Set(
    events
      .filter((event) => event.category === "video_render")
      .map((event) => event.draft_id)
      .filter((draftId): draftId is string => Boolean(draftId)),
  );
  const total = events.reduce((sum, event) => sum + eventCost(event), 0);
  const lastUpdatedAt = events.at(-1)?.created_at ?? null;
  const periodEvents = events.filter((event) => {
    const occurredAt = new Date(event.occurred_at);
    return occurredAt >= periodBounds.currentStart && occurredAt < periodBounds.currentEnd;
  });
  const availableAccounts = [...new Set(allEvents.map((event) => event.account_id).filter((accountId): accountId is string => Boolean(accountId)))]
    .sort((left, right) => left.localeCompare(right))
    .map((accountId) => ({ accountId, label: accountId }));
  const availableCategories = [...new Set(allEvents.map((event) => event.category))]
    .sort((left, right) => left.localeCompare(right));
  const availableProviders = [...new Set(allEvents.map((event) => event.provider))]
    .sort((left, right) => left.localeCompare(right));

  return {
    averagePerCompletedVideoEur: completedVideoDrafts.size ? total / completedVideoDrafts.size : null,
    availableAccounts,
    availableCategories,
    availableProviders,
    byAccount: group((event) => event.account_id ?? "non_renseigne").map(({ key, totalEur }) => ({ accountId: key, totalEur })),
    byCategory: group((event) => event.category).map(({ key, totalEur }) => ({ category: key, totalEur })),
    byDay: groupPeriodByDay(),
    byProvider: group((event) => event.provider).map(({ key, totalEur }) => ({ provider: key, totalEur })),
    costSevenDaysEur: sumSince(sevenStart),
    costThirtyDaysEur: sumSince(thirtyStart),
    costThisMonthEur: sumSince(monthStart),
    costTodayEur: sumSince(todayStart),
    costTotalEur: total,
    estimatedEventsCount: events.filter((event) => event.status === "estimated").length,
    eventsCount: events.length,
    filters: normalizedFilters,
    lastUpdatedAt,
    periodCostEur: periodEvents.reduce((sum, event) => sum + eventCost(event), 0),
    periodEventsCount: periodEvents.length,
    previousPeriodEur: sumBetween(periodBounds.previousStart, periodBounds.previousEnd),
    reconciledEventsCount: events.filter((event) => event.status === "reconciled").length,
  };
}
