import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

const VISUAL_LIBRARY_BUCKET = "content-assets";
const VISUAL_LIBRARY_PATH = "lignes-interieures/visuels";
const DEFAULT_LIMIT = 5;
const MAX_LIMIT = 50;
const INVALID_IMAGE_URL_CODE = "invalid_image_url";
const DEFAULT_ESTIMATED_VISION_COST_USD = 0.001;

const METADATA_FIELDS = [
  "title",
  "description",
  "tags",
  "theme",
  "emotion",
  "ambiance",
  "visual_style",
  "character_type",
  "location",
  "color_palette",
  "aspect_ratio",
  "metadata_source",
  "metadata_version",
  "gpt_vision_score",
  "analyzed_at",
];

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

function argValue(name, fallback = null) {
  const prefix = `--${name}=`;
  const arg = process.argv.find((item) => item.startsWith(prefix));
  return arg ? arg.slice(prefix.length) : fallback;
}

function hasFlag(name) {
  return process.argv.includes(`--${name}`);
}

function visionModel() {
  return process.env.OPENAI_VISION_MODEL || process.env.OPENAI_MODEL || "gpt-4.1-mini";
}

function estimatedVisionUnitCostUsd() {
  const value = Number.parseFloat(
    process.env.OPENAI_VISION_ESTIMATED_COST_USD ?? "",
  );

  return Number.isFinite(value) && value >= 0
    ? value
    : DEFAULT_ESTIMATED_VISION_COST_USD;
}

function parseLimit() {
  const raw = argValue("limit", String(DEFAULT_LIMIT));
  const value = Number.parseInt(raw, 10);

  if (!Number.isFinite(value) || value < 1) {
    return DEFAULT_LIMIT;
  }

  return Math.min(value, MAX_LIMIT);
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizeArray(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item) => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeScore(value) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  return Math.max(0, Math.min(100, Math.round(value)));
}

function parseVisionJson(text) {
  const cleaned = text
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : cleaned);
  const analyzedAt = new Date().toISOString();

  return {
    title: normalizeString(parsed.title).slice(0, 90),
    description: normalizeString(parsed.description).slice(0, 500),
    tags: normalizeArray(parsed.tags).slice(0, 12),
    theme: normalizeString(parsed.theme).slice(0, 80),
    emotion: normalizeString(parsed.emotion).slice(0, 80),
    ambiance: normalizeString(parsed.ambiance).slice(0, 100),
    visual_style: normalizeString(parsed.visual_style).slice(0, 120),
    character_type: normalizeString(parsed.character_type).slice(0, 120),
    location: normalizeString(parsed.location).slice(0, 120),
    color_palette: normalizeArray(parsed.color_palette).slice(0, 8),
    aspect_ratio: normalizeString(parsed.aspect_ratio) || "9:16",
    metadata_source: "gpt_vision_backfill",
    metadata_version: 1,
    gpt_vision_score: normalizeScore(parsed.gpt_vision_score),
    analyzed_at: analyzedAt,
  };
}

function missingUsefulMetadata(metadata) {
  if (!isPlainObject(metadata) || Object.keys(metadata).length === 0) {
    return true;
  }

  if (metadata.metadata_source === "gpt_vision_backfill" && metadata.analyzed_at) {
    return false;
  }

  if (
    metadata.metadata_error_at &&
    metadata.metadata_error !== INVALID_IMAGE_URL_CODE
  ) {
    return false;
  }

  const tags = normalizeArray(metadata.tags);
  const hasVisionScore = typeof metadata.gpt_vision_score === "number";

  return tags.length === 0 || !hasVisionScore;
}

function isHttpsUrl(value) {
  return typeof value === "string" && value.trim().startsWith("https://");
}

function isValidVisionImageUrl(value) {
  if (!isHttpsUrl(value)) {
    return false;
  }

  return (
    value.includes(VISUAL_LIBRARY_BUCKET) &&
    value.includes(VISUAL_LIBRARY_PATH) &&
    !value.includes("lignes-interieures/elite") &&
    !value.includes("undefined") &&
    !value.includes("null")
  );
}

function isLibraryVisualAsset(asset) {
  return (
    asset.asset_type === "image" &&
    asset.bucket_name === VISUAL_LIBRARY_BUCKET &&
    typeof asset.storage_path === "string" &&
    asset.storage_path.startsWith(`${VISUAL_LIBRARY_PATH}/`)
  );
}

