"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { SectionContainer } from "@/components/cockpit/SectionContainer";
import { getRequiredVisualSceneCount, parseVisualPrompts } from "@/lib/content/visual-prompts";

type ContentDraft = {
  id: string;
  createdAt: string;
  title: string;
  theme: string;
  status: string;
  visualPrompt: string;
  score: {
    total: number;
    durationPreset?: "ultra_short" | "short" | "medium" | "long";
    requiredVisualSceneCount?: number;
  };
};

type VisualAsset = {
  id: string;
  fileName: string;
  publicUrl: string;
  status: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  score: number;
  scoreReason: string;
  scoreBreakdown: VisualScoreBreakdown;
};

type VisualScoreBreakdown = {
  total: number;
  promptImage: number;
  imageDraft: number;
  visualQuality: number;
  narrativeContinuity: number;
  editorialSafety: number;
  estimatedWithoutVision: boolean;
  reason: string;
  matchedTerms: string[];
  sceneIndex: number | null;
  tagsMatch?: number;
  themeMatch?: number;
  emotionMatch?: number;
  ambianceMatch?: number;
  characterMatch?: number;
  styleMatch?: number;
  promptMatch?: number;
  visionScoreBonus?: number;
  metadataScoreTotal?: number;
  metadataSourceScores?: Record<string, number>;
};

type SelectedDraftAsset = VisualAsset & {
  linkId: string;
  assetSource: "library" | "generated";
  usageOrder: number;
};

type MediaPipelineState = {
  mediaPipelineStatus:
    | "draft"
    | "validated"
    | "media_preparing"
    | "media_ready"
    | "visual_ready"
    | "voix_en_attente"
    | "voix_prete"
    | "voice_ready"
    | "ready_to_publish";
  visualDecision: {
    mode: "reuse_existing" | "generate_new";
    reason: string;
    confidence: number;
    missing_visual_needs: string[];
  } | null;
  selectedAssets: SelectedDraftAsset[];
  suggestedAssets: VisualAsset[];
  assetsFound: number;
  assetsSelected: number;
  generationRequested: boolean;
  generationReason: string | null;
  lastRunAt: string | null;
  voice: DraftVoiceState;
  visualScenes: VisualScene[];
};

type GenerationQuality = "low" | "medium" | "high";

type DraftVoiceState = {
  audioUrl: string | null;
  canGenerate: boolean;
  costEstimateUsd: number;
  durationEstimateSeconds: number;
  errorMessage: string | null;
  generatedAt: string | null;
  selectedVoiceId: string | null;
  selectedVoiceLabel: string;
  status: "not_ready" | "pending" | "generating" | "ready" | "error";
};

type VisualScene = {
  id: string;
  draftId: string;
  assetId: string | null;
  visualPromptIndex: number;
  visualPromptText: string;
  generationSource: "library" | "generated" | "regenerated" | "upload";
  generationQuality: GenerationQuality;
  generationStatus:
    | "pending"
    | "searching_library"
    | "selected_from_library"
    | "scoring"
    | "generating"
    | "uploading"
    | "ready"
    | "error"
    | "retained"
    | "rejected";
  imageUrl: string | null;
  storagePath: string | null;
  scoreTotal: number | null;
  scoreBreakdown: Record<string, unknown>;
  scoreSource: "heuristic" | "gpt_vision" | "none";
  errorMessage: string | null;
  locked: boolean;
  retainedAt: string | null;
  retainedBy: string | null;
  createdAt: string;
  updatedAt: string;
};

type ApiErrorPayload = {
  error?: string;
  details?: Record<string, unknown>;
};

const VISUAL_LIBRARY_BUCKET = "content-assets";
const VISUAL_LIBRARY_PATH = "lignes-interieures/visuels";
const SUPABASE_PUBLIC_URL = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/+$/, "") ?? "";
const ESTIMATED_GPT_VISION_COST_USD = 0.001;
const ESTIMATED_IMAGE_GENERATION_COST_USD: Record<GenerationQuality, number> = {
  high: 0.08,
  low: 0.01,
  medium: 0.04,
};

const statusLabels: Record<string, string> = {
  draft: "Brouillon texte",
  approved: "Texte validé",
  rejected: "Rejeté",
  validated: "Texte validé",
  visual_ready: "Visuels prêts",
  visuels_prets: "Visuels prêts",
  voix_en_attente: "Voix en attente",
  voix_prete: "Voix prête",
  voice_ready: "Voix prête",
  ready_to_publish: "Prêt à publier",
};

const mediaStatusLabels: Record<MediaPipelineState["mediaPipelineStatus"], string> = {
  draft: "Brouillon texte",
  validated: "Texte validé",
  media_preparing: "Visuels en préparation",
  media_ready: "Visuels prêts",
  visual_ready: "Visuels prêts",
  voix_en_attente: "Voix en attente",
  voix_prete: "Voix prête",
  voice_ready: "Voix prête",
  ready_to_publish: "Prêt à publier",
};

const voiceStatusLabels: Record<DraftVoiceState["status"], string> = {
  error: "Erreur voix",
  generating: "Generation voix en cours...",
  not_ready: "En attente des visuels",
  pending: "Voix en attente",
  ready: "Voix prete",
};

const voiceOptions = [
  { id: "21m00Tcm4TlvDq8ikWAM", label: "Rachel" },
  { id: "EXAVITQu4vr4xnSDxMaL", label: "Bella" },
  { id: "ErXwobaYiN019PkySvjV", label: "Antoni" },
];

const generationSourceLabels: Record<VisualScene["generationSource"], string> = {
  generated: "generee par IA",
  library: "bibliotheque",
  regenerated: "regeneree par IA",
  upload: "upload",
};

const generationStatusLabels: Record<VisualScene["generationStatus"], string> = {
  error: "Erreur image",
  generating: "Generation IA en cours...",
  pending: "Recherche dans la bibliotheque...",
  ready: "Image prete",
  rejected: "rejetee",
  retained: "retenue",
  scoring: "Analyse / scoring...",
  searching_library: "Recherche bibliotheque...",
  selected_from_library: "Bibliotheque selectionnee",
  uploading: "Upload en cours...",
};

const generationQualityLabels: Record<GenerationQuality, string> = {
  high: "high - meilleure qualite",
  low: "low - economique / test rapide",
  medium: "medium - recommande",
};

const CLIENT_SCENE_TIMEOUTS: Partial<Record<VisualScene["generationStatus"], number>> = {
  generating: 90_000,
  pending: 5_000,
  scoring: 20_000,
  searching_library: 10_000,
  uploading: 30_000,
};

const scoreSourceLabels: Record<VisualScene["scoreSource"], string> = {
  gpt_vision: "Score GPT Vision",
  heuristic: "Score heuristique",
  none: "Non score",
};

function scoreOutOf100(value: number) {
  return Math.round(Math.max(0, Math.min(100, value <= 10 ? value * 10 : value)));
}

function scoreNumber(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.round(number) : 0;
}

function isSceneLoading(scene: VisualScene) {
  return (
    scene.generationStatus === "pending" ||
    scene.generationStatus === "searching_library" ||
    scene.generationStatus === "scoring" ||
    scene.generationStatus === "generating" ||
    scene.generationStatus === "uploading"
  );
}

function sceneElapsedMs(scene: VisualScene) {
  const updatedAt = new Date(scene.updatedAt).getTime();

  return Number.isFinite(updatedAt) ? Date.now() - updatedAt : 0;
}

function isSceneStuck(scene: VisualScene) {
  if (scene.locked) {
    return false;
  }

  const timeout = CLIENT_SCENE_TIMEOUTS[scene.generationStatus];

  return typeof timeout === "number" && sceneElapsedMs(scene) > timeout;
}

function sceneStatusClass(scene: VisualScene) {
  if (scene.generationStatus === "error") {
    return "border-[#F97316]/45 bg-[#F97316]/10 text-[#FDBA74]";
  }

  if (scene.imageUrl) {
    return "border-[#39E6D0]/35 bg-[#39E6D0]/10 text-[#39E6D0]";
  }

  return "border-[#1D2A44] bg-[#03070B] text-[#A7B0C0]";
}

function sceneDebugValue(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return "non disponible";
  }

  return String(value);
}

function stringList(value: unknown) {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
  }

  if (typeof value === "string" && value.trim()) {
    return [value.trim()];
  }

  return [];
}

function compactListLabel(values: string[], emptyLabel = "aucun", maxItems = 5) {
  if (values.length === 0) {
    return emptyLabel;
  }

  const visible = values.slice(0, maxItems);
  const remaining = values.length - visible.length;

  return remaining > 0
    ? `${visible.join(", ")} +${remaining} autres`
    : visible.join(", ");
}

function penaltyLabels(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((penalty) =>
      penalty && typeof penalty === "object" && "reason" in penalty
        ? String(penalty.reason)
        : "penalite",
    )
    .filter(Boolean);
}

function normalizeStoragePath(value: unknown) {
  return typeof value === "string" ? value.trim().replace(/^\/+/, "") : "";
}

function encodedStoragePath(storagePath: string) {
  return storagePath
    .split("/")
    .filter(Boolean)
    .map((part) => encodeURIComponent(part))
    .join("/");
}

function isInvalidPreviewPath(value: string) {
  const normalized = value.toLowerCase();

  return (
    normalized.includes("lignes-interieures/elite/") ||
    normalized.includes("drafts/") ||
    normalized.includes("undefined") ||
    normalized.includes("null")
  );
}

function publicUrlMatchesStoragePath(url: string, storagePath: string) {
  try {
    const parsed = new URL(url);
    const decodedPath = decodeURIComponent(parsed.pathname);

    return decodedPath.includes(`/${storagePath}`);
  } catch {
    return false;
  }
}

function rebuiltPublicStorageUrl(bucketName: string, storagePath: string) {
  if (!SUPABASE_PUBLIC_URL || !bucketName || !storagePath) {
    return "";
  }

  return `${SUPABASE_PUBLIC_URL}/storage/v1/object/public/${encodeURIComponent(bucketName)}/${encodedStoragePath(storagePath)}`;
}

function getAssetPreviewUrl(asset: Record<string, unknown>) {
  const bucketName =
    typeof asset.bucketName === "string" && asset.bucketName.trim()
      ? asset.bucketName.trim()
      : typeof asset.bucket_name === "string" && asset.bucket_name.trim()
        ? asset.bucket_name.trim()
      : VISUAL_LIBRARY_BUCKET;
  const storagePath = normalizeStoragePath(asset.storagePath || asset.storage_path);
  const serverPreviewUrl =
    typeof asset.previewUrl === "string" && asset.previewUrl.trim()
      ? asset.previewUrl.trim()
      : typeof asset.preview_url === "string" && asset.preview_url.trim()
        ? asset.preview_url.trim()
        : "";
  const publicUrl =
    typeof asset.publicUrl === "string" && asset.publicUrl.trim()
      ? asset.publicUrl.trim()
      : typeof asset.imageUrl === "string" && asset.imageUrl.trim()
        ? asset.imageUrl.trim()
        : "";
  const rebuiltUrl =
    storagePath.startsWith(`${VISUAL_LIBRARY_PATH}/`) && !isInvalidPreviewPath(storagePath)
      ? rebuiltPublicStorageUrl(bucketName, storagePath)
      : "";
  const validPublicUrl =
    publicUrl.startsWith("https://") &&
    storagePath.startsWith(`${VISUAL_LIBRARY_PATH}/`) &&
    !isInvalidPreviewPath(publicUrl) &&
    !isInvalidPreviewPath(storagePath) &&
    publicUrlMatchesStoragePath(publicUrl, storagePath)
      ? publicUrl
      : "";
  const validServerPreviewUrl =
    serverPreviewUrl.startsWith("https://") && !isInvalidPreviewPath(serverPreviewUrl)
      ? serverPreviewUrl
      : "";

  return {
    bucketName,
    fallbackUrl: validPublicUrl && validPublicUrl !== rebuiltUrl ? validPublicUrl : "",
    previewUrl: validServerPreviewUrl || rebuiltUrl || validPublicUrl,
    resolutionMethod:
      typeof asset.resolutionMethod === "string" && asset.resolutionMethod.trim()
        ? asset.resolutionMethod.trim()
        : typeof asset.resolution_method === "string" && asset.resolution_method.trim()
          ? asset.resolution_method.trim()
          : "",
    storagePath,
    usedSource: validServerPreviewUrl
      ? "server_preview_url"
      : rebuiltUrl
        ? "rebuilt_storage_path"
        : validPublicUrl
          ? "public_url"
          : "none",
  };
}

