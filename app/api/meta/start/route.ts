import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import {
  buildMetaErrorRedirect,
  createMetaState,
  getMissingMetaEnv,
  getMetaRedirectUri,
  META_AUTH_URL,
  META_SCOPES,
} from "@/lib/oauth/meta";

export async function GET(request: NextRequest) {
  const missing = getMissingMetaEnv();

  if (missing.length > 0) {
    console.error("[meta-oauth] start blocked by missing env", { missing });
    return Response.redirect(buildMetaErrorRedirect(request, "missing_env"));
  }

  const state = createMetaState();

  if (!state) {
    console.error("[meta-oauth] start blocked by missing state secret");
    return Response.redirect(buildMetaErrorRedirect(request, "missing_env"));
  }

  const authUrl = new URL(META_AUTH_URL);
  authUrl.searchParams.set("client_id", process.env.META_APP_ID as string);
  authUrl.searchParams.set("redirect_uri", getMetaRedirectUri(request));
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", META_SCOPES.join(","));
  authUrl.searchParams.set("state", state);

  const cookieStore = await cookies();
  cookieStore.set("meta_oauth_state", state, {
    httpOnly: true,
    maxAge: 10 * 60,
    path: "/",
    sameSite: "lax",
    secure: request.nextUrl.protocol === "https:",
  });

  console.info("[meta-oauth] redirecting to Meta authorization", {
    scopes: META_SCOPES.length,
    redirectUriConfigured: Boolean(process.env.META_REDIRECT_URI),
  });

  return Response.redirect(authUrl);
}
