// Route Academy — étape 2b-2 du chantier 8, ressources pédagogiques. Même patron
// que les routes de la hiérarchie : garde authorizeCockpitApiAccess() en premier
// appel ; identifiant validé (UUID) avant tout appel au store ; JSON illisible :
// 400 ; toute exception : 500 au message générique, détail aux seuls journaux.
// Messages : lib/academy/http.ts.

import { parseResourceCreatePayload } from "@/lib/academy/hierarchy";
import {
  academyBadRequest,
  academyInvalidJson,
  academyStoreResultToReply,
} from "@/lib/academy/http";
import { createResource } from "@/lib/server/academy/resources-store";
import { academyRouteFailure, toAcademyResponse } from "@/lib/server/academy/route-reply";
import { authorizeCockpitApiAccess } from "@/src/lib/auth/api-guards";

export const runtime = "nodejs";

// Création sous un parent vivant (programme ou leçon, chaîne vérifiée jusqu'au programme) :
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

    // Le parser impose exactement un parent, valide son identifiant (UUID),
    // le type, et l'URL (http ou https, sans identifiants) avant tout appel au store.
    const parsed = parseResourceCreatePayload(payload);

    if (!parsed.ok) {
      return toAcademyResponse(academyBadRequest(parsed.error));
    }

    const result = await createResource(user.id, {
      parentLevel: parsed.parentLevel,
      parentId: parsed.parentId,
      kind: parsed.kind,
      title: parsed.title,
      url: parsed.url,
      body: parsed.body,
    });

    return toAcademyResponse(
      academyStoreResultToReply(result, {
        key: "resource",
        notFoundLevel: parsed.parentLevel,
        okStatus: 201,
      }),
    );
  } catch (error) {
    return academyRouteFailure("POST /api/academy/resources", error);
  }
}
