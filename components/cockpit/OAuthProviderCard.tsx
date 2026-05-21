import { OAuthStatusBadge } from "./OAuthStatusBadge";
import { RequiredEnvList } from "./RequiredEnvList";
import type { ComponentProps, ReactNode } from "react";

type OAuthProviderCardProps = {
  name: string;
  status: ComponentProps<typeof OAuthStatusBadge>["status"];
  actionLabel: string;
  secondaryLabel: string;
  startHref: string;
  testHref: string;
  callbackPath: string;
  scopes: string[];
  envNames: string[];
  note: string;
  disabled?: boolean;
  actionContent?: ReactNode;
};

export function OAuthProviderCard({
  name,
  status,
  actionLabel,
  secondaryLabel,
  startHref,
  testHref,
  callbackPath,
  scopes,
  envNames,
  note,
  disabled = false,
  actionContent,
}: OAuthProviderCardProps) {
  return (
    <article className="rounded-lg border border-[#1D2A44] bg-[#0B1420] p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-[#F8FAFC]">{name}</h2>
          <p className="mt-2 text-sm leading-6 text-[#A7B0C0]">{note}</p>
        </div>
        <OAuthStatusBadge status={status} />
      </div>

      <div className="mt-5">
        {actionContent ? (
          actionContent
        ) : (
          <div className="flex flex-wrap gap-3">
            {disabled ? (
              <button
                type="button"
                disabled
                className="rounded-md border border-[#1D2A44] bg-[#08111A] px-4 py-2 text-sm font-semibold text-[#64748b]"
              >
                {actionLabel}
              </button>
            ) : (
              <a
                href={startHref}
                className="rounded-md border border-[#39E6D0]/50 bg-[#08111A] px-4 py-2 text-sm font-semibold text-[#39E6D0] transition hover:bg-[#1D2A44] hover:text-[#F8FAFC] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
              >
                {actionLabel}
              </a>
            )}
            <a
              href={testHref}
              className="rounded-md border border-[#1D2A44] px-4 py-2 text-sm font-semibold text-[#A7B0C0] transition hover:bg-[#08111A] hover:text-[#F8FAFC] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              {secondaryLabel}
            </a>
          </div>
        )}
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#39E6D0]">
            Callback attendu
          </p>
          <code className="mt-2 block rounded-md border border-[#1D2A44] bg-[#08111A] px-3 py-2 text-sm text-[#A7B0C0]">
            {callbackPath}
          </code>
        </div>
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#39E6D0]">
            Scopes informatifs
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {scopes.map((scope) => (
              <span
                key={scope}
                className="rounded-md border border-[#1D2A44] bg-[#08111A] px-2.5 py-1 text-xs text-[#A7B0C0]"
              >
                {scope}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-5">
        <p className="mb-2 text-sm font-semibold uppercase tracking-[0.18em] text-[#39E6D0]">
          Variables requises
        </p>
        <RequiredEnvList names={envNames} />
      </div>
    </article>
  );
}
