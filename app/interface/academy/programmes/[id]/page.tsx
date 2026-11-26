import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  isUuid,
  type AcademyArchivedNode,
  type AcademyObjective,
  type AcademyObjectiveParentLevel,
  type AcademyProgramKind,
  type AcademyProgramTree,
} from "@/lib/academy/hierarchy";
import { ACADEMY_MESSAGES } from "@/lib/academy/http";
import {
  AcademyStoreError,
  getLiveProgramTree,
  listArchivedDescendants,
} from "@/lib/server/academy/hierarchy-store";
import {
  listArchivedObjectives,
  listLiveObjectives,
} from "@/lib/server/academy/objectives-store";
import { requirePrivateCockpitAccess } from "@/src/lib/auth/guards";
import { AcademyArchiveButton, AcademyRestoreButton } from "../../AcademyArchiveControls";
import {
  AcademyChildCreateForm,
  AcademyObjectiveCreateForm,
  AcademySubjectCreateForm,
} from "../../AcademyCreateForms";

// Arbre d'un programme — interface de l'étape 2a : arbre en lecture. La page
// place des formulaires de création (matière, module, chapitre, leçon), rangés
// dans AcademyCreateForms.tsx, et des boutons d'archivage et de restauration,
// rangés dans AcademyArchiveControls.tsx. Depuis l'étape 2b-1, chaque programme,
// matière, module et chapitre affiche ses objectifs pédagogiques vivants, avec
// un formulaire replié « Nouvel objectif » (objectives-store.ts).
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

type ArchivedState =
  | { status: "ok"; items: AcademyArchivedNode[] }
  | { status: "unavailable" };

async function readArchived(userId: string, programId: string): Promise<ArchivedState> {
  try {
    const nodes = await listArchivedDescendants(userId, programId);
    const objectives = await listArchivedObjectives(userId, programId);

    // not_found : le programme a été archivé entre les lectures ; rien à lister.
    const items = [
      ...(nodes.status === "ok" ? nodes.value : []),
      ...(objectives.status === "ok" ? objectives.value : []),
    ].sort((a, b) => (a.archivedAt < b.archivedAt ? 1 : a.archivedAt > b.archivedAt ? -1 : 0));

    return { status: "ok", items };
  } catch (error) {
    if (error instanceof AcademyStoreError) {
      return { status: "unavailable" };
    }

    throw error;
  }
}

const LEVEL_LABELS: Record<AcademyArchivedNode["level"], string> = {
  subject: "Matière",
  unit: "Module",
  chapter: "Chapitre",
  lesson: "Leçon",
  objective: "Objectif",
};

// Objectifs vivants du programme, groupés par identifiant du niveau parent.
// null : lecture indisponible.
type ObjectivesByParent = Map<string, AcademyObjective[]> | null;

async function readObjectives(userId: string, programId: string): Promise<ObjectivesByParent> {
  try {
    const result = await listLiveObjectives(userId, programId);
    const byParent = new Map<string, AcademyObjective[]>();

    for (const objective of result.status === "ok" ? result.value : []) {
      byParent.set(objective.parentId, [...(byParent.get(objective.parentId) ?? []), objective]);
    }

    return byParent;
  } catch (error) {
    if (error instanceof AcademyStoreError) {
      return null;
    }

    throw error;
  }
}

