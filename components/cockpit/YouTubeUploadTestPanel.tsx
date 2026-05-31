"use client";

import { useState } from "react";

type ScopeDiagnostic = {
  expected: string[];
  granted: string[];
  missing: string[];
  source?: "tokeninfo" | "stored_scope";
  isValid?: boolean | null;
  expiresAt?: string | null;
  error?: { code?: string | number; message?: string } | null;
};

type YouTubeStatusPayload = {
  present: boolean;
  connected?: boolean;
  storageMode?: "supabase";
  expiresAt?: string | null;
  token?: {
    present: boolean;
    storageMode: "supabase";
    expiresAt: string | null;
  };
  channelDetected?: boolean;
  channelTitle?: string | null;
  channelId?: string | null;
  scopes?: ScopeDiagnostic;
  logs?: string[];
  error?: unknown;
};

type UploadPayload = {
  ok: boolean;
  status: string;
  success?: boolean;
  videoId?: string;
  title?: string;
  privacyStatus?: string;
  url?: string;
  videoUrl?: string;
  logs?: string[];
  scopes?: ScopeDiagnostic;
  channel?: {
    detected: boolean;
    id?: string;
    title?: string;
  };
  error?: unknown;
};

type RequestStatus = "idle" | "loading" | "success" | "error";

const statusClasses: Record<RequestStatus, string> = {
  idle: "border-[#64748b]/40 bg-[#64748b]/10 text-[#cbd5e1]",
  loading: "border-[#38BDF8]/40 bg-[#38BDF8]/10 text-[#7DD3FC]",
  success: "border-[#39E6D0]/40 bg-[#39E6D0]/10 text-[#39E6D0]",
  error: "border-[#ef4444]/40 bg-[#ef4444]/10 text-[#fecaca]",
};

export function YouTubeUploadTestPanel() {
  const [statusState, setStatusState] = useState<RequestStatus>("idle");
  const [uploadState, setUploadState] = useState<RequestStatus>("idle");
  const [statusPayload, setStatusPayload] =
    useState<YouTubeStatusPayload | null>(null);
  const [uploadPayload, setUploadPayload] = useState<UploadPayload | null>(null);

  async function testConfiguration() {
    setStatusState("loading");
    setStatusPayload(null);

    try {
      const response = await fetch("/api/oauth/youtube/status", {
        method: "GET",
        cache: "no-store",
      });
      const payload = (await response.json()) as YouTubeStatusPayload;

      setStatusPayload(payload);
      setStatusState(response.ok && payload.present ? "success" : "error");
    } catch {
      setStatusPayload({
        present: false,
        connected: false,
        storageMode: "supabase",
        channelDetected: false,
        logs: ["Erreur reseau cote interface. Aucun secret expose."],
      });
      setStatusState("error");
    }
  }

  async function uploadTestVideo() {
    setUploadState("loading");
    setUploadPayload(null);

    try {
      const response = await fetch("/api/youtube/upload-test", {
        method: "POST",
        cache: "no-store",
      });
      const payload = (await response.json()) as UploadPayload;

      setUploadPayload(payload);
      setUploadState(response.ok && payload.ok ? "success" : "error");
    } catch {
      setUploadPayload({
        ok: false,
        status: "request_failed",
        logs: ["Erreur reseau cote interface. Aucun secret expose."],
        error: {
          code: "request_failed",
          message: "Impossible de joindre la route upload-test.",
        },
      });
      setUploadState("error");
    }
  }

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => {
            window.location.href = "/api/oauth/youtube/start";
          }}
          className="rounded-md border border-[#39E6D0]/50 bg-[#08111A] px-4 py-2 text-sm font-semibold text-[#39E6D0] transition hover:bg-[#111D2E] hover:text-[#F8FAFC] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          Connecter YouTube
        </button>
        <button
          type="button"
          onClick={testConfiguration}
          disabled={statusState === "loading"}
          className="rounded-md border border-[#1D2A44] bg-[#08111A] px-4 py-2 text-sm font-semibold text-[#A7B0C0] transition hover:bg-[#111D2E] hover:text-[#F8FAFC] disabled:text-[#64748b] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          Tester configuration YouTube
        </button>
        <button
          type="button"
          onClick={uploadTestVideo}
          disabled={uploadState === "loading"}
          className="rounded-md border border-[#f59e0b]/50 bg-[#f59e0b]/10 px-4 py-2 text-sm font-semibold text-[#fbbf24] transition hover:bg-[#111D2E] hover:text-[#F8FAFC] disabled:border-[#1D2A44] disabled:bg-[#08111A] disabled:text-[#64748b] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          Uploader video test YouTube
        </button>
        <StatusPill label="Configuration" status={statusState} />
        <StatusPill label="Upload" status={uploadState} />
      </div>

      {statusPayload ? <StatusPanel payload={statusPayload} /> : null}
      {uploadPayload ? <UploadPanel payload={uploadPayload} /> : null}

      <div className="rounded-md border border-[#1D2A44] bg-[#08111A] p-4 text-sm leading-6 text-[#A7B0C0]">
        <p className="font-semibold text-[#F8FAFC]">Garde-fous</p>
        <p className="mt-2">
          Les tokens, refresh tokens, client secrets et variables
          d&apos;environnement ne sont jamais affiches.
        </p>
        <p className="mt-2">
          La video de test est toujours creee en prive sur YouTube.
        </p>
      </div>
    </div>
  );
}

