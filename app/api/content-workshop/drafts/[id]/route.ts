import { NextResponse } from "next/server";
import {
  deleteContentDraft,
  sanitizeContentDraftStatusInput,
  sanitizeContentDraftUpdateInput,
  updateContentDraft,
  updateContentDraftStatus,
} from "@/lib/server/content-workshop";
import { canAccessPrivateCockpit } from "@/src/lib/auth/roles";
import { getCurrentUser } from "@/src/lib/supabase/server";

export const runtime = "nodejs";

function summarizePayload(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return payload;
  }

  const record = payload as Record<string, unknown>;
  return {
    keys: Object.keys(record),
    action: record.action,
    status: record.status,
    missingLikelyFields: [
      "project",
      "platformTargets",
      "theme",
      "angle",
      "hook",
      "script",
      "title",
      "caption",
      "hashtags",
      "visualPrompt",
      "voiceStyle",
      "source",
    ].filter((field) => !(field in record)),
  };
}

async function authorizeDraftAccess() {
  const user = await getCurrentUser();

  if (!user || !canAccessPrivateCockpit(user)) {
    return null;
  }

  return user;
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const user = await authorizeDraftAccess();

  if (!user) {
    return NextResponse.json({ error: "Acces refuse." }, { status: 403 });
  }

  let payload: unknown;

  try {
    payload = await request.json();
  } catch (error) {
    const { id } = await context.params;
    console.error("[Content Draft API] PATCH invalid JSON", {
      draftId: id,
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      {
        error: "Requete invalide: JSON attendu.",
        details: {
          draftId: id,
          validation: "request.json",
        },
      },
      { status: 400 },
    );
  }

  try {
    const { id } = await context.params;
    const action = payload && typeof payload === "object"
      ? (payload as Record<string, unknown>).action
      : null;

    console.info("[Content Draft API] PATCH received", {
      draftId: id,
      body: summarizePayload(payload),
    });

    if (action === "update_status") {
      const status = sanitizeContentDraftStatusInput(payload);
      const draft = await updateContentDraftStatus({
        draftId: id,
        status,
        userId: user.id,
      });

      return NextResponse.json({ draft });
    }

    const input = sanitizeContentDraftUpdateInput(payload);
    const draft = await updateContentDraft({
      draftId: id,
      input,
      userId: user.id,
    });

    return NextResponse.json({ draft });
  } catch (error) {
    console.error("[Content Draft API] PATCH failed", {
      body: summarizePayload(payload),
      error: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Mise a jour du brouillon indisponible.",
        details: {
          body: summarizePayload(payload),
          validation: "content_drafts patch",
        },
      },
      { status: 400 },
    );
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const user = await authorizeDraftAccess();

  if (!user) {
    return NextResponse.json({ error: "Acces refuse." }, { status: 403 });
  }

  try {
    const { id } = await context.params;
    await deleteContentDraft({
      draftId: id,
      userId: user.id,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Suppression du brouillon indisponible.",
      },
      { status: 400 },
    );
  }
}
