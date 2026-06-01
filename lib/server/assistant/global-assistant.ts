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
  "Tu lis l'etat reel du cockpit: content_drafts, statuts OAuth, reviews externes, Observatoire et memoire projet.",
  "Tu distingues toujours l'acces a un outil externe de l'etat reel du module projet associe.",
  "Un module en review externe ne doit pas etre propose comme action prioritaire immediate.",
  "Une action prioritaire doit etre faisable maintenant par Vincent.",
  "Tu ne declenches aucune action reelle.",
  "Tu ne publies rien.",
  "Tu ne modifies aucun OAuth.",
  "Tu respectes les garde-fous.",
  "Pour les questions de pilotage, tu structures sobrement: point de depart, objectif immediat, plan court, action recommandee, suivi.",
  "L'objectif doit etre mesurable, accessible, logique, individualise, negocie et suivi, sans citer cette methode de facon scolaire.",
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

function formatDrafts(
  drafts: Array<{
    title: string;
    theme: string;
    status: string;
    platformTargets: string[];
    createdAt?: string;
    updatedAt?: string | null;
  }>,
) {
  if (drafts.length === 0) {
    return "Aucun brouillon dans cette categorie.";
  }

  return drafts
    .map(
      (draft) =>
        `${draft.title} (${draft.status}) - ${draft.theme} - plateformes: ${
          draft.platformTargets.join(", ") || "non renseignees"
        }${draft.updatedAt ?? draft.createdAt ? ` - maj: ${draft.updatedAt ?? draft.createdAt}` : ""}`,
    )
    .join("\n");
}

function countDraftStatus(context: ProjectContext, status: string) {
  return context.cockpitState.contentDrafts.byStatus[status] ?? 0;
}

function formatDraftSummary(context: ProjectContext) {
  return [
    `Total: ${context.cockpitState.contentDrafts.total}`,
    `Draft: ${countDraftStatus(context, "draft")}`,
    `Approved: ${countDraftStatus(context, "approved")}`,
    `Ready_to_publish: ${countDraftStatus(context, "ready_to_publish")}`,
    `Published: ${countDraftStatus(context, "published")}`,
  ].join("\n");
}

function getPlatformState(context: ProjectContext, provider: string) {
  const normalizedProvider = provider.toLowerCase();
  const oauth = context.cockpitState.oauthStatuses.find(
    (status) => status.provider === normalizedProvider,
  );
  const externalReview = context.cockpitState.externalReviews.find((review) =>
    review.name.toLowerCase().includes(normalizedProvider),
  );
  const dependency = context.cockpitState.dependencies.find((item) =>
    item.name.toLowerCase().includes(normalizedProvider),
  );

  return {
    provider: normalizedProvider,
    oauth,
    externalReview,
    dependency,
    ready: Boolean(oauth?.configured && oauth.tokenPresent && !externalReview),
  };
}

function formatPlatformReadiness(context: ProjectContext, provider: string) {
  const state = getPlatformState(context, provider);

  return [
    `${provider}: ${state.ready ? "pret pour tests controles" : "pas pret pour automation"}.`,
    `OAuth: ${state.oauth?.configured ? "configure" : "incomplet"}.`,
    `Token: ${state.oauth?.tokenPresent ? "present" : "absent"}.`,
    state.externalReview
      ? `Review externe: ${state.externalReview.note}`
      : "Review externe: aucune attente explicite detectee.",
    state.oauth?.warnings.length
      ? `Alertes: ${state.oauth.warnings.join(" | ")}`
      : "Alertes: aucune alerte OAuth lue.",
    state.ready
      ? "Prochaine etape: test controle avec validation humaine, sans publication automatique."
      : `Ce qui manque: ${
          state.externalReview?.note ??
          state.dependency?.note ??
          "finaliser la configuration OAuth et relire l'Observatoire."
        }`,
  ].join("\n");
}

function formatDependencies(
  dependencies: Array<{ name: string; status: string; note: string }>,
) {
  if (dependencies.length === 0) {
    return "Aucune dependance externe visible.";
  }

  return dependencies
    .map((dependency) => `${dependency.name} (${dependency.status}): ${dependency.note}`)
    .join("\n");
}

