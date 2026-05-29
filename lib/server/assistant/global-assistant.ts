import "server-only";

import type { ProjectContext } from "@/types/cockpit";

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

export function legacyGlobalAssistant(input: GlobalAssistantInput) {
  const answer = buildFallbackAnswer(input);
  const { context } = input;

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
