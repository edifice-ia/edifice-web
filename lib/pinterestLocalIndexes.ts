import "server-only";

import { createClient } from "@supabase/supabase-js";
import type { Dirent } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

export type PinterestWorkshopStatus =
  | "generated"
  | "visual_ready"
  | "ready_to_publish"
  | "dry_run"
  | "published"
  | "error";

export type PinterestWorkshopItem = {
  id: string;
  postId: string;
  accountName: string;
  theme: string;
  title: string;
  description: string;
  boardName: string;
  link: string;
  visualCategory: string;
  selectedVisualPath: string;
  selectedVisualFilename: string;
  finalPinPath: string;
  finalPinFilename: string;
  accountId: string;
  imageId: string;
  imagePath: string;
  imageUrl: string;
  imageSourceField: string;
  keywords: string;
  createdAt: string;
  scheduledDate: string;
  scheduledTime: string;
  publishStatus: string;
  pinterestPinUrl: string;
  notes: string;
  badges: PinterestWorkshopStatus[];
};

export type PinterestWorkshopStats = {
  postsGenerated: number;
  pinsWithVisuals: number;
  pinsReadyToPublish: number;
  pinsPendingPublication: number;
};

export type PinterestLocalIndexFile = {
  key: "posts_queue" | "posts_with_visuals" | "final_pins_index" | "publishing_queue";
  label: string;
  path: string;
  format: "csv" | "supabase";
  count: number;
  exists: boolean;
  fields: string[];
  lastError: string | null;
  source: "supabase" | "snapshot" | "global" | "account_fallback";
};

export type PinterestAccountWorkshop = {
  id: string;
  name: string;
  niche: string;
  stats: PinterestWorkshopStats;
  rawStats: {
    posts_queue: number;
    posts_with_visuals: number;
    final_pins: number;
    publishing_queue: number;
    ready_to_publish: number;
    dry_run: number;
    images_ready: number;
    visuals_index: number;
  };
  boards: string[];
  imagesReady: string[];
  readyPins: PinterestWorkshopItem[];
  publicationQueue: PinterestWorkshopItem[];
  indexFiles: PinterestLocalIndexFile[];
};

export type PinterestWorkshopIndexes = {
  sourceAvailable: boolean;
  dataSource: "supabase" | "snapshot_local";
  message: string | null;
  stats: PinterestWorkshopStats;
  accounts: PinterestAccountWorkshop[];
  readyPins: PinterestWorkshopItem[];
  publicationQueue: PinterestWorkshopItem[];
  indexFiles: PinterestLocalIndexFile[];
  updatedAt: string | null;
  indexes: {
    postsQueue: number;
    postsWithVisuals: number;
    finalPins: number;
    publishingQueue: number;
  };
};

type CsvRow = Record<string, string>;
type CsvReadResult = {
  exists: boolean;
  path: string;
  fields: string[];
  rows: CsvRow[];
  lastError: string | null;
};

type SnapshotAccount = {
  id: string;
  name: string;
  niche: string;
  sources: Record<string, string>;
  stats: PinterestAccountWorkshop["rawStats"];
  boards?: string[];
  images?: {
    pins_ready?: string[];
  };
  posts_queue?: CsvRow[];
  posts_with_visuals?: CsvRow[];
  final_pins_index?: CsvRow[];
  publishing_queue?: CsvRow[];
};

type PinterestSnapshot = {
  synced_at: string;
  accounts: SnapshotAccount[];
  totals: {
    posts_queue: number;
    posts_with_visuals: number;
    final_pins: number;
    publishing_queue: number;
    ready_to_publish?: number;
    dry_run?: number;
    images_ready?: number;
  };
};

