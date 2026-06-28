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
  byAccount: Array<{ accountId: string; totalEur: number }>;
  byCategory: Array<{ category: CostCategory; totalEur: number }>;
  byDay: Array<{ date: string; totalEur: number }>;
  byProvider: Array<{ provider: CostProvider; totalEur: number }>;
  costThisMonthEur: number;
  costTodayEur: number;
  costTotalEur: number;
  costSevenDaysEur: number;
  averagePerCompletedVideoEur: number | null;
  previousPeriodEur: number | null;
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
  status = "recorded",
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
    estimate: estimateVoiceCost(voice.wordCount ?? null),
    eventKey: `shorts:${draftId}:voice:${voice.generatedAt}`,
    metadata: {
      action,
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
    : estimateImageGenerationCost(action === "request_visual_generation" ? null : 1);

  await recordCostEvent({
    draftId,
    estimate,
    eventKey: `shorts:${draftId}:visual:${action}:${sceneIndex ?? "all"}:${Date.now()}`,
    metadata: {
      action,
      scene_index: sceneIndex ?? null,
    },
    userId,
  });
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

export async function readObservatoryCostSummary(userId: string): Promise<ObservatoryCostSummary> {
  const { data, error } = await getCostClient()
    .from("cost_events")
    .select("id,user_id,draft_id,account_id,platform,provider,category,quantity,unit,estimated_cost_eur,actual_cost_eur,currency,status,event_key,metadata,occurred_at,created_at")
    .eq("user_id", userId)
    .order("occurred_at", { ascending: true })
    .returns<CostEventRow[]>();

  if (error) {
    throw new Error(`Lecture Observatoire couts impossible: ${error.message}`);
  }

  const events = data ?? [];
  const now = new Date();
  const todayStart = startOfParisDay(now);
  const sevenStart = new Date(todayStart);
  sevenStart.setUTCDate(sevenStart.getUTCDate() - 6);
  const thirtyStart = new Date(todayStart);
  thirtyStart.setUTCDate(thirtyStart.getUTCDate() - 29);
  const monthStart = new Date(todayStart);
  monthStart.setUTCDate(1);
  const previousStart = new Date(sevenStart);
  previousStart.setUTCDate(previousStart.getUTCDate() - 7);

  const sumSince = (start: Date) =>
    events
      .filter((event) => new Date(event.occurred_at) >= start)
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

  const completedVideoDrafts = new Set(
    events
      .filter((event) => event.category === "video_render")
      .map((event) => event.draft_id)
      .filter((draftId): draftId is string => Boolean(draftId)),
  );
  const total = events.reduce((sum, event) => sum + eventCost(event), 0);

  return {
    averagePerCompletedVideoEur: completedVideoDrafts.size ? total / completedVideoDrafts.size : null,
    byAccount: group((event) => event.account_id ?? "non_renseigne").map(({ key, totalEur }) => ({ accountId: key, totalEur })),
    byCategory: group((event) => event.category).map(({ key, totalEur }) => ({ category: key, totalEur })),
    byDay: group((event) => dateKeyParis(event.occurred_at)).map(({ key, totalEur }) => ({ date: key, totalEur })),
    byProvider: group((event) => event.provider).map(({ key, totalEur }) => ({ provider: key, totalEur })),
    costSevenDaysEur: sumSince(sevenStart),
    costThisMonthEur: sumSince(monthStart),
    costTodayEur: sumSince(todayStart),
    costTotalEur: total,
    previousPeriodEur: sumBetween(previousStart, sevenStart),
  };
}
