import type { NextRequest } from "next/server";
import {
  getActiveMetaScopes,
  getAppUrl,
  getMissingMetaEnv,
  isMetaInstagramScopesEnabled,
  META_INSTAGRAM_GRAPH_SCOPES,
  META_MINIMAL_SCOPES,
} from "@/lib/oauth/meta";

export async function GET(request: NextRequest) {
  const missing = getMissingMetaEnv();
  const callbackUrl = new URL("/api/meta/callback", getAppUrl(request));
  let callbackAccessible = false;

  try {
    const response = await fetch(callbackUrl, {
      method: "GET",
      cache: "no-store",
      redirect: "manual",
    });
    callbackAccessible =
      response.status >= 300 && response.status < 400;
  } catch (error) {
    console.error("[meta-instagram] callback status check failed", {
      message: error instanceof Error ? error.message : "unknown_error",
    });
  }

  return Response.json({
    ok: missing.length === 0 && callbackAccessible,
    mode: "instagram_graph_preparation",
    env: {
      META_APP_ID: !missing.includes("META_APP_ID"),
      META_APP_SECRET: !missing.includes("META_APP_SECRET"),
      META_REDIRECT_URI: !missing.includes("META_REDIRECT_URI"),
      NEXT_PUBLIC_APP_URL: !missing.includes("NEXT_PUBLIC_APP_URL"),
      OAUTH_STATE_SECRET: !missing.includes("OAUTH_STATE_SECRET"),
      META_ENABLE_INSTAGRAM_SCOPES:
        process.env.META_ENABLE_INSTAGRAM_SCOPES === "true"
          ? "true"
          : "false",
    },
    missing,
    callbackAccessible,
    instagramScopesEnabled: isMetaInstagramScopesEnabled(),
    activeScopes: getActiveMetaScopes(),
    minimalScopes: META_MINIMAL_SCOPES,
    preparedInstagramScopes: META_INSTAGRAM_GRAPH_SCOPES,
    tokenStorageEnabled: false,
  });
}
