import { NextResponse } from "next/server";
import {
  createGarminOAuthState,
  GARMIN_STATE_COOKIE,
  GARMIN_STATE_MAX_AGE_SECONDS,
} from "@/lib/server/oauth/garmin-state";

// NOTE (DEC-006): endpoint non confirme. A verifier contre la documentation
// officielle Garmin Developer Program avant toute activation reelle.
const GARMIN_AUTHORIZE_URL = "https://connect.garmin.com/oauth2Confirm";
const REQUIRED_ENV = [
  "GARMIN_CLIENT_ID",
  "GARMIN_REDIRECT_URI",
  "OAUTH_STATE_SECRET",
];

function hasEnvValue(name: string) {
  const value = process.env[name];
  return typeof value === "string" && value.trim().length > 0;
}

export async function GET() {
  const missing = REQUIRED_ENV.filter((name) => !hasEnvValue(name));
  const clientId = process.env.GARMIN_CLIENT_ID?.trim();
  const redirectUri = process.env.GARMIN_REDIRECT_URI?.trim();

  console.info("[Garmin OAuth Start] env check", {
    configured: missing.length === 0,
    missing,
  });

  if (missing.length > 0 || !clientId || !redirectUri) {
    return Response.json(
      {
        ok: false,
        provider: "garmin",
        error: "garmin_oauth_configuration_incomplete",
        missing,
      },
      { status: 400 },
    );
  }

  const oauthState = createGarminOAuthState();

  console.info("[Garmin OAuth Start] state genere", {
    generated: Boolean(oauthState),
  });

  if (!oauthState) {
    return Response.json(
      {
        ok: false,
        provider: "garmin",
        error: "garmin_oauth_state_unavailable",
      },
      { status: 500 },
    );
  }

  const authorizationUrl = new URL(GARMIN_AUTHORIZE_URL);
  authorizationUrl.searchParams.set("client_id", clientId);
  authorizationUrl.searchParams.set("response_type", "code");
  authorizationUrl.searchParams.set("redirect_uri", redirectUri);
  authorizationUrl.searchParams.set("state", oauthState.state);
  authorizationUrl.searchParams.set("code_challenge", oauthState.codeChallenge);
  authorizationUrl.searchParams.set("code_challenge_method", "S256");

  console.info("[Garmin OAuth Start] redirection vers Garmin", {
    authorizeUrl: GARMIN_AUTHORIZE_URL,
  });

  const response = NextResponse.redirect(authorizationUrl);
  response.cookies.set(GARMIN_STATE_COOKIE, oauthState.state, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: GARMIN_STATE_MAX_AGE_SECONDS,
    path: "/api/oauth/garmin",
  });

  return response;
}
