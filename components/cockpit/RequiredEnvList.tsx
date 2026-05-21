type RequiredEnvListProps = {
  names: string[];
};

export function RequiredEnvList({ names }: RequiredEnvListProps) {
  return (
    <div className="grid gap-2">
      {names.map((name) => (
        <code
          key={name}
          className="rounded-md border border-[#1D2A44] bg-[#08111A] px-3 py-2 text-sm text-[#7DD3FC]"
        >
          {name}
        </code>
      ))}
    </div>
  );
}
