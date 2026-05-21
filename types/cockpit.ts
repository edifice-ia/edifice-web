export type CockpitStatus =
  | "Disponible"
  | "En migration"
  | "Local uniquement"
  | "A securiser"
  | "Plus tard"
  | "Non connecte"
  | "Experimental";

export type CockpitNavItem = {
  id: string;
  href: string;
  label: string;
  description: string;
  status: CockpitStatus;
};

export type CockpitModule = {
  id: string;
  title: string;
  description: string;
  href: string;
  status: CockpitStatus;
  accent?: "jade" | "blue";
};

export type CockpitLog = {
  timestamp: string;
  type: "system" | "agent" | "assistant" | "api" | "security";
  message: string;
  status: CockpitStatus;
};