type SupabasePinterestPin = {
  local_id: string;
  account_id: string;
  account_name: string | null;
  niche: string | null;
  title: string | null;
  description: string | null;
  keywords: string[] | null;
  board_name: string | null;
  board_id: string | null;
  status: string | null;
  source_post_id: string | null;
  local_image_path: string | null;
  storage_bucket: string | null;
  storage_path: string | null;
  public_image_url: string | null;
  pin_url: string | null;
  published_at: string | null;
  created_at: string | null;
  updated_at: string | null;
  raw_payload: Record<string, unknown> | null;
};

const PINTEREST_INDEX_DIR =
  process.env.PINTEREST_LOCAL_INDEX_DIR?.trim() ||
  String.raw`D:\Edifice_IA\projets\Pinterest`;
const PINTEREST_SEARCH_ROOT = String.raw`D:\Edifice_IA`;
const PINTEREST_SNAPSHOT_PATH = path.join(
  process.cwd(),
  "data",
  "pinterest",
  "pinterest_snapshot.json",
);

const emptyStats: PinterestWorkshopStats = {
  postsGenerated: 0,
  pinsWithVisuals: 0,
  pinsReadyToPublish: 0,
  pinsPendingPublication: 0,
};

const indexFileDefinitions = [
  {
    key: "posts_queue",
    label: "posts_queue",
    fileName: "posts_queue_global.csv",
    accountFileNames: [
      "edifice_discipline\\posts_queue.csv",
      "solution_sommeil\\posts_queue.csv",
    ],
  },
  {
    key: "posts_with_visuals",
    label: "posts_with_visuals",
    fileName: "posts_with_visuals_global.csv",
    accountFileNames: [
      "edifice_discipline\\posts_with_visuals.csv",
      "solution_sommeil\\posts_with_visuals.csv",
    ],
  },
  {
    key: "final_pins_index",
    label: "final_pins_index",
    fileName: "final_pins_index_global.csv",
    accountFileNames: [
      "edifice_discipline\\final_pins_index.csv",
      "solution_sommeil\\final_pins_index.csv",
    ],
  },
  {
    key: "publishing_queue",
    label: "publishing_queue",
    fileName: "publishing_queue_global.csv",
    accountFileNames: [
      "edifice_discipline\\publishing_queue.csv",
      "solution_sommeil\\publishing_queue.csv",
    ],
  },
] as const;

function csvPath(fileName: string) {
  return `${PINTEREST_INDEX_DIR.replace(/[\\/]+$/, "")}\\${fileName}`;
}

function uniqueValues(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}

function candidateCsvPaths(fileName: string) {
  return uniqueValues([
    csvPath(fileName),
    path.win32.join(String.raw`D:\Edifice_IA\projets\Pinterest`, fileName),
  ]);
}

function basename(value: string) {
  return value.split(/[\\/]/).pop() ?? "";
}

function splitCsvLine(line: string) {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    const nextCharacter = line[index + 1];

    if (character === '"' && inQuotes && nextCharacter === '"') {
      current += '"';
      index += 1;
      continue;
    }

    if (character === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (character === "," && !inQuotes) {
      values.push(current);
      current = "";
      continue;
    }

    current += character;
  }

  values.push(current);
  return values.map((value) => value.trim());
}

function splitCsvRecords(content: string) {
  const records: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < content.length; index += 1) {
    const character = content[index];
    const nextCharacter = content[index + 1];

    if (character === '"' && inQuotes && nextCharacter === '"') {
      current += character;
      current += nextCharacter;
      index += 1;
      continue;
    }

    if (character === '"') {
      inQuotes = !inQuotes;
    }

    if ((character === "\n" || character === "\r") && !inQuotes) {
      if (current.trim()) {
        records.push(current);
      }
      current = "";
      if (character === "\r" && nextCharacter === "\n") {
        index += 1;
      }
      continue;
    }

    current += character;
  }

  if (current.trim()) {
    records.push(current);
  }

  return records;
}

