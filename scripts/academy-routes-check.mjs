import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { register } from "node:module";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

register("./lib/alias-loader.mjs", import.meta.url);

// Vérifie les routes Academy (app/api/academy) sans base ni serveur :
// 1. analyse statique des 21 fichiers de route (15 de la hiérarchie, 3 des
//    objectifs pédagogiques, étape 2b-1, 3 des ressources, étape 2b-2) — garde
//    en premier appel,
//    validation UUID avant le store, aucun message d'erreur renvoyé, imports
//    limités, runtime nodejs ;
// 2. tests de lib/academy/http.ts, la traduction commune des résultats.

const root = fileURLToPath(new URL("..", import.meta.url));
const routesDir = join(root, "app", "api", "academy");

function listRouteFiles(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...listRouteFiles(full));
    else if (entry === "route.ts") out.push(full);
  }
  return out;
}

const EXPECTED = [
  "programs/route.ts",
  "programs/[id]/route.ts",
  "programs/[id]/restore/route.ts",
  ...["subjects", "units", "chapters", "lessons"].flatMap((segment) => [
    `${segment}/route.ts`,
    `${segment}/[id]/route.ts`,
    `${segment}/[id]/restore/route.ts`,
  ]),
  // Objectifs pédagogiques (étape 2b-1) : création, archivage, restauration ;
  // ni GET ni PATCH.
  "objectives/route.ts",
  "objectives/[id]/route.ts",
  "objectives/[id]/restore/route.ts",
  // Ressources pédagogiques (étape 2b-2) : même patron.
  "resources/route.ts",
  "resources/[id]/route.ts",
  "resources/[id]/restore/route.ts",
].sort();

const files = listRouteFiles(routesDir);
const found = files.map((file) => relative(routesDir, file).split(sep).join("/")).sort();
assert.deepEqual(found, EXPECTED, "exactement les 21 fichiers de route attendus");

const ALLOWED_IMPORTS = new Set([
  "@/lib/academy/hierarchy",
  "@/lib/academy/http",
  "@/lib/server/academy/hierarchy-store",
  "@/lib/server/academy/objectives-store",
  "@/lib/server/academy/resources-store",
  "@/lib/server/academy/route-reply",
  "@/src/lib/auth/api-guards",
]);

const STORE_CALLS = [
  "listLivePrograms",
  "listArchivedPrograms",
  "createProgram",
  "updateProgram",
  "getLiveProgramTree",
  "getLiveLesson",
  "createChild",
  "updateChild",
  "archiveNode",
  "restoreNode",
  "createObjective",
  "archiveObjective",
  "restoreObjective",
  "createResource",
  "archiveResource",
  "restoreResource",
];

let handlers = 0;

