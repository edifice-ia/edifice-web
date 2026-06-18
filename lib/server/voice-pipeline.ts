import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export const VOICE_AUDIO_BUCKET = "content-assets";
export const VOICE_AUDIO_PATH = "lignes-interieures/audio";

type VoiceStatus = "not_ready" | "pending" | "generating" | "ready" | "error";

export type DraftVoiceState = {
  audioUrl: string | null;
  canGenerate: boolean;
  costEstimateUsd: number;
  durationEstimateSeconds: number;
  errorMessage: string | null;
  generatedAt: string | null;
  selectedVoiceId: string | null;
  selectedVoiceLabel: string;
  status: VoiceStatus;
};

type DraftVoiceRow = {
  id: string;
  user_id: string;
  script: string | null;
  status: string | null;
  visual_status: string | null;
  visuals_validated_at: string | null;
  voice_asset_id?: string | null;
  voice_error?: string | null;
  voice_generated_at?: string | null;
  voice_status?: string | null;
  selected_voice_id?: string | null;
};

type ContentAssetRow = {
  id: string;
  public_url: string;
  created_at: string;
};

let voiceClient: SupabaseClient | null = null;

function getVoiceClient() {
  if (voiceClient) {
    return voiceClient;
  }

  const supabaseUrl =
    process.env.SUPABASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Voice pipeline requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  }

  voiceClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return voiceClient;
}

function sanitizeVoiceId(value: unknown) {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}

function defaultVoiceId() {
  return process.env.ELEVENLABS_DEFAULT_VOICE_ID?.trim() || "21m00Tcm4TlvDq8ikWAM";
}

function voiceLabel(voiceId: string | null) {
  if (!voiceId) {
    return "Aucune voix selectionnee";
  }

  if (voiceId === "21m00Tcm4TlvDq8ikWAM") {
    return "Rachel";
  }

  return voiceId;
}

function estimateDurationSeconds(script: string | null) {
  const words = (script ?? "")
    .split(/\s+/)
    .map((word) => word.trim())
    .filter(Boolean).length;

  return Math.max(1, Math.round(words / 2.45));
}

function estimateCostUsd(script: string | null) {
  const characters = (script ?? "").length;

  return Math.max(0.01, Number((characters * 0.0003).toFixed(2)));
}

function isVisualReady(draft: DraftVoiceRow) {
  return (
    draft.status === "visual_ready" ||
    draft.status === "visuels_prets" ||
    draft.status === "voix_en_attente" ||
    draft.status === "voix_prete" ||
    draft.status === "voice_ready" ||
    draft.visual_status === "visual_ready" ||
    Boolean(draft.visuals_validated_at)
  );
}

async function readDraftVoiceRow(draftId: string, userId: string) {
  const supabase = getVoiceClient();
  const { data, error } = await supabase
    .from("content_drafts")
    .select(
      "id, user_id, script, status, visual_status, visuals_validated_at, voice_status, voice_asset_id, voice_error, voice_generated_at, selected_voice_id",
    )
    .eq("id", draftId)
    .eq("user_id", userId)
    .maybeSingle<DraftVoiceRow>();

  if (error) {
    throw new Error(`Lecture du brouillon voix impossible: ${error.message}`);
  }

  if (!data) {
    throw new Error("Brouillon introuvable ou non autorise.");
  }

  return data;
}

async function readAudioAsset(draft: DraftVoiceRow) {
  const supabase = getVoiceClient();

  if (draft.voice_asset_id) {
    const { data, error } = await supabase
      .from("content_assets")
      .select("id, public_url, created_at")
      .eq("id", draft.voice_asset_id)
      .maybeSingle<ContentAssetRow>();

    if (error) {
      throw new Error(`Lecture de l'audio impossible: ${error.message}`);
    }

    if (data) {
      return data;
    }
  }

  const { data, error } = await supabase
    .from("content_assets")
    .select("id, public_url, created_at")
    .eq("linked_draft_id", draft.id)
    .eq("asset_type", "audio")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<ContentAssetRow>();

  if (error) {
    throw new Error(`Lecture du dernier audio impossible: ${error.message}`);
  }

  return data ?? null;
}

export async function readDraftVoiceState({
  draftId,
  userId,
}: {
  draftId: string;
  userId: string;
}): Promise<DraftVoiceState> {
  const draft = await readDraftVoiceRow(draftId, userId);
  const audioAsset = await readAudioAsset(draft);
  const selectedVoiceId = sanitizeVoiceId(draft.selected_voice_id) || defaultVoiceId();
  const ready = draft.voice_status === "ready" || draft.status === "voix_prete" || draft.status === "voice_ready";
  const status: VoiceStatus = ready
    ? "ready"
    : draft.voice_status === "generating"
      ? "generating"
      : draft.voice_status === "error"
        ? "error"
        : isVisualReady(draft)
          ? "pending"
          : "not_ready";

  return {
    audioUrl: audioAsset?.public_url ?? null,
    canGenerate: isVisualReady(draft) && status !== "generating",
    costEstimateUsd: estimateCostUsd(draft.script),
    durationEstimateSeconds: estimateDurationSeconds(draft.script),
    errorMessage: draft.voice_error ?? null,
    generatedAt: draft.voice_generated_at ?? audioAsset?.created_at ?? null,
    selectedVoiceId,
    selectedVoiceLabel: voiceLabel(selectedVoiceId),
    status,
  };
}