function parseCsv(content: string): { fields: string[]; rows: CsvRow[] } {
  const records = splitCsvRecords(content.replace(/^\uFEFF/, ""));
  const [headerLine, ...dataLines] = records;

  if (!headerLine) {
    return {
      fields: [],
      rows: [],
    };
  }

  const headers = splitCsvLine(headerLine);
  return {
    fields: headers,
    rows: dataLines.map((line) => {
      const values = splitCsvLine(line);
      return Object.fromEntries(
        headers.map((header, index) => [header, values[index] ?? ""]),
      );
    }),
  };
}

async function findFilesByName(root: string, fileName: string): Promise<string[]> {
  const matches: string[] = [];
  const targetName = path.win32.basename(fileName).toLowerCase();

  async function walk(currentDir: string) {
    let entries: Dirent[];

    try {
      entries = await readdir(currentDir, { withFileTypes: true });
    } catch {
      return;
    }

    await Promise.all(
      entries.map(async (entry) => {
        const currentPath = path.win32.join(currentDir, entry.name);

        if (entry.isDirectory()) {
          await walk(currentPath);
          return;
        }

        if (entry.isFile() && entry.name.toLowerCase() === targetName) {
          matches.push(currentPath);
        }
      }),
    );
  }

  await walk(root);
  return matches.sort((left, right) => {
    const leftIsPinterestProject = left.includes("\\projets\\Pinterest\\") ? 0 : 1;
    const rightIsPinterestProject = right.includes("\\projets\\Pinterest\\") ? 0 : 1;
    if (leftIsPinterestProject !== rightIsPinterestProject) {
      return leftIsPinterestProject - rightIsPinterestProject;
    }

    const leftIsGlobal =
      path.win32.basename(left).toLowerCase() === targetName && !left.includes("\\SCRIPT\\")
        ? 0
        : 1;
    const rightIsGlobal =
      path.win32.basename(right).toLowerCase() === targetName && !right.includes("\\SCRIPT\\")
        ? 0
        : 1;
    return leftIsGlobal - rightIsGlobal || left.localeCompare(right);
  });
}

async function readCsvPath(filePath: string): Promise<CsvReadResult> {
  try {
    const content = await readFile(filePath, "utf-8");
    const parsedCsv = parseCsv(content);
    return {
      exists: true,
      path: filePath,
      fields: parsedCsv.fields,
      rows: parsedCsv.rows,
      lastError: null,
    };
  } catch (error) {
    return {
      exists: false,
      path: filePath,
      fields: [],
      rows: [],
      lastError: error instanceof Error ? error.message : String(error),
    };
  }
}

async function readCsv(fileName: string): Promise<CsvReadResult> {
  const directResults = await Promise.all(
    candidateCsvPaths(fileName).map((filePath) => readCsvPath(filePath)),
  );
  const directMatch = directResults.find((result) => result.rows.length > 0);

  if (directMatch) {
    return directMatch;
  }

  const discoveredPaths = await findFilesByName(PINTEREST_SEARCH_ROOT, fileName);
  const discoveredResults = await Promise.all(
    discoveredPaths.map((filePath) => readCsvPath(filePath)),
  );
  const discoveredMatch = discoveredResults.find((result) => result.rows.length > 0);

  if (discoveredMatch) {
    return discoveredMatch;
  }

  return (
    directResults.find((result) => result.exists) ??
    discoveredResults.find((result) => result.exists) ??
    directResults[0] ?? {
      exists: false,
      path: csvPath(fileName),
      fields: [],
      rows: [],
      lastError: "Index Pinterest introuvable.",
    }
  );
}

