import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  isUuid,
  type AcademyProgramKind,
  type AcademyProgramTree,
} from "@/lib/academy/hierarchy";
import { ACADEMY_MESSAGES } from "@/lib/academy/http";
import { AcademyStoreError, getLiveProgramTree } from "@/lib/server/academy/hierarchy-store";
import { requirePrivateCockpitAccess } from "@/src/lib/auth/guards";
import { AcademyChildCreateForm, AcademySubjectCreateForm } from "../../AcademyCreateForms";

// Arbre d'un programme — interface de l'étape 2a : arbre en lecture. La page
// place des formulaires de création (matière, module, chapitre, leçon), rangés
// dans AcademyCreateForms.tsx.
//
// Server Component : lit directement le store avec l'utilisateur de la session,
// comme la page Programmes. Identifiant malformé, programme inexistant, archivé
// ou appartenant à un autre compte : même 404 (notFound), sans distinction.
// Les leçons n'apparaissent que par leur titre, sans contenu ; chaque titre mène
// à la page Leçon (lecons/[id]/page.tsx).

type AcademyProgramTreePageProps = {
  params: Promise<{ id: string }>;
};

export const metadata: Metadata = {
  title: "Programme - Academy - L'Édifice",
};

const KIND_LABELS: Record<AcademyProgramKind, string> = {
  curriculum: "Curriculum",
  formation: "Formation",
};

type TreeState =
  | { status: "ok"; tree: AcademyProgramTree }
  | { status: "not_found" }
  | { status: "unavailable" };

async function readTree(userId: string, programId: string): Promise<TreeState> {
  try {
    const result = await getLiveProgramTree(userId, programId);

    return result.status === "ok" ? { status: "ok", tree: result.value } : { status: "not_found" };
  } catch (error) {
    // Le store a déjà journalisé le détail : rien de technique n'est affiché.
    // Toute autre exception remonte à la frontière d'erreur.
    if (error instanceof AcademyStoreError) {
      return { status: "unavailable" };
    }

    throw error;
  }
}

function EmptyLevel({ children }: { children: React.ReactNode }) {
  return <p className="mt-2 text-sm italic text-[#A7B0C0]">{children}</p>;
}

function ProgramTree({ tree }: { tree: AcademyProgramTree }) {
  if (tree.subjects.length === 0) {
    return <EmptyLevel>Aucune matière pour l&apos;instant.</EmptyLevel>;
  }

  return (
    <ul className="mt-4 grid gap-4" aria-label="Matières">
      {tree.subjects.map((subject) => (
        <li key={subject.id} className="rounded-md border border-[#1D2A44] bg-[#0B1420] px-4 py-3">
          <h3 className="text-lg font-semibold text-[#F8FAFC]">{subject.title}</h3>
          {subject.units.length === 0 ? (
            <EmptyLevel>Aucun module pour l&apos;instant.</EmptyLevel>
          ) : (
            <ul className="mt-3 grid gap-3 border-l border-[#1D2A44] pl-4" aria-label="Modules">
              {subject.units.map((unit) => (
                <li key={unit.id}>
                  <h4 className="font-semibold text-[#D8DEE8]">{unit.title}</h4>
                  {unit.chapters.length === 0 ? (
                    <EmptyLevel>Aucun chapitre pour l&apos;instant.</EmptyLevel>
                  ) : (
                    <ul
                      className="mt-2 grid gap-2 border-l border-[#1D2A44] pl-4"
                      aria-label="Chapitres"
                    >
                      {unit.chapters.map((chapter) => (
                        <li key={chapter.id}>
                          <h5 className="text-sm font-semibold text-[#D8DEE8]">{chapter.title}</h5>
                          {chapter.lessons.length === 0 ? (
                            <EmptyLevel>Aucune leçon pour l&apos;instant.</EmptyLevel>
                          ) : (
                            <ul
                              className="mt-1 grid gap-1 border-l border-[#1D2A44] pl-4"
                              aria-label="Leçons"
                            >
                              {chapter.lessons.map((lesson) => (
                                <li key={lesson.id} className="text-sm text-[#A7B0C0]">
                                  <Link
                                    href={`/interface/academy/lecons/${lesson.id}`}
                                    className="hover:text-[#39E6D0] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                                  >
                                    {lesson.title}
                                  </Link>
                                </li>
                              ))}
                            </ul>
                          )}
                          <AcademyChildCreateForm level="lesson" parentId={chapter.id} />
                        </li>
                      ))}
                    </ul>
                  )}
                  <AcademyChildCreateForm level="chapter" parentId={unit.id} />
                </li>
              ))}
            </ul>
          )}
          <AcademyChildCreateForm level="unit" parentId={subject.id} />
        </li>
      ))}
    </ul>
  );
}

export default async function AcademyProgramTreePage({ params }: AcademyProgramTreePageProps) {
  const user = await requirePrivateCockpitAccess();
  const { id } = await params;

  // UUID validé avant tout appel au store ; malformé : même 404 qu'un inexistant.
  if (!isUuid(id)) {
    notFound();
  }

  const state = await readTree(user.id, id);

  if (state.status === "not_found") {
    notFound();
  }

  return (
    <section
      aria-labelledby="academy-program-title"
      className="rounded-lg border border-[#1D2A44] bg-[#08111A] p-6"
    >
      <Link
        href="/interface/academy/programmes"
        className="text-sm font-semibold text-[#7DD3FC] hover:text-[#F8FAFC]"
      >
        ← Programmes
      </Link>

      {state.status === "unavailable" ? (
        <>
          <h2 id="academy-program-title" className="mt-4 text-2xl font-semibold text-[#F8FAFC]">
            Programme
          </h2>
          <p
            role="alert"
            className="mt-6 rounded-md border border-[#F87171]/40 bg-[#F87171]/10 px-4 py-3 text-sm text-[#FCA5A5]"
          >
            {ACADEMY_MESSAGES.unavailable}
          </p>
        </>
      ) : (
        <>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <h2 id="academy-program-title" className="text-2xl font-semibold text-[#F8FAFC]">
              {state.tree.title}
            </h2>
            <span className="rounded-md border border-[#39E6D0]/40 bg-[#39E6D0]/10 px-2 py-0.5 text-xs font-semibold text-[#39E6D0]">
              {KIND_LABELS[state.tree.kind]}
            </span>
          </div>
          <p className="mt-3 max-w-3xl leading-7 text-[#A7B0C0]">
            Matières, modules, chapitres et leçons de ce programme.
          </p>
          <ProgramTree tree={state.tree} />
          <AcademySubjectCreateForm programId={state.tree.id} />
        </>
      )}
    </section>
  );
}
