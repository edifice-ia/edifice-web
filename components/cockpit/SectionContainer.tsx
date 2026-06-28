type SectionContainerProps = {
  children: React.ReactNode;
  className?: string;
  id?: string;
};

export function SectionContainer({
  children,
  className = "",
  id,
}: SectionContainerProps) {
  return (
    <section
      className={`rounded-lg border border-[#1D2A44] bg-[#0B1420] p-5 shadow-[0_18px_60px_rgba(0,0,0,0.22)] ${className}`}
      id={id}
    >
      {children}
    </section>
  );
}
