import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Politique de confidentialite - L'Edifice",
  description:
    "Politique de confidentialite de L'Edifice: donnees, tokens API, stockage, suppression et services tiers.",
};

const sections = [
  {
    title: "Donnees de compte",
    text: "Lorsque l'acces utilisateur sera active, L'Edifice pourra traiter les informations necessaires a l'identification et a la gestion d'un compte prive, comme l'adresse email, le statut d'acces et les parametres associes.",
  },
  {
    title: "Tokens API et identifiants techniques",
    text: "Les tokens API, identifiants OAuth ou secrets necessaires aux integrations tierces sont traites comme des donnees sensibles. Ils ne doivent pas etre exposes publiquement et sont utilises uniquement pour connecter les services autorises par l'utilisateur ou l'administrateur.",
  },
  {
    title: "Donnees de publication",
    text: "L'Edifice peut manipuler des scripts, descriptions, metadonnees, fichiers de planification, videos, images, sous-titres et statuts de publication afin de preparer ou suivre les contenus multi-plateformes.",
  },
  {
    title: "Donnees techniques",
    text: "Le systeme peut conserver des journaux, statuts d'agents, rapports d'execution, erreurs techniques, horodatages et informations de pipeline afin d'assurer le suivi, la maintenance et la securite du cockpit.",
  },
  {
    title: "Utilisation des donnees",
    text: "Les donnees sont utilisees pour organiser les agents IA, generer des contenus, monter des videos, programmer des publications, preparer les integrations API, documenter le systeme et assister le pilotage prive.",
  },
  {
    title: "Stockage",
    text: "La version actuelle repose principalement sur un environnement prive local. Les donnees peuvent etre stockees dans des dossiers de projet, de memoire, de documentation, de journaux et dans des services tiers connectes selon les integrations activees.",
  },
  {
    title: "Suppression des donnees",
    text: "Une demande de suppression pourra porter sur les donnees de compte, contenus, journaux associes, tokens connectes et informations de publication, sous reserve des obligations de conservation applicables aux services tiers.",
  },
  {
    title: "Contact",
    text: "Adresse de contact officielle provisoire : contact.edificeia@gmail.com. Cette adresse sert aux demandes liees aux donnees, a la suppression des donnees, a l'acces API et au contact general.",
  },
];

const thirdParties = [
  "YouTube",
  "TikTok",
  "Instagram / Meta",
  "Pinterest",
  "Notion",
  "OpenAI",
  "ElevenLabs",
];

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-5xl px-5 py-14 sm:px-8 lg:py-20">
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-200">
        Legal
      </p>
      <h1 className="mt-4 text-4xl font-semibold text-white sm:text-5xl">
        Politique de confidentialite
      </h1>
      <p className="mt-5 text-lg leading-8 text-slate-300">
        Cette politique decrit les principes applicables a L&apos;Edifice, portail
        officiel et cockpit IA prive en developpement. Elle sera mise a jour au
        fur et a mesure de l&apos;activation des acces utilisateurs et integrations.
      </p>

      <div className="mt-10 grid gap-4">
        {sections.map((section) => (
          <section
            key={section.title}
            className="rounded-lg border border-white/10 bg-white/[0.035] p-6"
          >
            <h2 className="text-xl font-semibold text-white">
              {section.title}
            </h2>
            <p className="mt-3 leading-7 text-slate-400">{section.text}</p>
          </section>
        ))}
      </div>

      <section className="mt-10 rounded-lg border border-white/10 bg-[#0f151c] p-6">
        <h2 className="text-xl font-semibold text-white">Services tiers</h2>
        <p className="mt-3 leading-7 text-slate-400">
          Selon les modules actives, L&apos;Edifice peut interagir avec les services
          suivants. Chaque service conserve ses propres conditions, politiques
          de confidentialite, permissions API et mecanismes de retrait
          d&apos;acces.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          {thirdParties.map((service) => (
            <span
              key={service}
              className="rounded-md border border-cyan-300/20 bg-cyan-300/10 px-4 py-2 text-sm text-cyan-100"
            >
              {service}
            </span>
          ))}
        </div>
      </section>
    </div>
  );
}
