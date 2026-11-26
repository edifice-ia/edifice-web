// Route Academy — étape 2b-1 du chantier 8, objectifs pédagogiques. Même patron
// que les routes de la hiérarchie : garde authorizeCockpitApiAccess() en premier
// appel ; identifiant d'URL validé (UUID) avant tout appel au store ; toute
// exception : 500 au message générique, détail aux seuls journaux. Pas de GET ni
// de PATCH : les pages lisent le store, et un objectif ne se modifie pas.

import { isUuid } from "@/lib/academy/hierarchy";
import { academyNotFound, academyStoreResultToReply } from "@/lib/academy/http";
import { archiveObjective } from "@/lib/server/academy/objectives-store";
import { academyRouteFailure, toAcademyResponse } from "@/lib/server/academy/route-reply";
import { authorizeCockpitApiAccess } from "@/src/lib/auth/api-guards";

export const runtime = "nodejs";

type Context = { params: Promise<{ id: string }> };

// ARCHIVE, ne supprime pas. Objectif inexistant, d'un autre compte, déjà archivé
// ou dont le parent est archivé ou masqué : 404.
export async function DELETE(_request: Request, context: Context) {
  try {
    const { user, response } = await authorizeCockpitApiAccess();

    if (!user) {
      return response;
    }

    const { id } = await context.params;

    if (!isUuid(id)) {
      return toAcademyResponse(academyNotFound("objective"));
    }

    const result = await archiveObjective(user.id, id);

    return toAcademyResponse(
      academyStoreResultToReply(result, { key: null, notFoundLevel: "objective" }),
    );
  } catch (error) {
    return academyRouteFailure("DELETE /api/academy/objectives/[id]", error);
  }
}
