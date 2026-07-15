import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  buildMetaErrorRedirect,
  createMetaState,
  getActiveMetaScopes,
  getMissingMetaEnv,
  getMetaRedirectUri,
  META_AUTH_URL,
} from "@/lib/oauth/meta";
import { canAccessPrivateCockpit } from "@/src/lib/auth/roles";
import { getCurrentUser } from "@/src/lib/supabase/server";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !canAccessPrivateCockpit(user)) {
    return NextResponse.json({ error: "Acces refuse." }, { status: 403 });
  }

  const missing = getMissingMetaEnv();

  console.info("[META START] env check", {
    configured: missing.length === 0,
    missing,
  });

  if (missing.length > 0) {
    console.error("[meta-oauth] start blocked by missing env", { missing });
    return Response.redirect(buildMetaErrorRedirect(request, "missing_env"));
  }

  const state = createMetaState(user.id);

  console.info("[META START] state generated", {
    generated: Boolean(state),
  });

  if (!state) {
    console.error("[meta-oauth] start blocked by missing state secret");
    return Response.redirect(buildMetaErrorRedirect(request, "missing_env"));
  }

  const authUrl = new URL(META_AUTH_URL);
  const activeScopes = getActiveMetaScopes();
  authUrl.searchParams.set("client_id", process.env.META_APP_ID as string);
  authUrl.searchParams.set("redirect_uri", getMetaRedirectUri(request));
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", activeScopes.join(","));
  authUrl.searchParams.set("state", state);

  const cookieStore = await cookies();
  cookieStore.set("meta_oauth_state", state, {
    httpOnly: true,
    maxAge: 10 * 60,
    path: "/",
    sameSite: "lax",
    secure: request.nextUrl.protocol === "https:",
  });

  console.info("[META START] redirecting to Meta authorization", {
    scopes: activeScopes.length,
    redirectUriConfigured: Boolean(process.env.META_REDIRECT_URI),
  });

  return Response.redirect(authUrl);
}
