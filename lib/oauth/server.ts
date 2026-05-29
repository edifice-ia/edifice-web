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
    return "Validé";
  }

  if (provider.placeholder) {
    return state.configured ? "Placeholder" : "A securiser";
  }

  return state.configured ? "Configure" : "A configurer";
}

export function isTokenExchangeEnabled(provider: OAuthProviderConfig) {
  return provider.key === "youtube";
}

export function buildOAuthStartUrl(
  provider: OAuthProviderConfig,
  oauthState = "placeholder-state-not-for-production",
) {
  if (!provider.authUrl) {
    return null;
  }

  const clientId = process.env[provider.env.client];
  const redirectUri = process.env[provider.env.redirect];

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

  return url.toString();
}
