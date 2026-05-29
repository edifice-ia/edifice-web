import { getOAuthTokenStatus } from "@/lib/server/oauth/token-store";

export async function GET() {
  return Response.json(await getOAuthTokenStatus("youtube"));
}
