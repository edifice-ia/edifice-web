import Link from "next/link";
import {
  projectResourceCategories,
  projectResources,
  type ProjectResource,
  type ProjectResourceLinkStatus,
  type ProjectResourceProjectStatus,
} from "@/lib/resources/project-resources";
import { CockpitHeader } from "./CockpitHeader";
import { SectionContainer } from "./SectionContainer";

const linkStatusClasses: Record<ProjectResourceLinkStatus, string> = {
  accessible: "border-[#39E6D0]/40 bg-[#39E6D0]/10 text-[#39E6D0]",
  inaccessible: "border-[#ef4444]/40 bg-[#ef4444]/10 text-[#fecaca]",
  "non testé": "border-[#64748b]/40 bg-[#64748b]/10 text-[#cbd5e1]",
};

const projectStatusClasses: Record<ProjectResourceProjectStatus, string> = {
  actif: "border-[#39E6D0]/40 bg-[#39E6D0]/10 text-[#39E6D0]",
  "à configurer": "border-[#64748b]/40 bg-[#64748b]/10 text-[#cbd5e1]",
  review: "border-[#f59e0b]/40 bg-[#f59e0b]/10 text-[#fbbf24]",
  "en migration": "border-[#38BDF8]/40 bg-[#38BDF8]/10 text-[#7DD3FC]",
  bloqué: "border-[#ef4444]/40 bg-[#ef4444]/10 text-[#fecaca]",
  externe: "border-[#38BDF8]/40 bg-[#38BDF8]/10 text-[#7DD3FC]",
};

const projectStatusLabels: Record<ProjectResourceProjectStatus, string> = {
  actif: "actif",
  "à configurer": "à configurer",
  review: "review",
  "en migration": "en migration",
  bloqué: "bloqué",
  externe: "externe",
};

export function ProjectResourcesView() {
  console.info("[Resources] loaded");

  return (
    <div>
      <CockpitHeader
        eyebrow="Ressources"
        title="Ressources operationnelles"
        description="Acces rapide aux plateformes externes necessaires au pilotage de L'Edifice. Le statut du lien est separe de l'etat projet. Aucun secret, token ou action sensible n'est expose ici."
        status="Disponible"
      />

      <div className="grid gap-6">
        <SectionContainer>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#39E6D0]">
                Memoire projet
              </p>
              <h2 className="mt-2 text-xl font-semibold text-[#F8FAFC]">
                Etat editable par confirmation assistant
              </h2>
              <p className="mt-2 text-sm leading-6 text-[#A7B0C0]">
                Consulter les cles, statuts, valeurs et sources que l&apos;Assistant
                Edifice peut mettre a jour apres confirmation.
              </p>
            </div>
            <Link
              href="/interface/resources/memory"
              className="inline-flex w-fit rounded-md border border-[#39E6D0]/50 bg-[#39E6D0]/10 px-4 py-2 text-sm font-semibold text-[#39E6D0] transition hover:bg-[#1D2A44]"
            >
              Ouvrir memoire projet
            </Link>
          </div>
        </SectionContainer>

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
                    Acces utiles
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
    "group flex min-h-[260px] flex-col justify-between rounded-lg border border-[#1D2A44] bg-[#08111A] p-4 transition hover:border-[#39E6D0]/60 hover:bg-[#0B1420] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2";
  const content = (
    <>
      <div>
        <h3 className="text-base font-semibold text-[#F8FAFC]">
          {resource.name}
        </h3>
        <p className="mt-3 text-sm leading-6 text-[#A7B0C0]">
          {resource.description}
        </p>
        <div className="mt-4 grid gap-2">
          <StatusLine
            label="Lien"
            value={resource.linkStatus}
            className={linkStatusClasses[resource.linkStatus]}
          />
          <StatusLine
            label="Projet"
            value={projectStatusLabels[resource.projectStatus]}
            className={projectStatusClasses[resource.projectStatus]}
          />
        </div>
        <p className="mt-4 rounded-md border border-[#1D2A44] bg-[#03070B] px-3 py-2 text-xs leading-5 text-[#A7B0C0]">
          {resource.note}
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

function StatusLine({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 text-xs">
      <span className="font-semibold uppercase tracking-[0.14em] text-[#A7B0C0]">
        {label}
      </span>
      <span className={`rounded-md border px-2.5 py-1 font-semibold ${className}`}>
        {value}
      </span>
    </div>
  );
}
