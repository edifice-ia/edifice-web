import "server-only";

import { cockpitModules } from "@/lib/cockpit/modules";
import { getLiveProjectMemory } from "@/lib/server/observatory/read-model";
import type {
  AssistantQuestion,
  CockpitModule,
  ObservatoryItem,
  ProjectContext,
} from "@/types/cockpit";

export const supportedAssistantQuestions: AssistantQuestion[] = [
  "Que dois-je faire maintenant ?",
  "Quelle est la prochaine pierre ?",
  "Quelle est la prochaine pierre realiste ?",
  "Quels sont les blocages ?",
  "Ou en est le projet ?",
  "Qu'est-ce qui est en review ?",
  "Qu'est-ce qui est bloque par un reviewer ?",
  "Qu'est-ce qui depend de moi ?",
  "Qu'est-ce qui depend d'un service externe ?",
];

function listNames(items: ObservatoryItem[] | CockpitModule[]) {
  if (items.length === 0) {
    return "aucun";
  }

  return items.map((item) => ("name" in item ? item.name : item.title)).join(", ");
}

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
      ? [
          `${options.reviewModules.length} module(s) en review: ${listNames(
            options.reviewModules,
          )}.`,
        ]
      : []),
    ...(options.externalReviewModules.length > 0
      ? [
          `${options.externalReviewModules.length} module(s) dependent d'une review externe et ne sont pas prioritaires immediatement: ${listNames(
            options.externalReviewModules,
          )}.`,
        ]
      : []),
    ...(options.migratingModules.length > 0
      ? [
          `${options.migratingModules.length} module(s) encore en migration: ${listNames(
            options.migratingModules,
          )}.`,
        ]
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

function answerQuestion(
  question: AssistantQuestion,
  context: Omit<ProjectContext, "recommendations">,
) {
  if (
    question === "Que dois-je faire maintenant ?" ||
    question === "Quelle est la prochaine pierre ?" ||
    question === "Quelle est la prochaine pierre realiste ?"
  ) {
    const priorities = context.actionablePriorities.slice(0, 3);

    if (priorities.length === 0) {
      return "Aucune action immediate fiable n'est detectee. Garde les actions sensibles verrouillees et relis les statuts avant de lancer un nouveau front.";
    }

    return priorities
      .map(
        (priority, index) =>
          `${index + 1}. ${priority.action} Raison: ${priority.reason} Dependance: ${
            priority.dependency ?? "aucune"
          }. Faisable maintenant: ${priority.feasibleNow ? "oui" : "non"}.`,
      )
      .join(" ");
  }

  if (question === "Quels sont les blocages ?") {
    if (
      context.blockedModules.length === 0 &&
      context.externalReviewModules.length === 0
    ) {
      return "Aucun blocage dur detecte. Les points a surveiller sont les modules en review et en migration.";
    }

    return `Blocages detectes: ${context.blockedModules
      .map((item) => `${item.name} (${item.nextAction})`)
      .join(" ; ")}. Reviews externes a ne pas traiter comme priorite immediate: ${listNames(
      context.externalReviewModules,
    )}.`;
  }

  if (question === "Ou en est le projet ?") {
    return context.siteSummary;
  }

  if (question === "Qu'est-ce qui est bloque par un reviewer ?") {
    return context.externalReviewModules.length > 0
      ? `En attente reviewer externe: ${context.externalReviewModules
          .map(
            (item) =>
              `${item.name} (${item.externalReviewNote ?? item.nextAction})`,
          )
          .join(" ; ")}. Ces modules restent visibles mais ne sont pas des priorites actives.`
      : "Aucun module n'est marque comme bloque par un reviewer externe.";
  }

  if (question === "Qu'est-ce qui depend de moi ?") {
    const doable = context.actionablePriorities.filter(
      (priority) => priority.feasibleNow,
    );

    return doable.length > 0
      ? `Depend de Vincent maintenant: ${doable
          .map(
            (priority) =>
              `${priority.action} (raison: ${priority.reason}; dependance: ${
                priority.dependency ?? "aucune"
              })`,
          )
          .join(" ; ")}.`
      : "Aucune action immediate dependante de Vincent n'est detectee.";
  }

  if (question === "Qu'est-ce qui depend d'un service externe ?") {
    return context.externalReviewModules.length > 0
      ? `Depend d'un service externe: ${context.externalReviewModules
          .map(
            (item) =>
              `${item.name} (${item.externalReviewNote ?? item.nextAction})`,
          )
          .join(" ; ")}. Acces outil OK ne signifie pas module projet OK.`
      : "Aucune dependance externe de review n'est detectee par l'Observatoire.";
  }

  return context.reviewModules.length > 0
    ? `En review: ${context.reviewModules
        .map((item) => `${item.name} (${item.nextAction})`)
        .join(" ; ")}.`
    : "Aucun module en review pour le moment.";
}

function buildRecommendations(context: Omit<ProjectContext, "recommendations">) {
  return Object.fromEntries(
    supportedAssistantQuestions.map((question) => [
      question,
      answerQuestion(question, context),
    ]),
  ) as Record<AssistantQuestion, string>;
}

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
    ...(priorityMemoryEntry?.nextAction
      ? [
          {
            action: priorityMemoryEntry.nextAction,
            reason: `Issue de project_memory: ${priorityMemoryEntry.title}`,
            dependency: null,
            feasibleNow: true,
          },
        ]
      : []),
    ...(externalReviewModules.length > 0
      ? [
          {
            action:
              "Consolider l'Assistant global, l'Observatoire et la memoire projet pendant les reviews externes.",
            reason:
              "Les modules sociaux en review externe ne sont pas des priorites immediates faisables par Vincent.",
            dependency: "Reviews externes en attente",
            feasibleNow: true,
          },
        ]
      : []),
    ...actionableItems
      .filter((item) => ["Bloque", "A migrer", "En cours"].includes(item.status))
      .slice(0, 3)
      .map((item) => ({
        action: item.nextAction,
        reason: `${item.name} est ${item.status} et ne depend pas d'une review externe.`,
        dependency: null,
        feasibleNow: true,
      })),
  ].slice(0, 5);

  if (externalReviewModules.length > 0) {
    console.info("[Assistant] external review detected");
  }

  console.info("[Assistant] actionable priorities generated");

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
    `${operationalModules.length} operationnel(s), ${blockedModules.length} bloque(s) actionnable(s), ${reviewModules.length} en review, ${externalReviewModules.length} en attente externe, ${migratingModules.length} en migration.`,
    `${cockpitState.contentDrafts.total} brouillon(s) content_drafts lus: ${readyDraftCount} pret(s) a publier, ${inProgressDraftCount} en cours.`,
    `${cockpitModulesInMigration.length} module(s) cockpit existant(s) encore en migration: ${listNames(cockpitModulesInMigration)}.`,
    `${liveMemory.projectMemoryEntries.length} entree(s) project_memory lue(s).`,
    `Prochaine pierre: ${nextPriorityAction}`,
  ].join(" ");
  const contextWithoutRecommendations = {
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
  const recommendations = buildRecommendations(contextWithoutRecommendations);

  console.info("[Assistant] context loaded");
  console.info("[Assistant] recommendation generated");

  return {
    ...contextWithoutRecommendations,
    recommendations,
  };
}

export function normalizeAssistantQuestion(value: string | null) {
  return (
    supportedAssistantQuestions.find((question) => question === value) ??
    "Que dois-je faire maintenant ?"
  );
}