async function readIndex(
  definition: (typeof indexFileDefinitions)[number],
): Promise<CsvReadResult & { source: "global" | "account_fallback" }> {
  const globalResult = await readCsv(definition.fileName);

  if (globalResult.rows.length > 0) {
    return {
      ...globalResult,
      source: "global",
    };
  }

  const accountResults = await Promise.all(
    definition.accountFileNames.map((fileName) => readCsv(fileName)),
  );
  const fallbackRows = accountResults.flatMap((result) => result.rows);
  const fallbackFields =
    accountResults.find((result) => result.fields.length > 0)?.fields ?? [];
  const fallbackExists = accountResults.some((result) => result.exists);
  const fallbackErrors = [
    globalResult.lastError,
    ...accountResults
      .filter((result) => !result.exists)
      .map((result) => result.lastError),
  ].filter((error): error is string => Boolean(error));

  return {
    exists: fallbackExists,
    path: accountResults
      .filter((result) => result.exists)
      .map((result) => result.path)
      .join(" ; "),
    fields: fallbackFields,
    rows: fallbackRows,
    lastError: fallbackRows.length > 0 ? null : fallbackErrors[0] ?? null,
    source: "account_fallback",
  };
}

function buildIndexFile(
  definition: (typeof indexFileDefinitions)[number],
  result: Awaited<ReturnType<typeof readIndex>>,
): PinterestLocalIndexFile {
  return {
    key: definition.key,
    label: definition.label,
    path: result.path || csvPath(definition.fileName),
    format: "csv",
    count: result.rows.length,
    exists: result.exists,
    fields: result.fields,
    lastError: result.lastError,
    source: result.source,
  };
}

function value(row: CsvRow, key: string) {
  return row[key]?.trim() ?? "";
}

function firstValue(row: CsvRow, keys: string[]) {
  for (const key of keys) {
    const currentValue = value(row, key);
    if (currentValue) {
      return {
        key,
        value: currentValue,
      };
    }
  }

  return {
    key: "",
    value: "",
  };
}

function isVisualReady(row: CsvRow) {
  const status = value(row, "visual_selection_status");
  return ["exact", "fallback", "generated", "generated_for_variety"].includes(status);
}

function isFinalPinReady(row: CsvRow) {
  return ["created", "skipped"].includes(value(row, "pin_creation_status"));
}

function normalizeAccountName(accountName: string) {
  if (accountName === "edifice_discipline") {
    return "Edifice Discipline";
  }
  if (accountName === "solution_sommeil") {
    return "Solution Sommeil";
  }
  return accountName || "Pinterest";
}

function buildBadges(options: {
  generated?: boolean;
  visualReady?: boolean;
  finalReady?: boolean;
  publishStatus?: string;
}) {
  const badges: PinterestWorkshopStatus[] = [];

  if (options.generated) {
    badges.push("generated");
  }
  if (options.visualReady) {
    badges.push("visual_ready");
  }
  if (options.finalReady || options.publishStatus === "ready_to_publish") {
    badges.push("ready_to_publish");
  }
  if (options.publishStatus === "dry_run") {
    badges.push("dry_run");
  }
  if (options.publishStatus === "published") {
    badges.push("published");
  }
  if (options.publishStatus === "failed" || options.publishStatus === "error") {
    badges.push("error");
  }

  return [...new Set(badges)];
}

