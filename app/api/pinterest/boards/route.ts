import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  normalizePinterestEnvironment,
  readPinterestPublisherBoards,
} from "@/lib/server/pinterest-publisher";
import { canAccessPrivateCockpit } from "@/src/lib/auth/roles";
import { getCurrentUser } from "@/src/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !canAccessPrivateCockpit(user)) {
    return NextResponse.json({ ok: false, error: "Acces refuse." }, { status: 403 });
  }

  try {
    const environment = normalizePinterestEnvironment(
      request.nextUrl.searchParams.get("environment") ?? undefined,
    );
    const boards = await readPinterestPublisherBoards(environment);

    return NextResponse.json({ ok: true, environment, boards });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Chargement des tableaux Pinterest impossible.",
      },
      { status: 500 },
    );
  }
}
