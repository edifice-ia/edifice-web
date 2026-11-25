import type { Metadata } from "next";
import Link from "next/link";
import type { AcademyProgram, AcademyProgramKind } from "@/lib/academy/hierarchy";
import { ACADEMY_MESSAGES } from "@/lib/academy/http";
import { AcademyStoreError, listLivePrograms } from "@/lib/server/academy/hierarchy-store";
import { requirePrivateCockpitAccess } from "@/src/lib/auth/guards";

// Page Programmes — interface de l'étape 2a, en lecture seule.
//
// Page dédiée plutôt qu'une branche dans [section]/page.tsx : c'est la première
// section qui lit des données, avec ses propres états (vide, erreur, liste). Le
// segment statique `programmes` est servi avant le segment dynamique [section].
//
// Server Component : lit directement le store avec l'utilisateur de la session,
// sans passer par les routes API. Le layout app/interface/layout.tsx garde déjà
// l'accès, mais ne transmet pas l'utilisateur à la page : la garde est rappelée
// ici pour l'obtenir (et redirige de la même façon si la session manque).

export const metadata: Metadata = {
  title: "Programmes - Academy - L'Édifice",
};

const KIND_LABELS: Record<AcademyProgramKind, string> = {
  curriculum: "Curriculum",
  formation: "Formation",
};

type ProgramsState =
  | { status: "ok"; programs: AcademyProgram[] }
  | { status: "unavailable" };

async function readPrograms(userId: string): Promise<ProgramsState> {
  try {
    return { status: "ok", programs: await listLivePrograms(userId) };
  } catch (error) {
    // Le store a déjà journalisé le détail (console.error) : rien de technique
    // n'est affiché. Toute autre exception remonte à la frontière d'erreur.
    if (error instanceof AcademyStoreError) {
      return { status: "unavailable" };
    }

    throw error;
  }
}

export default async function AcademyProgramsPage() {
  const user = await requirePrivateCockpitAccess();
  const state = await readPrograms(user.id);

  return (
    <section
      aria-labelledby="academy-programs-title"
      className="rounded-lg border border-[#1D2A44] bg-[#08111A] p-6"
    >
      <h2 id="academy-programs-title" className="text-2xl font-semibold text-[#F8FAFC]">
        Programmes
      </h2>
      <p className="mt-3 max-w-3xl leading-7 text-[#A7B0C0]">
        Curriculums et formations enregistrés, en lecture seule. Les programmes
        archivés ne sont pas listés.
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
        <ul className="mt-6 grid gap-3">
          {state.programs.map((program) => (
            <li
              key={program.id}
              className="rounded-md border border-[#1D2A44] bg-[#0B1420] px-4 py-3"
            >
              <div className="flex flex-wrap items-center gap-3">
                <h3 className="text-lg font-semibold text-[#F8FAFC]">
                  <Link
                    href={`/interface/academy/programmes/${program.id}`}
                    className="hover:text-[#39E6D0] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                  >
                    {program.title}
                  </Link>
                </h3>
                <span className="rounded-md border border-[#39E6D0]/40 bg-[#39E6D0]/10 px-2 py-0.5 text-xs font-semibold text-[#39E6D0]">
                  {KIND_LABELS[program.kind]}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
