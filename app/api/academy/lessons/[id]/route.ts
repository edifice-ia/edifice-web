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
import { archiveNode, getLiveLesson, updateChild } from "@/lib/server/academy/hierarchy-store";
import { academyRouteFailure, toAcademyResponse } from "@/lib/server/academy/route-reply";
import { authorizeCockpitApiAccess } from "@/src/lib/auth/api-guards";

export const runtime = "nodejs";

type Context = { params: Promise<{ id: string }> };

// Leçon avec son contenu, si toute sa chaîne est vivante.
export async function GET(_request: Request, context: Context) {
  try {
    const { user, response } = await authorizeCockpitApiAccess();

    if (!user) {
      return response;
    }

    const { id } = await context.params;

    if (!isUuid(id)) {
      return toAcademyResponse(academyNotFound("lesson"));
    }

    const result = await getLiveLesson(user.id, id);

    return toAcademyResponse(
      academyStoreResultToReply(result, { key: "lesson", notFoundLevel: "lesson" }),
    );
  } catch (error) {
    return academyRouteFailure("GET /api/academy/lessons/[id]", error);
  }
}

// Mise à jour : titre, contenu, position. Changer de parent est refusé.
export async function PATCH(request: Request, context: Context) {
  try {
    const { user, response } = await authorizeCockpitApiAccess();

    if (!user) {
      return response;
    }

    const { id } = await context.params;

    if (!isUuid(id)) {
      return toAcademyResponse(academyNotFound("lesson"));
    }

    let payload: unknown;

    try {
      payload = await request.json();
    } catch {
      return toAcademyResponse(academyInvalidJson());
    }

    const parsed = parseChildUpdatePayload("lesson", payload);

    if (!parsed.ok) {
      return toAcademyResponse(academyBadRequest(parsed.error));
    }

    const result = await updateChild("lesson", user.id, id, parsed.updates);

    return toAcademyResponse(
      academyStoreResultToReply(result, { key: "lesson", notFoundLevel: "lesson" }),
    );
  } catch (error) {
    return academyRouteFailure("PATCH /api/academy/lessons/[id]", error);
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
      return toAcademyResponse(academyNotFound("lesson"));
    }

    const result = await archiveNode("lesson", user.id, id);

    return toAcademyResponse(
      academyStoreResultToReply(result, { key: null, notFoundLevel: "lesson" }),
    );
  } catch (error) {
    return academyRouteFailure("DELETE /api/academy/lessons/[id]", error);
  }
}
