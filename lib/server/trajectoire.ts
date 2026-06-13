import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export const trajectoireProjectCategories = [
  "L'Edifice",
  "Projets perso",
  "Sport",
  "Ecriture",
  "Alternance / travail",
  "Administratif",
  "Sante",
  "Autre",
] as const;

export const trajectoireProjectStatuses = [
  "actif",
  "pause",
  "termine",
  "archive",
] as const;

export const trajectoireObjectiveStatuses = [
  "non commence",
  "en cours",
  "bloque",
  "reporte",
  "termine",
] as const;

export const trajectoireActionStatuses = ["a faire", "en cours", "fait"] as const;
export const trajectoirePriorities = ["basse", "moyenne", "haute"] as const;

export type TrajectoireProjectCategory =
  typeof trajectoireProjectCategories[number];
export type TrajectoireProjectStatus = typeof trajectoireProjectStatuses[number];
export type TrajectoireObjectiveStatus =
  typeof trajectoireObjectiveStatuses[number];
export type TrajectoireActionStatus = typeof trajectoireActionStatuses[number];
export type TrajectoirePriority = typeof trajectoirePriorities[number];

export type TrajectoireAction = {
  id: string;
  objectiveId: string;
  title: string;
  status: TrajectoireActionStatus;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
};

export type TrajectoireObjective = {
  id: string;
  projectId: string;
  title: string;
  description: string;
  deadline: string | null;
  status: TrajectoireObjectiveStatus;
  priority: TrajectoirePriority;
  progress: number;
  createdAt: string;
  updatedAt: string;
  actions: TrajectoireAction[];
};

export type TrajectoireProject = {
  id: string;
  title: string;
  description: string;
  category: TrajectoireProjectCategory;
  status: TrajectoireProjectStatus;
  priority: TrajectoirePriority;
  deadline: string | null;
  progress: number;
  createdAt: string;
  updatedAt: string;
  objectives: TrajectoireObjective[];
};

export type TrajectoireAssistantProposal = {
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

export type TrajectoireAssistantCreationResult = {
  project: TrajectoireProject;
  objective: TrajectoireObjective;
  actions: TrajectoireAction[];
  reusedProject: boolean;
  reusedObjective: boolean;
  skippedActions: string[];
};

type ProjectRow = {
  id: string;
  title: string | null;
  description: string | null;
  category: string | null;
  status: string | null;
  priority: string | null;
  deadline: string | null;
  progress: number | null;
  created_at: string;
  updated_at: string;
};

type ObjectiveRow = {
  id: string;
  project_id: string;
  title: string | null;
  description: string | null;
  deadline: string | null;
  status: string | null;
  priority: string | null;
  progress: number | null;
  created_at: string;
  updated_at: string;
};

type ActionRow = {
  id: string;
  objective_id: string;
  title: string | null;
  status: string | null;
  due_date: string | null;
  created_at: string;
  updated_at: string;
};

type ProjectInput = {
  title: string;
  description: string;
  category: TrajectoireProjectCategory;
  status: TrajectoireProjectStatus;
  priority: TrajectoirePriority;
  deadline: string | null;
  progress: number;
};

type ObjectiveInput = {
  projectId: string;
  title: string;
  description: string;
  deadline: string | null;
  status: TrajectoireObjectiveStatus;
  priority: TrajectoirePriority;
  progress: number;
};

type ActionInput = {
  objectiveId: string;
  title: string;
  status: TrajectoireActionStatus;
  dueDate: string | null;
};

let trajectoireClient: SupabaseClient | null = null;

function getTrajectoireClient() {
  if (trajectoireClient) {
    return trajectoireClient;
  }

  const supabaseUrl =
    process.env.SUPABASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Configuration Supabase Trajectoire manquante.");
  }

  trajectoireClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return trajectoireClient;
}

function asRecord(value: unknown) {
  if (!value || typeof value !== "object") {
    return {};
  }

  return value as Record<string, unknown>;
}

function stringValue(value: unknown, fallback = "") {
  return typeof value === "string" ? value.trim() : fallback;
}

function nullableDate(value: unknown) {
  const text = stringValue(value);

  if (!text) {
    return null;
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    throw new Error("Date invalide.");
  }

  return text;
}

