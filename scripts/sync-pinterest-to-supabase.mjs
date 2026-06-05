import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import {
  assertPinterestFinalPinStoragePath,
  getPinterestFinalPinsFolder,
  getPinterestFinalPinStoragePath,
  getPinterestLegacyRootFolder,
  PINTEREST_ACCOUNT_IDS,
} from "./lib/pinterest-storage-paths.mjs";
import { loadPinterestAccountConfigs } from "./lib/pinterest-account-config.mjs";

const DEFAULT_BUCKET = "content-assets";
const SNAPSHOT_PATH = path.resolve("data", "pinterest", "pinterest_snapshot.json");
const IMAGE_CONTENT_TYPES = new Map([
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".png", "image/png"],
  [".webp", "image/webp"],
]);

function loadEnvFile(filename) {
  try {
    const content = readFileSync(filename, "utf8");
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) {
        continue;
      }

      const match = trimmed.match(/^([^=]+)=(.*)$/);
      if (!match) {
        continue;
      }

      const key = match[1].trim();
      let value = match[2].trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      process.env[key] ||= value;
    }
  } catch {
    // Optional local env file.
  }
}

function getArgValue(name, fallback = "") {
  const prefix = `--${name}=`;
  const arg = process.argv.find((item) => item.startsWith(prefix));
  return arg ? arg.slice(prefix.length) : fallback;
}

function hasArg(name) {
  return process.argv.includes(`--${name}`);
}

