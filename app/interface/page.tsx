import type { Metadata } from "next";
import { AssistantCommandCenter } from "@/components/cockpit/AssistantCommandCenter";
import { CockpitHeader } from "@/components/cockpit/CockpitHeader";

export const metadata: Metadata = {
  title: "Assistant Édifice - L'Edifice",
  description:
    "Assistant principal du cockpit L'Edifice pour piloter le projet, organiser le quotidien et preparer les actions depuis un point central.",
};

export default function InterfacePage() {
  return (
    <div>
      <CockpitHeader
        eyebrow="Assistant Édifice"
        title="Assistant Édifice"
        description="Piloter le projet, organiser le quotidien et préparer les actions depuis un point central."
        status="En migration"
      />
      <AssistantCommandCenter />
    </div>
  );
}
