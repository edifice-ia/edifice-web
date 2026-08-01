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

// ATTENTION : cette fonction mesure la CONFIGURATION (les variables
// d'environnement requises sont-elles presentes), pas la CONNEXION. Elle ne lit
// aucun token et ne peut donc pas savoir si un provider est reellement
// connecte. Les libelles renvoyes disent bien "Configure" / "A configurer".
//
// Elle contenait un `if (provider.key === "youtube") return "Connecte"` qui
// renvoyait "Connecte" en dur, sans lire quoi que ce soit : la carte YouTube
// affichait un badge de connexion permanent, meme sans token et meme sans
// variable d'environnement. Ne jamais reintroduire de valeur affirmative ici :
// une reponse sur la connexion reelle demande getOAuthTokenStatus, comme le
// fait SettingsConnectionsPanel pour Pinterest.
export function getOAuthStatus(provider: OAuthProviderConfig) {
  const state = getOAuthConfigState(provider);

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
