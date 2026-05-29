import type { OAuthProviderConfig, OAuthProviderKey } from "@/lib/oauth/providers";

export type OAuthStatusMode = "sandbox" | "production" | "review" | "disabled";

type OAuthStatusEnvKeys = {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  stateSecret?: string;
};

type OAuthStatusOptions = {
  provider: OAuthProviderKey;
  mode: OAuthStatusMode;
  env: OAuthStatusEnvKeys;
  scopes: string[];
  callbackPath: string;
  tokenPresent?: boolean;
  tokenStorageEnabled?: boolean;
  expiresAt?: string | null;
  extraWarnings?: string[];
};

const LEGACY_DOMAIN = "edifice-web.vercel.app";

function hasEnvValue(name: string) {
  const value = process.env[name];
  return typeof value === "string" && value.trim().length > 0;
}

function getEnvValue(name: string) {
  return process.env[name]?.trim() ?? "";
}

function hasLegacyDomain(name: string) {
  return getEnvValue(name).includes(LEGACY_DOMAIN);
}

function warningForMissing(present: boolean, label: string) {
  return present ? [] : [`${label} absent`];
}

export function buildProviderOAuthStatus(options: OAuthStatusOptions) {
  const clientIdPresent = hasEnvValue(options.env.clientId);
  const clientSecretPresent = hasEnvValue(options.env.clientSecret);
  const redirectUriPresent = hasEnvValue(options.env.redirectUri);
  const stateSecretPresent = options.env.stateSecret
    ? hasEnvValue(options.env.stateSecret)
    : true;
  const redirectUri = getEnvValue(options.env.redirectUri);
  const env = {
    CLIENT_ID: clientIdPresent,
    CLIENT_SECRET: clientSecretPresent,
    REDIRECT_URI: redirectUriPresent,
    OAUTH_STATE_SECRET: stateSecretPresent,
  };
  const legacyDomainDetected =
    hasLegacyDomain(options.env.clientId) ||
    hasLegacyDomain(options.env.clientSecret) ||
    hasLegacyDomain(options.env.redirectUri) ||
    (options.env.stateSecret ? hasLegacyDomain(options.env.stateSecret) : false);
  const warnings = [
    ...warningForMissing(clientIdPresent, "CLIENT_ID"),
    ...warningForMissing(clientSecretPresent, "CLIENT_SECRET"),
    ...warningForMissing(redirectUriPresent, "REDIRECT_URI"),
    ...warningForMissing(stateSecretPresent, "OAUTH_STATE_SECRET"),
    ...(hasLegacyDomain(options.env.clientId)
      ? [`Ancien domaine Vercel detecte dans ${options.env.clientId}`]
      : []),
    ...(hasLegacyDomain(options.env.clientSecret)
      ? [`Ancien domaine Vercel detecte dans ${options.env.clientSecret}`]
      : []),
    ...(hasLegacyDomain(options.env.redirectUri)
      ? [`Ancien domaine Vercel detecte dans ${options.env.redirectUri}`]
      : []),
    ...(options.env.stateSecret && hasLegacyDomain(options.env.stateSecret)
      ? [`Ancien domaine Vercel detecte dans ${options.env.stateSecret}`]
      : []),
    ...(options.extraWarnings ?? []),
  ];
  const configured = Object.values(env).every(Boolean) && warnings.length === 0;

  console.info(`[OAuth Status] provider=${options.provider}`);
  console.info("[OAuth Status] env check complete", {
    provider: options.provider,
    configured,
  });
  console.info("[OAuth Status] legacy domain detected yes/no", {
    provider: options.provider,
    detected: legacyDomainDetected,
  });

  return {
    provider: options.provider,
    configured,
    mode: options.mode,
    redirectUri,
    callbackPath: options.callbackPath,
    env,
    scopes: options.scopes,
    token: {
      present: options.tokenPresent ?? false,
      storageEnabled: options.tokenStorageEnabled ?? false,
      expiresAt: options.expiresAt ?? null,
    },
    warnings,
  };
}

export function buildOAuthStatusFromProvider(
  provider: OAuthProviderConfig,
  options: Omit<OAuthStatusOptions, "provider" | "env" | "scopes"> & {
    scopes?: string[];
  },
) {
  return buildProviderOAuthStatus({
    provider: provider.key,
    env: {
      clientId: provider.env.client,
      clientSecret: provider.env.secret,
      redirectUri: provider.env.redirect,
      stateSecret: provider.env.stateSecret,
    },
    scopes: options.scopes ?? provider.scopes,
    ...options,
  });
}
