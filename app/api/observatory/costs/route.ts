import { NextResponse } from "next/server";
import {
  readObservatoryCostSummary,
  type ObservatoryCostPeriod,
} from "@/lib/server/cost-tracking";
import type { CostCategory, CostProvider } from "@/lib/server/cost-rates";
import { canAccessPrivateCockpit } from "@/src/lib/auth/roles";
import { getCurrentUser } from "@/src/lib/supabase/server";

export const runtime = "nodejs";

const validPeriods = new Set<ObservatoryCostPeriod>(["today", "7d", "30d", "month"]);
const validProviders = new Set<CostProvider>(["openai", "elevenlabs", "railway", "supabase", "internal"]);
const validCategories = new Set<CostCategory>([
  "image_generation",
  "image_analysis",
  "voice_generation",
  "subtitle_generation",
  "video_render",
  "storage",
  "other",
]);

function parsePeriod(value: string | null): ObservatoryCostPeriod {
  return value && validPeriods.has(value as ObservatoryCostPeriod)
    ? (value as ObservatoryCostPeriod)
    : "30d";
}

function parseProvider(value: string | null) {
  return value && validProviders.has(value as CostProvider)
    ? (value as CostProvider)
    : "all";
}

function parseCategory(value: string | null) {
  return value && validCategories.has(value as CostCategory)
    ? (value as CostCategory)
    : "all";
}

export async function GET(request: Request) {
  const user = await getCurrentUser();

  if (!user || !canAccessPrivateCockpit(user)) {
    return NextResponse.json({ error: "Acces refuse." }, { status: 403 });
  }

  const url = new URL(request.url);

  try {
    const costs = await readObservatoryCostSummary(user.id, {
      accountId: url.searchParams.get("accountId") || null,
      category: parseCategory(url.searchParams.get("category")),
      period: parsePeriod(url.searchParams.get("period")),
      provider: parseProvider(url.searchParams.get("provider")),
    });

    return NextResponse.json({ costs });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Lecture des couts Observatoire impossible.",
      },
      { status: 400 },
    );
  }
}
