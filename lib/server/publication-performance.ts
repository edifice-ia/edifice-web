import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getOAuthToken } from "@/lib/server/oauth/token-store";
import { getMetaTokenScopeDiagnostic } from "@/lib/server/meta/debug-token";
import {
  ensureYouTubeAccessToken,
  readYouTubeGrantedScopes,
} from "@/lib/server/youtube/youtube-oauth";
import { sanitizeYouTubeError } from "@/lib/server/youtube/youtube-api";

type PublicationPlatform = "youtube" | "instagram" | "tiktok";
type PerformancePeriod = "7d" | "30d" | "month" | "all";
type PerformanceStatus = "ok" | "partial" | "failed" | "unavailable";
type RecommendationConfidence = "low" | "medium" | "high";

type PublicationRow = {
  account_id: string | null;
  draft_id: string;
  id: string;
  instagram_media_id: string | null;
  instagram_permalink: string | null;
  platform: PublicationPlatform;
  published_at: string | null;
  scheduled_at: string;
  status: string;
  title: string;
  youtube_video_id: string | null;
  youtube_url: string | null;
};

type DraftRow = {
  id: string;
  title: string | null;
  user_id: string | null;
};

type SnapshotRow = {
  account_id: string | null;
  average_view_duration_seconds: number | null;
  average_view_percentage: number | null;
  comments: number | null;
  draft_id: string;
  external_media_id: string | null;
  fetched_at: string;
  id: string;
  likes: number | null;
  metrics: Record<string, unknown>;
  platform: PublicationPlatform;
  publication_id: string;
  published_at: string | null;
  reach: number | null;
  saves: number | null;
  shares: number | null;
  status: PerformanceStatus;
  subscribers_gained: number | null;
  views: number | null;
  watch_time_seconds: number | null;
};

type YouTubeVideosResponse = {
  error?: unknown;
  items?: Array<{
    id?: string;
    snippet?: {
      publishedAt?: string;
      title?: string;
    };
    statistics?: {
      commentCount?: string;
      likeCount?: string;
      viewCount?: string;
    };
    status?: {
      privacyStatus?: string;
      uploadStatus?: string;
    };
  }>;
};

type InstagramMediaResponse = {
  comments_count?: number;
  error?: MetaGraphError;
  id?: string;
  like_count?: number;
  permalink?: string;
  timestamp?: string;
};

type InstagramInsightsResponse = {
  data?: Array<{
    name?: string;
    values?: Array<{ value?: number }>;
  }>;
  error?: MetaGraphError;
};

type MetaGraphError = {
  code?: number;
  error_subcode?: number;
  message?: string;
  type?: string;
};

export type PublicationPerformanceFilters = {
  accountId: string | null;
  period: PerformancePeriod;
  platform: PublicationPlatform | "all";
  status: "all" | "published" | "scheduled" | "ready" | "failed";
};

export type PublicationPerformanceSummary = {
  averageRetentionPercentage: number | null;
  availableAccounts: Array<{ accountId: string; label: string }>;
  byAccount: Array<{
    accountId: string;
    averageEngagementRate: number | null;
    interactions: number;
    sampleSize: number;
    views: number;
  }>;
  byDay: Array<{ date: string; interactions: number; views: number }>;
  byPlatform: Array<{
    averageEngagementRate: number | null;
    interactions: number;
    platform: PublicationPlatform;
    sampleSize: number;
    views: number;
  }>;
  filters: PublicationPerformanceFilters;
  lastSyncAt: string | null;
  limitationNotes: string[];
  recommendations: Array<{
    confidence: RecommendationConfidence;
    key: string;
    sampleSize: number;
    source: "available_data";
    title: string;
    detail: string;
  }>;
  sampleSize: number;
  topPublications: Array<{
    engagementRate: number | null;
    interactions: number;
    platform: PublicationPlatform;
    publicationId: string;
    title: string;
    views: number | null;
  }>;
  totalComments: number;
  totalInteractions: number;
  totalLikes: number;
  totalReach: number | null;
  totalSaves: number;
  totalShares: number;
  totalViews: number;
};

export type PublicationPerformanceState = PublicationPerformanceSummary & {
  sync: {
    instagram: {
      connected: boolean;
      lastResult: string | null;
      missingPermissions: string[];
    };
    tiktok: {
      enabled: false;
      message: string;
    };
    youtube: {
      connected: boolean;
      lastResult: string | null;
      missingPermissions: string[];
    };
  };
};

