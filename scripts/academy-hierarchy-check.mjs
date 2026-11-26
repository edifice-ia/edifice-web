import assert from "node:assert/strict";
import { register } from "node:module";

register("./lib/alias-loader.mjs", import.meta.url);

// Vérifie lib/academy/hierarchy.ts : validation des cinq niveaux et masquage
// des descendants d'un élément archivé (filterLiveTree). Aucune base, aucun
// réseau : seul le module pur est importé.

const h = await import("../lib/academy/hierarchy.ts");

const UUID = "11111111-2222-4333-8444-555555555555";
let checks = 0;
function ok(result, message) {
  assert.equal(result.ok, true, `${message} — ${result.error ?? ""}`);
  checks += 1;
  return result;
}
function ko(result, message) {
  assert.equal(result.ok, false, message);
  assert.equal(typeof result.error, "string", `${message} : message d'erreur attendu`);
  checks += 1;
  return result;
}

// --- UUID -----------------------------------------------------------------
assert.equal(h.isUuid(UUID), true);
assert.equal(h.isUuid(UUID.toUpperCase()), true);
for (const bad of ["", "abc", `${UUID}x`, UUID.replace(/-/g, ""), 42, null, undefined]) {
  assert.equal(h.isUuid(bad), false, `isUuid refuse ${JSON.stringify(bad)}`);
}
checks += 9;

// --- Programmes : création ----------------------------------------------------
ok(h.parseProgramCreatePayload({ kind: "curriculum", title: "Prog" }), "programme minimal");
ok(h.parseProgramCreatePayload({ kind: "formation", title: "Prog", description: "d" }), "formation avec description");
ko(h.parseProgramCreatePayload({ kind: "autre", title: "Prog" }), "kind inconnu refusé");
ko(h.parseProgramCreatePayload({ title: "Prog" }), "kind absent refusé");
ko(h.parseProgramCreatePayload({ kind: "curriculum" }), "titre absent refusé");
ko(h.parseProgramCreatePayload({ kind: "curriculum", title: "" }), "titre vide refusé");
ko(h.parseProgramCreatePayload({ kind: "curriculum", title: "    " }), "titre fait d'espaces refusé");
ok(h.parseProgramCreatePayload({ kind: "curriculum", title: "x".repeat(200) }), "titre de 200 caractères accepté");
ko(h.parseProgramCreatePayload({ kind: "curriculum", title: "x".repeat(201) }), "titre de 201 caractères refusé");
ko(h.parseProgramCreatePayload({ kind: "curriculum", title: 12 }), "titre non textuel refusé");
ok(h.parseProgramCreatePayload({ kind: "curriculum", title: "😀".repeat(200) }), "200 emoji = 200 caractères, accepté");
ko(h.parseProgramCreatePayload({ kind: "curriculum", title: "😀".repeat(201) }), "201 emoji refusés");
const trimmed = ok(h.parseProgramCreatePayload({ kind: "curriculum", title: "  Titre  " }), "titre rogné");
assert.equal(trimmed.title, "Titre");
ok(h.parseProgramCreatePayload({ kind: "curriculum", title: "T", description: "d".repeat(2000) }), "description de 2 000 acceptée");
ko(h.parseProgramCreatePayload({ kind: "curriculum", title: "T", description: "d".repeat(2001) }), "description de 2 001 refusée");
const blankDescription = ok(h.parseProgramCreatePayload({ kind: "curriculum", title: "T", description: "   " }), "description blanche");
assert.equal(blankDescription.description, null, "description blanche normalisée en null");
ko(h.parseProgramCreatePayload({ kind: "curriculum", title: "T", description: 5 }), "description non textuelle refusée");
ko(h.parseProgramCreatePayload(null), "corps nul refusé");
ko(h.parseProgramCreatePayload([]), "tableau refusé");

