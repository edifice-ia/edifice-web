import { NextResponse } from "next/server";
import {
  readPublicationPerformanceState,
  savePerformanceRecommendationAction,
  syncInstagramPublicationPerformance,
  syncYouTubePublicationPerformance,
  type PublicationPerformanceFilters,
} from "@/lib/server/publication-performance";
import { canAccessPrivateCockpit } from "@/src/lib/auth/roles";
import { getCurrentUser } from "@/src/lib/supabase/server";

export const runtime = "nodejs";

const validPeriods = new Set(["7d", "30d", "month", "all"]);
const validPlatforms = new Set(["all", "youtube", "instagram", "tiktok"]);
const validStatuses = new Set(["all", "published", "scheduled", "ready", "failed"]);

function parseFilters(url: URL): Partial<PublicationPerformanceFilters> {
  const period = url.searchParams.get("period");
  const platform = url.searchParams.get("platform");
  const status = url.searchParams.get("status");

  return {
    accountId: url.searchParams.get("accountId") || null,
    period: validPeriods.has(period ?? "") ? period as PublicationPerformanceFilters["period"] : "30d",
    platform: validPlatforms.has(platform ?? "") ? platform as PublicationPerformanceFilters["platform"] : "all",
    status: validStatuses.has(status ?? "") ? status as PublicationPerformanceFilters["status"] : "all",
  };
}

async function assertUser() {
  const user = await getCurrentUser();

  if (!user || !canAccessPrivateCockpit(user)) {
    return { response: NextResponse.json({ error: "Acces refuse." }, { status: 403 }), user: null };
  }

  return { response: null, user };
}

function errorPayload(error: unknown) {
  return {
    error: error instanceof Error
      ? error.message
      : "Performances des publications indisponibles.",
  };
}

export async function GET(request: Request) {
  const { response, user } = await assertUser();
  if (response || !user) {
    return response;
  }

  const url = new URL(request.url);

  try {
    const performance = await readPublicationPerformanceState(user.id, parseFilters(url));
    return NextResponse.json({ performance });
  } catch (error) {
    console.warn("[Publication Performance API] read failed", {
      message: error instanceof Error ? error.message : "unknown",
      route: "/api/observatory/publication-performance",
    });
    return NextResponse.json(errorPayload(error), { status: 400 });
  }
}

export async function POST(request: Request) {
  const { response, user } = await assertUser();
  if (response || !user) {
    return response;
  }

  let payload: Record<string, unknown>;
  try {
    payload = await request.json() as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Payload invalide." }, { status: 400 });
  }

  const action = typeof payload.action === "string" ? payload.action : "";
  const url = new URL(request.url);

  try {
    if (action === "sync_youtube") {
      const result = await syncYouTubePublicationPerformance(user.id);
      const performance = await readPublicationPerformanceState(user.id, parseFilters(url));
      return NextResponse.json({ performance, result });
    }

    if (action === "sync_instagram") {
      const result = await syncInstagramPublicationPerformance(user.id);
      const performance = await readPublicationPerformanceState(user.id, parseFilters(url));
      return NextResponse.json({ performance, result });
    }

    if (action === "accept_recommendation" || action === "ignore_recommendation") {
      const recommendationKey = typeof payload.recommendationKey === "string"
        ? payload.recommendationKey
        : "";
      if (!recommendationKey) {
        return NextResponse.json({ error: "Recommandation inconnue." }, { status: 400 });
      }
      const result = await savePerformanceRecommendationAction({
        action: action === "accept_recommendation" ? "accepted" : "ignored",
        payload: typeof payload.payload === "object" && payload.payload !== null
          ? payload.payload as Record<string, unknown>
          : {},
        recommendationKey,
        userId: user.id,
      });
      const performance = await readPublicationPerformanceState(user.id, parseFilters(url));
      return NextResponse.json({ performance, result });
    }

    return NextResponse.json({ error: "Action performances inconnue." }, { status: 400 });
  } catch (error) {
    console.warn("[Publication Performance API] action failed", {
      action,
      message: error instanceof Error ? error.message : "unknown",
      route: "/api/observatory/publication-performance",
    });
    return NextResponse.json(errorPayload(error), { status: 400 });
  }
}
