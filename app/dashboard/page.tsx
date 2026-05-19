import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LogoMark } from "../components/LogoMark";
import { logout } from "../login/actions";
import { getCurrentUser } from "@/src/lib/supabase/server";

export const metadata: Metadata = {
  title: "Dashboard - L'Edifice",
  description: "Dashboard prive minimal de L'Edifice, version en developpement.",
};

const modules = [
  "Agents IA",
  "Pipelines",
  "Publication API",
  "Documentation Notion",
  "Journaux et suivi",
  "Integrations : TikTok, YouTube, Instagram/Meta, Pinterest",
];

export default async function DashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="mx-auto max-w-7xl px-5 py-14 sm:px-8 lg:py-20">
      <div className="rounded-lg border border-[#223149] bg-[#0F1724] p-6 sm:p-8">
        <LogoMark size="md" priority />
        <p className="mt-6 text-sm font-semibold uppercase tracking-[0.18em] text-[#7DD3FC]">
          Session connectee
        </p>
        <h1 className="mt-4 text-4xl font-semibold text-[#F4F7FB] sm:text-5xl">
          Interface L&apos;Edifice
        </h1>
        <p className="mt-5 max-w-3xl text-lg leading-8 text-[#9EADBF]">
          Le Cockpit Web est l&apos;interface privee du portail L&apos;Edifice.
          Le Cockpit local Streamlit reste l&apos;interface operationnelle interne.
        </p>
        <div className="mt-6 flex flex-col gap-4 rounded-lg border border-[#223149] bg-[#111D2E] p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.18em] text-[#9EADBF]">
              Utilisateur connecte
            </p>
            <p className="mt-2 font-semibold text-[#F4F7FB]">{user.email}</p>
          </div>
          <form action={logout}>
            <button
              type="submit"
              className="rounded-md bg-[#38BDF8] px-5 py-3 text-sm font-semibold text-[#070B12] transition hover:bg-[#7DD3FC] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              Deconnexion
            </button>
          </form>
        </div>
      </div>

      <section className="mt-10">
        <h2 className="text-2xl font-semibold text-[#F4F7FB]">Modules</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {modules.map((module) => (
            <div
              key={module}
              className="rounded-lg border border-[#223149] bg-[#111D2E] p-5"
            >
              <p className="font-semibold text-[#F4F7FB]">{module}</p>
              <p className="mt-2 text-sm leading-6 text-[#9EADBF]">
                Module reference dans l&apos;architecture privee de L&apos;Edifice.
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
