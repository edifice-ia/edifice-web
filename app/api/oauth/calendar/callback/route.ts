import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { exchangeGoogleAuthorizationCode } from "@/lib/server/oauth/google-token-exchange";
import { buildAbsoluteOAuthReturnUrl } from "@/lib/server/oauth/oauth-redirects";
import {
  resolveCalendarRedirectUri,
  resolveCalendarWebhookAddress,
} from "@/lib/server/oauth/calendar-redirect";
import { saveOAuthToken } from "@/lib/server/oauth/token-store";
import {
  CALENDAR_STATE_COOKIE,
  verifyCalendarOAuthState,
} from "@/lib/server/oauth/calendar-state";
import { registerCalendarWatchChannel } from "@/lib/server/calendar/calendar-watch";
import { upsertCalendarSyncState } from "@/lib/server/calendar/calendar-sync-state-store";
import { canAccessPrivateCockpit } from "@/src/lib/auth/roles";
import { getCurrentUser } from "@/src/lib/supabase/server";

function redirectToCalendarReturn(request: NextRequest, connected: boolean) {
  const target = buildAbsoluteOAuthReturnUrl(
    request,
    "calendar",
    connected,
    connected ? undefined : "oauth",
  );
  console.info(`[OAuth Callback] final redirect=${target.toString()}`, {
    provider: "calendar",
    finalRedirect: target.toString(),
  });

  const response = NextResponse.redirect(target);
  response.cookies.set(CALENDAR_STATE_COOKIE, "", {
    httpOnly: true,
    secure: request.nextUrl.protocol === "https:",
    sameSite: "lax",
    maxAge: 0,
    path: "/api/oauth/calendar",
  });

  return response;
}

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !canAccessPrivateCockpit(user)) {
    console.warn("[Calendar OAuth Callback] acces refuse", {
      failureStep: "access_check",
    });
    return redirectToCalendarReturn(request, false);
  }

  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const cookieState = request.cookies.get(CALENDAR_STATE_COOKIE)?.value ?? null;
  const stateValid =
    Boolean(state && cookieState && state === cookieState) &&
    verifyCalendarOAuthState(state, user.id);

  console.info("[OAuth Callback] provider=calendar");
  console.info("[Calendar OAuth Callback] code present yes/no", {
    present: Boolean(code),
  });
  console.info("[Calendar OAuth Callback] state valid yes/no", {
    valid: stateValid,
  });

  if (!code || !stateValid) {
    console.info("[Calendar OAuth Callback] token exchange success yes/no", {
      success: false,
    });
    console.info("[Calendar OAuth Callback] token stored yes/no", {
      stored: false,
    });
    return redirectToCalendarReturn(request, false);
  }

  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  const redirectUri = resolveCalendarRedirectUri(request);

  if (!clientId || !clientSecret) {
    console.warn("[Calendar OAuth Callback] missing server configuration", {
      clientIdPresent: Boolean(clientId),
      clientSecretPresent: Boolean(clientSecret),
    });
    console.info("[Calendar OAuth Callback] token exchange success yes/no", {
      success: false,
    });
    console.info("[Calendar OAuth Callback] token stored yes/no", {
      stored: false,
    });
    return redirectToCalendarReturn(request, false);
  }

  console.info("[Calendar OAuth Callback] token exchange started");

  try {
    const { response: tokenResponse, payload: tokenPayload } =
      await exchangeGoogleAuthorizationCode({
        clientId,
        clientSecret,
        redirectUri,
        code,
      });
    const exchangeSuccess = Boolean(
      tokenResponse.ok && tokenPayload.access_token,
    );

    console.info("[Calendar OAuth Callback] token exchange success yes/no", {
      success: exchangeSuccess,
    });

    if (!exchangeSuccess || !tokenPayload.access_token) {
      console.warn("[Calendar OAuth Callback] token exchange failed", {
        status: tokenResponse.status,
        error: tokenPayload.error,
      });
      console.info("[Calendar OAuth Callback] token stored yes/no", {
        stored: false,
      });
      return redirectToCalendarReturn(request, false);
    }

    const updatedAt = new Date().toISOString();
    const expiresAt =
      typeof tokenPayload.expires_in === "number"
        ? new Date(Date.now() + tokenPayload.expires_in * 1000).toISOString()
        : null;

    await saveOAuthToken("calendar", {
      access_token: tokenPayload.access_token,
      refresh_token: tokenPayload.refresh_token,
      token_type: tokenPayload.token_type,
      scope: tokenPayload.scope,
      expires_in: tokenPayload.expires_in,
      expires_at: expiresAt,
      updated_at: updatedAt,
    });

    console.info("[Calendar OAuth Callback] token stored yes/no", {
      stored: true,
    });

    // Demarre la synchro temps reel immediatement : un echec ici ne doit pas
    // faire echouer la connexion OAuth elle-meme (le token est deja
    // enregistre). Isole dans son propre try/catch : sans ca, une exception
    // ici (ex. table personal_calendar_sync_state absente) remontait au
    // catch englobant le token exchange et faisait rediriger avec
    // connected=false alors meme que le token OAuth avait deja ete
    // sauvegarde avec succes juste au-dessus — bug reel identifie le
    // 2026-07-26, corrige ici.
    try {
      const watchAddress = resolveCalendarWebhookAddress(request.nextUrl.origin);
      const watchRegistration = await registerCalendarWatchChannel({
        accessToken: tokenPayload.access_token,
        address: watchAddress,
      });

      if (watchRegistration.ok) {
        await upsertCalendarSyncState({
          userId: user.id,
          channelId: watchRegistration.channelId,
          resourceId: watchRegistration.resourceId,
          channelToken: watchRegistration.channelToken,
          expiresAt: watchRegistration.expiresAt,
        });
        console.info("[Calendar OAuth Callback] canal de notifications enregistre", {
          channelId: watchRegistration.channelId,
          expiresAt: watchRegistration.expiresAt,
        });
      } else {
        console.error("[Calendar OAuth Callback] echec d'enregistrement du canal de notifications", {
          error: watchRegistration.error,
        });
      }
    } catch (watchError) {
      console.error("[Calendar OAuth Callback] exception lors de l'enregistrement du canal", {
        message:
          watchError instanceof Error ? watchError.message : "Erreur inconnue.",
      });
    }

    return redirectToCalendarReturn(request, true);
  } catch (error) {
    console.error("[Calendar OAuth Callback] token exchange exception", {
      message:
        error instanceof Error
          ? error.message
          : "Unknown Calendar token exchange error",
    });
    console.info("[Calendar OAuth Callback] token exchange success yes/no", {
      success: false,
    });
    console.info("[Calendar OAuth Callback] token stored yes/no", {
      stored: false,
    });
    return redirectToCalendarReturn(request, false);
  }
}
