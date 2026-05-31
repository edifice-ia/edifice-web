import { stat, readFile } from "node:fs/promises";
import { join } from "node:path";
import { getOAuthToken } from "@/lib/server/oauth/token-store";

export const runtime = "nodejs";

const TIKTOK_INBOX_UPLOAD_INIT_URL =
  "https://open.tiktokapis.com/v2/post/publish/inbox/video/init/";
const DEFAULT_TEST_VIDEO_FILENAME = "tiktok-sandbox-test.mp4";

type TikTokUploadInitPayload = {
  data?: {
    publish_id?: string;
    upload_url?: string;
  };
  error?: {
    code?: string;
    message?: string;
    log_id?: string;
  };
};

type UploadTestResult =
  | {
      ok: true;
      status: "upload_sandbox_succeeded" | "upload_sandbox_initialized";
      label: string;
      publishId: string | null;
      transferMode: "FILE_UPLOAD" | "PULL_FROM_URL";
      logs: string[];
    }
  | {
      ok: false;
      status:
        | "missing_token"
        | "token_expired"
        | "missing_test_video"
        | "tiktok_init_failed"
        | "tiktok_upload_failed"
        | "unexpected_error";
      label: string;
      logs: string[];
      error?: {
        code?: string;
        message?: string;
        logId?: string;
      };
    };

function jsonResponse(result: UploadTestResult, init?: ResponseInit) {
  return Response.json(result, init);
}

function isExpired(expiresAt: string | null) {
  if (!expiresAt) {
    return false;
  }

  const expiresAtTime = new Date(expiresAt).getTime();

  return Number.isFinite(expiresAtTime) && expiresAtTime <= Date.now();
}

function getTestVideoPath() {
  return join(process.cwd(), "public", DEFAULT_TEST_VIDEO_FILENAME);
}

