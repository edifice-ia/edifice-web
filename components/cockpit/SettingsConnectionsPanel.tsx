import { OAuthConnectionControls } from "@/components/cockpit/OAuthConnectionControls";
import { PinterestConnectionControls } from "@/components/cockpit/PinterestConnectionControls";
import { OAuthProviderCard } from "@/components/cockpit/OAuthProviderCard";
import { OAuthResultNotice } from "@/components/cockpit/OAuthResultNotice";
import { RequiredEnvList } from "@/components/cockpit/RequiredEnvList";
import { SectionContainer } from "@/components/cockpit/SectionContainer";
import { getActiveMetaScopes } from "@/lib/oauth/meta";
import { oauthProviders, getRequiredEnvNames } from "@/lib/oauth/providers";
import { getOAuthStatus } from "@/lib/oauth/server";
import { getOAuthTokenStatus } from "@/lib/server/oauth/token-store";

export type ConnectionsSearchParams = {
  code_received?: string;
  connected?: string;
  error?: string;
  profile_fetch_success?: string;
  provider?: string;
  scopes_granted?: string;
  scopes_missing?: string;
  scopes_requested?: string;
  state_valid?: string;
  status?: string;
  token_exchange_success?: string;
};

const visibleProviders = oauthProviders.filter(
  (provider) => provider.key !== "instagram",
);

const allEnvNames = Array.from(
  new Set(oauthProviders.flatMap((provider) => getRequiredEnvNames(provider))),
);

export async function SettingsConnectionsPanel({
  result,
  showConfiguration = true,
}: {
  result: ConnectionsSearchParams;
  showConfiguration?: boolean;
}) {
  const pinterestTokenStatus = await getOAuthTokenStatus("pinterest").catch(() => null);

  return (
    <div className="grid gap-6">
      <OAuthResultNotice
        provider={result.provider}
        status={result.status}
        connected={result.connected}
        error={result.error}
        code_received={result.code_received}
        state_valid={result.state_valid}
        token_exchange_success={result.token_exchange_success}
        profile_fetch_success={result.profile_fetch_success}
        scopes_requested={result.scopes_requested}
        scopes_granted={result.scopes_granted}
        scopes_missing={result.scopes_missing}
      />

      <div className="grid gap-4 xl:grid-cols-2">
        {visibleProviders.map((provider) => {
          const isMeta = provider.key === "meta";
          const isYouTube = provider.key === "youtube";
          const isTikTok = provider.key === "tiktok";
          const isPinterest = provider.key === "pinterest";
          const callbackPath = isPinterest
            ? "/api/auth/pinterest/callback"
            : `/api/oauth/${provider.key}/callback`;
          const providerScopes = isMeta ? getActiveMetaScopes() : provider.scopes;
          const startHref = isMeta
            ? "/api/meta/start"
            : isPinterest
              ? "/api/auth/pinterest/start"
              : `/api/oauth/${provider.key}/start`;
          const providerStatus =
            isPinterest && pinterestTokenStatus?.present
              ? "Actif"
              : getOAuthStatus(provider);

          return (
            <OAuthProviderCard
              key={provider.key}
              name={provider.name}
              status={providerStatus}
              actionLabel={provider.actionLabel}
              secondaryLabel={provider.secondaryLabel}
              startHref={startHref}
              testHref={
                isMeta
                  ? "/api/oauth/meta/status"
                  : isYouTube
                    ? "/api/oauth/youtube/status"
                    : isTikTok
                      ? "/api/oauth/tiktok/status"
                      : isPinterest
                        ? "/api/auth/pinterest/test"
                        : `/api/oauth/${provider.key}/start?mode=test`
              }
              callbackPath={
                isMeta
                  ? "/api/meta/callback"
                  : isTikTok
                    ? "/api/oauth/tiktok/callback"
                    : callbackPath
              }
              scopes={providerScopes}
              envNames={getRequiredEnvNames(provider)}
              note={provider.note}
              disabled={provider.placeholder}
              actionContent={
                isPinterest ? (
                  <PinterestConnectionControls />
                ) : (
                  <OAuthConnectionControls
                    actionLabel={provider.actionLabel}
                    startHref={startHref}
                    statusHref={
                      isMeta
                        ? "/api/oauth/meta/status"
                        : isYouTube
                          ? "/api/oauth/youtube/status"
                          : isTikTok
                            ? "/api/oauth/tiktok/status"
                            : `/api/oauth/${provider.key}/start?mode=test`
                    }
                    disabled={provider.placeholder}
                    showInstagramGraphTest={isMeta}
                  />
                )
              }
            />
          );
        })}
      </div>

      {showConfiguration ? (
        <>
          <SectionContainer>
            <h2 className="text-xl font-semibold text-[#F8FAFC]">Variables requises</h2>
            <p className="mt-3 text-sm leading-6 text-[#A7B0C0]">
              Seuls les noms des variables attendues sont affiches. Les valeurs ne doivent jamais apparaitre dans l&apos;interface.
            </p>
            <div className="mt-4">
              <RequiredEnvList names={allEnvNames} />
            </div>
          </SectionContainer>

          <SectionContainer>
            <h2 className="text-xl font-semibold text-[#F8FAFC]">Garde-fous OAuth</h2>
            <div className="mt-3 grid gap-3 leading-7 text-[#A7B0C0]">
              <p>Les secrets OAuth restent uniquement cote serveur.</p>
              <p>Les client secrets ne doivent jamais etre exposes dans le frontend.</p>
              <p>Les tokens doivent etre stockes de maniere securisee.</p>
              <p>La publication reelle reste bloquee tant que les workflows ne sont pas valides.</p>
            </div>
          </SectionContainer>
        </>
      ) : null}
    </div>
  );
}
