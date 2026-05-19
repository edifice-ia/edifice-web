import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Conditions d'utilisation - L'Edifice",
  description:
    "Conditions d'utilisation de L'Edifice: usage prive, beta, responsabilite, automatisations et APIs tierces.",
};

const terms = [
  {
    title: "Usage prive et beta",
    text: "L'Edifice est actuellement une version privee en developpement. L'acces peut etre limite, modifie, suspendu ou retire pendant les phases de test, de maintenance ou d'evolution du produit.",
  },
  {
    title: "Responsabilite utilisateur",
    text: "L'utilisateur reste responsable des contenus generes, importes, valides, programmes ou publies via le systeme, ainsi que du respect des lois, droits de tiers et regles propres aux plateformes utilisees.",
  },
  {
    title: "Automatisation de publication",
    text: "Les agents et pipelines peuvent preparer, programmer ou assister la publication de contenus. Toute publication automatique ou semi-automatique doit etre verifiee avant activation lorsque le contexte l'exige.",
  },
  {
    title: "APIs tierces",
    text: "Les integrations YouTube, TikTok, Instagram / Meta, Pinterest, Notion, OpenAI, ElevenLabs ou autres services dependent de leurs propres APIs, permissions, limites, disponibilites et conditions d'utilisation.",
  },
  {
    title: "Limitation de responsabilite",
    text: "L'Edifice est fourni en l'etat pendant son developpement prive. Aucune garantie n'est donnee sur l'absence d'erreurs, l'accessibilite continue, la validation des APIs tierces ou le resultat des contenus generes.",
  },
  {
    title: "Suspension ou retrait d'acces",
    text: "L'acces peut etre suspendu ou retire en cas de risque technique, usage non conforme, exposition de donnees sensibles, demande de maintenance ou decision liee a la securite du projet.",
  },
  {
    title: "Contact",
    text: "Adresse de contact officielle provisoire : contact.edificeia@gmail.com. Cette adresse sert aux demandes liees aux donnees, a la suppression des donnees, a l'acces API et au contact general.",
  },
];

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-5xl px-5 py-14 sm:px-8 lg:py-20">
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#7DD3FC]">
        Legal
      </p>
      <h1 className="mt-4 text-4xl font-semibold text-[#F4F7FB] sm:text-5xl">
        Conditions d&apos;utilisation
      </h1>
      <p className="mt-5 text-lg leading-8 text-[#9EADBF]">
        Ces conditions encadrent l&apos;utilisation de L&apos;Edifice dans sa version
        privee et en developpement.
      </p>

      <div className="mt-10 grid gap-4">
        {terms.map((section) => (
          <section
            key={section.title}
            className="rounded-lg border border-[#223149] bg-[#0F1724] p-6"
          >
            <h2 className="text-xl font-semibold text-[#F4F7FB]">
              {section.title}
            </h2>
            <p className="mt-3 leading-7 text-[#9EADBF]">{section.text}</p>
          </section>
        ))}
      </div>
    </div>
  );
}
