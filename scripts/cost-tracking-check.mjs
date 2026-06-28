import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const migration = await readFile("supabase/migrations/20260628100000_create_cost_events.sql", "utf8");
const rates = await readFile("lib/server/cost-rates.ts", "utf8");
const tracking = await readFile("lib/server/cost-tracking.ts", "utf8");

[
  "id uuid primary key",
  "user_id uuid null",
  "draft_id uuid null",
  "account_id text null",
  "provider text not null",
  "category text not null",
  "estimated_cost_eur numeric",
  "actual_cost_eur numeric",
  "status text not null",
  "event_key text not null",
  "unique (event_key)",
  "cost_events_occurred_at_idx",
  "cost_events_draft_id_idx",
  "cost_events_account_id_idx",
  "cost_events_provider_idx",
  "cost_events_category_idx",
].forEach((needle) => {
  assert.ok(migration.includes(needle), `migration should include ${needle}`);
});

[
  "image_generation",
  "image_analysis",
  "voice_generation",
  "subtitle_generation",
  "video_render",
  "storage",
  "other",
].forEach((category) => {
  assert.ok(migration.includes(category), `category ${category} should be allowed`);
});

[
  "COST_ELEVENLABS_EUR_PER_CHARACTER",
  "COST_OPENAI_IMAGE_EUR_PER_IMAGE",
  "COST_OPENAI_VISION_EUR_PER_SCENE",
  "COST_RAILWAY_RENDER_EUR_PER_MINUTE",
  "COST_SUPABASE_STORAGE_EUR_PER_GB_MONTH",
  "COST_SUBTITLE_EUR_PER_MINUTE",
].forEach((envName) => {
  assert.ok(rates.includes(envName), `${envName} should be centralized`);
});

assert.equal(rates.includes("NEXT_PUBLIC_COST"), false, "cost rates must not be exposed as NEXT_PUBLIC");
assert.ok(tracking.includes("shorts:${draftId}:voice:${voice.generatedAt}"), "voice event key should be idempotent");
assert.ok(tracking.includes("shorts:${draftId}:video_render:${videoRender.id}"), "render event key should be idempotent by job");
assert.ok(tracking.includes("Europe/Paris"), "observatory aggregations should use Europe/Paris");

console.log("Cost tracking checks passed.");
