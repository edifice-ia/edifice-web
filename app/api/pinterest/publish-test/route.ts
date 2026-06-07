import { NextResponse } from "next/server";
import { publishOnePinterestPin } from "@/lib/server/pinterest-publisher";
import { canAccessPrivateCockpit } from "@/src/lib/auth/roles";
import { getCurrentUser } from "@/src/lib/supabase/server";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || !canAccessPrivateCockpit(user)) {
    return NextResponse.json({ ok: false, error: "Acces refuse." }, { status: 403 });
  }

  const payload = (await request.json()) as {
    pinId?: string;
    boardId?: string;
    boardName?: string;
    confirmed?: boolean;
  };

  if (!payload.confirmed) {
    return NextResponse.json(
      { ok: false, error: "Confirmation requise avant publication." },
      { status: 400 },
    );
  }

  if (!payload.pinId || !payload.boardId || !payload.boardName) {
    return NextResponse.json(
      { ok: false, error: "pinId, boardId et boardName sont requis." },
      { status: 400 },
    );
  }

  try {
    const result = await publishOnePinterestPin({
      pinId: payload.pinId,
      boardId: payload.boardId,
      boardName: payload.boardName,
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Publication Pinterest impossible.",
      },
      { status: 502 },
    );
  }
}
