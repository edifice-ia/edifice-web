import type { Metadata } from "next";
import { LogoMark } from "../components/LogoMark";

export const metadata: Metadata = {
  title: "Contact - L’Édifice",
  description: "Contact pour L’Édifice, version privee en developpement.",
};

export default function ContactPage() {
  return (
    <div className="mx-auto grid min-h-[calc(100vh-220px)] max-w-7xl items-center gap-10 px-5 py-14 sm:px-8 lg:grid-cols-[0.9fr_1.1fr]">
      <div>
        <LogoMark size="md" priority />
        <p className="mt-6 text-sm font-semibold uppercase tracking-[0.18em] text-[#7DD3FC]">
          Contact
        </p>
        <h1 className="mt-4 text-4xl font-semibold text-[#F4F7FB] sm:text-5xl">
          L’Édifice
        </h1>
        <p className="mt-5 max-w-xl text-lg leading-8 text-[#9EADBF]">
          Version privee en developpement. Pour toute demande concernant
          l&apos;acces, les donnees ou les APIs, utilisez les informations de
          contact du projet.
        </p>
      </div>

      <section className="rounded-lg border border-[#223149] bg-[#0F1724] p-6 sm:p-8">
        <dl className="grid gap-6">
          <div>
            <dt className="text-sm uppercase tracking-[0.18em] text-[#9EADBF]">
              Projet
            </dt>
            <dd className="mt-2 text-xl font-semibold text-[#F4F7FB]">
              L’Édifice
            </dd>
          </div>
          <div>
            <dt className="text-sm uppercase tracking-[0.18em] text-[#9EADBF]">
              Statut
            </dt>
            <dd className="mt-2 text-xl font-semibold text-[#F4F7FB]">
              Version privee en developpement
            </dd>
          </div>
          <div>
            <dt className="text-sm uppercase tracking-[0.18em] text-[#9EADBF]">
              Email
            </dt>
            <dd className="mt-2 text-xl font-semibold text-[#F4F7FB]">
              <a
                href="mailto:contact@edificeia.com"
                className="text-[#7DD3FC] transition hover:text-[#F4F7FB]"
              >
                contact@edificeia.com
              </a>
            </dd>
          </div>
          <div>
            <dt className="text-sm uppercase tracking-[0.18em] text-[#9EADBF]">
              Message
            </dt>
            <dd className="mt-2 leading-7 text-[#9EADBF]">
              Adresse de contact officielle :
              contact@edificeia.com. Cette adresse sert aux demandes
              liees aux donnees, a la suppression des donnees, a l&apos;acces API
              et au contact general.
            </dd>
          </div>
        </dl>
      </section>
    </div>
  );
}