function libraryMatchesForScene(scene: VisualScene) {
  const matches = scene.scoreBreakdown.libraryMatches;

  if (!Array.isArray(matches)) {
    return [];
  }

  return matches
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
    .slice(0, 5);
}

function hasRelevantLibraryMatch(scene: VisualScene) {
  const threshold = scoreNumber(scene.scoreBreakdown.libraryRelevanceThreshold ?? 60);

  return libraryMatchesForScene(scene).some(
    (match) => scoreNumber(match.pertinenceScore) >= threshold,
  );
}

function fileNameFromStoragePath(storagePath: string | null) {
  if (!storagePath) {
    return null;
  }

  return storagePath.split("/").filter(Boolean).at(-1) ?? null;
}

function sceneProgressValue(scene: VisualScene) {
  if (scene.generationStatus === "pending") {
    return 10;
  }

  if (scene.generationStatus === "searching_library") {
    return 25;
  }

  if (scene.generationStatus === "scoring") {
    return 45;
  }

  if (scene.generationStatus === "generating") {
    return 65;
  }

  if (scene.generationStatus === "uploading") {
    return 85;
  }

  if (
    scene.generationStatus === "ready" ||
    scene.generationStatus === "retained" ||
    scene.generationStatus === "rejected" ||
    scene.generationStatus === "selected_from_library" ||
    scene.generationStatus === "error"
  ) {
    return 100;
  }

  return 10;
}

function sceneProgressMessage(scene: VisualScene, requiredSceneCount: number) {
  if (scene.generationStatus === "pending") {
    if (sceneElapsedMs(scene) > 15_000) {
      return `Scene ${scene.visualPromptIndex}/${requiredSceneCount} : toujours bloquee, relance serveur requise.`;
    }

    if (isSceneStuck(scene)) {
      return `Scene ${scene.visualPromptIndex}/${requiredSceneCount} : relance du traitement...`;
    }

    return `Scene ${scene.visualPromptIndex}/${requiredSceneCount} : recherche dans la bibliotheque...`;
  }

  if (scene.generationStatus === "searching_library") {
    if (isSceneStuck(scene)) {
      return `Scene ${scene.visualPromptIndex}/${requiredSceneCount} : recherche trop longue. Action requise.`;
    }

    return `Recherche bibliotheque pour la scene ${scene.visualPromptIndex}...`;
  }

  if (scene.generationStatus === "scoring") {
    return `Scene ${scene.visualPromptIndex}/${requiredSceneCount} : analyse / scoring...`;
  }

  if (scene.generationStatus === "generating") {
    if (scene.scoreBreakdown.selectionDecision === "asset_not_relevant") {
      return "Generation IA en cours...";
    }

    if (scene.scoreBreakdown.selectionDecision === "library_empty") {
      return "Generation IA en cours...";
    }

    return `Scene ${scene.visualPromptIndex}/${requiredSceneCount} : generation IA en cours...`;
  }

  if (scene.generationStatus === "uploading") {
    return "Image sauvegardee dans la bibliotheque...";
  }

  if (scene.generationStatus === "selected_from_library") {
    const decision = scene.scoreBreakdown.selection_decision;
    const score = scoreNumber(scene.scoreBreakdown.total_score ?? scene.scoreTotal);

    if (decision === "selected") {
      return `Bibliotheque validee ${score}/100`;
    }

    if (decision === "proposed") {
      return `Bibliotheque acceptable ${score}/100`;
    }

    return "Bibliotheque selectionnee.";
  }

  if (scene.generationStatus === "error") {
    const message =
      typeof scene.errorMessage === "string" && scene.errorMessage.length > 0
        ? scene.errorMessage
        : "Erreur image. Relance possible.";

    return message.toLowerCase().includes("bibliotheque")
      ? "Erreur recherche bibliotheque. Relance possible."
      : message;
  }

  if (scene.generationStatus === "ready") {
    const score = scoreNumber(scene.scoreBreakdown.total_score ?? scene.scoreTotal);

    if (scene.scoreBreakdown.selection_decision === "generated") {
      return `Image generee validee ${score}/100`;
    }

    return "Image prete.";
  }

  return "En file d'attente...";
}

function visualPreparationProgress(scenes: VisualScene[]) {
  const requiredSceneCount = scenes.length || 0;

  if (scenes.length === 0) {
    return {
      activeScene: null as VisualScene | null,
      blockedCount: 0,
      loadingCount: 0,
      message: "0% - initialisation",
      progress: 0,
      readyCount: 0,
      requiredSceneCount,
      remainingEstimate: "non disponible",
    };
  }

  const progress = Math.round(
    scenes.reduce((total, scene) => total + sceneProgressValue(scene), 0) /
      scenes.length,
  );
  const activeScene =
    scenes.find((scene) => isSceneLoading(scene)) ??
    scenes.find((scene) => scene.generationStatus === "error") ??
    null;
  const readyCount = scenes.filter((scene) =>
    scene.imageUrl ||
    scene.generationStatus === "ready" ||
    scene.generationStatus === "retained" ||
    scene.generationStatus === "selected_from_library",
  ).length;
  const blockedCount = scenes.filter(
    (scene) =>
      scene.generationStatus === "pending" ||
      scene.generationStatus === "error" ||
      isSceneStuck(scene),
  ).length;
  const loadingCount = scenes.filter((scene) => isSceneLoading(scene)).length;
  const remainingSeconds = loadingCount > 0
    ? Math.max(30, loadingCount * 45)
    : 0;

  return {
    activeScene,
    blockedCount,
    loadingCount,
    message: activeScene
      ? sceneProgressMessage(activeScene, requiredSceneCount)
      : readyCount === scenes.length
        ? "100% - scenes pretes"
        : `${progress}% - preparation en attente`,
    progress,
    readyCount,
    requiredSceneCount,
    remainingEstimate: remainingSeconds > 0
      ? `environ ${Math.ceil(remainingSeconds / 60)} min`
      : "non disponible",
  };
}

function visualActionNotice(action: string) {
  const notices: Record<string, string> = {
    analyze_scene: "Analyse Vision terminee.",
    prepare_media: "Visuels actualises pour ce brouillon.",
    refresh_suggestions: "Propositions actualisees.",
    regenerate_scene: "Scene regeneree.",
    reject_scene: "Scene rejetee.",
    request_visual_generation: "Generation lancee pour les scenes de ce brouillon.",
    retry_scene_search: "Recherche bibliotheque relancee.",
    retry_blocked_scenes: "Relance des scenes bloquees lancee.",
    retain_scene: "Scene retenue.",
    select_scene_asset: "Visuel bibliotheque associe a la scene.",
    unlock_scene: "Scene deverrouillee.",
    validate_visuals: "Les visuels sont valides. Le brouillon est maintenant protege.",
    generate_voice: "Generation voix terminee.",
    regenerate_voice: "Voix regeneree.",
    select_voice: "Voix selectionnee.",
    select_asset: "Visuel retenu mis a jour.",
  };

  return notices[action] ?? "Action visuelle terminee.";
}

