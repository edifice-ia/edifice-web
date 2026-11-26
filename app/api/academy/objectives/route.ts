// Route Academy — étape 2b-1 du chantier 8, objectifs pédagogiques. Même patron
// que les routes de la hiérarchie : garde authorizeCockpitApiAccess() en premier
// appel ; identifiant validé (UUID) avant tout appel au store ; JSON illisible :
// 400 ; toute exception : 500 au message générique, détail aux seuls journaux.
// Messages : lib/academy/http.ts.

import { parseObjectiveCreatePayload } from "@/lib/academy/hierarchy";
import {
  academyBadRequest,
  academyInvalidJson,
  academyStoreResultToReply,
} from "@/lib/academy/http";
import { createObjective } from "@/lib/server/academy/objectives-store";
import { academyRouteFailure, toAcademyResponse } from "@/lib/server/academy/route-reply";
import { authorizeCockpitApiAccess } from "@/src/lib/auth/api-guards";

export const runtime = "nodejs";

// Création sous un parent vivant (programme, matière, module ou chapitre) :
// parent absent, d'un autre compte, archivé ou masqué par un ancêtre archivé
// répond 404 au nom du parent.
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

    // Le parser impose exactement un parent et valide son identifiant (UUID)
    // avant tout appel au store.
    const parsed = parseObjectiveCreatePayload(payload);

    if (!parsed.ok) {
      return toAcademyResponse(academyBadRequest(parsed.error));
    }

    const result = await createObjective(user.id, {
      parentLevel: parsed.parentLevel,
      parentId: parsed.parentId,
      title: parsed.title,
      description: parsed.description,
    });

    return toAcademyResponse(
      academyStoreResultToReply(result, {
        key: "objective",
        notFoundLevel: parsed.parentLevel,
        okStatus: 201,
      }),
    );
  } catch (error) {
    return academyRouteFailure("POST /api/academy/objectives", error);
  }
}
