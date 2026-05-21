export function SafetyModeBadge() {
  return (
    <div className="rounded-md border border-[#39E6D0]/35 bg-[#39E6D0]/10 px-3 py-2">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#39E6D0]">
        Mode securise
      </p>
      <p className="mt-1 text-xs text-[#A7B0C0]">
        Publications reelles bloquees · validation requise
      </p>
    </div>
  );
}