function canPrepareVisuals(status: string) {
  return status === "approved" || status === "validated" || status === "ready_to_publish";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function formatDuration(seconds: number) {
  const safeSeconds = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = safeSeconds % 60;

  if (minutes === 0) {
    return `${remainingSeconds} s`;
  }

  return `${minutes} min ${String(remainingSeconds).padStart(2, "0")} s`;
}

function formatApiError(payload: ApiErrorPayload, fallback: string) {
  return payload.error ?? fallback;
}

function metadataText(metadata: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = metadata[key];

    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return null;
}

function visualPromptSource(
  asset: VisualAsset,
  visualPrompts: string[],
  usageOrder?: number,
) {
  return (
    metadataText(asset.metadata, [
      "prompt",
      "visual_prompt",
      "source_prompt",
      "generation_prompt",
      "scene_prompt",
    ]) ??
    visualPrompts[Math.max(0, (usageOrder ?? 1) - 1)] ??
    asset.scoreReason
  );
}

function scoreReason(asset: VisualAsset, isRetained: boolean) {
  if (isRetained) {
    return asset.scoreReason || "Retenu pour ce brouillon.";
  }

  return asset.score >= 50
    ? "Proposition pertinente mais non retenue dans les emplacements requis."
    : "Non retenu: score estime plus faible ou coherence a valider.";
}

function ScoreDetails({ asset, isRetained }: { asset: VisualAsset; isRetained: boolean }) {
  const breakdown = asset.scoreBreakdown;
  const metadataSourceScores =
    breakdown.metadataSourceScores && typeof breakdown.metadataSourceScores === "object"
      ? Object.entries(breakdown.metadataSourceScores as Record<string, unknown>)
      : [];
  const items = [
    ["Prompt / image", breakdown.promptImage, 30],
    ["Image / brouillon", breakdown.imageDraft, 25],
    ["Qualite", breakdown.visualQuality, 20],
    ["Continuite", breakdown.narrativeContinuity, 15],
    ["Securite / style", breakdown.editorialSafety, 10],
  ] as const;

  return (
    <details className="mt-3 rounded-md border border-[#1D2A44] bg-[#03070B] p-3 text-xs">
      <summary className="cursor-pointer font-semibold text-[#7DD3FC]">
        Voir le score
      </summary>
      <div className="mt-3 grid gap-2 text-[#A7B0C0]">
        <p>
          Score total:{" "}
          <span className="font-semibold text-[#F8FAFC]">
            {scoreOutOf100(asset.score)}/100
          </span>
        </p>
        {items.map(([label, value, max]) => (
          <div key={label} className="grid grid-cols-[1fr_auto] gap-3">
            <span>{label}</span>
            <span className="font-semibold text-[#F8FAFC]">
              {value}/{max}
            </span>
          </div>
        ))}
        {breakdown.estimatedWithoutVision ? (
          <p className="rounded-md border border-[#F97316]/35 bg-[#F97316]/10 px-2 py-1.5 font-semibold text-[#FDBA74]">
            Estime sans analyse visuelle IA.
          </p>
        ) : null}
        <p>Decision: {scoreReason(asset, isRetained)}</p>
        <p>Raison: {breakdown.reason || asset.scoreReason}</p>
        {typeof breakdown.metadataScoreTotal === "number" ? (
          <p>Score metadata: {breakdown.metadataScoreTotal}/90</p>
        ) : null}
        {metadataSourceScores.length ? (
          <div className="rounded-md border border-[#1D2A44] bg-[#08111A] p-2">
            <p className="font-semibold text-[#F8FAFC]">Detail metadata</p>
            {metadataSourceScores.map(([key, value]) => (
              <p key={key}>
                {key}: {String(value)}
              </p>
            ))}
          </div>
        ) : null}
        {breakdown.matchedTerms.length ? (
          <p>Termes reconnus: {breakdown.matchedTerms.join(", ")}</p>
        ) : null}
      </div>
    </details>
  );
}

function SceneScoreDetails({ scene }: { scene: VisualScene }) {
  const breakdown = scene.scoreBreakdown;
  const metadataSourceScores =
    breakdown.metadataSourceScores && typeof breakdown.metadataSourceScores === "object"
      ? Object.entries(breakdown.metadataSourceScores as Record<string, unknown>)
      : [];
  const hasSelectionScore =
    breakdown.subject_score !== undefined ||
    breakdown.location_score !== undefined ||
    breakdown.mood_score !== undefined;
  const items = hasSelectionScore
    ? ([
        ["Sujet", scoreNumber(breakdown.subject_score), 25],
        ["Lieu", scoreNumber(breakdown.location_score), 25],
        ["Ambiance", scoreNumber(breakdown.mood_score), 20],
        ["Composition", scoreNumber(breakdown.composition_score), 15],
        ["Couleurs", scoreNumber(breakdown.color_score), 15],
      ] as const)
    : ([
        ["Prompt / image", scoreNumber(breakdown.prompt_image ?? breakdown.promptImage), 30],
        ["Image / brouillon", scoreNumber(breakdown.image_draft ?? breakdown.imageDraft), 25],
        ["Qualite", scoreNumber(breakdown.quality ?? breakdown.visualQuality), 20],
        ["Continuite", scoreNumber(breakdown.continuity ?? breakdown.narrativeContinuity), 15],
        ["Securite / style", scoreNumber(breakdown.safety_style ?? breakdown.editorialSafety), 10],
      ] as const);
  const reason =
    typeof breakdown.selection_reason === "string" && breakdown.selection_reason.trim()
      ? breakdown.selection_reason
      : typeof breakdown.explanation === "string" && breakdown.explanation.trim()
        ? breakdown.explanation
        : typeof breakdown.reason === "string" && breakdown.reason.trim()
          ? breakdown.reason
          : "Score non disponible.";
  const warnings = Array.isArray(breakdown.warnings)
    ? breakdown.warnings.filter((warning): warning is string => typeof warning === "string")
    : [];

  return (
    <details className="mt-3 rounded-md border border-[#1D2A44] bg-[#03070B] p-3 text-xs">
      <summary className="cursor-pointer font-semibold text-[#7DD3FC]">
        Voir le score
      </summary>
      <div className="mt-3 grid gap-2 text-[#A7B0C0]">
        <p>
          {scoreSourceLabels[scene.scoreSource]}:{" "}
          <span className="font-semibold text-[#F8FAFC]">
            {scene.scoreTotal === null ? "non disponible" : `${scoreOutOf100(scene.scoreTotal)}/100`}
          </span>
        </p>
        {items.map(([label, value, max]) => (
          <div key={label} className="grid grid-cols-[1fr_auto] gap-3">
            <span>{label}</span>
            <span className="font-semibold text-[#F8FAFC]">
              {value}/{max}
            </span>
          </div>
        ))}
        {scene.scoreSource !== "gpt_vision" ? (
          <p className="rounded-md border border-[#F97316]/35 bg-[#F97316]/10 px-2 py-1.5 font-semibold text-[#FDBA74]">
            Estime sans analyse visuelle IA.
          </p>
        ) : null}
        <p>Raison: {reason}</p>
        {typeof breakdown.metadataScoreTotal === "number" ? (
          <p>Score metadata: {breakdown.metadataScoreTotal}/90</p>
        ) : null}
        {metadataSourceScores.length ? (
          <div className="rounded-md border border-[#1D2A44] bg-[#08111A] p-2">
            <p className="font-semibold text-[#F8FAFC]">Detail metadata</p>
            {metadataSourceScores.map(([key, value]) => (
              <p key={key}>
                {key}: {String(value)}
              </p>
            ))}
          </div>
        ) : null}
        {warnings.length ? <p>Alertes: {warnings.join(" ; ")}</p> : null}
      </div>
    </details>
  );
}

function SceneLibraryMatches({
  debugOpen = false,
  disabled = false,
  isOpen,
  onPreviewLoadingChange,
  onUseCandidate,
  onToggle,
  scene,
}: {
  debugOpen?: boolean;
  disabled?: boolean;
  isOpen: boolean;
  onPreviewLoadingChange?: (assetId: string | null) => void;
  onUseCandidate: (assetId: string) => void;
  onToggle: () => void;
  scene: VisualScene;
}) {
  const [previewErrorByCandidate, setPreviewErrorByCandidate] = useState<Record<string, boolean>>({});
  const [previewErrorDetailByCandidate, setPreviewErrorDetailByCandidate] = useState<Record<string, string>>({});
  const [previewLoadingByCandidate, setPreviewLoadingByCandidate] = useState<Record<string, boolean>>({});
  const [previewOpenByCandidate, setPreviewOpenByCandidate] = useState<Record<string, boolean>>({});
  const [previewRetryByCandidate, setPreviewRetryByCandidate] = useState<Record<string, boolean>>({});
  const [previewUrlByCandidate, setPreviewUrlByCandidate] = useState<Record<string, string>>({});
  const matches = libraryMatchesForScene(scene);
  const threshold = scoreNumber(scene.scoreBreakdown.libraryRelevanceThreshold ?? 60);
  const bestScore = matches.reduce(
    (best, match) => Math.max(best, scoreNumber(match.pertinenceScore)),
    0,
  );
  const hasRelevantMatch = matches.some((match) => scoreNumber(match.pertinenceScore) >= threshold);
  const shouldShowResults = isOpen || debugOpen;

  if (matches.length === 0) {
    return null;
  }

  return (
    <div className="mt-3 w-full max-w-full overflow-hidden rounded-md border border-[#1D2A44] bg-[#03070B] p-3 text-xs">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <p className="font-semibold text-[#F8FAFC]">
            Resultats bibliotheque - meilleur score : {bestScore}/100
          </p>
          <p className="mt-1 text-[#64748b]">Seuil pertinent : {threshold}/100</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`rounded-md border px-2 py-1 font-semibold ${
              hasRelevantMatch
                ? "border-[#39E6D0]/35 bg-[#39E6D0]/10 text-[#39E6D0]"
                : "border-[#F97316]/35 bg-[#F97316]/10 text-[#FDBA74]"
            }`}
          >
            {hasRelevantMatch ? `${matches.length} candidats trouves` : "Aucun visuel pertinent"}
          </span>
          <button
            type="button"
            onClick={onToggle}
            className="rounded-md border border-[#1D2A44] bg-[#08111A] px-2 py-1 font-semibold text-[#A7B0C0] transition hover:border-[#39E6D0]/45 hover:text-[#F8FAFC]"
          >
            {shouldShowResults ? "Masquer les resultats bibliotheque" : "Voir les resultats bibliotheque"}
          </button>
        </div>
      </div>
      {!hasRelevantMatch ? (
        <p className="mt-2 rounded-md border border-[#F97316]/35 bg-[#F97316]/10 px-2 py-1.5 font-semibold text-[#FDBA74]">
          Resultats faibles : aucun visuel ne correspond vraiment a cette scene.
        </p>
      ) : null}
      {shouldShowResults ? <div className="mt-3 flex w-full max-w-full flex-col gap-3 overflow-hidden">
        {matches.map((match, index) => {
          const assetId = typeof match.assetId === "string" ? match.assetId : "";
          const candidateKey = assetId || `${String(match.fileName ?? "candidate")}-${index}`;
          const preview = getAssetPreviewUrl(match);
          const candidateImageUrl = preview.previewUrl;
          const activePreviewUrl = previewUrlByCandidate[candidateKey] || candidateImageUrl;
          const isPreviewOpen = Boolean(previewOpenByCandidate[candidateKey]);
          const isPreviewLoading = Boolean(previewLoadingByCandidate[candidateKey]);
          const hasPreviewError = Boolean(previewErrorByCandidate[candidateKey]);
          const previewError = previewErrorDetailByCandidate[candidateKey] ?? "";
          const tags = stringList(match.tagsMatched);
          const emotions = stringList(match.emotionMatched);
          const themes = stringList(match.themeMatched);
          const matchedTags = stringList(match.matched_tags);
          const penalties = penaltyLabels(match.penalties);
          const rejectedBecause =
            typeof match.rejected_because === "string" && match.rejected_because.trim()
              ? match.rejected_because.trim()
              : "";
          const setCandidatePreviewLoading = (loading: boolean) => {
            setPreviewLoadingByCandidate((current) => ({
              ...current,
              [candidateKey]: loading,
            }));
            onPreviewLoadingChange?.(loading ? assetId || candidateKey : null);
          };

          return (
            <div
              key={`${String(match.assetId ?? match.fileName ?? index)}-${index}`}
              className="w-full max-w-full overflow-hidden rounded-md border border-[#1D2A44] bg-[#08111A] p-3"
            >
              <div className="flex min-w-0 flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
                <p className="min-w-0 [overflow-wrap:anywhere] break-words font-semibold text-[#F8FAFC]">
                  {index + 1}. {String(match.fileName ?? "Visuel bibliotheque")}
                </p>
                <span className="w-fit shrink-0 rounded-md border border-[#39E6D0]/25 bg-[#39E6D0]/10 px-2 py-1 font-semibold text-[#39E6D0]">
                  {scoreNumber(match.pertinenceScore)}/100
                </span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (isPreviewOpen) {
                      setPreviewOpenByCandidate((current) => ({
                        ...current,
                        [candidateKey]: false,
                      }));
                      setCandidatePreviewLoading(false);
                      return;
                    }

                    if (!candidateImageUrl) {
                      setPreviewOpenByCandidate((current) => ({
                        ...current,
                        [candidateKey]: true,
                      }));
                      setPreviewErrorByCandidate((current) => ({
                        ...current,
                        [candidateKey]: true,
                      }));
                      setPreviewErrorDetailByCandidate((current) => ({
                        ...current,
                        [candidateKey]: "preview_url_missing",
                      }));
                      setCandidatePreviewLoading(false);
                      return;
                    }

                    setPreviewErrorByCandidate((current) => ({
                      ...current,
                      [candidateKey]: false,
                    }));
                    setPreviewErrorDetailByCandidate((current) => ({
                      ...current,
                      [candidateKey]: "",
                    }));
                    setCandidatePreviewLoading(true);
                    setPreviewRetryByCandidate((current) => ({
                      ...current,
                      [candidateKey]: false,
                    }));
                    setPreviewUrlByCandidate((current) => ({
                      ...current,
                      [candidateKey]: candidateImageUrl,
                    }));
                    setPreviewOpenByCandidate((current) => ({
                      ...current,
                      [candidateKey]: true,
                    }));
                  }}
                  className="relative z-10 rounded-md border border-[#1D2A44] bg-[#03070B] px-3 py-1.5 font-semibold text-[#A7B0C0] transition hover:border-[#39E6D0]/45 hover:text-[#F8FAFC]"
                >
                  {isPreviewOpen ? "Masquer le visuel" : "Afficher le visuel"}
                </button>
                <button
                  type="button"
                  disabled={disabled || !assetId}
                  onClick={() => onUseCandidate(assetId)}
                  className="relative z-10 rounded-md border border-[#39E6D0]/45 bg-[#39E6D0]/10 px-3 py-1.5 font-semibold text-[#39E6D0] transition hover:bg-[#1D2A44] hover:text-[#F8FAFC] disabled:cursor-not-allowed disabled:opacity-55"
                >
                  Utiliser ce visuel
                </button>
              </div>
              {isPreviewOpen ? (
                <div className="mt-3 overflow-hidden rounded-md border border-[#1D2A44] bg-[#03070B]">
                  {isPreviewLoading ? (
                    <p className="px-3 py-2 font-semibold text-[#A7B0C0]">
                      Chargement du visuel...
                    </p>
                  ) : null}
                  {hasPreviewError ? (
                    <p className="px-3 py-2 font-semibold text-[#FDBA74]">
                      Apercu indisponible - chemin a verifier
                    </p>
                  ) : null}
                  {activePreviewUrl && !hasPreviewError ? (
                    <img
                      alt={`Apercu ${String(match.fileName ?? "visuel bibliotheque")}`}
                      className={`max-h-[360px] w-full bg-[#03070B] object-contain ${
                        isPreviewLoading ? "hidden" : "block"
                      }`}
                      onError={() => {
                        const alreadyRetried = Boolean(previewRetryByCandidate[candidateKey]);
                        if (!alreadyRetried && preview.fallbackUrl && preview.fallbackUrl !== activePreviewUrl) {
                          setPreviewRetryByCandidate((current) => ({
                            ...current,
                            [candidateKey]: true,
                          }));
                          setPreviewUrlByCandidate((current) => ({
                            ...current,
                            [candidateKey]: preview.fallbackUrl,
                          }));
                          return;
                        }

                        setCandidatePreviewLoading(false);
                        setPreviewErrorByCandidate((current) => ({
                          ...current,
                          [candidateKey]: true,
                        }));
                        setPreviewErrorDetailByCandidate((current) => ({
                          ...current,
                          [candidateKey]: "image_load_error",
                        }));
                      }}
                      onLoad={() =>
                        setCandidatePreviewLoading(false)
                      }
                      src={activePreviewUrl}
                    />
                  ) : null}
                  <details className="border-t border-[#1D2A44] px-3 py-2 text-[11px] text-[#64748b]">
                    <summary className="cursor-pointer font-semibold">Debug apercu</summary>
                    <div className="mt-2 grid gap-1 [overflow-wrap:anywhere]">
                      <p>asset_id: {sceneDebugValue(assetId)}</p>
                      <p>file_name: {sceneDebugValue(match.fileName)}</p>
                      <p>bucket_name: {sceneDebugValue(preview.bucketName)}</p>
                      <p>storage_path: {sceneDebugValue(preview.storagePath)}</p>
                      <p>preview_url utilisee: {sceneDebugValue(activePreviewUrl || candidateImageUrl)}</p>
                      <p>resolution_method: {sceneDebugValue(preview.resolutionMethod || preview.usedSource)}</p>
                      <p>preview_source: {sceneDebugValue(preview.usedSource)}</p>
                      <p>preview_error: {sceneDebugValue(previewError)}</p>
                    </div>
                  </details>
                </div>
              ) : null}
              <div className="mt-3 grid min-w-0 gap-2 text-[#A7B0C0] lg:grid-cols-3">
                <p className="min-w-0 [overflow-wrap:anywhere] break-words">
                  Tags correspondants :{" "}
                  <span className="font-semibold text-[#F8FAFC]">
                    {compactListLabel(tags)}
                  </span>
                </p>
                <p className="min-w-0 [overflow-wrap:anywhere] break-words">
                  Emotion correspondante :{" "}
                  <span className="font-semibold text-[#F8FAFC]">
                    {compactListLabel(emotions, "aucune")}
                  </span>
                </p>
                <p className="min-w-0 [overflow-wrap:anywhere] break-words">
                  Theme correspondant :{" "}
                  <span className="font-semibold text-[#F8FAFC]">
                    {compactListLabel(themes)}
                  </span>
                </p>
              </div>
              <div className="mt-3 grid min-w-0 gap-2 text-[#A7B0C0] sm:grid-cols-2 lg:grid-cols-4">
                <p>Sujet : <span className="font-semibold text-[#F8FAFC]">{scoreNumber(match.subject_score)}/25</span></p>
                <p>Lieu : <span className="font-semibold text-[#F8FAFC]">{scoreNumber(match.location_score)}/20</span></p>
                <p>Ambiance : <span className="font-semibold text-[#F8FAFC]">{scoreNumber(match.mood_score)}/20</span></p>
                <p>Style : <span className="font-semibold text-[#F8FAFC]">{scoreNumber(match.style_score)}/10</span></p>
              </div>
              <div className="mt-3 grid min-w-0 gap-2 text-[#A7B0C0] lg:grid-cols-2">
                <p className="min-w-0 [overflow-wrap:anywhere] break-words">
                  Concepts reconnus :{" "}
                  <span className="font-semibold text-[#F8FAFC]">
                    {compactListLabel(matchedTags)}
                  </span>
                </p>
                <p className="min-w-0 [overflow-wrap:anywhere] break-words">
                  Penalites :{" "}
                  <span className="font-semibold text-[#F8FAFC]">
                    {compactListLabel(penalties, "aucune", 3)}
                  </span>
                </p>
                <p className="min-w-0 [overflow-wrap:anywhere] break-words lg:col-span-2">
                  Rejete car :{" "}
                  <span className="font-semibold text-[#F8FAFC]">
                    {rejectedBecause ? compactListLabel(rejectedBecause.split(","), "non disponible", 3) : "non disponible"}
                  </span>
                </p>
              </div>
            </div>
          );
        })}
      </div> : null}
    </div>
  );
}

