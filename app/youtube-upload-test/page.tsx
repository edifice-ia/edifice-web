import type { Metadata } from "next";
import { YouTubeUploadTestPanel } from "@/components/cockpit/YouTubeUploadTestPanel";
import { requirePrivateCockpitAccess } from "@/src/lib/auth/guards";

export const metadata: Metadata = {
  title: "YouTube Upload Test - L'Edifice",
  description:
    "Page de test privee pour verifier OAuth YouTube et uploader une video de test en prive.",
};

export default async function YouTubeUploadTestPage() {
  await requirePrivateCockpitAccess();

  return (
    <div className="mx-auto max-w-6xl px-5 py-12 sm:px-8 lg:py-16">
      <section className="rounded-lg border border-[#223149] bg-[#0F1724] p-6 shadow-[0_18px_60px_rgba(0,0,0,0.22)] sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#39E6D0]">
          YouTube Data API
        </p>
        <h1 className="mt-3 text-3xl font-semibold text-[#F8FAFC] sm:text-4xl">
          YouTube Upload Test
        </h1>
        <p className="mt-4 max-w-3xl leading-7 text-[#A7B0C0]">
          Test prive pour verifier OAuth YouTube, detecter la chaine connectee
          et uploader une video de test en statut prive. Aucun token ni secret
          n&apos;est affiche.
        </p>

        <div className="mt-8">
          <YouTubeUploadTestPanel />
        </div>
      </section>
    </div>
  );
}
