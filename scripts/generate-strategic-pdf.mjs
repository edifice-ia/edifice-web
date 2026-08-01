// Régénère les PDF de knowledge/Documentation-Strategique/PDF/ depuis les
// Markdown de knowledge/Documentation-Strategique/Markdown/.
//
// Ce script remplace une génération qui était manuelle et non tracée. Il
// reproduit deux traits du lot initial du 2026-08-01 que le Markdown ne porte
// pas, et qu'un rendu direct aurait donc perdus ou ajoutés à tort :
//
//   1. La section « ## Sommaire » est retirée avant rendu. Chaque .md en porte
//      une, aucun .pdf du lot initial n'en garde trace. La rendre ajouterait à
//      chaque document une table des matières que le lot n'a jamais eue.
//   2. Un pied de page « L'Édifice — Documentation stratégique » à gauche et le
//      numéro de page à droite, absent des sources.
//
// Les libellés de lien sont des noms de fichiers : `white-space: nowrap` les
// empêche d'être coupés en fin de ligne, ce qui produisait des rendus du type
// « 22-espaces-et- / marques.md ».
//
// Usage : npm run docs:pdf [-- --check]
//   sans option : réécrit les PDF
//   --check     : ne réécrit rien, signale les fichiers dont le texte rendu
//                 diffère de celui du PDF en place (code de sortie 1 si écart)

import { mkdtemp, readFile, readdir, rm, writeFile, copyFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mdToPdf } from "md-to-pdf";

const execFileAsync = promisify(execFile);

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const markdownDir = path.join(repoRoot, "knowledge/Documentation-Strategique/Markdown");
const pdfDir = path.join(repoRoot, "knowledge/Documentation-Strategique/PDF");

const checkOnly = process.argv.includes("--check");

const pdfOptions = {
  format: "A4",
  margin: { top: "20mm", right: "18mm", bottom: "20mm", left: "18mm" },
  printBackground: true,
  displayHeaderFooter: true,
  headerTemplate: "<div></div>",
  footerTemplate:
    '<div style="width:100%;font-size:8px;color:#444;padding:0 18mm;' +
    'display:flex;justify-content:space-between;">' +
    "<span>L'Édifice — Documentation stratégique</span>" +
    '<span class="pageNumber"></span></div>',
};

const css = `
  body { font-family: "Segoe UI", Calibri, Arial, sans-serif; font-size: 10.5pt; line-height: 1.5; color: #1a1a1a; }
  h1 { font-size: 20pt; margin: 0 0 4pt; }
  h2 { font-size: 13pt; margin: 16pt 0 4pt; }
  h3 { font-size: 11pt; margin: 12pt 0 3pt; }
  p { margin: 0 0 7pt; }
  a { color: inherit; text-decoration: none; white-space: nowrap; }
  table { border-collapse: collapse; width: 100%; font-size: 9pt; margin: 6pt 0 10pt; }
  th, td { border: 1px solid #bbb; padding: 4pt 6pt; text-align: left; vertical-align: top; }
  th { background: #f2f2f2; }
  code { font-family: Consolas, monospace; font-size: 9pt; }
  pre { background: #f6f6f6; padding: 6pt; font-size: 8.5pt; white-space: pre-wrap; }
  ul, ol { margin: 0 0 7pt; padding-left: 16pt; }
  li { margin-bottom: 2pt; }
  h1, h2, h3 { break-after: avoid; }
  table, pre { break-inside: avoid; }
`;

// Retire la section « ## Sommaire » : de son titre jusqu'au prochain titre de
// niveau 2. Un document sans Sommaire passe inchangé — le cas est signalé mais
// n'interrompt pas le lot, pour qu'un document légitimement dépourvu de sommaire
// ne bloque pas la régénération des quinze autres.
function stripSommaire(markdown, label) {
  const lines = markdown.split(/\r?\n/);
  const out = [];
  let skipping = false;
  let removed = 0;

  for (const line of lines) {
    if (/^##\s+Sommaire\s*$/.test(line)) {
      skipping = true;
      removed += 1;
      continue;
    }
    if (skipping) {
      if (/^##\s+/.test(line)) {
        skipping = false;
      } else {
        continue;
      }
    }
    out.push(line);
  }

  if (removed !== 1) {
    console.warn(`  avertissement ${label} : ${removed} section(s) Sommaire retirée(s), 1 attendue`);
  }

  return out.join("\n");
}

// Texte rendu, normalisé, pour comparer deux PDF sur leur contenu et non sur
// leurs octets : deux rendus successifs du même Markdown ne sont jamais
// identiques au bit près (horodatage interne, ordre des objets).
async function pdfText(file) {
  if (!existsSync(file)) return null;
  try {
    const { stdout } = await execFileAsync(
      "pdftotext",
      ["-layout", "-enc", "UTF-8", file, "-"],
      { maxBuffer: 32 * 1024 * 1024 },
    );
    return stdout.replace(/\s+/g, " ").trim();
  } catch {
    console.warn("  avertissement : pdftotext indisponible, comparaison de contenu ignorée");
    return undefined;
  }
}

const entries = (await readdir(markdownDir))
  .filter((name) => name.endsWith(".md"))
  .sort();

if (entries.length === 0) {
  console.error(`Aucun fichier .md dans ${path.relative(repoRoot, markdownDir)}`);
  process.exit(1);
}

const work = await mkdtemp(path.join(tmpdir(), "edifice-docs-pdf-"));
const changed = [];
const failed = [];

console.log(
  `${checkOnly ? "Vérification" : "Régénération"} de ${entries.length} PDF depuis ${path.relative(repoRoot, markdownDir)}`,
);

try {
  for (const name of entries) {
    const base = name.replace(/\.md$/, "");
    const source = path.join(markdownDir, name);
    const target = path.join(pdfDir, `${base}.pdf`);

    const prepared = path.join(work, name);
    await writeFile(prepared, stripSommaire(await readFile(source, "utf8"), name));

    let result;
    try {
      result = await mdToPdf({ path: prepared }, { css, pdf_options: pdfOptions });
    } catch (error) {
      failed.push({ base, error: error instanceof Error ? error.message : String(error) });
      console.error(`  ECHEC   ${base}.pdf — ${error instanceof Error ? error.message : error}`);
      continue;
    }

    const produced = path.join(work, `${base}.pdf`);
    await writeFile(produced, result.content);

    const [before, after] = [await pdfText(target), await pdfText(produced)];
    const differs = before === null || (before !== undefined && before !== after);

    if (differs) changed.push(base);

    if (checkOnly) {
      console.log(`  ${differs ? "DIFFERENT" : "identique"}  ${base}.pdf`);
    } else {
      await copyFile(produced, target);
      console.log(`  ecrit  ${base}.pdf${differs ? "  (contenu modifie)" : ""}`);
    }
  }
} finally {
  await rm(work, { recursive: true, force: true });
}

console.log("");

if (failed.length > 0) {
  console.error(`${failed.length} document(s) en echec : ${failed.map((f) => f.base).join(", ")}`);
  process.exit(1);
}

if (checkOnly) {
  if (changed.length > 0) {
    console.error(`${changed.length}/${entries.length} PDF divergent de leur source : ${changed.join(", ")}`);
    process.exit(1);
  }
  console.log(`${entries.length}/${entries.length} PDF a jour.`);
} else {
  console.log(
    changed.length === 0
      ? `${entries.length} PDF regeneres, contenu inchange.`
      : `${entries.length} PDF regeneres, dont ${changed.length} au contenu modifie : ${changed.join(", ")}`,
  );
}
