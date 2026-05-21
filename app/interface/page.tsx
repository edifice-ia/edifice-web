import type { Metadata } from "next";
import { AssistantCommandCenter } from "@/components/cockpit/AssistantCommandCenter";
import { CockpitHeader } from "@/components/cockpit/CockpitHeader";
import { OAuthResultNotice } from "@/components/cockpit/OAuthResultNotice";

export const metadata: Metadata = {
  title: "Assistant Édifice - L'Edifice",
  description:
    "Assistant principal du cockpit L'Edifice pour bâtir l'œuvre, organiser l'intérieur et garder le cap.",
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

  return (
    <div>
      <CockpitHeader
        eyebrow="Assistant Édifice"
        title="Assistant Édifice"
        description="Un point central pour bâtir l'œuvre, organiser l'intérieur et garder le cap."
        status="En migration"
      />
      <OAuthResultNotice
        provider={result.provider}
        connected={result.connected}
        status={result.status}
      />
      <AssistantCommandCenter />
    </div>
  );
}
