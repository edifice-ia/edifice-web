import { NextResponse } from "next/server";
import {
  ERASURE_CONFIRMATION_WORD,
  parseErasureRequest,
} from "@/lib/personal/data-erasure";
import {
  erasePersonalModule,
  summarizePersonalErasure,
} from "@/lib/server/personal/data-erasure-store";
import { canAccessPrivateCockpit } from "@/src/lib/auth/roles";
import { getCurrentUser } from "@/src/lib/supabase/server";

export const runtime = "nodejs";

// Garde commun aux deux verbes. DEC-007 pose getCurrentUser() +
// canAccessPrivateCockpit comme garde par defaut du cockpit prive ; cette route
// ne posait que le premier, alors qu'elle est la seule du depot a supprimer
// physiquement des donnees.
//
// Les deux cas sont distingues plutot que fondus dans un 403 unique : 401 dit
// "authentifie-toi", 403 dit "ce compte n'a pas le droit". Les confondre
// enverrait un reviewer deja connecte sur un ecran de connexion.
//
// Le rang reviewer est le seul refuse aujourd'hui (canAccessPrivateCockpit vaut
// getUserRole(user) !== "reviewer"). Le middleware bloque deja /interface pour
// ce role, mais pas /api/personal — sans ce garde, la route restait joignable
// par appel direct.
async function authorizeErasureAccess() {
  const user = await getCurrentUser();

  if (!user) {
    return { user: null, response: NextResponse.json({ error: "Acces refuse." }, { status: 401 }) };
  }

  if (!canAccessPrivateCockpit(user)) {
    return { user: null, response: NextResponse.json({ error: "Acces refuse." }, { status: 403 }) };
  }

  return { user, response: null };
}

// GET decrit ce que la suppression effacerait : un compte par module, archives
// comprises. POST l'execute. La ressource est l'operation d'effacement, ce qui
// rend les deux verbes coherents sur le meme chemin.
export async function GET() {
  const { user, response } = await authorizeErasureAccess();

  if (!user) {
    return response;
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
// Cinq gardes, dans cet ordre :
//   1. session obligatoire (401 sans session) ;
//   2. role autorise sur le cockpit prive (403 pour un reviewer) ;
//   3. mot de confirmation revalide cote serveur — la confirmation de
//      l'interface ne suffit pas, la route doit rester infranchissable si on
//      la court-circuite ;
//   4. identifiant de module passe par liste blanche, aucun nom de table ne
//      venant du client ;
//   5. l'execution passe par la cle service-role, seule capable de supprimer,
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
  const { user, response } = await authorizeErasureAccess();

  if (!user) {
    return response;
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
