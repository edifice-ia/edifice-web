"use client";

import type { ShortWorkflowState, ShortWorkflowStepStatus } from "@/lib/short-workflow";

type WorkflowStepKey = "text" | "visuals" | "voice" | "video" | "readyToPublish";

const stepLabels: Record<WorkflowStepKey, string> = {
  readyToPublish: "Publication",
  text: "Texte",
  video: "Video",
  visuals: "Visuels",
  voice: "Voix",
};

const statusLabels: Record<WorkflowStepKey, Partial<Record<ShortWorkflowStepStatus, string>>> = {
  readyToPublish: {
    pending: "En attente",
    validated: "Validee",
  },
  text: {
    pending: "A valider",
    validated: "Valide",
  },
  video: {
    generating: "En cours",
    pending: "A preparer",
    ready: "Prete",
    validated: "Validee",
  },
  visuals: {
    in_progress: "En cours",
    pending: "A preparer",
    ready: "Prets",
    validated: "Valides",
  },
  voice: {
    error: "Erreur",
    generating: "En cours",
    pending: "A generer",
    ready: "Prete",
    validated: "Validee",
  },
};

const dotClasses: Record<ShortWorkflowStepStatus, string> = {
  error: "border-[#F97316] bg-[#F97316]",
  generating: "border-[#39E6D0] bg-[#39E6D0]",
  in_progress: "border-[#39E6D0] bg-[#39E6D0]",
  pending: "border-[#64748B] bg-[#03070B]",
  ready: "border-[#22C55E] bg-[#22C55E]",
  validated: "border-[#22C55E] bg-[#22C55E]",
};

const textClasses: Record<ShortWorkflowStepStatus, string> = {
  error: "text-[#FDBA74]",
  generating: "text-[#39E6D0]",
  in_progress: "text-[#39E6D0]",
  pending: "text-[#A7B0C0]",
  ready: "text-[#86EFAC]",
  validated: "text-[#86EFAC]",
};

const nextStepLabels: Record<string, string> = {
  "Attendre la voix": "attendre la voix.",
  "Corriger la voix": "corriger la voix.",
  "Generer la video": "preparer la video.",
  "Generer la voix": "generer la voix.",
  "Preparer les visuels": "preparer les visuels.",
  "Pret a publier": "publier.",
  "Terminer les visuels": "terminer les visuels.",
  "Valider la publication": "valider la publication.",
  "Valider le texte": "valider le texte.",
  video_en_attente: "preparer la video.",
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
    ["video", state.video],
    ["readyToPublish", state.readyToPublish],
  ] as const satisfies ReadonlyArray<readonly [WorkflowStepKey, ShortWorkflowStepStatus]>;
  const activeIndex = steps.findIndex(([, status]) => status !== "ready" && status !== "validated");
  const blockedSteps = steps
    .filter(([, status], index) => index > activeIndex && activeIndex >= 0 && status === "pending")
    .map(([step]) => stepLabels[step]);

  return (
    <section className="rounded-md border border-[#1D2A44] bg-[#03070B] p-4">
      <div className={compact ? "space-y-3" : "space-y-4"}>
        <div className="flex flex-col gap-1">
          <h2 className={compact ? "text-base font-semibold text-[#F8FAFC]" : "text-lg font-semibold text-[#F8FAFC]"}>
            Parcours Shorts
          </h2>
          <p className="text-sm text-[#A7B0C0]">
            Prochaine etape : <span className="font-semibold text-[#F8FAFC]">{contextualNextStep(state.nextStep)}</span>
          </p>
        </div>

        <ol className="grid gap-3 md:grid-cols-[repeat(9,minmax(0,1fr))] md:items-center">
          {steps.map(([step, status], index) => (
            <li
              key={step}
              className={index === steps.length - 1 ? "min-w-0" : "contents md:contents"}
            >
              <div className="min-w-0 rounded-md border border-[#1D2A44] bg-[#08111A] px-3 py-2 md:border-0 md:bg-transparent md:px-0 md:py-0">
                <div className="flex min-w-0 items-center gap-2">
                  <span className={`h-2.5 w-2.5 shrink-0 rounded-full border ${dotClasses[status]}`} />
                  <div className="min-w-0">
                    <p className="overflow-hidden text-ellipsis whitespace-nowrap text-sm font-semibold text-[#F8FAFC]">
                      {stepLabels[step]}
                    </p>
                    <p className={`[overflow-wrap:anywhere] text-xs font-semibold ${textClasses[status]}`}>
                      {stepStatusLabel(step, status)}
                    </p>
                  </div>
                </div>
              </div>
              {index < steps.length - 1 ? (
                <div className="hidden h-px min-w-0 bg-[#1D2A44] md:block" aria-hidden="true" />
              ) : null}
            </li>
          ))}
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
