"use client";

import { useEffect, useMemo, useState } from "react";
import { SectionContainer } from "@/components/cockpit/SectionContainer";

type ContentDraft = {
  id: string;
  createdAt: string;
  title: string;
  theme: string;
  status: string;
  voiceStyle: string;
  score: {
    total: number;
  };
};

const statusLabels: Record<string, string> = {
  draft: "Brouillon texte",
  approved: "Texte validé",
  rejected: "Rejeté",
  validated: "Texte validé",
  ready_to_publish: "Prêt à publier",
};

function scoreOutOf100(value: number) {
  return Math.round(Math.max(0, Math.min(100, value <= 10 ? value * 10 : value)));
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export function ShortsVoiceClient() {
  const [drafts, setDrafts] = useState<ContentDraft[]>([]);
  const [selectedDraftId, setSelectedDraftId] = useState("");
  const [isLoadingDrafts, setIsLoadingDrafts] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedDraft = useMemo(
    () => drafts.find((draft) => draft.id === selectedDraftId) ?? null,
    [drafts, selectedDraftId],
  );

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

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadDrafts();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

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
                  {scoreOutOf100(draft.score.total)}/100 - média non prêt
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
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#39E6D0]">
            Voix par brouillon
          </p>
          <h2 className="mt-3 text-2xl font-semibold text-[#F8FAFC]">
            Module voix en préparation
          </h2>
          <p className="mt-3 max-w-3xl leading-7 text-[#A7B0C0]">
            Le choix de brouillon est déjà en place. La génération audio, le
            stockage et la prévisualisation seront branchés plus tard.
          </p>

          {error ? (
            <p className="mt-5 rounded-md border border-[#F97316]/40 bg-[#F97316]/10 px-4 py-3 text-sm font-semibold text-[#FDBA74]">
              {error}
            </p>
          ) : null}
        </SectionContainer>

        {selectedDraft ? (
          <SectionContainer>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#39E6D0]">
                  Brouillon sélectionné
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

            <div className="mt-5 grid gap-3 md:grid-cols-3">
              <p className="rounded-md border border-[#1D2A44] bg-[#08111A] px-4 py-3 text-sm text-[#A7B0C0]">
                Score:{" "}
                <span className="font-semibold text-[#F8FAFC]">
                  {scoreOutOf100(selectedDraft.score.total)}/100
                </span>
              </p>
              <p className="rounded-md border border-[#1D2A44] bg-[#08111A] px-4 py-3 text-sm text-[#A7B0C0]">
                Créé le:{" "}
                <span className="font-semibold text-[#F8FAFC]">
                  {formatDate(selectedDraft.createdAt)}
                </span>
              </p>
              <p className="rounded-md border border-[#1D2A44] bg-[#08111A] px-4 py-3 text-sm text-[#A7B0C0]">
                Voix: <span className="font-semibold text-[#F8FAFC]">non prête</span>
              </p>
            </div>

            <div className="mt-5 rounded-md border border-[#1D2A44] bg-[#08111A] p-4">
              <p className="text-sm font-semibold text-[#F8FAFC]">Style voix prévu</p>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#A7B0C0]">
                {selectedDraft.voiceStyle || "Aucun style voix renseigné."}
              </p>
            </div>
          </SectionContainer>
        ) : null}
      </div>
    </div>
  );
}
