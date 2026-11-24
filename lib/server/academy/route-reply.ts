import { NextResponse } from "next/server";
import { academyUnavailable, type AcademyHttpReply } from "@/lib/academy/http";

// Passage d'une réponse décrite par lib/academy/http.ts à une NextResponse, et
// traitement unique des pannes des routes Academy.

export function toAcademyResponse(reply: AcademyHttpReply) {
  return NextResponse.json(reply.body, { status: reply.status });
}

// Toute exception d'une route Academy aboutit ici : le détail va aux journaux du
// serveur, l'appelant reçoit le message générique. Aucune route ne renvoie le
// message d'une erreur.
export function academyRouteFailure(context: string, error: unknown) {
  const detail = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  console.error("[academy-route]", context, detail);
  return toAcademyResponse(academyUnavailable());
}
