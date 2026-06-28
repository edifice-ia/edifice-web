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

export type TrajectoireAssistantUpdateProposal = {
  type: "action_status" | "objective_status";
  projectId: string;
  projectTitle: string;
  objectiveId: string;
  objectiveTitle: string;
  actionId?: string | null;
  actionTitle?: string | null;
  previousValue: string;
  nextValue: string;
  impact: string;
  confidence: number;
};

export type TrajectoireAssistantUpdateResult = {
  proposal: TrajectoireAssistantUpdateProposal;
  updated: boolean;
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

type ShortsDraftSignalRow = {
  id: string;
  status: string | null;
  visual_status: string | null;
  voice_asset_id: string | null;
  voice_status: string | null;
};

type ShortsAssetSignalRow = {
  asset_type: "image" | "audio" | "video" | "subtitle";
  linked_draft_id: string | null;
  metadata: Record<string, unknown> | null;
};

type ShortsRenderSignalRow = {
  draft_id: string;
  metadata: Record<string, unknown> | null;
  status: string | null;
};

type ShortsScheduleSignalRow = {
  draft_id: string;
  status: string | null;
};

type ShortsCostSignalRow = {
  id: string;
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

export type TrajectoireSyncSummary = {
  changedProjects: string[];
  unchangedProjects: string[];
  nextStep: string;
  priority: TrajectoirePriority;
  progress: number;
  signals: Array<{ done: boolean; label: string; source: string }>;
  source: string;
  syncedAt: string;
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

function actionProgress(actions: TrajectoireAction[]) {
  if (!actions.length) {
    return null;
  }

  const done = actions.filter((action) => action.status === "fait").length;
  return Math.round((done / actions.length) * 100);
}

function retainedObjectiveProgress(objective: TrajectoireObjective) {
  return actionProgress(objective.actions) ?? objective.progress;
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

export function sanitizeAssistantUpdateProposalInput(
  payload: unknown,
): TrajectoireAssistantUpdateProposal {
  const record = asRecord(payload);
  const type =
    record.type === "objective_status" ? "objective_status" : "action_status";
  const nextValue =
    type === "objective_status"
      ? enumValue(record.nextValue, trajectoireObjectiveStatuses, "en cours")
      : enumValue(record.nextValue, trajectoireActionStatuses, "fait");
  const confidenceValue = Number(record.confidence);
  const confidence = Number.isFinite(confidenceValue)
    ? Math.max(0, Math.min(1, confidenceValue > 1 ? confidenceValue / 100 : confidenceValue))
    : 0.75;

  return {
    type,
    projectId: requiredText(record.projectId, "Le projet"),
    projectTitle: stringValue(record.projectTitle),
    objectiveId: requiredText(record.objectiveId, "L'objectif"),
    objectiveTitle: stringValue(record.objectiveTitle),
    actionId: stringValue(record.actionId) || null,
    actionTitle: stringValue(record.actionTitle) || null,
    previousValue: stringValue(record.previousValue),
    nextValue,
    impact: stringValue(record.impact),
    confidence,
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

function findProjectByTerms(projects: TrajectoireProject[], terms: string[]) {
  return projects.find((project) => {
    const text = normalizeComparable(
      `${project.title} ${project.description} ${project.objectives
        .map((objective) => `${objective.title} ${objective.description}`)
        .join(" ")}`,
    );

    return terms.some((term) => text.includes(normalizeComparable(term)));
  }) ?? null;
}

function replaceSyncBlock(description: string, marker: string, content: string) {
  const start = `<!-- ${marker}:start -->`;
  const end = `<!-- ${marker}:end -->`;
  const block = `${start}\n${content.trim()}\n${end}`;
  const pattern = new RegExp(`${start}[\\s\\S]*?${end}`, "m");

  if (pattern.test(description)) {
    return description.replace(pattern, block).trim();
  }

  return [description.trim(), block].filter(Boolean).join("\n\n");
}

function readMetadataString(metadata: Record<string, unknown> | null, key: string) {
  const value = metadata?.[key];
  return typeof value === "string" ? value : null;
}

async function maybeReadShortsSignals(userId: string) {
  const supabase = getTrajectoireClient();
  const signals = {
    costEvents: [] as ShortsCostSignalRow[],
    drafts: [] as ShortsDraftSignalRow[],
    renderJobs: [] as ShortsRenderSignalRow[],
    schedules: [] as ShortsScheduleSignalRow[],
    subtitleAssets: [] as ShortsAssetSignalRow[],
    videoManifests: [] as ShortsAssetSignalRow[],
  };

  const drafts = await supabase
    .from("content_drafts")
    .select("id,status,visual_status,voice_status,voice_asset_id")
    .eq("user_id", userId)
    .limit(200)
    .returns<ShortsDraftSignalRow[]>();
  if (!drafts.error) {
    signals.drafts = drafts.data ?? [];
  }

  const draftIds = signals.drafts.map((draft) => draft.id);
  if (!draftIds.length) {
    return signals;
  }

  const [assets, jobs, schedules, costs] = await Promise.all([
    supabase
      .from("content_assets")
      .select("asset_type,linked_draft_id,metadata")
      .in("linked_draft_id", draftIds)
      .in("asset_type", ["subtitle", "video"])
      .returns<ShortsAssetSignalRow[]>(),
    supabase
      .from("video_render_jobs")
      .select("draft_id,status,metadata")
      .in("draft_id", draftIds)
      .returns<ShortsRenderSignalRow[]>(),
    supabase
      .from("short_video_schedules")
      .select("draft_id,status")
      .in("draft_id", draftIds)
      .returns<ShortsScheduleSignalRow[]>(),
    supabase
      .from("cost_events")
      .select("id")
      .eq("user_id", userId)
      .in("category", ["image_generation", "image_analysis", "voice_generation", "subtitle_generation", "video_render"])
      .limit(1)
      .returns<ShortsCostSignalRow[]>(),
  ]);

  if (!assets.error) {
    const rows = assets.data ?? [];
    signals.subtitleAssets = rows.filter((asset) => asset.asset_type === "subtitle");
    signals.videoManifests = rows.filter(
      (asset) =>
        asset.asset_type === "video" &&
        readMetadataString(asset.metadata, "asset_role") === "short_video_preparation_manifest",
    );
  }
  if (!jobs.error) {
    signals.renderJobs = jobs.data ?? [];
  }
  if (!schedules.error) {
    signals.schedules = schedules.data ?? [];
  }
  if (!costs.error) {
    signals.costEvents = costs.data ?? [];
  }

  return signals;
}

function buildShortsMilestones(signals: Awaited<ReturnType<typeof maybeReadShortsSignals>>) {
  const draftStatuses = new Set(signals.drafts.map((draft) => draft.status ?? ""));
  const textValidated = signals.drafts.some((draft) =>
    ["approved", "validated", "media_ready", "voice_ready", "video_ready", "video_validated", "ready_to_publish"].includes(draft.status ?? ""),
  );
  const visualsValidated = signals.drafts.some((draft) => draft.visual_status === "visual_ready");
  const voiceValidated = signals.drafts.some((draft) =>
    draft.voice_status === "validated" ||
    ["video_ready", "video_validated", "ready_to_publish"].includes(draft.status ?? "") ||
    Boolean(draft.voice_asset_id),
  );
  const subtitlesValidated = signals.subtitleAssets.some(
    (asset) => readMetadataString(asset.metadata, "subtitle_validation_status") === "validated",
  );
  const manifestPrepared = signals.videoManifests.length > 0;
  const videoRendered = signals.renderJobs.some((job) => job.status === "completed");
  const videoValidated = signals.renderJobs.some(
    (job) => readMetadataString(job.metadata, "video_validation_status") === "validated",
  ) || draftStatuses.has("video_validated") || draftStatuses.has("ready_to_publish");
  const programmingReady = signals.schedules.some((schedule) => schedule.status === "scheduled");
  const costsTracked = signals.costEvents.length > 0;

  return [
    { done: textValidated, label: "Texte valide", source: "content_drafts.status" },
    { done: visualsValidated, label: "Visuels valides", source: "content_drafts.visual_status" },
    { done: voiceValidated, label: "Voix validee", source: "content_drafts.voice_status / voice_asset_id" },
    { done: subtitlesValidated, label: "Sous-titres valides", source: "content_assets.metadata.subtitle_validation_status" },
    { done: manifestPrepared, label: "Manifest video prepare", source: "content_assets.metadata.asset_role" },
    { done: videoRendered, label: "Rendu Railway termine", source: "video_render_jobs.status" },
    { done: videoValidated, label: "Validation video", source: "video_render_jobs.metadata / content_drafts.status" },
    { done: programmingReady, label: "Programmation fonctionnelle", source: "short_video_schedules.status" },
    { done: costsTracked, label: "Suivi des couts alimente", source: "cost_events" },
    { done: false, label: "Publication reelle multi-plateforme", source: "placeholder publication" },
    { done: false, label: "Analytics de performances", source: "non implemente" },
  ];
}

function shortsNextStep(milestones: Array<{ done: boolean; label: string }>) {
  const missing = milestones.find((milestone) => !milestone.done);
  if (!missing) {
    return "Consolider la publication reelle multi-plateforme avec validation humaine.";
  }

  if (missing.label.includes("Publication")) {
    return "Preparer la publication reelle multi-plateforme sans declenchement automatique.";
  }

  if (missing.label.includes("Analytics")) {
    return "Construire les analytics de performances par plateforme.";
  }

  return `Stabiliser le jalon restant: ${missing.label}.`;
}

function shortsPriority(milestones: Array<{ done: boolean; label: string }>): TrajectoirePriority {
  const publicationMissing = milestones.some((milestone) => !milestone.done && milestone.label.includes("Publication"));
  const coreMissing = milestones.some(
    (milestone) =>
      !milestone.done &&
      !milestone.label.includes("Publication") &&
      !milestone.label.includes("Analytics"),
  );

  if (coreMissing) {
    return "haute";
  }

  return publicationMissing ? "moyenne" : "basse";
}

function formatShortsSyncDescription({
  milestones,
  nextStep,
  progress,
  priority,
  syncedAt,
}: {
  milestones: Array<{ done: boolean; label: string; source: string }>;
  nextStep: string;
  priority: TrajectoirePriority;
  progress: number;
  syncedAt: string;
}) {
  const done = milestones.filter((milestone) => milestone.done);
  const pending = milestones.filter((milestone) => !milestone.done);

  return [
    "Synchronise depuis la memoire projet et les signaux metier reels.",
    `Derniere synchronisation: ${syncedAt}`,
    "Source du dernier changement: content_drafts, content_assets, video_render_jobs, short_video_schedules, cost_events, project_memory.",
    `Progression calculee: ${progress}%`,
    `Priorite calculee: ${priority}`,
    `Prochaine etape: ${nextStep}`,
    `Jalons realises: ${done.map((milestone) => milestone.label).join(" ; ") || "aucun"}`,
    `Jalons restants: ${pending.map((milestone) => milestone.label).join(" ; ") || "aucun"}`,
    "Blocage reel: publication reelle multi-plateforme et analytics non actives.",
  ].join("\n");
}

function findAtelierShortsProject(projects: TrajectoireProject[]) {
  return findProjectByTerms(projects, ["atelier shorts", "shorts", "pipeline shorts", "short"]);
}

function findObjectiveByTerms(
  project: TrajectoireProject,
  terms: string[],
) {
  return project.objectives.find((objective) => {
    const text = normalizeComparable(
      `${objective.title} ${objective.description} ${objective.actions
        .map((action) => action.title)
        .join(" ")}`,
    );

    return terms.some((term) => text.includes(normalizeComparable(term)));
  }) ?? project.objectives[0] ?? null;
}

function findActionByTerms(
  objective: TrajectoireObjective,
  terms: string[],
) {
  return objective.actions.find((action) => {
    const text = normalizeComparable(action.title);
    return terms.some((term) => text.includes(normalizeComparable(term)));
  }) ?? null;
}

export async function inferTrajectoireUpdateFromMessage({
  message,
  userId,
}: {
  message: string;
  userId: string;
}): Promise<TrajectoireAssistantUpdateProposal | null> {
  const normalized = normalizeComparable(message);
  const snapshot = await readTrajectoire(userId);

  if (
    normalized.includes("short") &&
    normalized.includes("visuel") &&
    (normalized.includes("termine") || normalized.includes("fini") || normalized.includes("pret"))
  ) {
    const project = findProjectByTerms(snapshot.projects, ["short", "atelier"]);
    const objective = project ? findObjectiveByTerms(project, ["short", "pipeline", "visuel"]) : null;
    const action = objective ? findActionByTerms(objective, ["visuel", "finaliser visuels"]) : null;

    if (project && objective && action) {
      return {
        type: "action_status",
        projectId: project.id,
        projectTitle: project.title,
        objectiveId: objective.id,
        objectiveTitle: objective.title,
        actionId: action.id,
        actionTitle: action.title,
        previousValue: action.status,
        nextValue: "fait",
        impact: "L'action Visuels passera en fait et la progression retenue de l'objectif sera recalculee depuis les actions.",
        confidence: 0.88,
      };
    }
  }

  if (
    normalized.includes("voix") &&
    (normalized.includes("prete") || normalized.includes("pret") || normalized.includes("termine"))
  ) {
    const project = findProjectByTerms(snapshot.projects, ["short", "atelier"]);
    const objective = project ? findObjectiveByTerms(project, ["short", "pipeline", "voix"]) : null;
    const action = objective ? findActionByTerms(objective, ["voix", "preparer voix"]) : null;

    if (project && objective && action) {
      return {
        type: "action_status",
        projectId: project.id,
        projectTitle: project.title,
        objectiveId: objective.id,
        objectiveTitle: objective.title,
        actionId: action.id,
        actionTitle: action.title,
        previousValue: action.status,
        nextValue: "fait",
        impact: "L'action Voix passera en fait et la progression retenue sera recalculee depuis les actions.",
        confidence: 0.84,
      };
    }
  }

  if (
    normalized.includes("pinterest") &&
    normalized.includes("production") &&
    normalized.includes("report")
  ) {
    const project = findProjectByTerms(snapshot.projects, ["pinterest"]);
    const objective = project ? findObjectiveByTerms(project, ["production", "pinterest"]) : null;

    if (project && objective) {
      return {
        type: "objective_status",
        projectId: project.id,
        projectTitle: project.title,
        objectiveId: objective.id,
        objectiveTitle: objective.title,
        actionId: null,
        actionTitle: null,
        previousValue: objective.status,
        nextValue: "reporte",
        impact: "L'objectif Pinterest Production sera reporte et ne comptera plus comme retard reel.",
        confidence: 0.86,
      };
    }
  }

  return null;
}

export async function applyTrajectoireAssistantUpdate({
  proposal,
  userId,
}: {
  proposal: TrajectoireAssistantUpdateProposal;
  userId: string;
}): Promise<TrajectoireAssistantUpdateResult> {
  const supabase = getTrajectoireClient();

  if (proposal.type === "action_status") {
    if (!proposal.actionId) {
      throw new Error("Action Trajectoire manquante.");
    }

    const { error } = await supabase
      .from("trajectoire_actions")
      .update({ status: proposal.nextValue })
      .eq("id", proposal.actionId)
      .eq("user_id", userId);

    if (error) {
      throw new Error(error.message);
    }
  } else {
    const { error } = await supabase
      .from("trajectoire_objectives")
      .update({ status: proposal.nextValue })
      .eq("id", proposal.objectiveId)
      .eq("user_id", userId);

    if (error) {
      throw new Error(error.message);
    }
  }

  await recalculateTrajectoireProgress(userId);

  return { proposal, updated: true };
}

export async function recalculateTrajectoireProgress(userId: string) {
  const supabase = getTrajectoireClient();
  const snapshot = await readTrajectoire(userId);

  for (const project of snapshot.projects) {
    for (const objective of project.objectives) {
      if (!objective.actions.length) {
        continue;
      }

      const progress = actionProgress(objective.actions) ?? objective.progress;
      const allDone = objective.actions.every((action) => action.status === "fait");
      const nextStatus = allDone ? "termine" : objective.status;
      const { error } = await supabase
        .from("trajectoire_objectives")
        .update({
          progress: allDone ? 100 : progress,
          status: nextStatus,
        })
        .eq("id", objective.id)
        .eq("user_id", userId);

      if (error) {
        throw new Error(error.message);
      }
    }
  }

  const refreshed = await readTrajectoire(userId);

  for (const project of refreshed.projects) {
    if (!project.objectives.length) {
      continue;
    }

    const progress = Math.round(
      project.objectives.reduce(
        (sum, objective) => sum + retainedObjectiveProgress(objective),
        0,
      ) / project.objectives.length,
    );
    const allDone = project.objectives.every(
      (objective) => objective.status === "termine",
    );
    const { error } = await supabase
      .from("trajectoire_projects")
      .update({
        progress: allDone ? 100 : progress,
        status: allDone ? "termine" : project.status,
      })
      .eq("id", project.id)
      .eq("user_id", userId);

    if (error) {
      throw new Error(error.message);
    }
  }
}

export async function syncTrajectoireFromProjectMemory({
  userId,
}: {
  userId: string;
}): Promise<TrajectoireSyncSummary> {
  const supabase = getTrajectoireClient();
  const snapshot = await readTrajectoire(userId);
  const syncedAt = new Date().toISOString();
  const signals = await maybeReadShortsSignals(userId);
  const milestones = buildShortsMilestones(signals);
  const doneCount = milestones.filter((milestone) => milestone.done).length;
  const progress = Math.round((doneCount / milestones.length) * 100);
  const priority = shortsPriority(milestones);
  const nextStep = shortsNextStep(milestones);
  const changedProjects: string[] = [];
  const unchangedProjects: string[] = [];
  const project = findAtelierShortsProject(snapshot.projects);

  if (!project) {
    return {
      changedProjects,
      unchangedProjects: snapshot.projects.map((item) => `${item.title}: aucun signal Shorts rattache`),
      nextStep,
      priority,
      progress,
      signals: milestones,
      source: "content_drafts + project_memory",
      syncedAt,
    };
  }

  const syncContent = formatShortsSyncDescription({
    milestones,
    nextStep,
    priority,
    progress,
    syncedAt,
  });
  const nextProjectDescription = replaceSyncBlock(
    project.description,
    "edifice-sync:atelier-shorts",
    syncContent,
  );
  const projectChanged =
    project.progress !== progress ||
    project.priority !== priority ||
    project.description !== nextProjectDescription ||
    project.status !== "actif";

  if (projectChanged) {
    const { error } = await supabase
      .from("trajectoire_projects")
      .update({
        description: nextProjectDescription,
        priority,
        progress,
        status: "actif",
      })
      .eq("id", project.id)
      .eq("user_id", userId);

    if (error) {
      throw new Error(error.message);
    }
    changedProjects.push(`${project.title}: avancement mis a jour`);
  } else {
    unchangedProjects.push(`${project.title}: aucun changement detecte`);
  }

  const objectiveTitle = "Pipeline Shorts - synchronisation";
  let objective =
    findSimilarObjective(project.objectives, objectiveTitle) ??
    findSimilarObjective(project.objectives, "pipeline shorts");
  const objectiveStatus: TrajectoireObjectiveStatus = progress >= 100
    ? "termine"
    : progress > 0
      ? "en cours"
      : "non commence";
  const nextObjectiveDescription = replaceSyncBlock(
    objective?.description ?? "",
    "edifice-sync:atelier-shorts-objective",
    syncContent,
  );

  if (!objective) {
    objective = await createTrajectoireObjective({
      input: {
        deadline: null,
        description: nextObjectiveDescription,
        priority,
        progress,
        projectId: project.id,
        status: objectiveStatus,
        title: objectiveTitle,
      },
      userId,
    });
    changedProjects.push(`${project.title}: objectif de synchronisation ajoute`);
  } else {
    const { error } = await supabase
      .from("trajectoire_objectives")
      .update({
        description: nextObjectiveDescription,
        priority,
        progress,
        status: objectiveStatus,
      })
      .eq("id", objective.id)
      .eq("user_id", userId);

    if (error) {
      throw new Error(error.message);
    }
  }

  const refreshed = await readTrajectoire(userId);
  const refreshedProject = refreshed.projects.find((item) => item.id === project.id);
  const refreshedObjective = refreshedProject
    ? findSimilarObjective(refreshedProject.objectives, objectiveTitle) ??
      findSimilarObjective(refreshedProject.objectives, "pipeline shorts")
    : null;

  if (refreshedObjective) {
    for (const milestone of milestones) {
      const existingAction = findSimilarAction(refreshedObjective.actions, milestone.label);
      const status: TrajectoireActionStatus = milestone.done ? "fait" : "a faire";

      if (!existingAction) {
        await createTrajectoireAction({
          input: {
            dueDate: null,
            objectiveId: refreshedObjective.id,
            status,
            title: milestone.label,
          },
          userId,
        });
        continue;
      }

      if (existingAction.status !== status) {
        const { error } = await supabase
          .from("trajectoire_actions")
          .update({ status })
          .eq("id", existingAction.id)
          .eq("user_id", userId);

        if (error) {
          throw new Error(error.message);
        }
      }
    }
  }

  await recalculateTrajectoireProgress(userId);

  for (const item of snapshot.projects) {
    if (item.id !== project.id) {
      unchangedProjects.push(`${item.title}: aucun changement recent`);
    }
  }

  return {
    changedProjects: Array.from(new Set(changedProjects)),
    unchangedProjects: Array.from(new Set(unchangedProjects)),
    nextStep,
    priority,
    progress,
    signals: milestones,
    source: "content_drafts + content_assets + video_render_jobs + short_video_schedules + cost_events + project_memory",
    syncedAt,
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
