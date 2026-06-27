import { NextResponse } from "next/server";
import {
  readSettingsPreferences,
  resetSettingsPreferences,
  saveSettingsPreferences,
} from "@/lib/server/settings-preferences";
import { canAccessPrivateCockpit } from "@/src/lib/auth/roles";
import { getCurrentUser } from "@/src/lib/supabase/server";

export const runtime = "nodejs";

async function authorizeSettingsAccess() {
  const user = await getCurrentUser();

  if (!user || !canAccessPrivateCockpit(user)) {
    return null;
  }

  return user;
}

function errorPayload(error: unknown) {
  return {
    error: error instanceof Error ? error.message : "Reglages indisponibles.",
  };
}

export async function GET() {
  const user = await authorizeSettingsAccess();

  if (!user) {
    return NextResponse.json({ error: "Acces refuse." }, { status: 403 });
  }

  try {
    return NextResponse.json(await readSettingsPreferences(user.id));
  } catch (error) {
    console.error("[Settings Preferences API] GET failed", errorPayload(error));
    return NextResponse.json(errorPayload(error), { status: 400 });
  }
}

export async function POST(request: Request) {
  const user = await authorizeSettingsAccess();

  if (!user) {
    return NextResponse.json({ error: "Acces refuse." }, { status: 403 });
  }

  let payload: Record<string, unknown> = {};
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Requete invalide: JSON attendu." }, { status: 400 });
  }

  try {
    if (payload.action === "reset") {
      return NextResponse.json(await resetSettingsPreferences(user.id));
    }

    return NextResponse.json(
      await saveSettingsPreferences({
        accountPreferences: payload.accountPreferences,
        globalPreferences: payload.globalPreferences,
        userId: user.id,
      }),
    );
  } catch (error) {
    console.error("[Settings Preferences API] POST failed", errorPayload(error));
    return NextResponse.json(errorPayload(error), { status: 400 });
  }
}
