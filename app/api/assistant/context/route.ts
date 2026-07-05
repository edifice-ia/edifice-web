import { NextResponse } from "next/server";
import { buildProjectContext } from "@/lib/server/assistant/context";
import { canAccessPrivateCockpit } from "@/src/lib/auth/roles";
import { getCurrentUser } from "@/src/lib/supabase/server";

export const runtime = "nodejs";

export async function GET() {
  const user = await getCurrentUser();

  if (!user || !canAccessPrivateCockpit(user)) {
    return NextResponse.json({ error: "Acces refuse." }, { status: 403 });
  }

  try {
    const context = await buildProjectContext();

    return NextResponse.json({
      context,
    });
  } catch {
    return NextResponse.json(
      { error: "Contexte assistant indisponible." },
      { status: 500 },
    );
  }
}