function StatusPill({
  label,
  status,
}: {
  label: string;
  status: RequestStatus;
}) {
  const labels: Record<RequestStatus, string> = {
    idle: "non teste",
    loading: "en cours",
    success: "ok",
    error: "erreur",
  };

  return (
    <span
      className={`inline-flex rounded-md border px-2.5 py-1 text-xs font-semibold ${statusClasses[status]}`}
    >
      {label}: {labels[status]}
    </span>
  );
}

function StatusPanel({ payload }: { payload: YouTubeStatusPayload }) {
  return (
    <div className="rounded-lg border border-[#1D2A44] bg-[#08111A] p-4 text-sm text-[#A7B0C0]">
      <h2 className="text-lg font-semibold text-[#F8FAFC]">
        Configuration YouTube
      </h2>
      <div className="mt-4 grid gap-2 md:grid-cols-2">
        <InfoLine
          label="OAuth YouTube"
          value={payload.connected ? "connecte" : "non connecte"}
        />
        <InfoLine
          label="Token present"
          value={payload.present || payload.token?.present || false}
        />
        <InfoLine
          label="Stockage"
          value={payload.storageMode ?? payload.token?.storageMode ?? "supabase"}
        />
        <InfoLine
          label="Expiration connue"
          value={payload.expiresAt ?? payload.token?.expiresAt ?? "non"}
        />
        <InfoLine
          label="Chaine YouTube detectee"
          value={payload.channelDetected ?? false}
        />
        <InfoLine label="Nom de la chaine" value={payload.channelTitle ?? "non"} />
        <InfoLine label="Channel ID" value={payload.channelId ?? "non"} />
      </div>
      {payload.scopes ? <ScopesPanel scopes={payload.scopes} /> : null}
      <LogsPanel logs={payload.logs ?? []} />
      {payload.error ? <SafeJson title="Message YouTube" value={payload.error} /> : null}
    </div>
  );
}

function UploadPanel({ payload }: { payload: UploadPayload }) {
  return (
    <div className="rounded-lg border border-[#1D2A44] bg-[#08111A] p-4 text-sm text-[#A7B0C0]">
      <h2 className="text-lg font-semibold text-[#F8FAFC]">Resultat upload</h2>
      <div className="mt-4 grid gap-2 md:grid-cols-2">
        <InfoLine label="Success" value={payload.ok} />
        <InfoLine label="Video ID" value={payload.videoId ?? "non"} />
        <InfoLine label="Titre" value={payload.title ?? "non"} />
        <InfoLine label="Privacy status" value={payload.privacyStatus ?? "non"} />
        <InfoLine label="URL YouTube" value={payload.url ?? "non"} />
        <InfoLine
          label="Chaine"
          value={payload.channel?.title ?? payload.channel?.id ?? "non"}
        />
      </div>
      <ProgressSteps payload={payload} />
      {payload.scopes ? <ScopesPanel scopes={payload.scopes} /> : null}
      <LogsPanel logs={payload.logs ?? []} />
      {payload.error ? <SafeJson title="Erreur upload YouTube" value={payload.error} /> : null}
    </div>
  );
}