function mapItem(row: CsvRow, fallbackId: string, accountId = ""): PinterestWorkshopItem {
  const postId = value(row, "post_id") || fallbackId;
  const publishStatus = value(row, "publish_status");
  const normalizedAccountId = accountId || value(row, "account_name");
  const visualReady =
    Boolean(value(row, "selected_visual_filename")) ||
    Boolean(value(row, "selected_visual_path")) ||
    isVisualReady(row);
  const finalReady =
    Boolean(value(row, "final_pin_filename")) ||
    Boolean(value(row, "final_pin_path")) ||
    isFinalPinReady(row);
  const image = firstValue(row, [
    "image_path",
    "visual_path",
    "image_file",
    "thumbnail",
    "image_url",
    "final_pin_path",
    "selected_visual_path",
    "final_pin_filename",
    "selected_visual_filename",
  ]);

  return {
    id: value(row, "publish_id") || postId,
    postId,
    accountId: normalizedAccountId,
    accountName: normalizeAccountName(value(row, "account_name")),
    theme: value(row, "theme"),
    title: value(row, "title"),
    description: value(row, "description"),
    boardName: value(row, "board_name"),
    link: value(row, "link"),
    visualCategory: value(row, "visual_category"),
    selectedVisualPath: value(row, "selected_visual_path"),
    selectedVisualFilename:
      value(row, "selected_visual_filename") ||
      basename(value(row, "selected_visual_path")),
    finalPinPath: value(row, "final_pin_path"),
    finalPinFilename:
      value(row, "final_pin_filename") ||
      basename(value(row, "final_pin_path")),
    imageId: normalizedAccountId && postId ? `${normalizedAccountId}:${postId}` : "",
    imagePath: image.value,
    imageUrl: image.value.startsWith("http") ? image.value : "",
    imageSourceField: image.key,
    keywords: value(row, "keywords") || value(row, "hashtags"),
    createdAt: value(row, "created_at") || value(row, "published_at"),
    scheduledDate: value(row, "scheduled_date"),
    scheduledTime: value(row, "scheduled_time"),
    publishStatus,
    pinterestPinUrl: value(row, "pinterest_pin_url"),
    notes: value(row, "notes"),
    badges: buildBadges({
      generated: Boolean(value(row, "title")),
      visualReady,
      finalReady,
      publishStatus,
    }),
  };
}

function mergeRows(primary: CsvRow, secondary: CsvRow | undefined): CsvRow {
  return {
    ...(secondary ?? {}),
    ...Object.fromEntries(
      Object.entries(primary).filter(([, currentValue]) => currentValue.trim()),
    ),
  };
}

function byPostId(rows: CsvRow[]) {
  return new Map(rows.map((row) => [value(row, "post_id"), row]));
}

function fieldsOf(rows: CsvRow[]) {
  return rows[0] ? Object.keys(rows[0]) : [];
}

function snapshotIndexFile(options: {
  key: PinterestLocalIndexFile["key"];
  label: string;
  path: string;
  rows: CsvRow[];
}): PinterestLocalIndexFile {
  return {
    key: options.key,
    label: options.label,
    path: options.path,
    format: "csv",
    count: options.rows.length,
    exists: Boolean(options.path),
    fields: fieldsOf(options.rows),
    lastError: null,
    source: "snapshot",
  };
}

function buildAccountWorkshop(account: SnapshotAccount): PinterestAccountWorkshop {
  const postsQueue = account.posts_queue ?? [];
  const postsWithVisuals = account.posts_with_visuals ?? [];
  const finalPins = account.final_pins_index ?? [];
  const publishingQueue = account.publishing_queue ?? [];
  const visualRowsByPostId = byPostId(postsWithVisuals);
  const finalPinsByPostId = byPostId(finalPins);
  const readyToPublishRows = publishingQueue.filter(
    (row) => value(row, "publish_status") === "ready_to_publish",
  );
  const readyPins = readyToPublishRows.map((row, index) =>
    mapItem(
      mergeRows(row, {
        ...visualRowsByPostId.get(value(row, "post_id")),
        ...finalPinsByPostId.get(value(row, "post_id")),
      }),
      `${account.id}-pin-${index + 1}`,
      account.id,
    ),
  );
  const publicationQueue = publishingQueue.map((row, index) =>
    mapItem(
      mergeRows(row, {
        ...visualRowsByPostId.get(value(row, "post_id")),
        ...finalPinsByPostId.get(value(row, "post_id")),
      }),
      `${account.id}-queue-${index + 1}`,
      account.id,
    ),
  );

  return {
    id: account.id,
    name: account.name,
    niche: account.niche,
    stats: {
      postsGenerated: postsQueue.length,
      pinsWithVisuals: postsWithVisuals.filter(isVisualReady).length,
      pinsReadyToPublish: readyToPublishRows.length,
      pinsPendingPublication: publishingQueue.length,
    },
    rawStats: {
      posts_queue: postsQueue.length,
      posts_with_visuals: postsWithVisuals.length,
      final_pins: finalPins.length,
      publishing_queue: publishingQueue.length,
      ready_to_publish: readyToPublishRows.length,
      dry_run: publishingQueue.filter((row) => value(row, "publish_status") === "dry_run")
        .length,
      images_ready: account.images?.pins_ready?.length ?? 0,
      visuals_index: account.stats?.visuals_index ?? 0,
    },
    boards: account.boards ?? [],
    imagesReady: account.images?.pins_ready ?? [],
    readyPins,
    publicationQueue,
    indexFiles: [
      snapshotIndexFile({
        key: "posts_queue",
        label: `${account.id} / posts_queue`,
        path: account.sources.posts_queue,
        rows: postsQueue,
      }),
      snapshotIndexFile({
        key: "posts_with_visuals",
        label: `${account.id} / posts_with_visuals`,
        path: account.sources.posts_with_visuals,
        rows: postsWithVisuals,
      }),
      snapshotIndexFile({
        key: "final_pins_index",
        label: `${account.id} / final_pins_index`,
        path: account.sources.final_pins_index,
        rows: finalPins,
      }),
      snapshotIndexFile({
        key: "publishing_queue",
        label: `${account.id} / publishing_queue`,
        path: account.sources.publishing_queue,
        rows: publishingQueue,
      }),
    ],
  };
}

