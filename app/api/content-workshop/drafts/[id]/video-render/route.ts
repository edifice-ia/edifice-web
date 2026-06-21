import { NextResponse } from "next/server";
import {
  createOrReuseVideoRenderJob,
  dispatchVideoRenderJob,
  readVideoRenderJobState,
} from "@/lib/server/video-renderer";
import { canAccessPrivateCockpit } from "@/src/lib/auth/roles";
import { getCurrentUser } from "@/src/lib/supabase/server";

export const runtime = "nodejs";

type RenderAction = "start" | "retry" | "regenerate";

function renderErrorPayload(error: unknown) {
  return {
    error: error instanceof Error ? error.message : "Rendu video indisponible.",
  };
}

async function authorizeVideoRenderAccess() {
  const user = await getCurrentUser();

  if (!user || !canAccessPrivateCockpit(user)) {
    return null;
  }

  return user;
}

function normalizeAction(value: unknown): RenderAction {
  return value === "retry" || value === "regenerate" ? value : "start";
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const user = await authorizeVideoRenderAccess();

  if (!user) {
    return NextResponse.json({ error: "Acces refuse." }, { status: 403 });
  }

  try {
    const { id } = await context.params;
    const videoRender = await readVideoRenderJobState({
      draftId: id,
      userId: user.id,
    });

    return NextResponse.json({ videoRender });
  } catch (error) {
    console.error("[Video Render API] GET failed", renderErrorPayload(error));
    return NextResponse.json(renderErrorPayload(error), { status: 400 });
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const user = await authorizeVideoRenderAccess();

  if (!user) {
    return NextResponse.json({ error: "Acces refuse." }, { status: 403 });
  }

  let payload: Record<string, unknown> = {};
  try {
    payload = await request.json();
  } catch {
    payload = {};
  }

  try {
    const { id } = await context.params;
    const { job, reusedActiveJob } = await createOrReuseVideoRenderJob({
      draftId: id,
      mode: normalizeAction(payload.action),
      userId: user.id,
    });

    if (job.status === "queued") {
      try {
        await dispatchVideoRenderJob(job.id);
      } catch (error) {
        console.error("[Video Render API] Railway dispatch failed", renderErrorPayload(error));
        return NextResponse.json(
          {
            error: error instanceof Error ? error.message : "Renderer Railway indisponible.",
            videoRender: await readVideoRenderJobState({ draftId: id, userId: user.id }),
          },
          { status: 502 },
        );
      }
    }

    return NextResponse.json({
      reusedActiveJob,
      videoRender: await readVideoRenderJobState({ draftId: id, userId: user.id }),
    });
  } catch (error) {
    console.error("[Video Render API] POST failed", renderErrorPayload(error));
    return NextResponse.json(renderErrorPayload(error), { status: 400 });
  }
}
