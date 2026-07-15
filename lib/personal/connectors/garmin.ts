import type { PersonalConnector } from "./types";

// NOTE (DEC-006): structure illustrative basee sur la documentation publique
// Garmin Health API (Sleep Summary, Stress Details, Body Battery, User
// Metrics). Les noms de champs exacts ne sont pas confirmes tant que l'acces
// Developer Program n'est pas approuve ; a ajuster a reception des vraies
// reponses API.
export type GarminHealthApiDailyFixture = {
  summaryId: string;
  calendarDate: string;
  sleep: {
    sleepScore: number;
    durationInSeconds: number;
    deepSleepDurationInSeconds: number;
    remSleepDurationInSeconds: number;
    lightSleepDurationInSeconds: number;
  };
  bodyBattery: {
    bodyBatteryMin: number;
    bodyBatteryMax: number;
    bodyBatteryChargedValue: number;
    bodyBatteryDrainedValue: number;
  };
  hrv: {
    status: string;
    lastNightAvg: number;
  };
  restingHeartRateInBeatsPerMinute: number;
  stress: {
    averageStressLevel: number;
    maxStressLevel: number;
  };
  training: {
    load7Day: number;
    readinessScore: number;
  };
};

// Fixture mockee utilisee tant que l'acces Garmin Developer Program n'est pas
// confirme (DEC-006). Represente une journee de recuperation moyenne.
export const garminMockDailyFixture: GarminHealthApiDailyFixture = {
  summaryId: "mock-daily-summary-0001",
  calendarDate: "2026-07-08",
  sleep: {
    sleepScore: 78,
    durationInSeconds: 27_000,
    deepSleepDurationInSeconds: 5_400,
    remSleepDurationInSeconds: 6_300,
    lightSleepDurationInSeconds: 15_300,
  },
  bodyBattery: {
    bodyBatteryMin: 18,
    bodyBatteryMax: 82,
    bodyBatteryChargedValue: 74,
    bodyBatteryDrainedValue: 68,
  },
  hrv: {
    status: "BALANCED",
    lastNightAvg: 42,
  },
  restingHeartRateInBeatsPerMinute: 52,
  stress: {
    averageStressLevel: 28,
    maxStressLevel: 61,
  },
  training: {
    load7Day: 320.5,
    readinessScore: 68,
  },
};

// Forme normalisee (camelCase) partagee entre le mapping fixture->stats et le
// moteur de brief quotidien. Le store Supabase se charge de la conversion
// vers les colonnes snake_case de personal_garmin_daily_stats.
export type PersonalGarminDailyStats = {
  date: string;
  sleepScore: number | null;
  sleepDurationMinutes: number | null;
  sleepDeepMinutes: number | null;
  sleepRemMinutes: number | null;
  sleepLightMinutes: number | null;
  bodyBatteryMin: number | null;
  bodyBatteryMax: number | null;
  bodyBatteryCharged: number | null;
  bodyBatteryDrained: number | null;
  hrvStatus: string | null;
  hrvLastNightAvg: number | null;
  restingHeartRate: number | null;
  stressAvg: number | null;
  stressMax: number | null;
  trainingLoad7Day: number | null;
  trainingReadinessScore: number | null;
  rawPayload: unknown;
};

function minutesFromSeconds(seconds: number | undefined) {
  return typeof seconds === "number" && Number.isFinite(seconds)
    ? Math.round(seconds / 60)
    : null;
}

// Pure mapping, aucune I/O : convertit une reponse (mockee ou reelle une fois
// approuvee) au format Garmin Health API vers les colonnes attendues par
// personal_garmin_daily_stats.
export function mapGarminFixtureToDailyStats(
  fixture: GarminHealthApiDailyFixture,
  date: string,
): PersonalGarminDailyStats {
  return {
    date,
    sleepScore: fixture.sleep?.sleepScore ?? null,
    sleepDurationMinutes: minutesFromSeconds(fixture.sleep?.durationInSeconds),
    sleepDeepMinutes: minutesFromSeconds(fixture.sleep?.deepSleepDurationInSeconds),
    sleepRemMinutes: minutesFromSeconds(fixture.sleep?.remSleepDurationInSeconds),
    sleepLightMinutes: minutesFromSeconds(fixture.sleep?.lightSleepDurationInSeconds),
    bodyBatteryMin: fixture.bodyBattery?.bodyBatteryMin ?? null,
    bodyBatteryMax: fixture.bodyBattery?.bodyBatteryMax ?? null,
    bodyBatteryCharged: fixture.bodyBattery?.bodyBatteryChargedValue ?? null,
    bodyBatteryDrained: fixture.bodyBattery?.bodyBatteryDrainedValue ?? null,
    hrvStatus: fixture.hrv?.status ?? null,
    hrvLastNightAvg: fixture.hrv?.lastNightAvg ?? null,
    restingHeartRate: fixture.restingHeartRateInBeatsPerMinute ?? null,
    stressAvg: fixture.stress?.averageStressLevel ?? null,
    stressMax: fixture.stress?.maxStressLevel ?? null,
    trainingLoad7Day: fixture.training?.load7Day ?? null,
    trainingReadinessScore: fixture.training?.readinessScore ?? null,
    rawPayload: fixture,
  };
}

export const garminConnector: PersonalConnector = {
  id: "garmin-connect",
  provider: "garmin",
  label: "Garmin Connect",
  description:
    "Préparation du futur connecteur santé pour énergie, sommeil, récupération et activités.",
  status: "Préparé",
  category: "health",
  capabilities: [
    "activities",
    "heart_rate",
    "sleep",
    "stress",
    "body_battery",
    "recovery",
    "vo2max",
  ],
  requiredEnvVars: [
    "GARMIN_CLIENT_ID",
    "GARMIN_CLIENT_SECRET",
    "GARMIN_REDIRECT_URI",
  ],
  syncStrategy: "oauth",
  lastSyncAt: null,
  connectUrl: null,
  isEnabled: false,
};
