import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  DEFAULT_SUBTITLE_MODE,
  normalizeSubtitleMode,
  subtitleModeToLocalMode,
  type SubtitleMode,
} from "@/lib/subtitles";

const ELEVENLABS_FORCED_ALIGNMENT_URL = "https://api.elevenlabs.io/v1/forced-alignment";
const SUBTITLE_BUCKET = "content-assets";
const SUBTITLE_PATH = "lignes-interieures/subtitles";
const SUBTITLE_PROVIDER = "elevenlabs";
const TIMING_OFFSET_MS = 600;
const SRT_MAX_WORDS = 7;
const SRT_MAX_DURATION_SECONDS = 2.0;

const KARAOKE_STYLE = {
  bottom_margin: 330,
  font_scale: 1.0,
  font_size: 160,
  max_lines: 2,
  max_width_ratio: 0.82,
  shadow: 0,
  stroke_width: 0.9,
} as const;

type SubtitleStatus = "pending" | "generating" | "ready" | "ignored" | "error";

type DraftSubtitleRow = {
  id: string;
  script: string | null;
  status: string | null;
  user_id: string;
  voice_asset_id: string | null;
  voice_status: string | null;
  voice_validated_at: string | null;
};

type ContentAssetRow = {
  id: string;
  asset_type: "image" | "audio" | "video" | "subtitle";
  bucket_name: string;
  created_at: string;
  file_name: string;
  linked_draft_id: string | null;
  metadata: Record<string, unknown> | null;
  public_url: string;
  source: string;
  status: string;
  storage_path: string;
};

type AlignedWord = {
  end: number;
  original_end?: number;
  original_start?: number;
  start: number;
  text: string;
};

type SubtitleSegment = {
  end: number;
  text: string;
  start: number;
  words: AlignedWord[];
};

export type DraftSubtitleState = {
  canGenerate: boolean;
  durationSeconds: number;
  errorMessage: string | null;
  generatedAt: string | null;
  jsonUrl: string | null;
  localMode: "karaoke" | "srt";
  mode: SubtitleMode;
  previewSegments: SubtitleSegment[];
  provider: typeof SUBTITLE_PROVIDER;
  segmentsCount: number;
  srtUrl: string | null;
  status: SubtitleStatus;
  style: typeof KARAOKE_STYLE;
  timingOffsetMs: typeof TIMING_OFFSET_MS;
  vttUrl: string | null;
};

let subtitleClient: SupabaseClient | null = null;

function getSubtitleClient() {
  if (subtitleClient) {
    return subtitleClient;
  }

  const supabaseUrl =
    process.env.SUPABASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Subtitle pipeline requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  }

  subtitleClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return subtitleClient;
}