function SceneDebugDetails({
  activeAction,
  hasBlockingOverlay,
  isOpen,
  onToggle,
  previewLoadingAssetId,
  scene,
  sceneDisabled,
}: {
  activeAction: string | null;
  hasBlockingOverlay: boolean;
  isOpen: boolean;
  onToggle: (open: boolean) => void;
  previewLoadingAssetId: string | null;
  scene: VisualScene;
  sceneDisabled: boolean;
}) {
  const debug = scene.scoreBreakdown;
  const candidateCount = Array.isArray(debug.libraryMatches)
    ? debug.libraryMatches.length
    : 0;
  const isSearching = isSceneLoading(scene);
  const searchCompleted =
    scene.generationStatus === "ready" ||
    scene.generationStatus === "error" ||
    scene.generationStatus === "retained" ||
    scene.generationStatus === "rejected" ||
    scene.generationStatus === "selected_from_library";

  return (
    <details
      className="mt-3 rounded-md border border-[#1D2A44] bg-[#03070B] p-3 text-xs"
      onToggle={(event) => onToggle(event.currentTarget.open)}
      open={isOpen}
    >
      <summary className="cursor-pointer font-semibold text-[#64748b]">
        Debug scene
      </summary>
      <div className="mt-3 grid gap-2 text-[#A7B0C0]">
        <p>Bucket: {VISUAL_LIBRARY_BUCKET}</p>
        <p>Storage path: {sceneDebugValue(scene.storagePath)}</p>
        <p>Filename: {sceneDebugValue(fileNameFromStoragePath(scene.storagePath))}</p>
        <p>Asset ID: {sceneDebugValue(scene.assetId)}</p>
        <p>Source: {scene.generationSource}</p>
        <p>Source brute: {scene.generationSource}</p>
        <p>Statut brut: {scene.generationStatus}</p>
        <p>sceneDisabled: {String(sceneDisabled)}</p>
        <p>previewLoadingAssetId: {sceneDebugValue(previewLoadingAssetId)}</p>
        <p>activeAction: {sceneDebugValue(activeAction)}</p>
        <p>hasBlockingOverlay: {String(hasBlockingOverlay)}</p>
        <p>isSearching: {String(isSearching)}</p>
        <p>searchCompleted: {String(searchCompleted)}</p>
        <p>searchStatus: {scene.generationStatus}</p>
        <p>errorMessage: {sceneDebugValue(scene.errorMessage)}</p>
        <p>candidateCount: {candidateCount}</p>
        <p>selectedAssetId: {sceneDebugValue(scene.assetId)}</p>
        <p>search_duration_ms: {sceneDebugValue(debug.search_duration_ms ?? debug.searchDurationMs)}</p>
        <p>assets_total: {sceneDebugValue(debug.assetsTotal)}</p>
        <p>assets_with_metadata: {sceneDebugValue(debug.assetsWithMetadata)}</p>
        <p>assetsFound: {sceneDebugValue(debug.assetsFound)}</p>
        <p>assetsScored: {sceneDebugValue(debug.assetsScored)}</p>
        <p>assetsRejected: {sceneDebugValue(debug.assetsRejected)}</p>
        <p>assetsSelected: {sceneDebugValue(debug.assetsSelected)}</p>
        <p>best_asset_id: {sceneDebugValue(debug.bestAssetId)}</p>
        <p>best_score: {sceneDebugValue(debug.bestScore ?? debug.bestCandidateScore)}</p>
        <p>best_file_name: {sceneDebugValue(debug.bestFileName ?? debug.bestCandidate)}</p>
        <p>fallback_reason: {sceneDebugValue(debug.fallbackReason)}</p>
        <p>bestCandidate: {sceneDebugValue(debug.bestCandidate)}</p>
        <p>bestCandidateScore: {sceneDebugValue(debug.bestCandidateScore)}</p>
        <p>selectionThreshold: {sceneDebugValue(debug.selectionThreshold)}</p>
        <p>selectionDecision: {sceneDebugValue(debug.selectionDecision)}</p>
        <p>raison rejet: {sceneDebugValue(debug.rejectionReason)}</p>
        <p>raison selection: {sceneDebugValue(debug.selectionReason)}</p>
        <p>tagsMatch: {sceneDebugValue(debug.tagsMatch)}</p>
        <p>tags_score: {sceneDebugValue(debug.tags_score)}</p>
        <p>themeMatch: {sceneDebugValue(debug.themeMatch)}</p>
        <p>theme_score: {sceneDebugValue(debug.theme_score)}</p>
        <p>emotionMatch: {sceneDebugValue(debug.emotionMatch)}</p>
        <p>emotion_score: {sceneDebugValue(debug.emotion_score)}</p>
        <p>ambianceMatch: {sceneDebugValue(debug.ambianceMatch)}</p>
        <p>ambiance_score: {sceneDebugValue(debug.ambiance_score)}</p>
        <p>characterMatch: {sceneDebugValue(debug.characterMatch)}</p>
        <p>character_score: {sceneDebugValue(debug.character_score)}</p>
        <p>styleMatch: {sceneDebugValue(debug.styleMatch)}</p>
        <p>style_score: {sceneDebugValue(debug.style_score)}</p>
        <p>subject_score: {sceneDebugValue(debug.subject_score)}</p>
        <p>location_score: {sceneDebugValue(debug.location_score)}</p>
        <p>mood_score: {sceneDebugValue(debug.mood_score)}</p>
        <p>action_score: {sceneDebugValue(debug.action_score)}</p>
        <p>penalty_total: {sceneDebugValue(debug.penalty_total)}</p>
        <p>
          penalties:{" "}
          {Array.isArray(debug.penalties)
            ? JSON.stringify(debug.penalties)
            : "non disponible"}
        </p>
        <p>
          matched_tags:{" "}
          {Array.isArray(debug.matched_tags)
            ? debug.matched_tags.join(", ")
            : "non disponible"}
        </p>
        <p>rejected_because: {sceneDebugValue(debug.rejected_because)}</p>
        <p>promptMatch: {sceneDebugValue(debug.promptMatch)}</p>
        <p>visionScoreBonus: {sceneDebugValue(debug.visionScoreBonus)}</p>
        <p>vision_quality_bonus: {sceneDebugValue(debug.vision_quality_bonus)}</p>
        <p>total_score: {sceneDebugValue(debug.total_score)}</p>
        <p>metadataScoreTotal: {sceneDebugValue(debug.metadataScoreTotal)}</p>
        <p>
          metadataSourceScores:{" "}
          {debug.metadataSourceScores && typeof debug.metadataSourceScores === "object"
            ? JSON.stringify(debug.metadataSourceScores)
            : "non disponible"}
        </p>
        <p>
          topCandidates:{" "}
          {Array.isArray(debug.libraryMatches)
            ? JSON.stringify(debug.libraryMatches.slice(0, 5))
            : "non disponible"}
        </p>
        <p>fallbackTriggered: {sceneDebugValue(debug.fallbackTriggered)}</p>
        <p>generationRequested: {sceneDebugValue(debug.generationRequested)}</p>
        <p>generationStartedAt: {sceneDebugValue(debug.generationStartedAt)}</p>
        <p>generationSource: {sceneDebugValue(debug.generationSource)}</p>
        <p>generationStatus: {sceneDebugValue(debug.generationStatus)}</p>
        <p>Prompt utilise: {scene.visualPromptText || "non renseigne"}</p>
        <p>Image URL: {sceneDebugValue(scene.imageUrl)}</p>
        <p>
          Score:{" "}
          {scene.scoreTotal === null
            ? "non disponible"
            : `${scoreOutOf100(scene.scoreTotal)}/100`}
        </p>
        <p>Source score: {scene.scoreSource}</p>
        <p>Erreur technique: {sceneDebugValue(scene.errorMessage)}</p>
      </div>
    </details>
  );
}

