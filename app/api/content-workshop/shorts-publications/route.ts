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
  const message = error instanceof Error ? error.message : "Publication Shorts indisponible.";
  return {
    error: /bad request/i.test(message)
      ? "Publication YouTube non configuree. Verifie la connexion YouTube."
      : message,
  };
}

function logPublicationApiFailure({
  action,
  error,
  method,
  publicationId,
  route,
  scheduleId,
  validation,
}: {
  action?: string;
  error: unknown;
  method: string;
  publicationId?: string;
  route: string;
  scheduleId?: string;
  validation: string;
}) {
  const payload = publicationErrorPayload(error);
  console.error("[Shorts Publication API] request failed", {
    action: action ?? null,
    code: 400,
    method,
    publication_id: publicationId ?? null,
    response: payload.error,
    route,
    schedule_id: scheduleId ?? null,
    validation,
  });
}

export async function GET() {
  const user = await authorizePublicationAccess();

  if (!user) {
    return NextResponse.json({ error: "Acces refuse." }, { status: 403 });
  }

  try {
    return NextResponse.json(await readShortsPublicationState({ userId: user.id }));
  } catch (error) {
    logPublicationApiFailure({
      error,
      method: "GET",
      route: "/api/content-workshop/shorts-publications",
      validation: "read_publication_state",
    });
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
        logPublicationApiFailure({
          action,
          error: new Error("Programmation YouTube manquante."),
          method: "POST",
          route: "/api/content-workshop/shorts-publications",
          validation: "missing_schedule_id",
        });
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
        logPublicationApiFailure({
          action,
          error: new Error("Publication YouTube manquante."),
          method: "POST",
          route: "/api/content-workshop/shorts-publications",
          validation: "missing_publication_id",
        });
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
    logPublicationApiFailure({
      action,
      error,
      method: "POST",
      publicationId: typeof payload.publicationId === "string" ? payload.publicationId : undefined,
      route: "/api/content-workshop/shorts-publications",
      scheduleId: typeof payload.scheduleId === "string" ? payload.scheduleId : undefined,
      validation: "action_failed",
    });
    return NextResponse.json(publicationErrorPayload(error), { status: 400 });
  }
}
