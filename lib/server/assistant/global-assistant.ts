import "server-only";

import type {
  AssistantActionablePriority,
  ProjectContext,
} from "@/types/cockpit";
import type {
  TrajectoireObjective,
  TrajectoireProject,
} from "@/lib/server/trajectoire";

export type GlobalAssistantMode = "project" | "interior" | "balance";

export type GlobalAssistantInput = {
  message: string;
  mode: GlobalAssistantMode;
  context: ProjectContext;
  trajectoire?: {
    projects: TrajectoireProject[];
  };
};

export type TrajectoryObjectiveProposal = {
  project: string;
  objective: string;
  deadline: string | null;
  planAction: string[];
  actions: string[];
  means: string[];
  initialProgress: number;
  confidence: number;
  mode?: "create" | "update";
  existingProjectId?: string | null;
  existingObjectiveId?: string | null;
  rationale?: string;
  memoryContext?: string[];
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

type AssistantSubject =
  | "Shorts"
  | "Pinterest"
  | "TikTok"
  | "Assistant"
  | "Trajectoire"
  | "Connexions"
  | "Personnel"
  | "General";

type AssistantIntent =
  | "etat"
  | "priorite"
  | "modification"
  | "creation"
  | "capacites"
  | "explication"
  | "general";

type AssistantSourceUsage = {
  trajectoire: boolean;
  memory: boolean;
  cockpit: boolean;
  observatory: boolean;
};

type SubjectEvidence = {
  memory: ProjectContext["projectMemoryEntries"];
  oauth: ProjectContext["cockpitState"]["oauthStatuses"];
  platforms: ProjectContext["cockpitState"]["platformStatuses"];
  modules: ProjectContext["cockpitState"]["modules"]["available"];
  migratingModules: ProjectContext["cockpitState"]["modules"]["migrating"];
  observatory: ProjectContext["observatoryItems"];
  dependencies: ProjectContext["cockpitState"]["dependencies"];
  blockers: string[];
  drafts: ProjectContext["cockpitState"]["contentDrafts"];
  sourceUsage: AssistantSourceUsage;
};

type OperationalAnswer = {
  answer: string;
  sources: string;
};

type IntentionalOperationalAnswer = {
  answer: string;
  sources: string;
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

function detectIntent(message: string): AssistantIntent {
  const normalized = normalizeMessage(message).replace(/[^a-z0-9]+/g, " ").trim();
  const asksCapability =
    normalized.includes("qu est ce que tu peux") ||
    normalized.includes("que peux tu") ||
    normalized.includes("peux tu") ||
    normalized.includes("tu peux") ||
    normalized.includes("qu est ce que tu as le droit") ||
    normalized.includes("droit de") ||
    normalized.includes("pas le droit") ||
    normalized.includes("limite") ||
    normalized.includes("limites") ||
    normalized.includes("permission") ||
    normalized.includes("garde fou") ||
    normalized.includes("garde-fou");
  const mentionsSensitiveAction =
    normalized.includes("modifier") ||
    normalized.includes("faire") ||
    normalized.includes("creer") ||
    normalized.includes("supprimer") ||
    normalized.includes("publier") ||
    normalized.includes("tokens") ||
    normalized.includes("oauth") ||
    normalized.includes("changer") ||
    normalized.includes("declencher");
  const asksConcreteChange =
    normalized.includes("mets a jour") ||
    normalized.includes("mettre a jour") ||
    normalized.includes("marque") ||
    normalized.includes("change la") ||
    normalized.includes("ajoute") ||
    normalized.includes("supprime") ||
    normalized.includes("reporter") ||
    normalized.includes("termine cette") ||
    normalized.includes("termine la");

  if (asksCapability && (mentionsSensitiveAction || normalized.includes("limite")) && !asksConcreteChange) {
    return "capacites";
  }

  if (
    normalized.includes("je veux") ||
    normalized.includes("objectif") ||
    normalized.includes("fixe-moi") ||
    normalized.includes("cree-moi") ||
    normalized.includes("creer un projet") ||
    normalized.includes("cree un projet") ||
    normalized.includes("ajoute un objectif") ||
    normalized.includes("avant le") ||
    normalized.includes("avant fin")
  ) {
    return "creation";
  }

  if (
    normalized.includes("mets a jour") ||
    normalized.includes("mettre a jour") ||
    normalized.includes("modifie") ||
    normalized.includes("modifier") ||
    normalized.includes("marque") ||
    normalized.includes("termine") ||
    normalized.includes("terminee") ||
    normalized.includes("terminer") ||
    normalized.includes("reporter") ||
    normalized.includes("reporte") ||
    normalized.includes("ajoute une action") ||
    normalized.includes("supprime") ||
    normalized.includes("supprimer") ||
    normalized.includes("change la deadline") ||
    normalized.includes("change l echeance") ||
    normalized.includes("progression") ||
    normalized.includes("est valide") ||
    normalized.includes("est validee") ||
    normalized.includes("reste en sandbox")
  ) {
    return "modification";
  }

  if (
    normalized.includes("pourquoi") ||
    normalized.includes("explique") ||
    normalized.includes("raison") ||
    normalized.includes("justifie")
  ) {
    return "explication";
  }

  if (
    normalized.includes("quelle est ma priorite") ||
    normalized.includes("ma priorite") ||
    normalized.includes("que dois je faire") ||
    normalized.includes("sur quoi dois je travailler") ||
    normalized.includes("ou dois je avancer") ||
    normalized.includes("que me conseilles tu") ||
    normalized.includes("priorite aujourd") ||
    normalized.includes("travailler aujourd")
  ) {
    return "priorite";
  }

  if (
    normalized.includes("ou en est") ||
    normalized.includes("etat") ||
    normalized.includes("avancement") ||
    normalized.includes("statut")
  ) {
    return "etat";
  }

  return "general";
}

function confidenceFromSources(sourceUsage: AssistantSourceUsage) {
  const score =
    45 +
    (sourceUsage.trajectoire ? 25 : 0) +
    (sourceUsage.memory ? 15 : 0) +
    (sourceUsage.cockpit ? 10 : 0) +
    (sourceUsage.observatory ? 5 : 0);

  return `${Math.min(95, score)}%`;
}

function splitSourcesFromAnswer(text: string): OperationalAnswer {
  const marker = "\nSource utilisee :";
  const index = text.indexOf(marker);

  if (index === -1) {
    return { answer: text, sources: "" };
  }

  return {
    answer: text.slice(0, index).trim(),
    sources: text.slice(index + 1).trim(),
  };
}

function buildCopilotSummary({
  action,
  blockers,
  confidence,
  currentState,
  nextStep,
  priority,
}: {
  action: string;
  blockers: string[];
  confidence: string;
  currentState: string;
  nextStep: string;
  priority: string;
}) {
  return [
    "Etat actuel :",
    currentState,
    "",
    "Priorite :",
    priority,
    "",
    "Blocages :",
    blockers.length ? blockers.join(" ; ") : "Aucun blocage critique detecte.",
    "",
    "Action recommandee :",
    action,
    "",
    "Prochaine etape :",
    nextStep,
    "",
    "Confiance :",
    confidence,
  ].join("\n");
}

function toIntentionalAnswer(
  answer: string,
  options: {
    intent: AssistantIntent;
    subject: AssistantSubject;
    memoryCount: number;
    project: TrajectoireProject | null;
    objective: TrajectoireObjective | null;
    sourceUsage?: AssistantSourceUsage;
    extra?: string[];
  },
): IntentionalOperationalAnswer {
  const sources = [
    formatContextUsed({
      subject: options.subject,
      memoryCount: options.memoryCount,
      project: options.project,
      objective: options.objective,
      sourceUsage: options.sourceUsage,
    }),
    "",
    "Intention detectee :",
    `- ${options.intent}`,
    ...(options.extra?.length ? ["", "Elements d'analyse :", ...options.extra.map((item) => `- ${item}`)] : []),
  ].join("\n");

  return { answer, sources };
}

function formatShortList(items: string[], fallback: string) {
  return items.length ? items.slice(0, 4).map((item) => `- ${item}`).join("\n") : fallback;
}

function buildCapabilitiesAnswer(
  context: ProjectContext,
): IntentionalOperationalAnswer {
  return {
    answer: [
      "Ce que je peux lire :",
      "- Memoire projet",
      "- Trajectoire",
      "- etat cockpit",
      "- brouillons / modules selon acces",
      "",
      "Ce que je peux proposer :",
      "- mise a jour memoire",
      "- creation ou mise a jour d'objectif Trajectoire",
      "- prochaine action",
      "- plan POPAM",
      "",
      "Ce que je peux modifier apres confirmation :",
      "- project_memory",
      "- projets Trajectoire",
      "- objectifs",
      "- actions",
      "- statuts",
      "",
      "Ce qui reste interdit :",
      "- supprimer un projet sans demande explicite",
      "- publier du contenu",
      "- modifier des tokens",
      "- changer une deadline sensible sans confirmation",
      "- declencher une action OAuth",
      "- lancer une publication automatique",
    ].join("\n"),
    sources: [
      "Source utilisee :",
      "- Regles de securite Assistant : oui",
      "- Garde-fous cockpit : oui",
      "",
      "Contexte utilise :",
      `- Garde-fous : ${context.guardrails.length} regle(s)`,
      "- Intention detectee : capacites",
    ].join("\n"),
  };
}

function buildPriorityIntentAnswer(input: GlobalAssistantInput) {
  const priority = getGlobalPriority(input);
  const subject = detectSubject(input.message);
  const project = findSubjectProject(subject, input.trajectoire);
  const objective = project ? selectObjective(project, subject) : null;
  const evidence = collectSubjectEvidence(input.context, subject);
  const popamContext = objective && project
    ? [
        `Projet: ${project.title}`,
        `Objectif: ${objective.title}`,
        `Plan d'action: ${subjectDefaultPlan(subject, objective.title).join(" ; ")}`,
        `Actions: ${objective.actions.map((action) => `${action.title} (${action.status})`).join(" ; ") || "non renseignees"}`,
        `Moyens: ${subjectMeans(subject).join(" ; ")}`,
      ]
    : [
        `Projet: ${subject}`,
        `Objectif: ${priority.priority}`,
        `Plan d'action: ${input.context.actionablePriorities.slice(0, 3).map((item) => item.action).join(" ; ") || priority.action}`,
        `Moyens: ${subjectMeans(subject).join(" ; ")}`,
      ];
  const answer = [
    "Objectif principal :",
    priority.priority,
    "",
    "Pourquoi :",
    priority.blocker
      ? `Un blocage reel est visible: ${priority.blocker}`
      : priority.currentState,
    "",
    "Action recommandee :",
    priority.action,
    "",
    "Impact attendu :",
    "Avancer le chantier le plus proche d'une echeance ou d'un resultat verifiable, sans ouvrir d'action sensible.",
  ].join("\n");

  return toIntentionalAnswer(answer, {
    intent: "priorite",
    subject,
    memoryCount: input.context.projectMemoryEntries.length,
    project,
    objective,
    sourceUsage: {
      trajectoire: priority.sourceUsage.trajectoire || Boolean(project),
      memory: priority.sourceUsage.memory || evidence.sourceUsage.memory,
      cockpit: priority.sourceUsage.cockpit || evidence.sourceUsage.cockpit,
      observatory: priority.sourceUsage.observatory || evidence.sourceUsage.observatory,
    },
    extra: popamContext,
  });
}

function buildStateIntentAnswer(input: GlobalAssistantInput) {
  const subject = detectSubject(input.message);
  const project = findSubjectProject(subject, input.trajectoire);
  const objective = project ? selectObjective(project, subject) : null;
  const evidence = collectSubjectEvidence(input.context, subject);

  if (project && objective) {
    const retainedProgress = retainedObjectiveProgress(objective);
    const nextAction =
      objective.actions.find((action) => action.status === "en cours") ??
      objective.actions.find((action) => action.status === "a faire") ??
      null;
    const answer = [
      "Etat actuel :",
      `${project.title} / ${objective.title} est a ${retainedProgress}% retenu.`,
      "",
      "Priorite :",
      objective.title,
      "",
      "Blocages :",
      objective.status === "bloque"
        ? `Objectif bloque: ${objective.title}`
        : "Aucun blocage critique detecte.",
      "",
      "Prochaine etape :",
      nextAction?.title ?? "Definir la prochaine action dans Trajectoire.",
    ].join("\n");

    return toIntentionalAnswer(answer, {
      intent: "etat",
      subject,
      memoryCount: input.context.projectMemoryEntries.length,
      project,
      objective,
      sourceUsage: { ...evidence.sourceUsage, trajectoire: true },
      extra: [
        `Progression manuelle: ${objective.progress}%`,
        `Progression calculee: ${calculatedObjectiveProgress(objective) ?? "non disponible"}`,
        `Actions: ${objective.actions.map((action) => `${action.title} (${action.status})`).join(" ; ") || "aucune"}`,
      ],
    });
  }

  if (hasSubjectEvidence(evidence)) {
    const blockers = evidence.blockers.length
      ? evidence.blockers
      : evidence.observatory
          .filter((item) => ["Bloque", "A securiser", "Non connecte", "Review"].includes(item.status))
          .map((item) => `${item.name}: ${item.summary}`);
    const nextAction = nextActionFromEvidence(input.context, evidence);
    const answer = [
      "Etat actuel :",
      evidence.platforms[0]?.summary ??
        evidence.memory[0]?.value ??
        evidence.memory[0]?.status ??
        (subject === "Shorts"
          ? `${evidence.drafts.total} brouillon(s), ${evidence.drafts.inProgress.length} en cours.`
          : `${subject} suivi via cockpit, memoire ou observatoire.`),
      "",
      "Priorite :",
      subject === "Connexions"
        ? "Stabiliser les connexions utiles sans action OAuth automatique."
        : `Clarifier l'etat ${subject} et choisir une seule action faisable.`,
      "",
      "Blocages :",
      blockers.length ? blockers.join(" ; ") : "Aucun blocage critique detecte.",
      "",
      "Prochaine etape :",
      nextAction ?? "Ouvrir le module concerne et valider le statut exact.",
    ].join("\n");

    return toIntentionalAnswer(answer, {
      intent: "etat",
      subject,
      memoryCount: evidence.memory.length,
      project: null,
      objective: null,
      sourceUsage: evidence.sourceUsage,
      extra: [
        `Memoire: ${evidence.memory.map((entry) => `${entry.title}: ${entry.value ?? entry.status ?? "renseigne"}`).join(" ; ") || "aucune"}`,
        `OAuth: ${evidence.oauth.map(formatOAuthLine).join(" ; ") || "aucun"}`,
        `Observatoire: ${evidence.observatory.map((item) => `${item.name}: ${item.status}`).join(" ; ") || "aucun"}`,
      ],
    });
  }

  const missing = splitSourcesFromAnswer(missingContextAnswer(subject, input.context));
  return { answer: missing.answer, sources: missing.sources };
}

function buildModificationIntentAnswer(input: GlobalAssistantInput) {
  const subject = detectSubject(input.message);
  const project = findSubjectProject(subject, input.trajectoire);
  const objective = project ? selectObjective(project, subject) : null;
  const evidence = collectSubjectEvidence(input.context, subject);
  const targetProject = project?.title ?? (subject === "General" ? "A confirmer" : subject);
  const targetObjective = objective?.title ?? "A confirmer";
  const modification = inferModificationLabel(input.message, subject);
  const impact = objective
    ? "La modification sera appliquee seulement apres confirmation, puis la progression sera recalculee depuis les actions si possible."
    : "Je dois d'abord confirmer l'element exact a modifier pour eviter un doublon ou une mauvaise cible.";
  const answer = [
    "Modification detectee",
    "",
    "Projet :",
    targetProject,
    "",
    "Objectif :",
    targetObjective,
    "",
    "Modification proposee :",
    modification,
    "",
    "Impact :",
    impact,
    "",
    "Confirmer ?",
    "J'afficherai une carte de confirmation si une mise a jour memoire ou Trajectoire peut etre rattachee avec assez de confiance.",
  ].join("\n");

  return toIntentionalAnswer(answer, {
    intent: "modification",
    subject,
    memoryCount: evidence.memory.length,
    project,
    objective,
    sourceUsage: { ...evidence.sourceUsage, trajectoire: Boolean(project) },
    extra: [
      `Demande utilisateur: ${input.message}`,
      "Garde-fou: aucune ecriture sans confirmation explicite.",
    ],
  });
}

function inferModificationLabel(message: string, subject: AssistantSubject) {
  const normalized = normalizeMessage(message).replace(/[^a-z0-9]+/g, " ").trim();

  if (normalized.includes("deadline") || normalized.includes("echeance")) {
    return "Changer une deadline apres confirmation.";
  }

  if (normalized.includes("progression")) {
    return "Mettre a jour la progression apres confirmation.";
  }

  if (normalized.includes("report")) {
    return "Reporter le statut concerne apres confirmation.";
  }

  if (normalized.includes("termine") || normalized.includes("fait") || normalized.includes("prete") || normalized.includes("pret")) {
    return "Marquer l'action ou le module concerne comme termine / fait apres confirmation.";
  }

  if (normalized.includes("ajoute")) {
    return "Ajouter l'element demande apres confirmation.";
  }

  if (normalized.includes("supprime")) {
    return "Suppression demandee: confirmation stricte requise, aucune suppression automatique.";
  }

  return `Modifier ${subject} apres confirmation.`;
}

function buildCreationIntentAnswer(input: GlobalAssistantInput) {
  const subject = detectSubject(input.message);
  const proposal = detectTrajectoryObjectiveProposal(input.message, input.context);
  const project = findSubjectProject(subject, input.trajectoire);
  const objective = project ? selectObjective(project, subject) : null;
  const evidence = collectSubjectEvidence(input.context, subject);

  if (!proposal) {
    const missing = splitSourcesFromAnswer(missingContextAnswer(subject, input.context));
    return { answer: missing.answer, sources: missing.sources };
  }

  const answer = [
    "Projet propose :",
    proposal.project,
    "",
    "Objectif :",
    proposal.objective,
    "",
    "Date :",
    proposal.deadline ?? "A confirmer",
    "",
    "Plan d'action :",
    formatShortList(proposal.planAction, "- A definir"),
    "",
    "Actions :",
    formatShortList(proposal.actions, "- A definir"),
    "",
    "Moyens :",
    formatShortList(proposal.means, "- A confirmer"),
    "",
    "Confirmer ?",
    "Aucune creation Trajectoire ne sera faite sans validation.",
  ].join("\n");

  return toIntentionalAnswer(answer, {
    intent: "creation",
    subject,
    memoryCount: evidence.memory.length,
    project,
    objective,
    sourceUsage: { ...evidence.sourceUsage, trajectoire: Boolean(project) },
    extra: [
      `Mode proposition: ${proposal.mode ?? "create"}`,
      `Confiance: ${Math.round(proposal.confidence * 100)}%`,
      ...(proposal.memoryContext ?? []),
    ],
  });
}

function buildExplanationIntentAnswer(input: GlobalAssistantInput) {
  const subject = detectSubject(input.message);
  const project = findSubjectProject(subject, input.trajectoire);
  const objective = project ? selectObjective(project, subject) : null;
  const evidence = collectSubjectEvidence(input.context, subject);
  const priority = getGlobalPriority(input);
  const contextLine = project && objective
    ? `${project.title} / ${objective.title}`
    : hasSubjectEvidence(evidence)
      ? `${subject} est documente dans les sources cockpit ou memoire.`
      : priority.currentState;
  const reasoning = priority.blocker
    ? `La priorite remonte car un blocage est visible: ${priority.blocker}`
    : "La priorite remonte d'abord depuis les objectifs actifs avec echeance, puis les blocages critiques, puis les actions disponibles.";
  const answer = [
    "Contexte :",
    contextLine,
    "",
    "Analyse :",
    reasoning,
    "",
    "Raisonnement :",
    "Je compare Trajectoire, memoire projet, cockpit et observatoire, puis je retiens ce qui est actionnable maintenant sans action sensible.",
    "",
    "Conclusion :",
    priority.action,
  ].join("\n");

  return toIntentionalAnswer(answer, {
    intent: "explication",
    subject,
    memoryCount: evidence.memory.length,
    project,
    objective,
    sourceUsage: {
      trajectoire: Boolean(project) || priority.sourceUsage.trajectoire,
      memory: evidence.sourceUsage.memory || priority.sourceUsage.memory,
      cockpit: evidence.sourceUsage.cockpit || priority.sourceUsage.cockpit,
      observatory: evidence.sourceUsage.observatory || priority.sourceUsage.observatory,
    },
    extra: [
      `Ordre de priorisation: objectif avec echeance, blocage critique, action disponible.`,
      `Action retenue: ${priority.action}`,
    ],
  });
}

function detectSubject(message: string): AssistantSubject {
  const normalized = normalizeMessage(message);

  if (normalized.includes("short") || normalized.includes("visuel")) {
    return "Shorts";
  }

  if (normalized.includes("pinterest")) {
    return "Pinterest";
  }

  if (normalized.includes("tiktok")) {
    return "TikTok";
  }

  if (normalized.includes("assistant") || normalized.includes("memoire")) {
    return "Assistant";
  }

  if (normalized.includes("trajectoire") || normalized.includes("popam")) {
    return "Trajectoire";
  }

  if (
    normalized.includes("connexion") ||
    normalized.includes("oauth") ||
    normalized.includes("meta") ||
    normalized.includes("instagram") ||
    normalized.includes("youtube")
  ) {
    return "Connexions";
  }

  if (
    normalized.includes("sport") ||
    normalized.includes("sante") ||
    normalized.includes("routine") ||
    normalized.includes("personnel") ||
    normalized.includes("ecriture") ||
    normalized.includes("alternance")
  ) {
    return "Personnel";
  }

  return "General";
}

function subjectTerms(subject: AssistantSubject) {
  const terms: Record<AssistantSubject, string[]> = {
    Shorts: ["short", "atelier", "visuel", "voix", "pipeline", "contenu", "draft", "brouillon"],
    Pinterest: ["pinterest", "publisher", "pin", "tableau", "oauth"],
    TikTok: ["tiktok", "sandbox", "production"],
    Assistant: ["assistant", "memoire", "project memory", "popam"],
    Trajectoire: ["trajectoire", "objectif", "action", "popam"],
    Connexions: ["connexion", "connexions", "oauth", "youtube", "meta", "instagram", "facebook", "tiktok", "pinterest"],
    Personnel: ["personnel", "sport", "sante", "ecriture", "routine", "alternance"],
    General: [],
  };

  return terms[subject];
}

function textForProject(project: TrajectoireProject) {
  return normalizeMessage(
    [
      project.title,
      project.description,
      project.category,
      ...project.objectives.flatMap((objective) => [
        objective.title,
        objective.description,
        ...objective.actions.map((action) => action.title),
      ]),
    ].join(" "),
  );
}

function findSubjectProject(
  subject: AssistantSubject,
  trajectoire?: { projects: TrajectoireProject[] },
) {
  const projects = trajectoire?.projects ?? [];
  const terms = subjectTerms(subject);

  if (!projects.length || !terms.length) {
    return null;
  }

  return (
    projects.find((project) => {
      const text = textForProject(project);
      return terms.some((term) => text.includes(normalizeMessage(term)));
    }) ?? null
  );
}

function scoreObjectiveForSubject(
  objective: TrajectoireObjective,
  subject: AssistantSubject,
) {
  const terms = subjectTerms(subject);
  const text = normalizeMessage(
    [
      objective.title,
      objective.description,
      ...objective.actions.map((action) => action.title),
    ].join(" "),
  );

  return terms.filter((term) => text.includes(normalizeMessage(term))).length;
}

function selectObjective(
  project: TrajectoireProject,
  subject: AssistantSubject,
) {
  if (!project.objectives.length) {
    return null;
  }

  return [...project.objectives].sort((left, right) => {
    const rightScore = scoreObjectiveForSubject(right, subject);
    const leftScore = scoreObjectiveForSubject(left, subject);

    if (rightScore !== leftScore) {
      return rightScore - leftScore;
    }

    return right.updatedAt.localeCompare(left.updatedAt);
  })[0];
}

function calculatedObjectiveProgress(objective: TrajectoireObjective) {
  if (!objective.actions.length) {
    return null;
  }

  const done = objective.actions.filter((action) => action.status === "fait").length;
  return Math.round((done / objective.actions.length) * 100);
}

function retainedObjectiveProgress(objective: TrajectoireObjective) {
  return calculatedObjectiveProgress(objective) ?? objective.progress;
}

function extractDescriptionSection(description: string, label: string) {
  const lines = description.split("\n");
  const normalizedLabel = normalizeMessage(label).replace(/:$/, "");
  const start = lines.findIndex((line) =>
    normalizeMessage(line).replace(/:$/, "") === normalizedLabel,
  );

  if (start === -1) {
    return [];
  }

  const items: string[] = [];

  for (const line of lines.slice(start + 1)) {
    const trimmed = line.trim();
    const normalized = normalizeMessage(trimmed).replace(/:$/, "");

    if (
      trimmed &&
      !trimmed.startsWith("-") &&
      ["projet", "objectif", "plan d'action", "actions", "moyens", "memoire projet prise en compte"].includes(normalized)
    ) {
      break;
    }

    if (trimmed.startsWith("-")) {
      items.push(trimmed.replace(/^-+\s*/, ""));
    }
  }

  return items;
}

function subjectDefaultPlan(subject: AssistantSubject, objectiveTitle: string) {
  if (subject === "Shorts") {
    return [
      "Finaliser brouillons",
      "Finaliser visuels",
      "Brancher generation visuelle",
      "Preparer voix",
      "Tester un cycle complet",
    ];
  }

  if (subject === "Pinterest") {
    return [
      "Verifier l'environnement actif",
      "Controler les comptes et tableaux",
      "Tester une publication sans automatisme",
      "Documenter les points reportes",
    ];
  }

  if (subject === "Assistant") {
    return [
      "Lire project_memory",
      "Lire Trajectoire",
      "Construire une reponse POPAM",
      "Proposer les ecritures avec confirmation",
    ];
  }

  return objectiveTitle
    ? ["Clarifier le perimetre", "Lister les actions", "Valider la prochaine etape"]
    : [];
}

function subjectMeans(subject: AssistantSubject, existingMeans: string[] = []) {
  const defaults: Record<AssistantSubject, string[]> = {
    Shorts: ["L'Edifice", "Atelier de contenu", "Supabase", "OpenAI", "bibliotheque visuelle"],
    Pinterest: ["Pinterest Publisher", "OAuth Pinterest", "Supabase", "API Pinterest", "tableaux"],
    TikTok: ["TikTok Sandbox", "OAuth TikTok", "Supabase", "Observatoire"],
    Assistant: ["project_memory", "Trajectoire", "Supabase", "POPAM"],
    Trajectoire: ["Trajectoire", "Supabase", "POPAM", "Assistant Edifice"],
    Connexions: ["OAuth", "Supabase", "Observatoire", "Connexions cockpit"],
    Personnel: ["Espace interieur", "Trajectoire", "routine", "sante"],
    General: ["L'Edifice", "Observatoire", "Trajectoire"],
  };

  return Array.from(new Set([...existingMeans, ...defaults[subject]])).slice(0, 8);
}

function formatContextUsed(options: {
  subject: AssistantSubject;
  memoryCount: number;
  project: TrajectoireProject | null;
  objective: TrajectoireObjective | null;
  sourceUsage?: AssistantSourceUsage;
}) {
  const sourceUsage = options.sourceUsage ?? {
    trajectoire: Boolean(options.project),
    memory: options.memoryCount > 0,
    cockpit: false,
    observatory: false,
  };

  return [
    "Source utilisee :",
    `- Trajectoire : ${sourceUsage.trajectoire ? "oui" : "non"}`,
    `- Memoire Projet : ${sourceUsage.memory ? "oui" : "non"}`,
    `- Cockpit : ${sourceUsage.cockpit ? "oui" : "non"}`,
    `- Observatoire : ${sourceUsage.observatory ? "oui" : "non"}`,
    "",
    "Contexte utilise :",
    `- Memoire projet : ${options.memoryCount} entree(s)`,
    `- Trajectoire : ${options.project ? "projet trouve" : "aucun projet correspondant"}`,
    `- Module detecte : ${options.subject}`,
    `- Projet detecte : ${options.project?.title ?? "non detecte"}`,
    `- Objectif detecte : ${options.objective?.title ?? "non detecte"}`,
  ].join("\n");
}

function textIncludesSubject(text: string, subject: AssistantSubject) {
  const normalized = normalizeMessage(text);
  const terms = subjectTerms(subject);

  if (subject === "General") {
    return false;
  }

  return terms.some((term) => normalized.includes(normalizeMessage(term)));
}

function collectSubjectEvidence(
  context: ProjectContext,
  subject: AssistantSubject,
): SubjectEvidence {
  const memory = context.projectMemoryEntries.filter((entry) =>
    textIncludesSubject(
      `${entry.key ?? ""} ${entry.title} ${entry.value ?? ""} ${entry.content ?? ""} ${entry.status ?? ""} ${entry.nextAction ?? ""}`,
      subject,
    ),
  );
  const oauth = context.cockpitState.oauthStatuses.filter((status) =>
    subject === "Connexions" ||
    textIncludesSubject(`${status.provider} ${status.warnings.join(" ")}`, subject),
  );
  const platforms = context.cockpitState.platformStatuses.filter((platform) =>
    subject === "Connexions" ||
    textIncludesSubject(
      `${platform.key} ${platform.name} ${platform.label} ${platform.summary} ${platform.details.join(" ")}`,
      subject,
    ),
  );
  const modules = context.cockpitState.modules.available.filter((module) =>
    textIncludesSubject(`${module.title} ${module.description} ${module.status}`, subject),
  );
  const migratingModules = context.cockpitState.modules.migrating.filter((module) =>
    textIncludesSubject(`${module.title} ${module.description} ${module.status}`, subject),
  );
  const observatory = context.observatoryItems.filter((item) =>
    subject === "Connexions"
      ? item.area === "OAuth" || textIncludesSubject(`${item.name} ${item.summary} ${item.nextAction}`, subject)
      : textIncludesSubject(
          `${item.name} ${item.summary} ${item.nextAction} ${item.detail ?? ""} ${item.externalReviewNote ?? ""}`,
          subject,
        ),
  );
  const dependencies = context.cockpitState.dependencies.filter((dependency) =>
    textIncludesSubject(`${dependency.name} ${dependency.status} ${dependency.note}`, subject),
  );
  const blockers = context.cockpitState.blockers.filter((blocker) =>
    textIncludesSubject(blocker, subject),
  );
  const hasDraftContext =
    subject === "Shorts" && context.cockpitState.contentDrafts.total > 0;
  const cockpit =
    oauth.length > 0 ||
    platforms.length > 0 ||
    modules.length > 0 ||
    migratingModules.length > 0 ||
    dependencies.length > 0 ||
    blockers.length > 0 ||
    hasDraftContext;

  return {
    memory,
    oauth,
    platforms,
    modules,
    migratingModules,
    observatory,
    dependencies,
    blockers,
    drafts: context.cockpitState.contentDrafts,
    sourceUsage: {
      trajectoire: false,
      memory: memory.length > 0,
      cockpit,
      observatory: observatory.length > 0,
    },
  };
}

function missingContextAnswer(subject: AssistantSubject, context: ProjectContext) {
  const missing = [
    "un projet Trajectoire rattache au sujet",
    "un objectif actif avec plan d'action",
    "des actions avec statut a faire / en cours / fait",
  ];

  if (!context.projectMemoryEntries.length) {
    missing.push("des entrees project_memory recentes");
  }

  return [
    "Donnees insuffisantes pour repondre precisement.",
    "",
    "Infos manquantes :",
    ...missing.map((item) => `- ${item}`),
    "",
    formatContextUsed({
      subject,
      memoryCount: context.projectMemoryEntries.length,
      project: null,
      objective: null,
    }),
  ].join("\n");
}

function hasSubjectEvidence(evidence: SubjectEvidence) {
  return (
    evidence.memory.length > 0 ||
    evidence.oauth.length > 0 ||
    evidence.platforms.length > 0 ||
    evidence.modules.length > 0 ||
    evidence.migratingModules.length > 0 ||
    evidence.observatory.length > 0 ||
    evidence.dependencies.length > 0 ||
    evidence.blockers.length > 0 ||
    (evidence.sourceUsage.cockpit && evidence.drafts.total > 0)
  );
}

function formatYesNo(value: boolean) {
  return value ? "oui" : "non";
}

function formatOAuthLine(status: SubjectEvidence["oauth"][number]) {
  return `${status.provider}: configure=${formatYesNo(status.configured)}, token=${formatYesNo(status.tokenPresent)}${
    status.warnings.length ? `, alertes=${status.warnings.join(" ; ")}` : ""
  }`;
}

function nextActionFromEvidence(
  context: ProjectContext,
  evidence: SubjectEvidence,
) {
  return (
    evidence.memory.find((entry) => entry.nextAction)?.nextAction ??
    evidence.observatory.find((item) => item.nextAction)?.nextAction ??
    evidence.dependencies[0]?.note ??
    evidence.platforms[0]?.summary ??
    context.nextPriorityAction
  );
}

function daysUntilDate(value: string | null) {
  if (!value) {
    return null;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(`${value}T00:00:00`);

  if (Number.isNaN(target.getTime())) {
    return null;
  }

  return Math.ceil((target.getTime() - today.getTime()) / 86_400_000);
}

function getGlobalPriority(input: GlobalAssistantInput) {
  const activeObjectives = (input.trajectoire?.projects ?? [])
    .flatMap((project) =>
      project.objectives.map((objective) => ({ objective, project })),
    )
    .filter(({ objective }) =>
      ["non commence", "en cours", "bloque"].includes(objective.status),
    );
  const datedObjective = activeObjectives
    .filter(({ objective }) => objective.deadline)
    .sort((left, right) => {
      const leftDays = daysUntilDate(left.objective.deadline) ?? 9999;
      const rightDays = daysUntilDate(right.objective.deadline) ?? 9999;
      return leftDays - rightDays;
    })[0];

  if (datedObjective) {
    const action =
      datedObjective.objective.actions.find((item) => item.status === "en cours") ??
      datedObjective.objective.actions.find((item) => item.status === "a faire") ??
      null;

    return {
      action: action?.title ?? `Avancer l'objectif: ${datedObjective.objective.title}`,
      blocker:
        datedObjective.objective.status === "bloque"
          ? `Pipeline non valide ou objectif bloque: ${datedObjective.objective.title}`
          : null,
      confidence: "90%",
      currentState: `${datedObjective.project.title} / ${datedObjective.objective.title}, echeance ${datedObjective.objective.deadline}.`,
      priority: datedObjective.objective.title,
      sourceUsage: {
        trajectoire: true,
        memory: input.context.projectMemoryEntries.length > 0,
        cockpit: false,
        observatory: false,
      },
    };
  }

  const blocker =
    input.context.cockpitState.blockers[0] ??
    input.context.blockedModules[0]?.summary ??
    null;

  if (blocker) {
    return {
      action: input.context.nextPriorityAction,
      blocker,
      confidence: "80%",
      currentState: "Blocage critique detecte dans le cockpit.",
      priority: "Lever le blocage critique.",
      sourceUsage: {
        trajectoire: false,
        memory: input.context.projectMemoryEntries.length > 0,
        cockpit: true,
        observatory: input.context.blockedModules.length > 0,
      },
    };
  }

  return {
    action: input.context.nextPriorityAction,
    blocker: null,
    confidence: "70%",
    currentState: input.context.projectSummary,
    priority: "Executer la prochaine action disponible.",
    sourceUsage: {
      trajectoire: false,
      memory: input.context.projectMemoryEntries.length > 0,
      cockpit: true,
      observatory: input.context.observatoryItems.length > 0,
    },
  };
}

function twoDigits(value: number) {
  return String(value).padStart(2, "0");
}

function extractUserDate(message: string) {
  const normalized = normalizeMessage(message);
  const isoMatch = normalized.match(/\b(20\d{2})-(\d{1,2})-(\d{1,2})\b/);

  if (isoMatch) {
    return `${isoMatch[1]}-${twoDigits(Number(isoMatch[2]))}-${twoDigits(Number(isoMatch[3]))}`;
  }

  const slashMatch = normalized.match(/\b(\d{1,2})[/-](\d{1,2})(?:[/-](20\d{2}))?\b/);

  if (slashMatch) {
    const year = slashMatch[3] ?? String(new Date().getFullYear());
    return `${year}-${twoDigits(Number(slashMatch[2]))}-${twoDigits(Number(slashMatch[1]))}`;
  }

  const months: Record<string, number> = {
    janvier: 1,
    fevrier: 2,
    mars: 3,
    avril: 4,
    mai: 5,
    juin: 6,
    juillet: 7,
    aout: 8,
    septembre: 9,
    octobre: 10,
    novembre: 11,
    decembre: 12,
  };
  const monthPattern = Object.keys(months).join("|");
  const frenchMatch = normalized.match(
    new RegExp(`\\b(\\d{1,2})\\s+(${monthPattern})(?:\\s+(20\\d{2}))?\\b`),
  );

  if (!frenchMatch) {
    return null;
  }

  const year = frenchMatch[3] ?? String(new Date().getFullYear());
  return `${year}-${twoDigits(months[frenchMatch[2]])}-${twoDigits(Number(frenchMatch[1]))}`;
}

function inferDefaultDeadline(normalizedMessage: string) {
  if (normalizedMessage.includes("juillet")) {
    return `${new Date().getFullYear()}-07-31`;
  }

  if (normalizedMessage.includes("fin juin")) {
    return `${new Date().getFullYear()}-06-30`;
  }

  return null;
}

function buildSubjectEvidenceAnswer({
  context,
  evidence,
  subject,
}: {
  context: ProjectContext;
  evidence: SubjectEvidence;
  subject: AssistantSubject;
}) {
  const platformLines = evidence.platforms.length
    ? evidence.platforms.map((platform) =>
        `${platform.name}: ${platform.label} (${platform.status}). ${platform.summary}${
          platform.details.length ? ` Details: ${platform.details.join(" ; ")}` : ""
        }`,
      )
    : ["Aucun statut plateforme dedie visible."];
  const oauthLines = evidence.oauth.length
    ? evidence.oauth.map(formatOAuthLine)
    : ["Aucun statut OAuth dedie visible."];
  const moduleLines = [...evidence.modules, ...evidence.migratingModules].length
    ? [...evidence.modules, ...evidence.migratingModules].map(
        (module) => `${module.title}: ${module.status}. ${module.description}`,
      )
    : ["Aucun module cockpit dedie visible."];
  const memoryLines = evidence.memory.length
    ? evidence.memory
        .slice(0, 5)
        .map((entry) => `${entry.title}: ${entry.value ?? entry.status ?? entry.content ?? "renseigne"}`)
    : ["Aucune entree memoire dediee."];
  const observatoryLines = evidence.observatory.length
    ? evidence.observatory
        .slice(0, 5)
        .map((item) => `${item.name}: ${item.status}. ${item.summary} Prochaine action: ${item.nextAction}`)
    : ["Aucun item Observatoire dedie."];
  const dependencyLines = evidence.dependencies.length
    ? evidence.dependencies.map((dependency) => `${dependency.name}: ${dependency.status}. ${dependency.note}`)
    : [];
  const blockers = evidence.blockers.length
    ? evidence.blockers
    : evidence.observatory
        .filter((item) => ["Bloque", "A securiser", "Non connecte", "Review"].includes(item.status))
        .map((item) => `${item.name}: ${item.summary}`);
  const nextAction = nextActionFromEvidence(context, evidence);
  const shortsLines =
    subject === "Shorts"
      ? [
          `Brouillons: ${evidence.drafts.total}`,
          `Prets a publier: ${evidence.drafts.readyToPublish.length}`,
          `En cours: ${evidence.drafts.inProgress.length}`,
        ]
      : [];

  const summary = buildCopilotSummary({
    currentState:
      evidence.platforms[0]?.summary ??
      evidence.memory[0]?.value ??
      evidence.memory[0]?.status ??
      (subject === "Shorts"
        ? `${evidence.drafts.total} brouillon(s), ${evidence.drafts.inProgress.length} en cours.`
        : `${subject} suivi via cockpit et observatoire.`),
    priority:
      subject === "Connexions"
        ? "Stabiliser les connexions utiles sans action OAuth automatique."
        : `Clarifier l'etat ${subject} et choisir une seule action faisable.`,
    blockers,
    action: nextAction ?? "Verifier les donnees du cockpit et de l'Observatoire.",
    nextStep: nextAction ?? "Ouvrir le module concerne et valider le statut exact.",
    confidence: confidenceFromSources(evidence.sourceUsage),
  });

  return [
    summary,
    "",
    `Details ${subject} :`,
    ...platformLines,
    ...shortsLines,
    "",
    "OAuth / acces :",
    ...oauthLines,
    "",
    subject === "Pinterest" || subject === "TikTok"
      ? "Sandbox / Production :"
      : "Memoire projet :",
    ...(subject === "Pinterest" || subject === "TikTok"
      ? [
          ...memoryLines,
          ...evidence.dependencies.map((dependency) => `${dependency.name}: ${dependency.status}. ${dependency.note}`),
        ]
      : memoryLines),
    "",
    subject === "Pinterest" ? "Publisher :" : "Modules cockpit :",
    ...moduleLines,
    "",
    "Observatoire :",
    ...observatoryLines,
    ...(dependencyLines.length ? ["", "Dependances :", ...dependencyLines] : []),
    "",
    "Blocages :",
    ...(blockers.length ? blockers : ["Aucun blocage critique detecte pour ce sujet."]),
    "",
    "Prochaine etape :",
    nextAction ?? "A definir.",
    "",
    formatContextUsed({
      subject,
      memoryCount: evidence.memory.length,
      project: null,
      objective: null,
      sourceUsage: evidence.sourceUsage,
    }),
  ].join("\n");
}

function buildGeneralContextAnswer(input: GlobalAssistantInput) {
  const project = input.trajectoire?.projects.find(
    (item) => item.status === "actif",
  ) ?? null;
  const objective = project
    ? project.objectives.find((item) => item.status !== "termine") ?? null
    : null;
  const priority = getGlobalPriority(input);

  if (!project && !input.context.projectMemoryEntries.length) {
    return missingContextAnswer("General", input.context);
  }

  return [
    buildCopilotSummary({
      currentState: priority.currentState,
      priority: priority.priority,
      blockers: priority.blocker ? [priority.blocker] : [],
      action: priority.action,
      nextStep: priority.action,
      confidence: priority.confidence,
    }),
    "",
    "Details :",
    input.context.projectSummary,
    "",
    formatContextUsed({
      subject: "General",
      memoryCount: input.context.projectMemoryEntries.length,
      project,
      objective,
      sourceUsage: priority.sourceUsage,
    }),
  ].join("\n");
}

function buildPopamAnswer({
  context,
  objective,
  project,
  sourceUsage,
  subject,
}: {
  context: ProjectContext;
  objective: TrajectoireObjective;
  project: TrajectoireProject;
  sourceUsage?: AssistantSourceUsage;
  subject: AssistantSubject;
}) {
  const manualProgress = objective.progress;
  const calculatedProgress = calculatedObjectiveProgress(objective);
  const retainedProgress = retainedObjectiveProgress(objective);
  const planFromDescription = extractDescriptionSection(
    objective.description || project.description,
    "Plan d'action",
  ).filter(
    (item) => normalizeMessage(item) !== normalizeMessage(objective.title),
  );
  const meansFromDescription = [
    ...extractDescriptionSection(objective.description, "Moyens"),
    ...extractDescriptionSection(project.description, "Moyens"),
  ];
  const plan = planFromDescription.length
    ? planFromDescription
    : subjectDefaultPlan(subject, objective.title);
  const nextAction =
    objective.actions.find((action) => action.status === "en cours") ??
    objective.actions.find((action) => action.status === "a faire") ??
    null;
  const effectiveSourceUsage = sourceUsage
    ? { ...sourceUsage, trajectoire: true }
    : {
        trajectoire: true,
        memory: context.projectMemoryEntries.length > 0,
        cockpit: false,
        observatory: false,
      };
  const summary = buildCopilotSummary({
    currentState: `${project.title} / ${objective.title} est a ${retainedProgress}% retenu.`,
    priority: objective.title,
    blockers:
      objective.status === "bloque"
        ? [`Objectif bloque: ${objective.title}`]
        : objective.actions.length && !nextAction
          ? ["Toutes les actions connues sont faites; definir le prochain jalon."]
          : [],
    action: nextAction?.title ?? "Definir la prochaine action dans Trajectoire.",
    nextStep: nextAction?.title ?? "Ajouter ou valider une action suivante.",
    confidence: confidenceFromSources(effectiveSourceUsage),
  });

  return [
    summary,
    "",
    "Projet :",
    project.title,
    "",
    "Objectif :",
    objective.title,
    "",
    "Plan d'action :",
    ...plan.map((item) => `- ${item}`),
    "",
    "Actions :",
    ...(objective.actions.length
      ? objective.actions.map((action) => `- ${action.title} (${action.status})`)
      : ["- Aucune action renseignee"]),
    "",
    "Moyens :",
    ...subjectMeans(subject, meansFromDescription).map((item) => `- ${item}`),
    "",
    "Progression :",
    `- Manuelle : ${manualProgress}%`,
    `- Calculee : ${calculatedProgress === null ? "non disponible" : `${calculatedProgress}%`}`,
    `- Retenue : ${retainedProgress}%`,
    "",
    "Prochaine action :",
    nextAction?.title ?? "A definir dans Trajectoire.",
    "",
    formatContextUsed({
      subject,
      memoryCount: context.projectMemoryEntries.length,
      project,
      objective,
      sourceUsage: effectiveSourceUsage,
    }),
  ].join("\n");
}

function buildContextualOperationalAnswer(
  input: GlobalAssistantInput,
): IntentionalOperationalAnswer {
  const intent = detectIntent(input.message);

  if (intent === "capacites") {
    return buildCapabilitiesAnswer(input.context);
  }

  if (intent === "creation") {
    return buildCreationIntentAnswer(input);
  }

  if (intent === "modification") {
    return buildModificationIntentAnswer(input);
  }

  if (intent === "priorite") {
    return buildPriorityIntentAnswer(input);
  }

  if (intent === "etat") {
    return buildStateIntentAnswer(input);
  }

  if (intent === "explication") {
    return buildExplanationIntentAnswer(input);
  }

  const subject = detectSubject(input.message);
  const project = findSubjectProject(subject, input.trajectoire);
  const objective = project ? selectObjective(project, subject) : null;
  const evidence = collectSubjectEvidence(input.context, subject);

  if (project && objective) {
    const answer = buildPopamAnswer({
      context: input.context,
      objective,
      project,
      sourceUsage: evidence.sourceUsage,
      subject,
    });
    return splitSourcesFromAnswer(answer);
  }

  if (hasSubjectEvidence(evidence)) {
    const answer = buildSubjectEvidenceAnswer({
      context: input.context,
      evidence,
      subject,
    });
    return splitSourcesFromAnswer(answer);
  }

  if (subject !== "General") {
    return splitSourcesFromAnswer(missingContextAnswer(subject, input.context));
  }

  return splitSourcesFromAnswer(buildGeneralContextAnswer(input));
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

function detectTrajectoryObjectiveProposal(
  message: string,
  context: ProjectContext,
): TrajectoryObjectiveProposal | null {
  const normalized = normalizeMessage(message);
  const asksObjective =
    normalized.includes("objectif") ||
    normalized.includes("fixe-moi") ||
    normalized.includes("cree-moi") ||
    normalized.includes("creer") ||
    normalized.includes("avant le") ||
    normalized.includes("avant fin") ||
    (
      normalized.includes("je veux") &&
      (
        normalized.includes("terminer") ||
        normalized.includes("finir") ||
        normalized.includes("rendre") ||
        normalized.includes("operationnel")
      )
    );

  if (!asksObjective) {
    return null;
  }

  const mentionsShorts = normalized.includes("short");
  const mentionsPinterest = normalized.includes("pinterest");
  const memoryContext = context.projectMemoryEntries
    .filter((entry) => {
      const text = normalizeMessage(
        `${entry.key ?? ""} ${entry.title} ${entry.value ?? ""} ${entry.status ?? ""}`,
      );

      return (
        (mentionsPinterest && text.includes("pinterest")) ||
        (mentionsShorts && (text.includes("short") || text.includes("visuel"))) ||
        (normalized.includes("tiktok") && text.includes("tiktok"))
      );
    })
    .slice(0, 4)
    .map((entry) =>
      `${entry.key ?? entry.title}: ${entry.value ?? entry.status ?? "non renseigne"}`,
    );
  const userDate = extractUserDate(message);
  const deadline = userDate ?? inferDefaultDeadline(normalized);

  if (mentionsShorts) {
    return {
      project: "Atelier Shorts",
      objective: "Terminer le pipeline Shorts",
      deadline,
      planAction: [
        "Finaliser Brouillons",
        "Finaliser Visuels",
        "Preparer Voix",
        "Preparer Montage",
      ],
      actions: [
        "Verifier le module Visuels",
        "Identifier les elements manquants",
        "Definir le prochain test complet",
      ],
      means: ["Supabase", "Atelier de contenu", "OpenAI"],
      initialProgress: 0,
      confidence: 0.82,
      mode: "create",
      rationale:
        "Demande explicite de creation d'objectif Trajectoire pour le pipeline Shorts.",
      memoryContext,
    };
  }

  if (mentionsPinterest) {
    return {
      project: "Pinterest Publisher",
      objective: "Finir Pinterest Publisher",
      deadline,
      planAction: [
        "Stabiliser les environnements Production et Sandbox",
        "Verifier les tableaux par compte",
        "Reporter Production si non prioritaire",
      ],
      actions: [
        "Tester le selecteur d'environnement",
        "Verifier les pins prets",
        "Documenter le statut Production",
      ],
      means: ["Supabase", "OAuth Pinterest", "Publisher Pinterest"],
      initialProgress: 0,
      confidence: 0.78,
      mode: "create",
      rationale:
        "Demande explicite autour de Pinterest; la memoire projet est utilisee pour eviter de traiter un report comme un blocage.",
      memoryContext,
    };
  }

  return {
    project: "Trajectoire",
    objective: message.slice(0, 120),
    deadline,
    planAction: ["Clarifier l'objectif", "Definir les actions", "Fixer la prochaine echeance"],
    actions: ["Valider le perimetre", "Creer l'objectif dans Trajectoire"],
    means: ["Trajectoire", "Assistant Edifice"],
    initialProgress: 0,
    confidence: 0.65,
    mode: "create",
    rationale:
      "Demande interpretee comme objectif Trajectoire; contenu a confirmer avant creation.",
    memoryContext,
  };
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
  const platform = context.cockpitState.platformStatuses.find(
    (status) =>
      status.key === normalizedProvider ||
      status.name.toLowerCase().includes(normalizedProvider),
  );
  const dependency = context.cockpitState.dependencies.find((item) =>
    item.name.toLowerCase().includes(normalizedProvider),
  );

  return {
    provider: normalizedProvider,
    platform,
    dependency,
    ready: platform?.status === "CONNECTED",
  };
}

function formatPlatformReadiness(context: ProjectContext, provider: string) {
  const state = getPlatformState(context, provider);
  const platform = state.platform;

  return [
    `${platform?.name ?? provider}: ${
      state.ready ? "connecte et fonctionnel" : platform?.label ?? "etat non confirme"
    }.`,
    `Statut cockpit: ${platform?.status ?? "ERROR"}.`,
    platform?.details.length
      ? `Details: ${platform.details.join(" ; ")}`
      : "Details: aucune information lisible.",
    state.ready
      ? "Prochaine etape: test controle avec validation humaine, sans publication automatique."
      : `Ce qui manque: ${
          platform?.summary ??
          state.dependency?.note ??
          "relire l'Observatoire."
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
  return context.cockpitState.platformStatuses
    .map((platform) => `${platform.name}: ${platform.label}`)
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
      `Plateformes: ${context.cockpitState.platformStatuses
        .map((platform) => `${platform.name} ${platform.label}`)
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
      platformStatuses: context.cockpitState.platformStatuses,
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

function buildSafeTrajectoireForLLM(
  trajectoire: GlobalAssistantInput["trajectoire"],
) {
  return {
    projects: (trajectoire?.projects ?? []).map((project) => ({
      title: project.title,
      category: project.category,
      status: project.status,
      priority: project.priority,
      deadline: project.deadline,
      progress: project.progress,
      objectives: project.objectives.map((objective) => ({
        title: objective.title,
        status: objective.status,
        priority: objective.priority,
        deadline: objective.deadline,
        manualProgress: objective.progress,
        calculatedProgress: calculatedObjectiveProgress(objective),
        actions: objective.actions.map((action) => ({
          title: action.title,
          status: action.status,
          dueDate: action.dueDate,
        })),
      })),
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
    "Trajectoire JSON sans secrets:",
    JSON.stringify(buildSafeTrajectoireForLLM(input.trajectoire), null, 2),
    "Reponds en francais, de facon concrete. Si la question demande une priorisation, donne 1 a 3 actions numerotees avec une justification courte.",
    "Pour chaque recommandation, indique: action recommandee, raison, dependance eventuelle, faisable maintenant oui/non.",
    "Pour les questions sur les brouillons, utilise contentDrafts.byStatus, readyToPublish, inProgress et recent.",
    "Pour les questions sur TikTok/Pinterest/Instagram/Meta/Facebook/YouTube, utilise d'abord platformStatuses, puis dependencies et blockers.",
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
      platformStatuses: context.cockpitState.platformStatuses.map((platform) => ({
        key: platform.key,
        name: platform.name,
        status: platform.status,
        label: platform.label,
        summary: platform.summary,
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
  let detailedAnalysis: string | null = null;

  try {
    detailedAnalysis = await generateOpenAIAnswer(input);
  } catch {
    detailedAnalysis = null;
  }

  if (!detailedAnalysis) {
    detailedAnalysis = buildFallbackAnswer(input);
    console.info("[Global Assistant] fallback response generated");
  }

  const { context } = input;
  const recommendation = getPrimaryRecommendation(context);
  const operationalAnswer = buildContextualOperationalAnswer(input);
  const detailedParts = [
    operationalAnswer.sources
      ? `Sources utilisees :\n${operationalAnswer.sources}`
      : null,
    detailedAnalysis,
  ].filter((part): part is string => Boolean(part?.trim()));

  return {
    ok: true,
    answer: operationalAnswer.answer,
    detailedAnalysis: detailedParts.join("\n\n"),
    recommendation,
    trajectoryProposal: detectTrajectoryObjectiveProposal(input.message, context),
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
