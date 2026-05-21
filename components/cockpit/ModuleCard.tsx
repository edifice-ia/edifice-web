import Link from "next/link";
import { StatusBadge } from "./StatusBadge";
import type { CockpitModule } from "@/types/cockpit";

type ModuleCardProps = {
  module: CockpitModule;
};

export function ModuleCard({ module }: ModuleCardProps) {
  const accent =
    module.accent === "jade"
      ? "from-[#39E6D0]/14"
      : "from-[#38BDF8]/14";

  return (
    <Link
      href={module.href}
      className={`group rounded-lg border border-[#1D2A44] bg-gradient-to-br ${accent} to-[#0B1420] p-5 transition hover:border-[#39E6D0]/60 hover:shadow-[0_0_30px_rgba(57,230,208,0.12)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2`}
    >
      <div className="flex items-start justify-between gap-4">
        <h3 className="text-lg font-semibold text-[#F8FAFC]">
          {module.title}
        </h3>
        <StatusBadge status={module.status} />
      </div>
      <p className="mt-3 leading-7 text-[#A7B0C0]">{module.description}</p>
      <p className="mt-5 text-sm font-semibold text-[#39E6D0] transition group-hover:text-[#7DD3FC]">
        Ouvrir le module
      </p>
    </Link>
  );
}
