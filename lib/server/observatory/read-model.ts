import "server-only";

import { createClient } from "@supabase/supabase-js";
import {
  buildProjectStatusOverview,
  observatoryItems,
  projectMemoryForAssistant,
} from "@/lib/cockpit/observatory";
import {
  platformStatusToCockpitStatus,
} from "@/lib/cockpit/platform-status";
import {
  getPriorityProjectMemoryAction,
  readProjectMemoryEntries,
} from "@/lib/server/project-memory";
import { readCockpitState } from "@/lib/server/cockpit/read-only-state";
import type {
  CockpitPlatformState,
  CockpitStatus,
  ObservatoryItem,
} from "@/types/cockpit";

type PublicationTableProbe = {
  table: string;
  exists: boolean;
  count: number | null;
  error?: string;
};

const publicationTableCandidates = [
  "publications",
  "publication_queue",
  "scheduled_publications",
  "publisher_jobs",
  "content_publications",
];

function hasEnvValue(name: string) {
  return typeof process.env[name] === "string" && process.env[name]!.trim().length > 0;
}

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

async function readPublicationTables(): Promise<PublicationTableProbe[]> {
  const supabase = getSupabaseReadClient();

  if (!supabase) {
    return publicationTableCandidates.map((table) => ({
      table,
      exists: false,
      count: null,
      error: "Configuration Supabase serveur absente.",
    }));
  }

  return Promise.all(
    publicationTableCandidates.map(async (table) => {
      const { count, error } = await supabase
        .from(table)
        .select("*", { count: "exact", head: true });

      return {
        table,
        exists: !error,
        count: error ? null : count ?? 0,
        error: error?.message,
      };
    }),
  );
}

async function readSupabaseHealth() {
  const supabase = getSupabaseReadClient();

  if (!supabase) {
    return {
      status: "Bloque" as CockpitStatus,
      detail: "SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY absent cote serveur.",
      oauthTokenRows: null as number | null,
    };
  }

  const { count, error } = await supabase
    .from("oauth_tokens")
    .select("*", { count: "exact", head: true });

  if (error) {
    return {
      status: "Bloque" as CockpitStatus,
      detail: `Lecture oauth_tokens impossible: ${error.message}`,
      oauthTokenRows: null,
    };
  }

  return {
    status: "Operationnel" as CockpitStatus,
    detail: `Table oauth_tokens lisible. Lignes detectees: ${count ?? 0}.`,
    oauthTokenRows: count ?? 0,
  };
}

function readVercelStatus() {
  const hasRuntime = hasEnvValue("VERCEL");
  const hasUrl =
    hasEnvValue("VERCEL_URL") || hasEnvValue("VERCEL_PROJECT_PRODUCTION_URL");
  const env = process.env.VERCEL_ENV?.trim();

  if (hasRuntime && hasUrl) {
    return {
      status: "Operationnel" as CockpitStatus,
      detail: `Runtime Vercel detecte${env ? ` (${env})` : ""}.`,
    };
  }

  if (hasUrl) {
    return {
      status: "Review" as CockpitStatus,
      detail: "URL Vercel presente, runtime local ou non detecte.",
    };
  }

  return {
    status: "A migrer" as CockpitStatus,
    detail: "Variables Vercel non detectees dans cet environnement.",
  };
}

function mergeOAuthItem(
  item: ObservatoryItem,
  platform: CockpitPlatformState | undefined,
): ObservatoryItem {
  if (!platform) {
    return item;
  }
  const blockedByExternalReview = platform.status === "REVIEW_PENDING";

  return {
    ...item,
    status: platformStatusToCockpitStatus(platform.status),
    source: platform.source,
    detail: platform.details.join(" "),
    summary: platform.summary,
    nextAction: blockedByExternalReview
      ? "Attendre la review externe et conserver le suivi en lecture seule."
      : "Garder les tests controles et la validation humaine active.",
    blockedByExternalReview,
    externalReviewNote: blockedByExternalReview ? platform.summary : undefined,
  };
}

