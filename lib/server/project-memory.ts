import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type {
  ProjectMemoryCreateInput,
  ProjectMemoryEntry,
} from "@/types/cockpit";

type ProjectMemoryRow = {
  id: string;
  created_at: string;
  updated_at: string;
  key?: string | null;
  category: string | null;
  status: string | null;
  title: string;
  value?: string | null;
  content: string | null;
  next_action: string | null;
  priority: string | null;
  source: string | null;
  confidence?: number | null;
};

export type ProjectMemoryUpdateProposal = {
  key: string;
  category: string;
  title: string;
  value: string;
  status: string;
  source: string;
  confidence: number;
  previousValue?: string | null;
  impact?: string;
};

let projectMemoryClient: SupabaseClient | null = null;

function getProjectMemoryClient() {
  if (projectMemoryClient) {
    return projectMemoryClient;
  }

  const supabaseUrl =
    process.env.SUPABASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Project memory requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
    );
  }

  projectMemoryClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return projectMemoryClient;
}

function normalizeText(value: unknown, maxLength: number) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized.slice(0, maxLength) : null;
}

function normalizeKey(value: unknown) {
  const normalized = normalizeText(value, 120)
    ?.toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "");

  return normalized || null;
}

function normalizeConfidence(value: unknown) {
  const number = typeof value === "number" ? value : Number(value);

  if (!Number.isFinite(number)) {
    return null;
  }

  return Math.max(0, Math.min(1, number));
}

function mapRow(row: ProjectMemoryRow): ProjectMemoryEntry {
  return {
    id: row.id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    key: row.key ?? null,
    category: row.category,
    status: row.status,
    title: row.title,
    value: row.value ?? null,
    content: row.content,
    nextAction: row.next_action,
    priority: row.priority,
    source: row.source,
    confidence: row.confidence ?? null,
  };
}

export function sanitizeProjectMemoryInput(
  input: unknown,
): ProjectMemoryCreateInput {
  const body = input && typeof input === "object" ? input : {};
  const record = body as Record<string, unknown>;
  const title = normalizeText(record.title, 180);

  if (!title) {
    throw new Error("Le titre de la memoire projet est obligatoire.");
  }

  return {
    key: normalizeKey(record.key),
    title,
    category: normalizeText(record.category, 80),
    status: normalizeText(record.status, 80),
    value: normalizeText(record.value, 1000),
    content: normalizeText(record.content, 4000),
    nextAction: normalizeText(record.nextAction, 500),
    priority: normalizeText(record.priority, 40),
    source: normalizeText(record.source, 120),
    confidence: normalizeConfidence(record.confidence),
  };
}

function selectProjectMemoryColumns(extended: boolean) {
  return extended
    ? "id, created_at, updated_at, key, category, status, title, value, content, next_action, priority, source, confidence"
    : "id, created_at, updated_at, category, status, title, content, next_action, priority, source";
}

export async function readProjectMemoryEntries() {
  const supabase = getProjectMemoryClient();

  console.info("[Project Memory] read");

  let response = await supabase
    .from("project_memory")
    .select(selectProjectMemoryColumns(true))
    .order("created_at", { ascending: false })
    .limit(50)
    .returns<ProjectMemoryRow[]>();

  if (
    response.error &&
    (response.error.message.includes("key") ||
      response.error.message.includes("value") ||
      response.error.message.includes("confidence"))
  ) {
    response = await supabase
      .from("project_memory")
      .select(selectProjectMemoryColumns(false))
      .order("created_at", { ascending: false })
      .limit(50)
      .returns<ProjectMemoryRow[]>();
  }

  const { data, error } = response;

  if (error) {
    throw new Error(`Failed to read project memory: ${error.message}`);
  }

  return (data ?? []).map(mapRow);
}

export async function createProjectMemoryEntry(
  input: ProjectMemoryCreateInput,
) {
  const supabase = getProjectMemoryClient();

  console.info("[Project Memory] create");

  const { data, error } = await supabase
    .from("project_memory")
    .insert({
      key: input.key ?? null,
      category: input.category ?? null,
      status: input.status ?? null,
      title: input.title,
      value: input.value ?? null,
      content: input.content ?? null,
      next_action: input.nextAction ?? null,
      priority: input.priority ?? null,
      source: input.source ?? null,
      confidence: input.confidence ?? null,
    })
    .select(selectProjectMemoryColumns(true))
    .single<ProjectMemoryRow>();

  if (error) {
    throw new Error(`Failed to create project memory: ${error.message}`);
  }

  return mapRow(data);
}

