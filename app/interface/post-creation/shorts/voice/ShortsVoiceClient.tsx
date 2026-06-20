"use client";

import { useEffect, useMemo, useState } from "react";
import { SectionContainer } from "@/components/cockpit/SectionContainer";
import { ShortWorkflowStatus } from "@/components/cockpit/ShortWorkflowStatus";
import { getShortWorkflowState } from "@/lib/short-workflow";
import {
  DEFAULT_SUBTITLE_MODE,
  normalizeSubtitleMode,
  subtitleModeLabel,
  type SubtitleMode,
} from "@/lib/subtitles";

type ContentDraft = {
  id: string;
  createdAt: string;
  title: string;
  theme: string;
  status: string;
  script: string;
  voiceStyle: string;
  score: {
    total: number;
  };
};

type DraftVoiceState = {
  audioUrl: string | null;
  canGenerate: boolean;
  configurationAvailable: boolean;
  costEstimateUsd: number;
  durationEstimateSeconds: number;
  errorMessage: string | null;
  generatedAt: string | null;
  hasValidatedText: boolean;
  selectedVoiceId: string | null;
  selectedVoiceLabel: string;
  status: "not_ready" | "pending" | "generating" | "ready" | "validated" | "error";
  validatedAt: string | null;
  validatedBy: string | null;
  wordCount: number;
};

type SubtitleSegmentPreview = {
  end: number;
  start: number;
  text: string;
};

type DraftSubtitleState = {
  canGenerate: boolean;
  durationSeconds: number;
  errorMessage: string | null;
  generatedAt: string | null;
  jsonUrl: string | null;
  localMode: "karaoke" | "srt";
  mode: SubtitleMode;
  previewSegments: SubtitleSegmentPreview[];
  provider: "elevenlabs";
  segmentsCount: number;
  srtUrl: string | null;
  status: "pending" | "generating" | "ready" | "validated" | "ignored" | "error";
  timingOffsetMs: number;
  validatedAt: string | null;
  validatedBy: string | null;
  vttUrl: string | null;
};

type MediaPayload = {
  media?: {
    mediaPipelineStatus?: string;
    selectedAssets?: unknown[];
    subtitles?: DraftSubtitleState;
    visualScenes?: Array<{
      generationStatus?: string | null;
      imageUrl?: string | null;
      locked?: boolean | null;
    }>;
    voice: DraftVoiceState;
  };
  error?: string;
};

const statusLabels: Record<string, string> = {
  approved: "Texte valide",
  draft: "Brouillon texte",
  rejected: "Rejete",
  ready_to_publish: "Pret a publier",
  validated: "Texte valide",
  visual_ready: "Visuels prets",
  visuels_prets: "Visuels prets",
  voix_en_attente: "Voix en attente",
  voix_en_cours: "Voix en cours",
  voix_erreur: "Erreur voix",
  voix_prete: "Voix prete",
  "voix_prÃªte": "Voix prete",
  "voix_validÃ©e": "Voix validee",
  voix_validee: "Voix validee",
  sous_titres_en_attente: "Sous-titres en attente",
  sous_titres_en_cours: "Sous-titres en cours",
  sous_titres_prets: "Sous-titres prets",
  sous_titres_ignores: "Sous-titres ignores",
  sous_titres_erreur: "Erreur sous-titres",
  video_en_attente: "Video en attente",
  voice_ready: "Voix prete",
};

const voiceStatusLabels: Record<DraftVoiceState["status"], string> = {
  error: "Erreur voix",
  generating: "Generation en cours",
  not_ready: "Texte valide requis",
  pending: "Voix en attente",
  ready: "Voix prete",
  validated: "Voix validee",
};

const subtitleStatusLabels: Record<DraftSubtitleState["status"], string> = {
  error: "Erreur",
  generating: "Generation en cours",
  ignored: "Ignores",
  pending: "A generer",
  ready: "Prets a valider",
  validated: "Sous-titres valides",
};

const subtitleStyleOptions: Array<{
  badge?: string;
  description: string;
  mode: SubtitleMode;
  syncLabel: string;
  title: string;
}> = [
  {
    badge: "Recommand\u00e9",
    description: "Mot actif synchronis\u00e9 avec la voix",
    mode: "karaoke",
    syncLabel: "Synchronisation mot \u00e0 mot",
    title: "Karaok\u00e9",
  },
  {
    description: "Sous-titres sobres par lignes",
    mode: "classic",
    syncLabel: "Texte par lignes",
    title: "Classique",
  },
];

