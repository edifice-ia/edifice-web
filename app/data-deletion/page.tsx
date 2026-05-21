import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Suppression des donnees utilisateur - L'Edifice",
  description:
    "Informations pour demander la suppression des donnees utilisateur liees a Edifice IA.",
};

export default function DataDeletionPage() {
  return (
    <div className="mx-auto max-w-5xl px-5 py-14 sm:px-8 lg:py-20">
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#7DD3FC]">
        Donnees utilisateur
      </p>
      <h1 className="mt-4 text-4xl font-semibold text-[#F4F7FB] sm:text-5xl">
        Suppression des donnees utilisateur
      </h1>

      <section className="mt-10 rounded-lg border border-[#223149] bg-[#0F1724] p-6 sm:p-8">
        <div className="space-y-6 text-lg leading-8 text-[#9EADBF]">
          <p>
            Edifice IA ne stocke pas de donnees Facebook personnelles en dehors
            des informations strictement necessaires a l&apos;authentification et au
            fonctionnement de l&apos;application.
          </p>
          <p>
            Si vous souhaitez demander la suppression de vos donnees liees a
            Edifice IA, contactez-nous a l&apos;adresse suivante :
          </p>
          <p className="rounded-md border border-[#223149] bg-[#111D2E] px-4 py-3 font-semibold text-[#7DD3FC]">
            <a
              href="mailto:contact@edificeia.com"
              className="transition hover:text-[#F4F7FB]"
            >
              contact@edificeia.com
            </a>
          </p>
          <p>Votre demande sera traitee dans les meilleurs delais.</p>
        </div>
      </section>
    </div>
  );
}
