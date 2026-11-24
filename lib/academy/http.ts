// Traduction des résultats du store Academy en réponses HTTP — étape 2a du
// chantier 8.
//
// Module PUR : aucun import d'exécution — seulement un import de type, effacé à
// la compilation —, ni de Next ni du serveur, pour pouvoir être testé sans base
// et sans framework (scripts/academy-routes-check.mjs). Les routes
// transforment la réponse décrite ici en NextResponse par
// lib/server/academy/route-reply.ts.
//
// SOURCE UNIQUE DES MESSAGES des routes Academy, sans accents comme le reste des
// routes du dépôt. Aucune route n'écrit un message elle-même, et aucune ne
// renvoie le message d'une erreur : une panne donne toujours le même texte
// générique, le détail allant aux seuls journaux du serveur.
//
// Un élément inexistant, appartenant à un autre compte, archivé, ou masqué par
// un ancêtre archivé répond le même 404 : les distinguer ferait des routes un
// oracle d'existence.

import type { AcademyLevel } from "./hierarchy";

export type AcademyHttpReply = {
  status: number;
  body: Record<string, unknown>;
};

// Résultat du store, tel que décrit par AcademyStoreResult dans
// lib/server/academy/hierarchy-store.ts. Redéclaré ici pour garder ce module pur.
export type AcademyResultLike<T> =
  | { status: "ok"; value: T }
  | { status: "invalid"; error: string }
  | { status: "not_found" };

export const ACADEMY_MESSAGES = {
  invalidJson: "Requete invalide: JSON attendu.",
  unavailable: "Operation Academy indisponible.",
  notFound: {
    program: "Programme introuvable.",
    subject: "Matiere introuvable.",
    unit: "Module introuvable.",
    chapter: "Chapitre introuvable.",
    lesson: "Lecon introuvable.",
  } satisfies Record<AcademyLevel, string>,
} as const;

export function academyNotFound(level: AcademyLevel): AcademyHttpReply {
  return { status: 404, body: { error: ACADEMY_MESSAGES.notFound[level] } };
}

// Erreur de validation : le message vient du parser de lib/academy/hierarchy.ts
// ou du store (« Valeur refusee par la base. »), jamais de la base elle-même.
export function academyBadRequest(error: string): AcademyHttpReply {
  return { status: 400, body: { error } };
}

export function academyInvalidJson(): AcademyHttpReply {
  return { status: 400, body: { error: ACADEMY_MESSAGES.invalidJson } };
}

export function academyUnavailable(): AcademyHttpReply {
  return { status: 500, body: { error: ACADEMY_MESSAGES.unavailable } };
}

export function academyOk(body: Record<string, unknown>, status = 200): AcademyHttpReply {
  return { status, body: { ok: true, ...body } };
}

// Traduit un résultat du store. `key` nomme la valeur dans la réponse
// (`program`, `subject`…) ; null pour une réponse sans valeur (archivage,
// restauration). `notFoundLevel` choisit le message du 404 : le niveau visé, ou
// le niveau du parent pour une création.
export function academyStoreResultToReply<T>(
  result: AcademyResultLike<T>,
  options: { key: string | null; notFoundLevel: AcademyLevel; okStatus?: number },
): AcademyHttpReply {
  if (result.status === "ok") {
    return academyOk(options.key ? { [options.key]: result.value } : {}, options.okStatus ?? 200);
  }

  if (result.status === "invalid") {
    return academyBadRequest(result.error);
  }

  return academyNotFound(options.notFoundLevel);
}
