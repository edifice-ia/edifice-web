import type { NextRequest } from "next/server";

const REQUIRED_ENV = [
  "YOUTUBE_CLIENT_ID",
  "YOUTUBE_CLIENT_SECRET",
  "YOUTUBE_REDIRECT_URI",
  "NEXT_PUBLIC_APP_URL",
];

function hasEnvValue(name: string) {
  const value = process.env[name];
  return typeof value === "string" && value.trim().length > 0;
}

export async function GET(request: NextRequest) {
  const missing = REQUIRED_ENV.filter((name) => !hasEnvValue(name));
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim() || request.nextUrl.origin;
  const expectedRedirectUri = `${appUrl}/api/oauth/youtube/callback`;
  const configuredRedirectUri = process.env.YOUTUBE_REDIRECT_URI?.trim();
  const redirectUriMatches = configuredRedirectUri === expectedRedirectUri;

  if (missing.length === 0 && redirectUriMatches) {
    return Response.json({
      ok: true,
      provider: "youtube",
      status: "ready",
    });
  }

  const errors = [
    ...missing.map((name) => ({
      code: "missing_env",
      env: name,
    })),
    ...(configuredRedirectUri && !redirectUriMatches
      ? [
          {
            code: "redirect_uri_mismatch",
            expected: expectedRedirectUri,
          },
        ]
      : []),
  ];

  console.warn("[youtube-oauth] configuration status check failed", {
    missing,
    redirectUriMatches,
  });

  return Response.json(
    {
      ok: false,
      provider: "youtube",
      status: "incomplete",
      errors,
    },
    { status: 400 },
  );
}
