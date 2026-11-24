import { AcademyNav } from "./AcademyNav";
import { AcademyHeader } from "./AcademyPrimitives";

// Layout de l'espace Academy. L'accès est déjà gardé par app/interface/layout.tsx
// (requirePrivateCockpitAccess) et par le middleware pour le rôle reviewer :
// aucun garde supplémentaire n'est posé ici.
export default function AcademyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div>
      <AcademyHeader />
      <AcademyNav />
      {children}
    </div>
  );
}