let performanceClient: SupabaseClient | null = null;

const YOUTUBE_ANALYTICS_SCOPE = "https://www.googleapis.com/auth/yt-analytics.readonly";
const INSTAGRAM_INSIGHTS_SCOPE = "instagram_manage_insights";
const recommendationThresholds = {
  high: 20,
  low: 5,
  medium: 10,
};

function getPerformanceClient() {
  if (performanceClient) {
    return performanceClient;
  }

  const supabaseUrl =
    process.env.SUPABASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Publication performance requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  }

  performanceClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return performanceClient;
}

function toNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function safeDate(value: string | null | undefined) {
  if (!value) {
    return null;
  }
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? new Date(parsed) : null;
}

function dateKeyParis(value: string) {
  return new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "Europe/Paris",
    year: "numeric",
  }).format(new Date(value));
}

function startOfParisMonth(date = new Date()) {
  const parts = dateKeyParis(date.toISOString()).split("-").map(Number);
  return new Date(Date.UTC(parts[0], parts[1] - 1, 1, -2, 0, 0));
}

function normalizeFilters(
  filters: Partial<PublicationPerformanceFilters> = {},
): PublicationPerformanceFilters {
  const platform = filters.platform === "youtube" ||
    filters.platform === "instagram" ||
    filters.platform === "tiktok" ||
    filters.platform === "all"
    ? filters.platform
    : "all";
  const period = filters.period === "7d" ||
    filters.period === "30d" ||
    filters.period === "month" ||
    filters.period === "all"
    ? filters.period
    : "30d";
  const status = filters.status === "published" ||
    filters.status === "scheduled" ||
    filters.status === "ready" ||
    filters.status === "failed" ||
    filters.status === "all"
    ? filters.status
    : "all";

  return {
    accountId: filters.accountId?.trim() || null,
    period,
    platform,
    status,
  };
}

function periodStart(period: PerformancePeriod) {
  const now = new Date();
  if (period === "all") {
    return null;
  }
  if (period === "month") {
    return startOfParisMonth(now);
  }
  const days = period === "7d" ? 7 : 30;
  const start = new Date(now);
  start.setUTCDate(start.getUTCDate() - (days - 1));
  start.setUTCHours(0, 0, 0, 0);
  return start;
}

function interactionCount(snapshot: SnapshotRow) {
  return (snapshot.likes ?? 0) +
    (snapshot.comments ?? 0) +
    (snapshot.shares ?? 0) +
    (snapshot.saves ?? 0);
}

function engagementRate(snapshot: SnapshotRow) {
  if (!snapshot.views || snapshot.views <= 0) {
    return null;
  }
  return interactionCount(snapshot) / snapshot.views;
}

function confidence(sampleSize: number): RecommendationConfidence {
  if (sampleSize >= recommendationThresholds.high) {
    return "high";
  }
  if (sampleSize >= recommendationThresholds.medium) {
    return "medium";
  }
  return "low";
}

function currentCollectionInterval() {
  return `hour:${new Date().toISOString().slice(0, 13)}`;
}

function sanitizeMetaError(payload: { error?: MetaGraphError } | null | undefined, status?: number) {
  return {
    code: payload?.error?.code ?? status ?? "meta_graph_error",
    message: payload?.error?.message ?? "Meta Graph API request failed.",
    subcode: payload?.error?.error_subcode ?? null,
    type: payload?.error?.type ?? null,
  };
}

async function readUserDrafts(userId: string) {
  const { data, error } = await getPerformanceClient()
    .from("content_drafts")
    .select("id,user_id,title")
    .eq("user_id", userId)
    .returns<DraftRow[]>();

  if (error) {
    throw new Error(`Lecture des brouillons impossible: ${error.message}`);
  }

  return data ?? [];
}

