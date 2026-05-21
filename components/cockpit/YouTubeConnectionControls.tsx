"use client";

import { useState } from "react";

type YouTubeStatus = "idle" | "checking" | "ready" | "incomplete";

const statusLabels: Record<YouTubeStatus, string> = {
  idle: "Non teste",
  checking: "Test en cours",
  ready: "Configuration YouTube valide",
  incomplete: "Configuration YouTube incomplete",
};

const statusClasses: Record<YouTubeStatus, string> = {
  idle: "border-[#64748b]/40 bg-[#64748b]/10 text-[#cbd5e1]",
  checking: "border-[#38BDF8]/40 bg-[#38BDF8]/10 text-[#7DD3FC]",
  ready: "border-[#39E6D0]/40 bg-[#39E6D0]/10 text-[#39E6D0]",
  incomplete: "border-[#f59e0b]/40 bg-[#f59e0b]/10 text-[#fbbf24]",
};

type YouTubeConnectionControlsProps = {
  startHref: string;
};

export function YouTubeConnectionControls({
  startHref,
}: YouTubeConnectionControlsProps) {
  const [status, setStatus] = useState<YouTubeStatus>("idle");

  async function testConfiguration() {
    setStatus("checking");

    try {
      const response = await fetch("/api/oauth/youtube/status", {
        method: "GET",
        cache: "no-store",
      });
      const payload = (await response.json()) as {
        ok?: boolean;
        status?: "ready" | "incomplete";
      };

      setStatus(response.ok && payload.ok ? "ready" : "incomplete");
    } catch {
      setStatus("incomplete");
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <a
        href={startHref}
        className="rounded-md border border-[#39E6D0]/50 bg-[#08111A] px-4 py-2 text-sm font-semibold text-[#39E6D0] transition hover:bg-[#1D2A44] hover:text-[#F8FAFC] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        Connecter YouTube
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
