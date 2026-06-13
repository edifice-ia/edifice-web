import "server-only";

import { createClient } from "@supabase/supabase-js";
import { cockpitModules, publisherModules } from "@/lib/cockpit/modules";
import {
  getCanonicalPlatformStatuses,
  isPlatformInReview,
} from "@/lib/cockpit/platform-status";
import { projectResources } from "@/lib/resources/project-resources";
import { readProjectMemoryEntries } from "@/lib/server/project-memory";
import {
  getMetaOAuthStatusPayload,
  getPinterestOAuthStatusPayload,
  getTikTokOAuthStatusPayload,
  getYouTubeOAuthStatusPayload,
} from "@/lib/server/oauth/status-payloads";
import type {
  CockpitDependency,
  CockpitDraftState,
  CockpitOAuthState,
  CockpitReadOnlyState,
} from "@/types/cockpit";

type ContentDraftRow = {
  id: string;
  title: string | null;
  theme: string | null;
  status: string | null;
  platform_targets: string[] | null;
  created_at: string;
  updated_at: string | null;
};

type OAuthStatusPayload = {
  configured?: boolean;
  token?: {
    present?: boolean;
    expiresAt?: string | null;
    updatedAt?: string | null;
  };
  warnings?: string[];
};

const platformResourceNames = [
  "Meta Developers",
  "Facebook Developers",
  "Pinterest Developers",
  "TikTok for Developers",
  "Meta Business Suite",
  "YouTube Studio",
];