function isDraftAsset(asset) {
  return (
    typeof asset.storage_path === "string" &&
    (asset.storage_path === "drafts" || asset.storage_path.startsWith("drafts/"))
  );
}

function mergeMissingMetadata(current, enrichment) {
  const metadata = isPlainObject(current) ? { ...current } : {};

  for (const field of METADATA_FIELDS) {
    const currentValue = metadata[field];
    const nextValue = enrichment[field];

    if (Array.isArray(nextValue)) {
      if (!Array.isArray(currentValue) || currentValue.length === 0) {
        metadata[field] = nextValue;
      }
      continue;
    }

    if (
      currentValue === undefined ||
      currentValue === null ||
      currentValue === ""
    ) {
      metadata[field] = nextValue;
    }
  }

  return metadata;
}

function generatedPublicUrlForAsset(supabase, asset) {
  if (!asset.bucket_name || !asset.storage_path) {
    return "";
  }

  const { data } = supabase.storage
    .from(asset.bucket_name)
    .getPublicUrl(asset.storage_path);

  return data.publicUrl ?? "";
}

function imageUrlForAsset(supabase, asset) {
  const candidates = [];

  if (isHttpsUrl(asset.public_url)) {
    candidates.push({
      source: "public_url",
      url: asset.public_url.trim(),
    });
  }

  const generatedUrl = generatedPublicUrlForAsset(supabase, asset);
  if (isHttpsUrl(generatedUrl)) {
    candidates.push({
      source: "supabase_public_url",
      url: generatedUrl,
    });
  }

  const selected = candidates.find((candidate) =>
    isValidVisionImageUrl(candidate.url),
  );

  if (!selected) {
    return {
      error: INVALID_IMAGE_URL_CODE,
      source: candidates[0]?.source ?? "none",
      url: candidates[0]?.url ?? "",
    };
  }

  return {
    error: "",
    source: selected.source,
    url: selected.url,
  };
}

async function fetchCandidateAssets({ supabase, limit }) {
  const candidates = [];
  const pageSize = 100;
  let offset = 0;
  let totalMatchingRows = 0;

  while (true) {
    const { data, error } = await supabase
      .from("content_assets")
      .select("id, file_name, bucket_name, storage_path, public_url, metadata, created_at")
      .eq("asset_type", "image")
      .eq("bucket_name", VISUAL_LIBRARY_BUCKET)
      .like("storage_path", `${VISUAL_LIBRARY_PATH}/%`)
      .order("created_at", { ascending: true })
      .range(offset, offset + pageSize - 1);

    if (error) {
      throw new Error(`Lecture content_assets impossible: ${error.message}`);
    }

    const rows = data ?? [];
    if (rows.length === 0) {
      break;
    }

    for (const row of rows) {
      if (missingUsefulMetadata(row.metadata)) {
        totalMatchingRows += 1;
        if (candidates.length < limit) {
          candidates.push(row);
        }
      }
    }

    offset += pageSize;
  }

  return { candidates, totalMatchingRows };
}

async function analyzeImage({ apiKey, imageUrl, asset }) {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: visionModel(),
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: [
                "Analyse cette image de bibliotheque visuelle L'Edifice.",
                "Retourne uniquement un JSON strict, sans markdown.",
                "N'invente pas de lien avec un brouillon precis si l'image seule ne le permet pas.",
                "Schema attendu:",
                '{"title":"","description":"","tags":[],"theme":"","emotion":"","ambiance":"","visual_style":"","character_type":"","location":"","color_palette":[],"aspect_ratio":"9:16","metadata_source":"gpt_vision_backfill","metadata_version":1,"gpt_vision_score":null,"analyzed_at":""}',
                "Contraintes: title court, tags en minuscules sans accents si possible, description courte.",
                `Fichier: ${asset.file_name}`,
                `Chemin storage: ${asset.storage_path}`,
              ].join("\n"),
            },
            {
              type: "image_url",
              image_url: { url: imageUrl },
            },
          ],
        },
      ],
      max_completion_tokens: 700,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    const error = new Error(
      text.includes(INVALID_IMAGE_URL_CODE)
        ? INVALID_IMAGE_URL_CODE
        : `OpenAI Vision error: ${text.slice(0, 500)}`,
    );
    error.metadataErrorUrl = imageUrl;
    throw error;
  }

  const payload = await response.json();
  const content = payload.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("OpenAI Vision response is empty.");
  }

  return parseVisionJson(content);
}

