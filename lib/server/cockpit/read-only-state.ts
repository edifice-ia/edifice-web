import "server-only";

import { createClient } from "@supabase/supabase-js";
import { cockpitModules, publisherModules } from "@/lib/cockpit/modules";
import { projectResources } from "@/lib/resources/project-resources";
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
      .filter((draft) =>
        ["draft", "approved"].includes(draft.status),
      )
      .slice(0, 12),
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
        const payload = await reader() as OAuthStatusPayload;

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
  return projectResources
    .filter((resource) => resource.blockedByExternalReview)
    .map((resource) => ({
      name: resource.name,
      status: resource.projectStatus,
      note: resource.note,
    }));
}

function readDependencies(): CockpitDependency[] {
  return projectResources
    .filter((resource) =>
      ["review", "externe", "à configurer", "Ã  configurer", "bloqué", "bloquÃ©"].includes(
        resource.projectStatus,
      ),
    )
    .map((resource) => ({
      name: resource.name,
      status: resource.projectStatus,
      note: resource.note,
    }));
}

function buildBlockers(options: {
  drafts: Awaited<ReturnType<typeof readContentDraftState>>;
  oauth: CockpitOAuthState[];
  externalReviews: CockpitDependency[];
}) {
  return [
    ...(options.drafts.readError ? [options.drafts.readError] : []),
    ...options.oauth
      .filter((status) => !status.configured || status.warnings.length > 0)
      .map((status) =>
        `${status.provider}: ${
          status.configured ? "configuration a surveiller" : "configuration incomplete"
        }${status.warnings.length ? ` (${status.warnings.join(" | ")})` : ""}`,
      ),
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
      ? ["Lever ou documenter les blocages visibles dans l'Observatoire."]
      : []),
  ].slice(0, 6);
}

export async function readCockpitState(): Promise<CockpitReadOnlyState> {
  const [contentDrafts, oauthStatuses] = await Promise.all([
    readContentDraftState(),
    readOAuthState(),
  ]);
  const modules = readModulesState();
  const externalReviews = readExternalReviews();
  const dependencies = readDependencies();
  const blockers = buildBlockers({
    drafts: contentDrafts,
    oauth: oauthStatuses,
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
