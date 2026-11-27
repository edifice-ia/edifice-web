import type { Metadata } from "next";
import Link from "next/link";
import { ACADEMY_MESSAGES } from "@/lib/academy/http";
import { AcademyStoreError } from "@/lib/server/academy/hierarchy-store";
import {
  listLiveResourcesByProgram,
  type AcademyProgramResources,
} from "@/lib/server/academy/resources-store";
import { requirePrivateCockpitAccess } from "@/src/lib/auth/guards";
import { AcademyResourceList } from "../AcademyResourceList";

// Onglet Ressources — étape 2b-2.
//
// Server Component : lit directement le store avec l'utilisateur de la session.
// Pour chaque programme vivant, son titre en lien vers l'arbre, ses ressources,
// puis celles de ses leçons vivantes, avec un lien vers chaque leçon. La page
// liste et archive seulement : on crée une ressource depuis l'arbre (programme)
// ou depuis la page Leçon. Segment statique, servi avant le segment dynamique
// [section], qui affichait jusque-là la page provisoire « Pas encore construit ».

export const metadata: Metadata = {
  title: "Ressources - Academy - L'Édifice",
};

type ResourcesState =
  | { status: "ok"; programs: AcademyProgramResources[] }
  | { status: "unavailable" };

async function readResources(userId: string): Promise<ResourcesState> {
  try {
    return { status: "ok", programs: await listLiveResourcesByProgram(userId) };
  } catch (error) {
    // Le store a déjà journalisé le détail : rien de technique n'est affiché.
    if (error instanceof AcademyStoreError) {
      return { status: "unavailable" };
    }

    throw error;
  }
}

export default async function AcademyResourcesPage() {
  const user = await requirePrivateCockpitAccess();
  const state = await readResources(user.id);

  return (
    <section
      aria-labelledby="academy-resources-title"
      className="rounded-lg border border-[#1D2A44] bg-[#08111A] p-6"
    >
      <h2 id="academy-resources-title" className="text-2xl font-semibold text-[#F8FAFC]">
        Ressources
      </h2>
      <p className="mt-3 max-w-3xl leading-7 text-[#A7B0C0]">
        Liens et textes rattachés à chaque programme et à ses leçons. Pour ajouter une ressource,
        ouvrez l&apos;arbre d&apos;un programme ou une leçon.
      </p>

      {state.status === "unavailable" ? (
        <p
          role="alert"
          className="mt-6 rounded-md border border-[#F87171]/40 bg-[#F87171]/10 px-4 py-3 text-sm text-[#FCA5A5]"
        >
          {ACADEMY_MESSAGES.unavailable}
        </p>
      ) : state.programs.length === 0 ? (
        <p className="mt-6 rounded-md border border-dashed border-[#1D2A44] px-4 py-3 text-[#A7B0C0]">
          Aucun programme enregistré pour l&apos;instant.
        </p>
      ) : (
        <ul className="mt-6 grid gap-4" aria-label="Programmes">
          {state.programs.map((program) => (
            <li
              key={program.programId}
              className="rounded-md border border-[#1D2A44] bg-[#0B1420] px-4 py-3"
            >
              <h3 className="text-lg font-semibold text-[#F8FAFC]">
                <Link
                  href={`/interface/academy/programmes/${program.programId}`}
                  className="hover:text-[#39E6D0] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                >
                  {program.programTitle}
                </Link>
              </h3>
              <AcademyResourceList
                resources={program.resources.map((resource) =>
                  resource.parentLevel === "lesson"
                    ? { ...resource, lessonLink: { id: resource.parentId, title: resource.parentTitle } }
                    : resource,
                )}
                emptyLabel="Aucune ressource."
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
