import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Connexion - L'Edifice",
  description: "Acces prive en developpement pour L'Edifice.",
};

export default function LoginPage() {
  return (
    <div className="mx-auto grid min-h-[calc(100vh-220px)] max-w-7xl items-center gap-10 px-5 py-14 sm:px-8 lg:grid-cols-2">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-200">
          Acces prive
        </p>
        <h1 className="mt-4 text-4xl font-semibold text-white sm:text-5xl">
          Connexion
        </h1>
        <p className="mt-5 max-w-xl text-lg leading-8 text-slate-300">
          Acces prive en developpement. La connexion sera activee
          prochainement.
        </p>
      </div>

      <form className="rounded-lg border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-black/20">
        <div className="space-y-5">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-slate-200"
            >
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              placeholder="vous@exemple.com"
              className="mt-2 w-full rounded-md border border-white/10 bg-[#0f151c] px-4 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-200"
            />
          </div>
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-slate-200"
            >
              Mot de passe
            </label>
            <input
              id="password"
              name="password"
              type="password"
              placeholder="Votre mot de passe"
              className="mt-2 w-full rounded-md border border-white/10 bg-[#0f151c] px-4 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-200"
            />
          </div>
          <button
            type="button"
            className="w-full rounded-md bg-cyan-200 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-white"
          >
            Connexion
          </button>
          <div className="rounded-md border border-cyan-300/20 bg-cyan-300/10 p-4 text-sm leading-6 text-cyan-50">
            <p className="font-semibold">Acces prive en developpement</p>
            <p className="mt-1 text-cyan-100/80">
              La connexion sera activee prochainement.
            </p>
          </div>
        </div>
      </form>
    </div>
  );
}
