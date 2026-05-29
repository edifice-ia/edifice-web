export type CockpitStatus =
  | "Disponible"
  | "En migration"
  | "Local uniquement"
  | "A securiser"
  | "Plus tard"
  | "Non connecte"
  | "Experimental"
  | "Operationnel"
  | "En cours"
  | "Bloque"
  | "Review"
  | "A migrer";

export type CockpitNavItem = {
  id: string;
  href: string;
  label: string;
  description: string;
  status: CockpitStatus;
  showStatus?: boolean;
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
  type: "system" | "agent" | "assistant" | "api" | "security" | "publication";
  message: string;
  status: CockpitStatus;
};

export type ObservatoryArea = "OAuth" | "Agents" | "Infrastructure";

export type ObservatoryItem = {
  id: string;
  area: ObservatoryArea;
  name: string;
  status: CockpitStatus;
  summary: string;
  nextAction: string;
  source?: string;
  detail?: string;
};

export type ConstructionJournalEntry = {
  id: string;
  date: string;
  action: string;
  decision: string;
  blocker?: string;
  nextStep: string;
};
