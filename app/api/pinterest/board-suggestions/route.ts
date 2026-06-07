import { NextResponse } from "next/server";
import { refreshPinterestBoardSuggestions } from "@/lib/server/pinterest-publisher";
import { canAccessPrivateCockpit } from "@/src/lib/auth/roles";
import { getCurrentUser } from "@/src/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const user = await getCurrentUser();
  if (!user || !canAccessPrivateCockpit(user)) {
    return NextResponse.json({ ok: false, error: "Acces refuse." }, { status: 403 });
  }

  try {
    const result = await refreshPinterestBoardSuggestions();
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Actualisation des suggestions Pinterest impossible.",
      },
      { status: 500 },
    );
  }
}
