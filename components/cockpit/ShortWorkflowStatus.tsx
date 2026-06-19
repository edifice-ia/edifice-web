"use client";

import type { ShortWorkflowState, ShortWorkflowStepStatus } from "@/lib/short-workflow";

const stepLabels: Record<keyof Pick<ShortWorkflowState, "text" | "visuals" | "voice" | "video" | "readyToPublish">, string> = {
  readyToPublish: "Pret a publier",
  text: "Texte",
  video: "Video",
  visuals: "Visuels",
  voice: "Voix",
};

const statusLabels: Record<ShortWorkflowStepStatus, string> = {
  error: "Erreur",
  generating: "Generation",
  in_progress: "En preparation",
  pending: "En attente",
  ready: "Pret",
  validated: "Valide",
};

const statusClasses: Record<ShortWorkflowStepStatus, string> = {
  error: "border-[#F97316]/45 bg-[#F97316]/10 text-[#FDBA74]",
  generating: "border-[#FACC15]/45 bg-[#FACC15]/10 text-[#FDE68A]",
  in_progress: "border-[#FACC15]/45 bg-[#FACC15]/10 text-[#FDE68A]",
  pending: "border-[#FACC15]/35 bg-[#FACC15]/10 text-[#FDE68A]",
  ready: "border-[#22C55E]/45 bg-[#22C55E]/10 text-[#86EFAC]",
  validated: "border-[#22C55E]/45 bg-[#22C55E]/10 text-[#86EFAC]",
};

function formatRawValue(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return "null";
  }

  return String(value);
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
  ] as const;

  return (
    <div className="rounded-md border border-[#1D2A44] bg-[#03070B] p-4">
      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className={compact ? "text-lg font-semibold text-[#F8FAFC]" : "text-xl font-semibold text-[#F8FAFC]"}>
            Statuts Shorts
          </h2>
          <p className="mt-1 text-sm text-[#A7B0C0]">
            Prochaine etape: <span className="font-semibold text-[#F8FAFC]">{state.nextStep}</span>
          </p>
        </div>
        <span className="rounded-md border border-[#1D2A44] bg-[#08111A] px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#A7B0C0]">
          {state.overallStatus}
        </span>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
        {steps.map(([step, status]) => (
          <div
            key={step}
            className={`rounded-md border px-3 py-2 text-sm font-semibold ${statusClasses[status]}`}
          >
            <p className="text-xs uppercase tracking-[0.14em] opacity-80">
              {stepLabels[step]}
            </p>
            <p className="mt-1">{statusLabels[status]}</p>
          </div>
        ))}
      </div>

      <details className="mt-4 rounded-md border border-[#1D2A44] bg-[#08111A] p-3">
        <summary className="cursor-pointer text-sm font-semibold text-[#A7B0C0]">
          Debug workflow
        </summary>
        <div className="mt-3 grid gap-3 text-xs text-[#A7B0C0] lg:grid-cols-2">
          <div className="rounded-md border border-[#1D2A44] bg-[#03070B] p-3">
            <p className="font-semibold uppercase tracking-[0.14em] text-[#7DD3FC]">
              Valeurs brutes
            </p>
            <dl className="mt-2 grid gap-1">
              {Object.entries(state.raw).map(([key, value]) => (
                <div key={key} className="flex justify-between gap-3">
                  <dt>{key}</dt>
                  <dd className="text-right font-semibold text-[#F8FAFC]">
                    {formatRawValue(value)}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="rounded-md border border-[#1D2A44] bg-[#03070B] p-3">
            <p className="font-semibold uppercase tracking-[0.14em] text-[#7DD3FC]">
              Statut calcule
            </p>
            <dl className="mt-2 grid gap-1">
              {Object.entries(state.reasons).map(([key, value]) => (
                <div key={key}>
                  <dt className="font-semibold text-[#F8FAFC]">{key}</dt>
                  <dd className="mt-0.5 leading-5">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </details>
    </div>
  );
}
