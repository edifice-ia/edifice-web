"use client";

import type { ShortWorkflowState, ShortWorkflowStepStatus } from "@/lib/short-workflow";

type WorkflowStepKey = "text" | "visuals" | "voice" | "subtitles" | "video" | "readyToPublish";

const stepLabels: Record<WorkflowStepKey, string> = {
  readyToPublish: "Publication",
  subtitles: "Sous-titres",
  text: "Texte",
  video: "Video",
  visuals: "Visuels",
  voice: "Voix",
};

const statusLabels: Record<WorkflowStepKey, Partial<Record<ShortWorkflowStepStatus, string>>> = {
  readyToPublish: {
    pending: "En attente",
    validated: "Validée",
  },
  subtitles: {
    error: "Erreur",
    generating: "En cours",
    ignored: "Ignorés",
    pending: "À générer",
    ready: "Prêts",
    validated: "Validés",
  },
  text: {
    pending: "À valider",
    validated: "Validé",
  },
  video: {
    generating: "En cours",
    pending: "À préparer",
    ready: "Prête",
    validated: "Validée",
  },
  visuals: {
    in_progress: "En cours",
    pending: "À préparer",
    ready: "Prêts",
    validated: "Validés",
  },
  voice: {
    error: "Erreur",
    generating: "En cours",
    pending: "À générer",
    ready: "Prête",
    validated: "Validée",
  },
};

const dotClasses: Record<ShortWorkflowStepStatus, string> = {
  error: "border-[#F97316] bg-[#F97316]",
  generating: "border-[#39E6D0] bg-[#39E6D0]",
  ignored: "border-[#64748B] bg-[#64748B]",
  in_progress: "border-[#39E6D0] bg-[#39E6D0]",
  pending: "border-[#64748B] bg-[#03070B]",
  ready: "border-[#22C55E] bg-[#22C55E]",
  validated: "border-[#22C55E] bg-[#22C55E]",
};

const textClasses: Record<ShortWorkflowStepStatus, string> = {
  error: "text-[#FDBA74]",
  generating: "text-[#39E6D0]",
  ignored: "text-[#A7B0C0]",
  in_progress: "text-[#39E6D0]",
  pending: "text-[#A7B0C0]",
  ready: "text-[#86EFAC]",
  validated: "text-[#86EFAC]",
};

const nextStepLabels: Record<string, string> = {
  "Attendre la voix": "Attendre la voix",
  "Attendre les sous-titres": "Attendre les sous-titres",
  "Corriger la voix": "Corriger la voix",
  "Corriger les sous-titres": "Corriger les sous-titres",
  "Generer la video": "Préparer la vidéo",
  "Generer les sous-titres": "Générer les sous-titres",
  "Generer la voix": "Générer la voix",
  "Preparer les visuels": "Préparer les visuels",
  "Pret a publier": "Publier",
  "Terminer les visuels": "Terminer les visuels",
  "Valider la publication": "Valider la publication",
  "Valider le texte": "Valider le texte",
  video_en_attente: "Préparer la vidéo",
};

function formatRawValue(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return "null";
  }

  return String(value);
}

function stepStatusLabel(step: WorkflowStepKey, status: ShortWorkflowStepStatus) {
  return statusLabels[step][status] ?? status;
}

function contextualNextStep(nextStep: string) {
  return nextStepLabels[nextStep] ?? nextStep;
}

function shouldShowStep(step: WorkflowStepKey, state: ShortWorkflowState) {
  if (step !== "subtitles") {
    return true;
  }

  return (
    state.subtitles !== "pending" ||
    state.nextStep.toLowerCase().includes("sous-titres")
  );
}

