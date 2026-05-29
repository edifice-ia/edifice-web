import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { buildAbsoluteOAuthReturnUrl } from "@/lib/server/oauth/oauth-redirects";
import { saveOAuthToken } from "@/lib/server/oauth/token-store";
import { getOAuthProvider } from "@/lib/oauth/providers";
import { isTokenExchangeEnabled } from "@/lib/oauth/server";

export async function GET(
  request: NextRequest,
  context: RouteContext<"/api/oauth/[provider]/callback">,
) {
  const { provider: providerKey } = await context.params;
  const provider = getOAuthProvider(providerKey);

  if (!provider) {
    return Response.json(
      { ok: false, error: "Unsupported OAuth provider." },
      { status: 404 },
    );
  }

  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const error = request.nextUrl.searchParams.get("error");
  const isDebug = request.nextUrl.searchParams.get("debug") === "1";
  const tokenExchangeEnabled = isTokenExchangeEnabled(provider);
  const payload = {
    ok: true,
    provider: provider.key,
    receivedCode: Boolean(code),
    receivedState: Boolean(state),
    tokenExchangeEnabled,
    tokenStorageEnabled: false,
    message: tokenExchangeEnabled
      ? "Callback OAuth pret pour echange de token cote serveur. Stockage des tokens desactive."
      : "Callback OAuth placeholder. Aucun token n'est echange, stocke ou utilise pour publier.",
  };

  if (isDebug) {
    return Response.json(payload);
  }

  console.info(`[OAuth Callback] provider=${provider.key}`);

  if (error || !code) {
    const redirectTarget = buildAbsoluteOAuthReturnUrl(
      request,
      provider.key,
      false,
      "oauth",
    );
    console.info(`[OAuth Callback] final redirect=${redirectTarget.toString()}`, {
      provider: provider.key,
      finalRedirect: redirectTarget.toString(),
    });
    return NextResponse.redirect(redirectTarget);
  }

  if (provider.key === "youtube") {
    await saveOAuthToken("youtube", {});
  }

  const redirectTarget = buildAbsoluteOAuthReturnUrl(request, provider.key, true);
  console.info(`[OAuth Callback] final redirect=${redirectTarget.toString()}`, {
    provider: provider.key,
    finalRedirect: redirectTarget.toString(),
  });

  return NextResponse.redirect(redirectTarget);
}
