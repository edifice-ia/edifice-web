// Route Academy — étape 2a du chantier 8. Patron commun aux 15 routes :
// garde authorizeCockpitApiAccess() en premier appel ; identifiant d'URL validé
// (UUID) avant tout appel au store ; JSON illisible : 400 ; toute exception :
// 500 au message générique, détail aux seuls journaux. Messages : lib/academy/http.ts.

import { isUuid, parseChildUpdatePayload } from "@/lib/academy/hierarchy";
import {
  academyBadRequest,
  academyInvalidJson,
  academyNotFound,
  academyStoreResultToReply,
} from "@/lib/academy/http";
import { archiveNode, updateChild } from "@/lib/server/academy/hierarchy-store";
import { academyRouteFailure, toAcademyResponse } from "@/lib/server/academy/route-reply";
import { authorizeCockpitApiAccess } from "@/src/lib/auth/api-guards";

export const runtime = "nodejs";

type Context = { params: Promise<{ id: string }> };

// Mise à jour : titre, description, position. Changer de parent est refusé.
export async function PATCH(request: Request, context: Context) {
  try {
    const { user, response } = await authorizeCockpitApiAccess();

    if (!user) {
      return response;
    }

    const { id } = await context.params;

    if (!isUuid(id)) {
      return toAcademyResponse(academyNotFound("subject"));
    }

    let payload: unknown;

    try {
      payload = await request.json();
    } catch {
      return toAcademyResponse(academyInvalidJson());
    }

    const parsed = parseChildUpdatePayload("subject", payload);

    if (!parsed.ok) {
      return toAcademyResponse(academyBadRequest(parsed.error));
    }

    const result = await updateChild("subject", user.id, id, parsed.updates);

    return toAcademyResponse(
      academyStoreResultToReply(result, { key: "subject", notFoundLevel: "subject" }),
    );
  } catch (error) {
    return academyRouteFailure("PATCH /api/academy/subjects/[id]", error);
  }
}

// ARCHIVE, ne supprime pas. Les descendants sont masqués à la lecture.
export async function DELETE(_request: Request, context: Context) {
  try {
    const { user, response } = await authorizeCockpitApiAccess();

    if (!user) {
      return response;
    }

    const { id } = await context.params;

    if (!isUuid(id)) {
      return toAcademyResponse(academyNotFound("subject"));
    }

    const result = await archiveNode("subject", user.id, id);

    return toAcademyResponse(
      academyStoreResultToReply(result, { key: null, notFoundLevel: "subject" }),
    );
  } catch (error) {
    return academyRouteFailure("DELETE /api/academy/subjects/[id]", error);
  }
}