// --- Programmes : mise à jour -------------------------------------------------
ok(h.parseProgramUpdatePayload({ title: "Nouveau" }), "mise à jour du titre");
ok(h.parseProgramUpdatePayload({ kind: "formation" }), "mise à jour de kind");
ok(h.parseProgramUpdatePayload({ description: null }), "effacement de la description");
ko(h.parseProgramUpdatePayload({}), "mise à jour vide refusée");
ko(h.parseProgramUpdatePayload({ kind: "x" }), "kind inconnu refusé en mise à jour");
ko(h.parseProgramUpdatePayload({ title: " " }), "titre blanc refusé en mise à jour");

// --- Niveaux enfants : création -------------------------------------------------
const parents = { subject: "programId", unit: "subjectId", chapter: "unitId", lesson: "chapterId" };
for (const [level, parentField] of Object.entries(parents)) {
  ok(h.parseChildCreatePayload(level, { [parentField]: UUID, title: "T" }), `${level} minimal`);
  ko(h.parseChildCreatePayload(level, { title: "T" }), `${level} sans parent refusé`);
  ko(h.parseChildCreatePayload(level, { [parentField]: "pas-un-uuid", title: "T" }), `${level} parent malformé refusé`);
  ko(h.parseChildCreatePayload(level, { [parentField]: UUID, title: "" }), `${level} titre vide refusé`);
  ko(h.parseChildCreatePayload(level, { [parentField]: UUID, title: "x".repeat(201) }), `${level} titre de 201 refusé`);
  const noPosition = ok(h.parseChildCreatePayload(level, { [parentField]: UUID, title: "T" }), `${level} sans position`);
  assert.equal(noPosition.position, null, `${level} : position absente laissée au store`);
  ok(h.parseChildCreatePayload(level, { [parentField]: UUID, title: "T", position: 0 }), `${level} position 0`);
  ok(h.parseChildCreatePayload(level, { [parentField]: UUID, title: "T", position: 2147483647 }), `${level} position max`);
  ko(h.parseChildCreatePayload(level, { [parentField]: UUID, title: "T", position: -1 }), `${level} position négative refusée`);
  ko(h.parseChildCreatePayload(level, { [parentField]: UUID, title: "T", position: 1.5 }), `${level} position décimale refusée`);
  ko(h.parseChildCreatePayload(level, { [parentField]: UUID, title: "T", position: 2147483648 }), `${level} position hors integer refusée`);
  ko(h.parseChildCreatePayload(level, { [parentField]: UUID, title: "T", position: "3" }), `${level} position textuelle refusée`);
}

// Texte propre au niveau : description pour matière/module/chapitre, contenu pour la leçon.
ok(h.parseChildCreatePayload("subject", { programId: UUID, title: "T", description: "d".repeat(2000) }), "description de 2 000 acceptée");
ko(h.parseChildCreatePayload("subject", { programId: UUID, title: "T", description: "d".repeat(2001) }), "description de 2 001 refusée");
const lesson = ok(h.parseChildCreatePayload("lesson", { chapterId: UUID, title: "T", content: "c".repeat(100000) }), "contenu de 100 000 accepté");
assert.equal(lesson.text.length, 100000);
ko(h.parseChildCreatePayload("lesson", { chapterId: UUID, title: "T", content: "c".repeat(100001) }), "contenu de 100 001 refusé");
const blankContent = ok(h.parseChildCreatePayload("lesson", { chapterId: UUID, title: "T", content: "\n  \n" }), "contenu blanc");
assert.equal(blankContent.text, null, "contenu blanc normalisé en null");

// --- Niveaux enfants : mise à jour -----------------------------------------------
ok(h.parseChildUpdatePayload("unit", { title: "Nouveau" }), "mise à jour du titre");
ok(h.parseChildUpdatePayload("unit", { position: 3 }), "mise à jour de la position");
ok(h.parseChildUpdatePayload("lesson", { content: "Texte" }), "mise à jour du contenu");
ko(h.parseChildUpdatePayload("unit", {}), "mise à jour vide refusée");
ko(h.parseChildUpdatePayload("unit", { subjectId: UUID }), "déplacement vers un autre parent refusé");
ko(h.parseChildUpdatePayload("lesson", { description: "d" }), "description refusée sur une leçon");
ko(h.parseChildUpdatePayload("chapter", { content: "c" }), "contenu refusé hors leçon");
ko(h.parseChildUpdatePayload("chapter", { position: -2 }), "position négative refusée en mise à jour");

