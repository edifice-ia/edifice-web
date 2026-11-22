import { timingSafeEqual } from "node:crypto";

// Garde des routes cron internes (app/api/internal/cron/*), appelees par
// Vercel Cron ou un appelant interne, jamais depuis le navigateur : le secret
// CRON_SECRET ne quitte jamais le serveur.
//
// DEC-007 admet une route sans session a une condition : qu'elle valide un
// secret entrant A TEMPS CONSTANT. Les trois routes cron comparaient le secret
// par `===`, qui s'arrete au premier caractere different et laisse donc fuir,
// par le temps de reponse, la longueur du prefixe correct. Ce helper remplace
// les trois copies par une seule, sur le patron de safeEqual dans
// app/api/webhooks/calendar/route.ts.
//
// Semantique d'acceptation inchangee par rapport aux trois copies d'origine :
// - CRON_SECRET absent ou vide (apres trim) : refus systematique ;
// - accepte `Authorization: Bearer <secret>` OU `x-cron-secret: <secret>`,
//   valeurs comparees telles quelles, sans trim cote en-tete.
//
// Limite assumee : la verification de longueur, prealable obligatoire a
// timingSafeEqual (qui leve une erreur sur des tampons de tailles
// differentes), revele si la longueur proposee est la bonne. Elle ne revele
// rien du contenu du secret.

function constantTimeEquals(candidate: string, expected: string) {
  const candidateBuffer = Buffer.from(candidate, "utf8");
  const expectedBuffer = Buffer.from(expected, "utf8");

  if (candidateBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(candidateBuffer, expectedBuffer);
}

export function isCronRequestAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    return false;
  }

  const authorization = request.headers.get("authorization") ?? "";
  const headerSecret = request.headers.get("x-cron-secret") ?? "";

  // Les deux comparaisons sont toujours evaluees, sans court-circuit, pour que
  // le temps de reponse ne dise pas laquelle des deux a echoue.
  const bearerMatches = constantTimeEquals(authorization, `Bearer ${secret}`);
  const headerMatches = constantTimeEquals(headerSecret, secret);

  return bearerMatches || headerMatches;
}
