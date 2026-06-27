import type { Metadata } from "next";
import { CockpitHeader } from "@/components/cockpit/CockpitHeader";
import { SettingsConnectionsPanel, type ConnectionsSearchParams } from "@/components/cockpit/SettingsConnectionsPanel";
import { readSettingsPreferences } from "@/lib/server/settings-preferences";
import { getCurrentUser } from "@/src/lib/supabase/server";
import { SettingsWorkspaceClient } from "./SettingsWorkspaceClient";

export const metadata: Metadata = {
  title: "Reglages - L'Edifice",
};

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<ConnectionsSearchParams>;
}) {
  const [user, result] = await Promise.all([
    getCurrentUser(),
    searchParams,
  ]);
  const preferences = user
    ? await readSettingsPreferences(user.id)
    : await readSettingsPreferences("00000000-0000-0000-0000-000000000000");

  return (
    <div>
      <CockpitHeader
        eyebrow="Reglages"
        title="Espace de reglages"
        description="Preferences globales, reglages par compte, programmation, garde-fous et connexions externes."
        status="A securiser"
      />
      <SettingsWorkspaceClient
        initialState={preferences}
        userEmail={user?.email ?? null}
        connectionsPanel={<SettingsConnectionsPanel result={result} />}
      />
    </div>
  );
}
