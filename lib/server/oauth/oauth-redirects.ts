import type { NextRequest } from "next/server";

export const OAUTH_CONNECTIONS_RETURN_PATH =
  process.env.OAUTH_CONNECTIONS_RETURN_PATH || "/interface/settings/connections";

export function buildOAuthReturnUrl(
  provider: string,
  connected: boolean,
  error?: string,
) {
  const params = new URLSearchParams({
    provider,
    connected: connected ? "1" : "0",
  });

  if (error) {
    params.set("error", error);
  }

  return `${OAUTH_CONNECTIONS_RETURN_PATH}?${params.toString()}`;
}

export function buildAbsoluteOAuthReturnUrl(
  request: NextRequest,
  provider: string,
  connected: boolean,
  error?: string,
) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim() || request.nextUrl.origin;
  return new URL(buildOAuthReturnUrl(provider, connected, error), appUrl);
}
