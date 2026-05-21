type OAuthStatus =
  | "Configure"
  | "A configurer"
  | "En migration"
  | "A securiser"
  | "Non disponible"
  | "Placeholder";

const statusClasses: Record<OAuthStatus, string> = {
  Configure: "border-[#39E6D0]/40 bg-[#39E6D0]/10 text-[#39E6D0]",
  "A configurer": "border-[#38BDF8]/40 bg-[#38BDF8]/10 text-[#7DD3FC]",
  "En migration": "border-[#38BDF8]/40 bg-[#38BDF8]/10 text-[#7DD3FC]",
  "A securiser": "border-[#f59e0b]/40 bg-[#f59e0b]/10 text-[#fbbf24]",
  "Non disponible": "border-[#ef4444]/40 bg-[#ef4444]/10 text-[#fecaca]",
  Placeholder: "border-[#64748b]/40 bg-[#64748b]/10 text-[#cbd5e1]",
};

export function OAuthStatusBadge({ status }: { status: OAuthStatus }) {
  return (
    <span
      className={`inline-flex rounded-md border px-2.5 py-1 text-xs font-semibold ${statusClasses[status]}`}
    >
      {status}
    </span>
  );
}
