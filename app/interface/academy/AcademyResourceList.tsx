import Link from "next/link";
import type { AcademyResource } from "@/lib/academy/hierarchy";
import { AcademyArchiveButton } from "./AcademyArchiveControls";

// Liste de ressources pédagogiques (étape 2b-2), rendue côté serveur : utilisée
// par l'arbre d'un programme, la page Leçon et la page Ressources.
//
// Un lien s'ouvre dans un nouvel onglet, avec rel="noopener noreferrer", et
// affiche son nom de domaine. Il n'est rendu en lien que si son URL est http ou
// https — la base et le parser l'imposent déjà ; ce contrôle à l'affichage est
// une troisième barrière. Un texte est rendu en texte brut (whitespace-pre-wrap) :
// ni HTML, ni Markdown, ni dangerouslySetInnerHTML.

type ResourceRow = AcademyResource & {
  // Leçon à laquelle la ressource est rattachée, pour la page Ressources.
  lessonLink?: { id: string; title: string };
};

function safeHttpUrl(url: string | null): URL | null {
  if (!url) {
    return null;
  }

  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:" ? parsed : null;
  } catch {
    return null;
  }
}

function ResourceItem({ resource }: { resource: ResourceRow }) {
  const link = resource.kind === "link" ? safeHttpUrl(resource.url) : null;

  return (
    <li className="text-sm text-[#D8DEE8]">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-xs font-semibold uppercase tracking-wide text-[#7DD3FC]">
          {resource.kind === "link" ? "Lien" : "Texte"}
        </span>
        {link ? (
          <a
            href={link.href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#39E6D0] underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            {resource.title}
          </a>
        ) : (
          <span>{resource.title}</span>
        )}
        {link ? <span className="text-xs text-[#A7B0C0]">{link.hostname}</span> : null}
        {resource.lessonLink ? (
          <span className="text-xs text-[#A7B0C0]">
            {"Leçon : "}
            <Link
              href={`/interface/academy/lecons/${resource.lessonLink.id}`}
              className="hover:text-[#39E6D0] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              {resource.lessonLink.title}
            </Link>
          </span>
        ) : null}
        <AcademyArchiveButton level="resource" id={resource.id} title={resource.title} />
      </div>
      {resource.kind === "text" && resource.body ? (
        <p className="mt-1 whitespace-pre-wrap break-words rounded-md border border-[#1D2A44] bg-[#0B1420] px-3 py-2 text-sm text-[#D8DEE8]">
          {resource.body}
        </p>
      ) : null}
    </li>
  );
}

export function AcademyResourceList({
  resources,
  emptyLabel,
}: {
  resources: ResourceRow[];
  // Phrase affichée si la liste est vide ; rien si null.
  emptyLabel: string | null;
}) {
  if (resources.length === 0) {
    return emptyLabel ? <p className="mt-2 text-sm italic text-[#A7B0C0]">{emptyLabel}</p> : null;
  }

  return (
    <ul className="mt-2 grid gap-2" aria-label="Ressources">
      {resources.map((resource) => (
        <ResourceItem key={resource.id} resource={resource} />
      ))}
    </ul>
  );
}
