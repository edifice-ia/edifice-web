import type { NextRequest } from "next/server";
import { getAppUrl, getMissingMetaEnv } from "@/lib/oauth/meta";

export async function GET(request: NextRequest) {
  const missing = getMissingMetaEnv();

  if (missing.length > 0) {
    return Response.json({
      ok: false,
      status: "missing_env",
      label: "Missing ENV",
      missing,
      tokenExchangeEnabled: true,
      tokenStorageEnabled: false,
    });
  }

  const callbackUrl = new URL("/api/meta/callback", getAppUrl(request));

  try {
    const response = await fetch(callbackUrl, {
      method: "GET",
      cache: "no-store",
    });
    const payload = (await response.json().catch(() => null)) as
      | { error?: string }
      | null;
    const callbackAccessible =
      response.status === 400 && payload?.error === "missing_code";

    if (!callbackAccessible) {
      return Response.json({
        ok: false,
        status: "callback_inaccessible",
        label: "Callback inaccessible",
        tokenExchangeEnabled: true,
        tokenStorageEnabled: false,
      });
    }

    return Response.json({
      ok: true,
      status: "ok",
      label: "OK",
      tokenExchangeEnabled: true,
      tokenStorageEnabled: false,
    });
  } catch (error) {
    console.error("[meta-oauth] callback health check failed", {
      message: error instanceof Error ? error.message : "unknown_error",
    });

    return Response.json({
      ok: false,
      status: "callback_inaccessible",
      label: "Callback inaccessible",
      tokenExchangeEnabled: true,
      tokenStorageEnabled: false,
    });
  }
}