async function markMetadataError({ supabase, asset, error, imageUrl = "" }) {
  const currentMetadata = isPlainObject(asset.metadata) ? asset.metadata : {};
  const message = error instanceof Error ? error.message : String(error);
  const metadata = {
    ...currentMetadata,
    metadata_error: message.includes(INVALID_IMAGE_URL_CODE)
      ? INVALID_IMAGE_URL_CODE
      : message.slice(0, 700),
    metadata_error_at: new Date().toISOString(),
    metadata_error_url:
      imageUrl ||
      (error instanceof Error && typeof error.metadataErrorUrl === "string"
        ? error.metadataErrorUrl
        : currentMetadata.metadata_error_url),
  };

  const { error: updateError } = await supabase
    .from("content_assets")
    .update({ metadata })
    .eq("id", asset.id);

  if (updateError) {
    console.error(`failed to store metadata_error for ${asset.id}: ${updateError.message}`);
  }
}

async function fetchAllImageAssets(supabase) {
  const rows = [];
  const pageSize = 1000;
  let offset = 0;

  while (true) {
    const { data, error } = await supabase
      .from("content_assets")
      .select("id, file_name, bucket_name, storage_path, public_url, metadata, created_at, asset_type")
      .eq("asset_type", "image")
      .order("created_at", { ascending: true })
      .range(offset, offset + pageSize - 1);

    if (error) {
      throw new Error(`Diagnostic content_assets impossible: ${error.message}`);
    }

    rows.push(...(data ?? []));

    if (!data || data.length < pageSize) {
      break;
    }

    offset += pageSize;
  }

  return rows;
}

async function checkUrls({ supabase }) {
  const assets = await fetchAllImageAssets(supabase);
  const libraryAssets = assets.filter(isLibraryVisualAsset);
  const draftAssets = assets.filter(isDraftAsset);
  const invalidExamples = [];
  let validUrls = 0;
  let invalidUrls = 0;
  let withoutPublicUrl = 0;
  let withElitePath = 0;

  console.log(`Assets bibliotheque detectes : ${libraryAssets.length}`);
  console.log(`Assets brouillons ignores : ${draftAssets.length}`);

  for (const asset of libraryAssets) {
    if (!isHttpsUrl(asset.public_url)) {
      withoutPublicUrl += 1;
    }
    if (
      String(asset.storage_path ?? "").includes("lignes-interieures/elite") ||
      String(asset.public_url ?? "").includes("lignes-interieures/elite")
    ) {
      withElitePath += 1;
    }

    const resolved = imageUrlForAsset(supabase, asset);
    if (!resolved.error) {
      validUrls += 1;
      continue;
    }

    invalidUrls += 1;
    if (invalidExamples.length < 10) {
      invalidExamples.push({
        asset_id: asset.id,
        file_name: asset.file_name,
        storage_path: asset.storage_path,
        public_url: asset.public_url,
        resolved_url: resolved.url,
        reason: resolved.error,
      });
    }
  }

  console.log(
    JSON.stringify(
      {
        totalAssetsImage: assets.length,
        assetsBibliothequeDetectes: libraryAssets.length,
        assetsBrouillonsIgnores: draftAssets.length,
        urlsValides: validUrls,
        urlsInvalides: invalidUrls,
        assetsSansPublicUrl: withoutPublicUrl,
        assetsAvecAncienCheminElite: withElitePath,
        exemplesUrlsInvalides: invalidExamples,
      },
      null,
      2,
    ),
  );
}

async function logAssetScopeCounts({ supabase }) {
  const assets = await fetchAllImageAssets(supabase);
  const libraryAssets = assets.filter(isLibraryVisualAsset);
  const draftAssets = assets.filter(isDraftAsset);

  console.log(`Assets bibliotheque detectes : ${libraryAssets.length}`);
  console.log(`Assets brouillons ignores : ${draftAssets.length}`);
}

