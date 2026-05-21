import { ModuleCard } from "./ModuleCard";
import type { CockpitModule } from "@/types/cockpit";

export function ModuleGrid({ modules }: { modules: CockpitModule[] }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {modules.map((module) => (
        <ModuleCard key={module.id} module={module} />
      ))}
    </div>
  );
}