async function readPinterestSnapshot(): Promise<PinterestSnapshot | null> {
  try {
    return JSON.parse(await readFile(PINTEREST_SNAPSHOT_PATH, "utf-8")) as PinterestSnapshot;
  } catch {
    return null;
  }
}

function supabasePinToCsvRow(pin: SupabasePinterestPin, storageImageUrl: string): CsvRow {
  const supabaseImageUrl = pin.public_image_url || storageImageUrl;
  const hasImage = Boolean(supabaseImageUrl || pin.local_image_path);

  return {
    post_id: pin.source_post_id ?? pin.local_id,
    publish_id: pin.local_id,
    account_name: pin.account_id,
    title: pin.title ?? "",
    description: pin.description ?? "",
    keywords: (pin.keywords ?? []).join(";"),
    board_name: pin.board_name ?? "",
    board_id: pin.board_id ?? "",
    publish_status: pin.status ?? "generated",
    visual_selection_status: hasImage ? "exact" : "",
    pin_creation_status: "created",
    selected_visual_path: pin.local_image_path ?? "",
    final_pin_path: pin.local_image_path ?? "",
    final_pin_filename: basename(pin.storage_path ?? pin.local_image_path ?? ""),
    image_url: supabaseImageUrl,
    pinterest_pin_url: pin.pin_url ?? "",
    published_at: pin.published_at ?? "",
    created_at: pin.created_at ?? "",
  };
}

function supabaseIndexFile(
  accountId: string,
  key: PinterestLocalIndexFile["key"],
  count: number,
): PinterestLocalIndexFile {
  return {
    key,
    label: `${accountId} / pinterest_pins`,
    path: `public.pinterest_pins?account_id=${accountId}`,
    format: "supabase",
    count,
    exists: true,
    fields: [
      "account_id",
      "local_id",
      "source_post_id",
      "status",
      "storage_path",
      "public_image_url",
    ],
    lastError: null,
    source: "supabase",
  };
}

