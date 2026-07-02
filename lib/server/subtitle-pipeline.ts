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
const VOICE_AUDIO_PATH = "lignes-interieures/audio";
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

type SubtitleStatus = "pending" | "generating" | "ready" | "validated" | "ignored" | "error";

type DraftSubtitleRow = {
  id: string;
  script: string | null;
  subtitle_error: string | null;
  subtitle_mode: string | null;
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

type AudioDurationStatus = "readable" | "estimated" | "unreadable" | "missing";

type AudioDurationProbe = {
  durationSeconds: number | null;
  message: string;
  method: string;
  status: AudioDurationStatus;
  technicalDetails: string[];
};

export type DraftSubtitleState = {
  audioDurationMessage: string;
  audioDurationMethod: string;
  audioDurationSeconds: number | null;
  audioDurationStatus: AudioDurationStatus;
  canGenerate: boolean;
  durationSeconds: number;
  errorMessage: string | null;
  errorTechnicalDetails: string[];
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
  validatedAt: string | null;
  validatedBy: string | null;
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

function hasValidatedVoiceStatus(draft: DraftSubtitleRow) {
  return Boolean(
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
      draft.status === "video_en_attente",
  );
}

function defaultState(
  status: SubtitleStatus,
  canGenerate: boolean,
  options: {
    audioProbe?: AudioDurationProbe | null;
    errorMessage?: string | null;
    errorTechnicalDetails?: string[];
    mode?: SubtitleMode;
  } = {},
): DraftSubtitleState {
  const mode = options.mode ?? DEFAULT_SUBTITLE_MODE;
  const audioProbe = options.audioProbe;
  return {
    audioDurationMessage: audioProbe?.message ?? "Audio non verifie.",
    audioDurationMethod: audioProbe?.method ?? "none",
    audioDurationSeconds: audioProbe?.durationSeconds ?? null,
    audioDurationStatus: audioProbe?.status ?? "missing",
    canGenerate,
    durationSeconds: 0,
    errorMessage: status === "error" ? options.errorMessage ?? "Generation sous-titres impossible." : options.errorMessage ?? null,
    errorTechnicalDetails: options.errorTechnicalDetails ?? [],
    generatedAt: null,
    jsonUrl: null,
    localMode: subtitleModeToLocalMode(mode),
    mode,
    previewSegments: [],
    provider: SUBTITLE_PROVIDER,
    segmentsCount: 0,
    srtUrl: null,
    status,
    style: KARAOKE_STYLE,
    timingOffsetMs: TIMING_OFFSET_MS,
    validatedAt: null,
    validatedBy: null,
    vttUrl: null,
  };
}

function metadataDurationEstimate(asset: ContentAssetRow | null) {
  if (!asset) {
    return null;
  }

  const value = asset.metadata?.estimated_duration_seconds ?? asset.metadata?.duration_seconds;
  const duration = typeof value === "number" ? value : Number(value);

  return Number.isFinite(duration) && duration > 0 ? duration : null;
}

function syncSafeSize(buffer: Buffer, offset: number) {
  return (
    ((buffer[offset] & 0x7f) << 21) |
    ((buffer[offset + 1] & 0x7f) << 14) |
    ((buffer[offset + 2] & 0x7f) << 7) |
    (buffer[offset + 3] & 0x7f)
  );
}

function parseWavDurationSeconds(buffer: Buffer) {
  if (buffer.length < 44 || buffer.toString("ascii", 0, 4) !== "RIFF" || buffer.toString("ascii", 8, 12) !== "WAVE") {
    return null;
  }

  let offset = 12;
  let byteRate: number | null = null;
  let dataSize: number | null = null;

  while (offset + 8 <= buffer.length) {
    const chunkId = buffer.toString("ascii", offset, offset + 4);
    const chunkSize = buffer.readUInt32LE(offset + 4);
    const chunkDataOffset = offset + 8;

    if (chunkId === "fmt " && chunkSize >= 16 && chunkDataOffset + 12 <= buffer.length) {
      byteRate = buffer.readUInt32LE(chunkDataOffset + 8);
    }

    if (chunkId === "data") {
      dataSize = chunkSize;
    }

    offset = chunkDataOffset + chunkSize + (chunkSize % 2);
  }

  if (!byteRate || !dataSize) {
    return null;
  }

  const duration = dataSize / byteRate;
  return Number.isFinite(duration) && duration > 0 ? duration : null;
}

const mpegBitratesKbps: Record<string, number[]> = {
  "1-1": [0, 32, 64, 96, 128, 160, 192, 224, 256, 288, 320, 352, 384, 416, 448],
  "1-2": [0, 32, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 384],
  "1-3": [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320],
  "2-1": [0, 32, 48, 56, 64, 80, 96, 112, 128, 144, 160, 176, 192, 224, 256],
  "2-2": [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160],
  "2-3": [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160],
};

function parseMp3DurationSeconds(buffer: Buffer) {
  let offset = buffer.length >= 10 && buffer.toString("ascii", 0, 3) === "ID3"
    ? 10 + syncSafeSize(buffer, 6)
    : 0;
  let duration = 0;
  let frames = 0;
  let guard = 0;

  while (offset + 4 <= buffer.length && guard < 50_000) {
    guard += 1;

    if (buffer[offset] !== 0xff || (buffer[offset + 1] & 0xe0) !== 0xe0) {
      offset += 1;
      continue;
    }

    const versionBits = (buffer[offset + 1] >> 3) & 0x03;
    const layerBits = (buffer[offset + 1] >> 1) & 0x03;
    const bitrateIndex = (buffer[offset + 2] >> 4) & 0x0f;
    const sampleRateIndex = (buffer[offset + 2] >> 2) & 0x03;
    const padding = (buffer[offset + 2] >> 1) & 0x01;

    if (versionBits === 1 || layerBits === 0 || bitrateIndex === 0 || bitrateIndex === 15 || sampleRateIndex === 3) {
      offset += 1;
      continue;
    }

    const mpegVersion = versionBits === 3 ? 1 : versionBits === 2 ? 2 : 2.5;
    const layer = 4 - layerBits;
    const bitrateTableKey = `${mpegVersion === 1 ? 1 : 2}-${layer}`;
    const bitrate = (mpegBitratesKbps[bitrateTableKey]?.[bitrateIndex] ?? 0) * 1000;
    const baseSampleRates = [44_100, 48_000, 32_000];
    const sampleRate = baseSampleRates[sampleRateIndex] / (mpegVersion === 1 ? 1 : mpegVersion === 2 ? 2 : 4);

    if (!bitrate || !sampleRate) {
      offset += 1;
      continue;
    }

    const samplesPerFrame = layer === 1 ? 384 : layer === 3 && mpegVersion !== 1 ? 576 : 1152;
    const frameLength = layer === 1
      ? Math.floor((12 * bitrate / sampleRate + padding) * 4)
      : layer === 3 && mpegVersion !== 1
        ? Math.floor(72 * bitrate / sampleRate + padding)
        : Math.floor(144 * bitrate / sampleRate + padding);

    if (frameLength <= 4 || offset + frameLength > buffer.length + 1) {
      offset += 1;
      continue;
    }

    duration += samplesPerFrame / sampleRate;
    frames += 1;
    offset += frameLength;
  }

  return frames > 2 && Number.isFinite(duration) && duration > 0 ? duration : null;
}

function parseAudioDurationSeconds(buffer: Buffer) {
  return parseWavDurationSeconds(buffer) ?? parseMp3DurationSeconds(buffer);
}

async function fetchPublicAudioBytes(publicUrl: string) {
  const response = await fetch(publicUrl, { cache: "no-store" });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  return Buffer.from(await response.arrayBuffer());
}

async function downloadStorageAudioBytes(bucketName: string, storagePath: string) {
  const { data, error } = await getSubtitleClient()
    .storage
    .from(bucketName)
    .download(storagePath);

  if (error || !data) {
    throw new Error(error?.message ?? "fichier absent");
  }

  return Buffer.from(await data.arrayBuffer());
}

async function probeAudioDuration({
  draftId,
  voiceAsset,
}: {
  draftId: string;
  voiceAsset: ContentAssetRow | null;
}): Promise<AudioDurationProbe> {
  if (!voiceAsset) {
    return {
      durationSeconds: null,
      message: "Audio introuvable.",
      method: "none",
      status: "missing",
      technicalDetails: [`draft_id=${draftId}`, "audio_asset=missing"],
    };
  }

  const technicalDetails = [
    `draft_id=${draftId}`,
    `audio_storage_path=${voiceAsset.storage_path}`,
    `audio_public_url=${voiceAsset.public_url ? "present" : "missing"}`,
  ];

  const attempts: Array<{
    getBytes: () => Promise<Buffer>;
    method: string;
  }> = [];

  if (voiceAsset.public_url) {
    attempts.push({
      getBytes: () => fetchPublicAudioBytes(voiceAsset.public_url),
      method: "public_url_parser",
    });
  }

  attempts.push({
    getBytes: () => downloadStorageAudioBytes(voiceAsset.bucket_name, voiceAsset.storage_path),
    method: "storage_download_parser",
  });

  for (const attempt of attempts) {
    try {
      const bytes = await attempt.getBytes();
      const durationSeconds = parseAudioDurationSeconds(bytes);
      technicalDetails.push(`${attempt.method}=bytes:${bytes.length}`);

      if (durationSeconds) {
        return {
          durationSeconds,
          message: `Audio trouve, duree lisible (${Math.round(durationSeconds)}s).`,
          method: attempt.method,
          status: "readable",
          technicalDetails,
        };
      }

      technicalDetails.push(`${attempt.method}=duration_unreadable`);
    } catch (error) {
      technicalDetails.push(`${attempt.method}=failed:${error instanceof Error ? error.message : String(error)}`);
    }
  }

  const estimatedDuration = metadataDurationEstimate(voiceAsset);
  if (estimatedDuration) {
    return {
      durationSeconds: estimatedDuration,
      message: `Audio trouve, duree estimee depuis les metadonnees (${Math.round(estimatedDuration)}s).`,
      method: "asset_metadata_estimate",
      status: "estimated",
      technicalDetails,
    };
  }

  return {
    durationSeconds: null,
    message: "Audio trouve, mais duree non lisible. Relance la generation; si l'erreur persiste, regenere la voix.",
    method: "unreadable",
    status: "unreadable",
    technicalDetails,
  };
}

async function readDraft(draftId: string, userId: string) {
  const { data, error } = await getSubtitleClient()
    .from("content_drafts")
    .select("id, user_id, script, status, subtitle_error, subtitle_mode, voice_asset_id, voice_status, voice_validated_at")
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

function readableSubtitleFailure(error: unknown) {
  const raw = error instanceof Error ? error.message : String(error || "");

  if (/configuration elevenlabs/i.test(raw)) {
    return "Configuration ElevenLabs indisponible.";
  }
  if (/Valide la voix|voix avant/i.test(raw)) {
    return "Voix non generée pour ce brouillon.";
  }
  if (/fichier absent|introuvable|not_found|object not found/i.test(raw)) {
    return "Fichier audio introuvable dans le stockage.";
  }
  if (/download|Lecture de l'audio|Audio inaccessible/i.test(raw)) {
    return "Audio inaccessible au generateur de sous-titres.";
  }
  if (/format|audio/i.test(raw) && /refuse|unsupported|unprocessable|422/i.test(raw)) {
    return "Format audio non pris en charge.";
  }
  if (/duration probe|duree audio|durée audio/i.test(raw)) {
    return "Durée audio impossible à lire.";
  }
  if (/timing|alignement|aucun timing|aucun mot/i.test(raw)) {
    return "Alignement sous-titres impossible: ElevenLabs n'a retourné aucun timing exploitable.";
  }
  if (/ElevenLabs a refuse/i.test(raw)) {
    return raw;
  }

  return raw || "Erreur serveur lors de l'analyse audio.";
}

function storagePathFileName(storagePath: string) {
  return storagePath.split("/").filter(Boolean).at(-1) ?? storagePath;
}

function storagePathDirectory(storagePath: string) {
  const parts = storagePath.split("/").filter(Boolean);
  parts.pop();

  return parts.join("/");
}

async function storageObjectExists(bucketName: string, storagePath: string) {
  const cleanPath = storagePath.trim().replace(/^\/+/, "");
  const fileName = storagePathFileName(cleanPath);
  const directory = storagePathDirectory(cleanPath);
  const { data, error } = await getSubtitleClient()
    .storage
    .from(bucketName)
    .list(directory, {
      limit: 100,
      search: fileName,
    });

  if (error) {
    throw new Error(`Verification Storage impossible pour ${bucketName}/${cleanPath}: ${error.message}`);
  }

  return (data ?? []).some((item) => item.name === fileName);
}

async function diagnoseSubtitleReadiness(
  draft: DraftSubtitleRow,
  voiceAsset: ContentAssetRow | null,
) {
  const details = [
    `draft_status=${draft.status ?? "null"}`,
    `voice_status=${draft.voice_status ?? "null"}`,
    `voice_asset_id=${draft.voice_asset_id ?? "null"}`,
  ];

  if (!hasValidatedVoiceStatus(draft)) {
    return {
      message: "Voix non generée pour ce brouillon.",
      details,
    };
  }

  if (!voiceAsset) {
    return {
      message: "Fichier audio introuvable dans le stockage.",
      details: [...details, "audio_asset=missing"],
    };
  }

  details.push(`audio_bucket=${voiceAsset.bucket_name}`);
  details.push(`audio_storage_path=${voiceAsset.storage_path}`);
  details.push(`audio_public_url=${voiceAsset.public_url ? "present" : "missing"}`);
  details.push(`audio_status=${voiceAsset.status}`);

  if (voiceAsset.bucket_name !== SUBTITLE_BUCKET) {
    return {
      message: "Bucket audio incorrect pour ce brouillon.",
      details,
    };
  }

  if (!voiceAsset.storage_path || !voiceAsset.storage_path.startsWith(`${VOICE_AUDIO_PATH}/${draft.id}/`)) {
    return {
      message: "Chemin audio incoherent pour ce brouillon.",
      details,
    };
  }

  if (!voiceAsset.public_url) {
    return {
      message: "Audio inaccessible au generateur de sous-titres.",
      details,
    };
  }

  try {
    const exists = await storageObjectExists(voiceAsset.bucket_name, voiceAsset.storage_path);
    if (!exists) {
      return {
        message: "Fichier audio introuvable dans le stockage.",
        details,
      };
    }
  } catch (error) {
    return {
      message: "Erreur serveur lors de l'analyse audio.",
      details: [...details, error instanceof Error ? error.message : String(error)],
    };
  }

  return {
    message: "Derniere generation sous-titres echouee. Relance une generation pour obtenir le detail si l'erreur persiste.",
    details,
  };
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

  return data ?? null;
}

async function readVoiceAssetForDraft(draft: DraftSubtitleRow) {
  const supabase = getSubtitleClient();

  if (draft.voice_asset_id) {
    const asset = await readVoiceAsset(draft.voice_asset_id);

    if (asset) {
      return asset;
    }
  }

  const { data, error } = await supabase
    .from("content_assets")
    .select("id, asset_type, bucket_name, created_at, file_name, linked_draft_id, metadata, public_url, source, status, storage_path")
    .eq("linked_draft_id", draft.id)
    .eq("asset_type", "audio")
    .eq("bucket_name", SUBTITLE_BUCKET)
    .like("storage_path", `${VOICE_AUDIO_PATH}/${draft.id}/%`)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<ContentAssetRow>();

  if (error) {
    throw new Error(`Lecture du dernier audio voix impossible: ${error.message}`);
  }

  return data ?? null;
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
  const validated = metadataString(jsonAsset, "subtitle_validation_status") === "validated";
  const audioProbe: AudioDurationProbe = {
    durationSeconds,
    message: `Sous-titres generes, duree issue des timings (${Math.round(durationSeconds)}s).`,
    method: "subtitle_timings",
    status: durationSeconds > 0 ? "readable" : "unreadable",
    technicalDetails: [`subtitle_json_asset=${jsonAsset.id}`],
  };

  return {
    ...defaultState(validated ? "validated" : "ready", true, { audioProbe }),
    durationSeconds,
    generatedAt: metadataString(jsonAsset, "generated_at") ?? jsonAsset.created_at,
    jsonUrl: jsonAsset.public_url,
    localMode: subtitleModeToLocalMode(mode),
    mode,
    previewSegments: segments.slice(0, 12),
    segmentsCount,
    srtUrl: srtAsset?.public_url ?? null,
    validatedAt: metadataString(jsonAsset, "subtitle_validated_at"),
    validatedBy: metadataString(jsonAsset, "subtitle_validated_by"),
    vttUrl: vttAsset?.public_url ?? null,
  };
}

function normalizeAlignedWords(payload: unknown) {
  const root = payload && typeof payload === "object" ? payload as Record<string, unknown> : {};
  const alignment = root.alignment && typeof root.alignment === "object"
    ? root.alignment as Record<string, unknown>
    : root;
  const words = Array.isArray(alignment.words)
    ? alignment.words
    : Array.isArray(root.words)
      ? root.words
      : [];

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
    subtitle_validation_status: "pending",
    source_draft_id: draftId,
    source_voice_asset_id: sourceVoiceAssetId,
    style: KARAOKE_STYLE,
    subtitle_format: format,
    subtitle_group_id: groupId,
    timing_offset_ms: TIMING_OFFSET_MS,
    words_count: jsonSegments.reduce((sum, segment) => sum + segment.words.length, 0),
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
  const voiceAsset = hasValidatedVoiceStatus(draft)
    ? await readVoiceAssetForDraft(draft)
    : null;
  const canGenerate = Boolean(voiceAsset);
  const savedMode = normalizeSubtitleMode(draft.subtitle_mode);
  const audioProbe = canGenerate
    ? await probeAudioDuration({ draftId, voiceAsset })
    : null;

  if (draft.status === "sous_titres_en_cours") {
    return defaultState("generating", false, { audioProbe, mode: savedMode });
  }

  if (draft.status === "sous_titres_erreur") {
    const diagnostic = await diagnoseSubtitleReadiness(draft, voiceAsset);
    return defaultState("error", canGenerate, {
      audioProbe,
      errorMessage: draft.subtitle_error ?? diagnostic.message,
      errorTechnicalDetails: [
        ...diagnostic.details,
        ...(audioProbe?.technicalDetails ?? []),
        audioProbe ? `audio_duration_method=${audioProbe.method}` : "audio_duration_method=none",
        audioProbe ? `audio_duration_status=${audioProbe.status}` : "audio_duration_status=missing",
      ],
      mode: savedMode,
    });
  }

  if (draft.status === "sous_titres_ignor\u00e9s" || draft.status === "sous_titres_ignores") {
    return defaultState("ignored", canGenerate, { audioProbe, mode: savedMode });
  }

  if (!voiceAsset || !canGenerate) {
    const diagnostic = await diagnoseSubtitleReadiness(draft, voiceAsset);
    return defaultState("pending", false, {
      audioProbe,
      errorMessage: diagnostic.message,
      errorTechnicalDetails: diagnostic.details,
      mode: savedMode,
    });
  }

  const assets = await readSubtitleAssets(draftId);
  const matchingAssets = assets.filter(
    (asset) => metadataString(asset, "source_voice_asset_id") === voiceAsset.id,
  );
  const readyState = buildReadyState(matchingAssets);

  return readyState ?? defaultState("pending", true, { audioProbe, mode: savedMode });
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

  const voiceAsset = hasValidatedVoiceStatus(draft)
    ? await readVoiceAssetForDraft(draft)
    : null;

  if (!voiceAsset) {
    throw new Error("Voix non generée pour ce brouillon.");
  }

  if (draft.status === "sous_titres_en_cours") {
    throw new Error("Une generation de sous-titres est deja en cours.");
  }

  if (!voiceAsset.bucket_name || voiceAsset.bucket_name !== SUBTITLE_BUCKET) {
    throw new Error(`Bucket audio incorrect pour ce brouillon: ${voiceAsset.bucket_name || "absent"}.`);
  }

  if (!voiceAsset.storage_path || !voiceAsset.storage_path.startsWith(`${VOICE_AUDIO_PATH}/${draft.id}/`)) {
    throw new Error(`Chemin audio incoherent pour ce brouillon: ${voiceAsset.storage_path || "absent"}.`);
  }

  const exists = await storageObjectExists(voiceAsset.bucket_name, voiceAsset.storage_path);
  if (!exists) {
    throw new Error(`Fichier audio introuvable dans le stockage: ${voiceAsset.bucket_name}/${voiceAsset.storage_path}.`);
  }

  const audioProbe = await probeAudioDuration({ draftId, voiceAsset });
  console.info("[Subtitle Pipeline] audio duration probe", {
    draftId,
    audioStoragePath: voiceAsset.storage_path,
    audioPublicUrlPresent: Boolean(voiceAsset.public_url),
    durationSeconds: audioProbe.durationSeconds,
    error: audioProbe.status === "unreadable" ? audioProbe.message : null,
    method: audioProbe.method,
    status: audioProbe.status,
  });

  const { data: audioBlob, error: downloadError } = await supabase.storage
    .from(voiceAsset.bucket_name)
    .download(voiceAsset.storage_path);

  if (downloadError || !audioBlob) {
    throw new Error(`Lecture de l'audio voix impossible: ${downloadError?.message ?? "fichier absent"}`);
  }

  const { data: lockedDraft, error: lockError } = await supabase
    .from("content_drafts")
    .update({
      status: "sous_titres_en_cours",
      subtitle_error: null,
      subtitle_mode: subtitleMode,
    })
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
    if (audioBytes.length === 0) {
      throw new Error("Audio inaccessible au generateur de sous-titres: fichier vide.");
    }
    console.info("[Subtitle Pipeline] forced alignment start", {
      draftId,
      audioStoragePath: voiceAsset.storage_path,
      audioPublicUrlPresent: Boolean(voiceAsset.public_url),
      audioDurationMethod: audioProbe.method,
      audioDurationSeconds: audioProbe.durationSeconds,
      audioDurationStatus: audioProbe.status,
      audioSizeBytes: audioBytes.length,
      fileName: voiceAsset.file_name,
      subtitleMode,
    });
    const alignment = await requestForcedAlignment({
      apiKey,
      audioBytes,
      fileName: voiceAsset.file_name,
      script,
    });
    const words = applyKaraokeOffset(normalizeAlignedWords(alignment));

    if (words.length === 0) {
      throw new Error("ElevenLabs n'a retourne aucun timing mot a mot exploitable.");
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
      words,
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
      sourceVoiceAssetId: voiceAsset.id,
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
      sourceVoiceAssetId: voiceAsset.id,
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
      sourceVoiceAssetId: voiceAsset.id,
      subtitleMode,
      storagePath: `${basePath}/${jsonFileName}`,
    });

    const { error: updateError } = await supabase
      .from("content_drafts")
      .update({
        status: "sous_titres_pr\u00eats",
        subtitle_error: null,
        subtitle_mode: subtitleMode,
      })
      .eq("id", draftId)
      .eq("user_id", userId);

    if (updateError) {
      throw new Error(`Mise a jour du statut sous-titres impossible: ${updateError.message}`);
    }

    return readDraftSubtitleState({ draftId, userId });
  } catch (error) {
    const message = readableSubtitleFailure(error);
    console.error("[Subtitle Pipeline] generation failed", {
      draftId,
      audioStoragePath: voiceAsset.storage_path,
      audioPublicUrlPresent: Boolean(voiceAsset.public_url),
      audioDurationMethod: audioProbe.method,
      audioDurationSeconds: audioProbe.durationSeconds,
      audioDurationStatus: audioProbe.status,
      error: error instanceof Error ? error.message : String(error),
      readableMessage: message,
    });
    await supabase
      .from("content_drafts")
      .update({
        status: "sous_titres_erreur",
        subtitle_error: message,
        subtitle_mode: subtitleMode,
      })
      .eq("id", draftId)
      .eq("user_id", userId);

    throw new Error(message);
  }
}

export async function validateDraftSubtitles({
  draftId,
  userId,
}: {
  draftId: string;
  userId: string;
}) {
  const draft = await readDraft(draftId, userId);
  const voiceAsset = hasValidatedVoiceStatus(draft)
    ? await readVoiceAssetForDraft(draft)
    : null;

  if (!voiceAsset) {
    throw new Error("Valide une voix avant de valider les sous-titres.");
  }

  const assets = await readSubtitleAssets(draftId);
  const matchingAssets = assets.filter(
    (asset) => metadataString(asset, "source_voice_asset_id") === voiceAsset.id,
  );
  const jsonAsset = matchingAssets.find((asset) => subtitleFormat(asset) === "json");

  if (!jsonAsset) {
    throw new Error("Genere les sous-titres avant de les valider.");
  }

  const groupId = metadataString(jsonAsset, "subtitle_group_id");
  const groupAssets = groupId
    ? matchingAssets.filter((asset) => metadataString(asset, "subtitle_group_id") === groupId)
    : [jsonAsset];
  const now = new Date().toISOString();
  const supabase = getSubtitleClient();

  for (const asset of groupAssets) {
    const { error } = await supabase
      .from("content_assets")
      .update({
        metadata: {
          ...(asset.metadata ?? {}),
          subtitle_validated_at: now,
          subtitle_validated_by: userId,
          subtitle_validation_status: "validated",
          validated_mode: metadataString(jsonAsset, "mode") ?? DEFAULT_SUBTITLE_MODE,
        },
      })
      .eq("id", asset.id);

    if (error) {
      throw new Error(`Validation des sous-titres impossible: ${error.message}`);
    }
  }

  const { error: draftError } = await supabase
    .from("content_drafts")
    .update({
      status: "video_en_attente",
      subtitle_error: null,
      subtitle_mode: normalizeSubtitleMode(metadataString(jsonAsset, "mode")),
    })
    .eq("id", draftId)
    .eq("user_id", userId);

  if (draftError) {
    throw new Error(`Mise a jour du statut video impossible: ${draftError.message}`);
  }

  return readDraftSubtitleState({ draftId, userId });
}

export async function ignoreDraftSubtitles({
  draftId,
  userId,
}: {
  draftId: string;
  userId: string;
}) {
  const draft = await readDraft(draftId, userId);

  const voiceAsset = hasValidatedVoiceStatus(draft)
    ? await readVoiceAssetForDraft(draft)
    : null;

  if (!voiceAsset) {
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
