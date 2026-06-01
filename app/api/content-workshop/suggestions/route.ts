import { NextResponse } from "next/server";
import { canAccessPrivateCockpit } from "@/src/lib/auth/roles";
import { getCurrentUser } from "@/src/lib/supabase/server";

type OpenAIResponsePayload = {
  output_text?: string;
  output?: Array<{
    content?: Array<{
      text?: string;
      type?: string;
    }>;
  }>;
};

type SuggestionPayload = {
  themes: string[];
  angles: string[];
  emotions: string[];
};

export const runtime = "nodejs";

function normalizeText(value: unknown, maxLength: number) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim().replace(/\s+/g, " ").slice(0, maxLength);
}

function normalizeList(value: unknown, maxLength: number) {
  const items = Array.isArray(value) ? value : [];

  return items
    .map((item) => normalizeText(item, maxLength))
    .filter(Boolean)
    .slice(0, 5);
}

function extractOpenAIText(payload: OpenAIResponsePayload) {
  if (payload.output_text?.trim()) {
    return payload.output_text.trim();
  }

  return (
    payload.output
      ?.flatMap((item) => item.content ?? [])
      .map((content) => content.text)
      .filter((text): text is string => Boolean(text?.trim()))
      .join("\n")
      .trim() ?? ""
  );
}

function extractJsonObject(text: string) {
  const trimmed = text.trim();

  try {
    return JSON.parse(trimmed) as Record<string, unknown>;
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");

    if (start >= 0 && end > start) {
      return JSON.parse(trimmed.slice(start, end + 1)) as Record<string, unknown>;
    }

    throw new Error("OpenAI n'a pas retourne de suggestions JSON exploitables.");
  }
}

function normalizeSuggestions(data: Record<string, unknown>): SuggestionPayload {
  const themes = normalizeList(data.themes ?? data.subjects ?? data.ideas, 120);
  const angles = normalizeList(data.angles, 180);
  const emotions = normalizeList(data.emotions, 80);

  if (themes.length === 0 || angles.length === 0 || emotions.length === 0) {
    throw new Error("Les suggestions OpenAI sont incompletes.");
  }

  return { themes, angles, emotions };
}

function buildSuggestionPrompt({
  theme,
  angle,
  emotion,
}: {
  theme: string;
  angle: string;
  emotion: string;
}) {
  return [
    "Tu aides L'Edifice a trouver des idees avant generation de brouillon.",
    "Univers: introspection, psychologie sociale, relations, solitude, respect, pouvoir discret, lucidité calme.",
    "Formats futurs: TikTok, Instagram Reels, YouTube Shorts.",
    "",
    `Sujet deja saisi: ${theme || "non precise"}`,
    `Angle deja saisi: ${angle || "non precise"}`,
    `Emotion deja saisie: ${emotion || "non precise"}`,
    "",
    "Genere des propositions coherentes avec ce qui est deja saisi.",
    "Reste concret, court, oral, non generique.",
    "Ne cree aucune publication, aucun planning, aucune sauvegarde.",
    "",
    "Reponds uniquement en JSON valide avec exactement ces cles:",
    "{ themes, angles, emotions }",
    "Chaque cle contient exactement 5 chaines courtes en francais.",
  ].join("\n");
}

export async function POST(request: Request) {
  const user = await getCurrentUser();

  if (!user || !canAccessPrivateCockpit(user)) {
    return NextResponse.json({ error: "Acces refuse." }, { status: 403 });
  }

  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Requete invalide: JSON attendu." },
      { status: 400 },
    );
  }

  const record = payload && typeof payload === "object"
    ? payload as Record<string, unknown>
    : {};
  const apiKey = process.env.OPENAI_API_KEY?.trim();

  if (!apiKey) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY est requis pour generer des suggestions." },
      { status: 400 },
    );
  }

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL?.trim() || "gpt-4.1-mini",
        instructions: [
          "Tu es l'assistant d'ideation de l'Atelier de contenu de L'Edifice.",
          "Tu reponds uniquement en JSON valide.",
        ].join("\n"),
        input: buildSuggestionPrompt({
          theme: normalizeText(record.theme, 180),
          angle: normalizeText(record.angle, 240),
          emotion: normalizeText(record.emotion, 80),
        }),
        max_output_tokens: 900,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI response failed with status ${response.status}.`);
    }

    const text = extractOpenAIText(await response.json() as OpenAIResponsePayload);
    const suggestions = normalizeSuggestions(extractJsonObject(text));

    return NextResponse.json({ suggestions });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Generation des suggestions indisponible.",
      },
      { status: 400 },
    );
  }
}
