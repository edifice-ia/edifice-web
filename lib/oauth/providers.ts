export type OAuthProviderKey =
  | "youtube"
  | "pinterest"
  | "tiktok"
  | "meta"
  | "instagram";

export type OAuthProviderConfig = {
  key: OAuthProviderKey;
  name: string;
  env: {
    client: string;
    secret: string;
    redirect: string;
    stateSecret?: string;
  };
  authUrl?: string;
  scopes: string[];
  actionLabel: string;
  secondaryLabel: string;
  note: string;
  placeholder?: boolean;
};

export const oauthProviders: OAuthProviderConfig[] = [
  {
    key: "youtube",
    name: "YouTube",
    env: {
      client: "YOUTUBE_CLIENT_ID",
      secret: "YOUTUBE_CLIENT_SECRET",
      redirect: "YOUTUBE_REDIRECT_URI",
      stateSecret: "OAUTH_STATE_SECRET",
    },
    authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    scopes: [
      "https://www.googleapis.com/auth/youtube.upload",
      "https://www.googleapis.com/auth/youtube.readonly",
    ],
    actionLabel: "Connecter YouTube",
    secondaryLabel: "Tester la configuration",
    note: "Publication reelle controlee apres validation humaine.",
  },
  {
    key: "pinterest",
    name: "Pinterest",
    env: {
      client: "PINTEREST_CLIENT_ID",
      secret: "PINTEREST_CLIENT_SECRET",
      redirect: "PINTEREST_REDIRECT_URI",
      stateSecret: "OAUTH_STATE_SECRET",
    },
    authUrl: "https://www.pinterest.com/oauth/",
    scopes: ["boards:read", "pins:read", "pins:write"],
    actionLabel: "Connecter Pinterest",
    secondaryLabel: "Tester la configuration",
    note: "Publication reelle non declenchee automatiquement.",
    placeholder: true,
  },
  {
    key: "tiktok",
    name: "TikTok",
    env: {
      client: "TIKTOK_CLIENT_KEY",
      secret: "TIKTOK_CLIENT_SECRET",
      redirect: "TIKTOK_REDIRECT_URI",
      stateSecret: "OAUTH_STATE_SECRET",
    },
    authUrl: "https://www.tiktok.com/v2/auth/authorize/",
    scopes: ["user.info.basic", "video.upload"],
    actionLabel: "Connecter TikTok Sandbox",
    secondaryLabel: "Tester configuration TikTok",
    note: "Connexion OAuth Sandbox TikTok sans publication automatique.",
  },
  {
    key: "meta",
    name: "Instagram / Meta",
    env: {
      client: "META_APP_ID",
      secret: "META_APP_SECRET",
      redirect: "META_REDIRECT_URI",
      stateSecret: "OAUTH_STATE_SECRET",
    },
    authUrl: "https://www.facebook.com/v19.0/dialog/oauth",
    scopes: [
      "public_profile",
      "pages_show_list",
      "pages_read_engagement",
      "instagram_basic",
      "instagram_business_basic",
      "business_management",
    ],
    actionLabel: "Connecter Meta",
    secondaryLabel: "Tester la configuration",
    note: "Necessite Meta / Instagram Graph API et permissions validees.",
  },
  {
    key: "instagram",
    name: "Instagram Callback",
    env: {
      client: "META_APP_ID",
      secret: "META_APP_SECRET",
      redirect: "INSTAGRAM_REDIRECT_URI",
      stateSecret: "OAUTH_STATE_SECRET",
    },
    scopes: ["instagram_basic", "instagram_content_publish"],
    actionLabel: "Preparer Instagram",
    secondaryLabel: "Tester la configuration",
    note: "Callback dedie prevu pour une future separation Instagram.",
    placeholder: true,
  },
];

export function getOAuthProvider(key: string) {
  return oauthProviders.find((provider) => provider.key === key);
}

export function getRequiredEnvNames(provider: OAuthProviderConfig) {
  return [
    provider.env.client,
    provider.env.secret,
    provider.env.redirect,
    provider.env.stateSecret,
  ].filter(Boolean) as string[];
}
