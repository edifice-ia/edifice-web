import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { DemoTikTokPanel } from "./DemoTikTokPanel";
import { LogoMark } from "../components/LogoMark";
import { logout } from "../login/actions";
import { getUserRole } from "@/src/lib/auth/roles";
import { requireDemoAccess } from "@/src/lib/auth/guards";

export const metadata: Metadata = {
  title: "Démo reviewer TikTok - L’Édifice",
  description:
    "Espace de démonstration limité de L’Édifice pour TikTok Review.",
};

export default async function DemoPage({
  searchParams,
}: {
  searchParams: Promise<{
    limited?: string;
  }>;
}) {
  const user = await requireDemoAccess();
  const params = await searchParams;
  const role = getUserRole(user);

  if (role !== "reviewer") {
    redirect("/dashboard");
  }

  return (
    <div className="mx-auto max-w-7xl px-5 py-14 sm:px-8 lg:py-20">
      {params.limited ? (
        <div className="mb-6 rounded-md border border-[#f59e0b]/40 bg-[#f59e0b]/10 px-4 py-3 text-sm font-semibold text-[#fbbf24]">
          Accès limité au mode démo reviewer.
        </div>
      ) : null}

      <div className="mb-10 flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <LogoMark size="md" priority />
          <p className="mt-6 text-sm font-semibold uppercase tracking-[0.18em] text-[#7DD3FC]">
            Espace démo reviewer
          </p>
          <h1 className="mt-4 text-4xl font-semibold text-[#F4F7FB] sm:text-5xl">
            L’Édifice — Démo TikTok
          </h1>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-[#9EADBF]">
            Présentation limitée du cockpit : génération démo, simulation de
            publication TikTok et visualisation de contenus factices uniquement.
          </p>
        </div>
        <div className="rounded-lg border border-[#223149] bg-[#111D2E] p-4">
          <p className="text-sm text-[#9EADBF]">Session</p>
          <p className="mt-1 font-semibold text-[#F4F7FB]">{user.email}</p>
          <p className="mt-2 text-sm text-[#7DD3FC]">Rôle : {role}</p>
          <form action={logout} className="mt-4">
            <button
              type="submit"
              className="rounded-md border border-[#223149] px-4 py-2 text-sm font-semibold text-[#F4F7FB] transition hover:bg-[#1E293B] hover:text-[#7DD3FC] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              Déconnexion
            </button>
          </form>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
        <section className="rounded-lg border border-[#223149] bg-[#0F1724] p-6">
          <h2 className="text-2xl font-semibold text-[#F4F7FB]">
            Périmètre autorisé
          </h2>
          <div className="mt-5 grid gap-3 text-sm leading-6 text-[#D8DEE8]">
            {[
              "Accès à cette page /demo uniquement.",
              "Flow TikTok de génération et simulation en dry-run.",
              "Contenus, statuts et journaux exclusivement fictifs.",
              "Aucune configuration OAuth ni variable ENV visible.",
              "Aucun accès aux modules réels YouTube, Meta ou Pinterest.",
            ].map((item) => (
              <p
                key={item}
                className="rounded-md border border-[#223149] bg-[#111D2E] px-4 py-3"
              >
                {item}
              </p>
            ))}
          </div>
        </section>

        <DemoTikTokPanel />
      </div>
    </div>
  );
}
