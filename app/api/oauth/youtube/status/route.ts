import {
  getOAuthToken,
  getOAuthTokenStatus,
} from "@/lib/server/oauth/token-store";
import { getYouTubeChannel } from "@/lib/server/youtube/youtube-api";
import {
  buildYouTubeScopeDiagnostic,
  ensureYouTubeAccessToken,
  readYouTubeGrantedScopes,
} from "@/lib/server/youtube/youtube-oauth";

export async function GET() {
  console.info("[YouTube Upload Test] status requested");

  const status = await getOAuthTokenStatus("youtube");
  const token = await getOAuthToken("youtube");
  const tokenState = await ensureYouTubeAccessToken(token);

  if (!tokenState.ok) {
    return Response.json({
      ...status,
      connected: false,
      channelDetected: false,
      channelTitle: null,
      channelId: null,
      scopes: buildYouTubeScopeDiagnostic([]),
      logs: tokenState.logs,
      error: tokenState.error,
    });
  }

  const tokenInfo = await readYouTubeGrantedScopes(tokenState.accessToken);
  const grantedScopes =
    tokenInfo.scopes ?? tokenState.token.scope?.split(/[\s,]+/).filter(Boolean) ?? [];
  const channel = await getYouTubeChannel(tokenState.accessToken);

  if (channel.ok) {
    console.info("[YouTube Upload Test] channel detected", {
      channelId: channel.channelId,
      channelTitle: channel.channelTitle,
    });
  }

  return Response.json({
    ...status,
    connected: status.present && channel.ok,
    token: {
      present: status.present,
      storageMode: status.storageMode,
      expiresAt: tokenState.token.expiresAt ?? status.expiresAt,
    },
    channelDetected: channel.ok,
    channelTitle: channel.ok ? channel.channelTitle : null,
    channelId: channel.ok ? channel.channelId : null,
    scopes: {
      ...buildYouTubeScopeDiagnostic(grantedScopes),
      source: tokenInfo.source,
      isValid: tokenInfo.isValid,
      expiresAt: tokenInfo.expiresAt,
      error: tokenInfo.error,
    },
    logs: [
      ...tokenState.logs,
      channel.ok
        ? "Chaine YouTube detectee."
        : "Chaine YouTube non detectee.",
    ],
    error: channel.ok ? null : channel.error,
  });
}
