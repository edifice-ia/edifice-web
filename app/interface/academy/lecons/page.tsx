import type { Metadata } from "next";
import Link from "next/link";

// Onglet Leçons — interface de l'étape 2a.
//
// Les leçons ne sont pas listées globalement : on y accède par l'arbre de
// chaque programme (programmes/[id]/page.tsx), puis par la page Leçon
// (lecons/[id]/page.tsx). Cette page ne lit aucune donnée : elle renvoie vers
// les programmes. Segment statique, servi avant le segment dynamique [section],
// qui affichait jusque-là la page provisoire « Pas encore construit ».

export const metadata: Metadata = {
  title: "Leçons - Academy - L'Édifice",
};

export default function AcademyLessonsPage() {
  return (
    <section
      aria-labelledby="academy-lessons-title"
      className="rounded-lg border border-[#1D2A44] bg-[#08111A] p-6"
    >
      <h2 id="academy-lessons-title" className="text-2xl font-semibold text-[#F8FAFC]">
        Leçons
      </h2>
      <p className="mt-3 max-w-3xl leading-7 text-[#A7B0C0]">
        Les leçons se consultent depuis l&apos;arbre de chaque programme : ouvrez un
        programme, puis choisissez une leçon.
      </p>
      <Link
        href="/interface/academy/programmes"
        className="mt-6 inline-block rounded-md border border-[#39E6D0]/40 bg-[#39E6D0]/10 px-4 py-2 text-sm font-semibold text-[#39E6D0] hover:bg-[#39E6D0]/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        Voir les programmes
      </Link>
    </section>
  );
}