// --- filterLiveTree ---------------------------------------------------------------------
const T0 = "2026-11-24T10:00:00.000Z";
const T1 = "2026-11-24T11:00:00.000Z";
function row(id, extra = {}) {
  return { id, title: id, description: null, position: 0, created_at: T0, updated_at: T0, deleted_at: null, ...extra };
}
const ARCHIVED = { deleted_at: T1 };

function fullTree(archive = {}) {
  return {
    program: { ...row("P"), kind: "curriculum", ...(archive.P ?? {}) },
    subjects: [{ ...row("S"), program_id: "P", ...(archive.S ?? {}) }],
    units: [{ ...row("U"), subject_id: "S", ...(archive.U ?? {}) }],
    chapters: [{ ...row("C"), unit_id: "U", ...(archive.C ?? {}) }],
    lessons: [{ ...row("L"), chapter_id: "C", ...(archive.L ?? {}) }],
  };
}

function ids(tree) {
  if (!tree) return null;
  const out = [tree.id];
  for (const s of tree.subjects) {
    out.push(s.id);
    for (const u of s.units) {
      out.push(u.id);
      for (const c of u.chapters) {
        out.push(c.id);
        for (const l of c.lessons) out.push(l.id);
      }
    }
  }
  return out;
}

assert.deepEqual(ids(h.filterLiveTree(fullTree())), ["P", "S", "U", "C", "L"], "arbre complet visible");
assert.equal(h.filterLiveTree(fullTree({ P: ARCHIVED })), null, "programme archivé : rien");
assert.deepEqual(ids(h.filterLiveTree(fullTree({ S: ARCHIVED }))), ["P"], "matière archivée masque module, chapitre, leçon");
assert.deepEqual(ids(h.filterLiveTree(fullTree({ U: ARCHIVED }))), ["P", "S"], "module archivé masque chapitre et leçon");
assert.deepEqual(ids(h.filterLiveTree(fullTree({ C: ARCHIVED }))), ["P", "S", "U"], "chapitre archivé masque la leçon");
assert.deepEqual(ids(h.filterLiveTree(fullTree({ L: ARCHIVED }))), ["P", "S", "U", "C"], "leçon archivée masquée, parent actif");
assert.equal(h.filterLiveTree({ program: null, subjects: [], units: [], chapters: [], lessons: [] }), null, "programme absent : null");
checks += 7;

// Enfant rattaché à un autre programme : ignoré.
const foreign = fullTree();
foreign.subjects.push({ ...row("S-autre"), program_id: "AUTRE" });
assert.deepEqual(ids(h.filterLiveTree(foreign)), ["P", "S", "U", "C", "L"], "enfant d'un autre parent ignoré");

// Frères : archivé masqué, actifs triés par position puis created_at.
const siblings = fullTree();
siblings.subjects = [
  { ...row("S2"), program_id: "P", position: 1, created_at: T0 },
  { ...row("S1b"), program_id: "P", position: 0, created_at: T1 },
  { ...row("S1a"), program_id: "P", position: 0, created_at: T0 },
  { ...row("S-arch"), program_id: "P", position: 0, ...ARCHIVED },
];
siblings.units = [];
const siblingTree = h.filterLiveTree(siblings);
assert.deepEqual(siblingTree.subjects.map((s) => s.id), ["S1a", "S1b", "S2"], "tri position puis created_at, archivé masqué");
checks += 2;

