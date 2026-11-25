import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { findAcademySectionBySlug } from "@/lib/academy/sections";
import { AcademyNotBuilt } from "../AcademyPrimitives";

type AcademySectionPageProps = {
  params: Promise<{ section: string }>;
};

export async function generateMetadata({
  params,
}: AcademySectionPageProps): Promise<Metadata> {
  const { section: slug } = await params;
  const section = findAcademySectionBySlug(slug);

  return {
    title: section ? `${section.label} - Academy - L'Édifice` : "Academy - L'Édifice",
  };
}

// Une seule page pour les sections encore à construire : la liste vit dans
// lib/academy/sections.ts. Un segment absent de cette liste répond 404. La
// section Programmes a sa propre page (programmes/page.tsx), servie avant ce
// segment dynamique.
export default async function AcademySectionPage({ params }: AcademySectionPageProps) {
  const { section: slug } = await params;
  const section = findAcademySectionBySlug(slug);

  if (!section) {
    notFound();
  }

  return <AcademyNotBuilt section={section} />;
}
