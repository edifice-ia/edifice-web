import { NextResponse } from "next/server";
import { getOAuthTokenStatus } from "@/lib/server/oauth/token-store";
import { getCurrentUser } from "@/src/lib/supabase/server";

// Deliberately guarded on session only, NOT on canAccessPrivateCockpit: this
// path is part of reviewerAllowedPaths (src/lib/supabase/proxy.ts) and the
// TikTok reviewer account must keep reading it during app review, while
// canAccessPrivateCockpit returns false for the reviewer role. The middleware
// already redirects anonymous callers on this path; this check is the
// defence-in-depth copy, so the route stops being readable without a session
// even if the reviewer allowlist changes.
//
// Reevalue le 2026-08-01. Ce que l'ecart autorise exactement, pour qu'il ne
// soit pas relu comme une route ouverte :
//
// - il n'y a AUCUN acces anonyme. Sans session, la route repond 403 et le
//   middleware redirige deja vers /login. Le compromis ne porte que sur le
//   filtre de role ;
// - canAccessPrivateCockpit(user) vaut getUserRole(user) !== "reviewer". La
//   difference entre ce garde et le garde strict est donc exactement un role,
//   celui du compte reviewer@edificeia.com, cree et controle par le projet ;
// - la reponse ne contient ni token, ni identifiant de compte, ni scope :
//   { present, storageEnabled, storageMode, expiresAt, updatedAt }. Le reviewer
//   voit qu'un token TikTok existe et depuis quand, rien de plus — strictement
//   moins que ce que le flux OAuth et l'upload sandbox lui accordent deja.
//
// Ne pas restreindre la charge utile a `present` seul tant que la review est en
// cours : la page /tiktok-sandbox-test affiche les quatre champs, et les vider
// degraderait la page pendant qu'elle est justement examinee.
//
// Condition de sortie : quand la review TikTok est terminee, retirer
// "/api/oauth/tiktok/status" de reviewerAllowedPaths et ajouter
// canAccessPrivateCockpit ici, comme youtube/status et calendar/status. Voir
// l'entree du 2026-08-01 dans MANUAL_ACTIONS.md — l'etat de la review ne se lit
// que dans le portail developpeur TikTok.
export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Acces refuse." }, { status: 403 });
  }

  return Response.json(await getOAuthTokenStatus("tiktok"));
}
