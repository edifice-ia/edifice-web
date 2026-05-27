import { NextResponse } from "next/server";
import { getUserRole } from "@/src/lib/auth/roles";
import { getCurrentUser } from "@/src/lib/supabase/server";

const demoLogs = {
  generate: [
    "Chargement du brief TikTok fictif",
    "Génération d'un script court de démonstration",
    "Vérification dry-run obligatoire",
    "Résultat démo prêt sans écriture sensible",
  ],
  simulate_publish: [
    "Préparation d'une publication TikTok fictive",
    "Blocage de tout appel API réel",
    "Simulation du statut de publication",
    "Confirmation : aucun token utilisé",
  ],
};

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
    action?: unknown;
    mode?: unknown;
    dryRun?: unknown;
  };

  if (
    body.mode !== "reviewer-demo" ||
    body.dryRun !== true ||
    (body.action !== "generate" && body.action !== "simulate_publish")
  ) {
    return NextResponse.json(
      {
        error:
          "Requete invalide: action demo, mode reviewer-demo et dryRun=true sont obligatoires.",
      },
      { status: 400 },
    );
  }

  const isPublishSimulation = body.action === "simulate_publish";

  return NextResponse.json({
    status: "completed",
    title: isPublishSimulation
      ? "Simulation publication TikTok"
      : "Génération TikTok démo",
    description: isPublishSimulation
      ? "Publication fictive préparée pour TikTok Review. Le flux s'arrête avant tout appel API réel."
      : "Script court, caption et intention de publication générés avec des données de démonstration.",
    actionLabel: isPublishSimulation
      ? "Simuler publication TikTok"
      : "Tester génération TikTok démo",
    targetedPlatform: "TikTok démo",
    logs: demoLogs[body.action],
    sensitiveActionBlocked: true,
    finalMessage:
      "Mode démo confirmé : aucune publication réelle, aucun token et aucun secret utilisé.",
  });
}