function proposalContent(proposal: ProjectMemoryUpdateProposal) {
  return `Memoire mise a jour par confirmation assistant: ${proposal.title} -> ${proposal.value}`;
}

async function readExistingMemoryByKey(key: string) {
  const supabase = getProjectMemoryClient();
  const { data, error } = await supabase
    .from("project_memory")
    .select(selectProjectMemoryColumns(true))
    .eq("key", key)
    .maybeSingle<ProjectMemoryRow>();

  if (error) {
    throw new Error(`Failed to read project memory key: ${error.message}`);
  }

  return data ? mapRow(data) : null;
}

async function writeProjectMemoryAudit({
  key,
  previous,
  next,
  source,
  userId,
}: {
  key: string;
  previous: ProjectMemoryEntry | null;
  next: ProjectMemoryUpdateProposal;
  source: string;
  userId: string;
}) {
  const supabase = getProjectMemoryClient();
  const { error } = await supabase.from("project_memory_audit_log").insert({
    memory_key: key,
    previous_value: previous,
    next_value: next,
    source,
    user_id: userId,
    confidence: next.confidence,
    user_confirmed: true,
  });

  if (error) {
    if (
      error.message.includes("project_memory_audit_log") ||
      error.message.includes("confidence") ||
      error.message.includes("user_confirmed")
    ) {
      console.warn("[Project Memory] audit log unavailable", {
        memoryKey: key,
        error: error.message,
      });
      return;
    }

    throw new Error(`Failed to audit project memory: ${error.message}`);
  }
}

export async function updateProjectMemory({
  proposal,
  userId,
}: {
  proposal: ProjectMemoryUpdateProposal;
  userId: string;
}) {
  const supabase = getProjectMemoryClient();
  const key = normalizeKey(proposal.key);

  if (!key) {
    throw new Error("Cle memoire projet invalide.");
  }

  const input = {
    key,
    category: proposal.category,
    status: proposal.status,
    title: proposal.title,
    value: proposal.value,
    content: proposalContent(proposal),
    next_action: null,
    priority: null,
    source: proposal.source,
    confidence: proposal.confidence,
  };
  const previous = await readExistingMemoryByKey(key);
  const query = previous
    ? supabase.from("project_memory").update(input).eq("key", key)
    : supabase.from("project_memory").insert(input);
  const { data, error } = await query
    .select(selectProjectMemoryColumns(true))
    .single<ProjectMemoryRow>();

  if (error) {
    throw new Error(`Failed to update project memory: ${error.message}`);
  }

  await writeProjectMemoryAudit({
    key,
    previous,
    next: { ...proposal, key },
    source: proposal.source,
    userId,
  });

  return mapRow(data);
}

function withPreviousValue(
  proposal: ProjectMemoryUpdateProposal | null,
  entries: ProjectMemoryEntry[] = [],
) {
  if (!proposal) {
    return null;
  }

  const previous = entries.find((entry) => entry.key === proposal.key);

  return {
    ...proposal,
    previousValue: previous?.value ?? previous?.status ?? null,
  };
}