// Objectifs d'un niveau, avec leur bouton d'archivage, puis le formulaire replié
// « Nouvel objectif ». Rien n'est affiché si la lecture est indisponible : le
// message est donné une fois, sous le titre du programme.
function ObjectiveList({
  objectives,
  parentLevel,
  parentId,
}: {
  objectives: ObjectivesByParent;
  parentLevel: AcademyObjectiveParentLevel;
  parentId: string;
}) {
  if (!objectives) {
    return null;
  }

  const list = objectives.get(parentId) ?? [];

  return (
    <div className="mt-2">
      {list.length > 0 ? (
        <ul className="grid gap-1" aria-label="Objectifs">
          {list.map((objective) => (
            <li key={objective.id} className="text-sm text-[#D8DEE8]">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-xs font-semibold uppercase tracking-wide text-[#7DD3FC]">
                  Objectif
                </span>
                <span>{objective.title}</span>
                <AcademyArchiveButton level="objective" id={objective.id} title={objective.title} />
              </div>
              {objective.description ? (
                <p className="mt-0.5 whitespace-pre-wrap break-words text-xs text-[#A7B0C0]">
                  {objective.description}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
      <AcademyObjectiveCreateForm parentLevel={parentLevel} parentId={parentId} />
    </div>
  );
}

// Date d'archivage, rendue côté serveur uniquement (Server Component) : pas de
// risque d'écart d'hydratation.
const ARCHIVED_AT = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "long",
  timeZone: "Europe/Paris",
});

function ArchivedList({ state }: { state: ArchivedState }) {
  return (
    <details className="mt-6 rounded-md border border-[#1D2A44] bg-[#0B1420]/60 p-4">
      <summary className="cursor-pointer font-semibold text-[#D8DEE8] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2">
        Éléments archivés de ce programme
      </summary>
      <p className="mt-2 text-sm text-[#A7B0C0]">
        Seuls les éléments restaurables sont listés. Les éléments contenus dans un élément archivé
        réapparaissent avec lui quand il est restauré.
      </p>
      {state.status === "unavailable" ? (
        <p role="alert" className="mt-3 text-sm text-[#FCA5A5]">
          {ACADEMY_MESSAGES.unavailable}
        </p>
      ) : state.items.length === 0 ? (
        <p className="mt-3 text-sm italic text-[#A7B0C0]">Aucun élément archivé.</p>
      ) : (
        <ul className="mt-3 grid gap-2" aria-label="Éléments archivés">
          {state.items.map((item) => (
            <li key={item.id} className="flex flex-wrap items-center gap-3 text-sm">
              <span className="text-xs font-semibold uppercase tracking-wide text-[#7DD3FC]">
                {LEVEL_LABELS[item.level]}
              </span>
              <span className="font-semibold text-[#D8DEE8]">{item.title}</span>
              <span className="text-xs text-[#A7B0C0]">
                {`dans « ${item.parentTitle} », archivé le ${ARCHIVED_AT.format(new Date(item.archivedAt))}`}
              </span>
              <AcademyRestoreButton level={item.level} id={item.id} title={item.title} />
            </li>
          ))}
        </ul>
      )}
    </details>
  );
}

function EmptyLevel({ children }: { children: React.ReactNode }) {
  return <p className="mt-2 text-sm italic text-[#A7B0C0]">{children}</p>;
}

function ProgramTree({
  tree,
  objectives,
}: {
  tree: AcademyProgramTree;
  objectives: ObjectivesByParent;
}) {
  if (tree.subjects.length === 0) {
    return <EmptyLevel>Aucune matière pour l&apos;instant.</EmptyLevel>;
  }

  return (
    <ul className="mt-4 grid gap-4" aria-label="Matières">
      {tree.subjects.map((subject) => (
        <li key={subject.id} className="rounded-md border border-[#1D2A44] bg-[#0B1420] px-4 py-3">
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="text-lg font-semibold text-[#F8FAFC]">{subject.title}</h3>
            <AcademyArchiveButton level="subject" id={subject.id} title={subject.title} />
          </div>
          <ObjectiveList objectives={objectives} parentLevel="subject" parentId={subject.id} />
          {subject.units.length === 0 ? (
            <EmptyLevel>Aucun module pour l&apos;instant.</EmptyLevel>
          ) : (
            <ul className="mt-3 grid gap-3 border-l border-[#1D2A44] pl-4" aria-label="Modules">
              {subject.units.map((unit) => (
                <li key={unit.id}>
                  <div className="flex flex-wrap items-center gap-3">
                    <h4 className="font-semibold text-[#D8DEE8]">{unit.title}</h4>
                    <AcademyArchiveButton level="unit" id={unit.id} title={unit.title} />
                  </div>
                  <ObjectiveList objectives={objectives} parentLevel="unit" parentId={unit.id} />
                  {unit.chapters.length === 0 ? (
                    <EmptyLevel>Aucun chapitre pour l&apos;instant.</EmptyLevel>
                  ) : (
                    <ul
                      className="mt-2 grid gap-2 border-l border-[#1D2A44] pl-4"
                      aria-label="Chapitres"
                    >
                      {unit.chapters.map((chapter) => (
                        <li key={chapter.id}>
                          <div className="flex flex-wrap items-center gap-3">
                            <h5 className="text-sm font-semibold text-[#D8DEE8]">{chapter.title}</h5>
                            <AcademyArchiveButton level="chapter" id={chapter.id} title={chapter.title} />
                          </div>
                          <ObjectiveList objectives={objectives} parentLevel="chapter" parentId={chapter.id} />
                          {chapter.lessons.length === 0 ? (
                            <EmptyLevel>Aucune leçon pour l&apos;instant.</EmptyLevel>
                          ) : (
                            <ul
                              className="mt-1 grid gap-1 border-l border-[#1D2A44] pl-4"
                              aria-label="Leçons"
                            >
                              {chapter.lessons.map((lesson) => (
                                <li
                                  key={lesson.id}
                                  className="flex flex-wrap items-center gap-3 text-sm text-[#A7B0C0]"
                                >
                                  <Link
                                    href={`/interface/academy/lecons/${lesson.id}`}
                                    className="hover:text-[#39E6D0] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                                  >
                                    {lesson.title}
                                  </Link>
                                  <AcademyArchiveButton level="lesson" id={lesson.id} title={lesson.title} />
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

  const archived: ArchivedState =
    state.status === "ok" ? await readArchived(user.id, id) : { status: "ok", items: [] };
  const objectives: ObjectivesByParent =
    state.status === "ok" ? await readObjectives(user.id, id) : new Map();

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
          {objectives === null ? (
            <p role="alert" className="mt-3 text-sm text-[#FCA5A5]">
              {`Objectifs : ${ACADEMY_MESSAGES.unavailable}`}
            </p>
          ) : null}
          <ObjectiveList objectives={objectives} parentLevel="program" parentId={state.tree.id} />
          <ProgramTree tree={state.tree} objectives={objectives} />
          <AcademySubjectCreateForm programId={state.tree.id} />
          <ArchivedList state={archived} />
        </>
      )}
    </section>
  );
}
