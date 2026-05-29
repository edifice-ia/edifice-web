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
  tasks?: string[];
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

type SafePageDiagnostic = {
  id: string | null;
  name: string | null;
  tasks: string[] | null;
  instagram_business_account_present: boolean;
  instagram_business_account_id: string | null;
  instagram_business_account_username: string | null;
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

function toPageDiagnostic(page: MetaPageAccount): SafePageDiagnostic {
  return {
    id: page.id ?? null,
    name: page.name ?? null,
    tasks: Array.isArray(page.tasks) ? page.tasks : null,
    instagram_business_account_present: Boolean(
      page.instagram_business_account?.id,
    ),
    instagram_business_account_id:
      page.instagram_business_account?.id ?? null,
    instagram_business_account_username:
      page.instagram_business_account?.username ?? null,
  };
}

function buildDiagnostic(options: {
  metaTokenFound: boolean;
  graphApiSucceeded: boolean;
  facebookPageFound: boolean;
  instagramBusinessAccountFound: boolean;
  graphVersion: string;
  pages?: MetaPageAccount[];
  metaError?: MetaGraphError | null;
  warnings?: string[];
}) {
  const pages = options.pages ?? [];
  const pagesCount = pages.length;

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
      pages_count: pagesCount,
      pages: pages.map(toPageDiagnostic),
      metaError: sanitizeGraphError(options.metaError) ?? null,
      warnings: options.warnings ?? [],
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
    "id,name,tasks,instagram_business_account{id,username}",
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
    const pages = payload.data ?? [];
    const pagesCount = pages.length;
    const facebookPageFound = pagesCount > 0;
    const instagramBusinessAccountFound = pages.some((page) =>
      Boolean(page.instagram_business_account?.id),
    );
    const warnings = [
      ...(pagesCount === 0
        ? [
            "Aucune page Facebook retournée. Vérifier permissions pages_show_list et compte Facebook utilisé.",
          ]
        : []),
      ...(pagesCount > 0 && !instagramBusinessAccountFound
        ? [
            "Page Facebook trouvée mais aucun compte Instagram Business associé.",
          ]
        : []),
    ];

    console.info("[Instagram Status] Graph API result", {
      graphApiSucceeded,
      pagesCount,
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
          pages: [],
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
        pages,
        metaError: null,
        warnings,
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