async function readSupabasePinterestWorkshop(): Promise<PinterestWorkshopIndexes | null> {
  const supabaseUrl =
    process.env.SUPABASE_URL?.trim() || process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
  const { data, error } = await supabase
    .from("pinterest_pins")
    .select(
      "local_id, account_id, account_name, niche, title, description, keywords, board_name, board_id, status, source_post_id, local_image_path, storage_bucket, storage_path, public_image_url, pin_url, published_at, created_at, updated_at, raw_payload",
    )
    .order("created_at", { ascending: false });

  if (error || !data?.length) {
    return null;
  }

  const pins = data as SupabasePinterestPin[];
  const groupedPins = new Map<string, SupabasePinterestPin[]>();

  for (const pin of pins) {
    groupedPins.set(pin.account_id, [...(groupedPins.get(pin.account_id) ?? []), pin]);
  }

  const accounts = [...groupedPins.entries()].map(([accountId, accountPins]) => {
    const rows = accountPins.map((pin) => {
      const storageImageUrl =
        pin.storage_bucket && pin.storage_path
          ? supabase.storage.from(pin.storage_bucket).getPublicUrl(pin.storage_path).data.publicUrl
          : "";

      return supabasePinToCsvRow(pin, storageImageUrl);
    });
    const account = buildAccountWorkshop({
      id: accountId,
      name: accountPins[0]?.account_name ?? normalizeAccountName(accountId),
      niche: accountPins[0]?.niche ?? "",
      sources: {},
      stats: {
        posts_queue: rows.length,
        posts_with_visuals: rows.filter(isVisualReady).length,
        final_pins: rows.length,
        publishing_queue: rows.length,
        ready_to_publish: rows.filter(
          (row) => value(row, "publish_status") === "ready_to_publish",
        ).length,
        dry_run: rows.filter((row) => value(row, "publish_status") === "dry_run").length,
        images_ready: rows.filter((row) => Boolean(value(row, "image_url"))).length,
        visuals_index: 0,
      },
      boards: uniqueValues(rows.map((row) => value(row, "board_name"))),
      images: {
        pins_ready: uniqueValues(rows.map((row) => value(row, "image_url"))),
      },
      posts_queue: rows,
      posts_with_visuals: rows,
      final_pins_index: rows,
      publishing_queue: rows,
    });

    return {
      ...account,
      indexFiles: [
        supabaseIndexFile(accountId, "posts_queue", rows.length),
        supabaseIndexFile(accountId, "posts_with_visuals", rows.length),
        supabaseIndexFile(accountId, "final_pins_index", rows.length),
        supabaseIndexFile(accountId, "publishing_queue", rows.length),
      ],
    };
  });
  const readyPins = accounts.flatMap((account) => account.readyPins);
  const publicationQueue = accounts.flatMap((account) => account.publicationQueue);
  const pinsWithVisuals = pins.filter(
    (pin) => Boolean(pin.public_image_url || pin.storage_path || pin.local_image_path),
  ).length;
  const updatedAt = pins
    .map((pin) => pin.updated_at ?? pin.created_at)
    .filter((value): value is string => Boolean(value))
    .sort()
    .at(-1);

  return {
    sourceAvailable: true,
    dataSource: "supabase",
    message: null,
    stats: {
      postsGenerated: pins.length,
      pinsWithVisuals,
      pinsReadyToPublish: readyPins.length,
      pinsPendingPublication: publicationQueue.length,
    },
    accounts,
    readyPins,
    publicationQueue,
    indexFiles: accounts.flatMap((account) => account.indexFiles),
    updatedAt: updatedAt ?? null,
    indexes: {
      postsQueue: pins.length,
      postsWithVisuals: pinsWithVisuals,
      finalPins: pins.length,
      publishingQueue: pins.length,
    },
  };
}