export async function selectDraftVoice({
  draftId,
  userId,
  voiceId,
}: {
  draftId: string;
  userId: string;
  voiceId: unknown;
}) {
  const selectedVoiceId = sanitizeVoiceId(voiceId) || defaultVoiceId();
  await readDraftVoiceRow(draftId, userId);

  const { error } = await getVoiceClient()
    .from("content_drafts")
    .update({
      selected_voice_id: selectedVoiceId,
      voice_error: null,
    })
    .eq("id", draftId)
    .eq("user_id", userId);

  if (error) {
    throw new Error(`Selection de la voix impossible: ${error.message}`);
  }

  return readDraftVoiceState({ draftId, userId });
}

export async function generateDraftVoice({
  draftId,
  userId,
  voiceId,
}: {
  draftId: string;
  userId: string;
  voiceId?: unknown;
}) {
  const supabase = getVoiceClient();
  const apiKey = process.env.ELEVENLABS_API_KEY?.trim();

  if (!apiKey) {
    throw new Error("Cle ElevenLabs non configuree.");
  }

  const draft = await readDraftVoiceRow(draftId, userId);
  const selectedVoiceId = sanitizeVoiceId(voiceId) || sanitizeVoiceId(draft.selected_voice_id) || defaultVoiceId();
  const script = draft.script?.trim() ?? "";

  if (draft.voice_status === "generating") {
    throw new Error("Une generation voix est deja en cours.");
  }

  if (!isVisualReady(draft)) {
    throw new Error("Les visuels doivent etre valides avant de generer la voix.");
  }

  if (!script) {
    throw new Error("Script vide: generation voix impossible.");
  }

  const { error: lockError } = await supabase
    .from("content_drafts")
    .update({
      selected_voice_id: selectedVoiceId,
      status: "voix_en_attente",
      voice_error: null,
      voice_status: "generating",
    })
    .eq("id", draftId)
    .eq("user_id", userId)
    .neq("voice_status", "generating");

  if (lockError) {
    throw new Error(`Demarrage generation voix impossible: ${lockError.message}`);
  }

  try {
    const modelId = process.env.ELEVENLABS_MODEL_ID?.trim() || "eleven_multilingual_v2";
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${selectedVoiceId}`, {
      method: "POST",
      headers: {
        Accept: "audio/mpeg",
        "Content-Type": "application/json",
        "xi-api-key": apiKey,
      },
      body: JSON.stringify({
        model_id: modelId,
        text: script,
        voice_settings: {
          similarity_boost: 0.75,
          stability: 0.55,
          style: 0.2,
          use_speaker_boost: true,
        },
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`ElevenLabs a refuse la generation (${response.status}): ${detail.slice(0, 300)}`);
    }

    const audioBytes = Buffer.from(await response.arrayBuffer());
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const fileName = `voice-${timestamp}.mp3`;
    const storagePath = `${VOICE_AUDIO_PATH}/${draftId}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from(VOICE_AUDIO_BUCKET)
      .upload(storagePath, audioBytes, {
        contentType: "audio/mpeg",
        upsert: false,
      });

    if (uploadError) {
      throw new Error(`Stockage audio impossible: ${uploadError.message}`);
    }

    const { data: publicUrlData } = supabase.storage
      .from(VOICE_AUDIO_BUCKET)
      .getPublicUrl(storagePath);
    const publicUrl = publicUrlData.publicUrl;

    const { data: asset, error: assetError } = await supabase
      .from("content_assets")
      .insert({
        asset_type: "audio",
        bucket_name: VOICE_AUDIO_BUCKET,
        file_name: fileName,
        linked_draft_id: draftId,
        metadata: {
          content_type: "audio/mpeg",
          duration_estimate_seconds: estimateDurationSeconds(script),
          generated_by: "elevenlabs",
          model_id: modelId,
          selected_voice_id: selectedVoiceId,
          source_draft_id: draftId,
          size_bytes: audioBytes.length,
        },
        public_url: publicUrl,
        source: "elevenlabs",
        status: "available",
        storage_path: storagePath,
      })
      .select("id")
      .single<{ id: string }>();

    if (assetError) {
      throw new Error(`Creation asset audio impossible: ${assetError.message}`);
    }

    const now = new Date().toISOString();
    const { error: draftUpdateError } = await supabase
      .from("content_drafts")
      .update({
        selected_voice_id: selectedVoiceId,
        status: "voix_prete",
        voice_asset_id: asset.id,
        voice_error: null,
        voice_generated_at: now,
        voice_status: "ready",
      })
      .eq("id", draftId)
      .eq("user_id", userId);

    if (draftUpdateError) {
      throw new Error(`Mise a jour du brouillon voix impossible: ${draftUpdateError.message}`);
    }

    return readDraftVoiceState({ draftId, userId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Generation voix impossible.";
    await supabase
      .from("content_drafts")
      .update({
        voice_error: message,
        voice_status: "error",
      })
      .eq("id", draftId)
      .eq("user_id", userId);

    throw new Error(message);
  }
}
