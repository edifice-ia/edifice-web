"use client";

import { useState } from "react";

type TikTokStatusPayload = {
  present: boolean;
  storageEnabled: true;
  storageMode: "supabase";
  expiresAt: string | null;
  updatedAt: string | null;
};

type TikTokStatus = "idle" | "checking" | "ready" | "incomplete";

const statusClasses: Record<TikTokStatus, string> = {
  idle: "border-[#64748b]/40 bg-[#64748b]/10 text-[#cbd5e1]",
  checking: "border-[#38BDF8]/40 bg-[#38BDF8]/10 text-[#7DD3FC]",
  ready: "border-[#39E6D0]/40 bg-[#39E6D0]/10 text-[#39E6D0]",
  incomplete: "border-[#f59e0b]/40 bg-[#f59e0b]/10 text-[#fbbf24]",
};

const statusLabels: Record<TikTokStatus, string> = {
  idle: "Non teste",
  checking: "Test en cours",
  ready: "Configuration OK",
  incomplete: "Configuration incomplete",
};

export function TikTokConnectionControls() {
  const [status, setStatus] = useState<TikTokStatus>("idle");
  const [payload, setPayload] = useState<TikTokStatusPayload | null>(null);

  async function testConfiguration() {
    setStatus("checking");

    try {
      const response = await fetch("/api/oauth/tiktok/status", {
        method: "GET",
        cache: "no-store",
      });
      const result = (await response.json()) as TikTokStatusPayload;

      setPayload(result);
      setStatus(response.ok && result.present ? "ready" : "incomplete");
    } catch {
      setPayload(null);
      setStatus("incomplete");
    }
  }

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => {
            window.location.href = "/api/oauth/tiktok/start";
          }}
          className="rounded-md border border-[#39E6D0]/50 bg-[#08111A] px-4 py-2 text-sm font-semibold text-[#39E6D0] transition hover:bg-[#1D2A44] hover:text-[#F8FAFC] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          Connecter TikTok Sandbox
        </button>
        <button
          type="button"
          onClick={testConfiguration}
          className="rounded-md border border-[#1D2A44] px-4 py-2 text-sm font-semibold text-[#A7B0C0] transition hover:bg-[#08111A] hover:text-[#F8FAFC] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          Tester configuration TikTok
        </button>
        <span
          className={`inline-flex rounded-md border px-2.5 py-1 text-xs font-semibold ${statusClasses[status]}`}
        >
          {statusLabels[status]}
        </span>
      </div>

      {payload ? (
        <div className="rounded-md border border-[#1D2A44] bg-[#08111A] p-3 text-sm text-[#A7B0C0]">
          <div className="grid gap-2">
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
      ) : null}
    </div>
  );
}
