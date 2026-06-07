import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { canAccessPrivateCockpit } from "@/src/lib/auth/roles";
import { getCurrentUser } from "@/src/lib/supabase/server";
import {
  createPinterestOAuthState,
  PINTEREST_STATE_COOKIE,
  PINTEREST_STATE_MAX_AGE_SECONDS,
} from "@/lib/server/oauth/pinterest-state";
import { getPinterestOAuthAccount } from "@/lib/server/oauth/pinterest-accounts";

const PINTEREST_AUTHORIZE_URL = "https://www.pinterest.com/oauth/";
const PINTEREST_REDIRECT_URI = "https://www.edificeia.com/api/auth/pinterest/callback";
const PINTEREST_SCOPES = [
  "boards:read",
  "pins:read",
  "pins:write",
  "user_accounts:read",
];
const REQUIRED_ENV = [
  "PINTEREST_CLIENT_ID",
  "PINTEREST_CLIENT_SECRET",
  "PINTEREST_REDIRECT_URI",
  "OAUTH_STATE_SECRET",
];

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !canAccessPrivateCockpit(user)) {
    return NextResponse.json({ error: "Acces refuse." }, { status: 403 });
  }

  const accountKey = request.nextUrl.searchParams.get("account_key");
  const account = getPinterestOAuthAccount(accountKey);
  if (!account) {
    return NextResponse.json(
      { error: "Compte Pinterest OAuth inconnu.", accountKey },
      { status: 400 },
    );
  }

  const missing = REQUIRED_ENV.filter((name) => !process.env[name]?.trim());
  const clientId = process.env.PINTEREST_CLIENT_ID?.trim();
  const redirectUri = process.env.PINTEREST_REDIRECT_URI?.trim();

  console.info("[Pinterest OAuth Start] configuration", {
    configured: missing.length === 0 && redirectUri === PINTEREST_REDIRECT_URI,
    missing,
    redirectUri,
  });

  if (
    missing.length > 0 ||
    !clientId ||
    redirectUri !== PINTEREST_REDIRECT_URI
  ) {
    return NextResponse.json(
      {
        error: "Configuration OAuth Pinterest incomplete ou redirect URI incorrecte.",
        missing,
        expectedRedirectUri: PINTEREST_REDIRECT_URI,
      },
      { status: 400 },
    );
  }

  const state = createPinterestOAuthState(user.id, account.accountKey);
  if (!state) {
    return NextResponse.json({ error: "State OAuth Pinterest indisponible." }, { status: 500 });
  }

  const authorizationUrl = new URL(PINTEREST_AUTHORIZE_URL);
  authorizationUrl.searchParams.set("client_id", clientId);
  authorizationUrl.searchParams.set("redirect_uri", redirectUri);
  authorizationUrl.searchParams.set("response_type", "code");
  authorizationUrl.searchParams.set("scope", PINTEREST_SCOPES.join(","));
  authorizationUrl.searchParams.set("state", state);

  console.info("[Pinterest OAuth Start] OAuth demarre", {
    userAuthenticated: true,
    accountKey: account.accountKey,
  });
  console.info("[Pinterest OAuth Start] redirection preparee", {
    callback: redirectUri,
    scopes: PINTEREST_SCOPES,
  });

  const response = NextResponse.redirect(authorizationUrl);
  response.cookies.set(PINTEREST_STATE_COOKIE, state, {
    httpOnly: true,
    secure: request.nextUrl.protocol === "https:",
    sameSite: "lax",
    maxAge: PINTEREST_STATE_MAX_AGE_SECONDS,
    path: "/api/auth/pinterest",
  });

  return response;
}
