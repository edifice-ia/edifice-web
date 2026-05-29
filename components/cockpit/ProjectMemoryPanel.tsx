import { projectMemoryForAssistant } from "@/lib/cockpit/observatory";
import { SectionContainer } from "./SectionContainer";

export function ProjectMemoryPanel() {
  return (
    <SectionContainer>
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#39E6D0]">
        M&eacute;moire projet
      </p>
      <h2 className="mt-2 text-xl font-semibold text-[#F8FAFC]">
        Lisible par l&apos;assistant global
      </h2>
      <p className="mt-3 leading-7 text-[#A7B0C0]">
        {projectMemoryForAssistant.cockpitRole}
      </p>

      <div className="mt-5 grid gap-3">
        {projectMemoryForAssistant.safeguards.map((safeguard) => (
          <div
            key={safeguard}
            className="rounded-md border border-[#1D2A44] bg-[#08111A] px-3 py-2 text-sm text-[#F8FAFC]"
          >
            {safeguard}
          </div>
        ))}
      </div>

      <div className="mt-5 rounded-md border border-[#39E6D0]/30 bg-[#39E6D0]/10 px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#39E6D0]">
          Prochaine pierre
        </p>
        <p className="mt-2 text-sm leading-6 text-[#F8FAFC]">
          {projectMemoryForAssistant.nextRecommendedAction}
        </p>
      </div>
    </SectionContainer>
  );
}
