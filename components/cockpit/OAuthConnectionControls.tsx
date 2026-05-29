"use client";

import { useState } from "react";

type OAuthStatusPayload = {
  present: boolean;
  storageEnabled: true;
  storageMode: "supabase";
  expiresAt: string | null;
  updatedAt: string | null;
};

type ControlStatus = "idle" | "checking" | "ready" | "incomplete";

const statusClasses: Record<ControlStatus, string> = {
  idle: "border-[#64748b]/40 bg-[#64748b]/10 text-[#cbd5e1]",
  checking: "border-[#38BDF8]/40 bg-[#38BDF8]/10 text-[#7DD3FC]",
  ready: "border-[#39E6D0]/40 bg-[#39E6D0]/10 text-[#39E6D0]",
  incomplete: "border-[#f59e0b]/40 bg-[#f59e0b]/10 text-[#fbbf24]",
};

const statusLabels: Record<ControlStatus, string> = {
  idle: "Non teste",
  checking: "Test en cours",
  ready: "Configuration OK",
  incomplete: "Configuration incomplete",
};

type OAuthConnectionControlsProps = {
  actionLabel: string;
  startHref: string;
  statusHref: string;
  disabled?: boolean;
  showInstagramGraphTest?: boolean;
};

export function OAuthConnectionControls({
  actionLabel,
  startHref,
  statusHref,
  disabled = false,
  showInstagramGraphTest = false,
}: OAuthConnectionControlsProps) {
  const [status, setStatus] = useState<ControlStatus>("idle");
  const [payload, setPayload] = useState<OAuthStatusPayload | null>(null);
  const [instagramPayload, setInstagramPayload] =
    useState<OAuthStatusPayload | null>(null);

  async function testConfiguration() {
    setStatus("checking");

    try {
      const response = await fetch(statusHref, {
        method: "GET",
        cache: "no-store",
      });
      const result = (await response.json()) as OAuthStatusPayload;

      setPayload(result);
      setStatus(response.ok && result.present ? "ready" : "incomplete");
    } catch {
      setPayload(null);
      setStatus("incomplete");
    }
  }

  async function testInstagramGraph() {
    try {
      const response = await fetch("/api/instagram/status", {
        method: "GET",
        cache: "no-store",
      });
      const result = (await response.json()) as OAuthStatusPayload;
      setInstagramPayload(result);
    } catch {
      setInstagramPayload(null);
    }
  }

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-3">
        {disabled ? (
          <button
            type="button"
            disabled
            className="rounded-md border border-[#1D2A44] bg-[#08111A] px-4 py-2 text-sm font-semibold text-[#64748b]"
          >
            {actionLabel}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => {
              window.location.href = startHref;
            }}
            className="rounded-md border border-[#39E6D0]/50 bg-[#08111A] px-4 py-2 text-sm font-semibold text-[#39E6D0] transition hover:bg-[#1D2A44] hover:text-[#F8FAFC] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            {actionLabel}
          </button>
        )}
        <button
          type="button"
          onClick={testConfiguration}
          className="rounded-md border border-[#1D2A44] px-4 py-2 text-sm font-semibold text-[#A7B0C0] transition hover:bg-[#08111A] hover:text-[#F8FAFC] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          Tester configuration
        </button>
        {showInstagramGraphTest ? (
          <button
            type="button"
            onClick={testInstagramGraph}
            className="rounded-md border border-[#1D2A44] px-4 py-2 text-sm font-semibold text-[#A7B0C0] transition hover:bg-[#08111A] hover:text-[#F8FAFC] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            Tester statut Instagram Graph
          </button>
        ) : null}
        <span
          className={`inline-flex rounded-md border px-2.5 py-1 text-xs font-semibold ${statusClasses[status]}`}
        >
          {statusLabels[status]}
        </span>
      </div>

      {showInstagramGraphTest ? (
        <div className="rounded-md border border-[#1D2A44] bg-[#08111A] p-3 text-sm text-[#A7B0C0]">
          <p>
            Meta OAuth :{" "}
            <span className="font-semibold text-[#F8FAFC]">
              {payload?.present ? "connecte" : "a connecter"}
            </span>
          </p>
          <p className="mt-1">Instagram Graph depend de Meta OAuth.</p>
        </div>
      ) : null}

      {payload ? <OAuthDiagnosticPanel payload={payload} /> : null}
      {instagramPayload ? (
        <OAuthDiagnosticPanel payload={instagramPayload} title="Instagram Graph" />
      ) : null}
    </div>
  );
}

function OAuthDiagnosticPanel({
  payload,
  title = "Diagnostic OAuth",
}: {
  payload: OAuthStatusPayload;
  title?: string;
}) {
  return (
    <div className="rounded-md border border-[#1D2A44] bg-[#08111A] p-3 text-sm text-[#A7B0C0]">
      <p className="font-semibold text-[#F8FAFC]">{title}</p>
      <div className="mt-3 grid gap-2">
        <p>
          Token present :{" "}
          <span className="font-semibold text-[#F8FAFC]">
            {payload.present ? "oui" : "non"}
          </span>
        </p>
        <p>
          Stockage :{" "}
          <span className="font-semibold text-[#F8FAFC]">
            {payload.storageMode}
          </span>
        </p>
        <p>
          Expiration connue :{" "}
          <span className="font-semibold text-[#F8FAFC]">
            {payload.expiresAt ?? "non"}
          </span>
        </p>
        <p>
          Derniere mise a jour :{" "}
          <span className="font-semibold text-[#F8FAFC]">
            {payload.updatedAt ?? "non"}
          </span>
        </p>
      </div>
    </div>
  );
}
