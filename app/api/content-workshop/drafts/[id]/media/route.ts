import { NextResponse } from "next/server";
import {
  prepareDraftMedia,
  readMediaPipelineState,
  refreshDraftMediaSuggestions,
  selectDraftVisualAsset,
} from "@/lib/server/media-pipeline";
import { canAccessPrivateCockpit } from "@/src/lib/auth/roles";
import { getCurrentUser } from "@/src/lib/supabase/server";

export const runtime = "nodejs";

async function authorizeMediaAccess() {
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
  const user = await authorizeMediaAccess();

  if (!user) {
    return NextResponse.json({ error: "Acces refuse." }, { status: 403 });
  }

  try {
    const { id } = await context.params;
    const { searchParams } = new URL(request.url);
    const media = await readMediaPipelineState({
      draftId: id,
      userId: user.id,
      includeSuggestions: searchParams.get("suggestions") === "1",
    });

    return NextResponse.json({ media });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Lecture du pipeline media indisponible.",
      },
      { status: 400 },
    );
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const user = await authorizeMediaAccess();

  if (!user) {
    return NextResponse.json({ error: "Acces refuse." }, { status: 403 });
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Requete invalide: JSON attendu." },
      { status: 400 },
    );
  }

  const payload = body && typeof body === "object"
    ? body as Record<string, unknown>
    : {};
  const action = typeof payload.action === "string" ? payload.action : "";

  try {
    const { id } = await context.params;

    if (action === "prepare_media") {
      const media = await prepareDraftMedia({
        draftId: id,
        userId: user.id,
      });

      return NextResponse.json({ media });
    }

    if (action === "refresh_suggestions") {
      const media = await refreshDraftMediaSuggestions({
        draftId: id,
        userId: user.id,
      });

      return NextResponse.json({ media });
    }

    if (action === "select_asset" || action === "replace_asset") {
      const assetId =
        typeof payload.assetId === "string" ? payload.assetId : "";
      const usageOrder =
        typeof payload.usageOrder === "number" ? payload.usageOrder : 1;

      if (!assetId) {
        return NextResponse.json(
          { error: "assetId est requis." },
          { status: 400 },
        );
      }

      const media = await selectDraftVisualAsset({
        draftId: id,
        userId: user.id,
        assetId,
        usageOrder,
      });

      return NextResponse.json({ media });
    }

    return NextResponse.json(
      { error: "Action media inconnue." },
      { status: 400 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Pipeline media indisponible.",
      },
      { status: 400 },
    );
  }
}
