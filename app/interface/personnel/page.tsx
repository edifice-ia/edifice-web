import type { Metadata } from "next";
import { CockpitHeader } from "@/components/cockpit/CockpitHeader";
import { PersonalDashboardClient } from "./PersonalDashboardClient";

export const metadata: Metadata = {
  title: "Espace intérieur - L'Édifice",
};

export default function PersonnelPage() {
  return (
    <div>
      <CockpitHeader
        eyebrow="Personnel"
        title="Espace intérieur"
        description="OS personnel pour suivre énergie, objectifs, routines, notes et décisions du quotidien."
        status="Experimental"
      />
      <PersonalDashboardClient />
    </div>
  );
}
