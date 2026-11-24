import type { AcademySection } from "@/lib/academy/sections";

// Primitives d'interface propres à Academy. Volontairement indépendantes de
// celles de Personnel (en pause) et du cockpit : voir 06_Modules.md, section
// « Espace Academy ».

export function AcademyHeader() {
  return (
    <header className="mb-6">
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#39E6D0]">
        Academy
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <h1 className="text-3xl font-semibold text-[#F8FAFC] sm:text-4xl">Academy</h1>
        <span className="rounded-md border border-[#38BDF8]/40 bg-[#38BDF8]/10 px-2 py-1 text-xs font-semibold text-[#7DD3FC]">
          Squelette, sans données
        </span>
      </div>
      <p className="mt-4 max-w-3xl leading-7 text-[#A7B0C0]">
        Environnement d&apos;apprentissage : programmes, leçons, révisions et
        progression. Les sections ci-dessous existent comme pages ; aucune ne
        contient encore de données.
      </p>
    </header>
  );
}

export function AcademyNotBuilt({ section }: { section: AcademySection }) {
  return (
    <section
      aria-labelledby={`academy-${section.id}-title`}
      className="rounded-lg border border-dashed border-[#1D2A44] bg-[#08111A] p-6"
    >
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#7DD3FC]">
        Pas encore construit
      </p>
      <h2
        id={`academy-${section.id}-title`}
        className="mt-3 text-2xl font-semibold text-[#F8FAFC]"
      >
        {section.label}
      </h2>
      <p className="mt-3 max-w-3xl leading-7 text-[#A7B0C0]">
        Cette section n&apos;affiche encore aucune donnée : rien n&apos;y est
        enregistré ni calculé.
      </p>
      <p className="mt-3 max-w-3xl leading-7 text-[#A7B0C0]">
        <span className="font-semibold text-[#D8DEE8]">Prévu : </span>
        {section.purpose}
      </p>
      <p className="mt-3 text-sm text-[#A7B0C0]">
        {`Étape ${section.plannedStep} du plan de construction d'Academy.`}
      </p>
    </section>
  );
}
