import { observatoryAreas, observatoryItems } from "@/lib/cockpit/observatory";
import { SectionContainer } from "./SectionContainer";
import { StatusBadge } from "./StatusBadge";

export function ProjectObservatory() {
  return (
    <div className="space-y-6">
      {observatoryAreas.map((area) => {
        const items = observatoryItems.filter((item) => item.area === area);

        return (
          <SectionContainer key={area}>
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#39E6D0]">
                  {area}
                </p>
                <h2 className="mt-2 text-xl font-semibold text-[#F8FAFC]">
                  &Eacute;tat global
                </h2>
              </div>
              <p className="text-sm text-[#A7B0C0]">{items.length} elements</p>
            </div>

            <div className="grid gap-3">
              {items.map((item) => (
                <article
                  key={item.id}
                  className="rounded-md border border-[#1D2A44] bg-[#08111A] p-4"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h3 className="text-base font-semibold text-[#F8FAFC]">
                        {item.name}
                      </h3>
                      <p className="mt-2 text-sm leading-6 text-[#A7B0C0]">
                        {item.summary}
                      </p>
                    </div>
                    <StatusBadge status={item.status} />
                  </div>
                  <div className="mt-4 rounded-md border border-[#1D2A44] bg-[#03070B] px-3 py-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#A7B0C0]">
                      Prochaine action recommand&eacute;e
                    </p>
                    <p className="mt-1 text-sm leading-6 text-[#F8FAFC]">
                      {item.nextAction}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </SectionContainer>
        );
      })}
    </div>
  );
}
