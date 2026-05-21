import { StatusBadge } from "./StatusBadge";
import type { CockpitStatus } from "@/types/cockpit";

type CockpitHeaderProps = {
  eyebrow: string;
  title: string;
  description: string;
  status?: CockpitStatus;
};

export function CockpitHeader({
  eyebrow,
  title,
  description,
  status,
}: CockpitHeaderProps) {
  return (
    <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#39E6D0]">
          {eyebrow}
        </p>
        <h1 className="mt-3 text-3xl font-semibold text-[#F8FAFC] sm:text-4xl">
          {title}
        </h1>
        <p className="mt-4 max-w-3xl leading-7 text-[#A7B0C0]">
          {description}
        </p>
      </div>
      {status ? <StatusBadge status={status} /> : null}
    </div>
  );
}
