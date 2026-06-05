import { NextResponse } from "next/server";
import { getOAuthToken } from "@/lib/server/oauth/token-store";
import { canAccessPrivateCockpit } from "@/src/lib/auth/roles";
import { getCurrentUser } from "@/src/lib/supabase/server";

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

export async function GET() {
  const user = await getCurrentUser();
  if (!user || !canAccessPrivateCockpit(user)) {
    return NextResponse.json({ errorMessage: "Acces refuse.", connected: false }, { status: 403 });
  }

  const token = await getOAuthToken("pinterest", user.id);
  if (!token?.accessToken) {
    console.info("[Pinterest OAuth Test] token stocke", { present: false });
    return NextResponse.json({
      connected: false,
      accountName: null,
      accountId: null,
      boardsCount: 0,
      scopesDetected: [],
      errorMessage: "Aucun token Pinterest stocke pour cet utilisateur.",
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
    const scopesDetected = token.scope?.split(/[\s,]+/).filter(Boolean) ?? [];
    const connected = Boolean(profile || boards);
    const errors = [
      profileResult.status === "rejected"
        ? `Profil: ${profileResult.reason instanceof Error ? profileResult.reason.message : "indisponible"}`
        : null,
      boardsResult.status === "rejected"
        ? `Boards: ${boardsResult.reason instanceof Error ? boardsResult.reason.message : "indisponibles"}`
        : null,
    ].filter(Boolean);

    console.info("[Pinterest OAuth Test] profil OK", { success: Boolean(profile) });
    console.info("[Pinterest OAuth Test] boards trouves", { count: boardsCount });

    return NextResponse.json({
      connected,
      accountName: profile?.username ?? null,
      accountId: profile?.username ?? null,
      accountType: profile?.account_type ?? null,
      boardsCount,
      scopesDetected,
      errorMessage: errors.length > 0 ? errors.join(" / ") : null,
    }, { status: connected ? 200 : 502 });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Test API Pinterest impossible.";
    console.warn("[Pinterest OAuth Test] echec", { errorMessage });
    return NextResponse.json(
      {
        connected: false,
        accountName: null,
        accountId: null,
        boardsCount: 0,
        scopesDetected: token.scope?.split(/[\s,]+/).filter(Boolean) ?? [],
        errorMessage,
      },
      { status: 502 },
    );
  }
}