async function readUserPublications(userId: string) {
  const drafts = await readUserDrafts(userId);
  const draftIds = drafts.map((draft) => draft.id);
  const draftById = new Map(drafts.map((draft) => [draft.id, draft]));

  if (draftIds.length === 0) {
    return { draftById, publications: [] as PublicationRow[] };
  }

  const { data, error } = await getPerformanceClient()
    .from("short_video_publications")
    .select("id,draft_id,platform,status,title,scheduled_at,account_id,youtube_video_id,youtube_url,instagram_media_id,instagram_permalink,published_at")
    .in("draft_id", draftIds)
    .returns<PublicationRow[]>();

  if (error) {
    throw new Error(`Lecture des publications impossible: ${error.message}`);
  }

  return { draftById, publications: data ?? [] };
}

async function readSnapshotsForDrafts(draftIds: string[]) {
  if (draftIds.length === 0) {
    return [] as SnapshotRow[];
  }

  const { data, error } = await getPerformanceClient()
    .from("publication_performance_snapshots")
    .select("id,publication_id,draft_id,account_id,platform,external_media_id,fetched_at,published_at,views,reach,likes,comments,shares,saves,watch_time_seconds,average_view_duration_seconds,average_view_percentage,subscribers_gained,metrics,status")
    .in("draft_id", draftIds)
    .order("fetched_at", { ascending: true })
    .returns<SnapshotRow[]>();

  if (error) {
    throw new Error(`Lecture des performances impossible: ${error.message}`);
  }

  return data ?? [];
}

async function readOAuthTokenForUserOrDefault(
  provider: "youtube" | "meta",
  userId: string,
) {
  return await getOAuthToken(provider, userId).catch(() => null) ??
    await getOAuthToken(provider).catch(() => null);
}

function latestSnapshots(snapshots: SnapshotRow[]) {
  const byPublication = new Map<string, SnapshotRow>();
  snapshots.forEach((snapshot) => {
    const current = byPublication.get(snapshot.publication_id);
    if (!current || Date.parse(snapshot.fetched_at) > Date.parse(current.fetched_at)) {
      byPublication.set(snapshot.publication_id, snapshot);
    }
  });
  return [...byPublication.values()];
}

function buildAggregate(
  rows: SnapshotRow[],
  getKey: (row: SnapshotRow) => string,
) {
  const values = new Map<string, SnapshotRow[]>();
  rows.forEach((row) => {
    const key = getKey(row);
    values.set(key, [...(values.get(key) ?? []), row]);
  });

  return [...values.entries()].map(([key, items]) => {
    const views = items.reduce((sum, item) => sum + (item.views ?? 0), 0);
    const interactions = items.reduce((sum, item) => sum + interactionCount(item), 0);
    return {
      key,
      averageEngagementRate: views > 0 ? interactions / views : null,
      interactions,
      sampleSize: items.length,
      views,
    };
  });
}

function buildRecommendations(snapshots: SnapshotRow[]) {
  if (snapshots.length < recommendationThresholds.low) {
    return [];
  }

  const recommendations: PublicationPerformanceSummary["recommendations"] = [];
  const byPlatform = buildAggregate(snapshots, (snapshot) => snapshot.platform)
    .filter((item) => item.sampleSize >= recommendationThresholds.low && item.averageEngagementRate !== null)
    .sort((left, right) => (right.averageEngagementRate ?? 0) - (left.averageEngagementRate ?? 0));

  if (byPlatform[0]) {
    recommendations.push({
      confidence: confidence(byPlatform[0].sampleSize),
      detail: `Meilleur taux d'engagement observe sur ${byPlatform[0].key} avec ${byPlatform[0].sampleSize} publication(s).`,
      key: `platform:${byPlatform[0].key}`,
      sampleSize: byPlatform[0].sampleSize,
      source: "available_data",
      title: `Tester davantage ${byPlatform[0].key}`,
    });
  }

  const byHour = buildAggregate(snapshots, (snapshot) => {
    const published = safeDate(snapshot.published_at ?? snapshot.fetched_at) ?? new Date(snapshot.fetched_at);
    return new Intl.DateTimeFormat("fr-FR", {
      hour: "2-digit",
      hour12: false,
      timeZone: "Europe/Paris",
    }).format(published);
  })
    .filter((item) => item.sampleSize >= recommendationThresholds.low && item.averageEngagementRate !== null)
    .sort((left, right) => (right.averageEngagementRate ?? 0) - (left.averageEngagementRate ?? 0));

  if (byHour[0]) {
    recommendations.push({
      confidence: confidence(byHour[0].sampleSize),
      detail: `Ce creneau a le meilleur signal disponible sur ${byHour[0].sampleSize} publication(s).`,
      key: `hour:${byHour[0].key}`,
      sampleSize: byHour[0].sampleSize,
      source: "available_data",
      title: `Conserver le creneau autour de ${byHour[0].key}h`,
    });
  }

  const retentionSamples = snapshots.filter((snapshot) => snapshot.average_view_percentage !== null);
  if (retentionSamples.length >= recommendationThresholds.low) {
    const average = retentionSamples.reduce((sum, item) => sum + (item.average_view_percentage ?? 0), 0) / retentionSamples.length;
    recommendations.push({
      confidence: confidence(retentionSamples.length),
      detail: `Retention moyenne observee: ${Math.round(average)} %. A utiliser comme signal, pas comme verite absolue.`,
      key: "retention:average",
      sampleSize: retentionSamples.length,
      source: "available_data",
      title: average >= 50 ? "Conserver les formats actuels" : "Tester des accroches plus rapides",
    });
  }

  return recommendations.slice(0, 4);
}

