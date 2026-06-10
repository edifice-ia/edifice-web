import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getOAuthToken } from "@/lib/server/oauth/token-store";
import { pinterestOAuthAccounts } from "@/lib/server/oauth/pinterest-accounts";
import {
  suggestPinterestBoard,
  type PinterestBoardSuggestionConfidence,
} from "@/lib/pinterest-board-suggestions";

const PINTEREST_PRODUCTION_API_URL = "https://api.pinterest.com/v5";
const PINTEREST_SANDBOX_API_URL = "https://api-sandbox.pinterest.com/v5";

export type PinterestEnvironment = "production" | "sandbox";
export type PinterestAccessLevel = "trial" | "production";

export type PinterestPublisherDiagnostic = {
  apiBaseUrl: string;
  createPinUrl: string;
  environment: PinterestEnvironment;
  accessLevel: PinterestAccessLevel;
  environmentLabel: "Pinterest Trial" | "Pinterest Production";
  createPinsCompatible: boolean;
  compatibilityMessage: string;
};

export type PinterestPublisherPin = {
  id: string;
  localId: string;
  accountId: string;
  accountName: string | null;
  title: string | null;
  description: string | null;
  keywords: string[];
  niche: string | null;
  boardId: string | null;
  boardName: string | null;
  suggestedBoardId: string | null;
  suggestedBoardName: string | null;
  boardSuggestionReason: string | null;
  boardSuggestionConfidence: PinterestBoardSuggestionConfidence | null;
  status: string;
  targetUrl: string | null;
  imageUrl: string | null;
  storagePath: string | null;
  pinUrl: string | null;
  pinterestPinId: string | null;
  publishedAt: string | null;
  reviewNotes: string | null;
  lastError: string | null;
};

export type PinterestBoard = {
  id: string;
  name: string;
  accountKey: string;
  description: string | null;
};

type PinterestPinRow = {
  id: string;
  local_id: string;
  account_id: string;
  account_name: string | null;
  title: string | null;
  description: string | null;
  keywords?: string[] | null;
  niche?: string | null;
  board_id: string | null;
  board_name: string | null;
  suggested_board_id?: string | null;
  suggested_board_name?: string | null;
  board_suggestion_reason?: string | null;
  board_suggestion_confidence?: PinterestBoardSuggestionConfidence | null;
  status: string;
  target_url: string | null;
  public_image_url: string | null;
  storage_path: string | null;
  pin_url: string | null;
  pinterest_pin_id?: string | null;
  published_at: string | null;
  review_notes?: string | null;
  last_error?: string | null;
};

type PinterestBoardsResponse = {
  items?: Array<{
    id?: string;
    name?: string;
    description?: string | null;
  }>;
};

type PinterestCreatePinResponse = {
  id?: string;
  url?: string;
  link?: string;
  board_id?: string;
  board_owner?: {
    username?: string;
  };
};

let pinterestPublisherClient: SupabaseClient | null = null;

function normalizePinterestEnvironment(value: string | undefined): PinterestEnvironment {
  return value?.trim().toLowerCase() === "sandbox" ? "sandbox" : "production";
}

function normalizePinterestAccessLevel(value: string | undefined): PinterestAccessLevel {
  return value?.trim().toLowerCase() === "production" ? "production" : "trial";
}

export function getPinterestPublisherDiagnostic(): PinterestPublisherDiagnostic {
  const environment = normalizePinterestEnvironment(process.env.PINTEREST_ENVIRONMENT);
  const accessLevel = normalizePinterestAccessLevel(process.env.PINTEREST_ACCESS_LEVEL);
  const apiBaseUrl =
    environment === "sandbox" ? PINTEREST_SANDBOX_API_URL : PINTEREST_PRODUCTION_API_URL;
  const createPinsCompatible = accessLevel === "production" || environment === "sandbox";

  return {
    apiBaseUrl,
    createPinUrl: `${apiBaseUrl}/pins`,
    environment,
    accessLevel,
    environmentLabel:
      accessLevel === "production" ? "Pinterest Production" : "Pinterest Trial",
    createPinsCompatible,
    compatibilityMessage: createPinsCompatible
      ? "Creation de pins compatible avec la configuration actuelle."
      : "Trial Access detecte: la creation de pins doit utiliser l'API Sandbox.",
  };
}

function getPinterestPublisherClient() {
  if (pinterestPublisherClient) {
    return pinterestPublisherClient;
  }

  const supabaseUrl = process.env.SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Pinterest Publisher requiert SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY.");
  }

  pinterestPublisherClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return pinterestPublisherClient;
}

