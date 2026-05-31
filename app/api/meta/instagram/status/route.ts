import { NextResponse } from "next/server";
import { getActiveMetaScopes } from "@/lib/oauth/meta";
import { getOAuthToken } from "@/lib/server/oauth/token-store";
import { canAccessPrivateCockpit } from "@/src/lib/auth/roles";
import { getCurrentUser } from "@/src/lib/supabase/server";

export const runtime = "nodejs";

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
};

function getGraphVersion() {
  return process.env.INSTAGRAM_GRAPH_VERSION?.trim() || "v23.0";
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

function splitScopes(scope: string | null) {
  return scope?.split(/[\s,]+/).filter(Boolean) ?? [];
}

function toPageDiagnostic(page: MetaPageAccount) {
  return {
    id: page.id ?? null,
    name: page.name ?? null,
    tasks: Array.isArray(page.tasks) ? page.tasks : null,
    instagramBusinessAccountFound: Boolean(page.instagram_business_account?.id),
    instagramBusinessId: page.instagram_business_account?.id ?? null,
    instagramUsername: page.instagram_business_account?.username ?? null,
  };
}

export async function GET() {
  const user = await getCurrentUser();

  if (!user || !canAccessPrivateCockpit(user)) {
    return NextResponse.json({ error: "Acces refuse." }, { status: 403 });
  }

  const graphVersion = getGraphVersion();
  const token = await getOAuthToken("meta");
  const tokenPresent = Boolean(token?.accessToken);
  const grantedScopes = splitScopes(token?.scope ?? null);
  const expectedScopes = getActiveMetaScopes();
  const missingScopes = expectedScopes.filter(
    (scope) => !grantedScopes.includes(scope),
  );
  const logs = [
    "Token Meta lu cote serveur.",
    "Aucun token ni secret expose dans la reponse.",
  ];

  if (!token?.accessToken) {
    return NextResponse.json(
      {
        ok: false,
        token: {
          present: false,
          storageMode: "supabase",
          expiresAt: null,
        },
        graphApiCalled: false,
        facebookPageFound: false,
        instagramBusinessAccountFound: false,
        instagramBusinessId: null,
        instagramUsername: null,
        scopes: {
          expected: expectedScopes,
          granted: grantedScopes,
          missing: missingScopes,
        },
        logs,
        error: {
          code: "missing_meta_token",
          message: "Token Meta absent.",
        },
      },
      { status: 401 },
    );
  }

  const accountsUrl = new URL(
    `https://graph.facebook.com/${graphVersion}/me/accounts`,
  );
  accountsUrl.searchParams.set(
    "fields",
    "id,name,tasks,instagram_business_account{id,username}",
  );
  accountsUrl.searchParams.set("access_token", token.accessToken);

  try {
    const response = await fetch(accountsUrl, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      cache: "no-store",
    });
    const payload = (await response.json()) as MetaAccountsResponse;
    const graphApiCalled = true;
    const graphApiSucceeded = response.ok && !payload.error;
    const pages = payload.data ?? [];
    const pageWithInstagram =
      pages.find((page) => Boolean(page.instagram_business_account?.id)) ??
      null;

    if (!graphApiSucceeded) {
      return NextResponse.json(
        {
          ok: false,
          token: {
            present: tokenPresent,
            storageMode: "supabase",
            expiresAt: token.expiresAt,
          },
          graphApiCalled,
          graphApiSucceeded: false,
          facebookPageFound: false,
          instagramBusinessAccountFound: false,
          instagramBusinessId: null,
          instagramUsername: null,
          scopes: {
            expected: expectedScopes,
            granted: grantedScopes,
            missing: missingScopes,
          },
          logs: [...logs, "Appel Graph API effectue."],
          error: sanitizeGraphError(
            payload.error ?? {
              code: response.status,
              message: "Meta Graph API request failed.",
            },
          ),
        },
        { status: response.ok ? 500 : response.status },
      );
    }

    console.info("[Instagram Publish Test] config ok", {
      pagesCount: pages.length,
      instagramBusinessAccountFound: Boolean(pageWithInstagram),
      scopePublishPresent: grantedScopes.includes("instagram_content_publish"),
    });

    return NextResponse.json({
      ok: true,
      token: {
        present: tokenPresent,
        storageMode: "supabase",
        expiresAt: token.expiresAt,
      },
      graphApiCalled,
      graphApiSucceeded,
      facebookPageFound: pages.length > 0,
      instagramBusinessAccountFound: Boolean(pageWithInstagram),
      instagramBusinessId:
        pageWithInstagram?.instagram_business_account?.id ?? null,
      instagramUsername:
        pageWithInstagram?.instagram_business_account?.username ?? null,
      pages: pages.map(toPageDiagnostic),
      scopes: {
        expected: expectedScopes,
        granted: grantedScopes,
        missing: missingScopes,
      },
      logs: [...logs, "Configuration Instagram lue via Graph API."],
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        token: {
          present: tokenPresent,
          storageMode: "supabase",
          expiresAt: token.expiresAt,
        },
        graphApiCalled: true,
        graphApiSucceeded: false,
        facebookPageFound: false,
        instagramBusinessAccountFound: false,
        instagramBusinessId: null,
        instagramUsername: null,
        scopes: {
          expected: expectedScopes,
          granted: grantedScopes,
          missing: missingScopes,
        },
        logs,
        error: {
          code: "request_error",
          message: error instanceof Error ? error.message : "Erreur inconnue.",
        },
      },
      { status: 500 },
    );
  }
}
