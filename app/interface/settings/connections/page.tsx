import type { Metadata } from "next";
import { CockpitHeader } from "@/components/cockpit/CockpitHeader";
import {
  SettingsConnectionsPanel,
  type ConnectionsSearchParams,
} from "@/components/cockpit/SettingsConnectionsPanel";

export const metadata: Metadata = {
  title: "Connexions OAuth - L'Edifice",
};

export default async function OAuthConnectionsPage({
  searchParams,
}: {
  searchParams: Promise<ConnectionsSearchParams>;
}) {
  const result = await searchParams;

  return (
    <div>
      <CockpitHeader
        eyebrow="Reglages > Connexions"
        title="Connexions OAuth"
        description="Gerer les connexions externes necessaires aux modules de publication et d'automatisation."
        status="A securiser"
      />
      <SettingsConnectionsPanel result={result} />
    </div>
  );
}
