"use client";

import { useMemo, useState } from "react";

type DemoAction = "generate" | "simulate_publish";
type StepStatus = "waiting" | "running" | "done";

type DemoStep = {
  label: string;
  duration: string;
  phase: "Analyse" | "Génération" | "Vérification" | "Préparation média" | "Simulation publication";
  terminal: string;
  upload?: number;
};

type DemoResult = {
  status: string;
  title: string;
  description: string;
  actionLabel: string;
  targetedPlatform: string;
  logs: string[];
  finalMessage: string;
  sensitiveActionBlocked: boolean;
};

const generationSteps: DemoStep[] = [
  {
    label: "Analyse du brief vidéo",
    duration: "0.4 s",
    phase: "Analyse",
    terminal: "[agent] Analyse du brief vidéo",
  },
  {
    label: "Génération du titre",
    duration: "0.3 s",
    phase: "Génération",
    terminal: "[agent] Génération titre terminé",
  },
  {
    label: "Génération de la description",
    duration: "0.5 s",
    phase: "Génération",
    terminal: "[agent] Description courte générée",
  },
  {
    label: "Préparation des hashtags",
    duration: "0.3 s",
    phase: "Génération",
    terminal: "[agent] Hashtags demo préparés",
  },
  {
    label: "Vérification conformité TikTok",
    duration: "0.4 s",
    phase: "Vérification",
    terminal: "[safety] Appel TikTok réel bloqué",
  },
  {
    label: "Préparation du média fictif",
    duration: "0.5 s",
    phase: "Préparation média",
    terminal: "[dry-run] Média fictif préparé",
    upload: 72,
  },
  {
    label: "Publication simulée prête",
    duration: "0.2 s",
    phase: "Simulation publication",
    terminal: "[publish] Publication simulée prête",
    upload: 100,
  },
];

const publishSteps: DemoStep[] = [
  {
    label: "Préparation",
    duration: "0.3 s",
    phase: "Préparation média",
    terminal: "[publish] Préparation du paquet demo",
    upload: 18,
  },
  {
    label: "Upload simulé",
    duration: "0.5 s",
    phase: "Préparation média",
    terminal: "[dry-run] Upload simulé edifice_demo_short.mp4",
    upload: 64,
  },
  {
    label: "Validation",
    duration: "0.3 s",
    phase: "Vérification",
    terminal: "[safety] Validation dry-run confirmée",
    upload: 88,
  },
  {
    label: "Publication fictive",
    duration: "0.2 s",
    phase: "Simulation publication",
    terminal: "[publish] Confirmation fictive générée",
    upload: 100,
  },
];

const actionLabels: Record<DemoAction, string> = {
  generate: "Tester génération TikTok démo",
  simulate_publish: "Simuler publication TikTok",
};

const initialTerminal = [
  "[dry-run] Aucun token utilisé",
  "[safety] Aucune variable ENV affichée",
];

const preview = {
  title: "Réorganiser sa journée en 30 secondes",
  description:
    "Une routine simple pour transformer une intention en action claire, sans surcharge.",
  hashtags: ["#Organisation", "#Productivite", "#IA", "#Routine", "#DemoOnly"],
};

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function Spinner() {
  return (
    <span className="inline-block size-4 animate-spin rounded-full border-2 border-[#38BDF8]/30 border-t-[#38BDF8]" />
  );
}

function StepBadge({ status }: { status: StepStatus }) {
  if (status === "done") {
    return (
      <span className="rounded-md border border-[#39E6D0]/35 bg-[#39E6D0]/10 px-2.5 py-1 text-xs font-semibold text-[#39E6D0]">
        validé
      </span>
    );
  }

  if (status === "running") {
    return (
      <span className="inline-flex items-center gap-2 rounded-md border border-[#38BDF8]/35 bg-[#38BDF8]/10 px-2.5 py-1 text-xs font-semibold text-[#7DD3FC]">
        <span className="size-2 animate-ping rounded-full bg-[#38BDF8]" />
        en cours
      </span>
    );
  }

  return (
    <span className="rounded-md border border-[#64748b]/35 bg-[#64748b]/10 px-2.5 py-1 text-xs font-semibold text-[#A7B0C0]">
      en attente
    </span>
  );
}

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="h-3 overflow-hidden rounded-full border border-[#223149] bg-[#070B12]">
      <div
        className="h-full rounded-full bg-[#39E6D0] transition-all duration-500"
        style={{ width: `${value}%` }}
      />
    </div>
  );
}

