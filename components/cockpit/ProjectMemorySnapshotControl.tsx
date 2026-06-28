"use client";

import { useState } from "react";

type MemorySnapshotState = "up_to_date" | "needs_update" | "updating" | "error";

type SnapshotPayload = {
  snapshot?: {
    isUpToDate: boolean;
    lastUpdatedAt: string | null;
    state: "up_to_date" | "needs_update";
  } | null;
  error?: string;
};

function formatDate(value: string | null) {
  if (!value) {
    return "Jamais";
  }

  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    timeZone: "Europe/Paris",
    year: "numeric",
  }).format(new Date(value));
}

function statusLabel(state: MemorySnapshotState) {
  if (state === "updating") {
    return "Mise a jour en cours";
  }
  if (state === "error") {
    return "Erreur de mise a jour";
  }
  return state === "up_to_date" ? "A jour" : "A mettre a jour";
}

export function ProjectMemorySnapshotControl({
  initialLastUpdatedAt,
  initialState,
}: {
  initialLastUpdatedAt: string | null;
  initialState: "up_to_date" | "needs_update";
}) {
  const [state, setState] = useState<MemorySnapshotState>(initialState);
  const [lastUpdatedAt, setLastUpdatedAt] = useState(initialLastUpdatedAt);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function updateSnapshot() {
    setState("updating");
    setError(null);
    setFeedback(null);

    try {
      const response = await fetch("/api/project-memory", {
        body: JSON.stringify({ action: "update_project_snapshot" }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const payload = (await response.json()) as SnapshotPayload;
      if (!response.ok || !payload.snapshot) {
        throw new Error(payload.error ?? "Mise a jour memoire indisponible.");
      }
      setState(payload.snapshot.isUpToDate ? "up_to_date" : payload.snapshot.state);
      setLastUpdatedAt(payload.snapshot.lastUpdatedAt);
      setShowConfirmation(false);
      setFeedback("Memoire projet mise a jour.");
    } catch (requestError) {
      setState("error");
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Mise a jour memoire indisponible.",
      );
    }
  }

  return (
    <div className="rounded-md border border-[#1D2A44] bg-[#08111A] p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#39E6D0]">
            Memoire projet
          </p>
          <h2 className="mt-2 text-lg font-semibold text-[#F8FAFC]">
            Snapshot assistant global
          </h2>
          <p className="mt-2 text-sm leading-6 text-[#A7B0C0]">
            Derniere mise a jour memoire :{" "}
            <span className="font-semibold text-[#F8FAFC]">
              {formatDate(lastUpdatedAt)}
            </span>
          </p>
          <p className="mt-1 text-sm text-[#A7B0C0]">
            Etat :{" "}
            <span className="font-semibold text-[#F8FAFC]">
              {statusLabel(state)}
            </span>
          </p>
        </div>
        <button
          className="rounded-md border border-[#39E6D0]/50 bg-[#39E6D0]/10 px-4 py-2 text-sm font-semibold text-[#39E6D0] transition hover:bg-[#39E6D0]/20 hover:text-[#F8FAFC] disabled:opacity-55"
          disabled={state === "updating"}
          onClick={() => setShowConfirmation(true)}
          type="button"
        >
          Mettre a jour la memoire projet
        </button>
      </div>

      {showConfirmation ? (
        <div className="mt-4 rounded-md border border-[#39E6D0]/30 bg-[#03070B] p-3 text-sm text-[#A7B0C0]">
          <p className="font-semibold text-[#F8FAFC]">
            Mettre a jour la memoire projet ?
          </p>
          <p className="mt-2 leading-6">
            Un snapshot structure de l&apos;etat projet actuel sera enregistre sur
            la cle technique dediee. Les entrees memoire manuelles ne seront pas
            remplacees.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              className="rounded-md border border-[#39E6D0]/50 bg-[#39E6D0]/10 px-3 py-2 text-xs font-semibold text-[#39E6D0] transition hover:text-[#F8FAFC] disabled:opacity-55"
              disabled={state === "updating"}
              onClick={() => void updateSnapshot()}
              type="button"
            >
              {state === "updating" ? "Mise a jour..." : "Confirmer"}
            </button>
            <button
              className="rounded-md border border-[#64748b]/50 bg-[#64748b]/10 px-3 py-2 text-xs font-semibold text-[#cbd5e1] transition hover:text-[#F8FAFC]"
              disabled={state === "updating"}
              onClick={() => setShowConfirmation(false)}
              type="button"
            >
              Annuler
            </button>
          </div>
        </div>
      ) : null}

      {feedback ? (
        <p className="mt-3 rounded-md border border-[#39E6D0]/30 bg-[#39E6D0]/10 px-3 py-2 text-sm font-semibold text-[#39E6D0]">
          {feedback}
        </p>
      ) : null}
      {error ? (
        <p className="mt-3 rounded-md border border-[#F97316]/35 bg-[#F97316]/10 px-3 py-2 text-sm text-[#FDBA74]">
          {error}
        </p>
      ) : null}
    </div>
  );
}
