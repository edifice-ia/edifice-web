import { NextResponse } from "next/server";
import { getActiveMetaScopes } from "@/lib/oauth/meta";
import { getOAuthToken } from "@/lib/server/oauth/token-store";
import { canAccessPrivateCockpit } from "@/src/lib/auth/roles";
import { getCurrentUser } from "@/src/lib/supabase/server";

export const runtime = "nodejs";

const TEST_VIDEO_FILENAME = "tiktok-sandbox-test.mp4";
const TEST_CAPTION = "Test Instagram Publish depuis L’Édifice IA.";
const POLL_ATTEMPTS = 8;
const POLL_DELAY_MS = 3000;

type MetaGraphError = {
  message?: string;
  type?: string;
  code?: number;
  error_subcode?: number;
  fbtrace_id?: string;
  [key: string]: unknown;
};

type MetaPageAccount = {
  id?: string;
  name?: string;
  instagram_business_account?: {
    id?: string;
    username?: string;
  };
};

type MetaAccountsResponse = {
  data?: MetaPageAccount[];
  error?: MetaGraphError;
};

type MediaContainerResponse = {
  id?: string;
  creation_id?: string;
  error?: MetaGraphError;
};

type ContainerStatusResponse = {
  status_code?: string;
  status?: string;
  error?: MetaGraphError;
};

type PublishResponse = {
  id?: string;
  error?: MetaGraphError;
};

function getGraphVersion() {
  return process.env.INSTAGRAM_GRAPH_VERSION?.trim() || "v23.0";
}

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

function splitScopes(scope: string | null) {
  return scope?.split(/[\s,]+/).filter(Boolean) ?? [];
}

function sanitizeGraphError(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeGraphError(item));
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => {
      const normalizedKey = key.toLowerCase();

      if (
        normalizedKey.includes("access_token") ||
        normalizedKey.includes("refresh_token") ||
        normalizedKey === "token"
      ) {
        return [key, "[redacted]"];
      }

      return [key, sanitizeGraphError(entry)];
    }),
  );
}

function safeGraphError(payload?: { error?: MetaGraphError }, status?: number) {
  return sanitizeGraphError(
    payload?.error ?? {
      code: status,
      message: "Meta Graph API request failed.",
    },
  );
}

function wait(milliseconds: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

async function isPublicVideoReachable(videoUrl: string) {
  const headResponse = await fetch(videoUrl, {
    method: "HEAD",
    cache: "no-store",
  });

  if (headResponse.ok) {
    return true;
  }

  const getResponse = await fetch(videoUrl, {
    method: "GET",
    headers: {
      Range: "bytes=0-0",
    },
    cache: "no-store",
  });

  return getResponse.ok || getResponse.status === 206;
}

async function findInstagramBusinessAccount(options: {
  graphVersion: string;
  accessToken: string;
}) {
  const accountsUrl = new URL(
    `https://graph.facebook.com/${options.graphVersion}/me/accounts`,
  );
  accountsUrl.searchParams.set(
    "fields",
    "id,name,instagram_business_account{id,username}",
  );
  accountsUrl.searchParams.set("access_token", options.accessToken);

  const response = await fetch(accountsUrl, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
    cache: "no-store",
  });
  const payload = (await response.json()) as MetaAccountsResponse;

  if (!response.ok || payload.error) {
    return {
      ok: false as const,
      status: response.status,
      error: safeGraphError(payload, response.status),
    };
  }

  const page =
    payload.data?.find((item) =>
      Boolean(item.instagram_business_account?.id),
    ) ?? null;

  return {
    ok: true as const,
    page,
    instagramBusinessId: page?.instagram_business_account?.id ?? null,
    instagramUsername: page?.instagram_business_account?.username ?? null,
  };
}

