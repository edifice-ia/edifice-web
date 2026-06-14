"use client";

import { useEffect, useMemo, useState } from "react";
import { SectionContainer } from "@/components/cockpit/SectionContainer";
import { parseVisualPrompts } from "@/lib/content/visual-prompts";

type ContentDraft = {
  id: string;
  createdAt: string;
  title: string;
  theme: string;
  status: string;
  visualPrompt: string;
  score: {
    total: number;
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
  visualScenes: VisualScene[];
};

type GenerationQuality = "low" | "medium" | "high";

type VisualScene = {
  id: string;
  draftId: string;
  assetId: string | null;
  visualPromptIndex: number;
  visualPromptText: string;
  generationSource: "library" | "generated" | "regenerated";
  generationQuality: GenerationQuality;
  generationStatus:
    | "pending"
    | "generated"
    | "failed"
    | "selected"
    | "retained"
    | "rejected";
  imageUrl: string | null;
  storagePath: string | null;
  scoreTotal: number | null;
  scoreBreakdown: Record<string, unknown>;
  scoreSource: "heuristic" | "gpt_vision" | "none";
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
};

type ApiErrorPayload = {
  error?: string;
  details?: Record<string, unknown>;
};

const statusLabels: Record<string, string> = {
  draft: "Brouillon texte",
  approved: "Texte validé",
  rejected: "Rejeté",
  validated: "Texte validé",
  ready_to_publish: "Prêt à publier",
};

const mediaStatusLabels: Record<MediaPipelineState["mediaPipelineStatus"], string> = {
  draft: "Brouillon texte",
  validated: "Texte validé",
  media_preparing: "Visuels en préparation",
  media_ready: "Visuels prêts",
  ready_to_publish: "Prêt à publier",
};

const generationSourceLabels: Record<VisualScene["generationSource"], string> = {
  generated: "generee",
  library: "bibliotheque",
  regenerated: "regeneree",
};

const generationStatusLabels: Record<VisualScene["generationStatus"], string> = {
  failed: "erreur",
  generated: "image generee",
  pending: "generation en cours",
  rejected: "rejetee",
  retained: "retenue",
  selected: "selectionnee",
};

const generationQualityLabels: Record<GenerationQuality, string> = {
  high: "high - meilleure qualite",
  low: "low - economique / test rapide",
  medium: "medium - recommande",
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

function visualActionNotice(action: string) {
  const notices: Record<string, string> = {
    analyze_scene: "Analyse Vision terminee.",
    prepare_media: "Visuels actualises pour ce brouillon.",
    refresh_suggestions: "Propositions actualisees.",
    regenerate_scene: "Scene regeneree.",
    reject_scene: "Scene rejetee.",
    request_visual_generation: "Generation lancee pour les scenes de ce brouillon.",
    retain_scene: "Scene retenue.",
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
    ? "Proposition pertinente mais non retenue dans les 7 emplacements."
    : "Non retenu: score estime plus faible ou coherence a valider.";
}

function ScoreDetails({ asset, isRetained }: { asset: VisualAsset; isRetained: boolean }) {
  const breakdown = asset.scoreBreakdown;
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
        {breakdown.matchedTerms.length ? (
          <p>Termes reconnus: {breakdown.matchedTerms.join(", ")}</p>
        ) : null}
      </div>
    </details>
  );
}

function SceneScoreDetails({ scene }: { scene: VisualScene }) {
  const breakdown = scene.scoreBreakdown;
  const items = [
    ["Prompt / image", scoreNumber(breakdown.prompt_image ?? breakdown.promptImage), 30],
    ["Image / brouillon", scoreNumber(breakdown.image_draft ?? breakdown.imageDraft), 25],
    ["Qualite", scoreNumber(breakdown.quality ?? breakdown.visualQuality), 20],
    ["Continuite", scoreNumber(breakdown.continuity ?? breakdown.narrativeContinuity), 15],
    ["Securite / style", scoreNumber(breakdown.safety_style ?? breakdown.editorialSafety), 10],
  ] as const;
  const reason =
    typeof breakdown.reason === "string" && breakdown.reason.trim()
      ? breakdown.reason
      : scene.errorMessage ?? "Score non disponible.";
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
        {warnings.length ? <p>Alertes: {warnings.join(" ; ")}</p> : null}
      </div>
    </details>
  );
}

function firstFreeVisualSlot(retainedVisuals: SelectedDraftAsset[]) {
  const usedSlots = new Set(retainedVisuals.map((asset) => asset.usageOrder));

  for (let slot = 1; slot <= 7; slot += 1) {
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
  const [generationQuality, setGenerationQuality] =
    useState<GenerationQuality>("medium");
  const [isLoadingDrafts, setIsLoadingDrafts] = useState(false);
  const [isLoadingMedia, setIsLoadingMedia] = useState(false);
  const [isRunningAction, setIsRunningAction] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const selectedDraft = useMemo(
    () => drafts.find((draft) => draft.id === selectedDraftId) ?? null,
    [drafts, selectedDraftId],
  );
  const visualPrompts = useMemo(
    () => parseVisualPrompts(selectedDraft?.visualPrompt ?? ""),
    [selectedDraft],
  );
  const generatedVisuals = useMemo(
    () => media?.suggestedAssets.slice(0, 12) ?? [],
    [media],
  );
  const retainedVisuals = useMemo(
    () => media?.selectedAssets.slice(0, 7) ?? [],
    [media],
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
  const retainedAssetIds = useMemo(
    () => new Set(retainedVisuals.map((asset) => asset.id)),
    [retainedVisuals],
  );
  const mediaReady =
    media?.mediaPipelineStatus === "media_ready" ||
    media?.mediaPipelineStatus === "ready_to_publish";

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

  async function loadMedia(draftId: string) {
    if (!draftId) {
      setMedia(null);
      return;
    }

    setIsLoadingMedia(true);
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
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Lecture des visuels indisponible.",
      );
      setMedia(null);
    } finally {
      setIsLoadingMedia(false);
    }
  }

  async function runVisualAction(
    action:
      | "prepare_media"
      | "refresh_suggestions"
      | "request_visual_generation"
      | "regenerate_scene"
      | "analyze_scene"
      | "retain_scene"
      | "reject_scene"
      | "select_asset"
      | "replace_asset"
      | "remove_asset",
    options?: { assetId?: string; sceneIndex?: number; usageOrder?: number },
  ) {
    if (!selectedDraft) {
      return;
    }

    setIsRunningAction(true);
    setError(null);
    setNotice(null);

    try {
      const shouldSendGenerationQuality =
        action === "request_visual_generation" || action === "regenerate_scene";
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
        }),
      });
      const payload = (await response.json()) as {
        media?: MediaPipelineState;
      } & ApiErrorPayload;

      if (!response.ok || !payload.media) {
        throw new Error(formatApiError(payload, "Action visuelle indisponible."));
      }

      setMedia(payload.media);
      setNotice(visualActionNotice(action));
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Action visuelle indisponible.",
      );
    } finally {
      setIsRunningAction(false);
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

          <div className="mt-5 grid gap-3 md:grid-cols-3">
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
            {(media?.visualScenes ?? []).map((scene) => (
              <article
                key={scene.visualPromptIndex}
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
                  ) : (
                    <div className="flex aspect-[9/16] w-full items-center justify-center rounded-md border border-dashed border-[#1D2A44] bg-[#03070B] px-4 text-center text-xs font-semibold text-[#64748b]">
                      Image non disponible
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
                    <span className="rounded-md border border-[#1D2A44] bg-[#03070B] px-2 py-1 text-xs font-semibold text-[#A7B0C0]">
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
                  {scene.errorMessage ? (
                    <p className="mt-3 rounded-md border border-[#F97316]/35 bg-[#F97316]/10 px-3 py-2 text-xs font-semibold text-[#FDBA74]">
                      {scene.errorMessage}
                    </p>
                  ) : null}
                  <SceneScoreDetails scene={scene} />
                  <div className="mt-3 flex flex-wrap gap-2">
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
                      Regenerer / remplacer
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
                      Rejeter
                    </button>
                  </div>
                </div>
              </article>
            ))}
            {media && media.visualScenes.length === 0 ? (
              <p className="rounded-md border border-[#1D2A44] bg-[#08111A] px-4 py-3 text-sm text-[#A7B0C0]">
                Lance la generation ou la preparation pour creer les 7 scenes.
              </p>
            ) : null}
          </div>
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
                slotByAsset[asset.id] ?? firstFreeVisualSlot(retainedVisuals);

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
                        {[1, 2, 3, 4, 5, 6, 7].map((slot) => (
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
