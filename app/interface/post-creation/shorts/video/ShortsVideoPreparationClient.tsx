"use client";

import { useEffect, useMemo, useState } from "react";
import { SectionContainer } from "@/components/cockpit/SectionContainer";
import { ShortWorkflowStatus } from "@/components/cockpit/ShortWorkflowStatus";
import { getShortWorkflowState } from "@/lib/short-workflow";
import { normalizeSubtitleMode, subtitleModeLabel } from "@/lib/subtitles";

type ContentDraft = {
  id: string;
  createdAt: string;
  title: string;
  theme: string;
  status: string;
  script: string;
  score: {
    duration_seconds?: number | string | null;
    total: number;
  };
};

type DraftVoiceState = {
  audioUrl: string | null;
  durationEstimateSeconds: number;
  generatedAt: string | null;
  status: "not_ready" | "pending" | "generating" | "ready" | "validated" | "error";
};

type DraftSubtitleState = {
  durationSeconds: number;
  generatedAt: string | null;
  jsonUrl: string | null;
  mode: "karaoke" | "classic";
  segmentsCount: number;
  srtUrl: string | null;
  status: "pending" | "generating" | "ready" | "validated" | "ignored" | "error";
  vttUrl: string | null;
};

type DraftVideoPreparationState = {
  manifestStoragePath: string | null;
  manifestUrl: string | null;
  preparedAt: string | null;
  status: "pending" | "ready";
};

type VideoRenderJobState = {
  id: string;
  draftId: string;
  manifestId: string | null;
  manifestPath: string | null;
  status: "queued" | "processing" | "completed" | "failed";
  requestedAt: string;
  startedAt: string | null;
  completedAt: string | null;
  errorMessage: string | null;
  outputPath: string | null;
  outputUrl: string | null;
  durationSeconds: number | null;
  renderedAt: string | null;
  videoValidated: boolean;
  videoValidatedAt: string | null;
};

type MediaPayload = {
  media?: {
    mediaPipelineStatus?: string;
    selectedAssets?: unknown[];
    subtitles?: DraftSubtitleState;
    videoPreparation?: DraftVideoPreparationState;
    visualScenes?: Array<{
      generationStatus?: string | null;
      imageUrl?: string | null;
      locked?: boolean | null;
    }>;
    voice: DraftVoiceState;
  };
  error?: string;
};

type VideoRenderPayload = {
  reusedActiveJob?: boolean;
  videoRender?: VideoRenderJobState | null;
  error?: string;
};

type DraftCostSummary = {
  alreadyRecordedEur: number | null;
  currency: "EUR";
  details: Array<{
    category: string;
    estimatedCostEur: number | null;
    label: string;
    note: string;
    recordedCostEur: number | null;
  }>;
  remainingEstimatedEur: number | null;
  totalEstimatedEur: number | null;
};

type DraftCostPayload = {
  costs?: DraftCostSummary;
  error?: string;
};

const costCategoryLabels: Record<string, string> = {
  image_generation: "Visuels",
  subtitle_generation: "Sous-titres",
  video_render: "Rendu video",
  voice_generation: "Voix",
};

const requiredVideoCostCategories = [
  { category: "image_generation", label: "Visuels" },
  { category: "voice_generation", label: "Voix" },
  { category: "subtitle_generation", label: "Sous-titres" },
  { category: "video_render", label: "Rendu video" },
];

const statusLabels: Record<string, string> = {
  approved: "Texte valide",
  draft: "Brouillon texte",
  ready_to_publish: "Pret a publier",
  rejected: "Rejete",
  sous_titres_erreur: "Erreur sous-titres",
  sous_titres_ignores: "Sous-titres ignores",
  sous_titres_prets: "Sous-titres prets",
  sous_titres_en_attente: "Sous-titres en attente",
  sous_titres_en_cours: "Sous-titres en cours",
  validated: "Texte valide",
  video_en_attente: "Video en attente",
  video_validated: "Video validee",
  video_ready: "Video prete a generer",
  visual_ready: "Visuels prets",
  visuels_prets: "Visuels prets",
  voice_ready: "Voix prete",
  voix_en_attente: "Voix en attente",
  voix_en_cours: "Voix en cours",
  voix_erreur: "Erreur voix",
  voix_prete: "Voix prete",
  voix_validee: "Voix validee",
  "voix_prÃªte": "Voix prete",
  "voix_validÃ©e": "Voix validee",
};

