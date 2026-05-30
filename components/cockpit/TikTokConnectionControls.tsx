"use client";

import { useState } from "react";

type TikTokStatusPayload = {
  present: boolean;
  storageEnabled: true;
  storageMode: "supabase";
  expiresAt: string | null;
  updatedAt: string | null;
};

type TikTokUploadPayload = {
  ok: boolean;
  status: string;
  label: string;
  publishId?: string | null;
  transferMode?: "FILE_UPLOAD" | "PULL_FROM_URL";
  logs?: string[];
  error?: {
    code?: string;
    message?: string;
    logId?: string;
  };
};

type TikTokStatus = "idle" | "checking" | "ready" | "incomplete";
type TikTokUploadStatus = "idle" | "uploading" | "success" | "error";

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

const uploadStatusClasses: Record<TikTokUploadStatus, string> = {
  idle: "border-[#64748b]/40 bg-[#64748b]/10 text-[#cbd5e1]",
  uploading: "border-[#38BDF8]/40 bg-[#38BDF8]/10 text-[#7DD3FC]",
  success: "border-[#39E6D0]/40 bg-[#39E6D0]/10 text-[#39E6D0]",
  error: "border-[#ef4444]/40 bg-[#ef4444]/10 text-[#fecaca]",
};

const uploadStatusLabels: Record<TikTokUploadStatus, string> = {
  idle: "Upload non teste",
  uploading: "Upload Sandbox en cours",
  success: "Upload Sandbox reussi",
  error: "Upload Sandbox en erreur",
};

export function TikTokConnectionControls() {
  const [status, setStatus] = useState<TikTokStatus>("idle");
  const [payload, setPayload] = useState<TikTokStatusPayload | null>(null);
  const [uploadStatus, setUploadStatus] = useState<TikTokUploadStatus>("idle");
  const [uploadPayload, setUploadPayload] =
    useState<TikTokUploadPayload | null>(null);

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

  async function testSandboxUpload() {
    setUploadStatus("uploading");
    setUploadPayload(null);

    try {
      const response = await fetch("/api/oauth/tiktok/upload-test", {
        method: "POST",
        cache: "no-store",
      });
      const result = (await response.json()) as TikTokUploadPayload;

      setUploadPayload(result);
      setUploadStatus(response.ok && result.ok ? "success" : "error");
    } catch {
      setUploadPayload({
        ok: false,
        status: "request_failed",
        label: "Impossible de joindre la route de test upload Sandbox.",
        logs: ["Aucun secret expose cote interface."],
      });
      setUploadStatus("error");
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
        <button
          type="button"
          onClick={testSandboxUpload}
          disabled={uploadStatus === "uploading"}
          className="rounded-md border border-[#f59e0b]/50 bg-[#f59e0b]/10 px-4 py-2 text-sm font-semibold text-[#fbbf24] transition hover:bg-[#1D2A44] hover:text-[#F8FAFC] disabled:border-[#1D2A44] disabled:bg-[#08111A] disabled:text-[#64748b] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          Tester upload Sandbox
        </button>
        <span
          className={`inline-flex rounded-md border px-2.5 py-1 text-xs font-semibold ${statusClasses[status]}`}
        >
          {statusLabels[status]}
        </span>
        <span
          className={`inline-flex rounded-md border px-2.5 py-1 text-xs font-semibold ${uploadStatusClasses[uploadStatus]}`}
        >
          {uploadStatusLabels[uploadStatus]}
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

      {uploadPayload ? (
        <div className="rounded-md border border-[#1D2A44] bg-[#08111A] p-3 text-sm text-[#A7B0C0]">
          <div className="grid gap-2">
            <p>
              Statut upload :{" "}
              <span className="font-semibold text-[#F8FAFC]">
                {uploadPayload.label}
              </span>
            </p>
            {uploadPayload.transferMode ? (
              <p>
                Mode :{" "}
                <span className="font-semibold text-[#F8FAFC]">
                  {uploadPayload.transferMode}
                </span>
              </p>
            ) : null}
            {uploadPayload.publishId ? (
              <p>
                Publish ID :{" "}
                <span className="font-semibold text-[#F8FAFC]">
                  {uploadPayload.publishId}
                </span>
              </p>
            ) : null}
            {uploadPayload.error?.code ? (
              <p>
                Code TikTok :{" "}
                <span className="font-semibold text-[#F8FAFC]">
                  {uploadPayload.error.code}
                </span>
              </p>
            ) : null}
            {uploadPayload.logs?.length ? (
              <div>
                <p className="font-semibold text-[#F8FAFC]">
                  Logs non sensibles
                </p>
                <ul className="mt-2 grid gap-1">
                  {uploadPayload.logs.map((log) => (
                    <li key={log}>{log}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