function cleanText(value: string | null) {
  return (value ?? "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function isVoiceValidated(draft: DraftSubtitleRow) {
  return Boolean(
    draft.voice_asset_id &&
      (
        draft.voice_status === "validated" ||
        draft.voice_validated_at ||
        draft.status === "voix_valid\u00e9e" ||
        draft.status === "voix_validee" ||
        draft.status === "sous_titres_en_attente" ||
        draft.status === "sous_titres_en_cours" ||
        draft.status === "sous_titres_pr\u00eats" ||
        draft.status === "sous_titres_prets" ||
        draft.status === "sous_titres_ignor\u00e9s" ||
        draft.status === "sous_titres_ignores" ||
        draft.status === "sous_titres_erreur" ||
        draft.status === "video_en_attente"
      ),
  );
}

function defaultState(status: SubtitleStatus, canGenerate: boolean): DraftSubtitleState {
  return {
    canGenerate,
    durationSeconds: 0,
    errorMessage: status === "error" ? "Generation sous-titres impossible." : null,
    generatedAt: null,
    jsonUrl: null,
    localMode: subtitleModeToLocalMode(DEFAULT_SUBTITLE_MODE),
    mode: DEFAULT_SUBTITLE_MODE,
    previewSegments: [],
    provider: SUBTITLE_PROVIDER,
    segmentsCount: 0,
    srtUrl: null,
    status,
    style: KARAOKE_STYLE,
    timingOffsetMs: TIMING_OFFSET_MS,
    vttUrl: null,
  };
}

async function readDraft(draftId: string, userId: string) {
  const { data, error } = await getSubtitleClient()
    .from("content_drafts")
    .select("id, user_id, script, status, voice_asset_id, voice_status, voice_validated_at")
    .eq("id", draftId)
    .eq("user_id", userId)
    .maybeSingle<DraftSubtitleRow>();

  if (error) {
    throw new Error(`Lecture du brouillon sous-titres impossible: ${error.message}`);
  }

  if (!data) {
    throw new Error("Brouillon introuvable ou non autorise.");
  }

  return data;
}

async function readVoiceAsset(assetId: string) {
  const { data, error } = await getSubtitleClient()
    .from("content_assets")
    .select("id, asset_type, bucket_name, created_at, file_name, linked_draft_id, metadata, public_url, source, status, storage_path")
    .eq("id", assetId)
    .eq("asset_type", "audio")
    .maybeSingle<ContentAssetRow>();

  if (error) {
    throw new Error(`Lecture de l'audio voix impossible: ${error.message}`);
  }

  if (!data) {
    throw new Error("Audio voix introuvable.");
  }

  return data;
}

async function readSubtitleAssets(draftId: string) {
  const { data, error } = await getSubtitleClient()
    .from("content_assets")
    .select("id, asset_type, bucket_name, created_at, file_name, linked_draft_id, metadata, public_url, source, status, storage_path")
    .eq("linked_draft_id", draftId)
    .eq("asset_type", "subtitle")
    .eq("source", SUBTITLE_PROVIDER)
    .order("created_at", { ascending: false })
    .limit(30)
    .returns<ContentAssetRow[]>();

  if (error) {
    throw new Error(`Lecture des sous-titres impossible: ${error.message}`);
  }

  return data ?? [];
}

function metadataString(asset: ContentAssetRow, key: string) {
  const value = asset.metadata?.[key];

  return typeof value === "string" ? value : null;
}

function metadataNumber(asset: ContentAssetRow, key: string) {
  const value = asset.metadata?.[key];
  const number = typeof value === "number" ? value : Number(value);

  return Number.isFinite(number) ? number : null;
}

function subtitleFormat(asset: ContentAssetRow) {
  return metadataString(asset, "subtitle_format");
}

function parseSegmentsFromAsset(asset: ContentAssetRow): SubtitleSegment[] {
  const segments = asset.metadata?.segments;

  if (!Array.isArray(segments)) {
    return [];
  }

  const parsedSegments: SubtitleSegment[] = [];

  for (const segment of segments) {
    if (!segment || typeof segment !== "object") {
      continue;
    }

    const record = segment as Record<string, unknown>;
    const start = Number(record.start);
    const end = Number(record.end);
    const text = typeof record.text === "string" ? record.text : "";

    if (!Number.isFinite(start) || !Number.isFinite(end) || !text) {
      continue;
    }

    parsedSegments.push({
      end,
      start,
      text,
      words: [],
    });
  }

  return parsedSegments;
}

function buildReadyState(assets: ContentAssetRow[]): DraftSubtitleState | null {
  const jsonAsset = assets.find((asset) => subtitleFormat(asset) === "json");

  if (!jsonAsset) {
    return null;
  }

  const groupId = metadataString(jsonAsset, "subtitle_group_id");
  const groupAssets = groupId
    ? assets.filter((asset) => metadataString(asset, "subtitle_group_id") === groupId)
    : assets;
  const srtAsset = groupAssets.find((asset) => subtitleFormat(asset) === "srt");
  const vttAsset = groupAssets.find((asset) => subtitleFormat(asset) === "vtt");
  const segments = parseSegmentsFromAsset(jsonAsset);
  const segmentsCount = metadataNumber(jsonAsset, "segments_count") ?? segments.length;
  const durationSeconds = metadataNumber(jsonAsset, "duration_seconds") ?? 0;
  const mode = normalizeSubtitleMode(metadataString(jsonAsset, "mode"));

  return {
    ...defaultState("ready", true),
    durationSeconds,
    generatedAt: metadataString(jsonAsset, "generated_at") ?? jsonAsset.created_at,
    jsonUrl: jsonAsset.public_url,
    localMode: subtitleModeToLocalMode(mode),
    mode,
    previewSegments: segments.slice(0, 12),
    segmentsCount,
    srtUrl: srtAsset?.public_url ?? null,
    vttUrl: vttAsset?.public_url ?? null,
  };
}

function normalizeAlignedWords(payload: unknown) {
  const root = payload && typeof payload === "object" ? payload as Record<string, unknown> : {};
  const alignment = root.alignment && typeof root.alignment === "object"
    ? root.alignment as Record<string, unknown>
    : root;
  const words = Array.isArray(alignment.words) ? alignment.words : [];

  return words
    .map((word) => {
      if (!word || typeof word !== "object") {
        return null;
      }

      const record = word as Record<string, unknown>;
      const text = String(record.text ?? record.word ?? "").trim();
      const start = Number(record.start ?? record.start_time);
      const end = Number(record.end ?? record.end_time);

      if (!text || !Number.isFinite(start) || !Number.isFinite(end) || end < start) {
        return null;
      }

      return { end, start, text };
    })
    .filter((word): word is AlignedWord => Boolean(word));
}

function applyKaraokeOffset(words: AlignedWord[]) {
  const offsetSeconds = TIMING_OFFSET_MS / 1000;

  return words.map((word) => ({
    ...word,
    end: Math.max(0, word.end + offsetSeconds),
    original_end: word.end,
    original_start: word.start,
    start: Math.max(0, word.start + offsetSeconds),
  }));
}

function isSentenceBoundary(text: string) {
  return /[.!?;:]$/.test(text.trim());
}

function buildSegments(words: AlignedWord[]) {
  const segments: SubtitleSegment[] = [];
  let current: AlignedWord[] = [];

  for (const word of words) {
    current.push(word);
    const start = current[0]?.start ?? word.start;
    const duration = word.end - start;

    if (
      current.length >= SRT_MAX_WORDS ||
      duration >= SRT_MAX_DURATION_SECONDS ||
      isSentenceBoundary(word.text)
    ) {
      segments.push(wordsToSegment(current));
      current = [];
    }
  }

  if (current.length > 0) {
    segments.push(wordsToSegment(current));
  }

  return segments;
}

function wordsToSegment(words: AlignedWord[]): SubtitleSegment {
  return {
    end: words[words.length - 1]?.end ?? 0,
    start: words[0]?.start ?? 0,
    text: words.map((word) => word.text).join(" ").trim(),
    words,
  };
}

function srtTimestamp(seconds: number) {
  const totalMs = Math.max(0, Math.round(seconds * 1000));
  const hours = Math.floor(totalMs / 3_600_000);
  const minutes = Math.floor(totalMs % 3_600_000 / 60_000);
  const secs = Math.floor(totalMs % 60_000 / 1000);
  const ms = totalMs % 1000;

  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")},${ms.toString().padStart(3, "0")}`;
}

function vttTimestamp(seconds: number) {
  return srtTimestamp(seconds).replace(",", ".");
}

function segmentsToSrt(segments: SubtitleSegment[]) {
  return segments
    .map((segment, index) => [
      String(index + 1),
      `${srtTimestamp(segment.start)} --> ${srtTimestamp(segment.end)}`,
      segment.text,
    ].join("\n"))
    .join("\n\n") + "\n";
}

function segmentsToVtt(segments: SubtitleSegment[]) {
  return "WEBVTT\n\n" + segments
    .map((segment) => [
      `${vttTimestamp(segment.start)} --> ${vttTimestamp(segment.end)}`,
      segment.text,
    ].join("\n"))
    .join("\n\n") + "\n";
}

async function requestForcedAlignment({
  apiKey,
  audioBytes,
  fileName,
  script,
}: {
  apiKey: string;
  audioBytes: Buffer;
  fileName: string;
  script: string;
}) {
  const formData = new FormData();
  const audioPart = new Uint8Array(audioBytes);
  formData.set("text", script);
  formData.set("file", new Blob([audioPart], { type: "audio/mpeg" }), fileName);

  const response = await fetch(ELEVENLABS_FORCED_ALIGNMENT_URL, {
    body: formData,
    headers: {
      "xi-api-key": apiKey,
    },
    method: "POST",
  });

  if (!response.ok) {
    throw new Error(`ElevenLabs a refuse l'alignement (${response.status}).`);
  }

  return response.json() as Promise<unknown>;
}

async function uploadSubtitleAsset({
  content,
  contentType,
  draftId,
  fileName,
  format,
  generatedAt,
  groupId,
  jsonSegments,
  sourceVoiceAssetId,
  storagePath,
  subtitleMode,
}: {
  content: Buffer | string;
  contentType: string;
  draftId: string;
  fileName: string;
  format: "srt" | "vtt" | "json";
  generatedAt: string;
  groupId: string;
  jsonSegments: SubtitleSegment[];
  sourceVoiceAssetId: string;
  storagePath: string;
  subtitleMode: SubtitleMode;
}) {
  const supabase = getSubtitleClient();
  const durationSeconds = jsonSegments.at(-1)?.end ?? 0;
  const localMode = subtitleModeToLocalMode(subtitleMode);
  const metadata = {
    asset_role: "short_subtitles",
    duration_seconds: durationSeconds,
    generated_at: generatedAt,
    language: "fr",
    local_mode: localMode,
    mode: subtitleMode,
    provider: SUBTITLE_PROVIDER,
    segments: format === "json" ? jsonSegments : undefined,
    segments_count: jsonSegments.length,
    source_draft_id: draftId,
    source_voice_asset_id: sourceVoiceAssetId,
    style: KARAOKE_STYLE,
    subtitle_format: format,
    subtitle_group_id: groupId,
    timing_offset_ms: TIMING_OFFSET_MS,
  };

  const { error: uploadError } = await supabase.storage
    .from(SUBTITLE_BUCKET)
    .upload(storagePath, content, {
      contentType,
      upsert: false,
    });

  if (uploadError) {
    throw new Error(`Stockage ${format.toUpperCase()} impossible: ${uploadError.message}`);
  }

  const { data: publicUrlData } = supabase.storage
    .from(SUBTITLE_BUCKET)
    .getPublicUrl(storagePath);

  const { error: assetError } = await supabase
    .from("content_assets")
    .upsert({
      asset_type: "subtitle",
      bucket_name: SUBTITLE_BUCKET,
      file_name: fileName,
      linked_draft_id: draftId,
      metadata,
      public_url: publicUrlData.publicUrl,
      source: SUBTITLE_PROVIDER,
      status: "available",
      storage_path: storagePath,
    }, { onConflict: "storage_path" });

  if (assetError) {
    throw new Error(`Creation asset ${format.toUpperCase()} impossible: ${assetError.message}`);
  }
}

export async function readDraftSubtitleState({
  draftId,
  userId,
}: {
  draftId: string;
  userId: string;
}): Promise<DraftSubtitleState> {
  const draft = await readDraft(draftId, userId);
  const canGenerate = isVoiceValidated(draft);

  if (draft.status === "sous_titres_en_cours") {
    return defaultState("generating", false);
  }

  if (draft.status === "sous_titres_erreur") {
    return defaultState("error", canGenerate);
  }

  if (draft.status === "sous_titres_ignor\u00e9s" || draft.status === "sous_titres_ignores") {
    return defaultState("ignored", canGenerate);
  }

  if (!draft.voice_asset_id || !canGenerate) {
    return defaultState("pending", false);
  }

  const assets = await readSubtitleAssets(draftId);
  const matchingAssets = assets.filter(
    (asset) => metadataString(asset, "source_voice_asset_id") === draft.voice_asset_id,
  );
  const readyState = buildReadyState(matchingAssets);

  return readyState ?? defaultState("pending", true);
}

export async function generateDraftSubtitles({
  draftId,
  mode,
  userId,
}: {
  draftId: string;
  mode?: unknown;
  userId: string;
}) {
  const supabase = getSubtitleClient();
  const apiKey = process.env.ELEVENLABS_API_KEY?.trim();
  const subtitleMode = normalizeSubtitleMode(mode);
  const localMode = subtitleModeToLocalMode(subtitleMode);

  if (!apiKey) {
    throw new Error("Configuration ElevenLabs indisponible.");
  }

  const draft = await readDraft(draftId, userId);
  const script = cleanText(draft.script);

  if (!script) {
    throw new Error("Texte valide requis avant de generer les sous-titres.");
  }

  if (!draft.voice_asset_id || !isVoiceValidated(draft)) {
    throw new Error("Valide la voix avant de generer les sous-titres.");
  }

  if (draft.status === "sous_titres_en_cours") {
    throw new Error("Une generation de sous-titres est deja en cours.");
  }

  const voiceAsset = await readVoiceAsset(draft.voice_asset_id);
  const { data: audioBlob, error: downloadError } = await supabase.storage
    .from(voiceAsset.bucket_name)
    .download(voiceAsset.storage_path);

  if (downloadError || !audioBlob) {
    throw new Error(`Lecture de l'audio voix impossible: ${downloadError?.message ?? "fichier absent"}`);
  }

  const { data: lockedDraft, error: lockError } = await supabase
    .from("content_drafts")
    .update({ status: "sous_titres_en_cours" })
    .eq("id", draftId)
    .eq("user_id", userId)
    .neq("status", "sous_titres_en_cours")
    .select("id")
    .maybeSingle<{ id: string }>();

  if (lockError) {
    throw new Error(`Demarrage sous-titres impossible: ${lockError.message}`);
  }

  if (!lockedDraft) {
    throw new Error("Une generation de sous-titres est deja en cours.");
  }

  try {
    const audioBytes = Buffer.from(await audioBlob.arrayBuffer());
    const alignment = await requestForcedAlignment({
      apiKey,
      audioBytes,
      fileName: voiceAsset.file_name,
      script,
    });
    const words = applyKaraokeOffset(normalizeAlignedWords(alignment));

    if (words.length === 0) {
      throw new Error("ElevenLabs n'a retourne aucun timing exploitable.");
    }

    const segments = buildSegments(words);
    const durationSeconds = segments.at(-1)?.end ?? 0;
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const generatedAt = new Date().toISOString();
    const groupId = `subtitles-${timestamp}`;
    const basePath = `${SUBTITLE_PATH}/${draftId}`;
    const srtFileName = `${groupId}.srt`;
    const vttFileName = `${groupId}.vtt`;
    const jsonFileName = `${groupId}.json`;
    const jsonPayload = {
      duration_seconds: durationSeconds,
      language: "fr",
      local_mode: localMode,
      mode: subtitleMode,
      provider: SUBTITLE_PROVIDER,
      segments,
      style: KARAOKE_STYLE,
      timing_offset_ms: TIMING_OFFSET_MS,
    };

    await uploadSubtitleAsset({
      content: segmentsToSrt(segments),
      contentType: "application/x-subrip; charset=utf-8",
      draftId,
      fileName: srtFileName,
      format: "srt",
      generatedAt,
      groupId,
      jsonSegments: segments,
      sourceVoiceAssetId: draft.voice_asset_id,
      subtitleMode,
      storagePath: `${basePath}/${srtFileName}`,
    });
    await uploadSubtitleAsset({
      content: segmentsToVtt(segments),
      contentType: "text/vtt; charset=utf-8",
      draftId,
      fileName: vttFileName,
      format: "vtt",
      generatedAt,
      groupId,
      jsonSegments: segments,
      sourceVoiceAssetId: draft.voice_asset_id,
      subtitleMode,
      storagePath: `${basePath}/${vttFileName}`,
    });
    await uploadSubtitleAsset({
      content: JSON.stringify(jsonPayload, null, 2),
      contentType: "application/json; charset=utf-8",
      draftId,
      fileName: jsonFileName,
      format: "json",
      generatedAt,
      groupId,
      jsonSegments: segments,
      sourceVoiceAssetId: draft.voice_asset_id,
      subtitleMode,
      storagePath: `${basePath}/${jsonFileName}`,
    });

    const { error: updateError } = await supabase
      .from("content_drafts")
      .update({ status: "sous_titres_pr\u00eats" })
      .eq("id", draftId)
      .eq("user_id", userId);

    if (updateError) {
      throw new Error(`Mise a jour du statut sous-titres impossible: ${updateError.message}`);
    }

    return readDraftSubtitleState({ draftId, userId });
  } catch (error) {
    await supabase
      .from("content_drafts")
      .update({ status: "sous_titres_erreur" })
      .eq("id", draftId)
      .eq("user_id", userId);

    throw error;
  }
}

export async function ignoreDraftSubtitles({
  draftId,
  userId,
}: {
  draftId: string;
  userId: string;
}) {
  const draft = await readDraft(draftId, userId);

  if (!isVoiceValidated(draft)) {
    throw new Error("Valide la voix avant d'ignorer les sous-titres.");
  }

  const { error } = await getSubtitleClient()
    .from("content_drafts")
    .update({ status: "sous_titres_ignor\u00e9s" })
    .eq("id", draftId)
    .eq("user_id", userId);

  if (error) {
    throw new Error(`Sous-titres ignorables indisponibles: ${error.message}`);
  }

  return readDraftSubtitleState({ draftId, userId });
}
