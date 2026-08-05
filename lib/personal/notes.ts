// Types et validation du module Notes, sans aucune I/O.
//
// Ce fichier est volontairement separe de lib/server/personal/notes-store.ts,
// sur le meme partage que lib/settings-preferences.ts (types, defauts,
// normalisation) face a lib/server/settings-preferences.ts (lecture/ecriture) :
// la regle de validation doit etre importable a la fois par les routes API et
// par le composant client, pour que le retour visuel avant appel et le 400
// renvoye par le serveur ne puissent pas diverger.

export type PersonalNote = {
  id: string;
  content: string;
  createdAt: string;
  updatedAt: string;
};

export const NOTE_CONTENT_MAX_LENGTH = 10000;

export type NoteContentParseResult =
  | { ok: true; content: string }
  | { ok: false; error: string };

// Applique la meme regle que les contraintes SQL personal_notes_content_not_blank
// et personal_notes_content_max_length. Ces contraintes restent le dernier
// rempart, mais elles remonteraient une erreur Postgres brute en 500 ; cette
// fonction rend la meme regle en message lisible.
export function parseNoteContent(payload: unknown): NoteContentParseResult {
  const record =
    payload && typeof payload === "object" ? (payload as { content?: unknown }) : null;

  if (!record || typeof record.content !== "string") {
    return { ok: false, error: "content doit etre une chaine de caracteres." };
  }

  return parseNoteContentValue(record.content);
}

// Variante prenant directement la chaine, pour la validation cote client ou le
// contenu est deja connu comme une string.
export function parseNoteContentValue(value: string): NoteContentParseResult {
  const content = value.trim();

  if (content.length === 0) {
    return { ok: false, error: "content ne peut pas etre vide." };
  }

  if (content.length > NOTE_CONTENT_MAX_LENGTH) {
    return {
      ok: false,
      error: `content depasse la longueur maximale de ${NOTE_CONTENT_MAX_LENGTH} caracteres.`,
    };
  }

  return { ok: true, content };
}
