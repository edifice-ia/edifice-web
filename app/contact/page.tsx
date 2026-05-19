import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact - L'Edifice",
  description: "Contact pour L'Edifice, version privee en developpement.",
};

export default function ContactPage() {
  return (
    <div className="mx-auto grid min-h-[calc(100vh-220px)] max-w-7xl items-center gap-10 px-5 py-14 sm:px-8 lg:grid-cols-[0.9fr_1.1fr]">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-200">
          Contact
        </p>
        <h1 className="mt-4 text-4xl font-semibold text-white sm:text-5xl">
          L&apos;Edifice
        </h1>
        <p className="mt-5 max-w-xl text-lg leading-8 text-slate-300">
          Version privee en developpement. Pour toute demande concernant
          l&apos;acces, les donnees ou les APIs, utilisez les informations de
          contact du projet.
        </p>
      </div>

      <section className="rounded-lg border border-white/10 bg-white/[0.04] p-6 sm:p-8">
        <dl className="grid gap-6">
          <div>
            <dt className="text-sm uppercase tracking-[0.18em] text-slate-500">
              Projet
            </dt>
            <dd className="mt-2 text-xl font-semibold text-white">
              L&apos;Edifice
            </dd>
          </div>
          <div>
            <dt className="text-sm uppercase tracking-[0.18em] text-slate-500">
              Statut
            </dt>
            <dd className="mt-2 text-xl font-semibold text-white">
              Version privee en developpement
            </dd>
          </div>
          <div>
            <dt className="text-sm uppercase tracking-[0.18em] text-slate-500">
              Email
            </dt>
            <dd className="mt-2 text-xl font-semibold text-white">
              contact.edificeia@gmail.com
            </dd>
          </div>
          <div>
            <dt className="text-sm uppercase tracking-[0.18em] text-slate-500">
              Message
            </dt>
            <dd className="mt-2 leading-7 text-slate-300">
              Adresse de contact officielle provisoire :
              contact.edificeia@gmail.com. Cette adresse sert aux demandes
              liees aux donnees, a la suppression des donnees, a l&apos;acces API
              et au contact general.
            </dd>
          </div>
        </dl>
      </section>
    </div>
  );
}