export function inferProjectMemoryUpdate(
  message: string,
  entries: ProjectMemoryEntry[] = [],
): ProjectMemoryUpdateProposal | null {
  const normalized = message
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
  const source = "assistant";

  if (normalized.includes("tiktok") && normalized.includes("review")) {
    if (normalized.includes("valid")) {
      return withPreviousValue({
        key: "tiktok_review_status",
        category: "connexion",
        title: "TikTok review status",
        value: "validee",
        status: "valide",
        source,
        confidence: 0.92,
        impact: "TikTok Production peut sortir de la liste des reviews bloquantes si la production est aussi validee.",
      }, entries);
    }

    if (normalized.includes("report")) {
      return withPreviousValue({
        key: "tiktok_review_status",
        category: "connexion",
        title: "TikTok review status",
        value: "reportee",
        status: "reporte",
        source,
        confidence: 0.91,
        impact: "TikTok Production reste hors priorite immediate, TikTok Sandbox reste utilisable.",
      }, entries);
    }

    if (normalized.includes("sandbox")) {
      return withPreviousValue({
        key: "tiktok_review_status",
        category: "connexion",
        title: "TikTok review status",
        value: "sandbox",
        status: "sandbox",
        source,
        confidence: 0.86,
        impact: "TikTok reste limite a l'environnement Sandbox.",
      }, entries);
    }
  }

  if (normalized.includes("tiktok") && normalized.includes("sandbox")) {
    return withPreviousValue({
      key: "tiktok_access_status",
      category: "connexion",
      title: "TikTok access status",
      value: "reste en sandbox pour l'instant",
      status: "sandbox",
      source,
      confidence: 0.9,
      impact: "TikTok Sandbox reste fonctionnel, production non prioritaire.",
    }, entries);
  }

  if (
    normalized.includes("pinterest") &&
    normalized.includes("sandbox") &&
    (normalized.includes("reste") || normalized.includes("garde"))
  ) {
    return withPreviousValue({
      key: "pinterest_access_status",
      category: "connexion",
      title: "Pinterest access status",
      value: "reste en sandbox",
      status: "sandbox",
      source,
      confidence: 0.88,
      impact: "Pinterest Sandbox reste prioritaire, Production reste hors activation immediate.",
    }, entries);
  }

  if (normalized.includes("pinterest") && normalized.includes("production")) {
    if (normalized.includes("report")) {
      return withPreviousValue({
        key: "pinterest_access_status",
        category: "connexion",
        title: "Pinterest access status",
        value: "production reportee",
        status: "reporte",
        source,
        confidence: 0.9,
        impact: "Pinterest Production reste hors priorite immediate.",
      }, entries);
    }

    if (normalized.includes("valid") || normalized.includes("actif")) {
      return withPreviousValue({
        key: "pinterest_access_status",
        category: "connexion",
        title: "Pinterest access status",
        value: "production validee",
        status: "valide",
        source,
        confidence: 0.86,
        impact: "Pinterest Production peut redevenir actionnable apres controles.",
      }, entries);
    }
  }

  if (
    normalized.includes("visuels") &&
    normalized.includes("short") &&
    (normalized.includes("termine") || normalized.includes("fini"))
  ) {
    return withPreviousValue({
      key: "shorts_visual_module_status",
      category: "contenu",
      title: "Shorts visual module status",
      value: "termine",
      status: "termine",
      source,
      confidence: 0.88,
      impact: "Le module Visuels Shorts peut etre considere termine dans les vues cockpit.",
    }, entries);
  }

  if (
    normalized.includes("voix") &&
    (normalized.includes("prete") || normalized.includes("pret") || normalized.includes("termine"))
  ) {
    return withPreviousValue({
      key: "shorts_voice_status",
      category: "contenu",
      title: "Shorts voice status",
      value: "prete",
      status: "pret",
      source,
      confidence: 0.86,
      impact: "La voix Shorts peut etre consideree prete et rattachee a l'action Trajectoire correspondante.",
    }, entries);
  }

  if (normalized.includes("youtube") && normalized.includes("valid")) {
    return withPreviousValue({
      key: "youtube_connection_status",
      category: "connexion",
      title: "YouTube connection status",
      value: "validee",
      status: "valide",
      source,
      confidence: 0.84,
      impact: "YouTube reste disponible pour les tests controles.",
    }, entries);
  }

  if (normalized.includes("meta") && normalized.includes("valid")) {
    return withPreviousValue({
      key: "meta_connection_status",
      category: "connexion",
      title: "Meta connection status",
      value: "validee",
      status: "valide",
      source,
      confidence: 0.84,
      impact: "Meta reste disponible pour les modules controles.",
    }, entries);
  }

  if (normalized.includes("instagram") && normalized.includes("valid")) {
    return withPreviousValue({
      key: "instagram_connection_status",
      category: "connexion",
      title: "Instagram connection status",
      value: "validee",
      status: "valide",
      source,
      confidence: 0.84,
      impact: "Instagram reste disponible via Meta.",
    }, entries);
  }

  return withPreviousValue(null, entries);
}

export function getPriorityRank(priority: string | null) {
  const normalized = priority?.toLowerCase().trim();

  if (normalized === "haute" || normalized === "high" || normalized === "urgent") {
    return 0;
  }

  if (normalized === "moyenne" || normalized === "medium") {
    return 1;
  }

  if (normalized === "basse" || normalized === "low") {
    return 3;
  }

  return 2;
}

export function getPriorityProjectMemoryAction(entries: ProjectMemoryEntry[]) {
  return [...entries]
    .filter((entry) => entry.nextAction)
    .sort((left, right) => {
      const priorityDelta =
        getPriorityRank(left.priority) - getPriorityRank(right.priority);

      if (priorityDelta !== 0) {
        return priorityDelta;
      }

      return (
        new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()
      );
    })[0];
}
