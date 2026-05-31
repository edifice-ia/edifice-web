"use client";

import { useState } from "react";

type StatusPayload = {
  ok: boolean;
  token: {
    present: boolean;
    storageMode: "supabase";
    expiresAt: string | null;
  };
  graphApiCalled: boolean;
  graphApiSucceeded?: boolean;
  facebookPageFound: boolean;
  instagramBusinessAccountFound: boolean;
  instagramBusinessId: string | null;
  instagramUsername: string | null;
  scopes: {
    expected: string[];
    granted: string[];
    missing: string[];
    isValid?: boolean | null;
    expiresAt?: string | null;
    source?: "debug_token" | "stored_scope";
    error?: { code?: string | number; message?: string } | null;
  };
  logs: string[];
  error?: unknown;
};

type PublishPayload = {
  ok: boolean;
  status: string;
  containerStatusCode?: "IN_PROGRESS" | "FINISHED" | "ERROR" | string;
  creationId?: string;
  mediaId?: string;
  videoUrl?: string;
  instagramBusinessId?: string;
  instagramUsername?: string | null;
  caption?: string;
  logs?: string[];
  scopes?: {
    expected: string[];
    granted: string[];
    missing: string[];
    isValid?: boolean | null;
    expiresAt?: string | null;
    source?: "debug_token" | "stored_scope";
    error?: { code?: string | number; message?: string } | null;
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

export function InstagramPublishTestPanel() {
  const [configStatus, setConfigStatus] = useState<RequestStatus>("idle");
  const [publishStatus, setPublishStatus] = useState<RequestStatus>("idle");
  const [configPayload, setConfigPayload] = useState<StatusPayload | null>(null);
  const [publishPayload, setPublishPayload] = useState<PublishPayload | null>(
    null,
  );

  async function testConfiguration() {
    setConfigStatus("loading");
    setConfigPayload(null);

    try {
      const response = await fetch("/api/meta/instagram/status", {
        method: "GET",
        cache: "no-store",
      });
      const payload = (await response.json()) as StatusPayload;

      setConfigPayload(payload);
      setConfigStatus(response.ok && payload.ok ? "success" : "error");
    } catch {
      setConfigPayload({
        ok: false,
        token: {
          present: false,
          storageMode: "supabase",
          expiresAt: null,
        },
        graphApiCalled: false,
        facebookPageFound: false,
        instagramBusinessAccountFound: false,
        instagramBusinessId: null,
        instagramUsername: null,
        scopes: {
          expected: [],
          granted: [],
          missing: [],
          isValid: null,
          expiresAt: null,
          source: "debug_token",
          error: null,
        },
        logs: ["Erreur reseau cote interface. Aucun secret expose."],
      });
      setConfigStatus("error");
    }
  }

  async function publishTestPost() {
    setPublishStatus("loading");
    setPublishPayload(null);

    try {
      const response = await fetch("/api/meta/instagram/publish-test", {
        method: "POST",
        cache: "no-store",
      });
      const payload = (await response.json()) as PublishPayload;

      setPublishPayload(payload);
      setPublishStatus(response.ok && payload.ok ? "success" : "error");
    } catch {
      setPublishPayload({
        ok: false,
        status: "request_failed",
        logs: ["Erreur reseau cote interface. Aucun secret expose."],
        error: {
          code: "request_failed",
          message: "Impossible de joindre la route publish-test.",
        },
      });
      setPublishStatus("error");
    }
  }

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={testConfiguration}
          disabled={configStatus === "loading"}
          className="rounded-md border border-[#1D2A44] bg-[#08111A] px-4 py-2 text-sm font-semibold text-[#A7B0C0] transition hover:bg-[#111D2E] hover:text-[#F8FAFC] disabled:text-[#64748b] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          Tester configuration Instagram
        </button>
        <button
          type="button"
          onClick={publishTestPost}
          disabled={publishStatus === "loading"}
          className="rounded-md border border-[#39E6D0]/50 bg-[#39E6D0]/10 px-4 py-2 text-sm font-semibold text-[#39E6D0] transition hover:bg-[#111D2E] hover:text-[#F8FAFC] disabled:border-[#1D2A44] disabled:bg-[#08111A] disabled:text-[#64748b] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          Publier post test Instagram
        </button>
        <StatusPill label="Configuration" status={configStatus} />
        <StatusPill label="Publication" status={publishStatus} />
      </div>

      {configPayload ? <ConfigurationPanel payload={configPayload} /> : null}
      {publishPayload ? <PublishPanel payload={publishPayload} /> : null}

      <div className="rounded-md border border-[#1D2A44] bg-[#08111A] p-4 text-sm leading-6 text-[#A7B0C0]">
        <p className="font-semibold text-[#F8FAFC]">Garde-fous</p>
        <p className="mt-2">
          Les tokens, refresh tokens, client secrets et variables
          d&apos;environnement ne sont jamais affiches dans cette interface.
        </p>
        <p className="mt-2">
          La publication utilise une URL publique de test et le token Meta
          stocke cote serveur.
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

function ConfigurationPanel({ payload }: { payload: StatusPayload }) {
  return (
    <div className="rounded-lg border border-[#1D2A44] bg-[#08111A] p-4 text-sm text-[#A7B0C0]">
      <h2 className="text-lg font-semibold text-[#F8FAFC]">
        Configuration Instagram
      </h2>
      <div className="mt-4 grid gap-2 md:grid-cols-2">
        <InfoLine label="Token Meta present" value={payload.token.present} />
        <InfoLine label="Stockage" value={payload.token.storageMode} />
        <InfoLine
          label="Expiration connue"
          value={payload.token.expiresAt ?? "non"}
        />
        <InfoLine label="Appel Graph API" value={payload.graphApiCalled} />
        <InfoLine
          label="Page Facebook trouvee"
          value={payload.facebookPageFound}
        />
        <InfoLine
          label="Compte Instagram Business associe"
          value={payload.instagramBusinessAccountFound}
        />
        <InfoLine
          label="Instagram Business ID"
          value={payload.instagramBusinessId ?? "non"}
        />
        <InfoLine
          label="Instagram username"
          value={payload.instagramUsername ?? "non"}
        />
      </div>
      <ScopesPanel scopes={payload.scopes} />
      <LogsPanel logs={payload.logs} />
      {payload.error ? <SafeJson title="Erreur Graph API" value={payload.error} /> : null}
    </div>
  );
}

function PublishPanel({ payload }: { payload: PublishPayload }) {
  return (
    <div className="rounded-lg border border-[#1D2A44] bg-[#08111A] p-4 text-sm text-[#A7B0C0]">
      <h2 className="text-lg font-semibold text-[#F8FAFC]">
        Resultat publication
      </h2>
      <div className="mt-4 grid gap-2 md:grid-cols-2">
        <InfoLine label="Succes" value={payload.ok} />
        <InfoLine label="Statut" value={payload.status} />
        <InfoLine
          label="Statut container"
          value={payload.containerStatusCode ?? "non"}
        />
        <InfoLine label="Creation ID" value={payload.creationId ?? "non"} />
        <InfoLine label="Media ID" value={payload.mediaId ?? "non"} />
        <InfoLine
          label="Instagram Business ID"
          value={payload.instagramBusinessId ?? "non"}
        />
        <InfoLine
          label="Instagram username"
          value={payload.instagramUsername ?? "non"}
        />
        <InfoLine label="Video publique" value={payload.videoUrl ?? "non"} />
        <InfoLine label="Legende" value={payload.caption ?? "non"} />
      </div>
      {payload.scopes ? <ScopesPanel scopes={payload.scopes} /> : null}
      <PublicationSteps payload={payload} />
      <LogsPanel logs={payload.logs ?? []} />
      {payload.error ? <SafeJson title="Message Graph API" value={payload.error} /> : null}
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

function PublicationSteps({ payload }: { payload: PublishPayload }) {
  const containerCreated = Boolean(payload.creationId);
  const inProgress =
    payload.containerStatusCode === "IN_PROGRESS" ||
    payload.status === "container_not_ready" ||
    containerCreated;
  const publishing =
    payload.containerStatusCode === "FINISHED" ||
    payload.status === "publish_failed" ||
    payload.ok;
  const published = payload.ok && Boolean(payload.mediaId);

  return (
    <div className="mt-4 rounded-md border border-[#1D2A44] bg-[#03070B] p-3">
      <p className="font-semibold text-[#F8FAFC]">Progression</p>
      <div className="mt-3 grid gap-2">
        <StepLine active={containerCreated} label="Container cree" />
        <StepLine
          active={inProgress}
          label="Traitement Instagram en cours..."
        />
        <StepLine active={publishing} label="Publication du Reel..." />
        <StepLine active={published} label="Publication reussie" />
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

function ScopesPanel({
  scopes,
}: {
  scopes: {
    expected: string[];
    granted: string[];
    missing: string[];
    isValid?: boolean | null;
    expiresAt?: string | null;
    source?: "debug_token" | "stored_scope";
    error?: { code?: string | number; message?: string } | null;
  };
}) {
  return (
    <div className="mt-4 rounded-md border border-[#1D2A44] bg-[#03070B] p-3">
      <p className="font-semibold text-[#F8FAFC]">Scopes informatifs</p>
      <div className="mt-3 grid gap-2 md:grid-cols-3">
        <InfoLine label="Verification" value={scopes.source ?? "non"} />
        <InfoLine label="Token valide" value={scopes.isValid ?? "non"} />
        <InfoLine
          label="Expiration Debug Token"
          value={scopes.expiresAt ?? "non"}
        />
      </div>
      <p className="mt-2 text-xs uppercase tracking-[0.14em] text-[#64748b]">
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
          Debug Token indisponible: {scopes.error.message ?? scopes.error.code}
        </p>
      ) : null}
      {scopes.missing.includes("instagram_content_publish") ? (
        <p className="mt-3 rounded-md border border-[#f59e0b]/30 bg-[#f59e0b]/10 px-3 py-2 text-[#fbbf24]">
          Reconnecte Meta apres avoir ajoute instagram_content_publish dans
          l&apos;URL OAuth.
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