export async function readPublicationPerformanceState(
  userId: string,
  filters: Partial<PublicationPerformanceFilters> = {},
): Promise<PublicationPerformanceState> {
  const normalized = normalizeFilters(filters);
  const { draftById, publications } = await readUserPublications(userId);
  const snapshots = await readSnapshotsForDrafts([...draftById.keys()]);
  const start = periodStart(normalized.period);
  const publicationById = new Map(publications.map((publication) => [publication.id, publication]));
  const availableAccounts = [...new Set(publications.map((item) => item.account_id).filter((value): value is string => Boolean(value)))]
    .sort((left, right) => left.localeCompare(right))
    .map((accountId) => ({ accountId, label: accountId }));
  const rows = latestSnapshots(snapshots).filter((snapshot) => {
    const publication = publicationById.get(snapshot.publication_id);
    if (!publication) {
      return false;
    }
    if (normalized.platform !== "all" && snapshot.platform !== normalized.platform) {
      return false;
    }
    if (normalized.accountId && snapshot.account_id !== normalized.accountId) {
      return false;
    }
    if (normalized.status !== "all" && publication.status !== normalized.status) {
      return false;
    }
    if (start && new Date(snapshot.fetched_at) < start) {
      return false;
    }
    return true;
  });
  const totalViews = rows.reduce((sum, snapshot) => sum + (snapshot.views ?? 0), 0);
  const totalLikes = rows.reduce((sum, snapshot) => sum + (snapshot.likes ?? 0), 0);
  const totalComments = rows.reduce((sum, snapshot) => sum + (snapshot.comments ?? 0), 0);
  const totalShares = rows.reduce((sum, snapshot) => sum + (snapshot.shares ?? 0), 0);
  const totalSaves = rows.reduce((sum, snapshot) => sum + (snapshot.saves ?? 0), 0);
  const reachValues = rows.map((snapshot) => snapshot.reach).filter((value): value is number => typeof value === "number");
  const retentionValues = rows
    .map((snapshot) => snapshot.average_view_percentage)
    .filter((value): value is number => typeof value === "number");
  const limitationNotes = new Set<string>([
    "TikTok reste en placeholder: aucune metrique TikTok n'est synchronisee en v1.",
  ]);

  rows.forEach((snapshot) => {
    const unavailable = snapshot.metrics?.unavailable;
    if (Array.isArray(unavailable)) {
      unavailable.forEach((item) => limitationNotes.add(String(item)));
    }
  });

  const byDayMap = new Map<string, SnapshotRow[]>();
  rows.forEach((snapshot) => {
    const key = dateKeyParis(snapshot.fetched_at);
    byDayMap.set(key, [...(byDayMap.get(key) ?? []), snapshot]);
  });

  const tokenYoutube = await readOAuthTokenForUserOrDefault("youtube", userId);
  const tokenMeta = await readOAuthTokenForUserOrDefault("meta", userId);
  const youtubeScopes = tokenYoutube?.accessToken
    ? await readYouTubeGrantedScopes(tokenYoutube.accessToken).then((result) => result.scopes ?? tokenYoutube.scope?.split(/[\s,]+/).filter(Boolean) ?? []).catch(() => tokenYoutube.scope?.split(/[\s,]+/).filter(Boolean) ?? [])
    : [];
  const metaScopes = tokenMeta?.accessToken
    ? await getMetaTokenScopeDiagnostic({
        storedScope: tokenMeta.scope,
        userAccessToken: tokenMeta.accessToken,
      }).then((result) => result.granted).catch(() => tokenMeta.scope?.split(/[\s,]+/).filter(Boolean) ?? [])
    : [];

  return {
    availableAccounts,
    averageRetentionPercentage: retentionValues.length
      ? retentionValues.reduce((sum, value) => sum + value, 0) / retentionValues.length
      : null,
    byAccount: buildAggregate(rows, (snapshot) => snapshot.account_id ?? "non_renseigne").map((item) => ({
      accountId: item.key,
      averageEngagementRate: item.averageEngagementRate,
      interactions: item.interactions,
      sampleSize: item.sampleSize,
      views: item.views,
    })),
    byDay: [...byDayMap.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([date, items]) => ({
      date,
      interactions: items.reduce((sum, item) => sum + interactionCount(item), 0),
      views: items.reduce((sum, item) => sum + (item.views ?? 0), 0),
    })),
    byPlatform: buildAggregate(rows, (snapshot) => snapshot.platform).map((item) => ({
      averageEngagementRate: item.averageEngagementRate,
      interactions: item.interactions,
      platform: item.key as PublicationPlatform,
      sampleSize: item.sampleSize,
      views: item.views,
    })),
    filters: normalized,
    lastSyncAt: rows.at(-1)?.fetched_at ?? null,
    limitationNotes: [...limitationNotes],
    recommendations: buildRecommendations(rows),
    sampleSize: rows.length,
    sync: {
      instagram: {
        connected: Boolean(tokenMeta?.accessToken),
        lastResult: null,
        missingPermissions: tokenMeta?.accessToken && !metaScopes.includes(INSTAGRAM_INSIGHTS_SCOPE)
          ? [INSTAGRAM_INSIGHTS_SCOPE]
          : [],
      },
      tiktok: {
        enabled: false,
        message: "TikTok reste en lecture placeholder pour cette v1.",
      },
      youtube: {
        connected: Boolean(tokenYoutube?.accessToken),
        lastResult: null,
        missingPermissions: tokenYoutube?.accessToken && !youtubeScopes.includes(YOUTUBE_ANALYTICS_SCOPE)
          ? [YOUTUBE_ANALYTICS_SCOPE]
          : [],
      },
    },
    topPublications: rows
      .map((snapshot) => ({
        engagementRate: engagementRate(snapshot),
        interactions: interactionCount(snapshot),
        platform: snapshot.platform,
        publicationId: snapshot.publication_id,
        title: publicationById.get(snapshot.publication_id)?.title ?? draftById.get(snapshot.draft_id)?.title ?? "Publication",
        views: snapshot.views,
      }))
      .sort((left, right) => (right.views ?? 0) - (left.views ?? 0))
      .slice(0, 6),
    totalComments,
    totalInteractions: totalLikes + totalComments + totalShares + totalSaves,
    totalLikes,
    totalReach: reachValues.length ? reachValues.reduce((sum, value) => sum + value, 0) : null,
    totalSaves,
    totalShares,
    totalViews,
  };
}

