import { NextResponse } from "next/server";
import { getOAuthToken } from "@/lib/server/oauth/token-store";
import {
  getYouTubeChannel,
  sanitizeYouTubeError,
} from "@/lib/server/youtube/youtube-api";
import {
  YOUTUBE_UPLOAD_SCOPE,
  buildYouTubeScopeDiagnostic,
  ensureYouTubeAccessToken,
  readYouTubeGrantedScopes,
} from "@/lib/server/youtube/youtube-oauth";
import { canAccessPrivateCockpit } from "@/src/lib/auth/roles";
import { getCurrentUser } from "@/src/lib/supabase/server";

export const runtime = "nodejs";

const TEST_VIDEO_FILENAME = "tiktok-sandbox-test.mp4";
const TEST_TITLE = "Test YouTube Upload depuis L’Édifice IA";
const TEST_DESCRIPTION =
  "Vidéo de test privée pour valider l'upload YouTube API depuis L’Édifice IA.";
const YOUTUBE_UPLOAD_INIT_URL =
  "https://www.googleapis.com/upload/youtube/v3/videos";

type YouTubeUploadResponse = {
  id?: string;
  status?: {
    privacyStatus?: string;
  };
  snippet?: {
    title?: string;
  };
  error?: unknown;
};

function getPublicAppUrl() {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.APP_URL?.trim() ||
    "https://www.edificeia.com"
  ).replace(/\/$/, "");
}

function getTestVideoUrl() {
  return `${getPublicAppUrl()}/${TEST_VIDEO_FILENAME}`;
}

async function prepareTestVideo(videoUrl: string) {
  const response = await fetch(videoUrl, {
    method: "GET",
    cache: "no-store",
  });

  if (!response.ok) {
    return {
      ok: false as const,
      error: {
        code: "video_test_unreachable",
        message: "Video test publique introuvable ou inaccessible.",
      },
    };
  }

  const contentType = response.headers.get("content-type") ?? "video/mp4";
  const bytes = await response.arrayBuffer();

  if (bytes.byteLength <= 0) {
    return {
      ok: false as const,
      error: {
        code: "video_test_empty",
        message: "Video test vide.",
      },
    };
  }

  console.info("[YouTube Upload Test] video prepared", {
    size: bytes.byteLength,
    contentType,
  });

  return {
    ok: true as const,
    bytes,
    contentType,
    size: bytes.byteLength,
  };
}

async function uploadPrivateVideo(options: {
  accessToken: string;
  bytes: ArrayBuffer;
  contentType: string;
}) {
  const uploadUrl = new URL(YOUTUBE_UPLOAD_INIT_URL);
  uploadUrl.searchParams.set("part", "snippet,status");
  uploadUrl.searchParams.set("uploadType", "resumable");

  const metadata = {
    snippet: {
      title: TEST_TITLE,
      description: TEST_DESCRIPTION,
      categoryId: "22",
    },
    status: {
      privacyStatus: "private",
      selfDeclaredMadeForKids: false,
    },
  };

  console.info("[YouTube Upload Test] upload started");

  const initResponse = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${options.accessToken}`,
      "Content-Type": "application/json; charset=UTF-8",
      "X-Upload-Content-Length": String(options.bytes.byteLength),
      "X-Upload-Content-Type": options.contentType,
    },
    body: JSON.stringify(metadata),
    cache: "no-store",
  });

  if (!initResponse.ok) {
    const payload = await initResponse.json().catch(() => null);

    return {
      ok: false as const,
      status: initResponse.status,
      error: sanitizeYouTubeError(payload, initResponse.status),
    };
  }

  const sessionUrl = initResponse.headers.get("location");

  if (!sessionUrl) {
    return {
      ok: false as const,
      status: 502,
      error: {
        code: "missing_upload_session",
        message: "YouTube n'a pas retourne d'URL de session upload.",
      },
    };
  }

  const uploadResponse = await fetch(sessionUrl, {
    method: "PUT",
    headers: {
      "Content-Length": String(options.bytes.byteLength),
      "Content-Type": options.contentType,
    },
    body: options.bytes,
    cache: "no-store",
  });
  const payload = (await uploadResponse.json().catch(() => null)) as
    | YouTubeUploadResponse
    | null;

  if (!uploadResponse.ok || !payload?.id) {
    return {
      ok: false as const,
      status: uploadResponse.status,
      error: sanitizeYouTubeError(payload, uploadResponse.status),
    };
  }

  console.info("[YouTube Upload Test] upload success", {
    videoId: payload.id,
    privacyStatus: payload.status?.privacyStatus ?? "private",
  });

  return {
    ok: true as const,
    videoId: payload.id,
    title: payload.snippet?.title ?? TEST_TITLE,
    privacyStatus: payload.status?.privacyStatus ?? "private",
    url: `https://studio.youtube.com/video/${payload.id}/edit`,
  };
}

