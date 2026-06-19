export type ShortWorkflowStepStatus =
  | "pending"
  | "in_progress"
  | "generating"
  | "ready"
  | "validated"
  | "error";

export type ShortWorkflowState = {
  text: "pending" | "validated";
  visuals: "pending" | "in_progress" | "ready" | "validated";
  voice: "pending" | "generating" | "ready" | "validated" | "error";
  video: "pending" | "generating" | "ready" | "validated";
  readyToPublish: "pending" | "validated";
  overallStatus: string;
  nextStep: string;
  reasons: Record<"text" | "visuals" | "voice" | "video" | "readyToPublish", string>;
  raw: {
    draftStatus: string | null;
    mediaPipelineStatus: string | null;
    visualStatus: string | null;
    visualsValidatedAt: string | null;
    voiceStatus: string | null;
    voiceAudioUrl: string | null;
    videoStatus: string | null;
    selectedAssetsCount: number;
    visualScenesCount: number;
    retainedVisualScenesCount: number;
    requiredVisualCount: number;
  };
};

export type ShortWorkflowDraftInput = {
  status?: string | null;
  script?: string | null;
  visualStatus?: string | null;
  visual_status?: string | null;
  visualsValidatedAt?: string | null;
  visuals_validated_at?: string | null;
};

export type ShortWorkflowVisualSceneInput = {
  generationStatus?: string | null;
  locked?: boolean | null;
  imageUrl?: string | null;
};

export type ShortWorkflowMediaInput = {
  mediaPipelineStatus?: string | null;
  selectedAssets?: unknown[] | null;
  visualScenes?: ShortWorkflowVisualSceneInput[] | null;
  voice?: ShortWorkflowVoiceInput | null;
};

export type ShortWorkflowVoiceInput = {
  audioUrl?: string | null;
  generatedAt?: string | null;
  status?: string | null;
};

export type ShortWorkflowVideoInput = {
  status?: string | null;
};

const textValidatedStatuses = new Set([
  "approved",
  "validated",
  "visual_ready",
  "visuels_prets",
  "voix_en_attente",
  "voix_en_cours",
  "voix_erreur",
  "voix_prete",
  "voix_prête",
  "voix_validée",
  "voix_validee",
  "video_en_attente",
  "voice_ready",
  "ready_to_publish",
]);

const visualReadyStatuses = new Set([
  "media_ready",
  "visual_ready",
  "visuels_prets",
  "voix_en_attente",
  "voix_en_cours",
  "voix_erreur",
  "voix_prete",
  "voix_prête",
  "voix_validée",
  "voix_validee",
  "video_en_attente",
  "voice_ready",
  "ready_to_publish",
]);

const voiceReadyStatuses = new Set(["voix_prete", "voix_prête", "voice_ready", "ready_to_publish"]);
const voiceValidatedStatuses = new Set(["voix_validée", "voix_validee", "video_en_attente", "ready_to_publish"]);

function normalizeStatus(value: string | null | undefined) {
  return value?.trim() || null;
}

function retainedVisualCount(scenes: ShortWorkflowVisualSceneInput[]) {
  return scenes.filter((scene) =>
    Boolean(scene.locked) ||
    scene.generationStatus === "retained" ||
    scene.generationStatus === "ready" ||
    scene.generationStatus === "selected_from_library" ||
    Boolean(scene.imageUrl),
  ).length;
}

function isVisualInProgress(scenes: ShortWorkflowVisualSceneInput[]) {
  return scenes.some((scene) =>
    scene.generationStatus === "pending" ||
    scene.generationStatus === "searching_library" ||
    scene.generationStatus === "scoring" ||
    scene.generationStatus === "generating" ||
    scene.generationStatus === "uploading",
  );
}

