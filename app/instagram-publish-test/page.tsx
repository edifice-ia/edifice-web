import type { Metadata } from "next";
import { InstagramPublishTestPanel } from "@/components/cockpit/InstagramPublishTestPanel";
import { requirePrivateCockpitAccess } from "@/src/lib/auth/guards";

export const metadata: Metadata = {
  title: "Instagram Publish Test - L'Edifice",
  description:
    "Page de test privee pour verifier la configuration Instagram Graph API et publier un post test.",
};

export default async function InstagramPublishTestPage() {
  await requirePrivateCockpitAccess();

  return (
    <div className="mx-auto max-w-6xl px-5 py-12 sm:px-8 lg:py-16">
      <section className="rounded-lg border border-[#223149] bg-[#0F1724] p-6 shadow-[0_18px_60px_rgba(0,0,0,0.22)] sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#39E6D0]">
          Meta / Instagram Graph API
        </p>
        <h1 className="mt-3 text-3xl font-semibold text-[#F8FAFC] sm:text-4xl">
          Instagram Publish Test
        </h1>
        <p className="mt-4 max-w-3xl leading-7 text-[#A7B0C0]">
          Test prive pour verifier le token Meta stocke cote serveur, le compte
          Instagram Business associe et la publication d&apos;un Reel de test via
          l&apos;API Instagram Graph.
        </p>

        <div className="mt-8">
          <InstagramPublishTestPanel />
        </div>
      </section>
    </div>
  );
}
