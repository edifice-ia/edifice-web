// Route Academy — étape 2a du chantier 8. Patron commun aux 15 routes :
// garde authorizeCockpitApiAccess() en premier appel ; identifiant d'URL validé
// (UUID) avant tout appel au store ; JSON illisible : 400 ; toute exception :
// 500 au message générique, détail aux seuls journaux. Messages : lib/academy/http.ts.

import { isUuid, parseProgramUpdatePayload } from "@/lib/academy/hierarchy";
import {
  academyBadRequest,
  academyInvalidJson,
  academyNotFound,
  academyStoreResultToReply,
} from "@/lib/academy/http";
import {
  archiveNode,
  getLiveProgramTree,
  updateProgram,
} from "@/lib/server/academy/hierarchy-store";
import { academyRouteFailure, toAcademyResponse } from "@/lib/server/academy/route-reply";
import { authorizeCockpitApiAccess } from "@/src/lib/auth/api-guards";

export const runtime = "nodejs";

type Context = { params: Promise<{ id: string }> };

// Arbre vivant du programme. Le contenu des leçons n'y figure pas : il se lit
// par GET /api/academy/lessons/[id].
export async function GET(_request: Request, context: Context) {
  try {
    const { user, response } = await authorizeCockpitApiAccess();

    if (!user) {
      return response;
    }

    const { id } = await context.params;

    if (!isUuid(id)) {
      return toAcademyResponse(academyNotFound("program"));
    }

    const result = await getLiveProgramTree(user.id, id);

    return toAcademyResponse(
      academyStoreResultToReply(result, { key: "program", notFoundLevel: "program" }),
    );
  } catch (error) {
    return academyRouteFailure("GET /api/academy/programs/[id]", error);
  }
}

export async function PATCH(request: Request, context: Context) {
  try {
    const { user, response } = await authorizeCockpitApiAccess();

    if (!user) {
      return response;
    }

    const { id } = await context.params;

    if (!isUuid(id)) {
      return toAcademyResponse(academyNotFound("program"));
    }

    let payload: unknown;

    try {
      payload = await request.json();
    } catch {
      return toAcademyResponse(academyInvalidJson());
    }

    const parsed = parseProgramUpdatePayload(payload);

    if (!parsed.ok) {
      return toAcademyResponse(academyBadRequest(parsed.error));
    }

    const result = await updateProgram(user.id, id, parsed.updates);

    return toAcademyResponse(
      academyStoreResultToReply(result, { key: "program", notFoundLevel: "program" }),
    );
  } catch (error) {
    return academyRouteFailure("PATCH /api/academy/programs/[id]", error);
  }
}

// ARCHIVE, ne supprime pas. Les enfants ne sont pas archivés : la lecture les
// masque, et la restauration du programme les fait réapparaître.
export async function DELETE(_request: Request, context: Context) {
  try {
    const { user, response } = await authorizeCockpitApiAccess();

    if (!user) {
      return response;
    }

    const { id } = await context.params;

    if (!isUuid(id)) {
      return toAcademyResponse(academyNotFound("program"));
    }

    const result = await archiveNode("program", user.id, id);

    return toAcademyResponse(
      academyStoreResultToReply(result, { key: null, notFoundLevel: "program" }),
    );
  } catch (error) {
    return academyRouteFailure("DELETE /api/academy/programs/[id]", error);
  }
}
