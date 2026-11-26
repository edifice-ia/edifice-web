// Route Academy — étape 2b-1 du chantier 8, objectifs pédagogiques. Même patron
// que les routes de la hiérarchie : garde authorizeCockpitApiAccess() en premier
// appel ; identifiant d'URL validé (UUID) avant tout appel au store ; toute
// exception : 500 au message générique, détail aux seuls journaux.

import { isUuid } from "@/lib/academy/hierarchy";
import { academyNotFound, academyStoreResultToReply } from "@/lib/academy/http";
import { restoreObjective } from "@/lib/server/academy/objectives-store";
import { academyRouteFailure, toAcademyResponse } from "@/lib/server/academy/route-reply";
import { authorizeCockpitApiAccess } from "@/src/lib/auth/api-guards";

export const runtime = "nodejs";

type Context = { params: Promise<{ id: string }> };

// Restauration refusée (404) si le parent de l'objectif, ou un de ses ancêtres,
// est archivé : l'objectif resterait masqué.
export async function POST(_request: Request, context: Context) {
  try {
    const { user, response } = await authorizeCockpitApiAccess();

    if (!user) {
      return response;
    }

    const { id } = await context.params;

    if (!isUuid(id)) {
      return toAcademyResponse(academyNotFound("objective"));
    }

    const result = await restoreObjective(user.id, id);

    return toAcademyResponse(
      academyStoreResultToReply(result, { key: null, notFoundLevel: "objective" }),
    );
  } catch (error) {
    return academyRouteFailure("POST /api/academy/objectives/[id]/restore", error);
  }
}
