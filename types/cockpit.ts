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

export type ProjectMemoryEntry = {
  id: string;
  createdAt: string;
  updatedAt: string;
  category: string | null;
  status: string | null;
  title: string;
  content: string | null;
  nextAction: string | null;
  priority: string | null;
  source: string | null;
};

export type ProjectMemoryCreateInput = {
  category?: string | null;
  status?: string | null;
  title: string;
  content?: string | null;
  nextAction?: string | null;
  priority?: string | null;
  source?: string | null;
};

export type AssistantQuestion =
  | "Que dois-je faire maintenant ?"
  | "Quelle est la prochaine pierre ?"
  | "Quels sont les blocages ?"
  | "Où en est le projet ?"
  | "Qu’est-ce qui est en review ?";

export type ProjectContext = {
  projectSummary: string;
  operationalModules: ObservatoryItem[];
  blockedModules: ObservatoryItem[];
  reviewModules: ObservatoryItem[];
  migratingModules: ObservatoryItem[];
  cockpitModules: CockpitModule[];
  cockpitModulesInMigration: CockpitModule[];
  nextPriorityAction: string;
  nextActions: string[];
  detectedRisks: string[];
  guardrails: string[];
  latestMemoryEntries: ProjectMemoryEntry[];
  siteSummary: string;
  observatoryItems: ObservatoryItem[];
  projectMemoryEntries: ProjectMemoryEntry[];
  recommendations: Record<AssistantQuestion, string>;
  overview: {
    totalModules: number;
    operational: number;
    blocked: number;
    nextRecommendedAction: string;
  };
};
