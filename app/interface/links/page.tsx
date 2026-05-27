import type { Metadata } from "next";
import Link from "next/link";
import { CockpitHeader } from "@/components/cockpit/CockpitHeader";
import { SectionContainer } from "@/components/cockpit/SectionContainer";
import { getCurrentUser } from "@/src/lib/supabase/server";

export const metadata: Metadata = {
  title: "Ressources - L’Édifice",
};

const links = [
  { href: "/", label: "Accueil public", description: "Portail officiel" },
  { href: "/features", label: "Fonctionnalités", description: "Présentation publique" },
  { href: "/privacy", label: "Confidentialité", description: "Document légal" },
  { href: "/terms", label: "Conditions", description: "Document légal" },
  { href: "/data-deletion", label: "Suppression données", description: "Meta/Facebook" },
  { href: "/dashboard", label: "Dashboard", description: "Vue privée existante" },
];

export default async function LinksPage() {
  const user = await getCurrentUser();
  const isOwner = user?.email === "contact.edificeia@gmail.com";

  return (
    <div>
      <CockpitHeader
        eyebrow="Ressources"
        title="Repères et accès projet"
        description="Liens internes, documents et accès locaux réservés si applicables. Aucun secret n'est exposé ici."
        status="Disponible"
      />
      <SectionContainer>
        <div className="grid gap-4 md:grid-cols-2">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-md border border-[#1D2A44] bg-[#08111A] p-4 transition hover:border-[#39E6D0]/60 hover:bg-[#0B1420]"
            >
              <p className="font-semibold text-[#F8FAFC]">{link.label}</p>
              <p className="mt-2 text-sm text-[#A7B0C0]">{link.description}</p>
            </Link>
          ))}
          {isOwner ? (
            <a
              href="http://localhost:8501"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-md border border-[#39E6D0]/50 bg-[#08111A] p-4 transition hover:bg-[#0B1420]"
            >
              <p className="font-semibold text-[#39E6D0]">
                Interface locale Streamlit
              </p>
              <p className="mt-2 text-sm text-[#A7B0C0]">
                Disponible uniquement en local pour le propriétaire.
              </p>
            </a>
          ) : null}
        </div>
      </SectionContainer>
    </div>
  );
}
