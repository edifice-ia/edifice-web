import "server-only";

import type { ProjectContext } from "@/types/cockpit";

export type GlobalAssistantMode = "project" | "interior" | "balance";

export type GlobalAssistantInput = {
  message: string;
  mode: GlobalAssistantMode;
  context: ProjectContext;
};

function normalizeMessage(message: string) {
  return message
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

function formatModuleList(
  modules: Array<{ name?: string; title?: string; nextAction?: string }>,
) {
  if (modules.length === 0) {
    return "Aucun module dans cette catégorie.";
  }

  return modules
    .map((module) => {
      const name = module.name ?? module.title ?? "Module";
      return module.nextAction ? `${name}: ${module.nextAction}` : name;
    })
    .join(" ; ");
}

function buildProjectAnswer(message: string, context: ProjectContext) {
  const normalized = normalizeMessage(message);

  if (
    normalized.includes("que faire") ||
    normalized.includes("quoi faire") ||
    normalized.includes("maintenant") ||
    normalized.includes("prochaine pierre")
  ) {
    return `La prochaine pierre à poser : ${context.nextPriorityAction}`;
  }

  if (
    normalized.includes("ou en est") ||
    normalized.includes("etat") ||
    normalized.includes("avancement") ||
    normalized.includes("projet")
  ) {
    return context.projectSummary;
  }

  if (
    normalized.includes("blocage") ||
    normalized.includes("bloque") ||
    normalized.includes("bloques")
  ) {
    return `Blocages détectés : ${formatModuleList(context.blockedModules)}`;
  }

  if (normalized.includes("review") || normalized.includes("revue")) {
    return `En review : ${formatModuleList(context.reviewModules)}`;
  }

  return [
    context.projectSummary,
    `Action prioritaire : ${context.nextPriorityAction}`,
    `Garde-fous : ${context.guardrails.join(" ")}`,
  ].join("\n\n");
}

function buildInteriorAnswer(context: ProjectContext) {
  return [
    "Je garde la lecture côté chantier, sans déclencher d'action.",
    `Point d'appui concret : ${context.nextPriorityAction}`,
    "Pour l'intérieur, je te propose de choisir une seule action utile, puis de revenir au cockpit quand elle est posée.",
  ].join("\n\n");
}

function buildBalanceAnswer(context: ProjectContext) {
  return [
    "Équilibre du moment : avancer sans ouvrir de nouveau front sensible.",
    `La pierre la plus sobre à poser est : ${context.nextPriorityAction}`,
    context.detectedRisks.length > 0
      ? `Risque à garder visible : ${context.detectedRisks[0]}`
      : "Aucun risque bloquant détecté par l'Observatoire.",
  ].join("\n\n");
}

export function globalAssistant({ message, mode, context }: GlobalAssistantInput) {
  const answer =
    mode === "interior"
      ? buildInteriorAnswer(context)
      : mode === "balance"
        ? buildBalanceAnswer(context)
        : buildProjectAnswer(message, context);

  console.info("[Global Assistant] response generated");

  return {
    ok: true,
    answer,
    context: {
      modulesOperational: context.operationalModules.map((module) => module.name),
      modulesReview: context.reviewModules.map((module) => module.name),
      modulesBlocked: context.blockedModules.map((module) => module.name),
      nextAction: context.nextPriorityAction,
      guardrails: context.guardrails,
    },
  };
}
