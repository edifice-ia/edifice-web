import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

const BUCKET = "content-assets";
const OLD_PATH = "lignes-interieures/elite";
const NEW_PATH = "lignes-interieures/visuels";

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

function hasFlag(name) {
  return process.argv.includes(`--${name}`);
}

async function listStorageFiles(supabase) {
  const files = new Set();
  const limit = 1000;
  let offset = 0;

  while (true) {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .list(NEW_PATH, {
        limit,
        offset,
        sortBy: { column: "name", order: "asc" },
      });

    if (error) {
      throw new Error(`Lecture Storage impossible: ${error.message}`);
    }

    const page = data ?? [];
    for (const file of page) {
      if (file.id) {
        files.add(`${NEW_PATH}/${file.name}`);
      }
    }

    if (page.length < limit) {
      break;
    }

    offset += limit;
  }

  return files;
}

async function fetchEliteRows(supabase) {
  const rows = [];
  const limit = 1000;
  let offset = 0;

  while (true) {
    const { data, error } = await supabase
      .from("content_assets")
      .select("id, file_name, bucket_name, storage_path")
      .eq("asset_type", "image")
      .eq("bucket_name", BUCKET)
      .like("storage_path", `${OLD_PATH}/%`)
      .order("created_at", { ascending: true })
      .range(offset, offset + limit - 1);

    if (error) {
      throw new Error(`Lecture content_assets impossible: ${error.message}`);
    }

    rows.push(...(data ?? []));

    if (!data || data.length < limit) {
      break;
    }

    offset += limit;
  }

  return rows;
}

function plannedUpdate(row, existingStorageFiles) {
  const fileName = row.file_name || row.storage_path.split("/").at(-1);
  const newPath = `${NEW_PATH}/${fileName}`;

  if (!existingStorageFiles.has(newPath)) {
    return null;
  }

  return {
    id: row.id,
    oldPath: row.storage_path,
    newPath,
  };
}

async function main() {
  loadEnvFile(".env.local");

  const dryRun = hasFlag("dry-run");
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Variables requises: SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY.");
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const [storageFiles, eliteRows] = await Promise.all([
    listStorageFiles(supabase),
    fetchEliteRows(supabase),
  ]);
  const updates = eliteRows
    .map((row) => plannedUpdate(row, storageFiles))
    .filter(Boolean);

  console.log(`Lignes elite detectees : ${eliteRows.length}`);
  console.log(`Lignes a corriger : ${updates.length}`);

  for (const update of updates) {
    console.log(`${update.oldPath} -> ${update.newPath}`);
  }

  if (dryRun || updates.length === 0) {
    if (dryRun) {
      console.log("Dry-run uniquement. Aucune ligne modifiee.");
    }
    return;
  }

  for (const update of updates) {
    const { error } = await supabase
      .from("content_assets")
      .update({ storage_path: update.newPath })
      .eq("id", update.id);

    if (error) {
      throw new Error(
        `Correction impossible pour ${update.id}: ${error.message}`,
      );
    }

    console.log(`corrige ${update.id}`);
  }

  console.log(`Corrections appliquees : ${updates.length}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
