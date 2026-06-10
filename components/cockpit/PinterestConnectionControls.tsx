"use client";

import { useState } from "react";

type PinterestTestPayload = {
  connected: boolean;
  accountKey?: string;
  tokenExpired: boolean;
  accountName: string | null;
  accountId: string | null;
  boardsCount: number;
  scopesDetected: string[];
  scopesRequested?: string[];
  scopesMissing?: string[];
  errorMessage: string | null;
};

type TestState = "idle" | "checking" | "connected" | "disconnected" | "expired";

const stateLabels: Record<TestState, string> = {
  idle: "Non teste",
  checking: "Test en cours",
  connected: "Connecte",
  disconnected: "Non connecte",
  expired: "Token expire",
};

const stateClasses: Record<TestState, string> = {
  idle: "border-[#64748b]/40 bg-[#64748b]/10 text-[#cbd5e1]",
  checking: "border-[#38BDF8]/40 bg-[#38BDF8]/10 text-[#7DD3FC]",
  connected: "border-[#39E6D0]/40 bg-[#39E6D0]/10 text-[#39E6D0]",
  disconnected: "border-[#f59e0b]/40 bg-[#f59e0b]/10 text-[#fbbf24]",
  expired: "border-[#ef4444]/40 bg-[#ef4444]/10 text-[#fecaca]",
};

type PinterestConnectionAccount = {
  accountKey: string;
  label: string;
};

const pinterestAccounts: PinterestConnectionAccount[] = [
  {
    accountKey: "edifice_discipline",
    label: "Pinterest - Edifice Discipline",
  },
  {
    accountKey: "solution_sommeil",
    label: "Pinterest - Solution Sommeil",
  },
];

function PinterestAccountConnectionControls({ account }: { account: PinterestConnectionAccount }) {
  const [state, setState] = useState<TestState>("idle");
  const [payload, setPayload] = useState<PinterestTestPayload | null>(null);
  const scopesRequested = payload?.scopesRequested ?? [];
  const scopesMissing = payload?.scopesMissing ?? [];
  const needsExtendedReconnect = scopesMissing.includes("boards:write");

  function reconnect() {
    window.location.href = `/api/auth/pinterest/start?account_key=${encodeURIComponent(
      account.accountKey,
    )}`;
  }

  async function testConfiguration() {
    setState("checking");

    try {
      const response = await fetch(
        `/api/auth/pinterest/test?account_key=${encodeURIComponent(account.accountKey)}`,
        {
          method: "GET",
          cache: "no-store",
        },
      );
      const result = (await response.json()) as PinterestTestPayload;
      setPayload(result);
      setState(
        result.tokenExpired
          ? "expired"
          : response.ok && result.connected
            ? "connected"
            : "disconnected",
      );
    } catch {
      setPayload({
        connected: false,
        tokenExpired: false,
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
    <div className="grid gap-4 rounded-md border border-[#1D2A44] bg-[#08111A] p-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-semibold text-[#F8FAFC]">{account.label}</p>
        <span
          className={`inline-flex rounded-md border px-2.5 py-1 text-xs font-semibold ${stateClasses[state]}`}
        >
          {stateLabels[state]}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={reconnect}
          className="rounded-md border border-[#39E6D0]/50 bg-[#08111A] px-4 py-2 text-sm font-semibold text-[#39E6D0] transition hover:bg-[#1D2A44] hover:text-[#F8FAFC]"
        >
          {payload?.connected ? "Reconnecter Pinterest" : "Connecter Pinterest"}
        </button>
        {needsExtendedReconnect ? (
          <button
            type="button"
            onClick={reconnect}
            className="rounded-md border border-[#f59e0b]/50 bg-[#f59e0b]/10 px-4 py-2 text-sm font-semibold text-[#fbbf24] transition hover:bg-[#111D2E] hover:text-[#F8FAFC]"
          >
            Reconnecter avec permissions étendues
          </button>
        ) : null}
        <button
          type="button"
          disabled={state === "checking"}
          onClick={testConfiguration}
          className="rounded-md border border-[#1D2A44] px-4 py-2 text-sm font-semibold text-[#A7B0C0] transition hover:bg-[#08111A] hover:text-[#F8FAFC] disabled:opacity-50"
        >
          Tester configuration
        </button>
      </div>

      {payload ? (
        <div className="text-sm text-[#A7B0C0]">
          <div className="grid gap-2">
            <p>
              Connexion :{" "}
              <span className="font-semibold text-[#F8FAFC]">
                {payload.tokenExpired
                  ? "Token expire"
                  : payload.connected
                    ? "Connecte"
                    : "Non connecte"}
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
              Scopes demandes :{" "}
              <span className="font-semibold text-[#F8FAFC]">
                {scopesRequested.length > 0
                  ? scopesRequested.join(", ")
                  : "non detectes"}
              </span>
            </p>
            <p>
              Scopes accordes :{" "}
              <span className="font-semibold text-[#F8FAFC]">
                {payload.scopesDetected.length > 0
                  ? payload.scopesDetected.join(", ")
                  : "non detectes"}
              </span>
            </p>
            <p>
              Scopes manquants :{" "}
              <span
                className={`font-semibold ${
                  scopesMissing.length > 0 ? "text-[#fbbf24]" : "text-[#39E6D0]"
                }`}
              >
                {scopesMissing.length > 0 ? scopesMissing.join(", ") : "aucun"}
              </span>
            </p>
          </div>
          {needsExtendedReconnect ? (
            <p className="mt-3 rounded-md border border-[#f59e0b]/30 bg-[#f59e0b]/10 px-3 py-2 text-[#fbbf24]">
              boards:write est absent du token. Reconnecte ce compte avec les
              permissions etendues avant de publier.
            </p>
          ) : null}
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

export function PinterestConnectionControls() {
  return (
    <div className="grid gap-3">
      {pinterestAccounts.map((account) => (
        <PinterestAccountConnectionControls
          key={account.accountKey}
          account={account}
        />
      ))}
    </div>
  );
}
