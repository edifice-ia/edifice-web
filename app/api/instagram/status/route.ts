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
  paging?: unknown;
};

function getGraphVersion() {
  return process.env.INSTAGRAM_GRAPH_VERSION?.trim() || "v19.0";
}

function buildDiagnostic(options: {
  metaTokenFound: boolean;
  graphApiSucceeded: boolean;
  facebookPageFound: boolean;
  instagramBusinessAccountFound: boolean;
  graphVersion: string;
  page?: MetaPageAccount | null;
  metaError?: MetaGraphError | null;
}) {
  return {
    provider: "instagram",
    configured: options.metaTokenFound && options.graphApiSucceeded,
    mode: "review",
    token: {
      present: options.metaTokenFound,
      storageEnabled: true,
      storageMode: "supabase",
    },
    diagnostic: {
      metaTokenFound: options.metaTokenFound,
      graphApiSucceeded: options.graphApiSucceeded,
      facebookPageFound: options.facebookPageFound,
      instagramBusinessAccountFound:
        options.instagramBusinessAccountFound,
      graphVersion: options.graphVersion,
      page: options.page
        ? {
            id: options.page.id ?? null,
            name: options.page.name ?? null,
          }
        : null,
      instagramBusinessAccount: options.page?.instagram_business_account
        ? {
            id: options.page.instagram_business_account.id ?? null,
            username:
              options.page.instagram_business_account.username ?? null,
          }
        : null,
      metaError: options.metaError ?? null,
    },
  };
}

export async function GET() {
  const graphVersion = getGraphVersion();
  const metaToken = await getOAuthToken("meta");
  const metaTokenFound = Boolean(metaToken?.accessToken);

  console.info("[Instagram Status] Meta token found yes/no", {
    found: metaTokenFound,
  });

  if (!metaToken?.accessToken) {
    return Response.json(
      buildDiagnostic({
        metaTokenFound: false,
        graphApiSucceeded: false,
        facebookPageFound: false,
        instagramBusinessAccountFound: false,
        graphVersion,
        metaError: {
          message: "No Meta OAuth token found in Supabase token store.",
          type: "missing_meta_token",
        },
      }),
      { status: 401 },
    );
  }

  const graphUrl = new URL(
    `https://graph.facebook.com/${graphVersion}/me/accounts`,
  );
  graphUrl.searchParams.set(
    "fields",
    "id,name,instagram_business_account{id,username}",
  );
  graphUrl.searchParams.set("access_token", metaToken.accessToken);

  console.info("[Instagram Status] Graph API request started", {
    graphVersion,
  });

  try {
    const response = await fetch(graphUrl, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      cache: "no-store",
    });
    const payload = (await response.json()) as MetaAccountsResponse;
    const graphApiSucceeded = response.ok && !payload.error;
    const page =
      payload.data?.find((item) => item.instagram_business_account) ??
      payload.data?.[0] ??
      null;
    const facebookPageFound = Boolean(page?.id);
    const instagramBusinessAccountFound = Boolean(
      page?.instagram_business_account?.id,
    );

    console.info("[Instagram Status] Graph API result", {
      graphApiSucceeded,
      facebookPageFound,
      instagramBusinessAccountFound,
    });

    if (!graphApiSucceeded) {
      return Response.json(
        buildDiagnostic({
          metaTokenFound,
          graphApiSucceeded: false,
          facebookPageFound: false,
          instagramBusinessAccountFound: false,
          graphVersion,
          metaError: payload.error ?? {
            message: "Meta Graph API request failed.",
            type: "graph_api_error",
            code: response.status,
          },
        }),
        { status: response.ok ? 500 : response.status },
      );
    }

    return Response.json(
      buildDiagnostic({
        metaTokenFound,
        graphApiSucceeded: true,
        facebookPageFound,
        instagramBusinessAccountFound,
        graphVersion,
        page,
        metaError: instagramBusinessAccountFound
          ? null
          : {
              message:
                "No Instagram Business account was associated with the returned Facebook pages.",
              type: "missing_instagram_business_account",
            },
      }),
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unknown Instagram Graph API request error";

    console.error("[Instagram Status] Graph API request exception", {
      message,
    });

    return Response.json(
      buildDiagnostic({
        metaTokenFound,
        graphApiSucceeded: false,
        facebookPageFound: false,
        instagramBusinessAccountFound: false,
        graphVersion,
        metaError: {
          message,
          type: "request_error",
        },
      }),
      { status: 500 },
    );
  }
}
