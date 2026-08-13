import { NextResponse } from "next/server";
import {
  ERASURE_CONFIRMATION_WORD,
  parseErasureRequest,
} from "@/lib/personal/data-erasure";
import {
  erasePersonalModules,
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
//   3. identifiants de module passes par liste blanche, aucun nom de table ne
//      venant du client ;
//   4. l'execution passe par la cle service-role, seule capable de supprimer,
//      et le filtre .eq("user_id", ...) y est centralise dans une fonction
//      unique du store.
//
// Ce geste n'est PAS une suppression de compte : il vide l'historique des
// modules selectionnes et ne touche ni au compte, ni aux connexions, ni aux
// autres poles.
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
    const results = await erasePersonalModules({
      userId: user.id,
      modules: parsed.modules,
    });

    console.info("[Personal Erasure] modules vides", {
      userId: user.id,
      modules: results.map((result) => `${result.id}:${result.deletedCount}`).join(","),
    });

    return NextResponse.json({ ok: true, results, confirmation: ERASURE_CONFIRMATION_WORD });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Suppression definitive indisponible.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
