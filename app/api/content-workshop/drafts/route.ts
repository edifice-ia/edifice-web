import { NextResponse } from "next/server";
import { readContentDrafts } from "@/lib/server/content-workshop";
import { canAccessPrivateCockpit } from "@/src/lib/auth/roles";
import { getCurrentUser } from "@/src/lib/supabase/server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const user = await getCurrentUser();

  if (!user || !canAccessPrivateCockpit(user)) {
    return NextResponse.json({ error: "Acces refuse." }, { status: 403 });
  }

  const url = new URL(request.url);

  try {
    const drafts = await readContentDrafts({
      status: url.searchParams.get("status"),
      userId: user.id,
    });

    return NextResponse.json({ drafts });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Lecture des brouillons indisponible.",
      },
      { status: 500 },
    );
  }
}
