// Route Academy — étape 2a du chantier 8. Patron commun aux 15 routes :
// garde authorizeCockpitApiAccess() en premier appel ; identifiant d'URL validé
// (UUID) avant tout appel au store ; JSON illisible : 400 ; toute exception :
// 500 au message générique, détail aux seuls journaux. Messages : lib/academy/http.ts.

import { isUuid } from "@/lib/academy/hierarchy";
import { academyNotFound, academyStoreResultToReply } from "@/lib/academy/http";
import { restoreNode } from "@/lib/server/academy/hierarchy-store";
import { academyRouteFailure, toAcademyResponse } from "@/lib/server/academy/route-reply";
import { authorizeCockpitApiAccess } from "@/src/lib/auth/api-guards";

export const runtime = "nodejs";

type Context = { params: Promise<{ id: string }> };

// Restauration refusée (404) si un ancêtre est archivé : l'élément resterait masqué.
export async function POST(_request: Request, context: Context) {
  try {
    const { user, response } = await authorizeCockpitApiAccess();

    if (!user) {
      return response;
    }

    const { id } = await context.params;

    if (!isUuid(id)) {
      return toAcademyResponse(academyNotFound("subject"));
    }

    const result = await restoreNode("subject", user.id, id);

    return toAcademyResponse(
      academyStoreResultToReply(result, { key: null, notFoundLevel: "subject" }),
    );
  } catch (error) {
    return academyRouteFailure("POST /api/academy/subjects/[id]/restore", error);
  }
}
