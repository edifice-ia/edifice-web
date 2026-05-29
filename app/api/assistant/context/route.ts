import { NextResponse } from "next/server";
import {
  buildProjectContext,
  normalizeAssistantQuestion,
} from "@/lib/server/assistant/context";
import { canAccessPrivateCockpit } from "@/src/lib/auth/roles";
import { getCurrentUser } from "@/src/lib/supabase/server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const user = await getCurrentUser();

  if (!user || !canAccessPrivateCockpit(user)) {
    return NextResponse.json({ error: "Acces refuse." }, { status: 403 });
  }

  try {
    const context = await buildProjectContext();
    const url = new URL(request.url);
    const question = normalizeAssistantQuestion(url.searchParams.get("question"));

    return NextResponse.json({
      context,
      question,
      recommendation: context.recommendations[question],
    });
  } catch {
    return NextResponse.json(
      { error: "Contexte assistant indisponible." },
      { status: 500 },
    );
  }
}
