import type { Metadata } from "next";
import { academyDashboardSection } from "@/lib/academy/sections";
import { AcademyNotBuilt } from "./AcademyPrimitives";

export const metadata: Metadata = {
  title: "Academy - L'Édifice",
};

export default function AcademyDashboardPage() {
  return <AcademyNotBuilt section={academyDashboardSection} />;
}
