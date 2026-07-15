import type { PersonalGarminDailyStats } from "@/lib/personal/connectors/garmin";
import type { TrajectoireEffortLevel } from "@/lib/server/trajectoire";
import { readPersonalGarminDailyStats } from "./garmin-stats-store";
import { upsertPersonalDailyBrief } from "./daily-briefs-store";

export type RecoveryLevel = "low" | "medium" | "high";

export type RecoverySignal = {
  metric: "sleep" | "body_battery" | "hrv" | "training_readiness" | "stress";
  value: number | string | null;
  verdict: -1 | 0 | 1;
};

export type RecoveryAssessment = {
  level: RecoveryLevel;
  signals: RecoverySignal[];
};

export type OpenTrajectoireAction = {
  actionId: string;
  title: string;
  dueDate: string | null;
  effortLevel: TrajectoireEffortLevel;
  objectiveTitle: string;
  projectTitle: string;
};

export type RecommendedFocusEntry = {
  actionId: string;
  title: string;
  projectTitle: string;
  objectiveTitle: string;
  reason: string;
};

export function todayInParis(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" }).format(now);
}

function sleepSignal(stats: PersonalGarminDailyStats): RecoverySignal | null {
  if (stats.sleepScore === null) {
    return null;
  }

  const verdict = stats.sleepScore < 60 ? -1 : stats.sleepScore >= 80 ? 1 : 0;
  return { metric: "sleep", value: stats.sleepScore, verdict };
}

function bodyBatterySignal(stats: PersonalGarminDailyStats): RecoverySignal | null {
  if (stats.bodyBatteryMax === null) {
    return null;
  }

  const verdict = stats.bodyBatteryMax < 50 ? -1 : stats.bodyBatteryMax >= 75 ? 1 : 0;
  return { metric: "body_battery", value: stats.bodyBatteryMax, verdict };
}

function hrvSignal(stats: PersonalGarminDailyStats): RecoverySignal | null {
  if (!stats.hrvStatus) {
    return null;
  }

  const status = stats.hrvStatus.toUpperCase();
  const verdict = status === "BALANCED" ? 1 : status === "LOW" || status === "POOR" ? -1 : 0;
  return { metric: "hrv", value: stats.hrvStatus, verdict };
}

function trainingReadinessSignal(stats: PersonalGarminDailyStats): RecoverySignal | null {
  if (stats.trainingReadinessScore === null) {
    return null;
  }

  const verdict =
    stats.trainingReadinessScore < 40 ? -1 : stats.trainingReadinessScore >= 70 ? 1 : 0;
  return { metric: "training_readiness", value: stats.trainingReadinessScore, verdict };
}

function stressSignal(stats: PersonalGarminDailyStats): RecoverySignal | null {
  if (stats.stressAvg === null) {
    return null;
  }

  // Le stress est inverse : une valeur haute est degradee, une valeur basse est bonne.
  const verdict = stats.stressAvg > 50 ? -1 : stats.stressAvg < 25 ? 1 : 0;
  return { metric: "stress", value: stats.stressAvg, verdict };
}

// Pure, sans I/O. low si une majorite de signaux disponibles sont degrades,
// high si tous les signaux disponibles sont bons, medium sinon (y compris en
// l'absence totale de donnees du jour).
export function computeRecoveryLevel(
  stats: PersonalGarminDailyStats | null,
): RecoveryAssessment {
  if (!stats) {
    return { level: "medium", signals: [] };
  }

  const signals = [
    sleepSignal(stats),
    bodyBatterySignal(stats),
    hrvSignal(stats),
    trainingReadinessSignal(stats),
    stressSignal(stats),
  ].filter((signal): signal is RecoverySignal => signal !== null);

  if (signals.length === 0) {
    return { level: "medium", signals };
  }

  const degradedCount = signals.filter((signal) => signal.verdict === -1).length;
  const goodCount = signals.filter((signal) => signal.verdict === 1).length;

  if (goodCount === signals.length) {
    return { level: "high", signals };
  }

  if (degradedCount >= Math.ceil(signals.length / 2)) {
    return { level: "low", signals };
  }

  return { level: "medium", signals };
}

const effortWeight: Record<TrajectoireEffortLevel, number> = {
  low: 1,
  medium: 2,
  high: 3,
};

// Defensif : trajectoire_actions.effort_level a un DEFAULT 'medium' et ne
// devrait donc jamais etre absent, mais une donnee malformee (ex. colonne pas
// encore migree) ne doit pas faire planter la priorisation.
function effortWeightOf(action: OpenTrajectoireAction) {
  const level = action.effortLevel;
  if (level === "low" || level === "medium" || level === "high") {
    return effortWeight[level];
  }

  return effortWeight.medium;
}