export function ShortWorkflowStatus({
  state,
  compact = false,
}: {
  state: ShortWorkflowState;
  compact?: boolean;
}) {
  const steps = [
    ["text", state.text],
    ["visuals", state.visuals],
    ["voice", state.voice],
    ["subtitles", state.subtitles],
    ["video", state.video],
    ["readyToPublish", state.readyToPublish],
  ] as const satisfies ReadonlyArray<readonly [WorkflowStepKey, ShortWorkflowStepStatus]>;
  const visibleSteps = steps.filter(([step]) => shouldShowStep(step, state));
  const activeIndex = visibleSteps.findIndex(([, status]) => status !== "ready" && status !== "validated");
  const blockedSteps = visibleSteps
    .filter(([, status], index) => index > activeIndex && activeIndex >= 0 && status === "pending")
    .map(([step]) => stepLabels[step]);

  return (
    <section className="rounded-md border border-[#1D2A44] bg-[#03070B] p-4">
      <div className={compact ? "space-y-3" : "space-y-4"}>
        <div className="flex flex-col gap-1">
          <h2 className={compact ? "text-base font-semibold text-[#F8FAFC]" : "text-lg font-semibold text-[#F8FAFC]"}>
            Parcours Shorts
          </h2>
          <p className="overflow-hidden text-ellipsis whitespace-nowrap text-sm text-[#A7B0C0]">
            Prochaine étape : <span className="font-semibold text-[#F8FAFC]">{contextualNextStep(state.nextStep)}</span>
          </p>
        </div>

        <ol className="grid gap-2">
          {visibleSteps.map(([step, status], index) => {
            const isCurrentStep = index === activeIndex;
            const dotClass = isCurrentStep && status === "pending"
              ? "border-[#39E6D0] bg-[#39E6D0]"
              : dotClasses[status];

            return (
            <li
              key={step}
              className="min-w-0"
            >
              <div className="flex min-w-0 items-center gap-2 rounded-md px-1.5 py-1">
                <span className={`h-2.5 w-2.5 shrink-0 rounded-full border ${dotClass}`} />
                <p className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-sm leading-6">
                  <span className="font-semibold text-[#F8FAFC]">{stepLabels[step]}</span>
                  <span className="px-1.5 text-[#64748B]">-</span>
                  <span className={`font-semibold ${isCurrentStep && status === "pending" ? "text-[#39E6D0]" : textClasses[status]}`}>
                    {stepStatusLabel(step, status)}
                  </span>
                </p>
              </div>
            </li>
            );
          })}
        </ol>
      </div>

      <details className="mt-4 rounded-md border border-[#1D2A44] bg-[#08111A] p-3">
        <summary className="cursor-pointer text-sm font-semibold text-[#A7B0C0]">
          Voir le detail du workflow
        </summary>
        <div className="mt-3 grid gap-3 text-xs text-[#A7B0C0] lg:grid-cols-2">
          <div className="rounded-md border border-[#1D2A44] bg-[#03070B] p-3">
            <p className="font-semibold uppercase tracking-[0.14em] text-[#7DD3FC]">
              Synthese
            </p>
            <dl className="mt-2 grid gap-2">
              <div>
                <dt className="font-semibold text-[#F8FAFC]">Statut brut du brouillon</dt>
                <dd className="mt-0.5 [overflow-wrap:anywhere]">{formatRawValue(state.raw.draftStatus)}</dd>
              </div>
              <div>
                <dt className="font-semibold text-[#F8FAFC]">Prochaine action</dt>
                <dd className="mt-0.5 [overflow-wrap:anywhere]">{contextualNextStep(state.nextStep)}</dd>
              </div>
              <div>
                <dt className="font-semibold text-[#F8FAFC]">Etapes bloquees</dt>
                <dd className="mt-0.5 [overflow-wrap:anywhere]">
                  {blockedSteps.length ? blockedSteps.join(", ") : "Aucune"}
                </dd>
              </div>
            </dl>
          </div>
          <div className="rounded-md border border-[#1D2A44] bg-[#03070B] p-3">
            <p className="font-semibold uppercase tracking-[0.14em] text-[#7DD3FC]">
              Raisons et debug
            </p>
            <dl className="mt-2 grid gap-2">
              {Object.entries(state.reasons).map(([key, value]) => (
                <div key={key}>
                  <dt className="font-semibold text-[#F8FAFC]">{key}</dt>
                  <dd className="mt-0.5 [overflow-wrap:anywhere] leading-5">{value}</dd>
                </div>
              ))}
            </dl>
            <details className="mt-3 rounded-md border border-[#1D2A44] bg-[#08111A] p-2">
              <summary className="cursor-pointer font-semibold text-[#A7B0C0]">
                Debug brut
              </summary>
              <dl className="mt-2 grid gap-1">
                {Object.entries(state.raw).map(([key, value]) => (
                  <div key={key} className="grid gap-1 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                    <dt className="[overflow-wrap:anywhere]">{key}</dt>
                    <dd className="[overflow-wrap:anywhere] font-semibold text-[#F8FAFC]">
                      {formatRawValue(value)}
                    </dd>
                  </div>
                ))}
              </dl>
            </details>
          </div>
        </div>
      </details>
    </section>
  );
}