function getSupabaseReadClient() {
  const supabaseUrl =
    process.env.SUPABASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

function mapDraft(row: ContentDraftRow): CockpitDraftState {
  return {
    id: row.id,
    title: row.title ?? "Brouillon sans titre",
    theme: row.theme ?? "Theme non renseigne",
    status: row.status ?? "draft",
    platformTargets: row.platform_targets ?? [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function readContentDraftState() {
  const supabase = getSupabaseReadClient();

  if (!supabase) {
    return {
      total: 0,
      readyToPublish: [],
      inProgress: [],
      recent: [],
      byStatus: {},
      readError: "Configuration Supabase serveur absente.",
    };
  }

  const { data, error } = await supabase
    .from("content_drafts")
    .select("id, title, theme, status, platform_targets, created_at, updated_at")
    .order("updated_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(100)
    .returns<ContentDraftRow[]>();

  if (error) {
    return {
      total: 0,
      readyToPublish: [],
      inProgress: [],
      recent: [],
      byStatus: {},
      readError: `Lecture content_drafts impossible: ${error.message}`,
    };
  }

  const drafts = (data ?? []).map(mapDraft);
  const byStatus = drafts.reduce<Record<string, number>>((accumulator, draft) => {
    accumulator[draft.status] = (accumulator[draft.status] ?? 0) + 1;
    return accumulator;
  }, {});

  return {
    total: drafts.length,
    readyToPublish: drafts
      .filter((draft) => draft.status === "ready_to_publish")
      .slice(0, 12),
    inProgress: drafts
      .filter((draft) => ["draft", "approved"].includes(draft.status))
      .slice(0, 12),
    recent: drafts.slice(0, 8),
    byStatus,
    readError: null,
  };
}

async function readOAuthState(): Promise<CockpitOAuthState[]> {
  const readers = [
    ["youtube", getYouTubeOAuthStatusPayload],
    ["tiktok", getTikTokOAuthStatusPayload],
    ["meta", getMetaOAuthStatusPayload],
    ["pinterest", getPinterestOAuthStatusPayload],
  ] as const;

  return Promise.all(
    readers.map(async ([provider, reader]) => {
      try {
        const payload = (await reader()) as OAuthStatusPayload;

        return {
          provider,
          configured: Boolean(payload.configured),
          tokenPresent: Boolean(payload.token?.present),
          expiresAt: payload.token?.expiresAt ?? null,
          updatedAt: payload.token?.updatedAt ?? null,
          warnings: payload.warnings ?? [],
        };
      } catch (error) {
        return {
          provider,
          configured: false,
          tokenPresent: false,
          expiresAt: null,
          updatedAt: null,
          warnings: [
            error instanceof Error
              ? error.message
              : "Lecture OAuth indisponible.",
          ],
        };
      }
    }),
  );
}

function applyProjectMemoryToPlatforms(
  platforms: ReturnType<typeof getCanonicalPlatformStatuses>,
  entries: Awaited<ReturnType<typeof readProjectMemoryEntries>>,
) {
  const byKey = new Map(
    entries
      .filter((entry) => entry.key)
      .map((entry) => [entry.key as string, entry]),
  );

  return platforms.map((platform) => {
    const tiktokOverride =
      platform.key === "tiktok"
        ? byKey.get("tiktok_review_status") ?? byKey.get("tiktok_access_status")
        : null;
    const pinterestOverride =
      platform.key === "pinterest" ? byKey.get("pinterest_access_status") : null;
    const youtubeOverride =
      platform.key === "youtube" ? byKey.get("youtube_connection_status") : null;
    const metaOverride =
      platform.key === "meta" ? byKey.get("meta_connection_status") : null;
    const instagramOverride =
      platform.key === "instagram"
        ? byKey.get("instagram_connection_status")
        : null;
    const override =
      tiktokOverride ??
      pinterestOverride ??
      youtubeOverride ??
      metaOverride ??
      instagramOverride;

    if (!override) {
      return platform;
    }

    const normalizedStatus = override.status?.toLowerCase() ?? "";
    const isValidated =
      normalizedStatus.includes("valid") ||
      normalizedStatus.includes("connect") ||
      normalizedStatus.includes("actif");
    const isSandbox = normalizedStatus.includes("sandbox");
    const isPostponed =
      normalizedStatus.includes("report") ||
      normalizedStatus.includes("plus tard");

    return {
      ...platform,
      status: isValidated ? "CONNECTED" : isSandbox ? "SANDBOX" : isPostponed ? "DISABLED" : platform.status,
      label: override.value ?? override.status ?? platform.label,
      summary: override.content ?? `${override.title}: ${override.value ?? override.status}`,
      details: [
        `Memoire projet: ${override.title}`,
        `Statut: ${override.status ?? "non renseigne"}`,
        `Valeur: ${override.value ?? "non renseignee"}`,
      ],
      source: override.source ?? "project_memory",
      updatedAt: override.updatedAt,
    };
  });
}

function readModulesState() {
  const modules = [...cockpitModules, ...publisherModules];

  return {
    available: modules.filter((module) =>
      ["Disponible", "Operationnel"].includes(module.status),
    ),
    migrating: modules.filter((module) =>
      ["A migrer", "En migration", "En cours", "Experimental", "A securiser"].includes(
        module.status,
      ),
    ),
  };
}

function readExternalReviews(): CockpitDependency[] {
  return getCanonicalPlatformStatuses()
    .filter(isPlatformInReview)
    .map((platform) => ({
      name: platform.name,
      status: platform.status,
      note: platform.summary,
    }));
}

function readDependencies(): CockpitDependency[] {
  const platformDependencies = getCanonicalPlatformStatuses().map((platform) => ({
    name: platform.name,
    status: platform.status,
    note: platform.summary,
  }));
  const resourceDependencies = projectResources
    .filter((resource) => {
      const isCanonicalPlatformResource = platformResourceNames.includes(
        resource.name,
      );

      return (
        !isCanonicalPlatformResource &&
        ["externe", "a configurer", "bloque"].includes(
          resource.projectStatus
            .normalize("NFD")
            .replace(/\p{Diacritic}/gu, "")
            .toLowerCase(),
        )
      );
    })
    .map((resource) => ({
      name: resource.name,
      status: resource.projectStatus,
      note: resource.note,
    }));

  return [...platformDependencies, ...resourceDependencies];
}

function buildBlockers(options: {
  drafts: Awaited<ReturnType<typeof readContentDraftState>>;
  externalReviews: CockpitDependency[];
}) {
  return [
    ...(options.drafts.readError ? [options.drafts.readError] : []),
    ...options.externalReviews.map(
      (review) => `${review.name}: review externe en attente.`,
    ),
  ];
}

function buildNextActions(options: {
  drafts: Awaited<ReturnType<typeof readContentDraftState>>;
  modules: ReturnType<typeof readModulesState>;
  blockers: string[];
}) {
  return [
    ...(options.drafts.readyToPublish.length > 0
      ? ["Relire les brouillons ready_to_publish et valider manuellement la suite."]
      : []),
    ...(options.drafts.inProgress.length > 0
      ? ["Continuer l'edition des brouillons draft/approved avant production media."]
      : []),
    ...(options.modules.migrating.length > 0
      ? ["Prioriser les modules en migration sans ouvrir de publication automatique."]
      : []),
    ...(options.blockers.length > 0
      ? ["Documenter les reviews externes visibles dans l'Observatoire."]
      : []),
  ].slice(0, 6);
}

export async function readCockpitState(): Promise<CockpitReadOnlyState> {
  const [contentDrafts, oauthStatuses, projectMemoryEntries] = await Promise.all([
    readContentDraftState(),
    readOAuthState(),
    readProjectMemoryEntries().catch(() => []),
  ]);
  const modules = readModulesState();
  const platformStatuses = applyProjectMemoryToPlatforms(
    getCanonicalPlatformStatuses(),
    projectMemoryEntries,
  );
  const externalReviews = readExternalReviews();
  const dependencies = readDependencies();
  const blockers = buildBlockers({
    drafts: contentDrafts,
    externalReviews,
  });
  const nextActions = buildNextActions({
    drafts: contentDrafts,
    modules,
    blockers,
  });

  return {
    generatedAt: new Date().toISOString(),
    contentDrafts,
    oauthStatuses,
    platformStatuses,
    modules,
    externalReviews,
    dependencies,
    blockers,
    nextActions,
    guardrails: [
      "Lecture seule uniquement.",
      "Aucune ecriture Supabase.",
      "Aucune suppression.",
      "Aucune publication automatique.",
      "Aucun token ni secret expose.",
    ],
  };
}
