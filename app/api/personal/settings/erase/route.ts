import { NextResponse } from "next/server";
import {
  ERASURE_CONFIRMATION_WORD,
  parseErasureRequest,
} from "@/lib/personal/data-erasure";
import {
  erasePersonalModule,
  summarizePersonalErasure,
} from "@/lib/server/personal/data-erasure-store";
import { getCurrentUser } from "@/src/lib/supabase/server";

export const runtime = "nodejs";

// GET decrit ce que la suppression effacerait : un compte par module, archives
// comprises. POST l'execute. La ressource est l'operation d'effacement, ce qui
// rend les deux verbes coherents sur le meme chemin.
export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Acces refuse." }, { status: 401 });
  }

  try {
    const modules = await summarizePersonalErasure(user.id);

    return NextResponse.json({ ok: true, modules });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Lecture des volumes indisponible.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// SUPPRESSION PHYSIQUE ET IRREVERSIBLE. Seule route du depot dans ce cas.
//
// Quatre gardes, dans cet ordre :
//   1. session obligatoire ;
//   2. mot de confirmation revalide cote serveur — la confirmation de
//      l'interface ne suffit pas, la route doit rester infranchissable si on
//      la court-circuite ;
//   3. identifiant de module passe par liste blanche, aucun nom de table ne
//      venant du client ;
//   4. l'execution passe par la cle service-role, seule capable de supprimer,
//      et le filtre .eq("user_id", ...) y est centralise dans une fonction
//      unique du store.
//
// UN module par requete, jamais une liste. Une requete ne peut donc decrire
// qu'un seul effacement : il n'existe plus d'etat ou un module serait supprime
// et un autre non, ni de reponse composite a interpreter.
//
// Ce geste n'est PAS une suppression de compte : il vide l'historique du module
// vise et ne touche ni au compte, ni aux connexions, ni aux autres modules du
// pole, ni aux autres poles.
export async function POST(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Acces refuse." }, { status: 401 });
  }

  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Requete invalide: JSON attendu." }, { status: 400 });
  }

  const parsed = parseErasureRequest(payload);

  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  try {
    const result = await erasePersonalModule({
      userId: user.id,
      moduleId: parsed.module,
    });

    console.info("[Personal Erasure] module vide", {
      userId: user.id,
      module: result.id,
      deletedCount: result.deletedCount,
      relatedDeletedCount: result.relatedDeletedCount,
    });

    return NextResponse.json({ ok: true, result, confirmation: ERASURE_CONFIRMATION_WORD });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Suppression definitive indisponible.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
