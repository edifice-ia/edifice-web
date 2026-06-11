import { NextResponse } from "next/server";
import { clearPinterestPinError } from "@/lib/server/pinterest-publisher";
import { canAccessPrivateCockpit } from "@/src/lib/auth/roles";
import { getCurrentUser } from "@/src/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || !canAccessPrivateCockpit(user)) {
    return NextResponse.json({ ok: false, error: "Acces refuse." }, { status: 403 });
  }

  const payload = (await request.json()) as { pinId?: string };

  if (!payload.pinId) {
    return NextResponse.json(
      { ok: false, error: "pinId est requis." },
      { status: 400 },
    );
  }

  try {
    const result = await clearPinterestPinError(payload.pinId);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Nettoyage erreur Pinterest impossible.",
      },
      { status: 500 },
    );
  }
}
