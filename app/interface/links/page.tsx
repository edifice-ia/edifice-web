import type { Metadata } from "next";
import Link from "next/link";
import { CockpitHeader } from "@/components/cockpit/CockpitHeader";
import { SectionContainer } from "@/components/cockpit/SectionContainer";
import { getCurrentUser } from "@/src/lib/supabase/server";

export const metadata: Metadata = {
  title: "Liens utiles - L'Edifice",
};

const links = [
  { href: "/", label: "Accueil public", description: "Portail officiel" },
  { href: "/features", label: "Fonctionnalites", description: "Presentation publique" },
  { href: "/privacy", label: "Confidentialite", description: "Document legal" },
  { href: "/terms", label: "Conditions", description: "Document legal" },
  { href: "/data-deletion", label: "Suppression donnees", description: "Meta/Facebook" },
  { href: "/dashboard", label: "Dashboard", description: "Vue privee existante" },
];

export default async function LinksPage() {
  const user = await getCurrentUser();
  const isOwner = user?.email === "contact.edificeia@gmail.com";

  return (
    <div>
      <CockpitHeader
        eyebrow="Liens utiles"
        title="Documentation et acces projet"
        description="Liens internes, outils projet et acces locaux reserves si applicables. Aucun secret n'est expose ici."
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
            // Owner-only local cockpit link
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
                Disponible uniquement en local pour le proprietaire.
              </p>
            </a>
          ) : null}
        </div>
      </SectionContainer>
    </div>
  );
}