export async function POST() {
  const user = await getCurrentUser();

  if (!user || !canAccessPrivateCockpit(user)) {
    return NextResponse.json({ error: "Acces refuse." }, { status: 403 });
  }

  const token = await getOAuthToken("youtube");
  const tokenState = await ensureYouTubeAccessToken(token);
  const baseLogs = tokenState.logs;

  if (!tokenState.ok) {
    console.warn("[YouTube Upload Test] upload failed", tokenState.error);
    return NextResponse.json(
      {
        ok: false,
        status: tokenState.status,
        logs: tokenState.logs,
        error: tokenState.error,
      },
      { status: tokenState.status === "missing_token" ? 401 : 409 },
    );
  }

  const tokenInfo = await readYouTubeGrantedScopes(tokenState.accessToken);
  const grantedScopes =
    tokenInfo.scopes ?? tokenState.token.scope?.split(/[\s,]+/).filter(Boolean) ?? [];
  const scopeDiagnostic = {
    ...buildYouTubeScopeDiagnostic(grantedScopes),
    source: tokenInfo.source,
    isValid: tokenInfo.isValid,
    expiresAt: tokenInfo.expiresAt,
    error: tokenInfo.error,
  };

  if (!grantedScopes.includes(YOUTUBE_UPLOAD_SCOPE)) {
    return NextResponse.json(
      {
        ok: false,
        status: "missing_scope",
        logs: baseLogs,
        scopes: scopeDiagnostic,
        error: {
          code: "missing_youtube_upload_scope",
          message:
            "Reconnecte YouTube avec le scope youtube.upload avant le test.",
        },
      },
      { status: 409 },
    );
  }

  const channel = await getYouTubeChannel(tokenState.accessToken);

  if (!channel.ok) {
    console.warn("[YouTube Upload Test] upload failed", channel.error);
    return NextResponse.json(
      {
        ok: false,
        status: "missing_channel",
        logs: [...baseLogs, "Chaine YouTube introuvable."],
        scopes: scopeDiagnostic,
        error: channel.error,
      },
      { status: 404 },
    );
  }

  console.info("[YouTube Upload Test] channel detected", {
    channelId: channel.channelId,
    channelTitle: channel.channelTitle,
  });

  const videoUrl = getTestVideoUrl();
  const video = await prepareTestVideo(videoUrl);

  if (!video.ok) {
    console.warn("[YouTube Upload Test] upload failed", video.error);
    return NextResponse.json(
      {
        ok: false,
        status: "video_test_unavailable",
        videoUrl,
        logs: [
          ...baseLogs,
          "Chaine YouTube detectee.",
          "Video test introuvable.",
        ],
        scopes: scopeDiagnostic,
        channel: {
          detected: true,
          id: channel.channelId,
          title: channel.channelTitle,
        },
        error: video.error,
      },
      { status: 409 },
    );
  }

  const upload = await uploadPrivateVideo({
    accessToken: tokenState.accessToken,
    bytes: video.bytes,
    contentType: video.contentType,
  });

  if (!upload.ok) {
    console.warn("[YouTube Upload Test] upload failed", upload.error);
    return NextResponse.json(
      {
        ok: false,
        status: "upload_failed",
        videoUrl,
        logs: [
          ...baseLogs,
          "Chaine YouTube detectee.",
          "Video test preparee.",
          "Upload YouTube en cours.",
          "Upload YouTube echoue.",
        ],
        scopes: scopeDiagnostic,
        channel: {
          detected: true,
          id: channel.channelId,
          title: channel.channelTitle,
        },
        error: upload.error,
      },
      { status: upload.status },
    );
  }

  return NextResponse.json({
    ok: true,
    status: "uploaded",
    success: true,
    videoId: upload.videoId,
    title: upload.title,
    privacyStatus: upload.privacyStatus,
    url: upload.url,
    videoUrl,
    logs: [
      ...baseLogs,
      "Token YouTube lu cote serveur.",
      "Chaine YouTube detectee.",
      "Video test preparee.",
      "Upload YouTube en cours.",
      "Upload YouTube reussi.",
    ],
    scopes: scopeDiagnostic,
    channel: {
      detected: true,
      id: channel.channelId,
      title: channel.channelTitle,
    },
    message: "Video YouTube privee creee avec succes.",
  });
}
