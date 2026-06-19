import { NextResponse } from "next/server";
import {
  MediaPipelineError,
  analyzeDraftVisualScene,
  prepareDraftMedia,
  readMediaPipelineState,
  recoverStuckDraftVisualScenes,
  refreshDraftMediaSuggestions,
  regenerateDraftVisualScene,
  removeDraftVisualAsset,
  requestDraftVisualGeneration,
  retryBlockedDraftVisualScenes,
  retryDraftVisualSceneSearch,
  selectDraftVisualAsset,
  selectDraftVisualSceneAsset,
  unlockDraftVisualScene,
  updateDraftVisualSceneStatus,
  validateDraftVisuals,
} from "@/lib/server/media-pipeline";
import {
  generateDraftVoice,
  selectDraftVoice,
  unlockDraftVoice,
  validateDraftVoice,
} from "@/lib/server/voice-pipeline";
import { canAccessPrivateCockpit } from "@/src/lib/auth/roles";
import { getCurrentUser } from "@/src/lib/supabase/server";

export const runtime = "nodejs";

function summarizeMediaBody(body: unknown) {
  if (!body || typeof body !== "object") {
    return body;
  }

  const payload = body as Record<string, unknown>;
  return {
    keys: Object.keys(payload),
    action: payload.action,
    assetId: payload.assetId,
    generationQuality: payload.generationQuality,
    sceneIndex: payload.sceneIndex,
    usageOrder: payload.usageOrder,
    missing: [
      payload.action === "select_asset" ||
      payload.action === "select_scene_asset" ||
      payload.action === "replace_asset" ||
      payload.action === "remove_asset"
        ? "assetId"
        : null,
    ].filter((field): field is string => Boolean(field && !(field in payload))),
  };
}