async function createMediaContainer(options: {
  graphVersion: string;
  accessToken: string;
  instagramBusinessId: string;
  videoUrl: string;
}) {
  const endpoint = new URL(
    `https://graph.facebook.com/${options.graphVersion}/${options.instagramBusinessId}/media`,
  );
  const body = new URLSearchParams({
    media_type: "REELS",
    video_url: options.videoUrl,
    caption: TEST_CAPTION,
    access_token: options.accessToken,
  });

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
    cache: "no-store",
  });
  const payload = (await response.json()) as MediaContainerResponse;
  const creationId = payload.creation_id ?? payload.id ?? null;

  if (!response.ok || payload.error || !creationId) {
    return {
      ok: false as const,
      status: response.status,
      error: safeGraphError(payload, response.status),
    };
  }

  console.info("[Instagram Publish Test] media container created", {
    creationId,
  });

  return {
    ok: true as const,
    creationId,
  };
}

async function getContainerStatus(options: {
  graphVersion: string;
  accessToken: string;
  creationId: string;
}) {
  const endpoint = new URL(
    `https://graph.facebook.com/${options.graphVersion}/${options.creationId}`,
  );
  endpoint.searchParams.set("fields", "status_code,status");
  endpoint.searchParams.set("access_token", options.accessToken);

  const response = await fetch(endpoint, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
    cache: "no-store",
  });
  const payload = (await response.json()) as ContainerStatusResponse;

  if (!response.ok || payload.error) {
    return {
      ok: false as const,
      status: response.status,
      error: safeGraphError(payload, response.status),
    };
  }

  return {
    ok: true as const,
    statusCode: payload.status_code ?? null,
    status: payload.status ?? null,
  };
}

async function waitForContainerFinished(options: {
  graphVersion: string;
  accessToken: string;
  creationId: string;
}) {
  for (let attempt = 1; attempt <= POLL_ATTEMPTS; attempt += 1) {
    const statusResult = await getContainerStatus(options);

    if (!statusResult.ok) {
      return statusResult;
    }

    console.info("[Instagram Publish Test] container status", {
      attempt,
      statusCode: statusResult.statusCode,
      status: statusResult.status,
    });

    if (statusResult.statusCode === "FINISHED") {
      return statusResult;
    }

    if (
      statusResult.statusCode === "ERROR" ||
      statusResult.statusCode === "EXPIRED"
    ) {
      return {
        ok: false as const,
        status: 409,
        error: {
          code: statusResult.statusCode,
          message: statusResult.status ?? "Container non publiable.",
        },
      };
    }

    if (attempt < POLL_ATTEMPTS) {
      await wait(POLL_DELAY_MS);
    }
  }

  return {
    ok: false as const,
    status: 409,
    error: {
      code: "container_not_ready",
      message: "Container Instagram non pret apres polling limite.",
    },
  };
}

async function publishMedia(options: {
  graphVersion: string;
  accessToken: string;
  instagramBusinessId: string;
  creationId: string;
}) {
  const endpoint = new URL(
    `https://graph.facebook.com/${options.graphVersion}/${options.instagramBusinessId}/media_publish`,
  );
  const body = new URLSearchParams({
    creation_id: options.creationId,
    access_token: options.accessToken,
  });

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
    cache: "no-store",
  });
  const payload = (await response.json()) as PublishResponse;

  if (!response.ok || payload.error || !payload.id) {
    return {
      ok: false as const,
      status: response.status,
      error: safeGraphError(payload, response.status),
    };
  }

  console.info("[Instagram Publish Test] media published", {
    mediaId: payload.id,
  });

  return {
    ok: true as const,
    mediaId: payload.id,
  };
}