function mapPin(row: PinterestPinRow): PinterestPublisherPin {
  return {
    id: row.id,
    localId: row.local_id,
    accountId: row.account_id,
    accountName: row.account_name,
    title: row.title,
    description: row.description,
    keywords: row.keywords ?? [],
    niche: row.niche ?? null,
    boardId: row.board_id,
    boardName: row.board_name,
    suggestedBoardId: row.suggested_board_id ?? null,
    suggestedBoardName: row.suggested_board_name ?? null,
    boardSuggestionReason: row.board_suggestion_reason ?? null,
    boardSuggestionConfidence: row.board_suggestion_confidence ?? null,
    status: row.status,
    targetUrl: row.target_url,
    imageUrl: row.public_image_url,
    storagePath: row.storage_path,
    pinUrl: row.pin_url,
    pinterestPinId: row.pinterest_pin_id ?? null,
    publishedAt: row.published_at,
    reviewNotes: row.review_notes ?? null,
    lastError: row.last_error ?? null,
  };
}

export async function readPinterestPublisherPins() {
  const supabase = getPinterestPublisherClient();
  const baseColumns =
    "id, local_id, account_id, account_name, title, description, keywords, niche, board_id, board_name, status, target_url, public_image_url, storage_path, pin_url, published_at";
  const optionalColumns =
    "pinterest_pin_id, review_notes, last_error, suggested_board_id, suggested_board_name, board_suggestion_reason, board_suggestion_confidence";

  let response: {
    data: unknown[] | null;
    error: { message: string } | null;
  } = await supabase
    .from("pinterest_pins")
    .select(`${baseColumns}, ${optionalColumns}`)
    .order("created_at", { ascending: false })
    .limit(200);

  if (
    response.error &&
    (response.error.message.includes("pinterest_pin_id") ||
      response.error.message.includes("last_error") ||
      response.error.message.includes("suggested_board_id") ||
      response.error.message.includes("board_suggestion"))
  ) {
    response = await supabase
      .from("pinterest_pins")
      .select(`${baseColumns}, review_notes`)
      .order("created_at", { ascending: false })
      .limit(200);
  }

  if (response.error) {
    throw new Error(`Lecture pinterest_pins impossible: ${response.error.message}`);
  }

  return ((response.data ?? []) as PinterestPinRow[]).map(mapPin);
}

async function pinterestGetBoards(accountKey: string): Promise<PinterestBoard[]> {
  const token = await getOAuthToken("pinterest", undefined, accountKey);
  const diagnostic = getPinterestPublisherDiagnostic();

  if (!token?.accessToken) {
    return [];
  }

  const boardsUrl = `${diagnostic.apiBaseUrl}/boards?page_size=100`;
  console.info("[Pinterest Publisher] boards request", {
    url: boardsUrl,
    environment: diagnostic.environment,
    accessLevel: diagnostic.accessLevel,
    accountKey,
  });

  const response = await fetch(boardsUrl, {
    headers: {
      Authorization: `Bearer ${token.accessToken}`,
      Accept: "application/json",
    },
    cache: "no-store",
  });
  const payload = (await response.json()) as PinterestBoardsResponse & {
    message?: string;
  };

  if (!response.ok) {
    console.warn("[Pinterest Publisher] boards read failed", {
      accountKey,
      status: response.status,
      message: payload.message ?? null,
    });
    return [];
  }

  return (payload.items ?? [])
    .filter((board) => board.id && board.name)
    .map((board) => ({
      id: board.id as string,
      name: board.name as string,
      accountKey,
      description: board.description ?? null,
    }));
}

export async function readPinterestPublisherBoards() {
  const boardGroups = await Promise.all(
    pinterestOAuthAccounts.map((account) => pinterestGetBoards(account.accountKey)),
  );

  return boardGroups.flat();
}

export async function refreshPinterestBoardSuggestions() {
  const supabase = getPinterestPublisherClient();
  const [pins, boards] = await Promise.all([
    readPinterestPublisherPins(),
    readPinterestPublisherBoards(),
  ]);
  let suggestionsUpdated = 0;

  for (const pin of pins) {
    if (pin.status === "published") {
      continue;
    }

    const suggestion = suggestPinterestBoard(pin, boards);

    if (suggestion.source === "none") {
      continue;
    }

    const { error } = await supabase
      .from("pinterest_pins")
      .update({
        suggested_board_id: suggestion.boardId,
        suggested_board_name: suggestion.boardName,
        board_suggestion_reason: suggestion.reason,
        board_suggestion_confidence: suggestion.confidence,
      })
      .eq("id", pin.id);

    if (error) {
      throw new Error(`Suggestion board Pinterest impossible: ${error.message}`);
    }

    suggestionsUpdated += 1;
  }

  return {
    suggestionsUpdated,
    pins: await readPinterestPublisherPins(),
  };
}

