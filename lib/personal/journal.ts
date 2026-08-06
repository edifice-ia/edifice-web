// Types et validation du module Journal et Humeur, sans aucune I/O.
//
// Meme partage que lib/personal/notes.ts face a
// lib/server/personal/journal-store.ts : la regle de validation doit etre
// importable a la fois par les routes API et par le composant client, pour que
// le retour visuel avant appel et le 400 renvoye par le serveur ne puissent pas
// diverger.

export type PersonalJournalEntry = {
  id: string;
  content: string;
  mood: number | null;
  createdAt: string;
  updatedAt: string;
};

// 20000 la ou les notes plafonnent a 10000 : 23-modules.md oppose les deux
// modules par le poids de ce qu'ils portent, une note etant "une information
// ponctuelle qui ne merite pas une entree de journal".
export const JOURNAL_CONTENT_MAX_LENGTH = 20000;

export const JOURNAL_MOOD_MIN = 1;
export const JOURNAL_MOOD_MAX = 5;

export type JournalContentParseResult =
  | { ok: true; content: string }
  | { ok: false; error: string };

export type JournalMoodParseResult =
  | { ok: true; mood: number | null }
  | { ok: false; error: string };

// Applique la meme regle que les contraintes SQL
// personal_journal_entries_content_not_blank et _content_max_length. Ces
// contraintes restent le dernier rempart, mais elles remonteraient une erreur
// Postgres brute en 500 ; cette fonction rend la meme regle en message lisible.
export function parseJournalContentValue(value: string): JournalContentParseResult {
  const content = value.trim();

  if (content.length === 0) {
    return { ok: false, error: "content ne peut pas etre vide." };
  }

  if (content.length > JOURNAL_CONTENT_MAX_LENGTH) {
    return {
      ok: false,
      error: `content depasse la longueur maximale de ${JOURNAL_CONTENT_MAX_LENGTH} caracteres.`,
    };
  }

  return { ok: true, content };
}

// null est une valeur valide et signifiante : "humeur non renseignee", a ne pas
// confondre avec une valeur neutre au milieu de l'echelle. La future tendance
// d'humeur devra exclure ces entrees plutot que les compter comme des 3.
export function parseJournalMoodValue(value: unknown): JournalMoodParseResult {
  if (value === null || value === undefined) {
    return { ok: true, mood: null };
  }

  if (typeof value !== "number" || !Number.isInteger(value)) {
    return { ok: false, error: "mood doit etre un entier ou null." };
  }

  if (value < JOURNAL_MOOD_MIN || value > JOURNAL_MOOD_MAX) {
    return {
      ok: false,
      error: `mood doit etre compris entre ${JOURNAL_MOOD_MIN} et ${JOURNAL_MOOD_MAX}.`,
    };
  }

  return { ok: true, mood: value };
}

export type JournalCreateParseResult =
  | { ok: true; content: string; mood: number | null }
  | { ok: false; error: string };

export function parseJournalCreatePayload(payload: unknown): JournalCreateParseResult {
  const record =
    payload && typeof payload === "object"
      ? (payload as { content?: unknown; mood?: unknown })
      : null;

  if (!record || typeof record.content !== "string") {
    return { ok: false, error: "content doit etre une chaine de caracteres." };
  }

  const content = parseJournalContentValue(record.content);

  if (!content.ok) {
    return content;
  }

  const mood = parseJournalMoodValue(record.mood);

  if (!mood.ok) {
    return mood;
  }

  return { ok: true, content: content.content, mood: mood.mood };
}

// Modification partielle : content et mood sont independants, chacun peut etre
// omis. La distinction qui compte est entre "mood absent de la charge utile"
// (on n'y touche pas) et "mood: null" (on efface l'humeur notee) — d'ou le test
// d'appartenance plutot qu'un test sur undefined, qui confondrait les deux.
export type JournalUpdateParseResult =
  | { ok: true; patch: { content?: string; mood?: number | null } }
  | { ok: false; error: string };

export function parseJournalUpdatePayload(payload: unknown): JournalUpdateParseResult {
  if (!payload || typeof payload !== "object") {
    return { ok: false, error: "Charge utile invalide : objet attendu." };
  }

  const record = payload as { content?: unknown; mood?: unknown };
  const patch: { content?: string; mood?: number | null } = {};

  if ("content" in record) {
    if (typeof record.content !== "string") {
      return { ok: false, error: "content doit etre une chaine de caracteres." };
    }

    const content = parseJournalContentValue(record.content);

    if (!content.ok) {
      return content;
    }

    patch.content = content.content;
  }

  if ("mood" in record) {
    const mood = parseJournalMoodValue(record.mood);

    if (!mood.ok) {
      return mood;
    }

    patch.mood = mood.mood;
  }

  if (patch.content === undefined && !("mood" in record)) {
    return { ok: false, error: "Aucun champ modifiable fourni : content ou mood attendu." };
  }

  return { ok: true, patch };
}
