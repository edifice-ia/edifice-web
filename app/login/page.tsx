import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LogoMark } from "../components/LogoMark";
import { getCurrentUser } from "@/src/lib/supabase/server";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = {
  title: "Connexion - L'Edifice",
  description: "Acces prive en developpement pour L'Edifice.",
};

export default async function LoginPage() {
  const user = await getCurrentUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <div className="mx-auto grid min-h-[calc(100vh-220px)] max-w-7xl items-center gap-10 px-5 py-14 sm:px-8 lg:grid-cols-2">
      <div>
        <LogoMark size="md" priority />
        <p className="mt-6 text-sm font-semibold uppercase tracking-[0.18em] text-[#7DD3FC]">
          Acces prive
        </p>
        <h1 className="mt-4 text-4xl font-semibold text-[#F4F7FB] sm:text-5xl">
          Connexion
        </h1>
        <p className="mt-5 max-w-xl text-lg leading-8 text-[#9EADBF]">
          Acces prive reserve aux utilisateurs autorises. Connectez-vous pour
          ouvrir l&apos;interface web du portail.
        </p>
        <p className="mt-4 max-w-xl text-base leading-7 text-[#9EADBF]">
          Le Cockpit Web est l&apos;interface privee du portail L&apos;Edifice.
          Le Cockpit local Streamlit reste l&apos;interface operationnelle interne.
        </p>
      </div>

      <div>
        <div className="mb-4 flex items-center gap-3 rounded-lg border border-[#223149] bg-[#111D2E] p-4">
          <LogoMark size="sm" />
          <div>
            <p className="font-semibold text-[#F4F7FB]">L&apos;Edifice</p>
            <p className="text-sm text-[#9EADBF]">Portail prive Supabase Auth</p>
          </div>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
