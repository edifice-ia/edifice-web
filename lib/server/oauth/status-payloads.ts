import { getActiveMetaScopes } from "@/lib/oauth/meta";
import { getOAuthProvider } from "@/lib/oauth/providers";
import { buildOAuthStatusFromProvider, buildProviderOAuthStatus } from "./oauth-status";
import { getOAuthTokenStatus } from "./token-store";

export function getYouTubeOAuthStatusPayload() {
  const provider = getOAuthProvider("youtube");

  if (!provider) {
    throw new Error("YouTube OAuth provider is not configured.");
  }

  const token = getOAuthTokenStatus("youtube");

  return buildOAuthStatusFromProvider(provider, {
    mode: "production",
    callbackPath: "/api/oauth/youtube/callback",
    tokenPresent: token.present,
    tokenStorageEnabled: token.storageEnabled,
    expiresAt: token.expiresAt,
    updatedAt: token.updatedAt,
  });
}

export function getTikTokOAuthStatusPayload() {
  const provider = getOAuthProvider("tiktok");

  if (!provider) {
    throw new Error("TikTok OAuth provider is not configured.");
  }

  const token = getOAuthTokenStatus("tiktok");
  const redirectUri = process.env.TIKTOK_REDIRECT_URI?.trim();
  const extraWarnings =
    redirectUri && redirectUri !== "https://www.edificeia.com/api/oauth/tiktok/callback"
      ? [
          "TIKTOK_REDIRECT_URI doit etre strictement identique a l'URI configuree cote TikTok.",
        ]
      : [];

  return buildOAuthStatusFromProvider(provider, {
    mode: "sandbox",
    callbackPath: "/api/oauth/tiktok/callback",
    tokenPresent: token.present,
    tokenStorageEnabled: token.storageEnabled,
    expiresAt: token.expiresAt,
    updatedAt: token.updatedAt,
    extraWarnings,
  });
}

export function getMetaOAuthStatusPayload() {
  const provider = getOAuthProvider("meta");

  if (!provider) {
    throw new Error("Meta OAuth provider is not configured.");
  }

  const token = getOAuthTokenStatus("meta");

  return buildOAuthStatusFromProvider(provider, {
    mode: "review",
    callbackPath: "/api/meta/callback",
    scopes: getActiveMetaScopes(),
    tokenPresent: token.present,
    tokenStorageEnabled: token.storageEnabled,
    expiresAt: token.expiresAt,
    updatedAt: token.updatedAt,
  });
}

export function getPinterestOAuthStatusPayload() {
  const provider = getOAuthProvider("pinterest");

  if (!provider) {
    throw new Error("Pinterest OAuth provider is not configured.");
  }

  const token = getOAuthTokenStatus("pinterest");

  return buildOAuthStatusFromProvider(provider, {
    mode: "disabled",
    callbackPath: "/api/oauth/pinterest/callback",
    tokenPresent: token.present,
    tokenStorageEnabled: token.storageEnabled,
    expiresAt: token.expiresAt,
    updatedAt: token.updatedAt,
    extraWarnings: ["Connexion Pinterest desactivee pour le moment."],
  });
}

export function getInstagramGraphStatusPayload(options?: {
  tokenPresent?: boolean;
  businessAccountIdPresent?: boolean;
  graphVersionPresent?: boolean;
}) {
  return buildProviderOAuthStatus({
    provider: "instagram",
    mode: "review",
    env: {
      clientId: "INSTAGRAM_BUSINESS_ACCOUNT_ID",
      clientSecret: "INSTAGRAM_ACCESS_TOKEN",
      redirectUri: "INSTAGRAM_GRAPH_VERSION",
    },
    scopes: ["instagram_basic"],
    callbackPath: "/api/instagram/status",
    tokenPresent: options?.tokenPresent ?? false,
    tokenStorageEnabled: false,
    extraWarnings: [
      "Instagram Graph depend de Meta OAuth.",
      ...(options?.businessAccountIdPresent === false
        ? ["INSTAGRAM_BUSINESS_ACCOUNT_ID absent"]
        : []),
      ...(options?.graphVersionPresent === false
        ? ["INSTAGRAM_GRAPH_VERSION absent"]
        : []),
    ],
  });
}