function formatPriorities(priorities: AssistantActionablePriority[]) {
  if (priorities.length === 0) {
    return "Aucune action faisable maintenant n'est detectee.";
  }

  return priorities
    .map((priority, index) => `${index + 1}. ${formatPriority(priority)}`)
    .join("\n\n");
}

function isSteeringQuestion(normalized: string) {
  return (
    normalized.includes("ou en est") ||
    normalized.includes("que faire") ||
    normalized.includes("peux faire") ||
    normalized.includes("quoi faire") ||
    normalized.includes("maintenant") ||
    normalized.includes("prochaine etape") ||
    normalized.includes("prochaine pierre") ||
    normalized.includes("blocage") ||
    normalized.includes("bloque") ||
    normalized.includes("bloques") ||
    normalized.includes("prioriser") ||
    normalized.includes("priorisation") ||
    normalized.includes("comment prioriser")
  );
}

function summarizePlatformStatus(context: ProjectContext) {
  return context.cockpitState.oauthStatuses
    .map((status) => {
      const review = context.cockpitState.externalReviews.find((item) =>
        item.name.toLowerCase().includes(status.provider),
      );
      const state = status.configured && status.tokenPresent
        ? "connecte"
        : status.configured
          ? "configure sans token confirme"
          : "incomplet";

      return `${status.provider}: ${review ? "review en attente" : state}`;
    })
    .join(" ; ");
}

function buildSteeringObjective(context: ProjectContext) {
  if (context.cockpitState.contentDrafts.readyToPublish.length > 0) {
    return `Stabiliser aujourd'hui ${context.cockpitState.contentDrafts.readyToPublish.length} brouillon(s) pret(s) a publier, dans un cadre accessible et verifiable, sans publication automatique.`;
  }

  if (context.cockpitState.contentDrafts.inProgress.length > 0) {
    return `Faire avancer ${context.cockpitState.contentDrafts.inProgress.length} brouillon(s) en cours vers un statut clair, avec une verification simple dans content_drafts.`;
  }

  return "Clarifier la prochaine action du cockpit a partir des donnees reelles, avec un resultat mesurable et suivi dans l'Observatoire.";
}

function buildFollowUpMeasure(priority: AssistantActionablePriority) {
  const normalizedAction = normalizeMessage(priority.action);

  if (normalizedAction.includes("brouillon")) {
    return "C'est termine quand l'Atelier affiche le bon nombre de brouillons dans le statut vise, notamment ready_to_publish si c'est l'objectif.";
  }

  if (normalizedAction.includes("oauth") || normalizedAction.includes("review")) {
    return "C'est termine quand l'Observatoire indique clairement le statut OAuth/review et ce qui reste externe.";
  }

  if (normalizedAction.includes("assistant")) {
    return "C'est termine quand l'assistant repond precisement a une question comme: Combien ai-je de brouillons prets a publier ?";
  }

  return "C'est termine quand l'Observatoire et l'assistant donnent la meme prochaine action, sans alerte de lecture.";
}

function buildSteeringAnswer(context: ProjectContext) {
  const priorities = context.actionablePriorities.slice(0, 3);
  const recommendation = getPrimaryRecommendation(context);
  const blockers = context.cockpitState.blockers.slice(0, 3);
  const activeModules = context.cockpitState.modules.available
    .map((module) => module.title)
    .join(", ") || "aucun module disponible confirme";

  return [
    "Point de depart :",
    `${context.cockpitState.contentDrafts.total} brouillon(s) lus, dont ${context.cockpitState.contentDrafts.readyToPublish.length} pret(s) a publier et ${context.cockpitState.contentDrafts.inProgress.length} en cours. Plateformes: ${summarizePlatformStatus(context)}. Modules actifs: ${activeModules}. Blocages: ${
      blockers.length > 0 ? blockers.join(" ; ") : "aucun blocage dur detecte"
    }.`,
    "",
    "Objectif :",
    buildSteeringObjective(context),
    "",
    "Plan :",
    priorities.length > 0
      ? priorities
          .map((priority, index) => `${index + 1}. ${priority.action}`)
          .join("\n")
      : "1. Relire l'Observatoire\n2. Verifier content_drafts\n3. Choisir une seule action faisable",
    "",
    "Action recommandee :",
    recommendation.action,
    "",
    "Suivi :",
    buildFollowUpMeasure(recommendation),
  ].join("\n");
}

