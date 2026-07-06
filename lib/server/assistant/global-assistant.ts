import "server-only";

import {
  buildAssistantWorkflowResponse,
  planAssistantWorkflow,
} from "@/lib/server/assistant-workflows/engine";
import type { ProjectContext } from "@/types/cockpit";
import type { TrajectoireProject } from "@/lib/server/trajectoire";

export type GlobalAssistantMode = "project" | "interior" | "balance";
export type GlobalAssistantRunMode = "auto" | "conversation" | "workflow";

export type GlobalAssistantInput = {
  message: string;
  mode: GlobalAssistantMode;
  context: ProjectContext;
  trajectoire?: {
    projects: TrajectoireProject[];
  };
  runMode?: GlobalAssistantRunMode;
  userId: string;
};

type AssistantRunMode = Exclude<GlobalAssistantRunMode, "auto">;
type ConversationDecision = {
  action_prioritaire: string;
  pourquoi_maintenant: string;
  temps_estime: string;
  cout_estime: string;
  risque: string;
  pret_a_executer: boolean;
};

function normalizeMessage(message: string) {
  return message
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

// Chooses between Conversation and Workflow. Conversation is the default; only
// explicit workflow language or operational action verbs activate orchestration.
export function detectAssistantRunMode(message: string, override: GlobalAssistantRunMode = "auto"): AssistantRunMode {
  if (override === "conversation" || override === "workflow") {
    return override;
  }

  const normalized = normalizeMessage(message);
  const asksWorkflow =
    normalized.includes("workflow") ||
    normalized.includes("plan executable") ||
    normalized.includes("execute le plan") ||
    normalized.includes("executer le plan");
  const actionVerbs = [
    "prepare",
    "preparer",
    "termine",
    "terminer",
    "finis",
    "genere",
    "generer",
    "programme",
    "programmer",
    "publie",
    "publier",
    "execute",
    "executer",
    "organise",
    "organiser",
    "reprends",
    "reprendre",
    "lance",
    "lancer",
  ];

  return asksWorkflow || actionVerbs.some((verb) => normalized.includes(verb))
    ? "workflow"
    : "conversation";
}

function formatList(items: string[], fallback: string) {
  return items.length ? items.slice(0, 5).map((item) => `- ${item}`).join("\n") : fallback;
}

function answerConversation(input: GlobalAssistantInput) {
  const normalized = normalizeMessage(input.message);
  const { context } = input;

  if (normalized.includes("memoire") || normalized.includes("memory")) {
    return [
      "Memoire projet :",
      formatList(
        context.projectMemoryEntries.map((entry) =>
          `${entry.title}: ${entry.value ?? entry.content ?? entry.status ?? "renseigne"}`,
        ),
        "Aucune entree de memoire projet lisible.",
      ),
    ].join("\n\n");
  }

  if (normalized.includes("module") || normalized.includes("cockpit") || normalized.includes("etat")) {
    const healthyModules = context.operationalModules
      .slice(0, 3)
      .map((item) => `${item.name}: ${item.summary}`);
    const blockers = [...context.blockedModules, ...context.externalReviewModules]
      .slice(0, 4)
      .map((item) => `${item.name}: ${item.nextAction}`);
    const attention = [...context.reviewModules, ...context.migratingModules]
      .slice(0, 4)
      .map((item) => `${item.name}: ${item.status}`);

    return [
      "Etat du cockpit :",
      context.siteSummary,
      "",
      "Ce qui va bien :",
      formatList(healthyModules, "Aucun module operationnel notable dans la lecture actuelle."),
      "",
      "Ce qui bloque :",
      formatList(blockers, "Aucun blocage critique detecte."),
      "",
      "Ce qui merite attention :",
      formatList(attention, "Aucun point de surveillance prioritaire."),
      "",
      "Meilleure prochaine action :",
      context.nextPriorityAction,
    ].join("\n");
  }

  if (normalized.includes("brouillon") || normalized.includes("short")) {
    const drafts = context.cockpitState.contentDrafts;
    return [
      "Brouillons Shorts :",
      `${drafts.total} brouillon(s) lus.`,
      `${drafts.readyToPublish.length} pret(s) a publier.`,
      `${drafts.inProgress.length} en cours.`,
      "",
      "Recents :",
      formatList(drafts.recent.map((draft) => `${draft.title} (${draft.status})`), "Aucun brouillon recent."),
    ].join("\n");
  }

  if (input.mode === "interior") {
    return [
      "Lecture interieure :",
      "Je peux clarifier, resumer et aider a choisir une action sobre sans construire de workflow.",
      "",
      "Point d'appui actuel :",
      context.nextPriorityAction,
    ].join("\n");
  }

  if (input.mode === "balance") {
    return [
      "Equilibre :",
      "Le bon mouvement est de reduire le nombre de fronts ouverts et de garder une seule prochaine action.",
      "",
      "Action sobre :",
      context.nextPriorityAction,
    ].join("\n");
  }

  return [
    "Analyse :",
    context.siteSummary,
    "",
    "Conseil :",
    context.nextPriorityAction,
    "",
    "Risques :",
    formatList(context.detectedRisks, "Aucun risque bloquant detecte."),
  ].join("\n");
}

// Generates a decision block for Conversation mode. It stays read-only and does
// not imply that execution is available.
function buildConversationDecision(context: ProjectContext): ConversationDecision {
  return {
    action_prioritaire: context.nextPriorityAction,
    pourquoi_maintenant: "C'est l'action qui reduit le plus directement le prochain blocage visible du cockpit.",
    temps_estime: "1 min",
    cout_estime: "0 EUR estime",
    risque: context.detectedRisks[0] ?? "Aucun risque bloquant detecte.",
    pret_a_executer: false,
  };
}

function conversationSources(context: ProjectContext) {
  return [
    "Sources consultees :",
    "- cockpit_state",
    "- observatory",
    "- project_memory",
    `- ${context.cockpitState.contentDrafts.total} brouillon(s)`,
    `- ${context.observatoryItems.length} module(s) Observatoire`,
  ].join("\n");
}

// Canonical facade for /api/assistant/global. It now separates Conversation
// from Workflow while preserving the same server-side guardrails.
export async function globalAssistant(input: GlobalAssistantInput) {
  const runMode = detectAssistantRunMode(input.message, input.runMode ?? "auto");

  if (runMode === "conversation") {
    return {
      ok: true,
      activeMode: "conversation",
      answer: answerConversation(input),
      decision: buildConversationDecision(input.context),
      detailedAnalysis: conversationSources(input.context),
      workflow: null,
      context: {
        mode: "conversation",
        nextAction: input.context.nextPriorityAction,
      },
    };
  }

  const workflow = await planAssistantWorkflow({
    command: input.message,
    context: input.context,
    userId: input.userId,
  });

  return {
    ...buildAssistantWorkflowResponse(workflow),
    activeMode: "workflow",
  };
}