function scoreOutOf100(value: number) {
  return Math.round(Math.max(0, Math.min(100, value <= 10 ? value * 10 : value)));
}

function formatDate(value: string | null) {
  if (!value) {
    return "Aucune preparation";
  }

  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function formatDuration(seconds: number) {
  const safeSeconds = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = safeSeconds % 60;

  if (!minutes) {
    return `${remainingSeconds}s`;
  }

  return `${minutes}min ${remainingSeconds.toString().padStart(2, "0")}s`;
}

function formatCost(value: number | null) {
  if (value === null || !Number.isFinite(value)) {
    return "Non estime";
  }

  return new Intl.NumberFormat("fr-FR", {
    currency: "EUR",
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
    style: "currency",
  }).format(value);
}

function videoCostDetails(costs: DraftCostSummary | null) {
  return requiredVideoCostCategories.map((requiredCategory) => {
    const detail = costs?.details.find(
      (item) => item.category === requiredCategory.category ||
        item.label === requiredCategory.label,
    );

    return {
      category: requiredCategory.category,
      estimatedCostEur: detail?.estimatedCostEur ?? null,
      label: costCategoryLabels[requiredCategory.category] ?? requiredCategory.label,
      recordedCostEur: detail?.recordedCostEur ?? null,
    };
  });
}

function formatSubtitleAudioDuration(subtitles: DraftSubtitleState | null, voice: DraftVoiceState | null) {
  if (subtitles && subtitles.durationSeconds > 0) {
    return formatDuration(subtitles.durationSeconds);
  }

  if (voice?.audioUrl) {
    return "Duree en cours de verification";
  }

  return "0s";
}

export function ShortsVideoPreparationClient() {
  const [drafts, setDrafts] = useState<ContentDraft[]>([]);
  const [selectedDraftId, setSelectedDraftId] = useState("");
  const [media, setMedia] = useState<MediaPayload["media"] | null>(null);
  const [isLoadingDrafts, setIsLoadingDrafts] = useState(false);
  const [isLoadingMedia, setIsLoadingMedia] = useState(false);
  const [isPreparingVideo, setIsPreparingVideo] = useState(false);
  const [isRenderingVideo, setIsRenderingVideo] = useState(false);
  const [isLoadingRenderStatus, setIsLoadingRenderStatus] = useState(false);
  const [videoRender, setVideoRender] = useState<VideoRenderJobState | null>(null);
  const [costs, setCosts] = useState<DraftCostSummary | null>(null);
  const [confirmRegenerate, setConfirmRegenerate] = useState(false);
  const [confirmValidateVideo, setConfirmValidateVideo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const selectedDraft = useMemo(
    () => drafts.find((draft) => draft.id === selectedDraftId) ?? null,
    [drafts, selectedDraftId],
  );
  const renderIsCompleted = videoRender?.status === "completed" && Boolean(videoRender.outputUrl);
  const videoIsValidated = Boolean(videoRender?.videoValidated);
  const workflowState = useMemo(
    () =>
      getShortWorkflowState({
        draft: selectedDraft,
        media,
        requiredVisualCount: media?.visualScenes?.length ?? media?.selectedAssets?.length ?? 0,
        video: {
          status: videoIsValidated
            ? "validated"
            : renderIsCompleted
              ? "ready"
              : undefined,
        },
      }),
    [media, renderIsCompleted, selectedDraft, videoIsValidated],
  );
  const voice = media?.voice ?? null;
  const subtitles = media?.subtitles ?? null;
  const videoPreparation = media?.videoPreparation ?? null;
  const generatedSubtitleMode = normalizeSubtitleMode(subtitles?.mode);
  const targetDurationSeconds = Number(selectedDraft?.score.duration_seconds);
  const safeTargetDurationSeconds = Number.isFinite(targetDurationSeconds) && targetDurationSeconds > 0
    ? targetDurationSeconds
    : subtitles?.durationSeconds || voice?.durationEstimateSeconds || 0;
  const validatedVisualsCount = Math.max(
    workflowState.raw.retainedVisualScenesCount,
    workflowState.visuals === "validated" ? workflowState.raw.selectedAssetsCount : 0,
  );
  const requiredVisualCount = workflowState.raw.requiredVisualCount;
  const videoChecklist = [
    {
      label: "Texte",
      ok: workflowState.text === "validated",
      value: workflowState.text === "validated" ? "valide" : "manquant",
    },
    {
      label: "Visuels",
      ok: workflowState.visuals === "validated" && validatedVisualsCount >= requiredVisualCount,
      value: `${validatedVisualsCount}/${requiredVisualCount} valides`,
    },
    {
      label: "Voix",
      ok: workflowState.voice === "validated",
      value: workflowState.voice === "validated" ? "validee" : "manquante",
    },
    {
      label: "Sous-titres",
      ok: workflowState.subtitles === "validated",
      value: workflowState.subtitles === "validated" ? "valides" : "manquants",
    },
    {
      label: "Style de sous-titres",
      ok: workflowState.subtitles === "validated",
      value: subtitleModeLabel(generatedSubtitleMode),
    },
    {
      label: "Duree audio",
      ok: Boolean(voice?.audioUrl),
      value: formatSubtitleAudioDuration(subtitles, voice),
    },
    {
      label: "Duree cible",
      ok: safeTargetDurationSeconds > 0,
      value: safeTargetDurationSeconds > 0
        ? formatDuration(safeTargetDurationSeconds)
        : "a determiner",
    },
  ];
  const videoBlockingReasons = videoChecklist
    .filter((item) => !item.ok)
    .map((item) => `${item.label}: ${item.value}`);
  const videoPreparationReady = videoPreparation?.status === "ready" || workflowState.video === "ready";
  const renderIsActive = videoRender?.status === "queued" || videoRender?.status === "processing";
  const renderIsFailed = videoRender?.status === "failed";
  const renderStatusLabel =
    videoRender?.status === "queued"
      ? "En attente du renderer"
      : videoRender?.status === "processing"
        ? "Rendu en cours"
        : videoRender?.status === "completed"
          ? videoIsValidated
            ? "Video validee"
            : "Video prete a valider"
          : videoRender?.status === "failed"
            ? "Echec du rendu"
            : videoPreparationReady
              ? "Pret a generer"
              : "Manifest requis";
  const canPrepareVideo = videoBlockingReasons.length === 0 &&
    !videoPreparationReady &&
    !isPreparingVideo;
  const canRegenerateManifest = videoBlockingReasons.length === 0 &&
    videoPreparationReady &&
    !isPreparingVideo &&
    !renderIsActive;
  const canGenerateVideo = videoPreparationReady && !renderIsActive && !isRenderingVideo;
  const canValidateVideo = renderIsCompleted &&
    !videoIsValidated &&
    Boolean(videoRender?.outputPath) &&
    Boolean(videoRender?.outputUrl) &&
    videoRender?.status === "completed" &&
    !isRenderingVideo;
  const manifestRegenerationDisabledReason = renderIsActive
    ? "Regeneration indisponible pendant un rendu queued ou processing."
    : videoBlockingReasons.length > 0
      ? "Texte, visuels, voix et sous-titres doivent etre valides."
      : null;

  async function loadDrafts() {
    setIsLoadingDrafts(true);
    setError(null);
    setNotice(null);

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

  async function loadMedia(draftId: string) {
    if (!draftId) {
      setMedia(null);
      return;
    }

    setIsLoadingMedia(true);
    setError(null);

    try {
      const response = await fetch(`/api/content-workshop/drafts/${draftId}/media`);
      const payload = (await response.json()) as MediaPayload;

      if (!response.ok || !payload.media?.voice) {
        throw new Error(payload.error ?? "Lecture media indisponible.");
      }

      setMedia(payload.media);
      await loadDraftCosts(draftId, payload.media);
    } catch (caughtError) {
      setMedia(null);
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Lecture media indisponible.",
      );
    } finally {
      setIsLoadingMedia(false);
    }
  }

  async function loadDraftCosts(draftId: string, nextMedia = media) {
    if (!draftId) {
      setCosts(null);
      return;
    }

    try {
      const duration = nextMedia?.subtitles?.durationSeconds ||
        nextMedia?.voice?.durationEstimateSeconds ||
        safeTargetDurationSeconds ||
        0;
      const visualCount = Math.max(
        nextMedia?.visualScenes?.length ?? 0,
        nextMedia?.selectedAssets?.length ?? 0,
        requiredVisualCount,
      );
      const response = await fetch(
        `/api/content-workshop/drafts/${draftId}/costs?duration_seconds=${encodeURIComponent(String(duration))}&visual_count=${encodeURIComponent(String(visualCount))}`,
        { cache: "no-store" },
      );
      const payload = (await response.json()) as DraftCostPayload;

      if (!response.ok || !payload.costs) {
        return;
      }

      setCosts(payload.costs);
    } catch {
      setCosts(null);
    }
  }

  async function loadVideoRenderStatus(draftId: string, options?: { silent?: boolean }) {
    if (!draftId) {
      setVideoRender(null);
      return;
    }

    if (!options?.silent) {
      setIsLoadingRenderStatus(true);
    }

    try {
      const response = await fetch(`/api/content-workshop/drafts/${draftId}/video-render`, {
        cache: "no-store",
      });
      const payload = (await response.json()) as VideoRenderPayload;

      if (!response.ok) {
        throw new Error(payload.error ?? "Lecture du rendu video indisponible.");
      }

      setVideoRender(payload.videoRender ?? null);
      await loadDraftCosts(draftId);
    } catch (caughtError) {
      if (!options?.silent) {
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Lecture du rendu video indisponible.",
        );
      }
    } finally {
      if (!options?.silent) {
        setIsLoadingRenderStatus(false);
      }
    }
  }

  async function runVideoRenderAction(action: "start" | "retry" | "regenerate" | "cancel") {
    if (!selectedDraft) {
      return;
    }

    if (action !== "cancel" && !canGenerateVideo) {
      return;
    }

    if (action === "regenerate" && !confirmRegenerate) {
      setConfirmRegenerate(true);
      return;
    }

    setIsRenderingVideo(true);
    setError(null);
    setNotice(null);

    try {
      const response = await fetch(`/api/content-workshop/drafts/${selectedDraft.id}/video-render`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action }),
      });
      const payload = (await response.json()) as VideoRenderPayload;

      if (!response.ok) {
        throw new Error(payload.error ?? "Rendu video indisponible.");
      }

      setVideoRender(payload.videoRender ?? null);
      await loadDraftCosts(selectedDraft.id);
      setConfirmRegenerate(false);
      setConfirmValidateVideo(false);
      setNotice(
        action === "cancel"
          ? "Job annule. Vous pouvez relancer le rendu."
          : payload.videoRender?.status === "completed"
          ? "Rendu termine. La video est prete a valider."
          : "Job de rendu envoye au renderer Railway.",
      );
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Rendu video indisponible.",
      );
      await loadVideoRenderStatus(selectedDraft.id, { silent: true });
    } finally {
      setIsRenderingVideo(false);
    }
  }

  async function runVideoValidationAction() {
    if (!selectedDraft || !canValidateVideo) {
      return;
    }

    if (!confirmValidateVideo) {
      setConfirmValidateVideo(true);
      return;
    }

    setIsRenderingVideo(true);
    setError(null);
    setNotice(null);

    try {
      const response = await fetch(`/api/content-workshop/drafts/${selectedDraft.id}/video-render`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "validate" }),
      });
      const payload = (await response.json()) as VideoRenderPayload;

      if (!response.ok || !payload.videoRender) {
        throw new Error(payload.error ?? "Validation video indisponible.");
      }

      setVideoRender(payload.videoRender);
      setConfirmValidateVideo(false);
      await loadDrafts();
      await loadDraftCosts(selectedDraft.id);
      setNotice("Video validee. Elle est prete pour la preparation de publication.");
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Validation video indisponible.",
      );
      await loadVideoRenderStatus(selectedDraft.id, { silent: true });
    } finally {
      setIsRenderingVideo(false);
    }
  }

  async function runVideoPreparationAction(options?: { force?: boolean }) {
    const force = Boolean(options?.force);

    if (!selectedDraft || (!force && !canPrepareVideo) || (force && !canRegenerateManifest)) {
      return;
    }

    setIsPreparingVideo(true);
    setError(null);
    setNotice(null);

    try {
      const response = await fetch(`/api/content-workshop/drafts/${selectedDraft.id}/media`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "prepare_video" }),
      });
      const payload = (await response.json()) as MediaPayload;

      if (!response.ok || !payload.media?.voice) {
        throw new Error(payload.error ?? "Preparation video indisponible.");
      }

      setMedia(payload.media);
      await loadDrafts();
      await loadVideoRenderStatus(selectedDraft.id, { silent: true });
      await loadDraftCosts(selectedDraft.id, payload.media);
      setNotice(
        force
          ? renderIsCompleted
            ? "Manifest regenere avec les visuels valides. La video existante reste disponible; un nouveau rendu sera necessaire."
            : "Manifest regenere avec les visuels valides. Le rendu peut etre relance."
          : "Preparation video terminee. Le manifest est pret pour le montage.",
      );
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Preparation video indisponible.",
      );
      await loadMedia(selectedDraft.id);
    } finally {
      setIsPreparingVideo(false);
    }
  }

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
    const timeoutId = window.setTimeout(() => {
      void loadVideoRenderStatus(selectedDraftId);
      void loadDraftCosts(selectedDraftId);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [selectedDraftId]);

  useEffect(() => {
    if (!selectedDraftId || !renderIsActive) {
      return;
    }

    const intervalId = window.setInterval(() => {
      void loadVideoRenderStatus(selectedDraftId, { silent: true });
    }, 6000);

    return () => window.clearInterval(intervalId);
  }, [renderIsActive, selectedDraftId]);

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
                  {scoreOutOf100(draft.score.total)}/100
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
        </SectionContainer>

        <ShortWorkflowStatus state={workflowState} compact />
      </aside>

      <div className="space-y-6">
        <SectionContainer>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#39E6D0]">
                Montage Shorts
              </p>
              <h2 className="mt-3 text-2xl font-semibold text-[#F8FAFC]">
                Preparer la video
              </h2>
            </div>
            <span className={`rounded-md border px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] ${
              renderIsCompleted
                ? "border-[#22C55E]/45 bg-[#22C55E]/10 text-[#86EFAC]"
                : renderIsFailed
                  ? "border-[#F97316]/45 bg-[#F97316]/10 text-[#FDBA74]"
                  : renderIsActive
                    ? "border-[#39E6D0]/45 bg-[#39E6D0]/10 text-[#39E6D0]"
                    : videoPreparationReady
                      ? "border-[#22C55E]/45 bg-[#22C55E]/10 text-[#86EFAC]"
                      : videoBlockingReasons.length === 0
                        ? "border-[#39E6D0]/45 bg-[#39E6D0]/10 text-[#39E6D0]"
                        : "border-[#1D2A44] bg-[#03070B] text-[#A7B0C0]"
            }`}>
              {isLoadingMedia ? "Chargement" : renderStatusLabel}
            </span>
          </div>

          {videoPreparationReady ? (
            <div className="mt-5 rounded-md border border-[#1D2A44] bg-[#03070B] px-4 py-3">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-sm font-semibold text-[#F8FAFC]">
                    {renderStatusLabel}
                  </p>
                  <p className="mt-1 text-sm text-[#A7B0C0]">
                    {videoRender?.requestedAt
                      ? `Demande: ${formatDate(videoRender.requestedAt)}`
                      : "Aucun rendu lance pour ce brouillon."}
                    {videoRender?.durationSeconds
                      ? ` · Duree: ${formatDuration(videoRender.durationSeconds)}`
                      : ""}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void loadVideoRenderStatus(selectedDraftId)}
                  className="rounded-md border border-[#1D2A44] bg-[#08111A] px-3 py-2 text-xs font-semibold text-[#A7B0C0] transition hover:border-[#39E6D0]/50 hover:text-[#F8FAFC]"
                >
                  {isLoadingRenderStatus ? "Actualisation..." : "Actualiser le statut"}
                </button>
              </div>
            </div>
          ) : null}

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
        </SectionContainer>

        {selectedDraft ? (
          <SectionContainer>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#39E6D0]">
                  Brouillon selectionne
                </p>
                <h3 className="mt-2 text-xl font-semibold text-[#F8FAFC]">
                  {selectedDraft.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-[#A7B0C0]">
                  {videoPreparationReady
                    ? "Preparation video terminee."
                    : videoBlockingReasons.length === 0
                      ? "Pret a preparer la video."
                      : "Elements manquants."}
                </p>
              </div>
              <span className="rounded-md border border-[#1D2A44] bg-[#03070B] px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#A7B0C0]">
                {statusLabels[selectedDraft.status] ?? selectedDraft.status}
              </span>
            </div>

            <div className="mt-5 grid gap-2">
              {videoChecklist.map((item) => (
                <p
                  key={item.label}
                  className="flex min-w-0 items-center justify-between gap-3 rounded-md border border-[#1D2A44] bg-[#03070B] px-4 py-2.5 text-sm"
                >
                  <span className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap font-semibold text-[#F8FAFC]">
                    {item.label}
                  </span>
                  <span className={`shrink-0 text-right font-semibold ${item.ok ? "text-[#86EFAC]" : "text-[#FDBA74]"}`}>
                    {item.value}
                  </span>
                </p>
              ))}
            </div>

            <div className="mt-5 rounded-md border border-[#1D2A44] bg-[#03070B] p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-sm font-semibold text-[#F8FAFC]">Cout de cette video</p>
                  <p className="mt-1 text-xs leading-5 text-[#A7B0C0]">
                    Estimation de production. Les montants reels seront distingues lorsqu&apos;une reconciliation fournisseur sera disponible.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => selectedDraftId ? void loadDraftCosts(selectedDraftId) : undefined}
                  className="rounded-md border border-[#1D2A44] bg-[#08111A] px-3 py-2 text-xs font-semibold text-[#A7B0C0] transition hover:border-[#39E6D0]/50 hover:text-[#F8FAFC]"
                >
                  Actualiser les couts
                </button>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {videoCostDetails(costs).map((detail) => (
                  <div
                    key={detail.category}
                    className="rounded-md border border-[#1D2A44] bg-[#08111A] px-4 py-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="min-w-0 text-sm font-semibold text-[#F8FAFC]">
                        {detail.label}
                      </p>
                      <p className="shrink-0 text-right text-base font-semibold text-[#39E6D0]">
                        {formatCost(detail.estimatedCostEur)}
                      </p>
                    </div>
                    <p className="mt-2 text-xs leading-5 text-[#A7B0C0]">
                      Deja engage : <span className="font-semibold text-[#F8FAFC]">{formatCost(detail.recordedCostEur)}</span>
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <div className="rounded-md border border-[#22C55E]/30 bg-[#22C55E]/10 px-3 py-2">
                  <p className="text-xs text-[#A7B0C0]">Deja engage</p>
                  <p className="mt-1 text-lg font-semibold text-[#86EFAC]">{formatCost(costs?.alreadyRecordedEur ?? null)}</p>
                </div>
                <div className="rounded-md border border-[#F59E0B]/30 bg-[#F59E0B]/10 px-3 py-2">
                  <p className="text-xs text-[#A7B0C0]">Restant estime</p>
                  <p className="mt-1 text-lg font-semibold text-[#FBBF24]">{formatCost(costs?.remainingEstimatedEur ?? null)}</p>
                </div>
                <div className="rounded-md border border-[#39E6D0]/35 bg-[#39E6D0]/10 px-3 py-2">
                  <p className="text-xs text-[#A7B0C0]">Total estime</p>
                  <p className="mt-1 text-lg font-semibold text-[#39E6D0]">{formatCost(costs?.totalEstimatedEur ?? null)}</p>
                </div>
              </div>
            </div>

            {videoBlockingReasons.length > 0 ? (
              <div className="mt-4 rounded-md border border-[#F97316]/35 bg-[#F97316]/10 px-4 py-3 text-sm text-[#FDBA74]">
                <p className="font-semibold">Preparation bloquee</p>
                <p className="mt-1 leading-6">
                  {videoBlockingReasons.join(" ")}
                </p>
              </div>
            ) : null}

            {videoPreparation?.manifestUrl ? (
              <div className="mt-4 rounded-md border border-[#1D2A44] bg-[#03070B] px-4 py-3 text-sm text-[#A7B0C0]">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <p>
                    Manifest:{" "}
                    <a
                      href={videoPreparation.manifestUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="font-semibold text-[#39E6D0] hover:text-[#F8FAFC]"
                    >
                      Voir le manifest
                    </a>
                    {videoPreparation.preparedAt ? (
                      <span className="ml-2 text-[#64748B]">
                        {formatDate(videoPreparation.preparedAt)}
                      </span>
                    ) : null}
                  </p>
                  <button
                    type="button"
                    disabled={!canRegenerateManifest}
                    onClick={() => void runVideoPreparationAction({ force: true })}
                    className="rounded-md border border-[#1D2A44] bg-[#08111A] px-3 py-2 text-xs font-semibold text-[#A7B0C0] transition hover:border-[#39E6D0]/50 hover:text-[#F8FAFC] disabled:cursor-not-allowed disabled:opacity-55"
                  >
                    {isPreparingVideo ? "Regeneration..." : "Regenerer le manifest"}
                  </button>
                </div>
                {manifestRegenerationDisabledReason ? (
                  <p className="mt-2 text-xs font-semibold text-[#FDBA74]">
                    {manifestRegenerationDisabledReason}
                  </p>
                ) : renderIsCompleted ? (
                  <p className="mt-2 text-xs text-[#64748B]">
                    Regenerer le manifest conserve la video existante; un nouveau rendu sera necessaire.
                  </p>
                ) : null}
              </div>
            ) : null}

            {renderIsFailed && videoRender?.errorMessage ? (
              <div className="mt-4 rounded-md border border-[#F97316]/35 bg-[#F97316]/10 px-4 py-3 text-sm text-[#FDBA74]">
                <p className="font-semibold">Echec du rendu</p>
                <p className="mt-1 leading-6">{videoRender.errorMessage}</p>
              </div>
            ) : null}

            {videoRender?.status === "completed" && !videoRender.outputUrl ? (
              <div className="mt-4 rounded-md border border-[#F97316]/35 bg-[#F97316]/10 px-4 py-3 text-sm text-[#FDBA74]">
                <p className="font-semibold">Video finale indisponible</p>
                <p className="mt-1 leading-6">
                  Le job est termine, mais l&apos;URL de sortie est absente. Actualise le statut ou relance le rendu.
                </p>
              </div>
            ) : null}

            {renderIsCompleted && videoRender?.outputUrl ? (
              <div className="mt-5 space-y-4">
                <video
                  controls
                  src={videoRender.outputUrl}
                  className="aspect-[9/16] max-h-[720px] w-full rounded-md border border-[#1D2A44] bg-black object-contain"
                />
                <div className="flex flex-col gap-3 rounded-md border border-[#1D2A44] bg-[#03070B] px-4 py-3 text-sm text-[#A7B0C0] lg:flex-row lg:items-center lg:justify-between">
                  <span>
                    {videoRender.renderedAt ? formatDate(videoRender.renderedAt) : "Date inconnue"}
                    {videoRender.durationSeconds ? ` · ${formatDuration(videoRender.durationSeconds)}` : ""}
                  </span>
                  <a
                    href={videoRender.outputUrl}
                    download
                    className="font-semibold text-[#39E6D0] hover:text-[#F8FAFC]"
                  >
                    Telecharger la video
                  </a>
                </div>
                {videoIsValidated ? (
                  <div className="rounded-md border border-[#22C55E]/35 bg-[#22C55E]/10 px-4 py-3 text-sm text-[#86EFAC]">
                    <p className="font-semibold">Video validee</p>
                    <p className="mt-1 text-[#A7B0C0]">
                      {videoRender.videoValidatedAt
                        ? `Validation: ${formatDate(videoRender.videoValidatedAt)}`
                        : "La video est consideree comme prete pour la publication."}
                    </p>
                  </div>
                ) : null}
                {confirmValidateVideo ? (
                  <div className="rounded-md border border-[#39E6D0]/35 bg-[#39E6D0]/10 px-4 py-3 text-sm text-[#A7B0C0]">
                    <p className="font-semibold text-[#F8FAFC]">Valider cette video ?</p>
                    <p className="mt-1 leading-6">
                      La video sera consideree comme prete pour la publication.
                    </p>
                    <div className="mt-3 flex flex-wrap gap-3">
                      <button
                        type="button"
                        disabled={isRenderingVideo}
                        onClick={() => setConfirmValidateVideo(false)}
                        className="rounded-md border border-[#1D2A44] bg-[#03070B] px-3 py-2 text-xs font-semibold text-[#A7B0C0] transition hover:border-[#F97316]/50 hover:text-[#FDBA74] disabled:cursor-not-allowed disabled:opacity-55"
                      >
                        Annuler
                      </button>
                      <button
                        type="button"
                        disabled={!canValidateVideo}
                        onClick={() => void runVideoValidationAction()}
                        className="rounded-md border border-[#39E6D0]/50 bg-[#39E6D0]/10 px-3 py-2 text-xs font-semibold text-[#39E6D0] transition hover:bg-[#1D2A44] hover:text-[#F8FAFC] disabled:cursor-not-allowed disabled:opacity-55"
                      >
                        {isRenderingVideo ? "Validation..." : "Valider la video"}
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}

            {confirmRegenerate ? (
              <div className="mt-4 rounded-md border border-[#F97316]/35 bg-[#F97316]/10 px-4 py-3 text-sm text-[#FDBA74]">
                <p className="font-semibold">Regenerer la video ?</p>
                <p className="mt-1 leading-6">
                  Regenerer la video necessitera une nouvelle validation.
                </p>
                <button
                  type="button"
                  disabled={isRenderingVideo}
                  onClick={() => setConfirmRegenerate(false)}
                  className="mt-3 rounded-md border border-[#1D2A44] bg-[#03070B] px-3 py-2 text-xs font-semibold text-[#A7B0C0] transition hover:border-[#F97316]/50 hover:text-[#FDBA74] disabled:cursor-not-allowed disabled:opacity-55"
                >
                  Annuler
                </button>
              </div>
            ) : null}

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                disabled={!canPrepareVideo}
                onClick={() => void runVideoPreparationAction()}
                className="rounded-md border border-[#39E6D0]/50 bg-[#39E6D0]/10 px-4 py-2.5 text-sm font-semibold text-[#39E6D0] transition hover:bg-[#1D2A44] hover:text-[#F8FAFC] disabled:cursor-not-allowed disabled:opacity-55"
              >
                {isPreparingVideo
                  ? "Preparation..."
                  : videoPreparationReady
                    ? "Preparation video terminee"
                  : "Preparer la video"}
              </button>
              {videoPreparationReady && !renderIsCompleted ? (
                <button
                  type="button"
                  disabled={!canGenerateVideo}
                  onClick={() => void runVideoRenderAction(renderIsFailed ? "retry" : "start")}
                  className="rounded-md border border-[#39E6D0]/50 bg-[#39E6D0]/10 px-4 py-2.5 text-sm font-semibold text-[#39E6D0] transition hover:bg-[#1D2A44] hover:text-[#F8FAFC] disabled:cursor-not-allowed disabled:opacity-55"
                >
                  {isRenderingVideo
                    ? "Envoi au renderer..."
                    : renderIsFailed
                      ? "Reessayer le rendu"
                      : "Generer la video"}
                </button>
              ) : null}
              {renderIsActive ? (
                <button
                  type="button"
                  disabled={isRenderingVideo}
                  onClick={() => void runVideoRenderAction("cancel")}
                  className="rounded-md border border-[#1D2A44] bg-[#03070B] px-4 py-2.5 text-sm font-semibold text-[#A7B0C0] transition hover:border-[#F97316]/50 hover:text-[#FDBA74] disabled:cursor-not-allowed disabled:opacity-55"
                >
                  Annuler le job
                </button>
              ) : null}
              {renderIsCompleted ? (
                <>
                {!videoIsValidated ? (
                  <button
                    type="button"
                    disabled={!canValidateVideo}
                    onClick={() => void runVideoValidationAction()}
                    className="rounded-md border border-[#39E6D0]/50 bg-[#39E6D0]/10 px-4 py-2.5 text-sm font-semibold text-[#39E6D0] transition hover:bg-[#1D2A44] hover:text-[#F8FAFC] disabled:cursor-not-allowed disabled:opacity-55"
                  >
                    Valider la video
                  </button>
                ) : null}
                <button
                  type="button"
                  disabled={!canGenerateVideo}
                  onClick={() => void runVideoRenderAction("regenerate")}
                  className="rounded-md border border-[#1D2A44] bg-[#03070B] px-4 py-2.5 text-sm font-semibold text-[#A7B0C0] transition hover:border-[#39E6D0]/50 hover:text-[#F8FAFC] disabled:cursor-not-allowed disabled:opacity-55"
                >
                  {confirmRegenerate
                    ? "Confirmer la regeneration"
                    : isRenderingVideo
                      ? "Envoi au renderer..."
                      : "Regenerer la video"}
                </button>
                </>
              ) : null}
            </div>
          </SectionContainer>
        ) : null}
      </div>
    </div>
  );
}