function buildProjectAnswer(message: string, context: ProjectContext) {
  const normalized = normalizeMessage(message);

  if (
    normalized.includes("tiktok") &&
    (normalized.includes("pret") ||
      normalized.includes("pre t") ||
      normalized.includes("manque") ||
      normalized.includes("etat"))
  ) {
    return formatPlatformReadiness(context, "tiktok");
  }

  if (
    normalized.includes("pinterest") &&
    (normalized.includes("pret") ||
      normalized.includes("manque") ||
      normalized.includes("etat"))
  ) {
    return formatPlatformReadiness(context, "pinterest");
  }

  if (
    (normalized.includes("meta") || normalized.includes("instagram")) &&
    (normalized.includes("pret") ||
      normalized.includes("manque") ||
      normalized.includes("etat"))
  ) {
    return formatPlatformReadiness(context, "meta");
  }

  if (
    normalized.includes("youtube") &&
    (normalized.includes("pret") ||
      normalized.includes("manque") ||
      normalized.includes("etat"))
  ) {
    return formatPlatformReadiness(context, "youtube");
  }

  if (
    normalized.includes("combien") &&
    (normalized.includes("brouillon") || normalized.includes("draft"))
  ) {
    return `Etat des brouillons content_drafts:\n\n${formatDraftSummary(context)}`;
  }

  if (
    (normalized.includes("plus recent") ||
      normalized.includes("plus recents") ||
      normalized.includes("recents") ||
      normalized.includes("derniers")) &&
    (normalized.includes("brouillon") || normalized.includes("draft"))
  ) {
    return `Brouillons les plus recents:\n\n${formatDrafts(
      context.cockpitState.contentDrafts.recent,
    )}`;
  }

  if (isSteeringQuestion(normalized)) {
    return buildSteeringAnswer(context);
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
    normalized.includes("cockpit") ||
    normalized.includes("avancement") ||
    normalized.includes("projet")
  ) {
    return [
      "Etat operationnel de L'Edifice:",
      context.projectSummary,
      `Brouillons: ${context.cockpitState.contentDrafts.total} lus, ${context.cockpitState.contentDrafts.readyToPublish.length} prets a publier, ${context.cockpitState.contentDrafts.inProgress.length} en cours.`,
      `OAuth: ${context.cockpitState.oauthStatuses
        .map(
          (status) =>
            `${status.provider} ${status.configured ? "configure" : "incomplet"} / token ${
              status.tokenPresent ? "present" : "absent"
            }`,
        )
        .join(" ; ")}.`,
      `Blocages: ${context.cockpitState.blockers.length ? context.cockpitState.blockers.slice(0, 4).join(" ; ") : "aucun blocage dur detecte"}.`,
      `Prochaines etapes: ${context.actionablePriorities
        .slice(0, 3)
        .map((priority) => priority.action)
        .join(" ; ")}.`,
      "Note: l'accessibilite des liens externes ne vaut pas validation du module projet.",
    ].join("\n\n");
  }

  if (
    normalized.includes("pret a publier") ||
    normalized.includes("prets a publier") ||
    normalized.includes("brouillons sont prets") ||
    normalized.includes("brouillons prets") ||
    normalized.includes("ready_to_publish")
  ) {
    return `Brouillons prets a publier, sans publication automatique:\n\n${formatDrafts(
      context.cockpitState.contentDrafts.readyToPublish,
    )}`;
  }

  if (
    normalized.includes("brouillon") ||
    normalized.includes("en cours") ||
    normalized.includes("draft")
  ) {
    return `Brouillons en cours:\n\n${formatDrafts(
      context.cockpitState.contentDrafts.inProgress,
    )}`;
  }

  if (
    normalized.includes("que manque") ||
    normalized.includes("qu'est-ce qui manque") ||
    normalized.includes("ce qui manque")
  ) {
    return [
      "Ce qui manque ou bloque:",
      context.cockpitState.blockers.length > 0
        ? context.cockpitState.blockers.join("\n")
        : "Aucun blocage technique dur detecte.",
      context.cockpitState.externalReviews.length > 0
        ? `Reviews externes:\n${formatDependencies(context.cockpitState.externalReviews)}`
        : "Aucune review externe visible.",
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

  if (
    normalized.includes("dependance") ||
    normalized.includes("dependencies") ||
    normalized.includes("module disponible") ||
    normalized.includes("modules disponibles")
  ) {
    return [
      `Modules disponibles: ${context.cockpitState.modules.available
        .map((module) => module.title)
        .join(", ") || "aucun"}.`,
      `Modules en migration: ${context.cockpitState.modules.migrating
        .map((module) => module.title)
        .join(", ") || "aucun"}.`,
      `Dependances:\n${formatDependencies(context.cockpitState.dependencies)}`,
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
    cockpitState: {
      contentDrafts: context.cockpitState.contentDrafts,
      oauthStatuses: context.cockpitState.oauthStatuses,
      modules: {
        available: context.cockpitState.modules.available.map((module) => ({
          title: module.title,
          status: module.status,
          description: module.description,
        })),
        migrating: context.cockpitState.modules.migrating.map((module) => ({
          title: module.title,
          status: module.status,
          description: module.description,
        })),
      },
      externalReviews: context.cockpitState.externalReviews,
      dependencies: context.cockpitState.dependencies,
      blockers: context.cockpitState.blockers,
      nextActions: context.cockpitState.nextActions,
      guardrails: context.cockpitState.guardrails,
    },
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
    instructions: {
      capabilities: [
        "resumer l'etat du projet",
        "classer 3 actions par impact",
        "compter et lister les brouillons",
        "evaluer TikTok, Pinterest, Meta/Instagram et YouTube",
        "signaler ce qui manque",
      ],
      steeringFormat:
        "Pour les questions de pilotage: Point de depart, Objectif, Plan, Action recommandee, Suivi. Ton sobre, pas scolaire.",
      safety:
        "lecture seule stricte: aucune publication, suppression, modification OAuth ou exposition de secrets",
    },
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
    "Pour les questions sur les brouillons, utilise contentDrafts.byStatus, readyToPublish, inProgress et recent.",
    "Pour les questions sur TikTok/Pinterest/Instagram/Meta/YouTube, utilise oauthStatuses, externalReviews, dependencies et blockers.",
    "Pour les questions de pilotage (ou en est le projet, que faire maintenant, prochaine etape, blocage, prioriser), reponds avec une structure sobre: Point de depart, Objectif, Plan, Action recommandee, Suivi.",
    "Ne nomme pas POPAM sauf si l'utilisateur le demande explicitement.",
    "Ne confonds jamais lien accessible et module projet operationnel.",
    "Les donnees cockpit sont en lecture seule: n'annonce jamais une action d'ecriture, de suppression ou de publication.",
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
    cockpitState: {
      contentDrafts: {
        total: context.cockpitState.contentDrafts.total,
        readyToPublish: context.cockpitState.contentDrafts.readyToPublish.map(
          (draft) => draft.title,
        ),
        inProgress: context.cockpitState.contentDrafts.inProgress.map(
          (draft) => draft.title,
        ),
        recent: context.cockpitState.contentDrafts.recent.map(
          (draft) => draft.title,
        ),
        byStatus: context.cockpitState.contentDrafts.byStatus,
      },
      oauthStatuses: context.cockpitState.oauthStatuses.map((status) => ({
        provider: status.provider,
        configured: status.configured,
        tokenPresent: status.tokenPresent,
        warnings: status.warnings,
      })),
      modulesAvailable: context.cockpitState.modules.available.map(
        (module) => module.title,
      ),
      modulesMigrating: context.cockpitState.modules.migrating.map(
        (module) => module.title,
      ),
      externalReviews: context.cockpitState.externalReviews,
      dependencies: context.cockpitState.dependencies,
      blockers: context.cockpitState.blockers,
      nextActions: context.cockpitState.nextActions,
    },
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