for (const file of files) {
  const name = relative(routesDir, file).split(sep).join("/");
  const source = readFileSync(file, "utf8");
  const code = source.replace(/\/\/[^\n]*/g, ""); // commentaires de ligne retirés

  assert.match(code, /export const runtime = "nodejs";/, `${name} : runtime nodejs`);

  for (const match of code.matchAll(/from "([^"]+)"/g)) {
    assert.ok(ALLOWED_IMPORTS.has(match[1]), `${name} : import non autorise ${match[1]}`);
  }

  assert.doesNotMatch(code, /\.message\b/, `${name} : aucune lecture de .message`);
  assert.doesNotMatch(code, /NextResponse/, `${name} : reponses construites par route-reply seulement`);
  assert.doesNotMatch(code, /service[_-]?role|SERVICE_ROLE/i, `${name} : aucune cle service-role`);

  const chunks = code.split(/export async function /).slice(1);
  assert.ok(chunks.length > 0, `${name} : au moins un handler`);

  for (const chunk of chunks) {
    const method = chunk.slice(0, chunk.indexOf("("));
    const label = `${name} ${method}`;
    handlers += 1;

    // Garde : le premier `await` du handler est authorizeCockpitApiAccess().
    const firstAwait = chunk.indexOf("await ");
    assert.ok(firstAwait >= 0, `${label} : au moins un await`);
    assert.ok(
      chunk.startsWith("await authorizeCockpitApiAccess()", firstAwait),
      `${label} : authorizeCockpitApiAccess() doit etre le premier appel`,
    );

    // Exceptions interceptées : un try englobe le handler, et le catch passe par
    // academyRouteFailure.
    assert.ok(chunk.indexOf("try {") < firstAwait, `${label} : try avant la garde`);
    assert.match(chunk, /catch \(error\) \{\s*return academyRouteFailure\(/, `${label} : catch generique`);

    // Appel au store : après la garde, et après la validation UUID pour les
    // routes d'identifiant.
    const storeIndexes = STORE_CALLS.map((fn) => chunk.indexOf(`${fn}(`)).filter((index) => index >= 0);
    assert.ok(storeIndexes.length > 0, `${label} : appelle le store`);
    const firstStore = Math.min(...storeIndexes);
    assert.ok(firstStore > firstAwait, `${label} : store apres la garde`);

    if (name.includes("[id]")) {
      const uuidCheck = chunk.indexOf("if (!isUuid(id))");
      assert.ok(uuidCheck > firstAwait, `${label} : validation UUID apres la garde`);
      assert.ok(uuidCheck < firstStore, `${label} : validation UUID avant le store`);
    } else if (method === "POST" && !name.startsWith("programs/")) {
      // Création d'un enfant ou d'un objectif : l'UUID du parent est validé par
      // le parser.
      const parser = name.startsWith("objectives/")
        ? "parseObjectiveCreatePayload("
        : name.startsWith("resources/")
          ? "parseResourceCreatePayload("
          : "parseChildCreatePayload(";
      const parse = chunk.indexOf(parser);
      assert.ok(parse > firstAwait && parse < firstStore, `${label} : parser (UUID du parent) avant le store`);
    }

    // Corps JSON : lecture protégée, 400 dédié.
    if (chunk.includes("request.json()")) {
      assert.match(chunk, /catch \{\s*return toAcademyResponse\(academyInvalidJson\(\)\);/, `${label} : JSON invalide -> 400`);
    }
  }
}

assert.equal(handlers, 29, "29 handlers : 6 pour les programmes, 17 pour les quatre niveaux enfants, 3 pour les objectifs, 3 pour les ressources");

// --- lib/academy/http.ts ---------------------------------------------------------------
const http = await import("../lib/academy/http.ts");
const M = http.ACADEMY_MESSAGES;

for (const text of [M.invalidJson, M.unavailable, ...Object.values(M.notFound)]) {
  assert.doesNotMatch(text, /[À-ÿ]/, `message sans accent : ${text}`);
}
assert.deepEqual(Object.keys(M.notFound).sort(), ["chapter", "lesson", "objective", "program", "resource", "subject", "unit"]);
assert.deepEqual(http.academyNotFound("objective"), { status: 404, body: { error: "Objectif introuvable." } });
assert.deepEqual(http.academyNotFound("resource"), { status: 404, body: { error: "Ressource introuvable." } });

assert.deepEqual(http.academyInvalidJson(), { status: 400, body: { error: "Requete invalide: JSON attendu." } });
assert.deepEqual(http.academyUnavailable(), { status: 500, body: { error: "Operation Academy indisponible." } });
assert.deepEqual(http.academyNotFound("unit"), { status: 404, body: { error: "Module introuvable." } });
assert.deepEqual(http.academyBadRequest("x"), { status: 400, body: { error: "x" } });

const value = { id: "a" };
assert.deepEqual(
  http.academyStoreResultToReply({ status: "ok", value }, { key: "program", notFoundLevel: "program" }),
  { status: 200, body: { ok: true, program: value } },
);
assert.deepEqual(
  http.academyStoreResultToReply({ status: "ok", value }, { key: "lesson", notFoundLevel: "chapter", okStatus: 201 }),
  { status: 201, body: { ok: true, lesson: value } },
);
assert.deepEqual(
  http.academyStoreResultToReply({ status: "ok", value: null }, { key: null, notFoundLevel: "unit" }),
  { status: 200, body: { ok: true } },
);
assert.deepEqual(
  http.academyStoreResultToReply({ status: "invalid", error: "Valeur refusee par la base." }, { key: "unit", notFoundLevel: "unit" }),
  { status: 400, body: { error: "Valeur refusee par la base." } },
);
assert.deepEqual(
  http.academyStoreResultToReply({ status: "not_found" }, { key: "lesson", notFoundLevel: "chapter", okStatus: 201 }),
  { status: 404, body: { error: "Chapitre introuvable." } },
);

console.log(`academy-routes checks passed : ${files.length} fichiers, ${handlers} handlers (garde en premier, UUID avant le store, aucun message d'erreur renvoye, imports limites), et traduction des resultats.`);
