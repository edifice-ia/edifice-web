import "server-only";

import type {
  AssistantActionablePriority,
  ProjectContext,
} from "@/types/cockpit";

export type GlobalAssistantMode = "project" | "interior" | "balance";

export type GlobalAssistantInput = {
  message: string;
  mode: GlobalAssistantMode;
  context: ProjectContext;
};

type OpenAIResponsePayload = {
  output_text?: string;
  output?: Array<{
    content?: Array<{
      text?: string;
      type?: string;
    }>;
  }>;
};

const systemPrompt = [
  "Tu es l'Assistant de L'Edifice, copilote de chantier du projet.",
  "Tu aides Vincent a prioriser, comprendre les blocages, suivre les modules et choisir la prochaine pierre a poser.",
  "Tu distingues toujours l'acces a un outil externe de l'etat reel du module projet associe.",
  "Un module en review externe ne doit pas etre propose comme action prioritaire immediate.",
  "Une action prioritaire doit etre faisable maintenant par Vincent.",
  "Tu ne declenches aucune action reelle.",
  "Tu ne publies rien.",
  "Tu ne modifies aucun OAuth.",
  "Tu respectes les garde-fous.",
  "Tu reponds precisement a la question posee en utilisant le contexte projet.",
].join("\n");

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
    return "Aucun module dans cette categorie.";
  }

  return modules
    .map((module) => {
      const name = module.name ?? module.title ?? "Module";
      return module.nextAction ? `${name}: ${module.nextAction}` : name;
    })
    .join(" ; ");
}

function getPrimaryRecommendation(
  context: ProjectContext,
): AssistantActionablePriority {
  return (
    context.actionablePriorities[0] ?? {
      action: context.nextPriorityAction,
      reason:
        "Prochaine action issue de l'Observatoire, sans action sensible automatique.",
      dependency: null,
      feasibleNow: true,
    }
  );
}

function formatPriority(priority: AssistantActionablePriority) {
  return [
    `Action recommandee: ${priority.action}`,
    `Raison: ${priority.reason}`,
    `Dependance eventuelle: ${priority.dependency ?? "aucune"}`,
    `Faisable maintenant: ${priority.feasibleNow ? "oui" : "non"}`,
  ].join("\n");
}

function formatPriorities(priorities: AssistantActionablePriority[]) {
  if (priorities.length === 0) {
    return "Aucune action faisable maintenant n'est detectee.";
  }

  return priorities
    .map((priority, index) => `${index + 1}. ${formatPriority(priority)}`)
    .join("\n\n");
}

