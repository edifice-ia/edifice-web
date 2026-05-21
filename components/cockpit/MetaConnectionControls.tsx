"use client";

import { useState } from "react";

type MetaStatus = "idle" | "checking" | "ok" | "missing_env" | "callback_inaccessible";
type InstagramStatus = MetaStatus | "waiting_permissions";

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

const instagramStatusLabels: Record<InstagramStatus, string> = {
  ...statusLabels,
  waiting_permissions: "En attente de permissions avancées",
};

const instagramStatusClasses: Record<InstagramStatus, string> = {
  ...statusClasses,
  waiting_permissions: "border-[#38BDF8]/40 bg-[#38BDF8]/10 text-[#7DD3FC]",
};

type MetaConnectionControlsProps = {
  metaConnected?: boolean;
  instagramScopesEnabled: boolean;
};

export function MetaConnectionControls({
  metaConnected = false,
  instagramScopesEnabled,
}: MetaConnectionControlsProps) {
  const [status, setStatus] = useState<MetaStatus>("idle");
  const [instagramStatus, setInstagramStatus] =
    useState<InstagramStatus>("waiting_permissions");

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

  async function testInstagramGraphStatus() {
    setInstagramStatus("checking");

    try {
      const response = await fetch("/api/meta/instagram/status", {
        method: "GET",
        cache: "no-store",
      });
      const payload = (await response.json()) as {
        ok?: boolean;
        missing?: string[];
        callbackAccessible?: boolean;
      };

      if (payload.ok) {
        setInstagramStatus("ok");
        return;
      }

      setInstagramStatus(
        payload.missing && payload.missing.length > 0
          ? "missing_env"
          : payload.callbackAccessible === false
            ? "callback_inaccessible"
            : "waiting_permissions",
      );
    } catch {
      setInstagramStatus("callback_inaccessible");
    }
  }

  return (
    <div className="grid gap-4">
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

      <div className="rounded-md border border-[#1D2A44] bg-[#08111A] p-3">
        <div className="grid gap-2 text-sm text-[#A7B0C0]">
          <p>
            Meta OAuth :{" "}
            <span className="font-semibold text-[#F8FAFC]">
              {metaConnected ? "connecté" : "à connecter"}
            </span>
          </p>
          <p>
            Instagram Graph API : en attente de permissions avancées.
          </p>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={testInstagramGraphStatus}
            className="rounded-md border border-[#1D2A44] px-4 py-2 text-sm font-semibold text-[#A7B0C0] transition hover:bg-[#0B1420] hover:text-[#F8FAFC] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            Tester statut Instagram Graph
          </button>
          {instagramScopesEnabled ? (
            <a
              href="/api/meta/start"
              className="rounded-md border border-[#38BDF8]/50 px-4 py-2 text-sm font-semibold text-[#7DD3FC] transition hover:bg-[#0B1420] hover:text-[#F8FAFC] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              Activer test scopes Instagram
            </a>
          ) : null}
          <span
            className={`inline-flex rounded-md border px-2.5 py-1 text-xs font-semibold ${instagramStatusClasses[instagramStatus]}`}
          >
            {instagramStatusLabels[instagramStatus]}
          </span>
        </div>
      </div>
    </div>
  );
}
