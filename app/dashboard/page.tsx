import type { Metadata } from "next";
import { LogoMark } from "../components/LogoMark";

export const metadata: Metadata = {
  title: "Dashboard - L'Edifice",
  description: "Dashboard prive minimal de L'Edifice, version en developpement.",
};

const modules = [
  "Cockpit local",
  "Agents IA",
  "Pipelines",
  "Documentation",
  "Publication API",
  "Assistant Global",
  "Notion",
];

export default function DashboardPage() {
  return (
    <div className="mx-auto max-w-7xl px-5 py-14 sm:px-8 lg:py-20">
      <div className="rounded-lg border border-[#223149] bg-[#0F1724] p-6 sm:p-8">
        <LogoMark size="md" priority />
        <p className="mt-6 text-sm font-semibold uppercase tracking-[0.18em] text-[#7DD3FC]">
          Statut : version privee
        </p>
        <h1 className="mt-4 text-4xl font-semibold text-[#F4F7FB] sm:text-5xl">
          Bienvenue dans L&apos;Edifice
        </h1>
        <p className="mt-5 max-w-3xl text-lg leading-8 text-[#9EADBF]">
          Cette interface est en developpement prive. Elle prefigure le futur
          espace web sans remplacer le Cockpit local.
        </p>
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