export async function readPinterestWorkshopIndexes(): Promise<PinterestWorkshopIndexes> {
  const supabaseWorkshop = await readSupabasePinterestWorkshop();

  if (supabaseWorkshop) {
    return supabaseWorkshop;
  }

  const snapshot = await readPinterestSnapshot();

  if (snapshot?.accounts?.length) {
    const accounts = snapshot.accounts.map(buildAccountWorkshop);
    const readyPins = accounts.flatMap((account) => account.readyPins);
    const publicationQueue = accounts.flatMap((account) => account.publicationQueue);
    const indexFiles = accounts.flatMap((account) => account.indexFiles);

    return {
      sourceAvailable: accounts.some((account) => account.rawStats.posts_queue > 0),
      dataSource: "snapshot_local",
      message: null,
      stats: {
        postsGenerated: snapshot.totals.posts_queue,
        pinsWithVisuals: snapshot.totals.posts_with_visuals,
        pinsReadyToPublish: snapshot.totals.ready_to_publish ?? readyPins.length,
        pinsPendingPublication: snapshot.totals.publishing_queue,
      },
      accounts,
      readyPins,
      publicationQueue,
      indexFiles,
      updatedAt: snapshot.synced_at,
      indexes: {
        postsQueue: snapshot.totals.posts_queue,
        postsWithVisuals: snapshot.totals.posts_with_visuals,
        finalPins: snapshot.totals.final_pins,
        publishingQueue: snapshot.totals.publishing_queue,
      },
    };
  }

  const [postsQueueResult, postsWithVisualsResult, finalPinsResult, publishingQueueResult] =
    await Promise.all([
      readIndex(indexFileDefinitions[0]),
      readIndex(indexFileDefinitions[1]),
      readIndex(indexFileDefinitions[2]),
      readIndex(indexFileDefinitions[3]),
    ]);
  const [postsQueue, postsWithVisuals, finalPins, publishingQueue] = [
    postsQueueResult.rows,
    postsWithVisualsResult.rows,
    finalPinsResult.rows,
    publishingQueueResult.rows,
  ];
  const indexFiles = [
    buildIndexFile(indexFileDefinitions[0], postsQueueResult),
    buildIndexFile(indexFileDefinitions[1], postsWithVisualsResult),
    buildIndexFile(indexFileDefinitions[2], finalPinsResult),
    buildIndexFile(indexFileDefinitions[3], publishingQueueResult),
  ];

  const hasAnyIndex =
    postsQueue.length > 0 ||
    postsWithVisuals.length > 0 ||
    finalPins.length > 0 ||
    publishingQueue.length > 0;

  if (!hasAnyIndex) {
    return {
      sourceAvailable: false,
      dataSource: "snapshot_local",
      message: "Aucun index Pinterest synchronise pour le moment.",
      stats: emptyStats,
      accounts: [],
      readyPins: [],
      publicationQueue: [],
      indexFiles,
      updatedAt: null,
      indexes: {
        postsQueue: 0,
        postsWithVisuals: 0,
        finalPins: 0,
        publishingQueue: 0,
      },
    };
  }

  const visualRowsByPostId = byPostId(postsWithVisuals);
  const readyToPublishRows = publishingQueue.filter(
    (row) => value(row, "publish_status") === "ready_to_publish",
  );
  const finalPinsByPostId = byPostId(finalPins);
  const readyPins = readyToPublishRows
    .map((row, index) =>
      mapItem(
        mergeRows(row, {
          ...visualRowsByPostId.get(value(row, "post_id")),
          ...finalPinsByPostId.get(value(row, "post_id")),
        }),
        `pin-${index + 1}`,
        value(row, "account_name"),
      ),
    );
  const publicationQueue = publishingQueue.map((row, index) =>
    mapItem(
      mergeRows(row, {
        ...visualRowsByPostId.get(value(row, "post_id")),
        ...finalPinsByPostId.get(value(row, "post_id")),
      }),
      `queue-${index + 1}`,
      value(row, "account_name"),
    ),
  );

  return {
    sourceAvailable: true,
    dataSource: "snapshot_local",
    message: null,
    stats: {
      postsGenerated: postsQueue.length,
      pinsWithVisuals: postsWithVisuals.filter(isVisualReady).length,
      pinsReadyToPublish: readyToPublishRows.length,
      pinsPendingPublication: publishingQueue.length,
    },
    accounts: [],
    readyPins,
    publicationQueue,
    indexFiles,
    updatedAt: new Date().toISOString(),
    indexes: {
      postsQueue: postsQueue.length,
      postsWithVisuals: postsWithVisuals.length,
      finalPins: finalPins.length,
      publishingQueue: publishingQueue.length,
    },
  };
}
