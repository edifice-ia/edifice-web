import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export const pinterestReviewStatuses = [
  "pending",
  "approved",
  "needs_revision",
  "rejected",
] as const;

export type PinterestReviewStatus = (typeof pinterestReviewStatuses)[number];

type PinterestReviewInput = {
  accountId: string;
  localId: string;
  reviewStatus: PinterestReviewStatus;
  reviewNotes: string | null;
  reviewedBy: string;
};

let pinterestReviewsClient: SupabaseClient | null = null;

function getPinterestReviewsClient() {
  if (pinterestReviewsClient) {
    return pinterestReviewsClient;
  }

  const supabaseUrl =
    process.env.SUPABASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("La validation Pinterest requiert la configuration Supabase serveur.");
  }

  pinterestReviewsClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return pinterestReviewsClient;
}

function normalizeText(value: unknown, maxLength: number) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized ? normalized.slice(0, maxLength) : null;
}

export function sanitizePinterestReviewInput(
  input: unknown,
  reviewedBy: string,
): PinterestReviewInput {
  const record = input && typeof input === "object" ? input as Record<string, unknown> : {};
  const accountId = normalizeText(record.accountId, 120);
  const localId = normalizeText(record.localId, 240);
  const reviewStatus = normalizeText(record.reviewStatus, 40);

  if (!accountId || !localId) {
    throw new Error("Le compte et l'identifiant du pin sont obligatoires.");
  }

  if (!pinterestReviewStatuses.includes(reviewStatus as PinterestReviewStatus)) {
    throw new Error("Statut de validation Pinterest invalide.");
  }

  return {
    accountId,
    localId,
    reviewStatus: reviewStatus as PinterestReviewStatus,
    reviewNotes: normalizeText(record.reviewNotes, 2000),
    reviewedBy: normalizeText(reviewedBy, 240) ?? "atelier_pinterest",
  };
}

export async function updatePinterestPinReview(input: PinterestReviewInput) {
  const reviewedAt = new Date().toISOString();
  const { data, error } = await getPinterestReviewsClient()
    .from("pinterest_pins")
    .update({
      review_status: input.reviewStatus,
      reviewed_at: reviewedAt,
      reviewed_by: input.reviewedBy,
      review_notes: input.reviewNotes,
    })
    .eq("account_id", input.accountId)
    .eq("local_id", input.localId)
    .select("account_id, local_id, review_status, reviewed_at, reviewed_by, review_notes")
    .maybeSingle();

  if (error) {
    throw new Error(`Validation Pinterest impossible: ${error.message}`);
  }

  if (!data) {
    throw new Error("Pin Pinterest introuvable dans Supabase.");
  }

  return {
    accountId: data.account_id,
    localId: data.local_id,
    reviewStatus: data.review_status as PinterestReviewStatus,
    reviewedAt: data.reviewed_at as string,
    reviewedBy: data.reviewed_by as string,
    reviewNotes: (data.review_notes as string | null) ?? "",
  };
}
