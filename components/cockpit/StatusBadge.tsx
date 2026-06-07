import type { CockpitStatus } from "@/types/cockpit";

const statusClasses: Record<CockpitStatus, string> = {
  Actif: "border-[#39E6D0]/40 bg-[#39E6D0]/10 text-[#39E6D0]",
  Configure: "border-[#39E6D0]/40 bg-[#39E6D0]/10 text-[#39E6D0]",
  Connecte: "border-[#39E6D0]/40 bg-[#39E6D0]/10 text-[#39E6D0]",
  Disponible: "border-[#39E6D0]/40 bg-[#39E6D0]/10 text-[#39E6D0]",
  Operationnel: "border-[#39E6D0]/40 bg-[#39E6D0]/10 text-[#39E6D0]",
  "En migration": "border-[#38BDF8]/40 bg-[#38BDF8]/10 text-[#7DD3FC]",
  "En cours": "border-[#38BDF8]/40 bg-[#38BDF8]/10 text-[#7DD3FC]",
  "Local uniquement": "border-[#A7B0C0]/35 bg-[#A7B0C0]/10 text-[#D8DEE8]",
  "A securiser": "border-[#f59e0b]/40 bg-[#f59e0b]/10 text-[#fbbf24]",
  Review: "border-[#f59e0b]/40 bg-[#f59e0b]/10 text-[#fbbf24]",
  "Plus tard": "border-[#64748b]/40 bg-[#64748b]/10 text-[#cbd5e1]",
  "A migrer": "border-[#64748b]/40 bg-[#64748b]/10 text-[#cbd5e1]",
  "Non connecte": "border-[#ef4444]/40 bg-[#ef4444]/10 text-[#fecaca]",
  Bloque: "border-[#ef4444]/40 bg-[#ef4444]/10 text-[#fecaca]",
  Experimental: "border-[#a78bfa]/40 bg-[#a78bfa]/10 text-[#ddd6fe]",
};

const statusLabels: Partial<Record<CockpitStatus, string>> = {
  Operationnel: "Op\u00e9rationnel",
  Configure: "Configur\u00e9",
  Connecte: "Connect\u00e9",
  Bloque: "Bloqu\u00e9",
  "A migrer": "\u00c0 migrer",
};

export function StatusBadge({ status }: { status: CockpitStatus }) {
  return (
    <span
      className={`inline-flex rounded-md border px-2.5 py-1 text-xs font-semibold ${statusClasses[status]}`}
    >
      {statusLabels[status] ?? status}
    </span>
  );
}
