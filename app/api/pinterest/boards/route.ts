import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  normalizePinterestEnvironment,
  readPinterestPublisherBoardsState,
} from "@/lib/server/pinterest-publisher";
import { canAccessPrivateCockpit } from "@/src/lib/auth/roles";
import { getCurrentUser } from "@/src/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !canAccessPrivateCockpit(user)) {
    return NextResponse.json({ ok: false, error: "Acces refuse." }, { status: 403 });
  }

  try {
    const environment = normalizePinterestEnvironment(
      request.nextUrl.searchParams.get("environment") ?? undefined,
    );
    const selectedAccount = request.nextUrl.searchParams.get("account_key") ?? "all";
    const state = await readPinterestPublisherBoardsState(environment);
    const boards =
      selectedAccount === "all"
        ? state.boards
        : state.boards.filter((board) => board.accountKey === selectedAccount);
    const diagnostics =
      selectedAccount === "all"
        ? state.diagnostics
        : state.diagnostics.filter((item) => item.accountKey === selectedAccount);

    console.info("[Pinterest Publisher] tableaux route result", {
      provider: "pinterest",
      selectedAccount,
      environment,
      boardsCount: boards.length,
      boardsSource: "api_pinterest",
      tokenEnvironments: diagnostics.map((item) => ({
        accountKey: item.accountKey,
        tokenEnvironment: item.tokenEnvironment,
        tokenValid: item.tokenValid,
        skippedReason: item.skippedReason,
      })),
    });

    return NextResponse.json({
      ok: true,
      environment,
      selectedAccount,
      boards,
      diagnostics,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Chargement des tableaux Pinterest impossible.",
      },
      { status: 500 },
    );
  }
}
