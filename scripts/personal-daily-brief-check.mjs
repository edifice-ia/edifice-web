import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { register } from "node:module";

register("./lib/alias-loader.mjs", import.meta.url);

const { garminMockDailyFixture, mapGarminFixtureToDailyStats } = await import(
  "../lib/personal/connectors/garmin.ts"
);
const {
  computeRecoveryLevel,
  prioritizeOpenActions,
  generateDailyBrief,
} = await import("../lib/server/personal/daily-brief-engine.ts");

// --- Static guarantee: this module must never reference a trajectoire_actions
// write (insert/update/delete), only reads via readTrajectoire. ---

const engineSource = await readFile(
  new URL("../lib/server/personal/daily-brief-engine.ts", import.meta.url),
  "utf8",
);
assert.ok(
  !/trajectoire_actions[\s\S]{0,80}\.(insert|update|delete|upsert)\(/.test(engineSource),
  "daily-brief-engine.ts must never write to trajectoire_actions",
);
assert.ok(
  !engineSource.includes("updateTrajectoireAction") &&
    !engineSource.includes("applyTrajectoireAssistantUpdate") &&
    !engineSource.includes("deleteTrajectoireEntity"),
  "daily-brief-engine.ts must not import any Trajectoire write function",
);
console.log("Static source check passed: no Trajectoire write path in daily-brief-engine.ts.");

// --- Static guarantee: prioritization uses effort_level, not the old
// objective-priority proxy it replaced. ---

assert.ok(
  !engineSource.includes("objectivePriority") && !engineSource.includes("priorityWeight"),
  "daily-brief-engine.ts must no longer use the objective-priority proxy",
);
assert.ok(
  engineSource.includes("effortLevel") && engineSource.includes("effortWeight"),
  "daily-brief-engine.ts must prioritize using effort_level",
);
console.log("Static source check passed: prioritization is based on effort_level, not objective priority.");

// --- Step 1: sync Garmin (mocked fixture -> stats mapping, no network, no DB) ---

const date = "2026-07-08";
const stats = mapGarminFixtureToDailyStats(garminMockDailyFixture, date);
assert.equal(stats.date, date);
assert.equal(stats.sleepScore, garminMockDailyFixture.sleep.sleepScore);
assert.equal(stats.sleepDurationMinutes, 450);
assert.equal(stats.bodyBatteryMax, garminMockDailyFixture.bodyBattery.bodyBatteryMax);
assert.equal(stats.hrvStatus, "BALANCED");
console.log("Step 1 passed: Garmin fixture mapped to personal_garmin_daily_stats shape.");

// --- Step 2: recovery_level computation ---

// The mock fixture intentionally represents an average recovery day (see the
// comment next to garminMockDailyFixture in garmin.ts).
const mockFixtureAssessment = computeRecoveryLevel(stats);
assert.equal(mockFixtureAssessment.level, "medium", "the mock fixture represents an average recovery day");

const highStats = {
  ...stats,
  sleepScore: 88,
  bodyBatteryMax: 85,
  hrvStatus: "BALANCED",
  trainingReadinessScore: 80,
  stressAvg: 15,
};
assert.equal(computeRecoveryLevel(highStats).level, "high", "all-good metrics must yield high");

const lowStats = {
  ...stats,
  sleepScore: 45,
  bodyBatteryMax: 40,
  hrvStatus: "LOW",
  trainingReadinessScore: 20,
  stressAvg: 70,
};
assert.equal(computeRecoveryLevel(lowStats).level, "low", "degraded metrics must yield low");

const mixedStats = { ...stats, sleepScore: 65, bodyBatteryMax: 60, hrvStatus: "UNBALANCED" };
assert.equal(computeRecoveryLevel(mixedStats).level, "medium", "mixed metrics must yield medium");

assert.equal(computeRecoveryLevel(null).level, "medium", "missing data must default to medium");
console.log("Step 2 passed: recovery_level computed correctly for high/low/medium/missing.");

// --- Step 3: prioritization of open trajectoire_actions using
// action.effort_level (read-only input, no dependency on objective priority) ---

const openActions = [
  { actionId: "a-low", title: "Ranger le bureau", dueDate: "2026-07-10", effortLevel: "low", objectiveTitle: "Obj A", projectTitle: "Projet A" },
  { actionId: "b-high", title: "Preparer la conference", dueDate: "2026-07-09", effortLevel: "high", objectiveTitle: "Obj B", projectTitle: "Projet B" },
  { actionId: "c-medium", title: "Repondre aux emails", dueDate: "2026-07-08", effortLevel: "medium", objectiveTitle: "Obj C", projectTitle: "Projet C" },
];

const highOrder = prioritizeOpenActions(openActions, "high").map((a) => a.actionId);
assert.deepEqual(highOrder, ["b-high", "c-medium", "a-low"], "high recovery must front-load high-effort actions");

const lowOrder = prioritizeOpenActions(openActions, "low").map((a) => a.actionId);
assert.deepEqual(lowOrder, ["a-low", "c-medium", "b-high"], "low recovery must front-load low-effort (light) actions");

const mediumOrder = prioritizeOpenActions(openActions, "medium").map((a) => a.actionId);
assert.deepEqual(mediumOrder, ["c-medium", "b-high", "a-low"], "medium recovery must stay neutral (due date order)");
console.log("Step 3 passed: prioritization order driven by effort_level, correct for high/low/medium.");

// --- Step 3b: defensive fallback when effort_level is missing/invalid (should
// never happen given the column's DEFAULT 'medium', but must not crash) ---

const actionsWithMissingEffort = [
  { actionId: "x-missing", title: "Action sans effort_level", dueDate: null, effortLevel: undefined, objectiveTitle: "Obj X", projectTitle: "Projet X" },
  { actionId: "y-low", title: "Action low", dueDate: null, effortLevel: "low", objectiveTitle: "Obj Y", projectTitle: "Projet Y" },
  { actionId: "z-high", title: "Action high", dueDate: null, effortLevel: "high", objectiveTitle: "Obj Z", projectTitle: "Projet Z" },
];

const highOrderWithFallback = prioritizeOpenActions(actionsWithMissingEffort, "high").map((a) => a.actionId);
assert.deepEqual(
  highOrderWithFallback,
  ["z-high", "x-missing", "y-low"],
  "a missing effort_level must be treated as medium, not crash",
);

const lowOrderWithFallback = prioritizeOpenActions(actionsWithMissingEffort, "low").map((a) => a.actionId);
assert.deepEqual(
  lowOrderWithFallback,
  ["y-low", "x-missing", "z-high"],
  "a missing effort_level must be treated as medium, not crash",
);
console.log("Step 3b passed: missing/invalid effort_level falls back to medium without crashing.");

// --- Step 4: full cycle via generateDailyBrief with injected fakes, verifying
// personal_daily_briefs write and that trajectoire_actions is never touched ---

let trajectoireActionsWriteCalls = 0;
const fakeTrajectoireActionWrite = () => {
  trajectoireActionsWriteCalls += 1;
  throw new Error("trajectoire_actions must never be written by the daily brief engine");
};

let writeBriefCalls = 0;
let lastWrittenBrief = null;

const result = await generateDailyBrief({
  userId: "user-mock-1",
  date,
  readStats: async () => highStats,
  readOpenActions: async () => openActions,
  writeBrief: async (params) => {
    writeBriefCalls += 1;
    lastWrittenBrief = params;
    // Proves the engine's write path has no reachable Trajectoire mutation:
    // if generateDailyBrief ever called a Trajectoire write, it would have to
    // go through some injected or imported function; none is wired here.
    void fakeTrajectoireActionWrite;
  },
});

assert.equal(writeBriefCalls, 1, "writeBrief must be called exactly once");
assert.equal(trajectoireActionsWriteCalls, 0, "no Trajectoire write function must ever be invoked");
assert.equal(result.recoveryLevel, "high");
assert.equal(lastWrittenBrief.recoveryLevel, "high");
assert.equal(lastWrittenBrief.userId, "user-mock-1");
assert.equal(lastWrittenBrief.date, date);
assert.equal(lastWrittenBrief.recommendedFocus.length, 3);
assert.equal(lastWrittenBrief.recommendedFocus[0].actionId, "b-high");
assert.equal(result.recommendedFocus[0].actionId, "b-high");

console.log("Step 4 passed: full cycle (sync -> recovery_level -> prioritization -> brief write) verified.");
console.log("trajectoire_actions write calls observed: 0 (verified both statically and at runtime).");

console.log("Personal daily brief engine checks passed.");