function buildProjectAnswer(message: string, context: ProjectContext) {
  const normalized = normalizeMessage(message);

  if (
    normalized.includes("que faire") ||
    normalized.includes("peux faire") ||
    normalized.includes("quoi faire") ||
    normalized.includes("maintenant") ||
    normalized.includes("prochaine pierre")
  ) {
    return formatPriorities(context.actionablePriorities.slice(0, 3));
  }

  if (
    normalized.includes("reviewer") ||
    normalized.includes("service externe") ||
    normalized.includes("depend d'un service") ||
    normalized.includes("depend dun service")
  ) {
    if (context.externalReviewModules.length === 0) {
      return "Aucun module n'est marque comme dependant d'un reviewer externe. Acces outil OK reste distinct de module projet OK.";
    }

    return [
      "Modules en attente externe:",
      context.externalReviewModules
        .map(
          (module) =>
            `${module.name}: ${module.externalReviewNote ?? module.nextAction}`,
        )
        .join("\n"),
      "Ces modules restent suivis, mais ils ne sont pas proposes comme priorite active tant que la review externe n'avance pas.",
    ].join("\n\n");
  }

  if (
    normalized.includes("depend de moi") ||
    normalized.includes("dependant de moi") ||
    normalized.includes("a ma charge")
  ) {
    const feasible = context.actionablePriorities.filter(
      (priority) => priority.feasibleNow,
    );

    return feasible.length > 0
      ? `Ce qui depend de Vincent maintenant:\n\n${formatPriorities(
          feasible.slice(0, 3),
        )}`
      : "Aucune priorite faisable maintenant n'est detectee cote Vincent.";
  }

  if (
    normalized.includes("ou en est") ||
    normalized.includes("etat") ||
    normalized.includes("avancement") ||
    normalized.includes("projet")
  ) {
    return [
      context.projectSummary,
      "Note: l'accessibilite des liens externes ne vaut pas validation du module projet.",
    ].join("\n\n");
  }

  if (
    normalized.includes("blocage") ||
    normalized.includes("bloque") ||
    normalized.includes("bloques")
  ) {
    return [
      `Blocages actionnables detectes : ${formatModuleList(
        context.blockedModules,
      )}`,
      context.externalReviewModules.length > 0
        ? `En attente reviewer externe, non prioritaire immediatement : ${formatModuleList(
            context.externalReviewModules,
          )}`
        : "Aucune attente reviewer externe detectee.",
    ].join("\n\n");
  }

  if (normalized.includes("review") || normalized.includes("revue")) {
    return [
      `En review : ${formatModuleList(context.reviewModules)}`,
      context.externalReviewModules.length > 0
        ? `Dont attente externe : ${formatModuleList(
            context.externalReviewModules,
          )}`
        : "Aucune review externe prioritaire detectee.",
    ].join("\n\n");
  }

  return [
    context.projectSummary,
    formatPriority(getPrimaryRecommendation(context)),
    `Garde-fous : ${context.guardrails.join(" ")}`,
  ].join("\n\n");
}

function buildInteriorAnswer(context: ProjectContext) {
  return [
    "Je garde la lecture cote chantier, sans declencher d'action.",
    `Point d'appui concret : ${context.nextPriorityAction}`,
    "Pour l'interieur, je te propose de choisir une seule action utile, puis de revenir au cockpit quand elle est posee.",
  ].join("\n\n");
}

function buildBalanceAnswer(context: ProjectContext) {
  return [
    "Equilibre du moment : avancer sans ouvrir de nouveau front sensible.",
    `La pierre la plus sobre a poser est : ${context.nextPriorityAction}`,
    context.detectedRisks.length > 0
      ? `Risque a garder visible : ${context.detectedRisks[0]}`
      : "Aucun risque bloquant detecte par l'Observatoire.",
  ].join("\n\n");
}

function buildFallbackAnswer({ message, mode, context }: GlobalAssistantInput) {
  return mode === "interior"
    ? buildInteriorAnswer(context)
    : mode === "balance"
      ? buildBalanceAnswer(context)
      : buildProjectAnswer(message, context);
}

function buildSafeContextForLLM(context: ProjectContext) {
  return {
    projectSummary: context.projectSummary,
    siteSummary: context.siteSummary,
    modulesOperational: context.operationalModules.map((module) => ({
      name: module.name,
      area: module.area,
      status: module.status,
      summary: module.summary,
      nextAction: module.nextAction,
    })),
    modulesReview: context.reviewModules.map((module) => ({
      name: module.name,
      area: module.area,
      status: module.status,
      summary: module.summary,
      nextAction: module.nextAction,
      blockedByExternalReview: module.blockedByExternalReview,
      externalReviewNote: module.externalReviewNote,
    })),
    modulesExternalReview: context.externalReviewModules.map((module) => ({
      name: module.name,
      area: module.area,
      status: module.status,
      summary: module.summary,
      nextAction: module.nextAction,
      blockedByExternalReview: module.blockedByExternalReview,
      externalReviewNote: module.externalReviewNote,
    })),
    modulesBlocked: context.blockedModules.map((module) => ({
      name: module.name,
      area: module.area,
      status: module.status,
      summary: module.summary,
      nextAction: module.nextAction,
    })),
    modulesMigrating: context.migratingModules.map((module) => ({
      name: module.name,
      area: module.area,
      status: module.status,
      summary: module.summary,
      nextAction: module.nextAction,
    })),
    cockpitModulesInMigration: context.cockpitModulesInMigration.map((module) => ({
      title: module.title,
      status: module.status,
      description: module.description,
    })),
    actionablePriorities: context.actionablePriorities,
    nextActions: context.nextActions,
    risks: context.detectedRisks,
    guardrails: context.guardrails,
    latestMemoryEntries: context.latestMemoryEntries.map((entry) => ({
      createdAt: entry.createdAt,
      category: entry.category,
      status: entry.status,
      title: entry.title,
      content: entry.content,
      nextAction: entry.nextAction,
      priority: entry.priority,
      source: entry.source,
    })),
  };
}

