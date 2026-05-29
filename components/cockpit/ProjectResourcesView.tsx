import Link from "next/link";
import {
  projectResourceCategories,
  projectResources,
  type ProjectResource,
  type ProjectResourceStatus,
} from "@/lib/resources/project-resources";
import { CockpitHeader } from "./CockpitHeader";
import { SectionContainer } from "./SectionContainer";

const statusClasses: Record<ProjectResourceStatus, string> = {
  actif: "border-[#39E6D0]/40 bg-[#39E6D0]/10 text-[#39E6D0]",
  "a configurer": "border-[#64748b]/40 bg-[#64748b]/10 text-[#cbd5e1]",
  review: "border-[#f59e0b]/40 bg-[#f59e0b]/10 text-[#fbbf24]",
  externe: "border-[#38BDF8]/40 bg-[#38BDF8]/10 text-[#7DD3FC]",
};

const statusLabels: Record<ProjectResourceStatus, string> = {
  actif: "actif",
  "a configurer": "à configurer",
  review: "review",
  externe: "externe",
};

export function ProjectResourcesView() {
  return (
    <div>
      <CockpitHeader
        eyebrow="Ressources"
        title="Ressources opérationnelles"
        description="Accès rapide aux plateformes externes nécessaires au pilotage de L'Édifice. Aucun secret, token ou action sensible n'est exposé ici."
        status="Disponible"
      />

      <div className="grid gap-6">
        {projectResourceCategories.map((category) => {
          const resources = projectResources.filter(
            (resource) => resource.category === category,
          );

          return (
            <SectionContainer key={category}>
              <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#39E6D0]">
                    {category}
                  </p>
                  <h2 className="mt-2 text-xl font-semibold text-[#F8FAFC]">
                    Accès utiles
                  </h2>
                </div>
                <p className="text-sm text-[#A7B0C0]">
                  {resources.length} ressources
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {resources.map((resource) => (
                  <ResourceCard
                    key={`${resource.category}-${resource.name}`}
                    resource={resource}
                  />
                ))}
              </div>
            </SectionContainer>
          );
        })}
      </div>
    </div>
  );
}

function ResourceCard({ resource }: { resource: ProjectResource }) {
  const isInternal = resource.url.startsWith("/");
  const className =
    "group flex min-h-[210px] flex-col justify-between rounded-lg border border-[#1D2A44] bg-[#08111A] p-4 transition hover:border-[#39E6D0]/60 hover:bg-[#0B1420] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2";
  const content = (
    <>
      <div>
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-base font-semibold text-[#F8FAFC]">
            {resource.name}
          </h3>
          <span
            className={`shrink-0 rounded-md border px-2.5 py-1 text-xs font-semibold ${statusClasses[resource.status]}`}
          >
            {statusLabels[resource.status]}
          </span>
        </div>
        <p className="mt-3 text-sm leading-6 text-[#A7B0C0]">
          {resource.description}
        </p>
        <p className="mt-3 text-xs font-semibold uppercase tracking-[0.16em] text-[#64748b]">
          {resource.category}
        </p>
      </div>
      <span className="mt-5 inline-flex w-fit rounded-md border border-[#39E6D0]/50 bg-[#39E6D0]/10 px-3 py-2 text-sm font-semibold text-[#39E6D0] transition group-hover:text-[#F8FAFC]">
        Ouvrir
      </span>
    </>
  );

  if (isInternal) {
    return (
      <Link href={resource.url} className={className}>
        {content}
      </Link>
    );
  }

  return (
    <a
      href={resource.url}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
    >
      {content}
    </a>
  );
}