function scoreOutOf100(value: number) {
  return Math.round(Math.max(0, Math.min(100, value <= 10 ? value * 10 : value)));
}

function formatDate(value: string | null) {
  if (!value) {
    return "Aucune generation";
  }

  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
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

function formatSubtitleAudioDuration(subtitles: DraftSubtitleState | null, voice: DraftVoiceState | null) {
  if (subtitles && subtitles.durationSeconds > 0) {
    return formatDuration(subtitles.durationSeconds);
  }

  if (voice?.audioUrl) {
    return "Duree en cours de verification";
  }

  return "0s";
}

function generationBlockedReason(voice: DraftVoiceState | null) {
  if (!voice) {
    return "Selectionne un brouillon pour charger son etat voix.";
  }

  if (!voice.configurationAvailable) {
    return "Configuration ElevenLabs indisponible.";
  }

  if (!voice.hasValidatedText) {
    return "Le bouton sera disponible quand le brouillon aura un texte valide.";
  }

  if (voice.status === "generating") {
    return "Une generation est deja en cours pour ce brouillon.";
  }

  return null;
}

export function ShortsVoiceClient() {
  const [drafts, setDrafts] = useState<ContentDraft[]>([]);
  const [selectedDraftId, setSelectedDraftId] = useState("");
  const [media, setMedia] = useState<MediaPayload["media"] | null>(null);
  const [voice, setVoice] = useState<DraftVoiceState | null>(null);
  const [isLoadingDrafts, setIsLoadingDrafts] = useState(false);
  const [isLoadingVoice, setIsLoadingVoice] = useState(false);
  const [activeAction, setActiveAction] = useState<
    | "generate_voice"
    | "regenerate_voice"
    | "validate_voice"
    | "unlock_voice"
    | "generate_subtitles"
    | "regenerate_subtitles"
    | "validate_subtitles"
    | "ignore_subtitles"
    | null
  >(null);
  const [confirmationAction, setConfirmationAction] = useState<"generate_voice" | "regenerate_voice" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [selectedSubtitleMode, setSelectedSubtitleMode] = useState<SubtitleMode>(DEFAULT_SUBTITLE_MODE);

  const selectedDraft = useMemo(
    () => drafts.find((draft) => draft.id === selectedDraftId) ?? null,
    [drafts, selectedDraftId],
  );
  const workflowState = useMemo(
    () =>
      getShortWorkflowState({
        draft: selectedDraft,
        media,
        requiredVisualCount: media?.visualScenes?.length ?? media?.selectedAssets?.length ?? 0,
      }),
    [media, selectedDraft],
  );
  const isGenerating = Boolean(activeAction) || voice?.status === "generating";
  const voiceIsValidated = voice?.status === "validated" || workflowState.voice === "validated";
  const voiceIsReadyForValidation = voice?.status === "ready" && !voiceIsValidated;
  const subtitles = media?.subtitles ?? null;
  const generatedSubtitleMode = normalizeSubtitleMode(subtitles?.mode);
  const subtitleStyleChanged = selectedSubtitleMode !== generatedSubtitleMode;
  const subtitlesBusy = activeAction === "generate_subtitles" ||
    activeAction === "regenerate_subtitles" ||
    activeAction === "validate_subtitles" ||
    subtitles?.status === "generating";
  const canGenerateSubtitles = Boolean(voice?.audioUrl && subtitles?.canGenerate && !subtitlesBusy);
  const canCreateFirstSubtitles = Boolean(canGenerateSubtitles && !subtitles?.jsonUrl);
  const subtitlesAreReadyToValidate = Boolean(
    subtitles?.status === "ready" &&
      subtitles.jsonUrl &&
      subtitles.srtUrl &&
      subtitles.vttUrl,
  );
  const subtitlesAreValidated = subtitles?.status === "validated";
  const canValidateSubtitles = Boolean(subtitlesAreReadyToValidate && !subtitlesBusy);
  const subtitleBlockedReason = canGenerateSubtitles
    ? null
    : "Valide une voix avant de generer les sous-titres.";
  const subtitleValidationBlockedReason = subtitlesAreReadyToValidate || subtitlesAreValidated
    ? null
    : "Genere les sous-titres avant de les valider.";
  const blockedReason = voiceIsValidated ? null : generationBlockedReason(voice);

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

  async function loadVoice(draftId: string) {
    if (!draftId) {
      setMedia(null);
      setVoice(null);
      return;
    }

    setIsLoadingVoice(true);
    setError(null);

    try {
      const response = await fetch(`/api/content-workshop/drafts/${draftId}/media`);
      const payload = (await response.json()) as MediaPayload;

      if (!response.ok || !payload.media?.voice) {
        throw new Error(payload.error ?? "Lecture de la voix indisponible.");
      }

      setMedia(payload.media);
      setVoice(payload.media.voice);
      setSelectedSubtitleMode(normalizeSubtitleMode(payload.media.subtitles?.mode));
    } catch (caughtError) {
      setMedia(null);
      setVoice(null);
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Lecture de la voix indisponible.",
      );
    } finally {
      setIsLoadingVoice(false);
    }
  }

  async function runVoiceAction(action: "generate_voice" | "regenerate_voice") {
    if (!selectedDraft || isGenerating) {
      return;
    }

    setActiveAction(action);
    setConfirmationAction(null);
    setError(null);
    setNotice(null);

    try {
      const response = await fetch(`/api/content-workshop/drafts/${selectedDraft.id}/media`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action }),
      });
      const payload = (await response.json()) as MediaPayload;

      if (!response.ok || !payload.media?.voice) {
        throw new Error(payload.error ?? "Generation voix indisponible.");
      }

      setMedia(payload.media);
      setVoice(payload.media.voice);
      setSelectedSubtitleMode(normalizeSubtitleMode(payload.media.subtitles?.mode));
      await loadDrafts();
      setNotice(action === "regenerate_voice" ? "Voix regeneree." : "Voix generee.");
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Generation voix indisponible.",
      );
      if (selectedDraft) {
        await loadVoice(selectedDraft.id);
      }
    } finally {
      setActiveAction(null);
    }
  }

  async function runVoiceValidationAction(action: "validate_voice" | "unlock_voice") {
    if (!selectedDraft || activeAction) {
      return;
    }

    const confirmed = window.confirm(
      action === "validate_voice"
        ? "Valider cette voix pour ce Short ?"
        : "Modifier la voix ? La video sera de nouveau bloquee jusqu'a validation.",
    );

    if (!confirmed) {
      return;
    }

    setActiveAction(action);
    setError(null);
    setNotice(null);

    try {
      const response = await fetch(`/api/content-workshop/drafts/${selectedDraft.id}/media`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action }),
      });
      const payload = (await response.json()) as MediaPayload;

      if (!response.ok || !payload.media?.voice) {
        throw new Error(payload.error ?? "Validation voix indisponible.");
      }

      setMedia(payload.media);
      setVoice(payload.media.voice);
      setSelectedSubtitleMode(normalizeSubtitleMode(payload.media.subtitles?.mode));
      await loadDrafts();
      setNotice(
        action === "validate_voice"
          ? "Voix validee - prete pour la video."
          : "Voix deverrouillee. La video est de nouveau bloquee.",
      );
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Validation voix indisponible.",
      );
      await loadVoice(selectedDraft.id);
    } finally {
      setActiveAction(null);
    }
  }

  async function runSubtitleAction(
    action: "generate_subtitles" | "regenerate_subtitles" | "validate_subtitles" | "ignore_subtitles",
  ) {
    if (!selectedDraft || activeAction) {
      return;
    }

    const confirmed = window.confirm(
      action === "ignore_subtitles"
        ? "Ignorer les sous-titres pour ce Short ?"
        : action === "validate_subtitles"
          ? "Valider ces sous-titres pour ce Short ?"
        : action === "regenerate_subtitles"
          ? subtitlesAreValidated
            ? "Regenerer les sous-titres necessitera une nouvelle validation."
            : "Regenerer les sous-titres avec ElevenLabs ?"
          : "Generer les sous-titres avec ElevenLabs ?",
    );

    if (!confirmed) {
      return;
    }

    setActiveAction(action);
    setError(null);
    setNotice(null);

    try {
      const response = await fetch(`/api/content-workshop/drafts/${selectedDraft.id}/media`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action,
          mode: action === "generate_subtitles" || action === "regenerate_subtitles"
            ? selectedSubtitleMode
            : undefined,
        }),
      });
      const payload = (await response.json()) as MediaPayload;

      if (!response.ok || !payload.media?.voice) {
        throw new Error(payload.error ?? "Action sous-titres indisponible.");
      }

      setMedia(payload.media);
      setVoice(payload.media.voice);
      setSelectedSubtitleMode(normalizeSubtitleMode(payload.media.subtitles?.mode));
      await loadDrafts();
      setNotice(
        action === "ignore_subtitles"
          ? "Sous-titres ignores."
          : action === "validate_subtitles"
            ? "Sous-titres valides."
            : "Sous-titres prets a valider.",
      );
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Action sous-titres indisponible.",
      );
      await loadVoice(selectedDraft.id);
    } finally {
      setActiveAction(null);
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
      void loadVoice(selectedDraftId);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [selectedDraftId]);

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
              onChange={(event) => {
                setConfirmationAction(null);
                setSelectedDraftId(event.target.value);
              }}
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
                Voix par brouillon
              </p>
              <h2 className="mt-3 text-2xl font-semibold text-[#F8FAFC]">
                Carte voix ElevenLabs
              </h2>
            </div>
            <span className="rounded-md border border-[#1D2A44] bg-[#03070B] px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#A7B0C0]">
              {isLoadingVoice ? "Chargement" : voice ? voiceStatusLabels[voice.status] : "Non chargee"}
            </span>
          </div>

          {error ? (
            <p className="mt-5 rounded-md border border-[#F97316]/40 bg-[#F97316]/10 px-4 py-3 text-sm font-semibold text-[#FDBA74]">
              {error.includes("ElevenLabs") ? "Configuration ElevenLabs indisponible." : error}
            </p>
          ) : null}

          {voice?.errorMessage ? (
            <p className="mt-5 rounded-md border border-[#F97316]/40 bg-[#F97316]/10 px-4 py-3 text-sm font-semibold text-[#FDBA74]">
              {voice.errorMessage.includes("ElevenLabs")
                ? "Configuration ElevenLabs indisponible."
                : voice.errorMessage}
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
                  {selectedDraft.theme}
                </p>
              </div>
              <span className="rounded-md border border-[#1D2A44] bg-[#03070B] px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#A7B0C0]">
                {statusLabels[selectedDraft.status] ?? selectedDraft.status}
              </span>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-4">
              <p className="rounded-md border border-[#1D2A44] bg-[#08111A] px-4 py-3 text-sm text-[#A7B0C0]">
                Statut:{" "}
                <span className="font-semibold text-[#F8FAFC]">
                  {voice ? voiceStatusLabels[voice.status] : "Non charge"}
                </span>
              </p>
              <p className="rounded-md border border-[#1D2A44] bg-[#08111A] px-4 py-3 text-sm text-[#A7B0C0]">
                Mots:{" "}
                <span className="font-semibold text-[#F8FAFC]">
                  {voice?.wordCount ?? 0}
                </span>
              </p>
              <p className="rounded-md border border-[#1D2A44] bg-[#08111A] px-4 py-3 text-sm text-[#A7B0C0]">
                Duree estimee:{" "}
                <span className="font-semibold text-[#F8FAFC]">
                  {formatDuration(voice?.durationEstimateSeconds ?? 0)}
                </span>
              </p>
              <p className="rounded-md border border-[#1D2A44] bg-[#08111A] px-4 py-3 text-sm text-[#A7B0C0]">
                Cout estime:{" "}
                <span className="font-semibold text-[#F8FAFC]">
                  ${(voice?.costEstimateUsd ?? 0).toFixed(2)}
                </span>
              </p>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-3">
              <p className="rounded-md border border-[#1D2A44] bg-[#08111A] px-4 py-3 text-sm text-[#A7B0C0]">
                Cree le:{" "}
                <span className="font-semibold text-[#F8FAFC]">
                  {formatDate(selectedDraft.createdAt)}
                </span>
              </p>
              <p className="rounded-md border border-[#1D2A44] bg-[#08111A] px-4 py-3 text-sm text-[#A7B0C0]">
                Generation:{" "}
                <span className="font-semibold text-[#F8FAFC]">
                  {formatDate(voice?.generatedAt ?? null)}
                </span>
              </p>
              <p className="rounded-md border border-[#1D2A44] bg-[#08111A] px-4 py-3 text-sm text-[#A7B0C0]">
                Voix:{" "}
                <span className="font-semibold text-[#F8FAFC]">
                  {voiceIsValidated ? "Voix validee" : voiceIsReadyForValidation ? "Voix prete" : voice?.selectedVoiceLabel ?? "Non configuree"}
                </span>
              </p>
            </div>

            <div className="mt-5 rounded-md border border-[#1D2A44] bg-[#08111A] p-4">
              <p className="text-sm font-semibold text-[#F8FAFC]">Style voix prevu</p>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#A7B0C0]">
                {selectedDraft.voiceStyle || "Aucun style voix renseigne."}
              </p>
            </div>

            {voice?.audioUrl ? (
              <div className="mt-5 rounded-md border border-[#1D2A44] bg-[#08111A] p-4">
                <p className="text-sm font-semibold text-[#F8FAFC]">Audio disponible</p>
                <audio className="mt-3 w-full" controls src={voice.audioUrl}>
                  <a href={voice.audioUrl}>Ecouter l&apos;audio</a>
                </audio>
                <div className="mt-4 flex flex-wrap gap-2">
                  <a
                    href={voice.audioUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-md border border-[#1D2A44] bg-[#03070B] px-4 py-2.5 text-sm font-semibold text-[#F8FAFC] transition hover:border-[#39E6D0]/50"
                  >
                    Ecouter l&apos;audio
                  </a>
                  <a
                    href={voice.audioUrl}
                    download
                    className="rounded-md border border-[#1D2A44] bg-[#03070B] px-4 py-2.5 text-sm font-semibold text-[#F8FAFC] transition hover:border-[#39E6D0]/50"
                  >
                    Telecharger l&apos;audio
                  </a>
                </div>
              </div>
            ) : null}

            <div className="mt-5 rounded-md border border-[#1D2A44] bg-[#08111A] p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-sm font-semibold text-[#F8FAFC]">Sous-titres</p>
                  <p className="mt-1 text-sm text-[#A7B0C0]">
                    {subtitleModeLabel(generatedSubtitleMode)} - ElevenLabs
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {subtitlesAreValidated ? (
                    <span className="rounded-md border border-[#22C55E]/45 bg-[#22C55E]/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#86EFAC]">
                      Sous-titres valides
                    </span>
                  ) : null}
                  <span className="rounded-md border border-[#1D2A44] bg-[#03070B] px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#A7B0C0]">
                    {subtitles ? subtitleStatusLabels[subtitles.status] : "Non charges"}
                  </span>
                </div>
              </div>

              <div className="mt-5">
                <p className="text-sm font-semibold text-[#F8FAFC]">Style de sous-titres</p>
                {subtitles?.jsonUrl ? (
                  <p className="mt-1 text-xs text-[#A7B0C0]">
                    Style genere : <span className="font-semibold text-[#F8FAFC]">{subtitleModeLabel(generatedSubtitleMode)}</span>
                  </p>
                ) : null}
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  {subtitleStyleOptions.map((option) => {
                    const selected = selectedSubtitleMode === option.mode;

                    return (
                      <button
                        key={option.mode}
                        type="button"
                        disabled={subtitlesBusy}
                        onClick={() => setSelectedSubtitleMode(option.mode)}
                        className={`min-w-0 rounded-md border p-3 text-left transition disabled:cursor-not-allowed disabled:opacity-60 ${
                          selected
                            ? "border-[#39E6D0]/70 bg-[#39E6D0]/10"
                            : "border-[#1D2A44] bg-[#03070B] hover:border-[#39E6D0]/40"
                        }`}
                      >
                        <span className="flex min-w-0 items-start justify-between gap-2">
                          <span className="min-w-0">
                            <span className="block overflow-hidden text-ellipsis whitespace-nowrap text-sm font-semibold text-[#F8FAFC]">
                              {option.title}
                            </span>
                            <span className="mt-1 block overflow-hidden text-ellipsis whitespace-nowrap text-xs text-[#A7B0C0]">
                              {option.description}
                            </span>
                          </span>
                          {option.badge ? (
                            <span className="shrink-0 rounded border border-[#39E6D0]/50 bg-[#39E6D0]/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#39E6D0]">
                              {option.badge}
                            </span>
                          ) : null}
                        </span>
                        <span className="mt-3 block rounded-md border border-[#1D2A44] bg-[#050B12] p-2">
                          <span className="relative block aspect-[9/16] max-h-36 overflow-hidden rounded border border-[#1D2A44] bg-[#02060A]">
                            <span className="absolute inset-x-2 bottom-5 block text-center text-[10px] font-semibold leading-4 text-[#F8FAFC] [text-shadow:0_1px_2px_#000]">
                              {option.mode === "karaoke" ? (
                                <>
                                  Tu n&apos;as pas besoin de tout{" "}
                                  <span className="text-[#39E6D0]">comprendre</span>{" "}
                                  maintenant.
                                </>
                              ) : (
                                <>
                                  Tu n&apos;as pas besoin de tout comprendre
                                  <br />
                                  maintenant.
                                </>
                              )}
                            </span>
                          </span>
                          <span className="mt-2 block overflow-hidden text-ellipsis whitespace-nowrap text-center text-[11px] font-semibold text-[#A7B0C0]">
                            {option.syncLabel}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
                {subtitleStyleChanged ? (
                  <p className="mt-3 rounded-md border border-[#1D2A44] bg-[#03070B] px-4 py-3 text-sm text-[#A7B0C0]">
                    Le nouveau style sera applique lors de la prochaine generation.
                  </p>
                ) : null}
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-4">
                <p className="rounded-md border border-[#1D2A44] bg-[#03070B] px-4 py-3 text-sm text-[#A7B0C0]">
                  Mode: <span className="font-semibold text-[#F8FAFC]">{subtitleModeLabel(generatedSubtitleMode)}</span>
                </p>
                <p className="rounded-md border border-[#1D2A44] bg-[#03070B] px-4 py-3 text-sm text-[#A7B0C0]">
                  Duree audio:{" "}
                  <span className="font-semibold text-[#F8FAFC]">
                    {formatSubtitleAudioDuration(subtitles, voice)}
                  </span>
                </p>
                <p className="rounded-md border border-[#1D2A44] bg-[#03070B] px-4 py-3 text-sm text-[#A7B0C0]">
                  Segments:{" "}
                  <span className="font-semibold text-[#F8FAFC]">
                    {subtitles?.segmentsCount ?? 0}
                  </span>
                </p>
                <p className="rounded-md border border-[#1D2A44] bg-[#03070B] px-4 py-3 text-sm text-[#A7B0C0]">
                  Generation:{" "}
                  <span className="font-semibold text-[#F8FAFC]">
                    {formatDate(subtitles?.generatedAt ?? null)}
                  </span>
                </p>
              </div>

              {subtitles?.errorMessage ? (
                <p className="mt-4 rounded-md border border-[#F97316]/40 bg-[#F97316]/10 px-4 py-3 text-sm font-semibold text-[#FDBA74]">
                  {subtitles.errorMessage.includes("ElevenLabs")
                    ? "Configuration ElevenLabs indisponible."
                    : subtitles.errorMessage}
                </p>
              ) : null}

              {subtitleBlockedReason ? (
                <p className="mt-4 rounded-md border border-[#1D2A44] bg-[#03070B] px-4 py-3 text-sm text-[#A7B0C0]">
                  {subtitleBlockedReason}
                </p>
              ) : null}
              {subtitleValidationBlockedReason ? (
                <p className="mt-3 rounded-md border border-[#1D2A44] bg-[#03070B] px-4 py-3 text-sm text-[#A7B0C0]">
                  {subtitleValidationBlockedReason}
                </p>
              ) : null}

              {subtitles?.previewSegments?.length ? (
                <details className="mt-4 rounded-md border border-[#1D2A44] bg-[#03070B] p-3">
                  <summary className="cursor-pointer text-sm font-semibold text-[#A7B0C0]">
                    Apercu des lignes et timings
                  </summary>
                  <div className="mt-3 grid gap-2 text-xs text-[#A7B0C0]">
                    {subtitles.previewSegments.map((segment, index) => (
                      <p
                        key={`${segment.start}-${index}`}
                        className="rounded-md border border-[#1D2A44] bg-[#08111A] px-3 py-2 leading-5"
                      >
                        <span className="font-semibold text-[#F8FAFC]">
                          {formatDuration(segment.start)} - {formatDuration(segment.end)}
                        </span>{" "}
                        {segment.text}
                      </p>
                    ))}
                  </div>
                </details>
              ) : null}

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={!canCreateFirstSubtitles}
                  onClick={() => void runSubtitleAction("generate_subtitles")}
                  className="rounded-md border border-[#39E6D0]/50 bg-[#39E6D0]/10 px-4 py-2.5 text-sm font-semibold text-[#39E6D0] transition hover:bg-[#1D2A44] hover:text-[#F8FAFC] disabled:cursor-not-allowed disabled:opacity-55"
                >
                  {subtitlesBusy ? "Generation..." : "Generer les sous-titres"}
                </button>
                <button
                  type="button"
                  disabled={!canValidateSubtitles}
                  onClick={() => void runSubtitleAction("validate_subtitles")}
                  className="rounded-md border border-[#39E6D0]/50 bg-[#39E6D0]/10 px-4 py-2.5 text-sm font-semibold text-[#39E6D0] transition hover:bg-[#1D2A44] hover:text-[#F8FAFC] disabled:cursor-not-allowed disabled:opacity-55"
                >
                  {subtitlesAreValidated ? "Sous-titres valides" : "Valider les sous-titres"}
                </button>
                <button
                  type="button"
                  disabled={!canGenerateSubtitles || !subtitles?.jsonUrl}
                  onClick={() => void runSubtitleAction("regenerate_subtitles")}
                  className="rounded-md border border-[#7DD3FC]/45 bg-[#7DD3FC]/10 px-4 py-2.5 text-sm font-semibold text-[#7DD3FC] transition hover:bg-[#1D2A44] hover:text-[#F8FAFC] disabled:cursor-not-allowed disabled:opacity-55"
                >
                  Regenerer les sous-titres
                </button>
                <button
                  type="button"
                  disabled={!canGenerateSubtitles}
                  onClick={() => void runSubtitleAction("ignore_subtitles")}
                  className="rounded-md border border-[#1D2A44] bg-[#03070B] px-4 py-2.5 text-sm font-semibold text-[#A7B0C0] transition hover:border-[#F97316]/50 hover:text-[#FDBA74] disabled:cursor-not-allowed disabled:opacity-55"
                >
                  Ignorer les sous-titres
                </button>
                {subtitles?.jsonUrl ? (
                  <a
                    href={subtitles.jsonUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-md border border-[#1D2A44] bg-[#03070B] px-4 py-2.5 text-sm font-semibold text-[#F8FAFC] transition hover:border-[#39E6D0]/50"
                  >
                    Voir les sous-titres
                  </a>
                ) : null}
                {subtitles?.srtUrl ? (
                  <a
                    href={subtitles.srtUrl}
                    download
                    className="rounded-md border border-[#1D2A44] bg-[#03070B] px-4 py-2.5 text-sm font-semibold text-[#F8FAFC] transition hover:border-[#39E6D0]/50"
                  >
                    Telecharger SRT
                  </a>
                ) : null}
                {subtitles?.vttUrl ? (
                  <a
                    href={subtitles.vttUrl}
                    download
                    className="rounded-md border border-[#1D2A44] bg-[#03070B] px-4 py-2.5 text-sm font-semibold text-[#F8FAFC] transition hover:border-[#39E6D0]/50"
                  >
                    Telecharger VTT
                  </a>
                ) : null}
                {subtitles?.jsonUrl ? (
                  <a
                    href={subtitles.jsonUrl}
                    download
                    className="rounded-md border border-[#1D2A44] bg-[#03070B] px-4 py-2.5 text-sm font-semibold text-[#F8FAFC] transition hover:border-[#39E6D0]/50"
                  >
                    Telecharger JSON
                  </a>
                ) : null}
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              {voiceIsValidated ? (
                <button
                  type="button"
                  disabled={Boolean(activeAction)}
                  onClick={() => void runVoiceValidationAction("unlock_voice")}
                  className="rounded-md border border-[#7DD3FC]/45 bg-[#7DD3FC]/10 px-4 py-2.5 text-sm font-semibold text-[#7DD3FC] transition hover:bg-[#1D2A44] hover:text-[#F8FAFC] disabled:cursor-not-allowed disabled:opacity-55"
                >
                  Modifier la voix
                </button>
              ) : (
                <>
                  {!voice?.audioUrl ? (
                    <button
                      type="button"
                      disabled={Boolean(blockedReason) || isGenerating}
                      onClick={() => setConfirmationAction("generate_voice")}
                      className="rounded-md border border-[#39E6D0]/50 bg-[#39E6D0]/10 px-4 py-2.5 text-sm font-semibold text-[#39E6D0] transition hover:bg-[#1D2A44] hover:text-[#F8FAFC] disabled:cursor-not-allowed disabled:opacity-55"
                    >
                      {isGenerating ? "Generation..." : "Generer la voix"}
                    </button>
                  ) : null}
                  {voiceIsReadyForValidation ? (
                    <button
                      type="button"
                      disabled={Boolean(activeAction)}
                      onClick={() => void runVoiceValidationAction("validate_voice")}
                      className="rounded-md border border-[#39E6D0]/50 bg-[#39E6D0]/10 px-4 py-2.5 text-sm font-semibold text-[#39E6D0] transition hover:bg-[#1D2A44] hover:text-[#F8FAFC] disabled:cursor-not-allowed disabled:opacity-55"
                    >
                      Valider la voix
                    </button>
                  ) : null}
                  <button
                    type="button"
                    disabled={!voice?.audioUrl || Boolean(blockedReason) || isGenerating}
                    onClick={() => setConfirmationAction("regenerate_voice")}
                    className="rounded-md border border-[#7DD3FC]/45 bg-[#7DD3FC]/10 px-4 py-2.5 text-sm font-semibold text-[#7DD3FC] transition hover:bg-[#1D2A44] hover:text-[#F8FAFC] disabled:cursor-not-allowed disabled:opacity-55"
                  >
                    Regenerer la voix
                  </button>
                </>
              )}
            </div>

            {blockedReason ? (
              <p className="mt-4 rounded-md border border-[#1D2A44] bg-[#03070B] px-4 py-3 text-sm text-[#A7B0C0]">
                {blockedReason}
              </p>
            ) : null}

            {confirmationAction && voice ? (
              <div className="mt-5 rounded-md border border-[#39E6D0]/40 bg-[#39E6D0]/10 p-4">
                <p className="text-sm font-semibold text-[#F8FAFC]">
                  Confirmer la generation ElevenLabs
                </p>
                <div className="mt-3 grid gap-3 md:grid-cols-3">
                  <p className="rounded-md border border-[#1D2A44] bg-[#03070B] px-4 py-3 text-sm text-[#A7B0C0]">
                    Mots: <span className="font-semibold text-[#F8FAFC]">{voice.wordCount}</span>
                  </p>
                  <p className="rounded-md border border-[#1D2A44] bg-[#03070B] px-4 py-3 text-sm text-[#A7B0C0]">
                    Duree:{" "}
                    <span className="font-semibold text-[#F8FAFC]">
                      {formatDuration(voice.durationEstimateSeconds)}
                    </span>
                  </p>
                  <p className="rounded-md border border-[#1D2A44] bg-[#03070B] px-4 py-3 text-sm text-[#A7B0C0]">
                    Cout:{" "}
                    <span className="font-semibold text-[#F8FAFC]">
                      ${voice.costEstimateUsd.toFixed(2)}
                    </span>
                  </p>
                </div>
                {voice.audioUrl && confirmationAction === "generate_voice" ? (
                  <p className="mt-3 text-sm leading-6 text-[#A7B0C0]">
                    Une voix existe deja pour ce brouillon. Confirmer remplacera la voix rattachee par la nouvelle generation.
                  </p>
                ) : null}
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={isGenerating}
                    onClick={() => void runVoiceAction(confirmationAction)}
                    className="rounded-md border border-[#39E6D0]/50 bg-[#39E6D0]/10 px-4 py-2.5 text-sm font-semibold text-[#39E6D0] transition hover:bg-[#1D2A44] hover:text-[#F8FAFC] disabled:cursor-not-allowed disabled:opacity-55"
                  >
                    Confirmer
                  </button>
                  <button
                    type="button"
                    disabled={isGenerating}
                    onClick={() => setConfirmationAction(null)}
                    className="rounded-md border border-[#1D2A44] bg-[#03070B] px-4 py-2.5 text-sm font-semibold text-[#A7B0C0] transition hover:border-[#39E6D0]/50 hover:text-[#F8FAFC] disabled:cursor-not-allowed disabled:opacity-55"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            ) : null}
          </SectionContainer>
        ) : null}
      </div>
    </div>
  );
}
