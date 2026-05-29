import { NextResponse } from "next/server";
import {
  createTikTokOAuthState,
  TIKTOK_STATE_COOKIE,
  TIKTOK_STATE_MAX_AGE_SECONDS,
} from "@/lib/server/oauth/tiktok-state";

const TIKTOK_AUTHORIZE_URL = "https://www.tiktok.com/v2/auth/authorize/";
const TIKTOK_SCOPES = ["user.info.basic", "video.upload"];
const REQUIRED_ENV = [
  "TIKTOK_CLIENT_KEY",
  "TIKTOK_CLIENT_SECRET",
  "TIKTOK_REDIRECT_URI",
  "OAUTH_STATE_SECRET",
];

function hasEnvValue(name: string) {
  const value = process.env[name];
  return typeof value === "string" && value.trim().length > 0;
}

export async function GET() {
  const missing = REQUIRED_ENV.filter((name) => !hasEnvValue(name));
  const clientKey = process.env.TIKTOK_CLIENT_KEY?.trim();
  const redirectUri = process.env.TIKTOK_REDIRECT_URI?.trim();

  console.info("[TikTok OAuth Start] env check", {
    configured: missing.length === 0,
    missing,
  });
  console.info("[TikTok OAuth Start] redirect_uri utilisee", {
    redirectUri,
  });

  if (missing.length > 0 || !clientKey || !redirectUri) {
    return Response.json(
      {
        ok: false,
        provider: "tiktok",
        error: "tiktok_oauth_configuration_incomplete",
        missing,
      },
      { status: 400 },
    );
  }

  const state = createTikTokOAuthState();

  console.info("[TikTok OAuth Start] state genere", {
    generated: Boolean(state),
  });

  if (!state) {
    return Response.json(
      {
        ok: false,
        provider: "tiktok",
        error: "tiktok_oauth_state_unavailable",
      },
      { status: 500 },
    );
  }

  const authorizationUrl = new URL(TIKTOK_AUTHORIZE_URL);
  authorizationUrl.searchParams.set("client_key", clientKey);
  authorizationUrl.searchParams.set("response_type", "code");
  authorizationUrl.searchParams.set("scope", TIKTOK_SCOPES.join(","));
  authorizationUrl.searchParams.set("redirect_uri", redirectUri);
  authorizationUrl.searchParams.set("state", state);

  console.info("[TikTok OAuth Start] redirection vers TikTok", {
    authorizeUrl: TIKTOK_AUTHORIZE_URL,
    scope: TIKTOK_SCOPES.join(","),
  });

  const response = NextResponse.redirect(authorizationUrl);
  response.cookies.set(TIKTOK_STATE_COOKIE, state, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: TIKTOK_STATE_MAX_AGE_SECONDS,
    path: "/api/oauth/tiktok",
  });

  return response;
}
