import type { Metadata } from "next";
import { TrajectoireClient } from "./TrajectoireClient";

export const metadata: Metadata = {
  title: "Trajectoire - L'Edifice",
};

export default function TrajectoryPage() {
  return <TrajectoireClient />;
}
