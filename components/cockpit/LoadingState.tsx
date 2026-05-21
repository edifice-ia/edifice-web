export function LoadingState({ label = "Chargement" }: { label?: string }) {
  return (
    <div className="rounded-lg border border-[#1D2A44] bg-[#08111A] p-6">
      <div className="h-2 w-32 rounded-full bg-[#39E6D0]/40" />
      <p className="mt-4 text-sm text-[#A7B0C0]">{label}...</p>
    </div>
  );
}
