const TIKTOK_SCOPES = ["user.info.basic", "video.upload"];
const REQUIRED_ENV = [
  "TIKTOK_CLIENT_KEY",
  "TIKTOK_CLIENT_SECRET",
  "TIKTOK_REDIRECT_URI",
  "NEXT_PUBLIC_APP_URL",
  "OAUTH_STATE_SECRET",
] as const;

function hasEnvValue(name: string) {
  const value = process.env[name];
  return typeof value === "string" && value.trim().length > 0;
}

export async function GET() {
  const redirectUri = process.env.TIKTOK_REDIRECT_URI?.trim() ?? "";
  const env = Object.fromEntries(
    REQUIRED_ENV.map((name) => [name, hasEnvValue(name)]),
  ) as Record<(typeof REQUIRED_ENV)[number], boolean>;
  const warnings: string[] = [];

  if (redirectUri && redirectUri !== "https://www.edificeia.com/api/oauth/tiktok/callback") {
    warnings.push(
      "TIKTOK_REDIRECT_URI doit etre strictement identique a l'URI configuree cote TikTok.",
    );
  }

  const configured = Object.values(env).every(Boolean) && warnings.length === 0;

  console.info("[TikTok OAuth Status] configuration verifiee", {
    configured,
    missing: REQUIRED_ENV.filter((name) => !env[name]),
    warningsCount: warnings.length,
  });

  return Response.json({
    provider: "tiktok",
    redirectUri,
    sandbox: true,
    env,
    scopes: TIKTOK_SCOPES,
    configured,
    warnings,
  });
}
