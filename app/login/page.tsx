import type { Metadata } from "next";
import { LogoMark } from "../components/LogoMark";

export const metadata: Metadata = {
  title: "Connexion - L'Edifice",
  description: "Acces prive en developpement pour L'Edifice.",
};

export default function LoginPage() {
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
          Acces prive en developpement. La connexion sera activee
          prochainement.
        </p>
      </div>

      <form className="rounded-lg border border-[#223149] bg-[#0F1724] p-6 shadow-2xl shadow-black/20">
        <div className="space-y-5">
          <div className="flex items-center gap-3 border-b border-[#223149] pb-5">
            <LogoMark size="sm" />
            <div>
              <p className="font-semibold text-[#F4F7FB]">L&apos;Edifice</p>
              <p className="text-sm text-[#9EADBF]">Portail prive</p>
            </div>
          </div>
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-[#F4F7FB]"
            >
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              placeholder="vous@exemple.com"
              className="mt-2 w-full rounded-md border border-[#223149] bg-[#111D2E] px-4 py-3 text-[#F4F7FB] outline-none transition placeholder:text-[#9EADBF]/60 focus:border-[#38BDF8] focus:ring-2 focus:ring-[#38BDF8]/25"
            />
          </div>
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-[#F4F7FB]"
            >
              Mot de passe
            </label>
            <input
              id="password"
              name="password"
              type="password"
              placeholder="Votre mot de passe"
              className="mt-2 w-full rounded-md border border-[#223149] bg-[#111D2E] px-4 py-3 text-[#F4F7FB] outline-none transition placeholder:text-[#9EADBF]/60 focus:border-[#38BDF8] focus:ring-2 focus:ring-[#38BDF8]/25"
            />
          </div>
          <button
            type="button"
            className="w-full rounded-md bg-[#38BDF8] px-5 py-3 text-sm font-semibold text-[#070B12] transition hover:bg-[#7DD3FC] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            Connexion
          </button>
          <div className="rounded-md border border-[#223149] bg-[#1E293B] p-4 text-sm leading-6 text-[#F4F7FB]">
            <p className="font-semibold">Acces prive en developpement</p>
            <p className="mt-1 text-[#9EADBF]">
              La connexion sera activee prochainement.
            </p>
          </div>
        </div>
      </form>
    </div>
  );
}
