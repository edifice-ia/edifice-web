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
    </div>
  );
}
