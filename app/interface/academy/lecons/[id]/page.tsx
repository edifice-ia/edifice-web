import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isUuid, type AcademyLesson } from "@/lib/academy/hierarchy";
import { ACADEMY_MESSAGES } from "@/lib/academy/http";
import { AcademyStoreError, getLiveLesson } from "@/lib/server/academy/hierarchy-store";
import { requirePrivateCockpitAccess } from "@/src/lib/auth/guards";

// Page Leçon — interface de l'étape 2a, en lecture seule.
//
// Server Component, sur le modèle de programmes/[id]/page.tsx : lit directement
// le store avec l'utilisateur de la session. Identifiant malformé, leçon
// inexistante, archivée, masquée par un ancêtre archivé ou appartenant à un
// autre compte : même 404 (notFound), sans distinction.
//
// Le contenu est rendu comme texte brut (whitespace-pre-wrap) : ni HTML, ni
// Markdown, ni dangerouslySetInnerHTML.
//
// Lien de retour vers la liste des programmes, et non vers le programme :
// AcademyLesson porte chapterId, mais pas l'identifiant du programme, et la
// retrouver demanderait une lecture de plus que le store n'expose pas.

type AcademyLessonPageProps = {
  params: Promise<{ id: string }>;
};

export const metadata: Metadata = {
  title: "Leçon - Academy - L'Édifice",
};

type LessonState =
  | { status: "ok"; lesson: AcademyLesson }
  | { status: "not_found" }
  | { status: "unavailable" };

async function readLesson(userId: string, lessonId: string): Promise<LessonState> {
  try {
    const result = await getLiveLesson(userId, lessonId);

    return result.status === "ok"
      ? { status: "ok", lesson: result.value }
      : { status: "not_found" };
  } catch (error) {
    // Le store a déjà journalisé le détail : rien de technique n'est affiché.
    // Toute autre exception remonte à la frontière d'erreur.
    if (error instanceof AcademyStoreError) {
      return { status: "unavailable" };
    }

    throw error;
  }
}

export default async function AcademyLessonPage({ params }: AcademyLessonPageProps) {
  const user = await requirePrivateCockpitAccess();
  const { id } = await params;

  // UUID validé avant tout appel au store ; malformé : même 404 qu'un inexistant.
  if (!isUuid(id)) {
    notFound();
  }

  const state = await readLesson(user.id, id);

  if (state.status === "not_found") {
    notFound();
  }

  return (
    <section
      aria-labelledby="academy-lesson-title"
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
          <h2 id="academy-lesson-title" className="mt-4 text-2xl font-semibold text-[#F8FAFC]">
            Leçon
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
          <h2 id="academy-lesson-title" className="mt-4 text-2xl font-semibold text-[#F8FAFC]">
            {state.lesson.title}
          </h2>
          {state.lesson.content ? (
            <div className="mt-6 whitespace-pre-wrap break-words rounded-md border border-[#1D2A44] bg-[#0B1420] px-4 py-3 leading-7 text-[#D8DEE8]">
              {state.lesson.content}
            </div>
          ) : (
            <p className="mt-6 text-sm italic text-[#A7B0C0]">
              Cette leçon n&apos;a pas encore de contenu.
            </p>
          )}
        </>
      )}
    </section>
  );
}