async function libraryProgress({ supabase }) {
  const assets = await fetchAllImageAssets(supabase);
  const libraryAssets = assets.filter(isLibraryVisualAsset);
  const remaining = libraryAssets.filter((asset) =>
    missingUsefulMetadata(asset.metadata),
  ).length;
  const completed = libraryAssets.length - remaining;
  const percentage = libraryAssets.length
    ? Math.round((completed / libraryAssets.length) * 100)
    : 100;

  return {
    completed,
    percentage,
    total: libraryAssets.length,
  };
}

async function printFinalSummary({
  analyzed,
  enriched,
  errors,
  ignored,
  supabase,
}) {
  const progress = await libraryProgress({ supabase });
  const estimatedCost = analyzed * estimatedVisionUnitCostUsd();

  console.log("");
  console.log(`Visuels analyses : ${analyzed}`);
  console.log(`Visuels enrichis : ${enriched}`);
  console.log(`Visuels ignores : ${ignored}`);
  console.log(`Erreurs : ${errors}`);
  console.log(`Cout estime GPT Vision : ${estimatedCost.toFixed(4)} $`);
  console.log("");
  console.log("Progression bibliotheque :");
  console.log(`${progress.completed} / ${progress.total}`);
  console.log(`${progress.percentage}%`);
}

async function main() {
  loadEnvFile(".env.local");

  const dryRun = hasFlag("dry-run") || process.env.ASSETS_ENRICH_DRY_RUN === "1";
  const checkUrlsMode = hasFlag("check-urls");
  const limit = parseLimit();
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const apiKey = process.env.OPENAI_API_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Variables requises: SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY.");
  }

  if (!dryRun && !checkUrlsMode && !apiKey) {
    throw new Error("OPENAI_API_KEY est requis hors dry-run.");
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  if (checkUrlsMode) {
    await checkUrls({ supabase });
    return;
  }

  await logAssetScopeCounts({ supabase });

  const { candidates, totalMatchingRows } = await fetchCandidateAssets({
    supabase,
    limit,
  });

  console.log(`${totalMatchingRows} visuels a analyser`);
  console.log(`Batch actuel : ${candidates.length} visuels`);
  let analyzed = 0;
  let enriched = 0;
  let errors = 0;
  const ignored = Math.max(0, totalMatchingRows - candidates.length);

  if (candidates.length === 0) {
    await printFinalSummary({
      analyzed,
      enriched,
      errors,
      ignored,
      supabase,
    });
    return;
  }

  if (dryRun) {
    for (const [index, asset] of candidates.entries()) {
      console.log(
        `dry-run ${index + 1}/${candidates.length}: ${asset.id} ${asset.storage_path}`,
      );
    }
    await printFinalSummary({
      analyzed,
      enriched,
      errors,
      ignored: totalMatchingRows,
      supabase,
    });
    return;
  }

  for (const [index, asset] of candidates.entries()) {
    console.log(`analyzing asset ${index + 1}/${candidates.length}: ${asset.id}`);

    try {
      const resolvedImageUrl = imageUrlForAsset(supabase, asset);

      console.log(
        JSON.stringify({
          asset_id: asset.id,
          file_name: asset.file_name,
          storage_path: asset.storage_path,
          image_url: resolvedImageUrl.url,
          image_url_source: resolvedImageUrl.source,
        }),
      );

      if (resolvedImageUrl.error) {
        throw Object.assign(new Error(INVALID_IMAGE_URL_CODE), {
          metadataErrorUrl: resolvedImageUrl.url,
        });
      }

      const imageUrl = resolvedImageUrl.url;
      analyzed += 1;
      const enrichment = await analyzeImage({ apiKey, imageUrl, asset });
      const metadata = mergeMissingMetadata(asset.metadata, enrichment);
      delete metadata.metadata_error;
      delete metadata.metadata_error_at;

      const { error } = await supabase
        .from("content_assets")
        .update({ metadata })
        .eq("id", asset.id);

      if (error) {
        throw new Error(`Supabase update error: ${error.message}`);
      }

      enriched += 1;
      console.log(`success ${asset.id}`);
    } catch (error) {
      errors += 1;
      console.error(
        `failed ${asset.id}: ${error instanceof Error ? error.message : String(error)}`,
      );
      await markMetadataError({ supabase, asset, error });
    }
  }

  await printFinalSummary({
    analyzed,
    enriched,
    errors,
    ignored,
    supabase,
  });
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
