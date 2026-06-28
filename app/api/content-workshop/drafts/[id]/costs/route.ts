import { NextResponse } from "next/server";
import { readDraftCostSummary } from "@/lib/server/cost-tracking";
import { canAccessPrivateCockpit } from "@/src/lib/auth/roles";
import { getCurrentUser } from "@/src/lib/supabase/server";

export const runtime = "nodejs";

async function authorizeCostAccess() {
  const user = await getCurrentUser();

  if (!user || !canAccessPrivateCockpit(user)) {
    return null;
  }

  return user;
}

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const user = await authorizeCostAccess();

  if (!user) {
    return NextResponse.json({ error: "Acces refuse." }, { status: 403 });
  }

  try {
    const { id } = await context.params;
    const { searchParams } = new URL(request.url);
    const durationSeconds = Number(searchParams.get("duration_seconds"));
    const visualCount = Number(searchParams.get("visual_count"));
    const voiceCharacters = Number(searchParams.get("voice_characters"));

    return NextResponse.json({
      costs: await readDraftCostSummary({
        draftId: id,
        durationSeconds: Number.isFinite(durationSeconds) ? durationSeconds : null,
        userId: user.id,
        visualCount: Number.isFinite(visualCount) ? visualCount : null,
        voiceCharacterCount: Number.isFinite(voiceCharacters) ? voiceCharacters : null,
      }),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Couts indisponibles." },
      { status: 400 },
    );
  }
}
