// Route Academy — étape 2b-2 du chantier 8, ressources pédagogiques. Même patron
// que les routes de la hiérarchie : garde authorizeCockpitApiAccess() en premier
// appel ; identifiant d'URL validé (UUID) avant tout appel au store ; toute
// exception : 500 au message générique, détail aux seuls journaux.

import { isUuid } from "@/lib/academy/hierarchy";
import { academyNotFound, academyStoreResultToReply } from "@/lib/academy/http";
import { restoreResource } from "@/lib/server/academy/resources-store";
import { academyRouteFailure, toAcademyResponse } from "@/lib/server/academy/route-reply";
import { authorizeCockpitApiAccess } from "@/src/lib/auth/api-guards";

export const runtime = "nodejs";

type Context = { params: Promise<{ id: string }> };

// Restauration refusée (404) si le parent de la ressource, ou un de ses ancêtres,
// est archivé : la ressource resterait masquée.
export async function POST(_request: Request, context: Context) {
  try {
    const { user, response } = await authorizeCockpitApiAccess();

    if (!user) {
      return response;
    }

    const { id } = await context.params;

    if (!isUuid(id)) {
      return toAcademyResponse(academyNotFound("resource"));
    }

    const result = await restoreResource(user.id, id);

    return toAcademyResponse(
      academyStoreResultToReply(result, { key: null, notFoundLevel: "resource" }),
    );
  } catch (error) {
    return academyRouteFailure("POST /api/academy/resources/[id]/restore", error);
  }
}
