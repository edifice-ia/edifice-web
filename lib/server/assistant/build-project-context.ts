import "server-only";

import { cockpitModules } from "@/lib/cockpit/modules";
import { getLiveProjectMemory } from "@/lib/server/observatory/read-model";
import type {
  CockpitModule,
  ObservatoryItem,
  ProjectContext,
} from "@/types/cockpit";

function listNames(items: ObservatoryItem[] | CockpitModule[]) {
  if (items.length === 0) {
    return "aucun";
  }

  return items.map((item) => ("name" in item ? item.name : item.title)).join(", ");
}

// Aggregates cockpit risks once. The Workflow Engine consumes these risks when
// it verifies dependencies and builds the final plan.
function detectRisks(options: {
  blockedModules: ObservatoryItem[];
  reviewModules: ObservatoryItem[];
  externalReviewModules: ObservatoryItem[];
  migratingModules: ObservatoryItem[];
  projectMemoryError?: string | null;
  publicationTablesMissing: boolean;
}) {
  const risks = [
    ...options.blockedModules.map(
      (item) => `${item.name}: ${item.summary} Prochaine action: ${item.nextAction}`,
    ),
    ...(options.reviewModules.length > 0
      ? [`${options.reviewModules.length} module(s) en review: ${listNames(options.reviewModules)}.`]
      : []),
    ...(options.externalReviewModules.length > 0
      ? [`${options.externalReviewModules.length} module(s) dependent d'une review externe: ${listNames(options.externalReviewModules)}.`]
      : []),
    ...(options.migratingModules.length > 0
      ? [`${options.migratingModules.length} module(s) encore en migration: ${listNames(options.migratingModules)}.`]
      : []),
    ...(options.publicationTablesMissing
      ? ["Aucune table de publication candidate n'est lisible pour le moment."]
      : []),
    ...(options.projectMemoryError
      ? [`Memoire projet indisponible: ${options.projectMemoryError}`]
      : []),
  ];

  return risks.length > 0
    ? risks
    : ["Aucun risque bloquant detecte par l'Observatoire."];
}

// Builds the read-only state consumed by the assistant workflow engine. It does
// not produce advisory answers; all command interpretation happens downstream.
export async function buildProjectContext(): Promise<ProjectContext> {
  const liveMemory = await getLiveProjectMemory();
  const cockpitState = liveMemory.cockpitState;
  const items = liveMemory.observatoryItems;
  const operationalModules = items.filter((item) =>
    ["Operationnel", "Disponible"].includes(item.status),
  );
  const blockedModules = items.filter((item) =>
    ["Bloque", "A securiser", "Non connecte"].includes(item.status) &&
    !item.blockedByExternalReview,
  );
  const reviewModules = items.filter((item) => item.status === "Review");
  const externalReviewModules = items.filter(
    (item) => item.blockedByExternalReview,
  );
  const migratingModules = items.filter((item) =>
    ["A migrer", "En migration", "En cours"].includes(item.status),
  );
  const cockpitModulesInMigration = cockpitModules.filter((module) =>
    ["A migrer", "En migration", "En cours"].includes(module.status),
  );
  const publicationTablesMissing = liveMemory.sources.publicationTables.every(
    (probe) => !probe.exists,
  );
  const priorityMemoryEntry = liveMemory.projectMemoryEntries.find((entry) =>
    Boolean(entry.nextAction),
  );
  const actionableItems = items.filter((item) => !item.blockedByExternalReview);
  const actionablePriorities = [
    ...(cockpitState.contentDrafts.readyToPublish.length > 0
      ? [{
          action: "Valider les brouillons prets avant publication.",
          reason: `${cockpitState.contentDrafts.readyToPublish.length} brouillon(s) sont prets a publier.`,
          dependency: "Validation humaine obligatoire",
          feasibleNow: true,
        }]
      : []),
    ...(cockpitState.contentDrafts.inProgress.length > 0
      ? [{
          action: "Stabiliser les brouillons en cours avant de produire les assets.",
          reason: `${cockpitState.contentDrafts.inProgress.length} brouillon(s) restent en cours.`,
          dependency: null,
          feasibleNow: true,
        }]
      : []),
    ...(priorityMemoryEntry?.nextAction
      ? [{
          action: priorityMemoryEntry.nextAction,
          reason: `Issue de project_memory: ${priorityMemoryEntry.title}`,
          dependency: null,
          feasibleNow: true,
        }]
      : []),
    ...actionableItems
      .filter((item) => ["Bloque", "A migrer", "En cours"].includes(item.status))
      .slice(0, 3)
      .map((item) => ({
        action: item.nextAction,
        reason: `${item.name} est ${item.status}.`,
        dependency: null,
        feasibleNow: true,
      })),
  ].slice(0, 5);
  const nextPriorityAction =
    actionablePriorities[0]?.action ??
    blockedModules[0]?.nextAction ??
    migratingModules.find((item) => !item.blockedByExternalReview)?.nextAction ??
    liveMemory.nextRecommendedAction;
  const guardrails = [
    "Aucune action sensible automatique.",
    "Aucune publication reelle.",
    "Aucune suppression.",
    "Aucune modification OAuth.",
    "Aucun secret ni token expose.",
  ];
  const detectedRisks = detectRisks({
    blockedModules,
    reviewModules,
    externalReviewModules,
    migratingModules,
    publicationTablesMissing,
    projectMemoryError: liveMemory.sources.projectMemory.error,
  });
  const readyDraftCount = cockpitState.contentDrafts.readyToPublish.length;
  const inProgressDraftCount = cockpitState.contentDrafts.inProgress.length;
  const siteSummary = [
    `${items.length} modules Observatoire suivis.`,
    `${operationalModules.length} operationnel(s), ${blockedModules.length} bloque(s), ${reviewModules.length} en review, ${externalReviewModules.length} en attente externe, ${migratingModules.length} en migration.`,
    `Plateformes: ${cockpitState.platformStatuses.map((platform) => `${platform.name} ${platform.label}`).join(" ; ")}.`,
    `${cockpitState.contentDrafts.total} brouillon(s): ${readyDraftCount} pret(s), ${inProgressDraftCount} en cours.`,
    `${cockpitModulesInMigration.length} module(s) cockpit encore en migration: ${listNames(cockpitModulesInMigration)}.`,
    `${liveMemory.projectMemoryEntries.length} entree(s) project_memory lue(s).`,
    `Prochaine action: ${nextPriorityAction}`,
  ].join(" ");

  console.info("[Assistant Context] read-only context loaded");

  return {
    projectSummary: siteSummary,
    operationalModules,
    blockedModules,
    reviewModules,
    externalReviewModules,
    migratingModules,
    cockpitModules,
    cockpitModulesInMigration,
    nextPriorityAction,
    actionablePriorities,
    nextActions: [
      nextPriorityAction,
      ...actionableItems
        .filter((item) => item.nextAction !== nextPriorityAction)
        .slice(0, 4)
        .map((item) => item.nextAction),
    ],
    detectedRisks,
    guardrails,
    latestMemoryEntries: liveMemory.projectMemoryEntries.slice(0, 5),
    siteSummary,
    observatoryItems: items,
    projectMemoryEntries: liveMemory.projectMemoryEntries,
    cockpitState,
    overview: {
      ...liveMemory.overview,
      nextRecommendedAction: nextPriorityAction,
    },
  };
}