function firstFreeVisualSlot(
  retainedVisuals: SelectedDraftAsset[],
  requiredSceneCount: number,
) {
  const usedSlots = new Set(retainedVisuals.map((asset) => asset.usageOrder));

  for (let slot = 1; slot <= requiredSceneCount; slot += 1) {
    if (!usedSlots.has(slot)) {
      return slot;
    }
  }

  return 1;
}

export function ShortsVisualsClient() {
  const [drafts, setDrafts] = useState<ContentDraft[]>([]);
  const [selectedDraftId, setSelectedDraftId] = useState("");
  const [media, setMedia] = useState<MediaPipelineState | null>(null);
  const [slotByAsset, setSlotByAsset] = useState<Record<string, number>>({});
  const [openLibraryResultsByScene, setOpenLibraryResultsByScene] = useState<Record<string, boolean>>({});
  const [openDebugByScene, setOpenDebugByScene] = useState<Record<string, boolean>>({});
  const [previewLoadingAssetByScene, setPreviewLoadingAssetByScene] = useState<Record<string, string | null>>({});
  const [generationQuality, setGenerationQuality] =
    useState<GenerationQuality>("medium");
  const [selectedVoiceId, setSelectedVoiceId] = useState(voiceOptions[0]?.id ?? "");
  const [isLoadingDrafts, setIsLoadingDrafts] = useState(false);
  const [isLoadingMedia, setIsLoadingMedia] = useState(false);
  const [isRunningAction, setIsRunningAction] = useState(false);
  const [isRunningWatchdog, setIsRunningWatchdog] = useState(false);
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const selectedDraft = useMemo(
    () => drafts.find((draft) => draft.id === selectedDraftId) ?? null,
    [drafts, selectedDraftId],
  );
  const requiredSceneCount = useMemo(() => {
    const existingSceneCount = media?.visualScenes.length ?? 0;

    if (existingSceneCount > 0) {
      return existingSceneCount;
    }

    const storedSceneCount = selectedDraft?.score.requiredVisualSceneCount;

    if ([3, 5, 7, 9].includes(Number(storedSceneCount))) {
      return Number(storedSceneCount);
    }

    return getRequiredVisualSceneCount(selectedDraft?.score.durationPreset);
  }, [media?.visualScenes.length, selectedDraft]);
  const visualPrompts = useMemo(
    () => parseVisualPrompts(selectedDraft?.visualPrompt ?? "", requiredSceneCount),
    [requiredSceneCount, selectedDraft],
  );
  const generatedVisuals = useMemo(
    () => media?.suggestedAssets.slice(0, 12) ?? [],
    [media],
  );
  const retainedVisuals = useMemo(
    () => media?.selectedAssets.slice(0, requiredSceneCount) ?? [],
    [media, requiredSceneCount],
  );
  const averageScore = useMemo(() => {
    const scores = retainedVisuals.length
      ? retainedVisuals.map((asset) => asset.score)
      : generatedVisuals.map((asset) => asset.score);

    if (!scores.length) {
      return 0;
    }

    return scoreOutOf100(scores.reduce((sum, score) => sum + score, 0) / scores.length);
  }, [generatedVisuals, retainedVisuals]);
  const visualProgress = useMemo(
    () => visualPreparationProgress(media?.visualScenes ?? []),
    [media?.visualScenes],
  );
  const retainedSceneCount = useMemo(
    () =>
      (media?.visualScenes ?? []).filter(
        (scene) => scene.locked || scene.generationStatus === "retained",
      ).length,
    [media?.visualScenes],
  );
  const visualsAreValidated =
    requiredSceneCount > 0 && retainedSceneCount === requiredSceneCount;
  const missingRetainedSceneCount = Math.max(0, requiredSceneCount - retainedSceneCount);
  const visualActionsLocked =
    visualsAreValidated ||
    media?.mediaPipelineStatus === "visual_ready" ||
    media?.mediaPipelineStatus === "voix_en_attente" ||
    media?.mediaPipelineStatus === "voix_prete" ||
    media?.mediaPipelineStatus === "voice_ready";
  const retainedAssetIds = useMemo(
    () => new Set(retainedVisuals.map((asset) => asset.id)),
    [retainedVisuals],
  );
  const mediaReady =
    media?.mediaPipelineStatus === "media_ready" ||
    media?.mediaPipelineStatus === "visual_ready" ||
    media?.mediaPipelineStatus === "voix_en_attente" ||
    media?.mediaPipelineStatus === "voix_prete" ||
    media?.mediaPipelineStatus === "voice_ready" ||
    media?.mediaPipelineStatus === "ready_to_publish";
  const voiceCanGenerate = Boolean(media?.voice.canGenerate && !isRunningAction);
  const voiceIsReady = media?.voice.status === "ready";
  const voiceIsGenerating =
    media?.voice.status === "generating" || activeAction === "generate_voice" || activeAction === "regenerate_voice";

  async function loadDrafts() {
    setIsLoadingDrafts(true);
    setError(null);

    try {
      const response = await fetch("/api/content-workshop/drafts");
      const payload = (await response.json()) as {
        drafts?: ContentDraft[];
        error?: string;
      };

      if (!response.ok || !payload.drafts) {
        throw new Error(payload.error ?? "Lecture des brouillons indisponible.");
      }

      setDrafts(payload.drafts);
      setSelectedDraftId((current) => current || payload.drafts?.[0]?.id || "");
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Lecture des brouillons indisponible.",
      );
    } finally {
      setIsLoadingDrafts(false);
    }
  }

  async function loadMedia(draftId: string, options: { silent?: boolean } = {}) {
    if (!draftId) {
      setMedia(null);
      return;
    }

    if (!options.silent) {
      setIsLoadingMedia(true);
    }
    setError(null);

    try {
      const response = await fetch(`/api/content-workshop/drafts/${draftId}/media?suggestions=1`);
      const payload = (await response.json()) as {
        media?: MediaPipelineState;
      } & ApiErrorPayload;

      if (!response.ok || !payload.media) {
        throw new Error(formatApiError(payload, "Lecture des visuels indisponible."));
      }

      setMedia(payload.media);
      if (payload.media.voice.selectedVoiceId) {
        setSelectedVoiceId(payload.media.voice.selectedVoiceId);
      }
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Lecture des visuels indisponible.",
      );
      setMedia(null);
    } finally {
      if (!options.silent) {
        setIsLoadingMedia(false);
      }
    }
  }

  async function runVisualAction(
    action:
      | "prepare_media"
      | "refresh_suggestions"
      | "request_visual_generation"
      | "retry_blocked_scenes"
      | "retry_scene_search"
      | "regenerate_scene"
      | "analyze_scene"
      | "retain_scene"
      | "reject_scene"
      | "select_scene_asset"
      | "unlock_scene"
      | "validate_visuals"
      | "select_voice"
      | "generate_voice"
      | "regenerate_voice"
      | "select_asset"
      | "replace_asset"
      | "remove_asset",
    options?: { assetId?: string; sceneIndex?: number; usageOrder?: number; voiceId?: string },
  ) {
    if (!selectedDraft) {
      return;
    }

    if (action === "generate_voice" || action === "regenerate_voice") {
      const confirmed = window.confirm(
        `Confirmer l'appel ElevenLabs ? Cout estime: $${(media?.voice.costEstimateUsd ?? 0).toFixed(2)}.`,
      );

      if (!confirmed) {
        return;
      }
    }

    setIsRunningAction(true);
    setActiveAction(action);
    setError(null);
    setNotice(null);

    try {
      const shouldSendGenerationQuality =
        action === "prepare_media" ||
        action === "request_visual_generation" ||
        action === "retry_blocked_scenes" ||
        action === "retry_scene_search" ||
        action === "regenerate_scene";
      const response = await fetch(`/api/content-workshop/drafts/${selectedDraft.id}/media`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action,
          assetId: options?.assetId,
          generationQuality: shouldSendGenerationQuality
            ? generationQuality
            : undefined,
          sceneIndex: options?.sceneIndex,
          usageOrder: options?.usageOrder,
          voiceId: options?.voiceId,
        }),
      });
      const payload = (await response.json()) as {
        media?: MediaPipelineState;
      } & ApiErrorPayload;

      if (!response.ok || !payload.media) {
        throw new Error(formatApiError(payload, "Action visuelle indisponible."));
      }

      setMedia(payload.media);
      if (action === "validate_visuals" || action === "generate_voice" || action === "regenerate_voice") {
        void loadDrafts();
      }
      setNotice(visualActionNotice(action));
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Action visuelle indisponible.",
      );
    } finally {
      setIsRunningAction(false);
      setActiveAction(null);
    }
  }

  function handleLibraryCandidateForScene(scene: VisualScene, assetId: string) {
    const alreadyUsedScene = media?.visualScenes.find(
      (candidate) =>
        candidate.visualPromptIndex !== scene.visualPromptIndex &&
        candidate.assetId === assetId,
    );

    if (alreadyUsedScene) {
      const confirmed = window.confirm(
        `Ce visuel est deja utilise dans la scene ${alreadyUsedScene.visualPromptIndex}. Le reutiliser quand meme ?`,
      );

      if (!confirmed) {
        return;
      }
    }

    void runVisualAction("select_scene_asset", {
      assetId,
      sceneIndex: scene.visualPromptIndex,
    });
  }

  const runVisualWatchdog = useCallback(async () => {
    if (!selectedDraft || isRunningWatchdog) {
      return;
    }

    setIsRunningWatchdog(true);

    try {
      const response = await fetch(`/api/content-workshop/drafts/${selectedDraft.id}/media`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "recover_stuck_visual_scenes",
          generationQuality,
        }),
      });
      const payload = (await response.json()) as {
        media?: MediaPipelineState;
      } & ApiErrorPayload;

      if (response.ok && payload.media) {
        setMedia(payload.media);
      }
    } finally {
      setIsRunningWatchdog(false);
    }
  }, [generationQuality, isRunningWatchdog, selectedDraft]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadDrafts();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadMedia(selectedDraftId);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [selectedDraftId]);

  useEffect(() => {
    if (!isRunningAction || !selectedDraftId) {
      return;
    }

    const intervalId = window.setInterval(() => {
      void loadMedia(selectedDraftId, { silent: true });
    }, 2000);

    return () => window.clearInterval(intervalId);
  }, [isRunningAction, selectedDraftId]);

  useEffect(() => {
    if (!selectedDraftId || !media?.visualScenes.some(isSceneStuck)) {
      return;
    }

    const initialTimeoutId = window.setTimeout(() => {
      void runVisualWatchdog();
    }, 0);
    const intervalId = window.setInterval(() => {
      void runVisualWatchdog();
    }, 5000);

    return () => {
      window.clearTimeout(initialTimeoutId);
      window.clearInterval(intervalId);
    };
  }, [media?.visualScenes, runVisualWatchdog, selectedDraftId]);

  return (
    <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
      <aside className="space-y-6">
        <SectionContainer>
          <label className="block">
            <span className="text-sm font-semibold text-[#F8FAFC]">
              Choisir un brouillon
            </span>
            <select
              value={selectedDraftId}
              onChange={(event) => setSelectedDraftId(event.target.value)}
              className="mt-2 w-full rounded-md border border-[#1D2A44] bg-[#08111A] px-3 py-2.5 text-sm text-[#F8FAFC] outline-none"
            >
              {drafts.map((draft) => (
                <option key={draft.id} value={draft.id}>
                  {draft.title} - {statusLabels[draft.status] ?? draft.status} -{" "}
                  {scoreOutOf100(draft.score.total)}/100 -{" "}
                  {(draft.id === selectedDraftId && mediaReady) ||
                  draft.status === "ready_to_publish"
                    ? "média prêt"
                    : "média non prêt"}
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            onClick={() => void loadDrafts()}
            className="mt-4 rounded-md border border-[#1D2A44] bg-[#03070B] px-3 py-2 text-xs font-semibold text-[#A7B0C0] transition hover:border-[#39E6D0]/50 hover:text-[#F8FAFC]"
          >
            {isLoadingDrafts ? "Chargement..." : "Actualiser les brouillons"}
          </button>

          {selectedDraft ? (
            <div className="mt-5 grid gap-3 text-sm text-[#A7B0C0]">
              <p className="rounded-md border border-[#1D2A44] bg-[#03070B] px-3 py-2">
                Statut:{" "}
                <span className="font-semibold text-[#F8FAFC]">
                  {statusLabels[selectedDraft.status] ?? selectedDraft.status}
                </span>
              </p>
              <p className="rounded-md border border-[#1D2A44] bg-[#03070B] px-3 py-2">
                Créé le:{" "}
                <span className="font-semibold text-[#F8FAFC]">
                  {formatDate(selectedDraft.createdAt)}
                </span>
              </p>
              <p className="rounded-md border border-[#1D2A44] bg-[#03070B] px-3 py-2">
                Média:{" "}
                <span className="font-semibold text-[#F8FAFC]">
                  {mediaReady ? "prêt" : "non prêt"}
                </span>
              </p>
            </div>
          ) : null}
        </SectionContainer>

        <SectionContainer>
          <h2 className="text-xl font-semibold text-[#F8FAFC]">Statuts Shorts</h2>
          <div className="mt-4 grid gap-2 text-sm text-[#A7B0C0]">
            {[
              "🟢 Texte validé",
              mediaReady ? "🟡 Visuels prêts" : "🟡 Visuels en attente",
              "🟡 Voix en attente",
              "🟡 Vidéo en attente",
              "🟢 Prêt à publier",
            ].map((status) => (
              <p key={status} className="rounded-md border border-[#1D2A44] bg-[#08111A] px-3 py-2">
                {status}
              </p>
            ))}
          </div>
        </SectionContainer>
      </aside>

      <div className="space-y-6">
        <SectionContainer>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#39E6D0]">
                Visuels par brouillon
              </p>
              <h2 className="mt-3 text-2xl font-semibold text-[#F8FAFC]">
                {selectedDraft?.title ?? "Aucun brouillon sélectionné"}
              </h2>
              <p className="mt-3 max-w-3xl leading-7 text-[#A7B0C0]">
                Les prompts et les images affichés ici appartiennent uniquement
                au brouillon choisi.
              </p>
            </div>
            <span className="rounded-md border border-[#1D2A44] bg-[#03070B] px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#A7B0C0]">
              {media ? mediaStatusLabels[media.mediaPipelineStatus] : "Non préparé"}
            </span>
          </div>

          {error ? (
            <p className="mt-5 rounded-md border border-[#F97316]/40 bg-[#F97316]/10 px-4 py-3 text-sm font-semibold text-[#FDBA74]">
              {error}
            </p>
          ) : null}
          {notice ? (
            <p className="mt-5 rounded-md border border-[#39E6D0]/35 bg-[#39E6D0]/10 px-4 py-3 text-sm font-semibold text-[#39E6D0]">
              {notice}
            </p>
          ) : null}

          {selectedDraft && !canPrepareVisuals(selectedDraft.status) ? (
            <p className="mt-5 rounded-md border border-[#F97316]/35 bg-[#F97316]/10 px-4 py-3 text-sm font-semibold text-[#FDBA74]">
              Valide le texte dans Brouillons avant de préparer les visuels.
            </p>
          ) : null}

          <div className="mt-5 grid gap-3 md:grid-cols-4">
            <p className="rounded-md border border-[#1D2A44] bg-[#08111A] px-4 py-3 text-sm text-[#A7B0C0]">
              Score moyen:{" "}
              <span className="font-semibold text-[#F8FAFC]">{averageScore}/100</span>
            </p>
            <p className="rounded-md border border-[#1D2A44] bg-[#08111A] px-4 py-3 text-sm text-[#A7B0C0]">
              Propositions:{" "}
              <span className="font-semibold text-[#F8FAFC]">
                {generatedVisuals.length}
              </span>
            </p>
            <p className="rounded-md border border-[#1D2A44] bg-[#08111A] px-4 py-3 text-sm text-[#A7B0C0]">
              Visuels retenus:{" "}
              <span className="font-semibold text-[#F8FAFC]">
                {retainedVisuals.length}
              </span>
            </p>
            <p className="rounded-md border border-[#1D2A44] bg-[#08111A] px-4 py-3 text-sm text-[#A7B0C0]">
              Visuels requis:{" "}
              <span className="font-semibold text-[#F8FAFC]">
                {requiredSceneCount}
              </span>
            </p>
          </div>

          <div className="mt-5 rounded-md border border-[#1D2A44] bg-[#08111A] p-4">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-semibold text-[#F8FAFC]">
                  Preparation des scenes : {visualProgress.progress}%
                </p>
                <p className="mt-1 text-sm text-[#A7B0C0]">
                  {visualProgress.message}
                </p>
              </div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#A7B0C0]">
                {visualProgress.readyCount}/{requiredSceneCount} pretes ·{" "}
                {visualProgress.blockedCount} a relancer · temps restant{" "}
                {visualProgress.remainingEstimate}
              </p>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#03070B]">
              <div
                className="h-full rounded-full bg-[#39E6D0] transition-all"
                style={{ width: `${visualProgress.progress}%` }}
              />
            </div>
          </div>

          <label className="mt-5 block max-w-sm">
            <span className="text-sm font-semibold text-[#F8FAFC]">
              Qualite de generation
            </span>
            <select
              value={generationQuality}
              onChange={(event) =>
                setGenerationQuality(event.target.value as GenerationQuality)
              }
              className="mt-2 w-full rounded-md border border-[#1D2A44] bg-[#08111A] px-3 py-2.5 text-sm text-[#F8FAFC] outline-none"
            >
              {(["low", "medium", "high"] as GenerationQuality[]).map((quality) => (
                <option key={quality} value={quality}>
                  {generationQualityLabels[quality]}
                </option>
              ))}
            </select>
          </label>

          <p className="mt-3 rounded-md border border-[#1D2A44] bg-[#03070B] px-4 py-3 text-sm text-[#A7B0C0]">
            Estimation avant generation IA :{" "}
            <span className="font-semibold text-[#F8FAFC]">
              ${ESTIMATED_IMAGE_GENERATION_COST_USD[generationQuality].toFixed(2)} par visuel
            </span>
            {" "}hors analyse Vision estimee a{" "}
            <span className="font-semibold text-[#F8FAFC]">
              ${ESTIMATED_GPT_VISION_COST_USD.toFixed(3)}
            </span>.
          </p>

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              disabled={!selectedDraft || !canPrepareVisuals(selectedDraft.status) || isRunningAction}
              onClick={() => void runVisualAction("prepare_media")}
              className="rounded-md border border-[#39E6D0]/50 bg-[#39E6D0]/10 px-4 py-2.5 text-sm font-semibold text-[#39E6D0] transition hover:bg-[#1D2A44] hover:text-[#F8FAFC] disabled:cursor-not-allowed disabled:opacity-55"
            >
              {isRunningAction ? "Préparation..." : "Préparer les visuels"}
            </button>
            <button
              type="button"
              disabled={!selectedDraft || !canPrepareVisuals(selectedDraft.status) || isRunningAction}
              onClick={() => void runVisualAction("refresh_suggestions")}
              className="rounded-md border border-[#1D2A44] bg-[#03070B] px-4 py-2.5 text-sm font-semibold text-[#A7B0C0] transition hover:border-[#39E6D0]/50 hover:text-[#F8FAFC] disabled:cursor-not-allowed disabled:opacity-55"
            >
              Actualiser les propositions
            </button>
            <button
              type="button"
              disabled={
                !selectedDraft ||
                !canPrepareVisuals(selectedDraft.status) ||
                isRunningAction
              }
              onClick={() => void runVisualAction("request_visual_generation")}
              className="rounded-md border border-[#7DD3FC]/45 bg-[#7DD3FC]/10 px-4 py-2.5 text-sm font-semibold text-[#7DD3FC] transition hover:bg-[#1D2A44] hover:text-[#F8FAFC] disabled:cursor-not-allowed disabled:opacity-55"
            >
              Générer ou régénérer
            </button>
            <button
              type="button"
              disabled={
                !selectedDraft ||
                !canPrepareVisuals(selectedDraft.status) ||
                isRunningAction ||
                visualProgress.blockedCount === 0
              }
              onClick={() => void runVisualAction("retry_blocked_scenes")}
              className="rounded-md border border-[#F97316]/45 bg-[#F97316]/10 px-4 py-2.5 text-sm font-semibold text-[#FDBA74] transition hover:bg-[#7C2D12]/40 hover:text-[#F8FAFC] disabled:cursor-not-allowed disabled:opacity-55"
            >
              Relancer les scenes bloquees
            </button>
          </div>

          {isLoadingMedia ? (
            <p className="mt-5 rounded-md border border-[#1D2A44] bg-[#03070B] px-4 py-3 text-sm text-[#A7B0C0]">
              Lecture des visuels du brouillon...
            </p>
          ) : null}
        </SectionContainer>

        <SectionContainer>
          <h2 className="text-xl font-semibold text-[#F8FAFC]">
            Prompts visuels associés
          </h2>
          <div className="mt-4 grid gap-3">
            {visualPrompts.length === 0 ? (
              <p className="rounded-md border border-[#1D2A44] bg-[#08111A] px-4 py-3 text-sm text-[#A7B0C0]">
                Aucun prompt visuel enregistré pour ce brouillon.
              </p>
            ) : null}
            {visualPrompts.map((prompt, index) => (
              <article key={index} className="rounded-md border border-[#1D2A44] bg-[#08111A] p-3">
                <p className="text-sm font-semibold text-[#F8FAFC]">
                  Prompt {index + 1}
                </p>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#A7B0C0]">
                  {prompt}
                </p>
              </article>
            ))}
          </div>
        </SectionContainer>

        <SectionContainer>
          <h2 className="text-xl font-semibold text-[#F8FAFC]">
            Scenes visuelles
          </h2>
          <div className="mt-4 grid gap-4">
            {(media?.visualScenes ?? []).map((scene) => {
              const sceneUiKey = `${scene.draftId}:${scene.visualPromptIndex}`;
              const isDebugOpen = Boolean(openDebugByScene[sceneUiKey]);
              const libraryOverride = openLibraryResultsByScene[sceneUiKey];
              const isLibraryOpen =
                libraryOverride === undefined ? hasRelevantLibraryMatch(scene) : libraryOverride;

              return (
              <article
                key={sceneUiKey}
                className="grid gap-4 rounded-md border border-[#1D2A44] bg-[#08111A] p-4 lg:grid-cols-[220px_minmax(0,1fr)]"
              >
                <div>
                  {scene.imageUrl ? (
                    <div
                      aria-label={`Scene ${scene.visualPromptIndex}`}
                      className="aspect-[9/16] w-full rounded-md bg-[#03070B] bg-cover bg-center"
                      role="img"
                      style={{ backgroundImage: `url(${scene.imageUrl})` }}
                    />
                  ) : isSceneLoading(scene) ? (
                    <div className="flex aspect-[9/16] w-full flex-col items-center justify-center gap-3 rounded-md border border-dashed border-[#1D2A44] bg-[#03070B] px-4 text-center text-xs font-semibold text-[#A7B0C0]">
                      <span className="h-6 w-6 animate-spin rounded-full border-2 border-[#1D2A44] border-t-[#39E6D0]" />
                      <span>{generationStatusLabels[scene.generationStatus]}</span>
                    </div>
                  ) : scene.generationStatus === "error" ? (
                    <div className="flex aspect-[9/16] w-full items-center justify-center rounded-md border border-[#F97316]/35 bg-[#F97316]/10 px-4 text-center text-xs font-semibold text-[#FDBA74]">
                      Erreur image. Ouvre le debug de la scene pour le detail technique.
                    </div>
                  ) : (
                    <div className="flex aspect-[9/16] w-full items-center justify-center rounded-md border border-dashed border-[#1D2A44] bg-[#03070B] px-4 text-center text-xs font-semibold text-[#64748b]">
                      Visuel en attente
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[#39E6D0]">
                        Scene {scene.visualPromptIndex}
                      </p>
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#A7B0C0]">
                        Prompt : {scene.visualPromptText || "Non renseigne"}
                      </p>
                    </div>
                    <span className={`rounded-md border px-2 py-1 text-xs font-semibold ${sceneStatusClass(scene)}`}>
                      {generationSourceLabels[scene.generationSource]} /{" "}
                      {generationStatusLabels[scene.generationStatus]}
                    </span>
                  </div>
                  <div className="mt-3 grid gap-2 text-xs text-[#A7B0C0] md:grid-cols-4">
                    <p>
                      Qualite:{" "}
                      <span className="font-semibold text-[#F8FAFC]">
                        {scene.generationQuality}
                      </span>
                    </p>
                    <p>
                      Score:{" "}
                      <span className="font-semibold text-[#F8FAFC]">
                        {scene.scoreTotal === null
                          ? "non disponible"
                          : `${scoreOutOf100(scene.scoreTotal)}/100`}
                      </span>
                    </p>
                    <p>
                      Source score:{" "}
                      <span className="font-semibold text-[#F8FAFC]">
                        {scoreSourceLabels[scene.scoreSource]}
                      </span>
                    </p>
                    <p>
                      Date de generation:{" "}
                      <span className="font-semibold text-[#F8FAFC]">
                        {formatDate(scene.updatedAt)}
                      </span>
                    </p>
                  </div>
                  {scene.locked ? (
                    <p className="mt-3 rounded-md border border-[#39E6D0]/35 bg-[#39E6D0]/10 px-3 py-2 text-xs font-semibold text-[#39E6D0]">
                      Retenu le {formatDate(scene.retainedAt ?? scene.updatedAt)}
                    </p>
                  ) : (
                    <div className="mt-3 rounded-md border border-[#1D2A44] bg-[#03070B] p-3">
                      <div className="flex items-center justify-between gap-3 text-xs">
                        <span className="font-semibold text-[#F8FAFC]">
                          {sceneProgressMessage(scene, requiredSceneCount)}
                        </span>
                        <span className="font-semibold text-[#A7B0C0]">
                          {sceneProgressValue(scene)}%
                        </span>
                      </div>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#08111A]">
                        <div
                          className="h-full rounded-full bg-[#7DD3FC] transition-all"
                          style={{ width: `${sceneProgressValue(scene)}%` }}
                        />
                      </div>
                    </div>
                  )}
                  <SceneScoreDetails scene={scene} />
                  <SceneLibraryMatches
                    debugOpen={isDebugOpen}
                    disabled={scene.locked}
                    isOpen={isLibraryOpen}
                    onPreviewLoadingChange={(assetId) =>
                      setPreviewLoadingAssetByScene((current) => ({
                        ...current,
                        [sceneUiKey]: assetId,
                      }))
                    }
                    onUseCandidate={(assetId) => handleLibraryCandidateForScene(scene, assetId)}
                    onToggle={() =>
                      setOpenLibraryResultsByScene((current) => ({
                        ...current,
                        [sceneUiKey]: !isLibraryOpen,
                      }))
                    }
                    scene={scene}
                  />
                  {!scene.locked ? (
                    <SceneDebugDetails
                      activeAction={activeAction}
                      hasBlockingOverlay={false}
                      isOpen={isDebugOpen}
                      onToggle={(open) =>
                        setOpenDebugByScene((current) => ({
                          ...current,
                          [sceneUiKey]: open,
                        }))
                      }
                      previewLoadingAssetId={previewLoadingAssetByScene[sceneUiKey] ?? null}
                      scene={scene}
                      sceneDisabled={scene.locked}
                    />
                  ) : null}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {scene.locked ? (
                      <button
                        type="button"
                        disabled={isRunningAction}
                        onClick={() =>
                          void runVisualAction("unlock_scene", {
                            sceneIndex: scene.visualPromptIndex,
                          })
                        }
                        className="rounded-md border border-[#7DD3FC]/45 bg-[#7DD3FC]/10 px-3 py-1.5 text-xs font-semibold text-[#7DD3FC] transition hover:bg-[#1D2A44] hover:text-[#F8FAFC] disabled:cursor-wait disabled:opacity-60"
                      >
                        Modifier
                      </button>
                    ) : (
                      <>
                        <p className="basis-full rounded-md border border-[#1D2A44] bg-[#03070B] px-3 py-2 text-xs text-[#A7B0C0]">
                          Cout estime avant generation IA :{" "}
                          <span className="font-semibold text-[#F8FAFC]">
                            ${ESTIMATED_IMAGE_GENERATION_COST_USD[generationQuality].toFixed(2)}
                          </span>
                          {" "}+ Vision{" "}
                          <span className="font-semibold text-[#F8FAFC]">
                            ${ESTIMATED_GPT_VISION_COST_USD.toFixed(3)}
                          </span>
                        </p>
                        <button
                          type="button"
                          disabled={isRunningAction}
                          onClick={() =>
                            void runVisualAction("regenerate_scene", {
                              sceneIndex: scene.visualPromptIndex,
                            })
                          }
                          className="rounded-md border border-[#7DD3FC]/45 bg-[#7DD3FC]/10 px-3 py-1.5 text-xs font-semibold text-[#7DD3FC] transition hover:bg-[#1D2A44] hover:text-[#F8FAFC] disabled:cursor-wait disabled:opacity-60"
                        >
                          Generer un visuel IA
                        </button>
                        <button
                          type="button"
                          disabled={isRunningAction}
                          onClick={() =>
                            void runVisualAction("retry_scene_search", {
                              sceneIndex: scene.visualPromptIndex,
                            })
                          }
                          className="rounded-md border border-[#1D2A44] bg-[#03070B] px-3 py-1.5 text-xs font-semibold text-[#A7B0C0] transition hover:border-[#39E6D0]/50 hover:text-[#F8FAFC] disabled:cursor-wait disabled:opacity-60"
                        >
                          Regenerer la recherche
                        </button>
                        <button
                          type="button"
                          disabled={isRunningAction || !scene.imageUrl}
                          onClick={() =>
                            void runVisualAction("analyze_scene", {
                              sceneIndex: scene.visualPromptIndex,
                            })
                          }
                          className="rounded-md border border-[#39E6D0]/45 bg-[#39E6D0]/10 px-3 py-1.5 text-xs font-semibold text-[#39E6D0] transition hover:bg-[#1D2A44] hover:text-[#F8FAFC] disabled:cursor-wait disabled:opacity-60"
                        >
                          Analyser avec Vision
                        </button>
                        <button
                          type="button"
                          disabled={isRunningAction || !scene.imageUrl}
                          onClick={() =>
                            void runVisualAction("retain_scene", {
                              sceneIndex: scene.visualPromptIndex,
                            })
                          }
                          className="rounded-md border border-[#39E6D0]/45 bg-[#39E6D0]/10 px-3 py-1.5 text-xs font-semibold text-[#39E6D0] transition hover:bg-[#1D2A44] hover:text-[#F8FAFC] disabled:cursor-wait disabled:opacity-60"
                        >
                          Retenir
                        </button>
                        <button
                          type="button"
                          disabled={isRunningAction}
                          onClick={() =>
                            void runVisualAction("reject_scene", {
                              sceneIndex: scene.visualPromptIndex,
                            })
                          }
                          className="rounded-md border border-[#F97316]/45 bg-[#F97316]/10 px-3 py-1.5 text-xs font-semibold text-[#FDBA74] transition hover:bg-[#7C2D12]/40 hover:text-[#F8FAFC] disabled:cursor-wait disabled:opacity-60"
                        >
                          Ignorer cette scene
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </article>
              );
            })}
            {media && media.visualScenes.length === 0 ? (
              <p className="rounded-md border border-[#1D2A44] bg-[#08111A] px-4 py-3 text-sm text-[#A7B0C0]">
                Lance la preparation pour creer les {requiredSceneCount} scenes requises.
              </p>
            ) : null}
          </div>
          <div className="mt-5 rounded-md border border-[#1D2A44] bg-[#08111A] p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-semibold text-[#F8FAFC]">
                  {retainedSceneCount}/{requiredSceneCount} visuels retenus
                </p>
                <p className="mt-1 text-sm text-[#A7B0C0]">
                  Statut du short :{" "}
                  {visualsAreValidated
                    ? "visuels prets / pret a proteger"
                    : `visuels en cours - ${missingRetainedSceneCount} manquant${missingRetainedSceneCount > 1 ? "s" : ""}`}
                </p>
                {visualsAreValidated ? null : (
                  <p className="mt-1 text-xs text-[#FDBA74]">
                    Validation disponible lorsque {requiredSceneCount}/{requiredSceneCount} visuels sont retenus.
                  </p>
                )}
              </div>
              <button
                type="button"
                disabled={!visualsAreValidated || isRunningAction}
                onClick={() => void runVisualAction("validate_visuals")}
                className="rounded-md border border-[#39E6D0]/50 bg-[#39E6D0]/10 px-4 py-2.5 text-sm font-semibold text-[#39E6D0] transition hover:bg-[#1D2A44] hover:text-[#F8FAFC] disabled:cursor-not-allowed disabled:opacity-55"
              >
                Valider les visuels du short
              </button>
            </div>
          </div>
        </SectionContainer>

        <SectionContainer>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#39E6D0]">
                Voix du Short
              </p>
              <h2 className="mt-2 text-xl font-semibold text-[#F8FAFC]">
                Preparation audio
              </h2>
            </div>
            <span className="rounded-md border border-[#1D2A44] bg-[#03070B] px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#A7B0C0]">
              {media?.voice ? voiceStatusLabels[media.voice.status] : "Non preparee"}
            </span>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-4">
            <p className="rounded-md border border-[#1D2A44] bg-[#08111A] px-4 py-3 text-sm text-[#A7B0C0]">
              Statut:{" "}
              <span className="font-semibold text-[#F8FAFC]">
                {media?.voice ? voiceStatusLabels[media.voice.status] : "Non preparee"}
              </span>
            </p>
            <p className="rounded-md border border-[#1D2A44] bg-[#08111A] px-4 py-3 text-sm text-[#A7B0C0]">
              Voix selectionnee:{" "}
              <span className="font-semibold text-[#F8FAFC]">
                {media?.voice.selectedVoiceLabel ?? "Aucune"}
              </span>
            </p>
            <p className="rounded-md border border-[#1D2A44] bg-[#08111A] px-4 py-3 text-sm text-[#A7B0C0]">
              Duree estimee:{" "}
              <span className="font-semibold text-[#F8FAFC]">
                {formatDuration(media?.voice.durationEstimateSeconds ?? 0)}
              </span>
            </p>
            <p className="rounded-md border border-[#1D2A44] bg-[#08111A] px-4 py-3 text-sm text-[#A7B0C0]">
              Cout estime:{" "}
              <span className="font-semibold text-[#F8FAFC]">
                ${(media?.voice.costEstimateUsd ?? 0).toFixed(2)}
              </span>
            </p>
          </div>

          <div className="mt-5 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
            <label className="block">
              <span className="text-sm font-semibold text-[#F8FAFC]">
                Voix
              </span>
              <select
                value={selectedVoiceId}
                onChange={(event) => setSelectedVoiceId(event.target.value)}
                className="mt-2 w-full rounded-md border border-[#1D2A44] bg-[#08111A] px-3 py-2.5 text-sm text-[#F8FAFC] outline-none"
              >
                {voiceOptions.map((voice) => (
                  <option key={voice.id} value={voice.id}>
                    {voice.label}
                  </option>
                ))}
              </select>
            </label>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={!selectedDraft || isRunningAction}
                onClick={() =>
                  void runVisualAction("select_voice", {
                    voiceId: selectedVoiceId,
                  })
                }
                className="rounded-md border border-[#1D2A44] bg-[#03070B] px-4 py-2.5 text-sm font-semibold text-[#A7B0C0] transition hover:border-[#39E6D0]/50 hover:text-[#F8FAFC] disabled:cursor-not-allowed disabled:opacity-55"
              >
                Choisir une voix
              </button>
              <button
                type="button"
                disabled={!voiceCanGenerate || voiceIsGenerating}
                onClick={() =>
                  void runVisualAction("generate_voice", {
                    voiceId: selectedVoiceId,
                  })
                }
                className="rounded-md border border-[#39E6D0]/50 bg-[#39E6D0]/10 px-4 py-2.5 text-sm font-semibold text-[#39E6D0] transition hover:bg-[#1D2A44] hover:text-[#F8FAFC] disabled:cursor-not-allowed disabled:opacity-55"
              >
                {voiceIsGenerating ? "Generation..." : "Generer la voix"}
              </button>
              <button
                type="button"
                disabled={!voiceIsReady || !voiceCanGenerate || voiceIsGenerating}
                onClick={() =>
                  void runVisualAction("regenerate_voice", {
                    voiceId: selectedVoiceId,
                  })
                }
                className="rounded-md border border-[#7DD3FC]/45 bg-[#7DD3FC]/10 px-4 py-2.5 text-sm font-semibold text-[#7DD3FC] transition hover:bg-[#1D2A44] hover:text-[#F8FAFC] disabled:cursor-not-allowed disabled:opacity-55"
              >
                Regenerer la voix
              </button>
              {voiceIsReady && media?.voice.audioUrl ? (
                <a
                  href={media.voice.audioUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-md border border-[#1D2A44] bg-[#03070B] px-4 py-2.5 text-sm font-semibold text-[#F8FAFC] transition hover:border-[#39E6D0]/50"
                >
                  Ecouter / ouvrir l&apos;audio
                </a>
              ) : null}
            </div>
          </div>

          {media?.voice.errorMessage ? (
            <p className="mt-4 rounded-md border border-[#F97316]/40 bg-[#F97316]/10 px-4 py-3 text-sm font-semibold text-[#FDBA74]">
              {media.voice.errorMessage.includes("Cle ElevenLabs")
                ? "Cle ElevenLabs non configuree"
                : media.voice.errorMessage}
            </p>
          ) : null}
          {!media?.voice.canGenerate ? (
            <p className="mt-4 rounded-md border border-[#1D2A44] bg-[#03070B] px-4 py-3 text-sm text-[#A7B0C0]">
              La generation voix sera disponible quand le texte est valide et les visuels sont prets.
            </p>
          ) : null}
        </SectionContainer>

        <SectionContainer>
          <h2 className="text-xl font-semibold text-[#F8FAFC]">
            Visuels retenus
          </h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {retainedVisuals.length === 0 ? (
              <p className="rounded-md border border-[#1D2A44] bg-[#08111A] px-4 py-3 text-sm text-[#A7B0C0] md:col-span-2 xl:col-span-3">
                Aucun visuel retenu pour ce brouillon.
              </p>
            ) : null}
            {retainedVisuals.map((asset) => (
              <article key={asset.linkId} className="overflow-hidden rounded-md border border-[#1D2A44] bg-[#08111A]">
                <div
                  aria-label={asset.fileName}
                  className="aspect-[9/16] w-full bg-[#03070B] bg-cover bg-center"
                  role="img"
                  style={{ backgroundImage: `url(${asset.publicUrl})` }}
                />
                <div className="p-3">
                  <p className="text-sm font-semibold text-[#F8FAFC]">
                    {asset.usageOrder}. {asset.fileName}
                  </p>
                  <div className="mt-2 grid gap-2 text-xs text-[#A7B0C0]">
                    <p>Score: <span className="font-semibold text-[#F8FAFC]">{scoreOutOf100(asset.score)}/100</span></p>
                    <p>Date de génération: <span className="font-semibold text-[#F8FAFC]">{formatDate(asset.createdAt)}</span></p>
                    <p>Statut: <span className="font-semibold text-[#39E6D0]">retenu</span></p>
                    <p>Raison: {scoreReason(asset, true)}</p>
                    <p className="line-clamp-4 leading-5">
                      Prompt source: {visualPromptSource(asset, visualPrompts, asset.usageOrder)}
                    </p>
                  </div>
                  <ScoreDetails asset={asset} isRetained />
                  {visualActionsLocked ? null : (
                    <button
                      type="button"
                      disabled={isRunningAction}
                      onClick={() =>
                        void runVisualAction("remove_asset", {
                          assetId: asset.id,
                        })
                      }
                      className="mt-3 rounded-md border border-[#F97316]/45 bg-[#F97316]/10 px-3 py-1.5 text-xs font-semibold text-[#FDBA74] transition hover:bg-[#7C2D12]/40 hover:text-[#F8FAFC] disabled:cursor-wait disabled:opacity-60"
                    >
                      Retirer
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
        </SectionContainer>

        <SectionContainer>
          <h2 className="text-xl font-semibold text-[#F8FAFC]">
            Propositions visuelles
          </h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {generatedVisuals.length === 0 ? (
              <p className="rounded-md border border-[#1D2A44] bg-[#08111A] px-4 py-3 text-sm text-[#A7B0C0] md:col-span-2 xl:col-span-3">
                Prépare les visuels pour afficher les propositions de ce brouillon.
              </p>
            ) : null}
            {generatedVisuals.map((asset, index) => {
              const isRetained = retainedAssetIds.has(asset.id);
              const usageOrder =
                slotByAsset[asset.id] ?? firstFreeVisualSlot(retainedVisuals, requiredSceneCount);

              return (
                <article key={asset.id} className="overflow-hidden rounded-md border border-[#1D2A44] bg-[#08111A]">
                  <div
                    aria-label={asset.fileName}
                    className="aspect-[9/16] w-full bg-[#03070B] bg-cover bg-center"
                    role="img"
                    style={{ backgroundImage: `url(${asset.publicUrl})` }}
                  />
                  <div className="p-3">
                    <p className="text-sm font-semibold text-[#F8FAFC]">{asset.fileName}</p>
                    <div className="mt-2 grid gap-2 text-xs text-[#A7B0C0]">
                      <p>Score: <span className="font-semibold text-[#F8FAFC]">{scoreOutOf100(asset.score)}/100</span></p>
                      <p>Date de génération: <span className="font-semibold text-[#F8FAFC]">{formatDate(asset.createdAt)}</span></p>
                      <p>
                        Statut:{" "}
                        <span className={isRetained ? "font-semibold text-[#39E6D0]" : "font-semibold text-[#FDBA74]"}>
                          {isRetained ? "retenu" : "non retenu"}
                        </span>
                      </p>
                      <p>Raison: {scoreReason(asset, isRetained)}</p>
                      <p className="line-clamp-4 leading-5">
                        Prompt source: {visualPromptSource(asset, visualPrompts, index + 1)}
                      </p>
                    </div>
                    <ScoreDetails asset={asset} isRetained={isRetained} />
                    {visualActionsLocked ? null : (
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <select
                        value={usageOrder}
                        onChange={(event) =>
                          setSlotByAsset((current) => ({
                            ...current,
                            [asset.id]: Number(event.target.value),
                          }))
                        }
                        className="rounded-md border border-[#1D2A44] bg-[#03070B] px-2 py-1.5 text-xs font-semibold text-[#F8FAFC]"
                      >
                        {Array.from({ length: requiredSceneCount }, (_, optionIndex) => optionIndex + 1).map((slot) => (
                          <option key={slot} value={slot}>
                            Position {slot}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        disabled={isRunningAction}
                        onClick={() =>
                          void runVisualAction(isRetained ? "replace_asset" : "select_asset", {
                            assetId: asset.id,
                            usageOrder,
                          })
                        }
                        className="rounded-md border border-[#39E6D0]/45 bg-[#39E6D0]/10 px-3 py-1.5 text-xs font-semibold text-[#39E6D0] transition hover:bg-[#1D2A44] hover:text-[#F8FAFC] disabled:cursor-wait disabled:opacity-60"
                      >
                        {isRetained ? "Remplacer" : "Retenir"}
                      </button>
                      {isRetained ? (
                        <button
                          type="button"
                          disabled={isRunningAction}
                          onClick={() =>
                            void runVisualAction("remove_asset", {
                              assetId: asset.id,
                            })
                          }
                          className="rounded-md border border-[#F97316]/45 bg-[#F97316]/10 px-3 py-1.5 text-xs font-semibold text-[#FDBA74] transition hover:bg-[#7C2D12]/40 hover:text-[#F8FAFC] disabled:cursor-wait disabled:opacity-60"
                        >
                          Retirer
                        </button>
                      ) : null}
                    </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </SectionContainer>
      </div>
    </div>
  );
}
