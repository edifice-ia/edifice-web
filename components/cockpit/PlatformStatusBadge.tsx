import type { PlatformStatusCode } from "@/types/cockpit";

const statusClasses: Record<PlatformStatusCode, string> = {
  CONNECTED: "border-[#39E6D0]/40 bg-[#39E6D0]/10 text-[#39E6D0]",
  REVIEW_PENDING: "border-[#f59e0b]/40 bg-[#f59e0b]/10 text-[#fbbf24]",
  SANDBOX: "border-[#a78bfa]/40 bg-[#a78bfa]/10 text-[#ddd6fe]",
  DISABLED: "border-[#64748b]/40 bg-[#64748b]/10 text-[#cbd5e1]",
  ERROR: "border-[#ef4444]/40 bg-[#ef4444]/10 text-[#fecaca]",
};

const statusLabels: Record<PlatformStatusCode, string> = {
  CONNECTED: "Connecte",
  REVIEW_PENDING: "Review en attente",
  SANDBOX: "Sandbox",
  DISABLED: "Desactive",
  ERROR: "Erreur",
};

export function PlatformStatusBadge({
  status,
}: {
  status: PlatformStatusCode;
}) {
  return (
    <span
      className={`inline-flex rounded-md border px-2.5 py-1 text-xs font-semibold ${statusClasses[status]}`}
    >
      {statusLabels[status]}
    </span>
  );
}
