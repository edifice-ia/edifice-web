import type { OAuthProviderConfig } from "./providers";
import { getRequiredEnvNames } from "./providers";

export type OAuthConfigState = {
  configured: boolean;
  missing: string[];
};

function hasEnvValue(name: string) {
  const value = process.env[name];
  return typeof value === "string" && value.trim().length > 0;
}

export function getOAuthConfigState(
  provider: OAuthProviderConfig,
): OAuthConfigState {
  const missing = getRequiredEnvNames(provider).filter(
    (name) => !hasEnvValue(name),
  );

  return {
    configured: missing.length === 0,
    missing,
  };
}

export function getOAuthStatus(provider: OAuthProviderConfig) {
  const state = getOAuthConfigState(provider);

  if (provider.key === "youtube") {
    return "Connecte";
  }

  if (provider.placeholder) {
    return state.configured ? "Placeholder" : "A securiser";
  }

  return state.configured ? "Configure" : "A configurer";
}

export function isTokenExchangeEnabled(provider: OAuthProviderConfig) {
  return (
    provider.key === "youtube" ||
    provider.key === "calendar" ||
    provider.key === "pinterest" ||
    provider.key === "garmin"
  );
}

export function buildOAuthStartUrl(
  provider: OAuthProviderConfig,
  oauthState = "placeholder-state-not-for-production",
  options?: { redirectUriOverride?: string; pkce?: { codeChallenge: string } },
) {
  if (!provider.authUrl) {
    return null;
  }

  const clientId = process.env[provider.env.client];
  const redirectUri =
    options?.redirectUriOverride ??
    (provider.env.redirect ? process.env[provider.env.redirect] : undefined);

  if (!clientId || !redirectUri) {
    return null;
  }

  const url = new URL(provider.authUrl);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", provider.scopes.join(" "));
  url.searchParams.set("state", oauthState);

  if (provider.key === "tiktok") {
    url.searchParams.set("client_key", clientId);
    url.searchParams.delete("client_id");
  }

  if (provider.key === "youtube" || provider.key === "calendar") {
    url.searchParams.set("access_type", "offline");
    url.searchParams.set("prompt", "consent");
  }

  if (provider.key === "garmin" && options?.pkce) {
    url.searchParams.set("code_challenge", options.pkce.codeChallenge);
    url.searchParams.set("code_challenge_method", "S256");
  }

  return url.toString();
}
