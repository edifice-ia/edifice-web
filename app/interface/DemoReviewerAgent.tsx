"use client";

import { useMemo, useState } from "react";

type DemoResult = {
  status: "completed";
  title: string;
  description: string;
  targetedPlatforms: string[];
  logs: string[];
  approximateDurationMs: number;
  finalMessage: string;
};

const workflowSteps = [
  "Initialisation de l'agent demo",
  "Verification de l'environnement securise",
  "Generation du contenu de test",
  "Preparation multi-plateforme",
  "Verification anti-publication reelle",
  "Finalisation du resultat reviewer",
];

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function DemoReviewerAgent() {
  const [status, setStatus] = useState<"Pret" | "En cours" | "Termine" | "Erreur">(
    "Pret",
  );
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const [result, setResult] = useState<DemoResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canRun = status !== "En cours";
  const statusLabel = useMemo(() => {
    if (status === "Pret") {
      return "Pret";
    }

    return status;
  }, [status]);

  async function runDemoAgent() {
    setStatus("En cours");
    setProgress(0);
    setLogs([]);
    setResult(null);
    setError(null);

    try {
      const responsePromise = fetch("/api/agents/demo-publisher", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mode: "reviewer-demo",
          dryRun: true,
          reviewer: "platform-review",
        }),
      });

      for (const [index, step] of workflowSteps.entries()) {
        await wait(420);
        setLogs((currentLogs) => [...currentLogs, step]);
        setProgress(Math.round(((index + 1) / workflowSteps.length) * 85));
      }

      const response = await responsePromise;

      if (!response.ok) {
        throw new Error("L'agent demo a refuse la requete.");
      }

      const data = (await response.json()) as DemoResult;

      setResult(data);
      setProgress(100);
      setStatus("Termine");
    } catch {
      setError("Impossible de terminer l'agent demo. Aucun contenu n'a ete publie.");
      setProgress(0);
      setStatus("Erreur");
    }
  }

  return (
    <section className="rounded-lg border border-[#38BDF8]/45 bg-[#0F1724] p-6 shadow-[0_0_44px_rgba(56,189,248,0.12)]">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#7DD3FC]">
            Agent Demo Reviewer
          </p>
          <h2 className="mt-3 text-3xl font-semibold text-[#F4F7FB]">
            Preparation de publication de test
          </h2>
          <p className="mt-4 leading-7 text-[#9EADBF]">
            Prepare une publication de test sans diffusion reelle, afin de
            demontrer le fonctionnement du cockpit Edifice IA.
          </p>
          <p className="mt-4 rounded-md border border-[#223149] bg-[#111D2E] px-4 py-3 text-sm font-semibold text-[#7DD3FC]">
            Aucune publication reelle n&apos;est envoyee depuis ce mode demo.
          </p>
        </div>

        <button
          type="button"
          disabled={!canRun}
          onClick={runDemoAgent}
          className="rounded-md bg-[#38BDF8] px-5 py-3 text-sm font-semibold text-[#070B12] transition hover:bg-[#7DD3FC] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {status === "En cours" ? "Agent en cours..." : "Lancer l'agent demo"}
        </button>
      </div>

      <div className="mt-8 grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-lg border border-[#223149] bg-[#111D2E] p-5">
          <div className="flex items-center justify-between gap-4">
            <p className="font-semibold text-[#F4F7FB]">Statut : {statusLabel}</p>
            <p className="text-sm font-semibold text-[#7DD3FC]">{progress}%</p>
          </div>
          <div className="mt-4 h-3 overflow-hidden rounded-full bg-[#1E293B]">
            <div
              className="h-full rounded-full bg-[#38BDF8] transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="mt-5 space-y-3">
            <p className="text-sm uppercase tracking-[0.18em] text-[#9EADBF]">
              Logs d&apos;execution
            </p>
            <div className="min-h-52 rounded-md border border-[#223149] bg-[#070B12] p-4 font-mono text-sm leading-6 text-[#9EADBF]">
              {logs.length === 0 ? (
                <p>En attente du lancement de l&apos;agent demo.</p>
              ) : (
                logs.map((log) => (
                  <p key={log}>
                    <span className="text-[#38BDF8]">&gt;</span> {log}
                  </p>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-[#223149] bg-[#111D2E] p-5">
          <p className="text-sm uppercase tracking-[0.18em] text-[#9EADBF]">
            Resultat final
          </p>
          {error ? (
            <p className="mt-4 rounded-md border border-[#7f1d1d] bg-[#450a0a] px-4 py-3 text-sm text-[#fecaca]">
              {error}
            </p>
          ) : null}
          {result ? (
            <div className="mt-4 space-y-4">
              <div>
                <p className="text-sm text-[#9EADBF]">Titre genere</p>
                <p className="mt-1 text-xl font-semibold text-[#F4F7FB]">
                  {result.title}
                </p>
              </div>
              <div>
                <p className="text-sm text-[#9EADBF]">Description generee</p>
                <p className="mt-1 leading-7 text-[#F4F7FB]">
                  {result.description}
                </p>
              </div>
              <div>
                <p className="text-sm text-[#9EADBF]">Plateformes ciblees</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {result.targetedPlatforms.map((platform) => (
                    <span
                      key={platform}
                      className="rounded-md border border-[#223149] bg-[#1E293B] px-3 py-2 text-sm text-[#7DD3FC]"
                    >
                      {platform}
                    </span>
                  ))}
                </div>
              </div>
              <div className="rounded-md border border-[#223149] bg-[#070B12] p-4">
                <p className="text-sm text-[#9EADBF]">
                  Statut API : {result.status}
                </p>
                <p className="mt-1 text-sm text-[#9EADBF]">
                  Duree approximative : {result.approximateDurationMs} ms
                </p>
                <p className="mt-3 font-semibold text-[#7DD3FC]">
                  {result.finalMessage}
                </p>
              </div>
            </div>
          ) : (
            <p className="mt-4 leading-7 text-[#9EADBF]">
              Le resultat structure apparaitra ici apres execution de l&apos;API
              locale de demonstration.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