export function DemoTikTokPanel() {
  const [activeAction, setActiveAction] = useState<DemoAction | null>(null);
  const [currentStep, setCurrentStep] = useState(-1);
  const [completedSteps, setCompletedSteps] = useState(0);
  const [terminalLines, setTerminalLines] = useState<string[]>(initialTerminal);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [result, setResult] = useState<DemoResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const activeSteps = useMemo(() => {
    return activeAction === "simulate_publish" ? publishSteps : generationSteps;
  }, [activeAction]);

  const isRunning = activeAction !== null && completedSteps < activeSteps.length;
  const globalProgress =
    activeAction === null
      ? 0
      : Math.round((completedSteps / activeSteps.length) * 100);
  const currentPhase =
    activeAction && currentStep >= 0
      ? activeSteps[Math.min(currentStep, activeSteps.length - 1)].phase
      : "Analyse";
  const showPreview = completedSteps > 0 || result;
  const showSuccess = activeAction === "simulate_publish" && result;

  async function runDemo(action: DemoAction) {
    if (isRunning) {
      return;
    }

    const steps = action === "simulate_publish" ? publishSteps : generationSteps;

    setActiveAction(action);
    setCurrentStep(0);
    setCompletedSteps(0);
    setTerminalLines(initialTerminal);
    setUploadProgress(0);
    setResult(null);
    setError(null);

    for (let index = 0; index < steps.length; index += 1) {
      const step = steps[index];
      setCurrentStep(index);
      setTerminalLines((lines) => [...lines, step.terminal]);
      if (step.upload) {
        setUploadProgress(step.upload);
      }
      await delay(520 + index * 80);
      setCompletedSteps(index + 1);
    }

    setTerminalLines((lines) => [
      ...lines,
      "[dry-run] Aucun token utilisé",
      "[safety] Appel API réel bloqué",
      "[agent] Résultat généré en environnement démo",
    ]);

    try {
      const response = await fetch("/api/demo/tiktok", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action,
          mode: "reviewer-demo",
          dryRun: true,
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        setResult(null);
        setError(payload.error ?? "Action demo indisponible.");
        return;
      }

      setResult(payload);
      setUploadProgress(100);
    } catch {
      setResult(null);
      setError("Démo indisponible. Aucun appel externe n’a été tenté.");
    }
  }

  function getStepStatus(index: number): StepStatus {
    if (index < completedSteps) {
      return "done";
    }

    if (index === currentStep && isRunning) {
      return "running";
    }

    return "waiting";
  }

  return (
    <section className="rounded-lg border border-[#223149] bg-[#0F1724] p-6 shadow-2xl shadow-black/20">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#7DD3FC]">
            TikTok Review
          </p>
          <h2 className="mt-3 text-2xl font-semibold text-[#F4F7FB]">
            Agent de démo en cours de travail
          </h2>
          <p className="mt-3 max-w-2xl leading-7 text-[#9EADBF]">
            Cette démonstration reproduit le parcours utilisateur attendu. Les
            appels API réels sont désactivés tant que l’application est en
            review.
          </p>
        </div>
        <div className="rounded-md border border-[#39E6D0]/35 bg-[#39E6D0]/10 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#39E6D0]">
            Mode démo
          </p>
          <p className="mt-1 text-sm text-[#D8DEE8]">
            Aucune action réelle sensible
          </p>
        </div>
      </div>

      <div className="mt-6 rounded-lg border border-[#223149] bg-[#111D2E] p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#7DD3FC]">
              Progression de la démo TikTok
            </p>
            <p className="mt-2 text-sm text-[#9EADBF]">
              Statut actuel :{" "}
              <span className="font-semibold text-[#F4F7FB]">
                {currentPhase}
              </span>
            </p>
          </div>
          <p className="text-3xl font-semibold text-[#39E6D0]">
            {globalProgress}%
          </p>
        </div>
        <div className="mt-4">
          <ProgressBar value={globalProgress} />
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        {(Object.keys(actionLabels) as DemoAction[]).map((action) => (
          <button
            key={action}
            type="button"
            disabled={isRunning}
            onClick={() => runDemo(action)}
            className="rounded-md bg-[#38BDF8] px-5 py-3 text-sm font-semibold text-[#070B12] transition hover:bg-[#7DD3FC] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isRunning && activeAction === action ? (
              <span className="inline-flex items-center gap-2">
                <Spinner />
                Démo en cours...
              </span>
            ) : (
              actionLabels[action]
            )}
          </button>
        ))}
      </div>

      {error ? (
        <p className="mt-5 rounded-md border border-[#7f1d1d] bg-[#450a0a] px-4 py-3 text-sm leading-6 text-[#fecaca]">
          {error}
        </p>
      ) : null}

      <div className="mt-6 grid gap-5 xl:grid-cols-[1fr_0.9fr]">
        <div className="space-y-5">
          <div className="rounded-lg border border-[#223149] bg-[#111D2E] p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#7DD3FC]">
                  Progression agent
                </p>
                <h3 className="mt-2 text-xl font-semibold text-[#F4F7FB]">
                  {activeAction
                    ? actionLabels[activeAction]
                    : "En attente d’un test reviewer"}
                </h3>
              </div>
              {isRunning ? <Spinner /> : null}
            </div>

            <div className="mt-5 grid gap-3">
              {activeSteps.map((step, index) => (
                <div
                  key={step.label}
                  className="rounded-md border border-[#223149] bg-[#0F1724] px-4 py-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-[#F4F7FB]">
                        {step.label}
                      </p>
                      <p className="mt-1 text-xs text-[#9EADBF]">
                        Durée simulée : {step.duration}
                      </p>
                    </div>
                    <StepBadge status={getStepStatus(index)} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-[#223149] bg-[#111D2E] p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#7DD3FC]">
                  Préparation média
                </p>
                <h3 className="mt-2 text-lg font-semibold text-[#F4F7FB]">
                  edifice_demo_short.mp4
                </h3>
                <p className="mt-1 text-sm text-[#9EADBF]">12.4 MB</p>
              </div>
              <span className="rounded-md border border-[#39E6D0]/35 bg-[#39E6D0]/10 px-2.5 py-1 text-xs font-semibold text-[#39E6D0]">
                Média préparé en dry-run
              </span>
            </div>
            <div className="mt-4">
              <ProgressBar value={uploadProgress} />
            </div>
            <p className="mt-2 text-xs text-[#9EADBF]">
              Upload simulé : {uploadProgress}%
            </p>
          </div>
        </div>

        <div className="space-y-5">
          <div className="rounded-lg border border-[#223149] bg-[#03070B] p-5">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#7DD3FC]">
              Terminal dry-run
            </p>
            <div className="mt-4 min-h-56 space-y-2 rounded-md border border-[#223149] bg-[#070B12] p-4 font-mono text-xs text-[#39E6D0]">
              {terminalLines.map((line, index) => (
                <p key={`${line}-${index}`} className="animate-pulse">
                  <span className="text-[#64748b]">
                    {String(index + 1).padStart(2, "0")}:
                  </span>{" "}
                  {line}
                </p>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-[#223149] bg-[#111D2E] p-5">
            <div className="overflow-hidden rounded-md border border-[#223149] bg-[#070B12]">
              <div className="flex aspect-video items-center justify-center bg-[#08111A]">
                <div className="text-center">
                  <div className="mx-auto mb-3 size-16 rounded-full border border-[#38BDF8]/40 bg-[#38BDF8]/10 shadow-[0_0_34px_rgba(56,189,248,0.25)]" />
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#7DD3FC]">
                    Cockpit preview
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-4 flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#7DD3FC]">
                  Aperçu publication fictive
                </p>
                <h3 className="mt-3 text-xl font-semibold text-[#F4F7FB]">
                  {showPreview ? preview.title : "Aperçu généré après test"}
                </h3>
              </div>
              <div className="flex flex-col gap-2">
                <span className="rounded-md border border-[#a78bfa]/40 bg-[#a78bfa]/10 px-2.5 py-1 text-xs font-semibold text-[#ddd6fe]">
                  Demo only
                </span>
                <span className="rounded-md border border-[#39E6D0]/35 bg-[#39E6D0]/10 px-2.5 py-1 text-xs font-semibold text-[#39E6D0]">
                  No real API call
                </span>
              </div>
            </div>

            <p className="mt-4 leading-7 text-[#9EADBF]">
              {showPreview
                ? preview.description
                : "Le contenu affiché ici restera fictif et limité au mode reviewer."}
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              {(showPreview ? preview.hashtags : ["#Demo", "#DryRun"]).map(
                (hashtag) => (
                  <span
                    key={hashtag}
                    className="rounded-md border border-[#223149] bg-[#0F1724] px-3 py-1.5 text-xs font-semibold text-[#7DD3FC]"
                  >
                    {hashtag}
                  </span>
                ),
              )}
            </div>
          </div>
        </div>
      </div>

      {showSuccess ? (
        <div className="mt-5 rounded-lg border border-[#39E6D0]/35 bg-[#39E6D0]/10 p-5">
          <p className="text-xl font-semibold text-[#39E6D0]">
            Simulation terminée — aucune publication réelle effectuée
          </p>
          <p className="mt-2 text-sm leading-6 text-[#D8DEE8]">
            Le parcours a été validé en environnement démo. Aucun token n’a été
            utilisé et aucun appel TikTok réel n’a été déclenché.
          </p>
        </div>
      ) : result ? (
        <p className="mt-5 rounded-md border border-[#39E6D0]/35 bg-[#39E6D0]/10 px-4 py-3 text-sm font-semibold text-[#39E6D0]">
          {result.finalMessage}
        </p>
      ) : null}
    </section>
  );
}
