// Route Academy — étape 2a du chantier 8. Patron commun aux 15 routes :
// garde authorizeCockpitApiAccess() en premier appel ; identifiant d'URL validé
// (UUID) avant tout appel au store ; JSON illisible : 400 ; toute exception :
// 500 au message générique, détail aux seuls journaux. Messages : lib/academy/http.ts.

import { parseProgramCreatePayload } from "@/lib/academy/hierarchy";
import {
  academyBadRequest,
  academyInvalidJson,
  academyOk,
  academyStoreResultToReply,
} from "@/lib/academy/http";
import {
  createProgram,
  listArchivedPrograms,
  listLivePrograms,
} from "@/lib/server/academy/hierarchy-store";
import { academyRouteFailure, toAcademyResponse } from "@/lib/server/academy/route-reply";
import { authorizeCockpitApiAccess } from "@/src/lib/auth/api-guards";

export const runtime = "nodejs";

// Programmes vivants, ou archivés avec ?archived=true.
export async function GET(request: Request) {
  try {
    const { user, response } = await authorizeCockpitApiAccess();

    if (!user) {
      return response;
    }

    const archived = new URL(request.url).searchParams.get("archived") === "true";
    const programs = archived
      ? await listArchivedPrograms(user.id)
      : await listLivePrograms(user.id);

    return toAcademyResponse(academyOk({ programs }));
  } catch (error) {
    return academyRouteFailure("GET /api/academy/programs", error);
  }
}

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

    const parsed = parseProgramCreatePayload(payload);

    if (!parsed.ok) {
      return toAcademyResponse(academyBadRequest(parsed.error));
    }

    const result = await createProgram(user.id, {
      kind: parsed.kind,
      title: parsed.title,
      description: parsed.description,
    });

    return toAcademyResponse(
      academyStoreResultToReply(result, { key: "program", notFoundLevel: "program", okStatus: 201 }),
    );
  } catch (error) {
    return academyRouteFailure("POST /api/academy/programs", error);
  }
}
