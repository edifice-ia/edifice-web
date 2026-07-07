import type { Metadata } from "next";
import { CockpitHeader } from "@/components/cockpit/CockpitHeader";
import { PersonalDashboardClient } from "./PersonalDashboardClient";

export const metadata: Metadata = {
  title: "Espace int\u00e9rieur - L'\u00c9difice",
};

export default function PersonnelPage() {
  return (
    <div>
      <CockpitHeader
        eyebrow="Personnel"
        title="Espace int\u00e9rieur"
        description="OS personnel pour suivre \u00e9nergie, objectifs, routines, notes et d\u00e9cisions du quotidien."
        status="Experimental"
      />
      <PersonalDashboardClient />
    </div>
  );
}
