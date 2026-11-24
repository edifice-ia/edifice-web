// Route Academy — étape 2a du chantier 8. Patron commun aux 15 routes :
// garde authorizeCockpitApiAccess() en premier appel ; identifiant d'URL validé
// (UUID) avant tout appel au store ; JSON illisible : 400 ; toute exception :
// 500 au message générique, détail aux seuls journaux. Messages : lib/academy/http.ts.

import { parseChildCreatePayload } from "@/lib/academy/hierarchy";
import {
  academyBadRequest,
  academyInvalidJson,
  academyStoreResultToReply,
} from "@/lib/academy/http";
import { createChild } from "@/lib/server/academy/hierarchy-store";
import { academyRouteFailure, toAcademyResponse } from "@/lib/server/academy/route-reply";
import { authorizeCockpitApiAccess } from "@/src/lib/auth/api-guards";

export const runtime = "nodejs";

// Création sous un parent vivant : parent absent, d'un autre compte, archivé ou
// masqué par un ancêtre archivé répond 404 au nom du parent.
export async function POST(request: Request) {
  try {
    const { user, response } = await authorizeCockpitApiAccess();

    if (!user) {
      return response;
    }

    let payload: unknown;

    try {
      payload = await request.json();
    } catch {
      return toAcademyResponse(academyInvalidJson());
    }

    // Le parser valide l'identifiant du parent (UUID) avant tout appel au store.
    const parsed = parseChildCreatePayload("chapter", payload);

    if (!parsed.ok) {
      return toAcademyResponse(academyBadRequest(parsed.error));
    }

    const result = await createChild("chapter", user.id, {
      parentId: parsed.parentId,
      title: parsed.title,
      text: parsed.text,
      position: parsed.position,
    });

    return toAcademyResponse(
      academyStoreResultToReply(result, { key: "chapter", notFoundLevel: "unit", okStatus: 201 }),
    );
  } catch (error) {
    return academyRouteFailure("POST /api/academy/chapters", error);
  }
}