function splitKeywords(value) {
  if (Array.isArray(value)) {
    return value.map(String).map((item) => item.trim()).filter(Boolean);
  }

  return String(value ?? "")
    .split(/[;,#]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function firstValue(...values) {
  return values.find((value) => typeof value === "string" && value.trim())?.trim() ?? "";
}

function rowByPostId(rows, postId) {
  return (rows ?? []).find((row) => row.post_id === postId) ?? {};
}

function resolveFinalImagePath(...rows) {
  const fields = [
    "final_pin_path",
    "image_path",
    "visual_path",
    "thumbnail",
    "selected_visual_path",
  ];

  for (const row of rows) {
    for (const field of fields) {
      const value = row?.[field]?.trim();
      if (value && /^[A-Za-z]:[\\/]/.test(value)) {
        return value;
      }
    }
  }

  return "";
}

function resolveContentType(filePath) {
  return IMAGE_CONTENT_TYPES.get(path.extname(filePath).toLowerCase()) ?? "";
}

function parseTimestamp(value) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function buildPinRecords(snapshot, bucket, accountConfigs) {
  const records = [];

  for (const account of snapshot.accounts ?? []) {
    const accountConfig = accountConfigs[account.id];
    if (!accountConfig) {
      throw new Error(`Configuration Pinterest absente pour ${account.id}.`);
    }

    for (const finalPin of account.final_pins_index ?? []) {
      const postId = finalPin.post_id || finalPin.publish_id;
      if (!postId) {
        continue;
      }

      const post = rowByPostId(account.posts_queue, postId);
      const visual = rowByPostId(account.posts_with_visuals, postId);
      const queue = rowByPostId(account.publishing_queue, postId);
      const localId = firstValue(finalPin.final_pin_filename, queue.final_pin_filename, postId);
      const localImagePath = resolveFinalImagePath(queue, finalPin, visual);
      const extension = path.extname(localImagePath).toLowerCase();
      const fileName = localImagePath
        ? path.basename(localImagePath)
        : `${postId}${extension || ".png"}`;
      const storagePath = getPinterestFinalPinStoragePath(account.id, fileName);
      const status = firstValue(
        queue.publish_status,
        finalPin.pin_creation_status,
        visual.visual_selection_status,
        post.status,
        "generated",
      );
      const createdAt =
        parseTimestamp(firstValue(finalPin.created_at, post.created_at)) ?? new Date().toISOString();
      const publishedAt = parseTimestamp(queue.published_at);

      records.push({
        account,
        localImagePath,
        imageExists: Boolean(localImagePath && existsSync(localImagePath)),
        contentType: resolveContentType(localImagePath),
        storagePath,
        row: {
          local_id: localId,
          account_id: account.id,
          account_name: accountConfig.accountName,
          niche: account.niche,
          title: firstValue(queue.title, finalPin.title, visual.title, post.title),
          description: firstValue(
            queue.description,
            finalPin.description,
            visual.description,
            post.description,
          ),
          keywords: splitKeywords(
            firstValue(queue.keywords, finalPin.keywords, visual.keywords, post.keywords),
          ),
          board_name: firstValue(
            queue.board_name,
            finalPin.board_name,
            visual.board_name,
            post.board_name,
          ),
          board_id: firstValue(queue.board_id, finalPin.board_id),
          status,
          source_post_id: postId,
          local_image_path: localImagePath || null,
          storage_bucket: localImagePath ? bucket : null,
          storage_path: localImagePath ? storagePath : null,
          public_image_url: null,
          pin_url: firstValue(queue.pinterest_pin_url, queue.pin_url) || null,
          target_url: accountConfig.targetUrl || null,
          published_at: publishedAt,
          created_at: createdAt,
          raw_payload: {
            synced_from: "data/pinterest/pinterest_snapshot.json",
            snapshot_synced_at: snapshot.synced_at ?? null,
            account: {
              id: account.id,
              name: accountConfig.accountName,
              niche: account.niche,
            },
            future_publication: {
              link: accountConfig.targetUrl || null,
              destination_url: accountConfig.targetUrl || null,
            },
            post,
            visual,
            final_pin: finalPin,
            publishing_queue: queue,
          },
        },
      });
    }
  }

  return records;
}

function emptySummary({ dryRun, bucket }) {
  return {
    dryRun,
    bucket,
    pinsRead: 0,
    imagesFound: 0,
    imagesMissing: 0,
    imagesUploaded: 0,
    imagesAlreadyPresent: 0,
    imagesWouldUpload: 0,
    legacyRootFiles: [],
    rowsInserted: 0,
    rowsUpdated: 0,
    rowsWouldUpsert: 0,
    errors: [],
  };
}

async function listFiles(storage, folder) {
  const files = [];
  let offset = 0;
  const limit = 100;

  while (true) {
    const { data, error } = await storage.list(folder, {
      limit,
      offset,
      sortBy: { column: "name", order: "asc" },
    });

    if (error) {
      throw new Error(`Lecture Storage ${folder}: ${error.message}`);
    }

    const page = data ?? [];
    files.push(...page.filter((entry) => entry.id));
    if (page.length < limit) {
      break;
    }
    offset += limit;
  }

  return files;
}

async function inspectPinterestStorage(storage) {
  const existingTargetPaths = new Set();
  const legacyRootFiles = [];

  for (const accountId of PINTEREST_ACCOUNT_IDS) {
    const finalFolder = getPinterestFinalPinsFolder(accountId);
    const rootFolder = getPinterestLegacyRootFolder(accountId);
    const [finalFiles, rootFiles] = await Promise.all([
      listFiles(storage, finalFolder),
      listFiles(storage, rootFolder),
    ]);

    for (const file of finalFiles) {
      existingTargetPaths.add(`${finalFolder}/${file.name}`);
    }
    for (const file of rootFiles) {
      legacyRootFiles.push(`${rootFolder}/${file.name}`);
    }
  }

  return {
    existingTargetPaths,
    legacyRootFiles,
  };
}

async function main() {
  loadEnvFile(".env.local");

  const dryRun = hasArg("dry-run");
  const bucket = getArgValue(
    "bucket",
    process.env.SUPABASE_BUCKET_CONTENT_ASSETS || DEFAULT_BUCKET,
  );
  const snapshot = JSON.parse(readFileSync(SNAPSHOT_PATH, "utf8"));
  const accountConfigs = loadPinterestAccountConfigs();
  const records = buildPinRecords(snapshot, bucket, accountConfigs);
  const summary = emptySummary({ dryRun, bucket });

  summary.pinsRead = records.length;
  summary.imagesFound = records.filter((record) => record.imageExists).length;
  summary.imagesMissing = records.filter((record) => !record.imageExists).length;

  for (const record of records) {
    assertPinterestFinalPinStoragePath(record.storagePath);
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if ((!supabaseUrl || !serviceRoleKey) && !dryRun) {
    throw new Error(
      "Variables requises dans .env.local: SUPABASE_URL (ou NEXT_PUBLIC_SUPABASE_URL) et SUPABASE_SERVICE_ROLE_KEY.",
    );
  }

  const supabase =
    supabaseUrl && serviceRoleKey
      ? createClient(supabaseUrl, serviceRoleKey, {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
          },
        })
      : null;
  const storage = supabase?.storage.from(bucket);
  const storageState = storage
    ? await inspectPinterestStorage(storage)
    : {
        existingTargetPaths: new Set(),
        legacyRootFiles: [],
      };

  summary.imagesAlreadyPresent = records.filter((record) =>
    storageState.existingTargetPaths.has(record.storagePath),
  ).length;
  summary.legacyRootFiles = storageState.legacyRootFiles;

  if (dryRun) {
    summary.imagesWouldUpload = records.filter(
      (record) =>
        record.imageExists &&
        record.contentType &&
        !storageState.existingTargetPaths.has(record.storagePath),
    ).length;
    summary.rowsWouldUpsert = records.length;
    console.log(
      JSON.stringify(
        {
          ...summary,
          plannedFolders: PINTEREST_ACCOUNT_IDS.map(getPinterestFinalPinsFolder),
          targetUrlConfiguration: PINTEREST_ACCOUNT_IDS.map((accountId) => ({
            accountId,
            env: accountConfigs[accountId]?.targetUrlEnv ?? null,
            configured: Boolean(accountConfigs[accountId]?.targetUrl),
          })),
          legacyRootRecommendation:
            summary.legacyRootFiles.length > 0
              ? "Lancer npm run pinterest:storage:reorganize -- --dry-run puis la commande reelle. Aucun fichier racine ne sera supprime automatiquement."
              : null,
          sample: records.slice(0, 3).map((record) => ({
            accountId: record.row.account_id,
            localId: record.row.local_id,
            localImagePath: record.localImagePath,
            imageExists: record.imageExists,
            target: `${bucket}/${record.storagePath}`,
            alreadyPresent: storageState.existingTargetPaths.has(record.storagePath),
            status: record.row.status,
            targetUrlConfigured: Boolean(record.row.target_url),
          })),
        },
        null,
        2,
      ),
    );
    return;
  }

  if (!supabase || !storage) {
    throw new Error("Client Supabase indisponible.");
  }

  const { data: existingRows, error: existingError } = await supabase
    .from("pinterest_pins")
    .select("account_id, local_id, target_url");

  if (existingError) {
    throw new Error(`Lecture pinterest_pins impossible: ${existingError.message}`);
  }

  const existingKeys = new Set(
    (existingRows ?? []).map((row) => `${row.account_id}:${row.local_id}`),
  );
  const existingTargetUrls = new Map(
    (existingRows ?? []).map((row) => [
      `${row.account_id}:${row.local_id}`,
      row.target_url ?? null,
    ]),
  );
  const rowsToUpsert = [];

  for (const record of records) {
    try {
      if (record.imageExists && record.contentType) {
        assertPinterestFinalPinStoragePath(record.storagePath);

        if (!storageState.existingTargetPaths.has(record.storagePath)) {
          const imageBytes = readFileSync(record.localImagePath);
          const { error: uploadError } = await storage.upload(record.storagePath, imageBytes, {
            cacheControl: "3600",
            contentType: record.contentType,
            upsert: false,
          });

          if (uploadError) {
            throw new Error(`Upload ${record.storagePath}: ${uploadError.message}`);
          }

          storageState.existingTargetPaths.add(record.storagePath);
          summary.imagesUploaded += 1;
        }

        const { data: publicUrlData } = storage.getPublicUrl(record.storagePath);
        record.row.public_image_url = publicUrlData.publicUrl;
      }

      const recordKey = `${record.row.account_id}:${record.row.local_id}`;
      record.row.target_url =
        record.row.target_url || existingTargetUrls.get(recordKey) || null;
      rowsToUpsert.push(record.row);
    } catch (error) {
      summary.errors.push(error instanceof Error ? error.message : String(error));
    }
  }

  if (rowsToUpsert.length > 0) {
    const { data, error } = await supabase
      .from("pinterest_pins")
      .upsert(rowsToUpsert, {
        onConflict: "account_id,local_id",
      })
      .select("account_id, local_id");

    if (error) {
      throw new Error(`Upsert pinterest_pins impossible: ${error.message}`);
    }

    for (const row of data ?? []) {
      const key = `${row.account_id}:${row.local_id}`;
      if (existingKeys.has(key)) {
        summary.rowsUpdated += 1;
      } else {
        summary.rowsInserted += 1;
      }
    }
  }

  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error(
    JSON.stringify(
      {
        dryRun: hasArg("dry-run"),
        errors: [error instanceof Error ? error.message : String(error)],
      },
      null,
      2,
    ),
  );
  process.exit(1);
});
