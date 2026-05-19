import Link from "next/link";

const pillars = [
  {
    title: "Centraliser les operations",
    text: "Un point d'entree clair pour suivre les agents, les pipelines, les contenus, la documentation et les statuts locaux.",
  },
  {
    title: "Structurer la production IA",
    text: "Des orchestrateurs et agents unitaires encadrent l'ideation, la generation, le montage, la planification et la preparation de publication.",
  },
  {
    title: "Garder le controle",
    text: "L'Edifice reste une version privee: les automatisations sont pilotees, documentees et verifiees avant toute ouverture utilisateur.",
  },
];

const features = [
  "Agents IA organises par groupes",
  "Generation de contenus courts",
  "Montage video automatise",
  "Planification multi-plateformes",
  "Preparation de publication via APIs",
  "Memoire locale et documentation Notion",
];

const platforms = [
  "YouTube",
  "TikTok",
  "Instagram / Meta",
  "Pinterest",
  "Notion",
  "OpenAI",
  "ElevenLabs",
];

export default function Home() {
  return (
    <div>
      <section className="border-b border-white/10">
        <div className="mx-auto grid max-w-7xl gap-12 px-5 py-16 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:py-24">
          <div>
            <p className="mb-5 inline-flex rounded-md border border-cyan-300/25 bg-cyan-300/10 px-3 py-2 text-sm font-medium text-cyan-100">
              Version privee en developpement
            </p>
            <h1 className="max-w-4xl text-5xl font-semibold tracking-normal text-white sm:text-6xl">
              L&apos;Edifice
            </h1>
            <p className="mt-6 max-w-3xl text-xl leading-8 text-slate-300">
              Cockpit IA prive pour organiser, generer, planifier et piloter
              des contenus multi-plateformes.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/login"
                className="rounded-md bg-cyan-200 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-white"
              >
                Connexion
              </Link>
              <Link
                href="/features"
                className="rounded-md border border-white/15 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/8"
              >
                Fonctionnalites
              </Link>
              <Link
                href="/privacy"
                className="rounded-md border border-white/15 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/8"
              >
                Politique de confidentialite
              </Link>
              <Link
                href="/terms"
                className="rounded-md border border-white/15 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/8"
              >
                Conditions d&apos;utilisation
              </Link>
            </div>
          </div>

          <div className="rounded-lg border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-black/20">
            <div className="grid gap-3">
              {[
                ["Agents declares", "17"],
                ["Pipelines suivis", "Shorts, Pinterest, Assistant Global"],
                ["Socle actuel", "Cockpit Streamlit V2"],
                ["Statut", "Portail officiel V1"],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-md border border-white/10 bg-[#0f151c] p-4"
                >
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                    {label}
                  </p>
                  <p className="mt-2 text-lg font-semibold text-white">
                    {value}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-16 sm:px-8">
        <div className="max-w-3xl">
          <h2 className="text-3xl font-semibold text-white">
            Pourquoi L&apos;Edifice
          </h2>
          <p className="mt-4 text-lg leading-8 text-slate-300">
            L&apos;Edifice rassemble les briques d&apos;une production IA serieuse:
            agents, memoire locale, journaux, pipelines, documentation et
            preparation des integrations API. Le site presente ce socle sans
            remplacer le cockpit local operationnel.
          </p>
        </div>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {pillars.map((item) => (
            <article
              key={item.title}
              className="rounded-lg border border-white/10 bg-white/[0.035] p-6"
            >
              <h3 className="text-lg font-semibold text-white">{item.title}</h3>
              <p className="mt-3 leading-7 text-slate-400">{item.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y border-white/10 bg-white/[0.025]">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-16 sm:px-8 lg:grid-cols-2">
          <div>
            <h2 className="text-3xl font-semibold text-white">
              Fonctionnalites principales
            </h2>
            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              {features.map((feature) => (
                <div
                  key={feature}
                  className="rounded-md border border-white/10 bg-[#0f151c] px-4 py-3 text-slate-200"
                >
                  {feature}
                </div>
              ))}
            </div>
          </div>
          <div>
            <h2 className="text-3xl font-semibold text-white">
              Plateformes compatibles
            </h2>
            <p className="mt-4 leading-7 text-slate-400">
              Les integrations sont traitees comme des services tiers connectes
              ou en preparation selon le module: publication, documentation,
              IA, voix et contenus sociaux.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              {platforms.map((platform) => (
                <span
                  key={platform}
                  className="rounded-md border border-cyan-300/20 bg-cyan-300/10 px-4 py-2 text-sm text-cyan-100"
                >
                  {platform}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-8 px-5 py-16 sm:px-8 lg:grid-cols-2">
        <div>
          <h2 className="text-3xl font-semibold text-white">
            Version privee en developpement
          </h2>
          <p className="mt-4 text-lg leading-8 text-slate-300">
            L&apos;acces utilisateur, l&apos;authentification et les espaces personnels
            seront actives progressivement. Aujourd&apos;hui, le site sert de
            portail officiel, legal et preparatoire pour le futur acces web.
          </p>
        </div>
        <div className="rounded-lg border border-white/10 bg-white/[0.04] p-6">
          <h2 className="text-2xl font-semibold text-white">Contact</h2>
          <p className="mt-4 leading-7 text-slate-400">
            Pour toute demande concernant l&apos;acces, les donnees ou les APIs,
            la page contact centralise les informations du projet.
          </p>
          <Link
            href="/contact"
            className="mt-6 inline-flex rounded-md bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-100"
          >
            Aller au contact
          </Link>
        </div>
      </section>
    </div>
  );
}
