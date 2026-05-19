import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Fonctionnalites - L'Edifice",
  description:
    "Modules principaux de L'Edifice: agents IA, contenus, montage, planification, publication API, Notion, pipelines et Assistant Global.",
};

const features = [
  {
    title: "Agents IA",
    text: "Registre d'agents organises par groupe, type, plateforme et pipeline, avec suivi des statuts locaux.",
  },
  {
    title: "Generation de contenus",
    text: "Production de scripts, posts, descriptions, hashtags et ressources de preparation pour les projets actifs.",
  },
  {
    title: "Montage automatise",
    text: "Preparation de videos courtes avec voix, sous-titres, visuels et exports prets a programmer.",
  },
  {
    title: "Planification",
    text: "Scheduler multi-plateformes avec dates, heures, files de publication et dossiers de contenus programmes.",
  },
  {
    title: "Publication via APIs",
    text: "Modules de publication ou de preparation pour YouTube, TikTok, Instagram / Meta et Pinterest, selon validation des acces.",
  },
  {
    title: "Documentation Notion",
    text: "Synchronisation et structuration de la documentation projet pour garder une memoire exploitable.",
  },
  {
    title: "Tableau de bord local",
    text: "Cockpit Streamlit V2 pour lancer les agents, lire les journaux, suivre les exports et consulter l'etat systeme.",
  },
  {
    title: "Pipelines de production",
    text: "Pipelines Shorts, Pinterest et Assistant Global pour enchainer generation, selection, montage, scheduling et documentation.",
  },
  {
    title: "Assistant Global IA",
    text: "Agent systeme charge de lire la documentation, la memoire locale et les statuts afin d'assister le pilotage.",
  },
];

export default function FeaturesPage() {
  return (
    <div className="mx-auto max-w-7xl px-5 py-14 sm:px-8 lg:py-20">
      <div className="max-w-3xl">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#7DD3FC]">
          Modules
        </p>
        <h1 className="mt-4 text-4xl font-semibold text-[#F4F7FB] sm:text-5xl">
          Fonctionnalites de L&apos;Edifice
        </h1>
        <p className="mt-5 text-lg leading-8 text-[#9EADBF]">
          La V1 web presente les capacites du cockpit prive sans ouvrir encore
          les commandes operationnelles. Le pilotage actif reste dans
          l&apos;interface locale.
        </p>
      </div>

      <div className="mt-12 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {features.map((feature) => (
          <article
            key={feature.title}
            className="rounded-lg border border-[#223149] bg-[#0F1724] p-6"
          >
            <h2 className="text-xl font-semibold text-[#F4F7FB]">
              {feature.title}
            </h2>
            <p className="mt-3 leading-7 text-[#9EADBF]">{feature.text}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
