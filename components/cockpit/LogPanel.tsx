import { StatusBadge } from "./StatusBadge";
import type { CockpitLog } from "@/types/cockpit";

type LogPanelProps = {
  logs: CockpitLog[];
  title?: string;
};

export function LogPanel({ logs, title = "Logs" }: LogPanelProps) {
  return (
    <div className="rounded-lg border border-[#1D2A44] bg-[#03070B] p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#A7B0C0]">
          {title}
        </p>
        <span className="text-xs text-[#A7B0C0]">statique</span>
      </div>
      <div className="space-y-3">
        {logs.map((log) => (
          <div
            key={`${log.timestamp}-${log.message}`}
            className="grid gap-3 rounded-md border border-[#1D2A44] bg-[#08111A] p-3 text-sm md:grid-cols-[72px_100px_1fr_auto]"
          >
            <span className="font-mono text-[#39E6D0]">{log.timestamp}</span>
            <span className="uppercase tracking-[0.12em] text-[#A7B0C0]">
              {log.type}
            </span>
            <span className="text-[#F8FAFC]">{log.message}</span>
            <StatusBadge status={log.status} />
          </div>
        ))}
      </div>
    </div>
  );
}