export function getShortWorkflowState({
  draft,
  media,
  requiredVisualCount = 0,
  video,
}: {
  draft?: ShortWorkflowDraftInput | null;
  media?: ShortWorkflowMediaInput | null;
  requiredVisualCount?: number;
  video?: ShortWorkflowVideoInput | null;
}): ShortWorkflowState {
  const draftStatus = normalizeStatus(draft?.status);
  const mediaPipelineStatus = normalizeStatus(media?.mediaPipelineStatus);
  const visualStatus = normalizeStatus(draft?.visualStatus ?? draft?.visual_status);
  const visualsValidatedAt = normalizeStatus(
    draft?.visualsValidatedAt ?? draft?.visuals_validated_at,
  );
  const voiceStatus = normalizeStatus(media?.voice?.status);
  const voiceAudioUrl = normalizeStatus(media?.voice?.audioUrl);
  const videoStatus = normalizeStatus(video?.status);
  const visualScenes = media?.visualScenes ?? [];
  const selectedAssetsCount = media?.selectedAssets?.length ?? 0;
  const retainedScenesCount = retainedVisualCount(visualScenes);
  const effectiveRequiredVisualCount =
    requiredVisualCount || visualScenes.length || selectedAssetsCount;

  const text = draftStatus && textValidatedStatuses.has(draftStatus)
    ? "validated"
    : "pending";
  const visualsValidated = Boolean(visualsValidatedAt) ||
    visualStatus === "visual_ready" ||
    draftStatus === "ready_to_publish";
  const visualsReady = visualsValidated ||
    Boolean(draftStatus && visualReadyStatuses.has(draftStatus)) ||
    Boolean(mediaPipelineStatus && visualReadyStatuses.has(mediaPipelineStatus)) ||
    (
      effectiveRequiredVisualCount > 0 &&
      retainedScenesCount >= effectiveRequiredVisualCount
    ) ||
    (
      effectiveRequiredVisualCount > 0 &&
      selectedAssetsCount >= effectiveRequiredVisualCount
    );
  const visuals = visualsValidated
    ? "validated"
    : visualsReady
      ? "ready"
      : isVisualInProgress(visualScenes)
        ? "in_progress"
        : "pending";

  const voiceValidated = voiceStatus === "validated" ||
    Boolean(draftStatus && voiceValidatedStatuses.has(draftStatus));
  const voiceGenerated = voiceValidated ||
    voiceStatus === "ready" ||
    Boolean(voiceAudioUrl) ||
    Boolean(draftStatus && voiceReadyStatuses.has(draftStatus));
  const voice = voiceValidated
    ? "validated"
    : voiceStatus === "error" || draftStatus === "voix_erreur"
      ? "error"
      : voiceStatus === "generating" || draftStatus === "voix_en_cours"
        ? "generating"
        : voiceGenerated
          ? "ready"
          : "pending";

  const videoState = videoStatus === "validated" || draftStatus === "ready_to_publish"
    ? "validated"
    : videoStatus === "ready"
      ? "ready"
      : videoStatus === "generating"
        ? "generating"
        : "pending";
  const readyToPublish = draftStatus === "ready_to_publish" ? "validated" : "pending";

  const nextStep = text === "pending"
    ? "Valider le texte"
    : visuals === "pending"
      ? "Preparer les visuels"
      : visuals === "in_progress"
        ? "Terminer les visuels"
        : voice === "pending"
          ? "Generer la voix"
          : voice === "generating"
            ? "Attendre la voix"
            : voice === "error"
              ? "Corriger la voix"
              : videoState === "pending"
                ? "video_en_attente"
                : readyToPublish === "pending"
                  ? "Valider la publication"
                  : "Pret a publier";

  return {
    text,
    visuals,
    voice,
    video: videoState,
    readyToPublish,
    overallStatus: readyToPublish === "validated" ? "ready_to_publish" : nextStep,
    nextStep,
    reasons: {
      text: text === "validated"
        ? `content_drafts.status=${draftStatus}`
        : "Aucun statut texte valide detecte.",
      visuals: visualsReady
        ? `Visuels termines via status=${draftStatus}, visual_status=${visualStatus}, media=${mediaPipelineStatus}, scenes=${retainedScenesCount}/${effectiveRequiredVisualCount}.`
        : `Visuels incomplets: scenes=${retainedScenesCount}/${effectiveRequiredVisualCount}.`,
      voice: voiceGenerated
        ? `Voix detectee via voice.status=${voiceStatus}, audio=${Boolean(voiceAudioUrl)}, draft=${draftStatus}.`
        : `Voix non generee: voice.status=${voiceStatus ?? "null"}.`,
      video: videoState === "pending"
        ? "Aucune video generee detectee."
        : `Video=${videoStatus ?? draftStatus}.`,
      readyToPublish: readyToPublish === "validated"
        ? "content_drafts.status=ready_to_publish"
        : "Publication finale non validee.",
    },
    raw: {
      draftStatus,
      mediaPipelineStatus,
      visualStatus,
      visualsValidatedAt,
      voiceStatus,
      voiceAudioUrl,
      videoStatus,
      selectedAssetsCount,
      visualScenesCount: visualScenes.length,
      retainedVisualScenesCount: retainedScenesCount,
      requiredVisualCount: effectiveRequiredVisualCount,
    },
  };
}
