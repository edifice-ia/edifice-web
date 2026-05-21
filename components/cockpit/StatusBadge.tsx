import type { CockpitStatus } from "@/types/cockpit";

const statusClasses: Record<CockpitStatus, string> = {
  Disponible: "border-[#39E6D0]/40 bg-[#39E6D0]/10 text-[#39E6D0]",
  "En migration": "border-[#38BDF8]/40 bg-[#38BDF8]/10 text-[#7DD3FC]",
  "Local uniquement": "border-[#A7B0C0]/35 bg-[#A7B0C0]/10 text-[#D8DEE8]",
  "A securiser": "border-[#f59e0b]/40 bg-[#f59e0b]/10 text-[#fbbf24]",
  "Plus tard": "border-[#64748b]/40 bg-[#64748b]/10 text-[#cbd5e1]",
  "Non connecte": "border-[#ef4444]/40 bg-[#ef4444]/10 text-[#fecaca]",
  Experimental: "border-[#a78bfa]/40 bg-[#a78bfa]/10 text-[#ddd6fe]",
};

export function StatusBadge({ status }: { status: CockpitStatus }) {
  return (
    <span
      className={`inline-flex rounded-md border px-2.5 py-1 text-xs font-semibold ${statusClasses[status]}`}
    >
      {status}
    </span>
  );
}
