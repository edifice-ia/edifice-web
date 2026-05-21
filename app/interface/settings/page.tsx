import type { Metadata } from "next";
import Link from "next/link";
import { CockpitHeader } from "@/components/cockpit/CockpitHeader";
import { EmptyState } from "@/components/cockpit/EmptyState";
import { SectionContainer } from "@/components/cockpit/SectionContainer";
import { getCurrentUser } from "@/src/lib/supabase/server";

export const metadata: Metadata = {
  title: "Réglages - L'Edifice",
};

export default async function SettingsPage() {
  const user = await getCurrentUser();

  return (
    <div>
      <CockpitHeader
        eyebrow="Réglages"
        title="Compte et preferences cockpit"
        description="Base de parametres pour preferences d'affichage, statut compte et futures configurations securisees."
        status="A securiser"
      />
      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <SectionContainer>
          <h2 className="text-xl font-semibold text-[#F8FAFC]">
            Statut compte
          </h2>
          <p className="mt-3 text-[#A7B0C0]">
            Connecte avec : <span className="text-[#F8FAFC]">{user?.email}</span>
          </p>
        </SectionContainer>
        <SectionContainer>
          <h2 className="text-xl font-semibold text-[#F8FAFC]">
            Connexions
          </h2>
          <p className="mt-3 leading-7 text-[#A7B0C0]">
            Preparer les connexions OAuth des publishers sans exposer de
            secrets ni declencher de publication reelle.
          </p>
          <Link
            href="/interface/settings/connections"
            className="mt-5 inline-flex rounded-md border border-[#39E6D0]/50 bg-[#08111A] px-4 py-2 text-sm font-semibold text-[#39E6D0] transition hover:bg-[#1D2A44] hover:text-[#F8FAFC] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            Ouvrir Connexions
          </Link>
          <div className="mt-6">
            <EmptyState
              title="Secrets hors frontend"
              description="Les client secrets, tokens et credentials restent exclusivement cote serveur."
            />
          </div>
        </SectionContainer>
      </div>
    </div>
  );
}
