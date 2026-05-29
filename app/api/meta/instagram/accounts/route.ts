import { META_ACCOUNTS_URL } from "@/lib/oauth/meta";
import { getOAuthToken } from "@/lib/server/oauth/token-store";

export async function GET() {
  const storedMetaToken = await getOAuthToken("meta");

  if (!storedMetaToken?.accessToken) {
    return Response.json(
      {
        ok: false,
        error: "missing_meta_token",
        tokenStorageEnabled: true,
        tokenStorageMode: "supabase",
        futureFlow: [
          `GET ${META_ACCOUNTS_URL}`,
          "Lire le champ instagram_business_account sur les pages connectees.",
        ],
      },
      { status: 401 },
    );
  }

  // Future implementation:
  // 1. GET https://graph.facebook.com/v19.0/me/accounts?access_token=...
  // 2. Pour chaque page, lire instagram_business_account.
  // 3. Ne jamais retourner le token au client.
  return Response.json({ ok: true, accounts: [] });
}