async function initUpload(options: {
  accessToken: string;
  body: Record<string, unknown>;
}) {
  const response = await fetch(TIKTOK_INBOX_UPLOAD_INIT_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${options.accessToken}`,
      "Content-Type": "application/json; charset=UTF-8",
    },
    body: JSON.stringify(options.body),
    cache: "no-store",
  });
  const payload = (await response.json()) as TikTokUploadInitPayload;

  console.info("[TikTok Init]", {
    status: response.status,
    body: payload,
    upload_url: payload.data?.upload_url ?? null,
    publish_id: payload.data?.publish_id ?? null,
    error: {
      code: payload.error?.code ?? null,
      message: payload.error?.message ?? null,
    },
  });

  if (!response.ok || payload.error?.code || !payload.data?.publish_id) {
    return {
      ok: false as const,
      status: response.status,
      payload,
    };
  }

  return {
    ok: true as const,
    payload,
  };
}

async function uploadLocalVideo(accessToken: string) {
  const testVideoPath = getTestVideoPath();
  const videoStat = await stat(testVideoPath);

  if (!videoStat.isFile() || videoStat.size <= 0) {
    throw new Error("missing_test_video");
  }

  const videoBuffer = await readFile(testVideoPath);
  const videoSize = videoBuffer.byteLength;

  console.info("[TikTok Sandbox Upload] init FILE_UPLOAD", {
    videoSize,
  });

  const initResult = await initUpload({
    accessToken,
    body: {
      source_info: {
        source: "FILE_UPLOAD",
        video_size: videoSize,
        chunk_size: videoSize,
        total_chunk_count: 1,
      },
    },
  });

  if (!initResult.ok || !initResult.payload.data?.upload_url) {
    return {
      ok: false as const,
      reason: "tiktok_init_failed" as const,
      payload: initResult.payload,
    };
  }

  const uploadResponse = await fetch(initResult.payload.data.upload_url, {
    method: "PUT",
    headers: {
      "Content-Type": "video/mp4",
      "Content-Length": String(videoSize),
      "Content-Range": `bytes 0-${videoSize - 1}/${videoSize}`,
    },
    body: new Uint8Array(videoBuffer),
    cache: "no-store",
  });

  if (!uploadResponse.ok) {
    return {
      ok: false as const,
      reason: "tiktok_upload_failed" as const,
      status: uploadResponse.status,
      payload: initResult.payload,
    };
  }

  return {
    ok: true as const,
    publishId: initResult.payload.data.publish_id ?? null,
  };
}

async function uploadFromVerifiedUrl(accessToken: string, videoUrl: string) {
  console.info("[TikTok Sandbox Upload] init PULL_FROM_URL");

  const initResult = await initUpload({
    accessToken,
    body: {
      source_info: {
        source: "PULL_FROM_URL",
        video_url: videoUrl,
      },
    },
  });

  if (!initResult.ok) {
    return {
      ok: false as const,
      reason: "tiktok_init_failed" as const,
      payload: initResult.payload,
    };
  }

  return {
    ok: true as const,
    publishId: initResult.payload.data?.publish_id ?? null,
  };
}

function sanitizeTikTokError(payload?: TikTokUploadInitPayload) {
  return {
    code: payload?.error?.code,
    message: payload?.error?.message,
    logId: payload?.error?.log_id,
  };
}

export async function POST() {
  console.info("[TikTok Sandbox Upload] request received");

  try {
    const token = await getOAuthToken("tiktok");
    const logs = [
      "Token TikTok lu cote serveur.",
      "Aucun token ni secret expose dans la reponse.",
    ];

    if (!token?.accessToken) {
      console.warn("[TikTok Sandbox Upload] token missing");
      return jsonResponse(
        {
          ok: false,
          status: "missing_token",
          label: "Token TikTok Sandbox manquant.",
          logs,
        },
        { status: 409 },
      );
    }

    if (isExpired(token.expiresAt)) {
      console.warn("[TikTok Sandbox Upload] token expired");
      return jsonResponse(
        {
          ok: false,
          status: "token_expired",
          label: "Token TikTok Sandbox expire.",
          logs: [...logs, "Reconnexion TikTok Sandbox requise avant test."],
        },
        { status: 409 },
      );
    }

    if (token.scope && !token.scope.split(/[\s,]+/).includes("video.upload")) {
      console.warn("[TikTok Sandbox Upload] missing video.upload scope");
      return jsonResponse(
        {
          ok: false,
          status: "tiktok_init_failed",
          label: "Le token TikTok Sandbox ne contient pas le scope video.upload.",
          logs: [
            ...logs,
            "Reconnecte TikTok Sandbox avec le scope video.upload avant le test.",
          ],
          error: {
            code: "scope_not_authorized",
            message: "video.upload scope missing",
          },
        },
        { status: 409 },
      );
    }

    const pullFromUrl = process.env.TIKTOK_SANDBOX_TEST_VIDEO_URL?.trim();

    if (pullFromUrl) {
      const result = await uploadFromVerifiedUrl(token.accessToken, pullFromUrl);

      if (!result.ok) {
        console.warn("[TikTok Sandbox Upload] init failed", {
          code: result.payload.error?.code,
          logId: result.payload.error?.log_id,
        });

        return jsonResponse(
          {
            ok: false,
            status: result.reason,
            label: "Initialisation upload TikTok Sandbox echouee.",
            logs: [...logs, "Mode PULL_FROM_URL utilise."],
            error: sanitizeTikTokError(result.payload),
          },
          { status: 502 },
        );
      }

      console.info("[TikTok Sandbox Upload] initialized from URL", {
        publishIdPresent: Boolean(result.publishId),
      });

      return jsonResponse({
        ok: true,
        status: "upload_sandbox_initialized",
        label: "Upload Sandbox initialise depuis une URL verifiee.",
        publishId: result.publishId,
        transferMode: "PULL_FROM_URL",
        logs: [
          ...logs,
          "Mode PULL_FROM_URL utilise.",
          "TikTok recupere la video depuis l'URL serveur configuree.",
        ],
      });
    }

    try {
      const result = await uploadLocalVideo(token.accessToken);

      if (!result.ok) {
        console.warn("[TikTok Sandbox Upload] upload failed", {
          reason: result.reason,
          code: result.payload.error?.code,
          logId: result.payload.error?.log_id,
          status: "status" in result ? result.status : undefined,
        });

        return jsonResponse(
          {
            ok: false,
            status: result.reason,
            label:
              result.reason === "tiktok_upload_failed"
                ? "Envoi du fichier video vers TikTok echoue."
                : "Initialisation upload TikTok Sandbox echouee.",
            logs: [...logs, "Mode FILE_UPLOAD utilise."],
            error: sanitizeTikTokError(result.payload),
          },
          { status: 502 },
        );
      }

      console.info("[TikTok Sandbox Upload] upload completed", {
        publishIdPresent: Boolean(result.publishId),
      });

      return jsonResponse({
        ok: true,
        status: "upload_sandbox_succeeded",
        label: "Upload Sandbox reussi.",
        publishId: result.publishId,
        transferMode: "FILE_UPLOAD",
        logs: [
          ...logs,
          "Mode FILE_UPLOAD utilise.",
          "Video de test envoyee vers TikTok Sandbox.",
        ],
      });
    } catch (fileError) {
      if (
        fileError instanceof Error &&
        (fileError.message === "missing_test_video" ||
          "code" in fileError ||
          fileError.name === "Error")
      ) {
        console.warn("[TikTok Sandbox Upload] test video missing");
        return jsonResponse(
          {
            ok: false,
            status: "missing_test_video",
            label:
              "Video de test manquante. Ajoute public/tiktok-sandbox-test.mp4 ou configure TIKTOK_SANDBOX_TEST_VIDEO_URL.",
            logs,
          },
          { status: 409 },
        );
      }

      throw fileError;
    }
  } catch (error) {
    console.error("[TikTok Sandbox Upload] unexpected error", {
      message: error instanceof Error ? error.message : "unknown",
    });

    return jsonResponse(
      {
        ok: false,
        status: "unexpected_error",
        label: "Erreur inattendue pendant le test upload TikTok Sandbox.",
        logs: ["Erreur serveur sans exposition de secret."],
      },
      { status: 500 },
    );
  }
}
