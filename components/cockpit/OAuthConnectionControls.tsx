"use client";

import { useState } from "react";

type OAuthStatusPayload = {
  present?: boolean;
  storageEnabled?: true;
  storageMode?: "supabase";
  expiresAt?: string | null;
  updatedAt?: string | null;
  token?: {
    present: boolean;
    storageEnabled: boolean;
    storageMode?: "supabase";
  };
  diagnostic?: {
    metaTokenFound: boolean;
    graphApiSucceeded: boolean;
    facebookPageFound: boolean;
    instagramBusinessAccountFound: boolean;
    graphVersion: string;
    pages_count?: number;
    pages?: Array<{
      id: string | null;
      name: string | null;
      tasks: string[] | null;
      instagram_business_account_present: boolean;
      instagram_business_account_id: string | null;
      instagram_business_account_username: string | null;
    }>;
    metaError: Record<string, unknown> | null;
    warnings?: string[];
  };
};

type InstagramProfilePayload = {
  ok: boolean;
  token: {
    present: boolean;
    storageEnabled: boolean;
    storageMode?: "supabase";
  };
  graphVersion: string;
  diagnostic: {
    accountsRequestSucceeded: boolean;
    profileRequestSucceeded: boolean;
    sourcePage: {
      id: string | null;
      name: string | null;
    } | null;
    instagramBusinessAccount: {
      id: string | null;
      username: string | null;
    } | null;
    error: Record<string, unknown> | null;
  };
  profile: {
    id: string | null;
    username: string | null;
    followers_count: number | null;
    media_count: number | null;
  } | null;
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
  const [instagramProfile, setInstagramProfile] =
    useState<InstagramProfilePayload | null>(null);

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

  async function testInstagramProfile() {
    try {
      const response = await fetch("/api/instagram/profile", {
        method: "GET",
        cache: "no-store",
      });
      const result = (await response.json()) as InstagramProfilePayload;
      setInstagramProfile(result);
    } catch {
      setInstagramProfile(null);
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
        {showInstagramGraphTest ? (
          <button
            type="button"
            onClick={testInstagramProfile}
            className="rounded-md border border-[#1D2A44] px-4 py-2 text-sm font-semibold text-[#A7B0C0] transition hover:bg-[#08111A] hover:text-[#F8FAFC] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            Tester profil Instagram
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
              {payload?.present || payload?.token?.present
                ? "connecte"
                : "a connecter"}
            </span>
          </p>
          <p className="mt-1">Instagram Graph depend de Meta OAuth.</p>
        </div>
      ) : null}

      {payload ? <OAuthDiagnosticPanel payload={payload} /> : null}
      {instagramPayload ? (
        <OAuthDiagnosticPanel payload={instagramPayload} title="Instagram Graph" />
      ) : null}
      {instagramProfile ? (
        <InstagramProfilePanel payload={instagramProfile} />
      ) : null}
    </div>
  );
}

function InstagramProfilePanel({
  payload,
}: {
  payload: InstagramProfilePayload;
}) {
  return (
    <div className="rounded-md border border-[#1D2A44] bg-[#08111A] p-3 text-sm text-[#A7B0C0]">
      <p className="font-semibold text-[#F8FAFC]">Profil Instagram</p>
      <div className="mt-3 grid gap-2">
        <p>
          Token Meta :{" "}
          <span className="font-semibold text-[#F8FAFC]">
            {payload.token.present ? "oui" : "non"}
          </span>
        </p>
        <p>
          Appel /me/accounts :{" "}
          <span className="font-semibold text-[#F8FAFC]">
            {payload.diagnostic.accountsRequestSucceeded ? "oui" : "non"}
          </span>
        </p>
        <p>
          Appel profil Instagram :{" "}
          <span className="font-semibold text-[#F8FAFC]">
            {payload.diagnostic.profileRequestSucceeded ? "oui" : "non"}
          </span>
        </p>
        <p>
          ID Instagram :{" "}
          <span className="font-semibold text-[#F8FAFC]">
            {payload.profile?.id ?? "non"}
          </span>
        </p>
        <p>
          Username :{" "}
          <span className="font-semibold text-[#F8FAFC]">
            {payload.profile?.username ?? "non"}
          </span>
        </p>
        <p>
          Followers :{" "}
          <span className="font-semibold text-[#F8FAFC]">
            {payload.profile?.followers_count ?? "non"}
          </span>
        </p>
        <p>
          Medias :{" "}
          <span className="font-semibold text-[#F8FAFC]">
            {payload.profile?.media_count ?? "non"}
          </span>
        </p>
      </div>
      {payload.diagnostic.error ? (
        <pre className="mt-3 overflow-auto rounded-md border border-[#1D2A44] bg-[#0B1420] p-3 text-xs text-[#fbbf24]">
          {JSON.stringify(payload.diagnostic.error, null, 2)}
        </pre>
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
            {payload.present || payload.token?.present ? "oui" : "non"}
          </span>
        </p>
        <p>
          Stockage :{" "}
          <span className="font-semibold text-[#F8FAFC]">
            {payload.storageMode ?? payload.token?.storageMode ?? "supabase"}
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
        {payload.diagnostic ? (
          <>
            <p>
              Appel Graph API :{" "}
              <span className="font-semibold text-[#F8FAFC]">
                {payload.diagnostic.graphApiSucceeded ? "oui" : "non"}
              </span>
            </p>
            <p>
              Page Facebook trouvee :{" "}
              <span className="font-semibold text-[#F8FAFC]">
                {payload.diagnostic.facebookPageFound ? "oui" : "non"}
              </span>
            </p>
            <p>
              Pages Facebook retournees :{" "}
              <span className="font-semibold text-[#F8FAFC]">
                {payload.diagnostic.pages_count ?? 0}
              </span>
            </p>
            <p>
              Compte Instagram Business associe :{" "}
              <span className="font-semibold text-[#F8FAFC]">
                {payload.diagnostic.instagramBusinessAccountFound
                  ? "oui"
                  : "non"}
              </span>
            </p>
            <p>
              Version Graph :{" "}
              <span className="font-semibold text-[#F8FAFC]">
                {payload.diagnostic.graphVersion}
              </span>
            </p>
          </>
        ) : null}
      </div>
      {payload.diagnostic?.warnings?.length ? (
        <div className="mt-3 grid gap-1 text-[#fbbf24]">
          {payload.diagnostic.warnings.map((warning) => (
            <p key={warning}>{warning}</p>
          ))}
        </div>
      ) : null}
      {payload.diagnostic?.pages?.length ? (
        <div className="mt-3 grid gap-2">
          {payload.diagnostic.pages.map((page) => (
            <div
              key={`${page.id}-${page.name}`}
              className="rounded-md border border-[#1D2A44] bg-[#0B1420] p-3"
            >
              <p>
                Page :{" "}
                <span className="font-semibold text-[#F8FAFC]">
                  {page.name ?? "sans nom"}
                </span>
              </p>
              <p>
                ID :{" "}
                <span className="font-semibold text-[#F8FAFC]">
                  {page.id ?? "non"}
                </span>
              </p>
              <p>
                Tasks :{" "}
                <span className="font-semibold text-[#F8FAFC]">
                  {page.tasks?.join(", ") ?? "non"}
                </span>
              </p>
              <p>
                Instagram Business present :{" "}
                <span className="font-semibold text-[#F8FAFC]">
                  {page.instagram_business_account_present ? "oui" : "non"}
                </span>
              </p>
              <p>
                Instagram Business ID :{" "}
                <span className="font-semibold text-[#F8FAFC]">
                  {page.instagram_business_account_id ?? "non"}
                </span>
              </p>
              <p>
                Instagram username :{" "}
                <span className="font-semibold text-[#F8FAFC]">
                  {page.instagram_business_account_username ?? "non"}
                </span>
              </p>
            </div>
          ))}
        </div>
      ) : null}
      {payload.diagnostic?.metaError ? (
        <pre className="mt-3 overflow-auto rounded-md border border-[#1D2A44] bg-[#0B1420] p-3 text-xs text-[#fbbf24]">
          {JSON.stringify(payload.diagnostic.metaError, null, 2)}
        </pre>
      ) : null}
    </div>
  );
}
