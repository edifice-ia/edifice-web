import { NextResponse } from "next/server";
import {
  prepareYouTubeShortPublication,
  publishYouTubeShort,
  readShortsPublicationState,
} from "@/lib/server/shorts-publication";
import { canAccessPrivateCockpit } from "@/src/lib/auth/roles";
import { getCurrentUser } from "@/src/lib/supabase/server";

export const runtime = "nodejs";

async function authorizePublicationAccess() {
  const user = await getCurrentUser();

  if (!user || !canAccessPrivateCockpit(user)) {
    return null;
  }

  return user;
}

function publicationErrorPayload(error: unknown) {
  return {
    error: error instanceof Error ? error.message : "Publication Shorts indisponible.",
  };
}

export async function GET() {
  const user = await authorizePublicationAccess();

  if (!user) {
    return NextResponse.json({ error: "Acces refuse." }, { status: 403 });
  }

  try {
    return NextResponse.json(await readShortsPublicationState({ userId: user.id }));
  } catch (error) {
    console.error("[Shorts Publication API] GET failed", publicationErrorPayload(error));
    return NextResponse.json(publicationErrorPayload(error), { status: 400 });
  }
}

export async function POST(request: Request) {
  const user = await authorizePublicationAccess();

  if (!user) {
    return NextResponse.json({ error: "Acces refuse." }, { status: 403 });
  }

  let payload: Record<string, unknown> = {};
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Requete invalide: JSON attendu." }, { status: 400 });
  }

  const action = typeof payload.action === "string" ? payload.action : "";
  const data = payload.data && typeof payload.data === "object"
    ? payload.data as Record<string, unknown>
    : {};

  try {
    if (action === "prepare_youtube") {
      const scheduleId = typeof payload.scheduleId === "string" ? payload.scheduleId : "";
      if (!scheduleId) {
        return NextResponse.json({ error: "Programmation YouTube manquante." }, { status: 400 });
      }

      return NextResponse.json(await prepareYouTubeShortPublication({
        input: data,
        scheduleId,
        userId: user.id,
      }));
    }

    if (action === "publish_youtube") {
      const publicationId = typeof payload.publicationId === "string" ? payload.publicationId : "";
      if (!publicationId) {
        return NextResponse.json({ error: "Publication YouTube manquante." }, { status: 400 });
      }

      return NextResponse.json(await publishYouTubeShort({
        input: data,
        publicationId,
        userId: user.id,
      }));
    }

    return NextResponse.json({ error: "Action publication inconnue." }, { status: 400 });
  } catch (error) {
    console.error("[Shorts Publication API] POST failed", publicationErrorPayload(error));
    return NextResponse.json(publicationErrorPayload(error), { status: 400 });
  }
}
