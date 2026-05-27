import { NextResponse } from "next/server";
import { getUserRole } from "@/src/lib/auth/roles";
import { getCurrentUser } from "@/src/lib/supabase/server";

const logs = [
  "Initialisation de l'agent demo",
  "Verification de l'environnement securise",
  "Generation du contenu de test",
  "Preparation multi-plateforme",
  "Verification anti-publication reelle",
  "Finalisation du resultat reviewer",
];

export async function POST(request: Request) {
  const user = await getCurrentUser();
  const role = getUserRole(user);

  if (!user || (role !== "reviewer" && role !== "admin")) {
    return NextResponse.json(
      { error: "Accès limité au mode démo reviewer." },
      { status: 403 },
    );
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

  const body = payload as {
    mode?: unknown;
    dryRun?: unknown;
    reviewer?: unknown;
  };

  if (body.mode !== "reviewer-demo" || body.dryRun !== true) {
    return NextResponse.json(
      {
        error:
          "Requete invalide: mode reviewer-demo et dryRun=true sont obligatoires.",
      },
      { status: 400 },
    );
  }

  const startedAt = Date.now();

  await new Promise((resolve) => setTimeout(resolve, 550));

  return NextResponse.json({
    status: "completed",
    title: "Demo reviewer - L’Édifice",
    description:
      "Publication de test preparee par l'agent demo du Cockpit Web. Ce contenu illustre le workflow sans diffusion reelle.",
    targetedPlatforms: ["TikTok démo"],
    logs,
    approximateDurationMs: Date.now() - startedAt,
    finalMessage:
      "Publication de demonstration preparee. Aucune diffusion reelle effectuee.",
  });
}