export async function POST() {
  const user = await getCurrentUser();

  if (!user || !canAccessPrivateCockpit(user)) {
    return NextResponse.json({ error: "Acces refuse." }, { status: 403 });
  }

  const graphVersion = getGraphVersion();
  const token = await getOAuthToken("meta");
  const logs = [
    "Token Meta lu cote serveur.",
    "Aucun token ni secret expose dans la reponse.",
  ];

  if (!token?.accessToken) {
    return NextResponse.json(
      {
        ok: false,
        status: "missing_meta_token",
        logs,
        error: {
          code: "missing_meta_token",
          message: "Token Meta absent.",
        },
      },
      { status: 401 },
    );
  }

  const grantedScopes = splitScopes(token.scope);

  if (!grantedScopes.includes("instagram_content_publish")) {
    return NextResponse.json(
      {
        ok: false,
        status: "missing_scope",
        logs,
        scopes: {
          expected: getActiveMetaScopes(),
          granted: grantedScopes,
          missing: ["instagram_content_publish"],
        },
        error: {
          code: "missing_instagram_content_publish",
          message:
            "Reconnecte Meta pour obtenir le scope instagram_content_publish.",
        },
      },
      { status: 409 },
    );
  }

  const videoUrl = getTestVideoUrl();

  try {
    const videoReachable = await isPublicVideoReachable(videoUrl);

    if (!videoReachable) {
      return NextResponse.json(
        {
          ok: false,
          status: "video_public_url_unreachable",
          videoUrl,
          logs,
          error: {
            code: "video_public_url_unreachable",
            message:
              "La video publique de test n'est pas accessible par URL HTTPS.",
          },
        },
        { status: 409 },
      );
    }

    const accountResult = await findInstagramBusinessAccount({
      graphVersion,
      accessToken: token.accessToken,
    });

    if (!accountResult.ok) {
      return NextResponse.json(
        {
          ok: false,
          status: "graph_accounts_error",
          videoUrl,
          logs,
          error: accountResult.error,
        },
        { status: accountResult.status },
      );
    }

    if (!accountResult.instagramBusinessId) {
      return NextResponse.json(
        {
          ok: false,
          status: "missing_instagram_business_account",
          videoUrl,
          logs,
          error: {
            code: "missing_instagram_business_account",
            message: "Aucun Instagram Business Account ID trouve.",
          },
        },
        { status: 404 },
      );
    }

    console.info("[Instagram Publish Test] config ok", {
      instagramBusinessId: accountResult.instagramBusinessId,
      instagramUsername: accountResult.instagramUsername,
      videoUrl,
    });

    const containerResult = await createMediaContainer({
      graphVersion,
      accessToken: token.accessToken,
      instagramBusinessId: accountResult.instagramBusinessId,
      videoUrl,
    });

    if (!containerResult.ok) {
      return NextResponse.json(
        {
          ok: false,
          status: "container_create_failed",
          videoUrl,
          logs,
          error: containerResult.error,
        },
        { status: containerResult.status },
      );
    }

    const readyResult = await waitForContainerFinished({
      graphVersion,
      accessToken: token.accessToken,
      creationId: containerResult.creationId,
    });

    if (!readyResult.ok) {
      return NextResponse.json(
        {
          ok: false,
          status: "container_not_ready",
          creationId: containerResult.creationId,
          videoUrl,
          logs: [...logs, "Container cree mais non pret pour publication."],
          error: readyResult.error,
        },
        { status: readyResult.status },
      );
    }

    const publishResult = await publishMedia({
      graphVersion,
      accessToken: token.accessToken,
      instagramBusinessId: accountResult.instagramBusinessId,
      creationId: containerResult.creationId,
    });

    if (!publishResult.ok) {
      return NextResponse.json(
        {
          ok: false,
          status: "publish_failed",
          creationId: containerResult.creationId,
          videoUrl,
          logs,
          error: publishResult.error,
        },
        { status: publishResult.status },
      );
    }

    return NextResponse.json({
      ok: true,
      status: "published",
      creationId: containerResult.creationId,
      mediaId: publishResult.mediaId,
      videoUrl,
      instagramBusinessId: accountResult.instagramBusinessId,
      instagramUsername: accountResult.instagramUsername,
      caption: TEST_CAPTION,
      logs: [...logs, "Publication test Instagram terminee."],
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        status: "unexpected_error",
        videoUrl,
        logs,
        error: {
          code: "unexpected_error",
          message: error instanceof Error ? error.message : "Erreur inconnue.",
        },
      },
      { status: 500 },
    );
  }
}
