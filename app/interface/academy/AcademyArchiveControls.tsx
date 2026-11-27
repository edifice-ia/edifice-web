"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { AcademyLevel } from "@/lib/academy/hierarchy";
import { ACADEMY_MESSAGES } from "@/lib/academy/http";

// Boutons d'archivage et de restauration d'Academy — composants client.
//
// Ils appellent les routes existantes : DELETE /api/academy/{niveau}/[id]
// (archivage, deleted_at ; aucune suppression) et POST
// /api/academy/{niveau}/[id]/restore. Archiver demande une confirmation en deux
// temps, dans la page. Un 404 signifie que l'état a changé entre-temps (déjà
// archivé, déjà restauré, ancêtre archivé) : la page est actualisée. Toute autre
// réponse, ou une panne réseau, affiche le message générique. Après réussite :
// router.refresh().

// Niveaux archivables : les cinq de la hiérarchie, l'objectif pédagogique
// (étape 2b-1) et la ressource pédagogique (étape 2b-2).
type ArchivableLevel = AcademyLevel | "objective" | "resource";

const LEVEL_SEGMENT: Record<ArchivableLevel, string> = {
  program: "programs",
  subject: "subjects",
  unit: "units",
  chapter: "chapters",
  lesson: "lessons",
  objective: "objectives",
  resource: "resources",
};

const CHANGED_MESSAGE = "Cet élément a changé entre-temps. La page a été actualisée.";

type ActionResult = "ok" | "changed" | "unavailable";

async function send(url: string, method: "DELETE" | "POST"): Promise<ActionResult> {
  try {
    const response = await fetch(url, { method });

    if (response.ok) {
      return "ok";
    }

    return response.status === 404 ? "changed" : "unavailable";
  } catch {
    return "unavailable";
  }
}

const smallButton =
  "rounded border px-2 py-0.5 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2";

function ActionError({ error }: { error: string | null }) {
  if (!error) {
    return null;
  }

  return (
    <span role="alert" className="text-xs text-[#FCA5A5]">
      {error}
    </span>
  );
}

function useAction() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(url: string, method: "DELETE" | "POST") {
    setError(null);
    setPending(true);
    const result = await send(url, method);
    setPending(false);

    if (result === "unavailable") {
      setError(ACADEMY_MESSAGES.unavailable);
      return false;
    }

    if (result === "changed") {
      setError(CHANGED_MESSAGE);
    }

    router.refresh();
    return result === "ok";
  }

  return { pending, error, run };
}

export function AcademyArchiveButton({
  level,
  id,
  title,
}: {
  level: ArchivableLevel;
  id: string;
  title: string;
}) {
  const [confirming, setConfirming] = useState(false);
  const { pending, error, run } = useAction();

  async function archive() {
    await run(`/api/academy/${LEVEL_SEGMENT[level]}/${id}`, "DELETE");
    setConfirming(false);
  }

  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      {confirming ? (
        <>
          <button
            type="button"
            onClick={archive}
            disabled={pending}
            aria-label={`Confirmer l'archivage de « ${title} »`}
            className={`${smallButton} border-[#F87171]/40 bg-[#F87171]/10 text-[#FCA5A5] hover:bg-[#F87171]/20`}
          >
            {pending ? "Archivage…" : "Confirmer l'archivage"}
          </button>
          <button
            type="button"
            onClick={() => setConfirming(false)}
            disabled={pending}
            className={`${smallButton} border-[#1D2A44] text-[#A7B0C0] hover:text-[#F8FAFC]`}
          >
            Annuler
          </button>
        </>
      ) : (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          aria-label={`Archiver « ${title} »`}
          className={`${smallButton} border-[#1D2A44] text-[#A7B0C0] hover:text-[#F8FAFC]`}
        >
          Archiver
        </button>
      )}
      <ActionError error={error} />
    </span>
  );
}

export function AcademyRestoreButton({
  level,
  id,
  title,
}: {
  level: ArchivableLevel;
  id: string;
  title: string;
}) {
  const { pending, error, run } = useAction();

  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => run(`/api/academy/${LEVEL_SEGMENT[level]}/${id}/restore`, "POST")}
        disabled={pending}
        aria-label={`Restaurer « ${title} »`}
        className={`${smallButton} border-[#39E6D0]/40 bg-[#39E6D0]/10 text-[#39E6D0] hover:bg-[#39E6D0]/20`}
      >
        {pending ? "Restauration…" : "Restaurer"}
      </button>
      <ActionError error={error} />
    </span>
  );
}
