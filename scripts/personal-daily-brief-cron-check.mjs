import assert from "node:assert/strict";
import { register } from "node:module";

register("./lib/alias-loader.mjs", import.meta.url);

process.env.CRON_SECRET = "test-cron-secret";

const { isAuthorized, isParisHour8, runPersonalDailyBriefCron } = await import(
  "../app/api/internal/cron/personal-daily-brief/route.ts"
);

// --- CRON_SECRET: valid / invalid / missing ---

function requestWith(headers) {
  return new Request("http://localhost/api/internal/cron/personal-daily-brief", { headers });
}

assert.equal(
  isAuthorized(requestWith({ authorization: "Bearer test-cron-secret" })),
  true,
  "a matching Authorization: Bearer header must be authorized",
);
assert.equal(
  isAuthorized(requestWith({ "x-cron-secret": "test-cron-secret" })),
  true,
  "a matching x-cron-secret header must be authorized",
);
assert.equal(
  isAuthorized(requestWith({ authorization: "Bearer wrong-secret" })),
  false,
  "a wrong secret must be rejected",
);
assert.equal(
  isAuthorized(requestWith({})),
  false,
  "no header at all must be rejected",
);

const previousSecret = process.env.CRON_SECRET;
delete process.env.CRON_SECRET;
assert.equal(
  isAuthorized(requestWith({ authorization: "Bearer test-cron-secret" })),
  false,
  "a missing CRON_SECRET server-side must reject every call, even with a header",
);
process.env.CRON_SECRET = previousSecret;

console.log("CRON_SECRET checks passed: valid, invalid, and missing-config cases.");

// --- Paris 8am window: vercel.json declares two daily UTC schedules (6am and
// 7am) to cover both DST offsets; only the invocation that actually lands at
// 8am Europe/Paris must run, the other must be a silent no-op. ---

assert.equal(
  isParisHour8(new Date("2026-07-15T06:00:00.000Z")),
  true,
  "06:00 UTC in summer (UTC+2) is 8am Paris and must run",
);
assert.equal(
  isParisHour8(new Date("2026-01-15T07:00:00.000Z")),
  true,
  "07:00 UTC in winter (UTC+1) is 8am Paris and must run",
);
assert.equal(
  isParisHour8(new Date("2026-07-15T07:00:00.000Z")),
  false,
  "07:00 UTC in summer is 9am Paris, not the target hour: must no-op",
);
assert.equal(
  isParisHour8(new Date("2026-01-15T06:00:00.000Z")),
  false,
  "06:00 UTC in winter is 7am Paris, not the target hour: must no-op",
);
console.log("Paris 8am window checks passed: runs at 8am Paris regardless of season, no-ops otherwise.");

// --- No Garmin data today: must not error, must not call generate ---

let generateCallsForEmptyCase = 0;
const emptyResult = await runPersonalDailyBriefCron({
  date: "2026-07-11",
  listUserIds: async () => [],
  generate: async () => {
    generateCallsForEmptyCase += 1;
    throw new Error("generate must never be called when there is no data for today");
  },
});

assert.deepEqual(emptyResult, { date: "2026-07-11", generated: 0, userIds: [], failed: [] });
assert.equal(generateCallsForEmptyCase, 0, "generate must not be invoked with an empty user list");
console.log("No-data-today case passed: no error, no brief generated, logged as a normal outcome.");

// --- Data present for two users: both get a brief ---

const generateCalls = [];
const withDataResult = await runPersonalDailyBriefCron({
  date: "2026-07-11",
  listUserIds: async () => ["user-a", "user-b"],
  generate: async ({ userId, date }) => {
    generateCalls.push({ userId, date });
    return { date, recoveryLevel: "medium", signals: [], recommendedFocus: [] };
  },
});

assert.equal(withDataResult.generated, 2);
assert.deepEqual(withDataResult.userIds, ["user-a", "user-b"]);
assert.deepEqual(withDataResult.failed, []);
assert.equal(generateCalls.length, 2);
assert.deepEqual(
  generateCalls.map((call) => call.userId).sort(),
  ["user-a", "user-b"],
);
assert.ok(generateCalls.every((call) => call.date === "2026-07-11"));
console.log("Data-present case passed: one brief generated per synced user.");

// --- One user fails, two succeed: failure must be isolated, not sink the batch ---

const isolationCalls = [];
const partialFailureResult = await runPersonalDailyBriefCron({
  date: "2026-07-11",
  listUserIds: async () => ["user-a", "user-broken", "user-c"],
  generate: async ({ userId, date }) => {
    isolationCalls.push(userId);
    if (userId === "user-broken") {
      throw new Error("simulated transient failure for user-broken");
    }
    return { date, recoveryLevel: "medium", signals: [], recommendedFocus: [] };
  },
});

assert.equal(
  isolationCalls.length,
  3,
  "all three users must be attempted, the failing one must not stop the loop",
);
assert.equal(partialFailureResult.generated, 2, "the two succeeding users must still be counted");
assert.deepEqual(partialFailureResult.userIds, ["user-a", "user-c"]);
assert.equal(partialFailureResult.failed.length, 1);
assert.equal(partialFailureResult.failed[0].userId, "user-broken");
assert.match(partialFailureResult.failed[0].message, /simulated transient failure/);
console.log("Partial-failure case passed: one user failing does not block the others, failure is reported per user.");

console.log("Personal daily brief cron checks passed.");
