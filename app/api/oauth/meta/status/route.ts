import { getMetaOAuthStatusPayload } from "@/lib/server/oauth/status-payloads";

export async function GET() {
  return Response.json(getMetaOAuthStatusPayload());
}