function numberValue(value: unknown, fallback = 0) {
  const number = typeof value === "number" ? value : Number(value);

  if (!Number.isFinite(number)) {
    return fallback;
  }

  return Math.max(0, Math.min(100, Math.round(number)));
}

function normalizeComparable(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function isSimilarTitle(first: string, second: string) {
  const a = normalizeComparable(first);
  const b = normalizeComparable(second);

  if (!a || !b) {
    return false;
  }

  return a === b || a.includes(b) || b.includes(a);
}

function findSimilarProject(projects: TrajectoireProject[], title: string) {
  return projects.find((project) => isSimilarTitle(project.title, title)) ?? null;
}

function findSimilarObjective(
  objectives: TrajectoireObjective[],
  title: string,
) {
  return (
    objectives.find((objective) => isSimilarTitle(objective.title, title)) ?? null
  );
}

function findSimilarAction(actions: TrajectoireAction[], title: string) {
  return actions.find((action) => isSimilarTitle(action.title, title)) ?? null;
}

function enumValue<T extends readonly string[]>(
  value: unknown,
  values: T,
  fallback: T[number],
) {
  const text = stringValue(value);

  return values.includes(text) ? text as T[number] : fallback;
}

function requiredText(value: unknown, label: string) {
  const text = stringValue(value);

  if (!text) {
    throw new Error(`${label} est requis.`);
  }

  return text;
}

function mapAction(row: ActionRow): TrajectoireAction {
  return {
    id: row.id,
    objectiveId: row.objective_id,
    title: row.title ?? "Action sans titre",
    status: enumValue(row.status, trajectoireActionStatuses, "a faire"),
    dueDate: row.due_date,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapObjective(
  row: ObjectiveRow,
  actions: TrajectoireAction[],
): TrajectoireObjective {
  return {
    id: row.id,
    projectId: row.project_id,
    title: row.title ?? "Objectif sans titre",
    description: row.description ?? "",
    deadline: row.deadline,
    status: enumValue(row.status, trajectoireObjectiveStatuses, "non commence"),
    priority: enumValue(row.priority, trajectoirePriorities, "moyenne"),
    progress: numberValue(row.progress),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    actions,
  };
}

function mapProject(
  row: ProjectRow,
  objectives: TrajectoireObjective[],
): TrajectoireProject {
  return {
    id: row.id,
    title: row.title ?? "Projet sans titre",
    description: row.description ?? "",
    category: enumValue(row.category, trajectoireProjectCategories, "Autre"),
    status: enumValue(row.status, trajectoireProjectStatuses, "actif"),
    priority: enumValue(row.priority, trajectoirePriorities, "moyenne"),
    deadline: row.deadline,
    progress: numberValue(row.progress),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    objectives,
  };
}

export function sanitizeProjectInput(payload: unknown): ProjectInput {
  const record = asRecord(payload);

  return {
    title: requiredText(record.title, "Le titre du projet"),
    description: stringValue(record.description),
    category: enumValue(record.category, trajectoireProjectCategories, "Autre"),
    status: enumValue(record.status, trajectoireProjectStatuses, "actif"),
    priority: enumValue(record.priority, trajectoirePriorities, "moyenne"),
    deadline: nullableDate(record.deadline),
    progress: numberValue(record.progress),
  };
}

export function sanitizeObjectiveInput(payload: unknown): ObjectiveInput {
  const record = asRecord(payload);

  return {
    projectId: requiredText(record.projectId, "Le projet lie"),
    title: requiredText(record.title, "Le titre de l'objectif"),
    description: stringValue(record.description),
    deadline: nullableDate(record.deadline),
    status: enumValue(record.status, trajectoireObjectiveStatuses, "non commence"),
    priority: enumValue(record.priority, trajectoirePriorities, "moyenne"),
    progress: numberValue(record.progress),
  };
}

export function sanitizeActionInput(payload: unknown): ActionInput {
  const record = asRecord(payload);

  return {
    objectiveId: requiredText(record.objectiveId, "L'objectif lie"),
    title: requiredText(record.title, "Le titre de l'action"),
    status: enumValue(record.status, trajectoireActionStatuses, "a faire"),
    dueDate: nullableDate(record.dueDate),
  };
}

export function sanitizeAssistantProposalInput(
  payload: unknown,
): TrajectoireAssistantProposal {
  const record = asRecord(payload);
  const planAction = Array.isArray(record.planAction)
    ? record.planAction.map((item) => stringValue(item)).filter(Boolean)
    : [];
  const actions = Array.isArray(record.actions)
    ? record.actions.map((item) => stringValue(item)).filter(Boolean)
    : [];
  const means = Array.isArray(record.means)
    ? record.means.map((item) => stringValue(item)).filter(Boolean)
    : [];
  const memoryContext = Array.isArray(record.memoryContext)
    ? record.memoryContext.map((item) => stringValue(item)).filter(Boolean)
    : [];
  const confidenceValue = Number(record.confidence);
  const confidence = Number.isFinite(confidenceValue)
    ? Math.max(0, Math.min(1, confidenceValue > 1 ? confidenceValue / 100 : confidenceValue))
    : 0.75;

  return {
    project: requiredText(record.project, "Le projet"),
    objective: requiredText(record.objective, "L'objectif"),
    deadline: nullableDate(record.deadline),
    planAction,
    actions,
    means,
    initialProgress: numberValue(record.initialProgress),
    confidence,
    mode: record.mode === "update" ? "update" : "create",
    existingProjectId: stringValue(record.existingProjectId) || null,
    existingObjectiveId: stringValue(record.existingObjectiveId) || null,
    rationale: stringValue(record.rationale),
    memoryContext,
  };
}

export async function readTrajectoire(userId: string) {
  const supabase = getTrajectoireClient();

  const { data: projects, error: projectsError } = await supabase
    .from("trajectoire_projects")
    .select(
      "id,title,description,category,status,priority,deadline,progress,created_at,updated_at",
    )
    .eq("user_id", userId)
    .neq("status", "archive")
    .order("created_at", { ascending: false });

  if (projectsError) {
    throw new Error(projectsError.message);
  }

  const projectRows = (projects ?? []) as ProjectRow[];
  const projectIds = projectRows.map((project) => project.id);

  if (!projectIds.length) {
    return { projects: [] as TrajectoireProject[] };
  }

  const { data: objectives, error: objectivesError } = await supabase
    .from("trajectoire_objectives")
    .select(
      "id,project_id,title,description,deadline,status,priority,progress,created_at,updated_at",
    )
    .eq("user_id", userId)
    .in("project_id", projectIds)
    .order("created_at", { ascending: false });

  if (objectivesError) {
    throw new Error(objectivesError.message);
  }

  const objectiveRows = (objectives ?? []) as ObjectiveRow[];
  const objectiveIds = objectiveRows.map((objective) => objective.id);
  let actionRows: ActionRow[] = [];

  if (objectiveIds.length) {
    const { data: actions, error: actionsError } = await supabase
      .from("trajectoire_actions")
      .select("id,objective_id,title,status,due_date,created_at,updated_at")
      .eq("user_id", userId)
      .in("objective_id", objectiveIds)
      .order("created_at", { ascending: false });

    if (actionsError) {
      throw new Error(actionsError.message);
    }

    actionRows = (actions ?? []) as ActionRow[];
  }

  const actionsByObjective = new Map<string, TrajectoireAction[]>();
  for (const action of actionRows.map(mapAction)) {
    const current = actionsByObjective.get(action.objectiveId) ?? [];
    current.push(action);
    actionsByObjective.set(action.objectiveId, current);
  }

  const objectivesByProject = new Map<string, TrajectoireObjective[]>();
  for (const objectiveRow of objectiveRows) {
    const objective = mapObjective(
      objectiveRow,
      actionsByObjective.get(objectiveRow.id) ?? [],
    );
    const current = objectivesByProject.get(objective.projectId) ?? [];
    current.push(objective);
    objectivesByProject.set(objective.projectId, current);
  }

  return {
    projects: projectRows.map((project) =>
      mapProject(project, objectivesByProject.get(project.id) ?? []),
    ),
  };
}

export async function createTrajectoireProject({
  input,
  userId,
}: {
  input: ProjectInput;
  userId: string;
}) {
  const supabase = getTrajectoireClient();
  const { data, error } = await supabase
    .from("trajectoire_projects")
    .insert({
      user_id: userId,
      title: input.title,
      description: input.description,
      category: input.category,
      status: input.status,
      priority: input.priority,
      deadline: input.deadline,
      progress: input.progress,
    })
    .select("id,title,description,category,status,priority,deadline,progress,created_at,updated_at")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return mapProject(data as ProjectRow, []);
}

export async function createTrajectoireObjective({
  input,
  userId,
}: {
  input: ObjectiveInput;
  userId: string;
}) {
  const supabase = getTrajectoireClient();
  const { data, error } = await supabase
    .from("trajectoire_objectives")
    .insert({
      user_id: userId,
      project_id: input.projectId,
      title: input.title,
      description: input.description,
      deadline: input.deadline,
      status: input.status,
      priority: input.priority,
      progress: input.progress,
    })
    .select("id,project_id,title,description,deadline,status,priority,progress,created_at,updated_at")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return mapObjective(data as ObjectiveRow, []);
}

export async function createTrajectoireAction({
  input,
  userId,
}: {
  input: ActionInput;
  userId: string;
}) {
  const supabase = getTrajectoireClient();
  const { data, error } = await supabase
    .from("trajectoire_actions")
    .insert({
      user_id: userId,
      objective_id: input.objectiveId,
      title: input.title,
      status: input.status,
      due_date: input.dueDate,
    })
    .select("id,objective_id,title,status,due_date,created_at,updated_at")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return mapAction(data as ActionRow);
}

function projectCategoryFromProposal(
  proposal: TrajectoireAssistantProposal,
): TrajectoireProjectCategory {
  const text = normalizeComparable(`${proposal.project} ${proposal.objective}`);

  if (
    text.includes("edifice") ||
    text.includes("short") ||
    text.includes("pinterest") ||
    text.includes("tiktok")
  ) {
    return "L'Edifice";
  }

  if (text.includes("sport")) {
    return "Sport";
  }

  if (text.includes("ecriture") || text.includes("livre")) {
    return "Ecriture";
  }

  if (text.includes("alternance") || text.includes("travail")) {
    return "Alternance / travail";
  }

  if (text.includes("sante")) {
    return "Sante";
  }

  return "Autre";
}

function formatProposalDescription(proposal: TrajectoireAssistantProposal) {
  const lines = [
    "Cree depuis l'Assistant Edifice apres confirmation utilisateur.",
    "",
    "POPAM",
    `Projet: ${proposal.project}`,
    `Objectif: ${proposal.objective}`,
    "",
    "Plan d'action:",
    ...(proposal.planAction.length
      ? proposal.planAction.map((item) => `- ${item}`)
      : ["- A preciser"]),
    "",
    "Actions:",
    ...(proposal.actions.length
      ? proposal.actions.map((item) => `- ${item}`)
      : ["- A preciser"]),
    "",
    "Moyens:",
    ...(proposal.means.length
      ? proposal.means.map((item) => `- ${item}`)
      : ["- A preciser"]),
  ];

  if (proposal.memoryContext?.length) {
    lines.push("", "Memoire projet prise en compte:");
    lines.push(...proposal.memoryContext.map((item) => `- ${item}`));
  }

  return lines.join("\n");
}

export async function createTrajectoireFromAssistantProposal({
  proposal,
  userId,
}: {
  proposal: TrajectoireAssistantProposal;
  userId: string;
}): Promise<TrajectoireAssistantCreationResult> {
  const snapshot = await readTrajectoire(userId);
  const existingProject =
    snapshot.projects.find((project) => project.id === proposal.existingProjectId) ??
    findSimilarProject(snapshot.projects, proposal.project);

  let project = existingProject;
  let reusedProject = Boolean(project);

  if (!project) {
    project = await createTrajectoireProject({
      input: {
        title: proposal.project,
        description: formatProposalDescription(proposal),
        category: projectCategoryFromProposal(proposal),
        status: "actif",
        priority: "haute",
        deadline: proposal.deadline,
        progress: proposal.initialProgress,
      },
      userId,
    });
    reusedProject = false;
  }

  const existingObjective =
    project.objectives.find(
      (objective) => objective.id === proposal.existingObjectiveId,
    ) ?? findSimilarObjective(project.objectives, proposal.objective);

  let objective = existingObjective;
  let reusedObjective = Boolean(objective);

  if (!objective) {
    objective = await createTrajectoireObjective({
      input: {
        projectId: project.id,
        title: proposal.objective,
        description: formatProposalDescription(proposal),
        deadline: proposal.deadline,
        status: "non commence",
        priority: "haute",
        progress: proposal.initialProgress,
      },
      userId,
    });
    reusedObjective = false;
  }

  const createdActions: TrajectoireAction[] = [];
  const skippedActions: string[] = [];

  for (const actionTitle of proposal.actions) {
    if (findSimilarAction(objective.actions, actionTitle)) {
      skippedActions.push(actionTitle);
      continue;
    }

    const action = await createTrajectoireAction({
      input: {
        objectiveId: objective.id,
        title: actionTitle,
        status: "a faire",
        dueDate: proposal.deadline,
      },
      userId,
    });
    createdActions.push(action);
  }

  return {
    project,
    objective,
    actions: createdActions,
    reusedProject,
    reusedObjective,
    skippedActions,
  };
}

export async function enrichTrajectoireAssistantProposal({
  proposal,
  userId,
}: {
  proposal: TrajectoireAssistantProposal;
  userId: string;
}) {
  const snapshot = await readTrajectoire(userId);
  const existingProject = findSimilarProject(snapshot.projects, proposal.project);
  const existingObjective = existingProject
    ? findSimilarObjective(existingProject.objectives, proposal.objective)
    : null;

  if (!existingProject) {
    return {
      ...proposal,
      mode: "create" as const,
      existingProjectId: null,
      existingObjectiveId: null,
    };
  }

  return {
    ...proposal,
    mode: "update" as const,
    existingProjectId: existingProject.id,
    existingObjectiveId: existingObjective?.id ?? null,
    rationale: existingObjective
      ? `Un objectif similaire existe deja dans ${existingProject.title}. Les nouvelles actions seront ajoutees sans doublon apres confirmation.`
      : `Un projet similaire existe deja: ${existingProject.title}. L'objectif sera rattache a ce projet apres confirmation.`,
  };
}

export async function updateTrajectoireProject({
  id,
  input,
  userId,
}: {
  id: string;
  input: ProjectInput;
  userId: string;
}) {
  const supabase = getTrajectoireClient();
  const { error } = await supabase
    .from("trajectoire_projects")
    .update({
      title: input.title,
      description: input.description,
      category: input.category,
      status: input.status,
      priority: input.priority,
      deadline: input.deadline,
      progress: input.progress,
    })
    .eq("id", id)
    .eq("user_id", userId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function updateTrajectoireObjective({
  id,
  input,
  userId,
}: {
  id: string;
  input: ObjectiveInput;
  userId: string;
}) {
  const supabase = getTrajectoireClient();
  const { error } = await supabase
    .from("trajectoire_objectives")
    .update({
      project_id: input.projectId,
      title: input.title,
      description: input.description,
      deadline: input.deadline,
      status: input.status,
      priority: input.priority,
      progress: input.progress,
    })
    .eq("id", id)
    .eq("user_id", userId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function updateTrajectoireAction({
  id,
  input,
  userId,
}: {
  id: string;
  input: ActionInput;
  userId: string;
}) {
  const supabase = getTrajectoireClient();
  const { error } = await supabase
    .from("trajectoire_actions")
    .update({
      objective_id: input.objectiveId,
      title: input.title,
      status: input.status,
      due_date: input.dueDate,
    })
    .eq("id", id)
    .eq("user_id", userId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function archiveTrajectoireProject({
  id,
  userId,
}: {
  id: string;
  userId: string;
}) {
  const supabase = getTrajectoireClient();
  const { error } = await supabase
    .from("trajectoire_projects")
    .update({ status: "archive" })
    .eq("id", id)
    .eq("user_id", userId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function deleteTrajectoireEntity({
  entity,
  id,
  userId,
}: {
  entity: "project" | "objective" | "action";
  id: string;
  userId: string;
}) {
  const supabase = getTrajectoireClient();
  const table =
    entity === "project"
      ? "trajectoire_projects"
      : entity === "objective"
        ? "trajectoire_objectives"
        : "trajectoire_actions";
  const { error } = await supabase
    .from(table)
    .delete()
    .eq("id", id)
    .eq("user_id", userId);

  if (error) {
    throw new Error(error.message);
  }
}
