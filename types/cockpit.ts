export type CockpitStatus =
  | "Actif"
  | "Configure"
  | "Connecte"
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
  children?: Array<{
    id: string;
    href: string;
    label: string;
  }>;
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
  blockedByExternalReview?: boolean;
  externalReviewNote?: string;
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
  key: string | null;
  category: string | null;
  status: string | null;
  title: string;
  value: string | null;
  content: string | null;
  nextAction: string | null;
  priority: string | null;
  source: string | null;
  confidence: number | null;
};

export type ProjectMemoryCreateInput = {
  key?: string | null;
  category?: string | null;
  status?: string | null;
  title: string;
  value?: string | null;
  content?: string | null;
  nextAction?: string | null;
  priority?: string | null;
  source?: string | null;
  confidence?: number | null;
};

export type AssistantQuestion =
  | "Que dois-je faire maintenant ?"
  | "Quelle est la prochaine pierre ?"
  | "Quelle est la prochaine pierre realiste ?"
  | "Quels sont les blocages ?"
  | "Ou en est le projet ?"
  | "Qu'est-ce qui est en review ?"
  | "Qu'est-ce qui est bloque par un reviewer ?"
  | "Qu'est-ce qui depend de moi ?"
  | "Qu'est-ce qui depend d'un service externe ?";

export type AssistantActionablePriority = {
  action: string;
  reason: string;
  dependency: string | null;
  feasibleNow: boolean;
};

export type CockpitDraftState = {
  id: string;
  title: string;
  theme: string;
  status: string;
  platformTargets: string[];
  createdAt: string;
  updatedAt: string | null;
};

export type CockpitOAuthState = {
  provider: string;
  configured: boolean;
  tokenPresent: boolean;
  expiresAt: string | null;
  updatedAt: string | null;
  warnings: string[];
};

export type PlatformStatusCode =
  | "CONNECTED"
  | "REVIEW_PENDING"
  | "SANDBOX"
  | "DISABLED"
  | "ERROR";

export type CockpitPlatformState = {
  key: string;
  name: string;
  status: PlatformStatusCode;
  label: string;
  summary: string;
  details: string[];
  source: string;
  updatedAt: string | null;
};

export type CockpitDependency = {
  name: string;
  status: string;
  note: string;
};

export type CockpitReadOnlyState = {
  generatedAt: string;
  contentDrafts: {
    total: number;
    readyToPublish: CockpitDraftState[];
    inProgress: CockpitDraftState[];
    recent: CockpitDraftState[];
    byStatus: Record<string, number>;
    readError: string | null;
  };
  oauthStatuses: CockpitOAuthState[];
  platformStatuses: CockpitPlatformState[];
  modules: {
    available: CockpitModule[];
    migrating: CockpitModule[];
  };
  externalReviews: CockpitDependency[];
  dependencies: CockpitDependency[];
  blockers: string[];
  nextActions: string[];
  guardrails: string[];
};

export type ProjectContext = {
  projectSummary: string;
  operationalModules: ObservatoryItem[];
  blockedModules: ObservatoryItem[];
  reviewModules: ObservatoryItem[];
  externalReviewModules: ObservatoryItem[];
  migratingModules: ObservatoryItem[];
  cockpitModules: CockpitModule[];
  cockpitModulesInMigration: CockpitModule[];
  nextPriorityAction: string;
  nextActions: string[];
  actionablePriorities: AssistantActionablePriority[];
  detectedRisks: string[];
  guardrails: string[];
  latestMemoryEntries: ProjectMemoryEntry[];
  siteSummary: string;
  observatoryItems: ObservatoryItem[];
  projectMemoryEntries: ProjectMemoryEntry[];
  recommendations: Record<AssistantQuestion, string>;
  cockpitState: CockpitReadOnlyState;
  overview: {
    totalModules: number;
    operational: number;
    blocked: number;
    nextRecommendedAction: string;
  };
};