function byDueDateAscNullsLast(a: OpenTrajectoireAction, b: OpenTrajectoireAction) {
  if (a.dueDate === b.dueDate) return 0;
  if (a.dueDate === null) return 1;
  if (b.dueDate === null) return -1;
  return a.dueDate.localeCompare(b.dueDate);
}

// Priorise les actions ouvertes selon le niveau de recuperation, a partir du
// champ trajectoire_actions.effort_level (low/medium/high). Remplace l'ancien
// proxy base sur la priorite de l'objectif parent.
export function prioritizeOpenActions(
  openActions: OpenTrajectoireAction[],
  level: RecoveryLevel,
): OpenTrajectoireAction[] {
  const actions = [...openActions];

  if (level === "high") {
    return actions.sort((a, b) => {
      const weightDiff = effortWeightOf(b) - effortWeightOf(a);
      return weightDiff !== 0 ? weightDiff : byDueDateAscNullsLast(a, b);
    });
  }

  if (level === "low") {
    return actions.sort((a, b) => {
      const weightDiff = effortWeightOf(a) - effortWeightOf(b);
      return weightDiff !== 0 ? weightDiff : byDueDateAscNullsLast(a, b);
    });
  }

  return actions.sort(byDueDateAscNullsLast);
}

function focusReason(level: RecoveryLevel) {
  if (level === "high") {
    return "Recuperation elevee : action a fort enjeu proposee en priorite.";
  }

  if (level === "low") {
    return "Recuperation basse : action legere proposee en priorite.";
  }

  return "Recuperation moyenne : ordre neutre base sur l'echeance.";
}

function toRecommendedFocusEntry(
  action: OpenTrajectoireAction,
  level: RecoveryLevel,
): RecommendedFocusEntry {
  return {
    actionId: action.actionId,
    title: action.title,
    projectTitle: action.projectTitle,
    objectiveTitle: action.objectiveTitle,
    reason: focusReason(level),
  };
}

const RECOMMENDED_FOCUS_LIMIT = 3;

async function defaultReadStats(userId: string, date: string) {
  return readPersonalGarminDailyStats({ userId, date });
}

async function defaultReadOpenActions(userId: string): Promise<OpenTrajectoireAction[]> {
  // Import differe : trajectoire.ts porte "server-only" et ne doit etre
  // charge que lorsque ce chemin par defaut est reellement utilise (jamais
  // en test, ou readOpenActions est toujours injecte).
  const { readTrajectoire } = await import("@/lib/server/trajectoire");
  const snapshot = await readTrajectoire(userId);

  return snapshot.projects.flatMap((project) =>
    project.objectives.flatMap((objective) =>
      objective.actions
        .filter((action) => action.status !== "fait")
        .map((action) => ({
          actionId: action.id,
          title: action.title,
          dueDate: action.dueDate,
          effortLevel: action.effortLevel,
          objectiveTitle: objective.title,
          projectTitle: project.title,
        })),
    ),
  );
}

async function defaultWriteBrief(params: {
  userId: string;
  date: string;
  recoveryLevel: RecoveryLevel;
  recommendedFocus: RecommendedFocusEntry[];
}) {
  await upsertPersonalDailyBrief(params);
}

export type GenerateDailyBriefParams = {
  userId: string;
  date?: string;
  readStats?: (userId: string, date: string) => Promise<PersonalGarminDailyStats | null>;
  readOpenActions?: (userId: string) => Promise<OpenTrajectoireAction[]>;
  writeBrief?: (params: {
    userId: string;
    date: string;
    recoveryLevel: RecoveryLevel;
    recommendedFocus: RecommendedFocusEntry[];
  }) => Promise<void>;
};

export type DailyBriefResult = {
  date: string;
  recoveryLevel: RecoveryLevel;
  signals: RecoverySignal[];
  recommendedFocus: RecommendedFocusEntry[];
};

// Orchestrateur du brief quotidien. Ne lit jamais trajectoire_actions que via
// readTrajectoire (lecture seule) et n'ecrit que dans personal_daily_briefs
// via writeBrief : aucune fonction d'ecriture Trajectoire n'est importee ni
// appelable depuis ce module.
export async function generateDailyBrief({
  userId,
  date = todayInParis(),
  readStats = defaultReadStats,
  readOpenActions = defaultReadOpenActions,
  writeBrief = defaultWriteBrief,
}: GenerateDailyBriefParams): Promise<DailyBriefResult> {
  const stats = await readStats(userId, date);
  const { level, signals } = computeRecoveryLevel(stats);
  const openActions = await readOpenActions(userId);
  const prioritized = prioritizeOpenActions(openActions, level);
  const recommendedFocus = prioritized
    .slice(0, RECOMMENDED_FOCUS_LIMIT)
    .map((action) => toRecommendedFocusEntry(action, level));

  await writeBrief({ userId, date, recoveryLevel: level, recommendedFocus });

  return { date, recoveryLevel: level, signals, recommendedFocus };
}
