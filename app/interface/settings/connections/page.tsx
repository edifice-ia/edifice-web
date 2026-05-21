import type { Metadata } from "next";
import { CockpitHeader } from "@/components/cockpit/CockpitHeader";
import { OAuthProviderCard } from "@/components/cockpit/OAuthProviderCard";
import { RequiredEnvList } from "@/components/cockpit/RequiredEnvList";
import { SectionContainer } from "@/components/cockpit/SectionContainer";
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

export default function OAuthConnectionsPage() {
  return (
    <div>
      <CockpitHeader
        eyebrow="Parametres > Connexions"
        title="Connexions OAuth"
        description="Gerer les connexions externes necessaires aux modules de publication et d'automatisation."
        status="A securiser"
      />

      <div className="grid gap-6">
        <div className="grid gap-4 xl:grid-cols-2">
          {visibleProviders.map((provider) => {
            const callbackPath = `/api/oauth/${provider.key}/callback`;

            return (
              <OAuthProviderCard
                key={provider.key}
                name={provider.name}
                status={getOAuthStatus(provider)}
                actionLabel={provider.actionLabel}
                secondaryLabel={provider.secondaryLabel}
                startHref={`/api/oauth/${provider.key}/start`}
                testHref={`/api/oauth/${provider.key}/start?mode=test`}
                callbackPath={callbackPath}
                scopes={provider.scopes}
                envNames={getRequiredEnvNames(provider)}
                note={provider.note}
                disabled={provider.placeholder}
              />
            );
          })}
        </div>

        <SectionContainer>
          <CockpitHeader
            eyebrow="Configuration"
            title="Variables requises"
            description="Seuls les noms des variables attendues sont affiches. Les valeurs ne doivent jamais apparaitre dans l'interface."
          />
          <RequiredEnvList names={allEnvNames} />
        </SectionContainer>

        <SectionContainer>
          <CockpitHeader
            eyebrow="Securite"
            title="Garde-fous OAuth"
            description="Base de securite avant tout branchement reel des workflows de publication."
            status="A securiser"
          />
          <div className="grid gap-3 leading-7 text-[#A7B0C0]">
            <p>Les secrets OAuth restent uniquement cote serveur.</p>
            <p>
              Les client secrets ne doivent jamais etre exposes dans le
              frontend.
            </p>
            <p>Les tokens doivent etre stockes de maniere securisee.</p>
            <p>
              La publication reelle reste bloquee tant que les workflows ne
              sont pas valides.
            </p>
          </div>
        </SectionContainer>
      </div>
    </div>
  );
}
