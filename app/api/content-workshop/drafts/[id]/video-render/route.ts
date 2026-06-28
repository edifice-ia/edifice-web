import { NextResponse } from "next/server";
import {
  cancelActiveVideoRenderJob,
  createOrReuseVideoRenderJob,
  dispatchVideoRenderJob,
  markVideoRenderJobFailed,
  readVideoRenderJobState,
  validateCompletedVideoRenderJob,
} from "@/lib/server/video-renderer";
import { recordVideoRenderCost } from "@/lib/server/cost-tracking";
import { canAccessPrivateCockpit } from "@/src/lib/auth/roles";
import { getCurrentUser } from "@/src/lib/supabase/server";

export const runtime = "nodejs";

type RenderAction = "start" | "retry" | "regenerate" | "cancel" | "validate";

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
  return value === "retry" ||
    value === "regenerate" ||
    value === "cancel" ||
    value === "validate"
    ? value
    : "start";
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
    if (videoRender?.status === "completed") {
      await recordVideoRenderCost({
        draftId: id,
        userId: user.id,
        videoRender,
      });
    }

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
    const action = normalizeAction(payload.action);

    if (action === "cancel") {
      await cancelActiveVideoRenderJob({
        draftId: id,
        userId: user.id,
      });

      return NextResponse.json({
        videoRender: await readVideoRenderJobState({ draftId: id, userId: user.id }),
      });
    }

    if (action === "validate") {
      return NextResponse.json({
        videoRender: await validateCompletedVideoRenderJob({
          draftId: id,
          userId: user.id,
        }),
      });
    }

    const { job, reusedActiveJob } = await createOrReuseVideoRenderJob({
      draftId: id,
      mode: action,
      userId: user.id,
    });

    if (job.status === "queued") {
      try {
        await dispatchVideoRenderJob(job.id);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Renderer Railway indisponible.";
        console.error("[Video Render API] Railway dispatch failed", renderErrorPayload(error));
        try {
          await markVideoRenderJobFailed(job.id, message);
        } catch (updateError) {
          console.error("[Video Render API] Could not mark dispatch failure", renderErrorPayload(updateError));
        }
        return NextResponse.json(
          {
            error: message,
            videoRender: await readVideoRenderJobState({ draftId: id, userId: user.id }),
          },
          { status: 502 },
        );
      }
    }

    const videoRender = await readVideoRenderJobState({ draftId: id, userId: user.id });
    if (videoRender?.status === "completed") {
      await recordVideoRenderCost({
        draftId: id,
        userId: user.id,
        videoRender,
      });
    }

    return NextResponse.json({
      reusedActiveJob,
      videoRender,
    });
  } catch (error) {
    console.error("[Video Render API] POST failed", renderErrorPayload(error));
    return NextResponse.json(renderErrorPayload(error), { status: 400 });
  }
}
