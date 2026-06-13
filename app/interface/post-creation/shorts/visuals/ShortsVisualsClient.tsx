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

function scoreOutOf100(value: number) {
  return Math.round(Math.max(0, Math.min(100, value <= 10 ? value * 10 : value)));
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
      | "select_asset"
      | "replace_asset"
      | "remove_asset",
    options?: { assetId?: string; usageOrder?: number },
  ) {
    if (!selectedDraft) {
      return;
    }

    setIsRunningAction(true);
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
          assetId: options?.assetId,
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
      setNotice(
        action === "request_visual_generation"
          ? "Regeneration demandée pour ce brouillon."
          : action === "select_asset"
            ? "Visuel retenu mis à jour."
            : "Visuels actualisés pour ce brouillon.",
      );
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
              Visuels générés:{" "}
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
                !media?.visualDecision ||
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
                    <p className="line-clamp-4 leading-5">
                      Prompt source: {visualPromptSource(asset, visualPrompts, asset.usageOrder)}
                    </p>
                  </div>
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
            Visuels générés
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
                      <p className="line-clamp-4 leading-5">
                        Prompt source: {visualPromptSource(asset, visualPrompts, index + 1)}
                      </p>
                    </div>
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