export async function publishOnePinterestPin({
  pinId,
  boardId,
  boardName,
}: {
  pinId: string;
  boardId: string;
  boardName: string;
}) {
  const supabase = getPinterestPublisherClient();
  const { data, error } = await supabase
    .from("pinterest_pins")
    .select(
      "id, local_id, account_id, account_name, title, description, keywords, niche, board_id, board_name, status, target_url, public_image_url, storage_path, pin_url, published_at, review_notes",
    )
    .eq("id", pinId)
    .maybeSingle<PinterestPinRow>();

  if (error) {
    throw new Error(`Lecture du pin impossible: ${error.message}`);
  }

  if (!data) {
    throw new Error("Pin Pinterest introuvable.");
  }

  if (data.status === "published" || data.published_at) {
    throw new Error("Ce pin est deja publie.");
  }

  if (!data.public_image_url) {
    throw new Error("Image publique absente pour ce pin.");
  }

  if (!data.title || !data.description || !data.target_url) {
    throw new Error("Titre, description ou target_url manquant.");
  }

  const token = await getOAuthToken("pinterest", undefined, data.account_id);
  if (!token?.accessToken) {
    throw new Error(`Token Pinterest absent pour ${data.account_id}.`);
  }

  const publishBody = {
    board_id: boardId,
    title: data.title,
    description: data.description,
    link: data.target_url,
    media_source: {
      source_type: "image_url",
      url: data.public_image_url,
    },
  };
  const diagnostic = getPinterestPublisherDiagnostic();
  const createPinUrl = diagnostic.createPinUrl;

  console.info("[Pinterest Publisher] create pin request", {
    url: createPinUrl,
    environment: diagnostic.environment,
    accessLevel: diagnostic.accessLevel,
    environmentLabel: diagnostic.environmentLabel,
    createPinsCompatible: diagnostic.createPinsCompatible,
    accountKey: data.account_id,
    pinId,
    boardId,
  });

  try {
    const response = await fetch(createPinUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token.accessToken}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(publishBody),
      cache: "no-store",
    });
    const payload = (await response.json()) as PinterestCreatePinResponse & {
      message?: string;
      code?: number;
    };

    console.info("[Pinterest Publisher] create pin response", {
      url: createPinUrl,
      environment: diagnostic.environment,
      accessLevel: diagnostic.accessLevel,
      status: response.status,
      success: response.ok,
      pinterestPinIdPresent: Boolean(payload.id),
      message: payload.message ?? null,
      code: payload.code ?? null,
    });

    if (!response.ok || !payload.id) {
      const message = payload.message ?? `Pinterest API HTTP ${response.status}`;
      await recordPinterestPublishError(pinId, message);
      throw new Error(message);
    }

    const publishedAt = new Date().toISOString();
    const pinUrl =
      payload.url ??
      `https://www.pinterest.com/pin/${payload.id}/`;
    const update = {
      pinterest_pin_id: payload.id,
      pin_url: pinUrl,
      published_at: publishedAt,
      board_id: boardId,
      board_name: boardName,
      status: "published",
      last_error: null,
      review_notes: data.review_notes ?? null,
    };

    const { error: updateError } = await supabase
      .from("pinterest_pins")
      .update(update)
      .eq("id", pinId);

    if (updateError) {
      throw new Error(`Publication reussie mais mise a jour Supabase impossible: ${updateError.message}`);
    }

    return {
      ok: true,
      pinterestPinId: payload.id,
      pinUrl,
      publishedAt,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Publication Pinterest impossible.";
    await recordPinterestPublishError(pinId, message);
    throw error;
  }
}

async function recordPinterestPublishError(pinId: string, message: string) {
  const supabase = getPinterestPublisherClient();
  const { error } = await supabase
    .from("pinterest_pins")
    .update({
      last_error: message,
      review_notes: message,
    })
    .eq("id", pinId);

  if (error) {
    console.warn("[Pinterest Publisher] error recording failed", {
      pinId,
      message: error.message,
    });
  }
}
