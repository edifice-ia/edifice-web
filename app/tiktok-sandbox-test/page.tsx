import type { Metadata } from "next";
import { logout } from "../login/actions";
import { TikTokConnectionControls } from "@/components/cockpit/TikTokConnectionControls";
import { requireReviewerSandboxAccess } from "@/src/lib/auth/guards";

export const metadata: Metadata = {
  title: "TikTok Sandbox Test - L'Edifice",
  description:
    "Acces limite reviewer pour tester la connexion et l'upload TikTok Sandbox.",
};

export default async function TikTokSandboxTestPage() {
  const user = await requireReviewerSandboxAccess();

  return (
    <div className="mx-auto max-w-5xl px-5 py-12 sm:px-8 lg:py-16">
      <div className="mb-6 rounded-lg border border-[#f59e0b]/40 bg-[#f59e0b]/10 px-4 py-3 text-sm font-semibold text-[#fbbf24]">
        Reviewer TikTok Sandbox Demo — limited access
      </div>

      <section className="rounded-lg border border-[#223149] bg-[#0F1724] p-6 shadow-[0_18px_60px_rgba(0,0,0,0.22)] sm:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#39E6D0]">
              TikTok Sandbox
            </p>
            <h1 className="mt-3 text-3xl font-semibold text-[#F8FAFC] sm:text-4xl">
              Demo reviewer limitee
            </h1>
            <p className="mt-4 max-w-3xl leading-7 text-[#A7B0C0]">
              Cette page donne uniquement acces aux tests TikTok Sandbox :
              connexion OAuth, verification du token stocke cote serveur et
              upload de test. Aucun module prive du cockpit n&apos;est visible ici.
            </p>
          </div>
          <div className="rounded-md border border-[#223149] bg-[#08111A] px-4 py-3 text-sm text-[#A7B0C0]">
            <p className="font-semibold text-[#F8FAFC]">Compte connecte</p>
            <p className="mt-1">{user.email}</p>
          </div>
        </div>

        <div className="mt-8 rounded-lg border border-[#1D2A44] bg-[#08111A] p-5">
          <TikTokConnectionControls />
        </div>

        <div className="mt-6 grid gap-3 text-sm leading-6 text-[#A7B0C0]">
          <p>
            Les access tokens, refresh tokens, client secrets et variables
            d&apos;environnement ne sont jamais affiches.
          </p>
          <p>
            Les routes internes du cockpit restent bloquees pour ce compte
            reviewer.
          </p>
        </div>

        <form action={logout} className="mt-8">
          <button
            type="submit"
            className="rounded-md border border-[#223149] bg-[#111D2E] px-4 py-2 text-sm font-semibold text-[#F4F7FB] transition hover:bg-[#1E293B] hover:text-[#7DD3FC] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            Deconnexion
          </button>
        </form>
      </section>
    </div>
  );
}
