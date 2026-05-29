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
  "Quels sont les blocages ?",
  "Où en est le projet ?",
  "Qu’est-ce qui est en review ?",
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
    question === "Quelle est la prochaine pierre ?"
  ) {
    return `${context.nextPriorityAction} Garde les actions sensibles verrouillees: aucune publication automatique.`;
  }

  if (question === "Quels sont les blocages ?") {
    if (context.blockedModules.length === 0) {
      return "Aucun blocage dur detecte. Les points a surveiller sont les modules en review et en migration.";
    }

    return `Blocages detectes: ${context.blockedModules
      .map((item) => `${item.name} (${item.nextAction})`)
      .join(" ; ")}.`;
  }

  if (question === "Où en est le projet ?") {
    return context.siteSummary;
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
  const items = liveMemory.observatoryItems;
  const operationalModules = items.filter((item) =>
    ["Operationnel", "Disponible"].includes(item.status),
  );
  const blockedModules = items.filter((item) =>
    ["Bloque", "A securiser", "Non connecte"].includes(item.status),
  );
  const reviewModules = items.filter((item) => item.status === "Review");
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
  const nextPriorityAction =
    priorityMemoryEntry?.nextAction ??
    blockedModules[0]?.nextAction ??
    migratingModules[0]?.nextAction ??
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
    migratingModules,
    publicationTablesMissing,
    projectMemoryError: liveMemory.sources.projectMemory.error,
  });
  const siteSummary = [
    `${items.length} modules Observatoire suivis.`,
    `${operationalModules.length} operationnel(s), ${blockedModules.length} bloque(s), ${reviewModules.length} en review, ${migratingModules.length} en migration.`,
    `${cockpitModulesInMigration.length} module(s) cockpit existant(s) encore en migration: ${listNames(cockpitModulesInMigration)}.`,
    `${liveMemory.projectMemoryEntries.length} entree(s) project_memory lue(s).`,
    `Prochaine pierre: ${nextPriorityAction}`,
  ].join(" ");
  const contextWithoutRecommendations = {
    projectSummary: siteSummary,
    operationalModules,
    blockedModules,
    reviewModules,
    migratingModules,
    cockpitModules,
    cockpitModulesInMigration,
    nextPriorityAction,
    nextActions: [
      nextPriorityAction,
      ...items
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
