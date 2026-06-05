import path from "node:path";

export const PINTEREST_STORAGE_PREFIX = "pinterest";
export const PINTEREST_FINAL_PINS_FOLDER = "final_pins";
export const PINTEREST_ACCOUNT_IDS = [
  "edifice_discipline",
  "solution_sommeil",
];

export function normalizePinterestStoragePath(value) {
  return value.replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");
}

export function getPinterestFinalPinStoragePath(accountId, filename) {
  if (!PINTEREST_ACCOUNT_IDS.includes(accountId)) {
    throw new Error(`Compte Pinterest non autorise: ${accountId}`);
  }

  const safeFilename = path.posix.basename(normalizePinterestStoragePath(filename));
  if (!safeFilename) {
    throw new Error(`Nom de fichier Pinterest invalide pour ${accountId}.`);
  }

  const storagePath = `${PINTEREST_STORAGE_PREFIX}/${accountId}/${PINTEREST_FINAL_PINS_FOLDER}/${safeFilename}`;
  assertPinterestFinalPinStoragePath(storagePath);
  return storagePath;
}

export function assertPinterestFinalPinStoragePath(storagePath) {
  const normalizedPath = normalizePinterestStoragePath(storagePath);

  if (!normalizedPath.includes(`/${PINTEREST_FINAL_PINS_FOLDER}/`)) {
    throw new Error(
      `Chemin Pinterest refuse car il ne contient pas /${PINTEREST_FINAL_PINS_FOLDER}/: ${normalizedPath}`,
    );
  }

  const accountId = inferPinterestAccountId(normalizedPath);
  if (!accountId) {
    throw new Error(`Chemin Pinterest refuse car le compte est inconnu: ${normalizedPath}`);
  }

  const expectedPrefix = `${PINTEREST_STORAGE_PREFIX}/${accountId}/${PINTEREST_FINAL_PINS_FOLDER}/`;
  if (!normalizedPath.startsWith(expectedPrefix)) {
    throw new Error(`Chemin Pinterest refuse hors dossier final: ${normalizedPath}`);
  }

  return normalizedPath;
}

export function inferPinterestAccountId(storagePath) {
  const segments = normalizePinterestStoragePath(storagePath).split("/");
  return segments.find((segment) => PINTEREST_ACCOUNT_IDS.includes(segment)) ?? "";
}

export function isPinterestFinalPinStoragePath(storagePath) {
  try {
    assertPinterestFinalPinStoragePath(storagePath);
    return true;
  } catch {
    return false;
  }
}

export function getPinterestLegacyRootFolder(accountId) {
  if (!PINTEREST_ACCOUNT_IDS.includes(accountId)) {
    throw new Error(`Compte Pinterest non autorise: ${accountId}`);
  }

  return `${PINTEREST_STORAGE_PREFIX}/${accountId}`;
}

export function getPinterestFinalPinsFolder(accountId) {
  return `${getPinterestLegacyRootFolder(accountId)}/${PINTEREST_FINAL_PINS_FOLDER}`;
}
