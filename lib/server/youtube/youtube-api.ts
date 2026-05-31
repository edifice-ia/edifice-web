import "server-only";

type YouTubeApiError = {
  error?: {
    code?: number;
    message?: string;
    errors?: Array<{
      reason?: string;
      message?: string;
    }>;
  };
};

type YouTubeChannelsResponse = YouTubeApiError & {
  items?: Array<{
    id?: string;
    snippet?: {
      title?: string;
    };
  }>;
};

export type YouTubeChannelDiagnostic =
  | {
      ok: true;
      channelDetected: true;
      channelId: string;
      channelTitle: string;
    }
  | {
      ok: false;
      channelDetected: false;
      error: {
        code?: string | number;
        message: string;
      };
    };

export function sanitizeYouTubeError(payload: unknown, fallbackStatus?: number) {
  if (!payload || typeof payload !== "object") {
    return {
      code: fallbackStatus,
      message: "YouTube API request failed.",
    };
  }

  const record = payload as YouTubeApiError;
  const firstReason = record.error?.errors?.[0]?.reason;

  return {
    code: firstReason ?? record.error?.code ?? fallbackStatus,
    message:
      record.error?.message ??
      record.error?.errors?.[0]?.message ??
      "YouTube API request failed.",
  };
}

export async function getYouTubeChannel(
  accessToken: string,
): Promise<YouTubeChannelDiagnostic> {
  const url = new URL("https://www.googleapis.com/youtube/v3/channels");
  url.searchParams.set("part", "snippet");
  url.searchParams.set("mine", "true");

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    cache: "no-store",
  });
  const payload = (await response.json()) as YouTubeChannelsResponse;

  if (!response.ok || payload.error) {
    return {
      ok: false,
      channelDetected: false,
      error: sanitizeYouTubeError(payload, response.status),
    };
  }

  const channel = payload.items?.[0];

  if (!channel?.id) {
    return {
      ok: false,
      channelDetected: false,
      error: {
        code: "missing_channel",
        message: "Chaine YouTube introuvable pour ce token.",
      },
    };
  }

  return {
    ok: true,
    channelDetected: true,
    channelId: channel.id,
    channelTitle: channel.snippet?.title ?? "Chaine YouTube",
  };
}
