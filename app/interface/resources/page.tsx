import type { Metadata } from "next";
import { ProjectResourcesView } from "@/components/cockpit/ProjectResourcesView";

export const metadata: Metadata = {
  title: "Ressources - L'Édifice",
};

export default function ResourcesPage() {
  return <ProjectResourcesView />;
}
