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
  category: string | null;
  status: string | null;
  title: string;
  content: string | null;
  next_action: string | null;
  priority: string | null;
  source: string | null;
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

function mapRow(row: ProjectMemoryRow): ProjectMemoryEntry {
  return {
    id: row.id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    category: row.category,
    status: row.status,
    title: row.title,
    content: row.content,
    nextAction: row.next_action,
    priority: row.priority,
    source: row.source,
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
    title,
    category: normalizeText(record.category, 80),
    status: normalizeText(record.status, 80),
    content: normalizeText(record.content, 4000),
    nextAction: normalizeText(record.nextAction, 500),
    priority: normalizeText(record.priority, 40),
    source: normalizeText(record.source, 120),
  };
}

export async function readProjectMemoryEntries() {
  const supabase = getProjectMemoryClient();

  console.info("[Project Memory] read");

  const { data, error } = await supabase
    .from("project_memory")
    .select(
      "id, created_at, updated_at, category, status, title, content, next_action, priority, source",
    )
    .order("created_at", { ascending: false })
    .limit(50)
    .returns<ProjectMemoryRow[]>();

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
      category: input.category ?? null,
      status: input.status ?? null,
      title: input.title,
      content: input.content ?? null,
      next_action: input.nextAction ?? null,
      priority: input.priority ?? null,
      source: input.source ?? null,
    })
    .select(
      "id, created_at, updated_at, category, status, title, content, next_action, priority, source",
    )
    .single<ProjectMemoryRow>();

  if (error) {
    throw new Error(`Failed to create project memory: ${error.message}`);
  }

  return mapRow(data);
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