function ProgressSteps({ payload }: { payload: UploadPayload }) {
  const logs = payload.logs ?? [];
  const tokenRead = logs.some((log) => log.includes("Token YouTube lu"));
  const channelDetected = logs.some((log) => log.includes("Chaine YouTube"));
  const videoPrepared = logs.some((log) => log.includes("Video test preparee"));
  const uploadStarted = logs.some((log) => log.includes("Upload YouTube en cours"));
  const uploadSucceeded = logs.some((log) => log.includes("Upload YouTube reussi"));

  return (
    <div className="mt-4 rounded-md border border-[#1D2A44] bg-[#03070B] p-3">
      <p className="font-semibold text-[#F8FAFC]">Progression</p>
      <div className="mt-3 grid gap-2">
        <StepLine active={tokenRead} label="Token YouTube lu cote serveur" />
        <StepLine active={channelDetected} label="Chaine YouTube detectee" />
        <StepLine active={videoPrepared} label="Video test preparee" />
        <StepLine active={uploadStarted} label="Upload YouTube en cours" />
        <StepLine active={uploadSucceeded} label="Upload YouTube reussi" />
      </div>
    </div>
  );
}

function StepLine({ active, label }: { active: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span
        className={`h-2.5 w-2.5 rounded-full ${
          active ? "bg-[#39E6D0]" : "bg-[#1D2A44]"
        }`}
      />
      <span className={active ? "text-[#F8FAFC]" : "text-[#64748b]"}>
        {label}
      </span>
    </div>
  );
}

function InfoLine({
  label,
  value,
}: {
  label: string;
  value: string | boolean | number | null;
}) {
  return (
    <div className="rounded-md border border-[#1D2A44] bg-[#03070B] px-3 py-2">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#64748b]">
        {label}
      </p>
      <p className="mt-1 break-words font-semibold text-[#F8FAFC]">
        {typeof value === "boolean" ? (value ? "oui" : "non") : value ?? "non"}
      </p>
    </div>
  );
}

function ScopesPanel({ scopes }: { scopes: ScopeDiagnostic }) {
  return (
    <div className="mt-4 rounded-md border border-[#1D2A44] bg-[#03070B] p-3">
      <p className="font-semibold text-[#F8FAFC]">Scopes YouTube</p>
      <div className="mt-3 grid gap-2 md:grid-cols-3">
        <InfoLine label="Verification" value={scopes.source ?? "non"} />
        <InfoLine label="Token valide" value={scopes.isValid ?? "non"} />
        <InfoLine label="Expiration tokeninfo" value={scopes.expiresAt ?? "non"} />
      </div>
      <p className="mt-3 text-xs uppercase tracking-[0.14em] text-[#64748b]">
        attendus
      </p>
      <p className="mt-1 break-words">{scopes.expected.join(", ") || "non"}</p>
      <p className="mt-3 text-xs uppercase tracking-[0.14em] text-[#64748b]">
        obtenus
      </p>
      <p className="mt-1 break-words">{scopes.granted.join(", ") || "non"}</p>
      <p className="mt-3 text-xs uppercase tracking-[0.14em] text-[#64748b]">
        manquants
      </p>
      <p className="mt-1 break-words">{scopes.missing.join(", ") || "aucun"}</p>
      {scopes.error ? (
        <p className="mt-3 rounded-md border border-[#f59e0b]/30 bg-[#f59e0b]/10 px-3 py-2 text-[#fbbf24]">
          Tokeninfo indisponible: {scopes.error.message ?? scopes.error.code}
        </p>
      ) : null}
    </div>
  );
}

function LogsPanel({ logs }: { logs: string[] }) {
  return (
    <div className="mt-4 rounded-md border border-[#1D2A44] bg-[#03070B] p-3">
      <p className="font-semibold text-[#F8FAFC]">Logs non sensibles</p>
      <ul className="mt-2 grid gap-1">
        {logs.length > 0 ? (
          logs.map((log) => <li key={log}>{log}</li>)
        ) : (
          <li>Aucun log.</li>
        )}
      </ul>
    </div>
  );
}

function SafeJson({ title, value }: { title: string; value: unknown }) {
  return (
    <div className="mt-4">
      <p className="font-semibold text-[#F8FAFC]">{title}</p>
      <pre className="mt-2 overflow-auto rounded-md border border-[#1D2A44] bg-[#03070B] p-3 text-xs text-[#fbbf24]">
        {JSON.stringify(value, null, 2)}
      </pre>
    </div>
  );
}
