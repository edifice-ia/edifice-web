import { getOAuthToken } from "@/lib/server/oauth/token-store";

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

type InstagramProfileResponse = {
  id?: string;
  username?: string;
  followers_count?: number;
  media_count?: number;
  error?: MetaGraphError;
};

function getGraphVersion() {
  return process.env.INSTAGRAM_GRAPH_VERSION?.trim() || "v19.0";
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

function buildProfileResponse(options: {
  ok: boolean;
  metaTokenFound: boolean;
  accountsRequestSucceeded: boolean;
  profileRequestSucceeded: boolean;
  graphVersion: string;
  sourcePage?: MetaPageAccount | null;
  profile?: InstagramProfileResponse | null;
  error?: MetaGraphError | null;
}) {
  return {
    ok: options.ok,
    provider: "instagram",
    token: {
      present: options.metaTokenFound,
      storageEnabled: true,
      storageMode: "supabase",
    },
    graphVersion: options.graphVersion,
    diagnostic: {
      accountsRequestSucceeded: options.accountsRequestSucceeded,
      profileRequestSucceeded: options.profileRequestSucceeded,
      sourcePage: options.sourcePage
        ? {
            id: options.sourcePage.id ?? null,
            name: options.sourcePage.name ?? null,
          }
        : null,
      instagramBusinessAccount: options.sourcePage?.instagram_business_account
        ? {
            id: options.sourcePage.instagram_business_account.id ?? null,
            username:
              options.sourcePage.instagram_business_account.username ?? null,
          }
        : null,
      error: sanitizeGraphError(options.error) ?? null,
    },
    profile: options.profile
      ? {
          id: options.profile.id ?? null,
          username: options.profile.username ?? null,
          followers_count: options.profile.followers_count ?? null,
          media_count: options.profile.media_count ?? null,
        }
      : null,
  };
}

export async function GET() {
  const graphVersion = getGraphVersion();
  const metaToken = await getOAuthToken("meta");
  const metaTokenFound = Boolean(metaToken?.accessToken);

  console.info("[Instagram Profile] Meta token found yes/no", {
    found: metaTokenFound,
  });

  if (!metaToken?.accessToken) {
    return Response.json(
      buildProfileResponse({
        ok: false,
        metaTokenFound: false,
        accountsRequestSucceeded: false,
        profileRequestSucceeded: false,
        graphVersion,
        error: {
          message: "No Meta OAuth token found in Supabase token store.",
          type: "missing_meta_token",
        },
      }),
      { status: 401 },
    );
  }

  const accountsUrl = new URL(
    `https://graph.facebook.com/${graphVersion}/me/accounts`,
  );
  accountsUrl.searchParams.set(
    "fields",
    "id,name,instagram_business_account{id,username}",
  );
  accountsUrl.searchParams.set("access_token", metaToken.accessToken);

  try {
    const accountsResponse = await fetch(accountsUrl, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      cache: "no-store",
    });
    const accountsPayload =
      (await accountsResponse.json()) as MetaAccountsResponse;
    const accountsRequestSucceeded =
      accountsResponse.ok && !accountsPayload.error;

    if (!accountsRequestSucceeded) {
      return Response.json(
        buildProfileResponse({
          ok: false,
          metaTokenFound,
          accountsRequestSucceeded: false,
          profileRequestSucceeded: false,
          graphVersion,
          error: accountsPayload.error ?? {
            message: "Meta Graph /me/accounts request failed.",
            type: "graph_accounts_error",
            code: accountsResponse.status,
          },
        }),
        { status: accountsResponse.ok ? 500 : accountsResponse.status },
      );
    }

    const sourcePage =
      accountsPayload.data?.find((page) =>
        Boolean(page.instagram_business_account?.id),
      ) ?? null;
    const instagramBusinessAccountId =
      sourcePage?.instagram_business_account?.id;

    if (!sourcePage || !instagramBusinessAccountId) {
      return Response.json(
        buildProfileResponse({
          ok: false,
          metaTokenFound,
          accountsRequestSucceeded: true,
          profileRequestSucceeded: false,
          graphVersion,
          error: {
            message:
              "No Instagram Business account found on returned Facebook pages.",
            type: "missing_instagram_business_account",
          },
        }),
        { status: 404 },
      );
    }

    const profileUrl = new URL(
      `https://graph.facebook.com/${graphVersion}/${instagramBusinessAccountId}`,
    );
    profileUrl.searchParams.set(
      "fields",
      "id,username,followers_count,media_count",
    );
    profileUrl.searchParams.set("access_token", metaToken.accessToken);

    const profileResponse = await fetch(profileUrl, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      cache: "no-store",
    });
    const profilePayload =
      (await profileResponse.json()) as InstagramProfileResponse;
    const profileRequestSucceeded =
      profileResponse.ok && !profilePayload.error;

    if (!profileRequestSucceeded) {
      return Response.json(
        buildProfileResponse({
          ok: false,
          metaTokenFound,
          accountsRequestSucceeded: true,
          profileRequestSucceeded: false,
          graphVersion,
          sourcePage,
          error: profilePayload.error ?? {
            message: "Instagram Graph profile request failed.",
            type: "instagram_profile_error",
            code: profileResponse.status,
          },
        }),
        { status: profileResponse.ok ? 500 : profileResponse.status },
      );
    }

    return Response.json(
      buildProfileResponse({
        ok: true,
        metaTokenFound,
        accountsRequestSucceeded: true,
        profileRequestSucceeded: true,
        graphVersion,
        sourcePage,
        profile: profilePayload,
      }),
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unknown Instagram profile request error";

    console.error("[Instagram Profile] request exception", { message });

    return Response.json(
      buildProfileResponse({
        ok: false,
        metaTokenFound,
        accountsRequestSucceeded: false,
        profileRequestSucceeded: false,
        graphVersion,
        error: {
          message,
          type: "request_error",
        },
      }),
      { status: 500 },
    );
  }
}
