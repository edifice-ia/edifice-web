import { PINTEREST_EXPECTED_SCOPES } from "@/lib/oauth/pinterest";

export type OAuthProviderKey =
  | "youtube"
  | "calendar"
  | "pinterest"
  | "tiktok"
  | "meta"
  | "instagram"
  | "garmin";

export type OAuthProviderConfig = {
  key: OAuthProviderKey;
  name: string;
  env: {
    client: string;
    secret: string;
    redirect?: string;
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
      client: "GOOGLE_CLIENT_ID",
      secret: "GOOGLE_CLIENT_SECRET",
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
    key: "calendar",
    name: "Google Calendar",
    env: {
      client: "GOOGLE_CLIENT_ID",
      secret: "GOOGLE_CLIENT_SECRET",
      // Pas de redirect_uri statique : meme client OAuth "Edifice IA" que
      // YouTube, mais deux domaines enregistres cote Google Cloud
      // (edifice-web.vercel.app et www.edificeia.com). L'URI de redirection
      // est resolue dynamiquement selon le domaine de la requete entrante,
      // voir lib/server/oauth/calendar-redirect.ts.
      stateSecret: "OAUTH_STATE_SECRET",
    },
    authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    scopes: ["https://www.googleapis.com/auth/calendar.readonly"],
    actionLabel: "Connecter Google Calendar",
    secondaryLabel: "Tester la configuration",
    note: "Acces en lecture seule uniquement (moindre privilege), aucune ecriture sur l'agenda.",
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
    scopes: [...PINTEREST_EXPECTED_SCOPES],
    actionLabel: "Connecter Pinterest",
    secondaryLabel: "Tester la configuration",
    note: "Publication reelle non declenchee automatiquement.",
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
      "instagram_content_publish",
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
  {
    key: "garmin",
    name: "Garmin Connect",
    env: {
      client: "GARMIN_CLIENT_ID",
      secret: "GARMIN_CLIENT_SECRET",
      redirect: "GARMIN_REDIRECT_URI",
      stateSecret: "OAUTH_STATE_SECRET",
    },
    // NOTE (DEC-006): endpoint non confirme. Garmin Developer Program est en
    // cours de validation ; a verifier contre la documentation officielle
    // avant toute activation reelle.
    authUrl: "https://connect.garmin.com/oauth2Confirm",
    // NOTE (DEC-006): noms de scopes non confirmes par la documentation
    // officielle Garmin Developer Program (candidature en cours). Couvrent les
    // domaines demandes pour le module Personnel (sommeil, frequence
    // cardiaque, Body Battery, stress) ; a verifier/ajuster a reception de
    // l'approbation avant toute activation reelle.
    scopes: ["SLEEP_READ", "HEART_RATE_READ", "BODY_BATTERY_READ", "STRESS_READ"],
    actionLabel: "Connecter Garmin",
    secondaryLabel: "Tester la configuration",
    note: "Acces Garmin Developer Program en cours de validation (DEC-006). Aucune activation reelle avant confirmation manuelle.",
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
