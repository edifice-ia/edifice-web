import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { DemoReviewerAgent } from "./DemoReviewerAgent";
import { getCurrentUser } from "@/src/lib/supabase/server";

export const metadata: Metadata = {
  title: "Interface - L'Edifice",
  description:
    "Interface privee de demonstration reviewer pour le portail L'Edifice.",
};

export default async function InterfacePage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const isProjectOwner = user.email === "contact.edificeia@gmail.com";

  return (
    <div className="mx-auto max-w-7xl px-5 py-14 sm:px-8 lg:py-20">
      <div className="mb-8 rounded-lg border border-[#223149] bg-[#0F1724] p-6">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#7DD3FC]">
          Interface privee
        </p>
        <h1 className="mt-4 text-4xl font-semibold text-[#F4F7FB] sm:text-5xl">
          Cockpit Web L&apos;Edifice
        </h1>
        <p className="mt-5 max-w-3xl text-lg leading-8 text-[#9EADBF]">
          Le Cockpit Web est l&apos;interface privee du portail L&apos;Edifice.
          Le Cockpit local Streamlit reste l&apos;interface operationnelle interne.
        </p>
        <p className="mt-4 text-sm text-[#9EADBF]">
          Session connectee : <span className="text-[#F4F7FB]">{user.email}</span>
        </p>
      </div>

      <DemoReviewerAgent />

      {isProjectOwner ? (
        // Owner-only local cockpit link
        <section className="mt-8 rounded-lg border border-[#223149] bg-[#0F1724] p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#7DD3FC]">
                Interface locale Streamlit
              </p>
              <h2 className="mt-3 text-2xl font-semibold text-[#F4F7FB]">
                Cockpit local proprietaire
              </h2>
              <p className="mt-3 leading-7 text-[#9EADBF]">
                Ouvre le cockpit local Streamlit lorsque celui-ci est lance sur
                cette machine.
              </p>
              <p className="mt-3 rounded-md border border-[#223149] bg-[#111D2E] px-4 py-3 text-sm font-semibold text-[#7DD3FC]">
                Disponible uniquement en local. Non accessible aux reviewers
                externes.
              </p>
            </div>
            <a
              href="http://localhost:8501"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex rounded-md border border-[#38BDF8]/50 bg-[#111D2E] px-5 py-3 text-sm font-semibold text-[#7DD3FC] transition hover:bg-[#1E293B] hover:text-[#F4F7FB] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              Ouvrir l&apos;interface locale
            </a>
          </div>
        </section>
      ) : null}
    </div>
  );
}
