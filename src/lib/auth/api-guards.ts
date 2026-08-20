import { NextResponse } from "next/server";
import { canAccessPrivateCockpit } from "./roles";
import { getCurrentUser } from "@/src/lib/supabase/server";

// Gardes d'autorisation pour les routes API du cockpit prive.
//
// Volontairement separe de guards.ts, qui garde les PAGES et repond par
// redirect(). Une route API doit renvoyer une reponse JSON : melanger les deux
// natures dans un meme fichier finirait par produire un redirect() dans un
// handler d'API, ou un NextResponse dans un composant serveur.
//
// DEC-007 pose getCurrentUser() + canAccessPrivateCockpit comme garde par
// defaut sous app/api. Ce helper l'implemente une fois, pour que les appelants
// n'aient pas a le reecrire — c'est la reecriture inline qui avait laisse
// /api/personal/settings/erase sans filtre de role jusqu'au 2026-08-18.

export type ApiAuthorization =
  | { user: NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>; response: null }
  | { user: null; response: NextResponse };

// 401 et 403 sont distingues plutot que fondus en un 403 unique comme dans
// meta/instagram/* : 401 dit "authentifie-toi", 403 dit "ce compte n'a pas le
// droit". Les confondre enverrait un reviewer deja connecte sur un ecran de
// connexion, et priverait un client d'API de l'information qui lui permet de
// choisir entre reessayer et abandonner.
//
// Le rang reviewer est le seul refuse aujourd'hui : canAccessPrivateCockpit
// vaut getUserRole(user) !== "reviewer".
export async function authorizeCockpitApiAccess(): Promise<ApiAuthorization> {
  const user = await getCurrentUser();

  if (!user) {
    return {
      user: null,
      response: NextResponse.json({ error: "Acces refuse." }, { status: 401 }),
    };
  }

  if (!canAccessPrivateCockpit(user)) {
    return {
      user: null,
      response: NextResponse.json({ error: "Acces refuse." }, { status: 403 }),
    };
  }

  return { user, response: null };
}
