import "server-only";

import { readFile } from "node:fs/promises";

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
  selectedVisualFilename: string;
  finalPinFilename: string;
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
  format: "csv";
  count: number;
  exists: boolean;
};

export type PinterestWorkshopIndexes = {
  sourceAvailable: boolean;
  message: string | null;
  stats: PinterestWorkshopStats;
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

const PINTEREST_INDEX_DIR =
  process.env.PINTEREST_LOCAL_INDEX_DIR?.trim() ||
  String.raw`D:\Edifice_IA\projets\Pinterest`;

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
  },
  {
    key: "posts_with_visuals",
    label: "posts_with_visuals",
    fileName: "posts_with_visuals_global.csv",
  },
  {
    key: "final_pins_index",
    label: "final_pins_index",
    fileName: "final_pins_index_global.csv",
  },
  {
    key: "publishing_queue",
    label: "publishing_queue",
    fileName: "publishing_queue_global.csv",
  },
] as const;

function csvPath(fileName: string) {
  return `${PINTEREST_INDEX_DIR.replace(/[\\/]+$/, "")}\\${fileName}`;
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

function parseCsv(content: string): CsvRow[] {
  const records = splitCsvRecords(content.replace(/^\uFEFF/, ""));
  const [headerLine, ...dataLines] = records;

  if (!headerLine) {
    return [];
  }

  const headers = splitCsvLine(headerLine);
  return dataLines.map((line) => {
    const values = splitCsvLine(line);
    return Object.fromEntries(
      headers.map((header, index) => [header, values[index] ?? ""]),
    );
  });
}

async function readCsv(fileName: string) {
  try {
    const content = await readFile(csvPath(fileName), "utf-8");
    return {
      exists: true,
      rows: parseCsv(content),
    };
  } catch {
    return {
      exists: false,
      rows: [],
    };
  }
}

function buildIndexFile(
  definition: (typeof indexFileDefinitions)[number],
  result: Awaited<ReturnType<typeof readCsv>>,
): PinterestLocalIndexFile {
  return {
    key: definition.key,
    label: definition.label,
    path: csvPath(definition.fileName),
    format: "csv",
    count: result.rows.length,
    exists: result.exists,
  };
}

function value(row: CsvRow, key: string) {
  return row[key]?.trim() ?? "";
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

function mapItem(row: CsvRow, fallbackId: string): PinterestWorkshopItem {
  const postId = value(row, "post_id") || fallbackId;
  const publishStatus = value(row, "publish_status");
  const visualReady =
    Boolean(value(row, "selected_visual_filename")) ||
    Boolean(value(row, "selected_visual_path")) ||
    isVisualReady(row);
  const finalReady =
    Boolean(value(row, "final_pin_filename")) ||
    Boolean(value(row, "final_pin_path")) ||
    isFinalPinReady(row);

  return {
    id: value(row, "publish_id") || postId,
    postId,
    accountName: normalizeAccountName(value(row, "account_name")),
    theme: value(row, "theme"),
    title: value(row, "title"),
    description: value(row, "description"),
    boardName: value(row, "board_name"),
    link: value(row, "link"),
    visualCategory: value(row, "visual_category"),
    selectedVisualFilename:
      value(row, "selected_visual_filename") ||
      basename(value(row, "selected_visual_path")),
    finalPinFilename:
      value(row, "final_pin_filename") ||
      basename(value(row, "final_pin_path")),
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

export async function readPinterestWorkshopIndexes(): Promise<PinterestWorkshopIndexes> {
  const [postsQueueResult, postsWithVisualsResult, finalPinsResult, publishingQueueResult] =
    await Promise.all([
      readCsv("posts_queue_global.csv"),
      readCsv("posts_with_visuals_global.csv"),
      readCsv("final_pins_index_global.csv"),
      readCsv("publishing_queue_global.csv"),
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
      message: "Aucun index Pinterest synchronise pour le moment.",
      stats: emptyStats,
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
  const publishRowsByPostId = byPostId(publishingQueue);
  const readyPins = finalPins
    .filter(isFinalPinReady)
    .map((row, index) =>
      mapItem(
        mergeRows(row, {
          ...visualRowsByPostId.get(value(row, "post_id")),
          ...publishRowsByPostId.get(value(row, "post_id")),
        }),
        `pin-${index + 1}`,
      ),
    );
  const publicationQueue = publishingQueue.map((row, index) =>
    mapItem(
      mergeRows(row, {
        ...visualRowsByPostId.get(value(row, "post_id")),
        ...finalPins.find((pin) => value(pin, "post_id") === value(row, "post_id")),
      }),
      `queue-${index + 1}`,
    ),
  );

  return {
    sourceAvailable: true,
    message: null,
    stats: {
      postsGenerated: postsQueue.length,
      pinsWithVisuals: postsWithVisuals.filter(isVisualReady).length,
      pinsReadyToPublish: readyPins.length,
      pinsPendingPublication: publishingQueue.filter(
        (row) => value(row, "publish_status") === "ready_to_publish",
      ).length,
    },
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