function mediaErrorPayload(error: unknown, body?: unknown) {
  const message =
    error instanceof Error ? error.message : "Pipeline media indisponible.";
  const context =
    error instanceof MediaPipelineError ? error.context : undefined;
  const isTechnicalMediaError =
    typeof context?.validation === "string" &&
    (context.validation.startsWith("openai.") ||
      context.validation.startsWith("supabase.") ||
      context.validation.startsWith("content_assets.") ||
      context.validation.startsWith("content_draft_visual_scenes."));

  return {
    error: isTechnicalMediaError
      ? "Action visuelle indisponible. Le detail technique est disponible dans les logs serveur."
      : message,
    details: {
      body: summarizeMediaBody(body),
      validation: context?.validation ?? "media_pipeline",
      draftId: context?.draftId,
      sceneIndex: context?.sceneIndex,
      draftStatus: context?.draftStatus,
      contentAssetsCount: context?.contentAssetsCount,
      mediaPipelineStatus: context?.mediaPipelineStatus,
      visualDecisionMode: context?.visualDecisionMode,
      technicalError: isTechnicalMediaError ? message : undefined,
    },
  };
}

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
    console.info("[Media Pipeline API] GET received", {
      draftId: id,
      suggestions: searchParams.get("suggestions") === "1",
    });
    const media = await readMediaPipelineState({
      draftId: id,
      userId: user.id,
      includeSuggestions: searchParams.get("suggestions") === "1",
    });

    return NextResponse.json({ media });
  } catch (error) {
    console.error("[Media Pipeline API] GET failed", mediaErrorPayload(error));
    return NextResponse.json(
      mediaErrorPayload(error),
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
  } catch (error) {
    const { id } = await context.params;
    console.error("[Media Pipeline API] POST invalid JSON", {
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

  const payload = body && typeof body === "object"
    ? body as Record<string, unknown>
    : {};
  const action = typeof payload.action === "string" ? payload.action : "";

  try {
    const { id } = await context.params;
    console.info("[Media Pipeline API] POST received", {
      draftId: id,
      body: summarizeMediaBody(payload),
    });

    if (action === "prepare_media") {
      const media = await prepareDraftMedia({
        draftId: id,
        generationQuality: payload.generationQuality,
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

    if (action === "request_visual_generation") {
      const media = await requestDraftVisualGeneration({
        draftId: id,
        generationQuality: payload.generationQuality,
        userId: user.id,
      });

      return NextResponse.json({ media });
    }

    if (action === "retry_blocked_scenes") {
      const media = await retryBlockedDraftVisualScenes({
        draftId: id,
        generationQuality: payload.generationQuality,
        userId: user.id,
      });

      return NextResponse.json({ media });
    }

    if (action === "watchdog_visual_scenes" || action === "recover_stuck_visual_scenes") {
      const media = await recoverStuckDraftVisualScenes({
        draftId: id,
        generationQuality: payload.generationQuality,
        userId: user.id,
      });

      return NextResponse.json({ media });
    }

    if (action === "regenerate_scene" || action === "analyze_scene" || action === "retry_scene_search") {
      const sceneIndex =
        typeof payload.sceneIndex === "number" ? payload.sceneIndex : 1;
      const media = action === "regenerate_scene"
        ? await regenerateDraftVisualScene({
            draftId: id,
            generationQuality: payload.generationQuality,
            sceneIndex,
            userId: user.id,
          })
        : action === "retry_scene_search"
          ? await retryDraftVisualSceneSearch({
              draftId: id,
              generationQuality: payload.generationQuality,
              sceneIndex,
              userId: user.id,
            })
          : await analyzeDraftVisualScene({
            draftId: id,
            sceneIndex,
            userId: user.id,
            });

      return NextResponse.json({ media });
    }

    if (action === "retain_scene" || action === "reject_scene") {
      const sceneIndex =
        typeof payload.sceneIndex === "number" ? payload.sceneIndex : 1;
      const media = await updateDraftVisualSceneStatus({
        draftId: id,
        sceneIndex,
        status: action === "retain_scene" ? "retained" : "rejected",
        userId: user.id,
      });

      return NextResponse.json({ media });
    }

    if (action === "unlock_scene") {
      const sceneIndex =
        typeof payload.sceneIndex === "number" ? payload.sceneIndex : 1;
      const media = await unlockDraftVisualScene({
        draftId: id,
        sceneIndex,
        userId: user.id,
      });

      return NextResponse.json({ media });
    }

    if (action === "validate_visuals") {
      const media = await validateDraftVisuals({
        draftId: id,
        userId: user.id,
      });

      return NextResponse.json({ media });
    }

    if (action === "select_voice") {
      await selectDraftVoice({
        draftId: id,
        userId: user.id,
        voiceId: payload.voiceId,
      });
      const media = await readMediaPipelineState({
        draftId: id,
        userId: user.id,
        includeSuggestions: true,
      });

      return NextResponse.json({ media });
    }

    if (action === "generate_voice" || action === "regenerate_voice") {
      await generateDraftVoice({
        draftId: id,
        userId: user.id,
        voiceId: payload.voiceId,
      });
      const media = await readMediaPipelineState({
        draftId: id,
        userId: user.id,
        includeSuggestions: true,
      });

      return NextResponse.json({ media });
    }

    if (action === "validate_voice") {
      await validateDraftVoice({
        draftId: id,
        userId: user.id,
      });
      const media = await readMediaPipelineState({
        draftId: id,
        userId: user.id,
        includeSuggestions: true,
      });

      return NextResponse.json({ media });
    }

    if (action === "unlock_voice") {
      await unlockDraftVoice({
        draftId: id,
        userId: user.id,
      });
      const media = await readMediaPipelineState({
        draftId: id,
        userId: user.id,
        includeSuggestions: true,
      });

      return NextResponse.json({ media });
    }

    if (action === "select_scene_asset") {
      const assetId =
        typeof payload.assetId === "string" ? payload.assetId : "";
      const sceneIndex =
        typeof payload.sceneIndex === "number" ? payload.sceneIndex : 1;

      if (!assetId) {
        console.error("[Media Pipeline API] POST validation failed", {
          draftId: id,
          body: summarizeMediaBody(payload),
          validation: "assetId.required",
        });
        return NextResponse.json(
          {
            error: "assetId est requis.",
            details: {
              body: summarizeMediaBody(payload),
              validation: "assetId.required",
              draftId: id,
            },
          },
          { status: 400 },
        );
      }

      const media = await selectDraftVisualSceneAsset({
        assetId,
        draftId: id,
        sceneIndex,
        userId: user.id,
      });

      return NextResponse.json({ media });
    }

    if (action === "select_asset" || action === "replace_asset" || action === "remove_asset") {
      const assetId =
        typeof payload.assetId === "string" ? payload.assetId : "";
      const usageOrder =
        typeof payload.usageOrder === "number" ? payload.usageOrder : 1;

      if (!assetId) {
        console.error("[Media Pipeline API] POST validation failed", {
          draftId: id,
          body: summarizeMediaBody(payload),
          validation: "assetId.required",
        });
        return NextResponse.json(
          {
            error: "assetId est requis.",
            details: {
              body: summarizeMediaBody(payload),
              validation: "assetId.required",
              draftId: id,
            },
          },
          { status: 400 },
        );
      }

      if (action === "remove_asset") {
        const media = await removeDraftVisualAsset({
          draftId: id,
          userId: user.id,
          assetId,
        });

        return NextResponse.json({ media });
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
      {
        error: "Action media inconnue.",
        details: {
          body: summarizeMediaBody(payload),
          validation: "action.unknown",
        },
      },
      { status: 400 },
    );
  } catch (error) {
    console.error("[Media Pipeline API] POST failed", mediaErrorPayload(error, payload));
    return NextResponse.json(
      mediaErrorPayload(error, payload),
      { status: 400 },
    );
  }
}
