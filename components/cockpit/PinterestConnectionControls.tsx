"use client";

import { useState } from "react";

type PinterestTestPayload = {
  connected: boolean;
  accountName: string | null;
  accountId: string | null;
  boardsCount: number;
  scopesDetected: string[];
  errorMessage: string | null;
};

type TestState = "idle" | "checking" | "connected" | "disconnected";

const stateLabels: Record<TestState, string> = {
  idle: "Non teste",
  checking: "Test en cours",
  connected: "Connecte",
  disconnected: "Non connecte",
};

const stateClasses: Record<TestState, string> = {
  idle: "border-[#64748b]/40 bg-[#64748b]/10 text-[#cbd5e1]",
  checking: "border-[#38BDF8]/40 bg-[#38BDF8]/10 text-[#7DD3FC]",
  connected: "border-[#39E6D0]/40 bg-[#39E6D0]/10 text-[#39E6D0]",
  disconnected: "border-[#f59e0b]/40 bg-[#f59e0b]/10 text-[#fbbf24]",
};

export function PinterestConnectionControls() {
  const [state, setState] = useState<TestState>("idle");
  const [payload, setPayload] = useState<PinterestTestPayload | null>(null);

  async function testConfiguration() {
    setState("checking");

    try {
      const response = await fetch("/api/oauth/pinterest/test", {
        method: "GET",
        cache: "no-store",
      });
      const result = (await response.json()) as PinterestTestPayload;
      setPayload(result);
      setState(response.ok && result.connected ? "connected" : "disconnected");
    } catch {
      setPayload({
        connected: false,
        accountName: null,
        accountId: null,
        boardsCount: 0,
        scopesDetected: [],
        errorMessage: "Impossible de joindre le test OAuth Pinterest.",
      });
      setState("disconnected");
    }
  }

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => {
            window.location.href = "/api/oauth/pinterest/start";
          }}
          className="rounded-md border border-[#39E6D0]/50 bg-[#08111A] px-4 py-2 text-sm font-semibold text-[#39E6D0] transition hover:bg-[#1D2A44] hover:text-[#F8FAFC]"
        >
          {payload?.connected ? "Reconnecter Pinterest" : "Connecter Pinterest"}
        </button>
        <button
          type="button"
          disabled={state === "checking"}
          onClick={testConfiguration}
          className="rounded-md border border-[#1D2A44] px-4 py-2 text-sm font-semibold text-[#A7B0C0] transition hover:bg-[#08111A] hover:text-[#F8FAFC] disabled:opacity-50"
        >
          Tester configuration
        </button>
        <span
          className={`inline-flex rounded-md border px-2.5 py-1 text-xs font-semibold ${stateClasses[state]}`}
        >
          {stateLabels[state]}
        </span>
      </div>

      {payload ? (
        <div className="rounded-md border border-[#1D2A44] bg-[#08111A] p-3 text-sm text-[#A7B0C0]">
          <div className="grid gap-2">
            <p>
              Connexion :{" "}
              <span className="font-semibold text-[#F8FAFC]">
                {payload.connected ? "Connecte" : "Non connecte"}
              </span>
            </p>
            <p>
              Compte Pinterest :{" "}
              <span className="font-semibold text-[#F8FAFC]">
                {payload.accountName ?? payload.accountId ?? "non detecte"}
              </span>
            </p>
            <p>
              Tableaux accessibles :{" "}
              <span className="font-semibold text-[#F8FAFC]">{payload.boardsCount}</span>
            </p>
            <p>
              Scopes detectes :{" "}
              <span className="font-semibold text-[#F8FAFC]">
                {payload.scopesDetected.length > 0
                  ? payload.scopesDetected.join(", ")
                  : "non detectes"}
              </span>
            </p>
          </div>
          {payload.errorMessage ? (
            <p className="mt-3 rounded-md border border-[#f59e0b]/30 bg-[#f59e0b]/10 px-3 py-2 text-[#fbbf24]">
              {payload.errorMessage}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
