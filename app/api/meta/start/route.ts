import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import {
  buildMetaErrorRedirect,
  createMetaState,
  getActiveMetaScopes,
  getMissingMetaEnv,
  getMetaRedirectUri,
  isMetaInstagramScopesEnabled,
  META_AUTH_URL,
} from "@/lib/oauth/meta";

export async function GET(request: NextRequest) {
  const missing = getMissingMetaEnv();

  console.info("[META START] env check", {
    configured: missing.length === 0,
    missing,
  });

  if (missing.length > 0) {
    console.error("[meta-oauth] start blocked by missing env", { missing });
    return Response.redirect(buildMetaErrorRedirect(request, "missing_env"));
  }

  const state = createMetaState();

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
    instagramScopesEnabled: isMetaInstagramScopesEnabled(),
    redirectUriConfigured: Boolean(process.env.META_REDIRECT_URI),
  });

  return Response.redirect(authUrl);
}
