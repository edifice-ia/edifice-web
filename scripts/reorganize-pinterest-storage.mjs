import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  getPinterestFinalPinsFolder,
  getPinterestFinalPinStoragePath,
  getPinterestLegacyRootFolder,
  inferPinterestAccountId,
  PINTEREST_ACCOUNT_IDS,
  PINTEREST_STORAGE_PREFIX,
} from "./lib/pinterest-storage-paths.mjs";

const DEFAULT_BUCKET = "content-assets";
const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp"]);

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

function isSupportedImage(storagePath) {
  return IMAGE_EXTENSIONS.has(path.posix.extname(storagePath).toLowerCase());
}

async function listFolder(storage, folder) {
  const entries = [];
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
    entries.push(...page);
    if (page.length < limit) {
      break;
    }
    offset += limit;
  }

  return entries;
}

async function listFilesRecursively(storage, folder) {
  const files = [];
  const entries = await listFolder(storage, folder);

  for (const entry of entries) {
    const entryPath = `${folder}/${entry.name}`;
    if (entry.id) {
      files.push({
        path: entryPath,
        metadata: entry.metadata ?? {},
      });
    } else {
      files.push(...(await listFilesRecursively(storage, entryPath)));
    }
  }

  return files;
}

async function verifyFileExists(storage, storagePath) {
  const folder = path.posix.dirname(storagePath);
  const fileName = path.posix.basename(storagePath);
  const entries = await listFolder(storage, folder);
  return entries.some((entry) => entry.id && entry.name === fileName);
}

function matchingRowsForFile(rows, accountId, sourcePath, targetPath) {
  const fileName = path.posix.basename(sourcePath);

  return rows.filter(
    (row) =>
      row.account_id === accountId &&
      (row.storage_path === sourcePath ||
        row.storage_path === targetPath ||
        path.posix.basename(row.storage_path ?? "") === fileName ||
        row.local_id === fileName),
  );
}

async function main() {
  loadEnvFile(".env.local");

  const dryRun = hasArg("dry-run");
  const deleteDuplicates = hasArg("delete-duplicates");
  const bucket = getArgValue(
    "bucket",
    process.env.SUPABASE_BUCKET_CONTENT_ASSETS || DEFAULT_BUCKET,
  );
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Variables requises dans .env.local: SUPABASE_URL (ou NEXT_PUBLIC_SUPABASE_URL) et SUPABASE_SERVICE_ROLE_KEY.",
    );
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
  const storage = supabase.storage.from(bucket);
  const files = (await listFilesRecursively(storage, PINTEREST_STORAGE_PREFIX)).filter((file) =>
    isSupportedImage(file.path),
  );
  const filePaths = new Set(files.map((file) => file.path));
  const { data: rows, error: rowsError } = await supabase
    .from("pinterest_pins")
    .select("id, account_id, local_id, storage_path, public_image_url");

  if (rowsError) {
    throw new Error(`Lecture pinterest_pins impossible: ${rowsError.message}`);
  }

  const summary = {
    dryRun,
    deleteDuplicatesRequested: deleteDuplicates,
    bucket,
    filesDetected: files.length,
    legacyRootFilesDetected: 0,
    filesCopied: 0,
    filesWouldCopy: 0,
    filesDeleted: 0,
    filesWouldDelete: 0,
    filesIgnored: 0,
    rowsUpdated: 0,
    rowsWouldUpdate: 0,
    duplicateFilesRemaining: [],
    errors: [],
  };

  for (const file of files) {
    const accountId = inferPinterestAccountId(file.path);

    if (!accountId) {
      summary.filesIgnored += 1;
      continue;
    }

    const targetPath = getPinterestFinalPinStoragePath(accountId, file.path);
    const alreadyInTarget = file.path === targetPath;
    const isLegacyRootFile =
      path.posix.dirname(file.path) === getPinterestLegacyRootFolder(accountId);

    if (!alreadyInTarget && !isLegacyRootFile) {
      summary.filesIgnored += 1;
      continue;
    }

    if (isLegacyRootFile) {
      summary.legacyRootFilesDetected += 1;
    }

    const targetAlreadyExists = filePaths.has(targetPath);
    const matchingRows = matchingRowsForFile(rows ?? [], accountId, file.path, targetPath);
    const rowsNeedingUpdate = matchingRows.filter(
      (row) => row.storage_path !== targetPath || !row.public_image_url,
    );

    if (alreadyInTarget) {
      summary.filesIgnored += 1;
    } else if (dryRun) {
      if (targetAlreadyExists) {
        summary.filesIgnored += 1;
      } else {
        summary.filesWouldCopy += 1;
      }
    } else {
      try {
        if (!targetAlreadyExists) {
          const { error: copyError } = await storage.copy(file.path, targetPath);
          if (copyError) {
            throw new Error(`Copie ${file.path} -> ${targetPath}: ${copyError.message}`);
          }
        }

        const verified = await verifyFileExists(storage, targetPath);
        if (!verified) {
          throw new Error(`Verification destination impossible: ${targetPath}`);
        }

        if (!targetAlreadyExists) {
          summary.filesCopied += 1;
          filePaths.add(targetPath);
        } else {
          summary.filesIgnored += 1;
        }
      } catch (error) {
        summary.errors.push(error instanceof Error ? error.message : String(error));
        continue;
      }
    }

    if (dryRun) {
      summary.rowsWouldUpdate += rowsNeedingUpdate.length;
    } else if (rowsNeedingUpdate.length > 0) {
      const { data: publicUrlData } = storage.getPublicUrl(targetPath);

      for (const row of rowsNeedingUpdate) {
        const { error: updateError } = await supabase
          .from("pinterest_pins")
          .update({
            storage_bucket: bucket,
            storage_path: targetPath,
            public_image_url: publicUrlData.publicUrl,
          })
          .eq("id", row.id);

        if (updateError) {
          summary.errors.push(
            `Mise a jour pinterest_pins ${row.account_id}/${row.local_id}: ${updateError.message}`,
          );
        } else {
          summary.rowsUpdated += 1;
          row.storage_path = targetPath;
          row.public_image_url = publicUrlData.publicUrl;
        }
      }
    }

    if (!isLegacyRootFile) {
      continue;
    }

    const destinationVerified = dryRun
      ? targetAlreadyExists
      : await verifyFileExists(storage, targetPath);
    const databaseVerified =
      matchingRows.length > 0 &&
      matchingRows.every(
        (row) => row.storage_path === targetPath && Boolean(row.public_image_url),
      );
    const duplicate = {
      sourcePath: file.path,
      targetPath,
      destinationVerified,
      databaseVerified,
    };

    if (!deleteDuplicates || !destinationVerified || !databaseVerified) {
      summary.duplicateFilesRemaining.push(duplicate);
      continue;
    }

    if (dryRun) {
      summary.filesWouldDelete += 1;
      summary.duplicateFilesRemaining.push(duplicate);
      continue;
    }

    const { error: removeError } = await storage.remove([file.path]);
    if (removeError) {
      summary.errors.push(`Suppression doublon ${file.path}: ${removeError.message}`);
      summary.duplicateFilesRemaining.push(duplicate);
    } else {
      summary.filesDeleted += 1;
    }
  }

  console.log(
    JSON.stringify(
      {
        ...summary,
        targetFolders: PINTEREST_ACCOUNT_IDS.map(getPinterestFinalPinsFolder),
      },
      null,
      2,
    ),
  );
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