function mergeAgentItem(
  item: ObservatoryItem,
  publicationTables: PublicationTableProbe[],
): ObservatoryItem {
  const existingTables = publicationTables.filter((probe) => probe.exists);
  const totalRows = existingTables.reduce(
    (total, probe) => total + (probe.count ?? 0),
    0,
  );

  if (item.id === "agent-publisher" || item.id === "agent-scheduler") {
    return {
      ...item,
      status: existingTables.length > 0 ? "Review" : "A migrer",
      source: "Tables de publication Supabase",
      detail:
        existingTables.length > 0
          ? `${existingTables.length} table(s) publication lisible(s), ${totalRows} ligne(s) detectee(s).`
          : "Aucune table de publication candidate detectee.",
      summary:
        existingTables.length > 0
          ? "Tables de publication detectees en lecture seule."
          : "Aucune table de publication branchee pour le moment.",
      nextAction:
        existingTables.length > 0
          ? "Cartographier les colonnes utiles avant toute activation."
          : "Creer le schema de suivi publication avant l'automation.",
    };
  }

  return item;
}

export async function getLiveProjectMemory() {
  const [
    publicationTables,
    supabaseHealth,
    projectMemoryEntriesResult,
    cockpitState,
  ] = await Promise.all([
    readPublicationTables(),
    readSupabaseHealth(),
    readProjectMemoryEntries()
      .then((entries) => ({ entries, error: null as string | null }))
      .catch((error) => ({
        entries: [],
        error:
          error instanceof Error
            ? error.message
            : "Lecture memoire projet indisponible.",
      })),
    readCockpitState(),
  ]);
  const vercelStatus = readVercelStatus();
  const platformStatuses = cockpitState.platformStatuses;

  const items = observatoryItems.map((item) => {
    if (item.area === "OAuth") {
      const providerKey =
        item.name === "YouTube"
          ? "youtube"
          : item.name === "TikTok"
            ? "tiktok"
            : item.name === "Meta"
              ? "meta"
              : item.name === "Facebook"
                ? "facebook"
              : item.name === "Instagram"
                ? "instagram"
                : item.name === "Pinterest"
                  ? "pinterest"
                  : undefined;

      return mergeOAuthItem(
        item,
        providerKey
          ? platformStatuses.find((platform) => platform.key === providerKey)
          : undefined,
      );
    }

    if (item.area === "Agents") {
      return mergeAgentItem(item, publicationTables);
    }

    if (item.id === "infra-supabase") {
      return {
        ...item,
        status: supabaseHealth.status,
        source: "Supabase + OAuth Tokens",
        detail: supabaseHealth.detail,
        summary:
          supabaseHealth.status === "Operationnel"
            ? "Supabase repond en lecture seule pour les statuts cockpit."
            : "Supabase n'est pas lisible par l'Observatoire.",
        nextAction:
          supabaseHealth.status === "Operationnel"
            ? "Brancher les prochaines sondes en lecture seule."
            : "Verifier les variables serveur Supabase.",
      };
    }

    if (item.id === "infra-vercel") {
      return {
        ...item,
        status: vercelStatus.status,
        source: "Variables d'environnement Vercel",
        detail: vercelStatus.detail,
        summary:
          vercelStatus.status === "Operationnel"
            ? "Deploiement Vercel detecte par l'environnement."
            : "Deploiement Vercel non confirme depuis cet environnement.",
        nextAction: "Verifier le build et les variables avant livraison.",
      };
    }

    return item;
  });

  const overview = buildProjectStatusOverview(items);
  const priorityMemoryAction = getPriorityProjectMemoryAction(
    projectMemoryEntriesResult.entries,
  );
  const actionableItems = items.filter((item) => !item.blockedByExternalReview);
  const nextRecommendedAction =
    priorityMemoryAction?.nextAction ??
    actionableItems.find((item) => item.status === "Bloque")?.nextAction ??
    actionableItems.find((item) => item.status === "A migrer")?.nextAction ??
    actionableItems.find((item) => item.status === "En cours")?.nextAction ??
    overview.nextRecommendedAction;

  console.info("[Project Memory] assistant context loaded");

  return {
    ...projectMemoryForAssistant,
    observatoryItems: items,
    projectMemoryEntries: projectMemoryEntriesResult.entries,
    cockpitState,
    nextRecommendedAction,
    sources: {
      supabase: supabaseHealth,
      vercel: vercelStatus,
      publicationTables,
      projectMemory: {
        entries: projectMemoryEntriesResult.entries.length,
        error: projectMemoryEntriesResult.error,
      },
    },
    overview: {
      ...overview,
      nextRecommendedAction,
    },
  };
}
