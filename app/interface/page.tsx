import type { Metadata } from "next";
import { AssistantCommandCenter } from "@/components/cockpit/AssistantCommandCenter";
import { CockpitHeader } from "@/components/cockpit/CockpitHeader";
import { OAuthResultNotice } from "@/components/cockpit/OAuthResultNotice";
import { getLiveProjectMemory } from "@/lib/server/observatory/read-model";

export const metadata: Metadata = {
  title: "Assistant de L’Édifice - L’Édifice",
  description:
    "Assistant principal du cockpit de L’Édifice pour bâtir l'œuvre, organiser l'intérieur et garder le cap.",
};

export default async function InterfacePage({
  searchParams,
}: {
  searchParams: Promise<{
    provider?: string;
    connected?: string;
    status?: string;
  }>;
}) {
  const result = await searchParams;
  const projectMemory = await getLiveProjectMemory();

  return (
    <div>
      <CockpitHeader
        eyebrow="Assistant de L’Édifice"
        title="Assistant de L’Édifice"
        description="Un point central pour bâtir l'œuvre, organiser l'intérieur et garder le cap."
        status="En migration"
      />
      <OAuthResultNotice
        provider={result.provider}
        connected={result.connected}
        status={result.status}
      />
      <AssistantCommandCenter projectMemory={projectMemory} />
    </div>
  );
}