function extractOpenAIText(payload: OpenAIResponsePayload) {
  if (payload.output_text?.trim()) {
    return payload.output_text.trim();
  }

  return (
    payload.output
      ?.flatMap((item) => item.content ?? [])
      .map((content) => content.text)
      .filter((text): text is string => Boolean(text?.trim()))
      .join("\n")
      .trim() ?? ""
  );
}

async function generateOpenAIAnswer(input: GlobalAssistantInput) {
  const apiKey = process.env.OPENAI_API_KEY?.trim();

  console.info(`[Global Assistant] OpenAI enabled ${apiKey ? "yes" : "no"}`);

  if (!apiKey) {
    return null;
  }

  const model = process.env.OPENAI_MODEL?.trim() || "gpt-4.1-mini";
  const userPrompt = [
    `Mode: ${input.mode}`,
    `Question utilisateur: ${input.message}`,
    "Contexte projet JSON sans secrets:",
    JSON.stringify(buildSafeContextForLLM(input.context), null, 2),
    "Reponds en francais, de facon concrete. Si la question demande une priorisation, donne 1 a 3 actions numerotees avec une justification courte.",
    "Pour chaque recommandation, indique: action recommandee, raison, dependance eventuelle, faisable maintenant oui/non.",
    "Ne confonds jamais lien accessible et module projet operationnel.",
  ].join("\n\n");

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      instructions: systemPrompt,
      input: userPrompt,
      max_output_tokens: 900,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI response failed with status ${response.status}.`);
  }

  const payload = (await response.json()) as OpenAIResponsePayload;
  const answer = extractOpenAIText(payload);

  if (!answer) {
    throw new Error("OpenAI response did not contain text.");
  }

  console.info("[Global Assistant] LLM response generated");
  return answer;
}

function buildResponseContext(context: ProjectContext) {
  return {
    modulesOperational: context.operationalModules.map((module) => module.name),
    modulesReview: context.reviewModules.map((module) => module.name),
    modulesExternalReview: context.externalReviewModules.map(
      (module) => module.name,
    ),
    modulesBlocked: context.blockedModules.map((module) => module.name),
    nextAction: context.nextPriorityAction,
    actionablePriorities: context.actionablePriorities,
    guardrails: context.guardrails,
  };
}

export async function globalAssistant(input: GlobalAssistantInput) {
  let answer: string | null = null;

  try {
    answer = await generateOpenAIAnswer(input);
  } catch {
    answer = null;
  }

  if (!answer) {
    answer = buildFallbackAnswer(input);
    console.info("[Global Assistant] fallback response generated");
  }

  const { context } = input;
  const recommendation = getPrimaryRecommendation(context);

  return {
    ok: true,
    answer,
    recommendation,
    context: buildResponseContext(context),
  };
}

export function legacyGlobalAssistant(input: GlobalAssistantInput) {
  const answer = buildFallbackAnswer(input);
  const { context } = input;

  return {
    ok: true,
    answer,
    recommendation: getPrimaryRecommendation(context),
    context: buildResponseContext(context),
  };
}
