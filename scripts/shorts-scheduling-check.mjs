import assert from "node:assert/strict";

const scheduling = await import("../lib/shorts-scheduling.ts");

const {
  DEFAULT_SHORTS_SCHEDULE_TIMEZONE,
  buildShortsScheduleCandidates,
  scheduleDateTimeToIso,
} = scheduling;

function assertNoPastCandidates(result, now) {
  result.candidates.forEach((candidate) => {
    assert.ok(
      Date.parse(candidate.scheduledAt) > now.getTime(),
      `${candidate.platform} ${candidate.localDate} ${candidate.localTime} should be after now`,
    );
  });
}

{
  const now = new Date("2026-06-27T08:00:00.000Z");
  const result = buildShortsScheduleCandidates({
    daysCount: 7,
    frequency: 1,
    now,
    platforms: ["tiktok"],
    startDate: "2026-06-26",
    timezone: DEFAULT_SHORTS_SCHEDULE_TIMEZONE,
  });

  assert.equal(result.effectiveStartDate, "2026-06-27");
  assertNoPastCandidates(result, now);
}

{
  const now = new Date("2026-06-27T17:30:00.000Z");
  const result = buildShortsScheduleCandidates({
    daysCount: 1,
    frequency: 3,
    now,
    platforms: ["tiktok"],
    startDate: "2026-06-27",
    timezone: DEFAULT_SHORTS_SCHEDULE_TIMEZONE,
  });

  assert.equal(result.skippedPastSlotCount, 2);
  assert.equal(result.candidates[0]?.localDate, "2026-06-27");
  assert.equal(result.candidates[0]?.localTime, "21:00");
  assertNoPastCandidates(result, now);
}

{
  assert.equal(
    scheduleDateTimeToIso("2026-06-27", "13:00", DEFAULT_SHORTS_SCHEDULE_TIMEZONE),
    "2026-06-27T11:00:00.000Z",
  );
}

{
  const now = new Date("2026-06-27T08:00:00.000Z");
  const result = buildShortsScheduleCandidates({
    daysCount: 2,
    frequency: 1,
    now,
    platforms: ["tiktok", "instagram", "youtube"],
    startDate: "2026-06-27",
    timezone: DEFAULT_SHORTS_SCHEDULE_TIMEZONE,
  });

  assert.equal(result.candidates.length, 6);
  assert.deepEqual(
    [...new Set(result.candidates.map((candidate) => candidate.localDate))],
    ["2026-06-27", "2026-06-28"],
  );
  assertNoPastCandidates(result, now);
}

{
  const now = new Date("2026-06-27T19:30:00.000Z");
  const result = buildShortsScheduleCandidates({
    daysCount: 2,
    frequency: 3,
    now,
    platforms: ["tiktok", "instagram", "youtube"],
    startDate: "2026-06-26",
    timezone: DEFAULT_SHORTS_SCHEDULE_TIMEZONE,
  });

  assertNoPastCandidates(result, now);
}

console.log("Shorts scheduling checks passed.");
