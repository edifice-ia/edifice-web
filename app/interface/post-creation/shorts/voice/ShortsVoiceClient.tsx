"use client";

import { useEffect, useMemo, useState } from "react";
import { SectionContainer } from "@/components/cockpit/SectionContainer";

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
  status: "not_ready" | "pending" | "generating" | "ready" | "error";
  wordCount: number;
};

type MediaPayload = {
  media?: {
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
  voice_ready: "Voix prete",
};

const voiceStatusLabels: Record<DraftVoiceState["status"], string> = {
  error: "Erreur voix",
  generating: "Generation en cours",
  not_ready: "Texte valide requis",
  pending: "Voix en attente",
  ready: "Voix prete",
};

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
  const [voice, setVoice] = useState<DraftVoiceState | null>(null);
  const [isLoadingDrafts, setIsLoadingDrafts] = useState(false);
  const [isLoadingVoice, setIsLoadingVoice] = useState(false);
  const [activeAction, setActiveAction] = useState<"generate_voice" | "regenerate_voice" | null>(null);
  const [confirmationAction, setConfirmationAction] = useState<"generate_voice" | "regenerate_voice" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedDraft = useMemo(
    () => drafts.find((draft) => draft.id === selectedDraftId) ?? null,
    [drafts, selectedDraftId],
  );
  const isGenerating = Boolean(activeAction) || voice?.status === "generating";
  const blockedReason = generationBlockedReason(voice);

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

  async function loadVoice(draftId: string) {
    if (!draftId) {
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

      setVoice(payload.media.voice);
    } catch (caughtError) {
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

      setVoice(payload.media.voice);
      await loadDrafts();
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
                  {voice?.selectedVoiceLabel ?? "Non configuree"}
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

            <div className="mt-5 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={Boolean(blockedReason) || isGenerating}
                onClick={() => setConfirmationAction("generate_voice")}
                className="rounded-md border border-[#39E6D0]/50 bg-[#39E6D0]/10 px-4 py-2.5 text-sm font-semibold text-[#39E6D0] transition hover:bg-[#1D2A44] hover:text-[#F8FAFC] disabled:cursor-not-allowed disabled:opacity-55"
              >
                {isGenerating ? "Generation..." : "Generer la voix"}
              </button>
              <button
                type="button"
                disabled={!voice?.audioUrl || Boolean(blockedReason) || isGenerating}
                onClick={() => setConfirmationAction("regenerate_voice")}
                className="rounded-md border border-[#7DD3FC]/45 bg-[#7DD3FC]/10 px-4 py-2.5 text-sm font-semibold text-[#7DD3FC] transition hover:bg-[#1D2A44] hover:text-[#F8FAFC] disabled:cursor-not-allowed disabled:opacity-55"
              >
                Regenerer la voix
              </button>
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
