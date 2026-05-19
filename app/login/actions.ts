"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/src/lib/supabase/server";

export type LoginState = {
  error?: string;
};

function getSafeSupabaseUrlPrefix() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!url) {
    return {
      present: false,
      prefix: null,
    };
  }

  try {
    const parsed = new URL(url);

    return {
      present: true,
      prefix: parsed.origin.slice(0, 32),
    };
  } catch {
    return {
      present: true,
      prefix: url.slice(0, 16),
    };
  }
}

function getSupabaseErrorDetails(error: unknown) {
  if (!error || typeof error !== "object") {
    return {
      name: "UnknownError",
      message: "Erreur inconnue",
      status: undefined,
      code: undefined,
    };
  }

  const record = error as Record<string, unknown>;

  return {
    name: typeof record.name === "string" ? record.name : "SupabaseError",
    message:
      typeof record.message === "string" ? record.message : "Erreur inconnue",
    status:
      typeof record.status === "number" || typeof record.status === "string"
        ? record.status
        : undefined,
    code:
      typeof record.code === "string" || typeof record.code === "number"
        ? record.code
        : undefined,
  };
}

function getLoginErrorMessage(error: unknown) {
  const details = getSupabaseErrorDetails(error);
  const code = String(details.code ?? "").toLowerCase();
  const message = details.message.toLowerCase();

  if (
    code.includes("invalid") ||
    message.includes("invalid login credentials")
  ) {
    return "Identifiants invalides";
  }

  if (
    code.includes("email_not_confirmed") ||
    message.includes("email not confirmed") ||
    message.includes("email confirmation")
  ) {
    return "Email non confirme";
  }

  return "Erreur Supabase : voir terminal";
}

function logSupabaseLoginError(error: unknown) {
  const url = getSafeSupabaseUrlPrefix();
  const details = getSupabaseErrorDetails(error);

  console.error("[Supabase login] diagnostic", {
    supabaseUrlPresent: url.present,
    supabaseUrlPrefix: url.prefix,
    errorName: details.name,
    errorMessage: details.message,
    errorStatus: details.status,
    errorCode: details.code,
  });
}

export async function login(
  _previousState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Email et mot de passe sont obligatoires." };
  }

  const supabase = await createClient();

  if (!supabase) {
    const url = getSafeSupabaseUrlPrefix();

    console.error("[Supabase login] configuration missing", {
      supabaseUrlPresent: url.present,
      supabaseUrlPrefix: url.prefix,
      anonKeyPresent: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    });

    return {
      error: "Configuration Supabase manquante",
    };
  }

  let error: unknown = null;

  try {
    const result = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    error = result.error;
  } catch (caughtError) {
    error = caughtError;
  }

  if (error) {
    logSupabaseLoginError(error);

    return {
      error: getLoginErrorMessage(error),
    };
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function logout() {
  const supabase = await createClient();

  if (supabase) {
    await supabase.auth.signOut();
  }

  revalidatePath("/", "layout");
  redirect("/login");
}
