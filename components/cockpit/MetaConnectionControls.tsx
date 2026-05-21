"use client";

import { useState } from "react";

type MetaStatus = "idle" | "checking" | "ok" | "missing_env" | "callback_inaccessible";

const statusLabels: Record<MetaStatus, string> = {
  idle: "Non testé",
  checking: "Test en cours",
  ok: "OK",
  missing_env: "Missing ENV",
  callback_inaccessible: "Callback inaccessible",
};

const statusClasses: Record<MetaStatus, string> = {
  idle: "border-[#64748b]/40 bg-[#64748b]/10 text-[#cbd5e1]",
  checking: "border-[#38BDF8]/40 bg-[#38BDF8]/10 text-[#7DD3FC]",
  ok: "border-[#39E6D0]/40 bg-[#39E6D0]/10 text-[#39E6D0]",
  missing_env: "border-[#f59e0b]/40 bg-[#f59e0b]/10 text-[#fbbf24]",
  callback_inaccessible: "border-[#ef4444]/40 bg-[#ef4444]/10 text-[#fecaca]",
};

export function MetaConnectionControls() {
  const [status, setStatus] = useState<MetaStatus>("idle");

  async function testConfiguration() {
    setStatus("checking");

    try {
      const response = await fetch("/api/meta/status", {
        method: "GET",
        cache: "no-store",
      });
      const payload = (await response.json()) as {
        status?: MetaStatus;
        ok?: boolean;
      };

      if (payload.ok) {
        setStatus("ok");
        return;
      }

      setStatus(
        payload.status === "missing_env" ||
          payload.status === "callback_inaccessible"
          ? payload.status
          : "callback_inaccessible",
      );
    } catch {
      setStatus("callback_inaccessible");
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <a
        href="/api/meta/start"
        className="rounded-md border border-[#39E6D0]/50 bg-[#08111A] px-4 py-2 text-sm font-semibold text-[#39E6D0] transition hover:bg-[#1D2A44] hover:text-[#F8FAFC] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        Connecter Meta
      </a>
      <button
        type="button"
        onClick={testConfiguration}
        className="rounded-md border border-[#1D2A44] px-4 py-2 text-sm font-semibold text-[#A7B0C0] transition hover:bg-[#08111A] hover:text-[#F8FAFC] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        Tester la configuration
      </button>
      <span
        className={`inline-flex rounded-md border px-2.5 py-1 text-xs font-semibold ${statusClasses[status]}`}
      >
        {statusLabels[status]}
      </span>
    </div>
  );
}
