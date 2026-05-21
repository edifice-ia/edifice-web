type EmptyStateProps = {
  title: string;
  description: string;
};

export function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <div className="rounded-lg border border-dashed border-[#1D2A44] bg-[#08111A] p-6 text-center">
      <p className="text-lg font-semibold text-[#F8FAFC]">{title}</p>
      <p className="mt-2 leading-7 text-[#A7B0C0]">{description}</p>
    </div>
  );
}
