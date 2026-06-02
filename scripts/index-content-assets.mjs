import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import path from "node:path";

const DEFAULT_FOLDER = "lignes-interieures/elite";
const IMAGE_EXTENSIONS = new Set([
  ".avif",
  ".gif",
  ".jpeg",
  ".jpg",
  ".png",
  ".webp",
]);
const STOP_WORDS = new Set([
  "and",
  "asset",
  "content",
  "edifice",
  "elite",
  "image",
  "img",
  "interieures",
  "lignes",
  "photo",
  "visual",
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

function getArgValue(name, fallback) {
  const prefix = `--${name}=`;
  const arg = process.argv.find((item) => item.startsWith(prefix));
  return arg ? arg.slice(prefix.length) : fallback;
}

function normalizeStoragePath(value) {
  return value.replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");
}

function extractKeywords(fileName) {
  const parsed = path.parse(fileName);
  const words = parsed.name
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .split(/[^a-z0-9]+/u)
    .map((word) => word.trim())
    .filter((word) => word.length >= 3)
    .filter((word) => !/^\d+$/.test(word))
    .filter((word) => !STOP_WORDS.has(word));

  return [...new Set(words)];
}

function inferImageContentType(fileName) {
  const extension = path.extname(fileName).toLowerCase();

  if (extension === ".jpg" || extension === ".jpeg") {
    return "image/jpeg";
  }
  if (extension === ".png") {
    return "image/png";
  }
  if (extension === ".webp") {
    return "image/webp";
  }
  if (extension === ".gif") {
    return "image/gif";
  }
  if (extension === ".avif") {
    return "image/avif";
  }

  return "image/*";
}

async function listFiles({ supabase, bucket, folder }) {
  const files = [];
  const limit = 100;
  let offset = 0;

  while (true) {
    const { data, error } = await supabase.storage
      .from(bucket)
      .list(folder, {
        limit,
        offset,
        sortBy: { column: "name", order: "asc" },
      });

    if (error) {
      throw new Error(`Lecture Storage impossible: ${error.message}`);
    }

    const page = data ?? [];
    files.push(...page.filter((item) => item.id));

    if (page.length < limit) {
      break;
    }

    offset += limit;
  }

  return files;
}

async function main() {
  loadEnvFile(".env.local");

  const bucket = getArgValue(
    "bucket",
    process.env.SUPABASE_BUCKET_CONTENT_ASSETS,
  );
  const folder = normalizeStoragePath(getArgValue("folder", DEFAULT_FOLDER));
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey || !bucket) {
    throw new Error(
      "Variables requises dans .env.local: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_BUCKET_CONTENT_ASSETS.",
    );
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
  const files = await listFiles({ supabase, bucket, folder });
  const imageFiles = files.filter((file) =>
    IMAGE_EXTENSIONS.has(path.extname(file.name).toLowerCase()),
  );

  if (imageFiles.length === 0) {
    console.log(
      JSON.stringify(
        {
          bucket,
          folder,
          filesFound: files.length,
          imagesFound: 0,
          rowsInserted: 0,
          rowsAlreadyExisting: 0,
          errors: [],
        },
        null,
        2,
      ),
    );
    return;
  }

  const imagePaths = imageFiles.map((file) => `${folder}/${file.name}`);

  const { data: existingRows, error: existingError } = await supabase
    .from("content_assets")
    .select("storage_path")
    .in("storage_path", imagePaths);

  if (existingError) {
    throw new Error(
      `Verification des doublons impossible: ${existingError.message}`,
    );
  }

  const existingPaths = new Set(
    (existingRows ?? []).map((row) => row.storage_path),
  );

  const rows = imageFiles.map((file) => {
    const storagePath = `${folder}/${file.name}`;
    const { data } = supabase.storage.from(bucket).getPublicUrl(storagePath);
    const contentType =
      typeof file.metadata?.mimetype === "string"
        ? file.metadata.mimetype
        : inferImageContentType(file.name);

    return {
      asset_type: "image",
      file_name: file.name,
      bucket_name: bucket,
      storage_path: storagePath,
      public_url: data.publicUrl,
      source: "storage_import_lignes_interieures_elite",
      status: "available",
      usage_count: 0,
      linked_draft_id: null,
      metadata: {
        content_type: contentType,
        folder,
        indexed_at: new Date().toISOString(),
        keywords: extractKeywords(file.name),
        size_bytes:
          typeof file.metadata?.size === "number" ? file.metadata.size : null,
        storage_id: file.id,
        storage_last_modified: file.updated_at ?? file.created_at ?? null,
      },
    };
  });

  const rowsToInsert = rows.filter((row) => !existingPaths.has(row.storage_path));

  if (rowsToInsert.length === 0) {
    console.log(
      JSON.stringify(
        {
          bucket,
          folder,
          filesFound: files.length,
          imagesFound: imageFiles.length,
          rowsInserted: 0,
          rowsAlreadyExisting: imageFiles.length,
          errors: [],
        },
        null,
        2,
      ),
    );
    return;
  }

  const { data, error } = await supabase
    .from("content_assets")
    .upsert(rowsToInsert, {
      onConflict: "storage_path",
      ignoreDuplicates: true,
    })
    .select("id, storage_path");

  if (error) {
    throw new Error(`Indexation content_assets impossible: ${error.message}`);
  }

  console.log(
    JSON.stringify(
      {
        bucket,
        folder,
        filesFound: files.length,
        imagesFound: imageFiles.length,
        rowsInserted: data?.length ?? 0,
        rowsAlreadyExisting:
          imageFiles.length - (data?.length ?? 0),
        errors: [],
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
        filesFound: 0,
        imagesFound: 0,
        rowsInserted: 0,
        rowsAlreadyExisting: 0,
        errors: [error instanceof Error ? error.message : String(error)],
      },
      null,
      2,
    ),
  );
  process.exit(1);
});
