import type { Metadata } from "next";
import { CockpitHeader } from "@/components/cockpit/CockpitHeader";
import { MetaConnectionControls } from "@/components/cockpit/MetaConnectionControls";
import { OAuthProviderCard } from "@/components/cockpit/OAuthProviderCard";
import { OAuthResultNotice } from "@/components/cockpit/OAuthResultNotice";
import { RequiredEnvList } from "@/components/cockpit/RequiredEnvList";
import { SectionContainer } from "@/components/cockpit/SectionContainer";
import { YouTubeConnectionControls } from "@/components/cockpit/YouTubeConnectionControls";
import {
  getActiveMetaScopes,
  isMetaInstagramScopesEnabled,
} from "@/lib/oauth/meta";
import { oauthProviders, getRequiredEnvNames } from "@/lib/oauth/providers";
import { getOAuthStatus } from "@/lib/oauth/server";

export const metadata: Metadata = {
  title: "Connexions OAuth - L'Edifice",
};

const visibleProviders = oauthProviders.filter(
  (provider) => provider.key !== "instagram",
);

const allEnvNames = Array.from(
  new Set(oauthProviders.flatMap((provider) => getRequiredEnvNames(provider))),
);

export default async function OAuthConnectionsPage({
  searchParams,
}: {
  searchParams: Promise<{
    provider?: string;
    status?: string;
    connected?: string;
  }>;
}) {
  const result = await searchParams;
  const instagramScopesEnabled = isMetaInstagramScopesEnabled();

  return (
    <div>
      <CockpitHeader
        eyebrow="Réglages > Connexions"
        title="Connexions OAuth"
        description="Gérer les connexions externes nécessaires aux modules de publication et d'automatisation."
        status="A securiser"
      />
      <OAuthResultNotice
        provider={result.provider}
        status={result.status}
        connected={result.connected}
      />

      <div className="grid gap-6">
        <div className="grid gap-4 xl:grid-cols-2">
          {visibleProviders.map((provider) => {
            const callbackPath = `/api/oauth/${provider.key}/callback`;
            const isMeta = provider.key === "meta";
            const isYouTube = provider.key === "youtube";
            const providerScopes = isMeta ? getActiveMetaScopes() : provider.scopes;
            const startHref = isMeta
              ? "/api/meta/start"
              : `/api/oauth/${provider.key}/start`;

            return (
              <OAuthProviderCard
                key={provider.key}
                name={provider.name}
                status={getOAuthStatus(provider)}
                actionLabel={provider.actionLabel}
                secondaryLabel={provider.secondaryLabel}
                startHref={startHref}
                testHref={
                  isMeta
                    ? "/api/meta/status"
                    : isYouTube
                      ? "/api/oauth/youtube/status"
                    : `/api/oauth/${provider.key}/start?mode=test`
                }
                callbackPath={isMeta ? "/api/meta/callback" : callbackPath}
                scopes={providerScopes}
                envNames={getRequiredEnvNames(provider)}
                note={provider.note}
                disabled={provider.placeholder}
                actionContent={
                  isMeta ? (
                    <MetaConnectionControls
                      metaConnected={
                        result.provider === "meta" && result.connected === "1"
                      }
                      instagramScopesEnabled={instagramScopesEnabled}
                    />
                  ) : isYouTube ? (
                    <YouTubeConnectionControls startHref={startHref} />
                  ) : undefined
                }
              />
            );
          })}
        </div>

        <SectionContainer>
          <CockpitHeader
            eyebrow="Configuration"
            title="Variables requises"
            description="Seuls les noms des variables attendues sont affichés. Les valeurs ne doivent jamais apparaître dans l'interface."
          />
          <RequiredEnvList names={allEnvNames} />
        </SectionContainer>

        <SectionContainer>
          <CockpitHeader
            eyebrow="Sécurité"
            title="Garde-fous OAuth"
            description="Base de sécurité avant tout branchement réel des workflows de publication."
            status="A securiser"
          />
          <div className="grid gap-3 leading-7 text-[#A7B0C0]">
            <p>Les secrets OAuth restent uniquement côté serveur.</p>
            <p>
              Les client secrets ne doivent jamais être exposés dans le
              frontend.
            </p>
            <p>Les tokens doivent être stockés de manière sécurisée.</p>
            <p>
              La publication réelle reste bloquée tant que les workflows ne
              sont pas validés.
            </p>
          </div>
        </SectionContainer>
      </div>
    </div>
  );
}