async function upsertSnapshot(row: {
  account_id: string | null;
  average_view_duration_seconds?: number | null;
  average_view_percentage?: number | null;
  comments?: number | null;
  draft_id: string;
  external_media_id: string | null;
  likes?: number | null;
  metrics: Record<string, unknown>;
  platform: PublicationPlatform;
  publication_id: string;
  published_at: string | null;
  reach?: number | null;
  saves?: number | null;
  shares?: number | null;
  status: PerformanceStatus;
  subscribers_gained?: number | null;
  views?: number | null;
  watch_time_seconds?: number | null;
}) {
  const fetchedAt = new Date().toISOString();
  const { error } = await getPerformanceClient()
    .from("publication_performance_snapshots")
    .upsert(
      {
        ...row,
        collection_interval: currentCollectionInterval(),
        fetched_at: fetchedAt,
        source: "api",
      },
      { onConflict: "publication_id,source,collection_interval" },
    );

  if (error) {
    throw new Error(`Enregistrement snapshot performance impossible: ${error.message}`);
  }
}

export async function syncYouTubePublicationPerformance(userId: string) {
  const token = await readOAuthTokenForUserOrDefault("youtube", userId);
  const access = await ensureYouTubeAccessToken(token);

  if (!access.ok) {
    throw new Error(access.error.message);
  }

  const scopes = await readYouTubeGrantedScopes(access.accessToken);
  const grantedScopes = scopes.scopes ?? token?.scope?.split(/[\s,]+/).filter(Boolean) ?? [];
  const { publications } = await readUserPublications(userId);
  const youtubePublications = publications.filter((publication) =>
    publication.platform === "youtube" &&
    Boolean(publication.youtube_video_id) &&
    ["scheduled", "published"].includes(publication.status),
  );
  const ids = youtubePublications.map((publication) => publication.youtube_video_id).filter((id): id is string => Boolean(id));

  if (ids.length === 0) {
    return {
      snapshots: 0,
      message: "Aucune publication YouTube avec video_id a synchroniser.",
    };
  }

  const url = new URL("https://www.googleapis.com/youtube/v3/videos");
  url.searchParams.set("part", "statistics,snippet,status");
  url.searchParams.set("id", ids.join(","));

  console.info("[Publication Performance] YouTube sync request", {
    ids: ids.length,
    route: "/api/observatory/publication-performance",
  });

  const response = await fetch(url, {
    cache: "no-store",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${access.accessToken}`,
    },
    method: "GET",
  });
  const payload = (await response.json()) as YouTubeVideosResponse;

  if (!response.ok || payload.error) {
    const error = sanitizeYouTubeError(payload, response.status);
    console.warn("[Publication Performance] YouTube sync failed", {
      code: error.code,
      message: error.message,
      route: "/api/observatory/publication-performance",
    });
    throw new Error(`Erreur YouTube performances: ${error.message}`);
  }

  const videoById = new Map((payload.items ?? []).map((item) => [item.id, item]));
  let snapshots = 0;
  for (const publication of youtubePublications) {
    const video = videoById.get(publication.youtube_video_id ?? "");
    if (!video) {
      continue;
    }
    await upsertSnapshot({
      account_id: publication.account_id,
      comments: toNumber(video.statistics?.commentCount),
      draft_id: publication.draft_id,
      external_media_id: publication.youtube_video_id,
      likes: toNumber(video.statistics?.likeCount),
      metrics: {
        unavailable: grantedScopes.includes(YOUTUBE_ANALYTICS_SCOPE)
          ? []
          : ["YouTube Analytics non disponible: scope yt-analytics.readonly absent."],
        youtube: {
          privacyStatus: video.status?.privacyStatus ?? null,
          uploadStatus: video.status?.uploadStatus ?? null,
          url: publication.youtube_url,
        },
      },
      platform: "youtube",
      publication_id: publication.id,
      published_at: video.snippet?.publishedAt ?? publication.published_at,
      status: grantedScopes.includes(YOUTUBE_ANALYTICS_SCOPE) ? "ok" : "partial",
      views: toNumber(video.statistics?.viewCount),
    });
    snapshots += 1;
  }

  return {
    snapshots,
    message: `${snapshots} publication(s) YouTube synchronisee(s).`,
  };
}

export async function syncInstagramPublicationPerformance(userId: string) {
  const token = await readOAuthTokenForUserOrDefault("meta", userId);
  if (!token?.accessToken) {
    throw new Error("Le compte Instagram / Meta n'est pas connecte.");
  }

  const scopeDiagnostic = await getMetaTokenScopeDiagnostic({
    storedScope: token.scope,
    userAccessToken: token.accessToken,
  });
  const hasInsightsScope = scopeDiagnostic.granted.includes(INSTAGRAM_INSIGHTS_SCOPE);
  const { publications } = await readUserPublications(userId);
  const instagramPublications = publications.filter((publication) =>
    publication.platform === "instagram" &&
    Boolean(publication.instagram_media_id) &&
    publication.status === "published",
  );

  if (instagramPublications.length === 0) {
    return {
      snapshots: 0,
      message: "Aucune publication Instagram publiee avec media_id a synchroniser.",
    };
  }

  const graphVersion = process.env.INSTAGRAM_GRAPH_VERSION?.trim() || "v23.0";
  let snapshots = 0;

  for (const publication of instagramPublications) {
    const mediaUrl = new URL(`https://graph.facebook.com/${graphVersion}/${publication.instagram_media_id}`);
    mediaUrl.searchParams.set("fields", "id,permalink,timestamp,like_count,comments_count");
    mediaUrl.searchParams.set("access_token", token.accessToken);
    const mediaResponse = await fetch(mediaUrl, {
      cache: "no-store",
      headers: { Accept: "application/json" },
      method: "GET",
    });
    const mediaPayload = (await mediaResponse.json()) as InstagramMediaResponse;
    if (!mediaResponse.ok || mediaPayload.error) {
      const error = sanitizeMetaError(mediaPayload, mediaResponse.status);
      console.warn("[Publication Performance] Instagram media sync failed", {
        code: error.code,
        media_id: publication.instagram_media_id,
        message: error.message,
        route: "/api/observatory/publication-performance",
      });
      await upsertSnapshot({
        account_id: publication.account_id,
        draft_id: publication.draft_id,
        external_media_id: publication.instagram_media_id,
        metrics: {
          instagram: {
            error,
          },
        },
        platform: "instagram",
        publication_id: publication.id,
        published_at: publication.published_at,
        status: "failed",
      });
      snapshots += 1;
      continue;
    }

    let insights: Record<string, number | null> = {};
    const unavailable: string[] = [];
    if (hasInsightsScope) {
      const insightsUrl = new URL(`https://graph.facebook.com/${graphVersion}/${publication.instagram_media_id}/insights`);
      insightsUrl.searchParams.set("metric", "plays,reach,likes,comments,shares,saved,total_interactions");
      insightsUrl.searchParams.set("access_token", token.accessToken);
      const insightsResponse = await fetch(insightsUrl, {
        cache: "no-store",
        headers: { Accept: "application/json" },
        method: "GET",
      });
      const insightsPayload = (await insightsResponse.json()) as InstagramInsightsResponse;
      if (insightsResponse.ok && !insightsPayload.error) {
        insights = Object.fromEntries(
          (insightsPayload.data ?? []).map((item) => [
            item.name ?? "",
            toNumber(item.values?.[0]?.value),
          ]),
        );
      } else {
        const error = sanitizeMetaError(insightsPayload, insightsResponse.status);
        unavailable.push(`Instagram insights indisponibles: ${error.message}`);
      }
    } else {
      unavailable.push("Instagram insights non disponibles: scope instagram_manage_insights absent.");
    }

    await upsertSnapshot({
      account_id: publication.account_id,
      comments: toNumber(insights.comments) ?? toNumber(mediaPayload.comments_count),
      draft_id: publication.draft_id,
      external_media_id: publication.instagram_media_id,
      likes: toNumber(insights.likes) ?? toNumber(mediaPayload.like_count),
      metrics: {
        instagram: {
          permalink: mediaPayload.permalink ?? publication.instagram_permalink,
          timestamp: mediaPayload.timestamp ?? publication.published_at,
        },
        unavailable,
      },
      platform: "instagram",
      publication_id: publication.id,
      published_at: mediaPayload.timestamp ?? publication.published_at,
      reach: toNumber(insights.reach),
      saves: toNumber(insights.saved),
      shares: toNumber(insights.shares),
      status: unavailable.length ? "partial" : "ok",
      views: toNumber(insights.plays),
    });
    snapshots += 1;
  }

  return {
    snapshots,
    message: `${snapshots} publication(s) Instagram synchronisee(s).`,
  };
}

export async function savePerformanceRecommendationAction({
  action,
  payload,
  recommendationKey,
  userId,
}: {
  action: "accepted" | "ignored";
  payload: Record<string, unknown>;
  recommendationKey: string;
  userId: string;
}) {
  const { error } = await getPerformanceClient()
    .from("publication_performance_recommendation_actions")
    .upsert(
      {
        action,
        payload,
        recommendation_key: recommendationKey,
        user_id: userId,
      },
      { onConflict: "user_id,recommendation_key,action" },
    );

  if (error) {
    throw new Error(`Enregistrement recommandation impossible: ${error.message}`);
  }

  return {
    message: action === "accepted"
      ? "Recommandation acceptee comme preference explicite."
      : "Recommandation ignoree.",
  };
}
