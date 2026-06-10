import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getOAuthToken } from "@/lib/server/oauth/token-store";
import { getPinterestOAuthAccount } from "@/lib/server/oauth/pinterest-accounts";
import { canAccessPrivateCockpit } from "@/src/lib/auth/roles";
import { getCurrentUser } from "@/src/lib/supabase/server";
import {
  buildPinterestScopeDiagnostic,
  splitPinterestScopes,
} from "@/lib/oauth/pinterest";

const PINTEREST_API_URL = "https://api.pinterest.com/v5";

type PinterestProfile = {
  username?: string;
  account_type?: string;
  profile_image?: string;
  website_url?: string;
};

type PinterestBoards = {
  items?: Array<{ id?: string; name?: string }>;
  bookmark?: string | null;
};

function isExpired(expiresAt: string | null) {
  return Boolean(expiresAt && new Date(expiresAt).getTime() <= Date.now());
}

async function pinterestGet<T>(path: string, accessToken: string) {
  const response = await fetch(`${PINTEREST_API_URL}${path}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
    cache: "no-store",
  });
  const payload = (await response.json()) as T & { message?: string; code?: number };

  if (!response.ok) {
    throw new Error(payload.message || `Pinterest API HTTP ${response.status}`);
  }

  return payload;
}

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !canAccessPrivateCockpit(user)) {
    return NextResponse.json({ errorMessage: "Acces refuse.", connected: false }, { status: 403 });
  }

  const accountKey = request.nextUrl.searchParams.get("account_key");
  const account = getPinterestOAuthAccount(accountKey);
  if (!account) {
    return NextResponse.json(
      {
        connected: false,
        tokenExpired: false,
        accountName: null,
        accountId: accountKey,
        boardsCount: 0,
        scopesDetected: [],
        scopesRequested: buildPinterestScopeDiagnostic([]).requested,
        scopesMissing: buildPinterestScopeDiagnostic([]).missing,
        errorMessage: "Compte Pinterest OAuth inconnu.",
      },
      { status: 400 },
    );
  }

  const token = await getOAuthToken("pinterest", undefined, account.accountKey);
  if (!token?.accessToken) {
    console.info("[Pinterest OAuth Test] token stocke", {
      accountKey: account.accountKey,
      present: false,
    });
    return NextResponse.json({
      connected: false,
      tokenExpired: false,
      accountName: null,
      accountId: null,
      boardsCount: 0,
      scopesDetected: [],
      scopesRequested: buildPinterestScopeDiagnostic([]).requested,
      scopesMissing: buildPinterestScopeDiagnostic([]).missing,
      errorMessage: `Aucun token Pinterest stocke pour ${account.label}.`,
    });
  }

  if (isExpired(token.expiresAt)) {
    console.info("[Pinterest OAuth Test] token expire", {
      accountKey: account.accountKey,
      expired: true,
    });
    const scopeDiagnostic = buildPinterestScopeDiagnostic(token.scope);
    return NextResponse.json({
      connected: false,
      tokenExpired: true,
      accountName: null,
      accountId: null,
      boardsCount: 0,
      scopesDetected: scopeDiagnostic.granted,
      scopesRequested: scopeDiagnostic.requested,
      scopesMissing: scopeDiagnostic.missing,
      errorMessage: "Le token Pinterest est expire. Reconnecte Pinterest.",
    });
  }

  try {
    const [profileResult, boardsResult] = await Promise.allSettled([
      pinterestGet<PinterestProfile>("/user_account", token.accessToken),
      pinterestGet<PinterestBoards>("/boards?page_size=100", token.accessToken),
    ]);
    const profile = profileResult.status === "fulfilled" ? profileResult.value : null;
    const boards = boardsResult.status === "fulfilled" ? boardsResult.value : null;
    const boardsCount = boards?.items?.length ?? 0;
    const scopesDetected = splitPinterestScopes(token.scope);
    const scopeDiagnostic = buildPinterestScopeDiagnostic(scopesDetected);
    const connected = Boolean(profile || boards);
    const errors = [
      profileResult.status === "rejected"
        ? `Profil: ${profileResult.reason instanceof Error ? profileResult.reason.message : "indisponible"}`
        : null,
      boardsResult.status === "rejected"
        ? `Boards: ${boardsResult.reason instanceof Error ? boardsResult.reason.message : "indisponibles"}`
        : null,
    ].filter(Boolean);

    console.info("[Pinterest OAuth Test] Test profil reussi", { success: Boolean(profile) });
    console.info("[Pinterest OAuth Test] Nombre de boards detectes", {
      accountKey: account.accountKey,
      count: boardsCount,
    });
    console.info("[Pinterest OAuth Test] scopes diagnostic", {
      accountKey: account.accountKey,
      requested: scopeDiagnostic.requested,
      granted: scopeDiagnostic.granted,
      missing: scopeDiagnostic.missing,
    });

    return NextResponse.json({
      connected,
      accountKey: account.accountKey,
      tokenExpired: false,
      accountName: profile?.username ?? null,
      accountId: profile?.username ?? null,
      accountType: profile?.account_type ?? null,
      boardsCount,
      scopesDetected: scopeDiagnostic.granted,
      scopesRequested: scopeDiagnostic.requested,
      scopesMissing: scopeDiagnostic.missing,
      errorMessage: errors.length > 0 ? errors.join(" / ") : null,
    }, { status: connected ? 200 : 502 });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Test API Pinterest impossible.";
    console.warn("[Pinterest OAuth Test] echec", {
      accountKey: account.accountKey,
      errorMessage,
    });
    const scopeDiagnostic = buildPinterestScopeDiagnostic(token.scope);
    return NextResponse.json(
      {
        connected: false,
        tokenExpired: false,
        accountName: null,
        accountId: null,
        boardsCount: 0,
        scopesDetected: scopeDiagnostic.granted,
        scopesRequested: scopeDiagnostic.requested,
        scopesMissing: scopeDiagnostic.missing,
        errorMessage,
      },
      { status: 502 },
    );
  }
}