// Une leçon de l'arbre ne porte pas son contenu.
const withContent = fullTree();
withContent.lessons[0].content = "secret";
const lessonNode = h.filterLiveTree(withContent).subjects[0].units[0].chapters[0].lessons[0];
assert.equal("content" in lessonNode, false, "pas de contenu dans l'arbre");
assert.equal("description" in lessonNode, false, "pas de description sur une leçon");
checks += 2;

// --- Objectifs pédagogiques (étape 2b-1) --------------------------------------------
{
  const P = UUID;
  const Q = "22222222-3333-4444-8555-666666666666";
  const created = ok(
    h.parseObjectiveCreatePayload({ programId: P, title: "  Comprendre  ", description: "  " }),
    "objectif de programme accepté",
  );
  assert.equal(created.parentLevel, "program");
  assert.equal(created.parentId, P);
  assert.equal(created.title, "Comprendre", "titre rogné");
  assert.equal(created.description, null, "description vide devient null");
  checks += 4;

  for (const [field, level] of [
    ["subjectId", "subject"],
    ["unitId", "unit"],
    ["chapterId", "chapter"],
  ]) {
    const r = ok(h.parseObjectiveCreatePayload({ [field]: P, title: "T" }), `objectif de ${level} accepté`);
    assert.equal(r.parentLevel, level);
    checks += 1;
  }

  // Un seul parent.
  ko(h.parseObjectiveCreatePayload({ title: "T" }), "aucun parent refusé");
  ko(h.parseObjectiveCreatePayload({ programId: null, title: "T" }), "parent nul seul refusé");
  ko(h.parseObjectiveCreatePayload({ programId: P, subjectId: Q, title: "T" }), "deux parents refusés");
  ko(h.parseObjectiveCreatePayload({ unitId: P, chapterId: Q, title: "T" }), "deux parents enfants refusés");
  ko(h.parseObjectiveCreatePayload({ lessonId: P, title: "T" }), "leçon non rattachable");
  ko(h.parseObjectiveCreatePayload({ programId: "abc", title: "T" }), "parent non UUID refusé");
  ok(h.parseObjectiveCreatePayload({ programId: P, subjectId: null, title: "T" }), "parent nul supplémentaire ignoré");
  assert.equal(
    h.parseObjectiveCreatePayload({ programId: P, unitId: Q, title: "T" }).error,
    h.ACADEMY_OBJECTIVE_ONE_PARENT_ERROR,
  );
  checks += 1;

  // Titre.
  ko(h.parseObjectiveCreatePayload({ programId: P }), "titre absent refusé");
  ko(h.parseObjectiveCreatePayload({ programId: P, title: "   " }), "titre vide refusé");
  ok(h.parseObjectiveCreatePayload({ programId: P, title: "é".repeat(200) }), "titre de 200 caractères accepté");
  ko(h.parseObjectiveCreatePayload({ programId: P, title: "é".repeat(201) }), "titre de 201 caractères refusé");

  // Description.
  ok(h.parseObjectiveCreatePayload({ programId: P, title: "T", description: "d".repeat(2000) }), "description de 2 000 acceptée");
  ko(h.parseObjectiveCreatePayload({ programId: P, title: "T", description: "d".repeat(2001) }), "description de 2 001 refusée");
  ko(h.parseObjectiveCreatePayload({ programId: P, title: "T", description: 42 }), "description non textuelle refusée");
  assert.equal(
    h.parseObjectiveCreatePayload({ programId: P, title: "T", description: null }).description,
    null,
  );
  checks += 1;

  // Pas de changement de parent : aucun parseur de mise à jour des objectifs.
  assert.equal("parseObjectiveUpdatePayload" in h, false, "pas de parseur de mise à jour des objectifs");
  checks += 1;

  ko(h.parseObjectiveCreatePayload(null), "corps non objet refusé");
  ko(h.parseObjectiveCreatePayload([P]), "tableau refusé");
}

console.log(`academy-hierarchy checks passed (${checks} verifications) : validation des cinq niveaux, objectifs pedagogiques (un seul parent), limites, UUID, masquage des descendants archives.`);
