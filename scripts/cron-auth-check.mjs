import assert from "node:assert/strict";
import { register } from "node:module";

register("./lib/alias-loader.mjs", import.meta.url);

// Verifie isCronRequestAuthorized (src/lib/auth/cron-auth.ts), la garde
// partagee des trois routes cron internes, comparee a temps constant (DEC-007).
// Aucun appel reseau ni base : seul le helper est importe.

const { isCronRequestAuthorized } = await import("../src/lib/auth/cron-auth.ts");

const SECRET = "test-cron-secret";

function requestWith(headers) {
  return new Request("http://localhost/api/internal/cron/check", { headers });
}

function check(headers) {
  return isCronRequestAuthorized(requestWith(headers));
}

process.env.CRON_SECRET = SECRET;

// --- Secret correct : accepte, par chacun des deux en-tetes ---
assert.equal(check({ authorization: `Bearer ${SECRET}` }), true, "Authorization: Bearer <secret> doit etre accepte");
assert.equal(check({ "x-cron-secret": SECRET }), true, "x-cron-secret: <secret> doit etre accepte");
assert.equal(
  check({ authorization: "Bearer wrong-secret-same", "x-cron-secret": SECRET }),
  true,
  "un x-cron-secret correct suffit, meme avec un Authorization faux",
);

// --- Secret faux, meme longueur : refuse ---
const sameLengthWrong = "x".repeat(SECRET.length);
assert.equal(sameLengthWrong.length, SECRET.length);
assert.equal(check({ authorization: `Bearer ${sameLengthWrong}` }), false, "Bearer faux de meme longueur refuse");
assert.equal(check({ "x-cron-secret": sameLengthWrong }), false, "x-cron-secret faux de meme longueur refuse");

// --- Longueur differente : refuse, sans exception levee par timingSafeEqual ---
for (const candidate of ["", "t", `${SECRET}x`, `${SECRET}${SECRET}`, "é".repeat(SECRET.length)]) {
  assert.doesNotThrow(() => check({ authorization: `Bearer ${candidate}` }), "aucune exception sur Bearer de longueur differente");
  assert.doesNotThrow(() => check({ "x-cron-secret": candidate }), "aucune exception sur x-cron-secret de longueur differente");
  assert.equal(check({ authorization: `Bearer ${candidate}` }), false, `Bearer "${candidate}" refuse`);
  assert.equal(check({ "x-cron-secret": candidate }), false, `x-cron-secret "${candidate}" refuse`);
}

// --- Semantique d'origine conservee ---
assert.equal(check({}), false, "aucun en-tete : refuse");
assert.equal(check({ authorization: SECRET }), false, "secret nu dans Authorization, sans 'Bearer ' : refuse");
assert.equal(check({ authorization: `bearer ${SECRET}` }), false, "'bearer' en minuscules : refuse, comme avant");
assert.equal(check({ "x-cron-secret": `Bearer ${SECRET}` }), false, "x-cron-secret prefixe par 'Bearer ' : refuse");

process.env.CRON_SECRET = `  ${SECRET}  `;
assert.equal(check({ "x-cron-secret": SECRET }), true, "CRON_SECRET est trimme cote serveur, comme avant");
process.env.CRON_SECRET = SECRET;

// --- CRON_SECRET absent ou vide : refus systematique ---
delete process.env.CRON_SECRET;
assert.equal(check({ authorization: `Bearer ${SECRET}` }), false, "CRON_SECRET absent : refuse");
assert.equal(check({ authorization: "Bearer " }), false, "CRON_SECRET absent et Bearer vide : refuse");
assert.equal(check({ "x-cron-secret": "" }), false, "CRON_SECRET absent et x-cron-secret vide : refuse");

process.env.CRON_SECRET = "   ";
assert.equal(check({ authorization: "Bearer " }), false, "CRON_SECRET vide apres trim : refuse");
assert.equal(check({ "x-cron-secret": "" }), false, "CRON_SECRET vide apres trim, en-tete vide : refuse");
assert.equal(check({ "x-cron-secret": "   " }), false, "CRON_SECRET d'espaces, en-tete d'espaces : refuse");

console.log("cron-auth checks passed: secret correct (deux en-tetes), secret faux, longueur differente sans exception, CRON_SECRET absent ou vide.");
