// Types et validation du module Taches, sans aucune I/O.
//
// Meme partage que lib/personal/notes.ts, journal.ts et habits.ts face a leur
// store : ce fichier est importe par les routes API ET par le composant client,
// pour que le retour visuel avant appel et le 400 renvoye par le serveur ne
// puissent pas diverger.
//
// Aucune valeur derivee n'est calculee ici et aucune n'est persistee. La
// "charge de taches en attente" de 23-modules.md est un compte de status
// 'todo', fait a la lecture par le store.

export type TaskStatus = "todo" | "done";

export type PersonalTask = {
  id: string;
  title: string;
  dueOn: string | null;
  status: TaskStatus;
  contextLabel: string | null;
  createdAt: string;
  updatedAt: string;
};

// Construit sur PersonalTask, sans champ derive a exclure : contrairement a
// Habitudes, ce module ne calcule ni serie ni taux, donc une tache archivee
// n'a rien de moins qu'une tache active hormis sa date d'archivage.
export type ArchivedPersonalTask = PersonalTask & {
  archivedAt: string;
};

// Reproduisent les contraintes SQL de 20260824100000. La base reste le dernier
// rempart ; ces bornes rendent la meme regle en message lisible, et permettent
// au formulaire de refuser avant l'aller-retour.
export const TASK_TITLE_MAX_LENGTH = 200;
export const TASK_CONTEXT_LABEL_MAX_LENGTH = 60;

export const TASK_STATUSES: TaskStatus[] = ["todo", "done"];

export function isTaskStatus(value: unknown): value is TaskStatus {
  return TASK_STATUSES.includes(value as TaskStatus);
}

export function parseTaskTitleValue(value: string) {
  const title = value.trim();

  if (title.length === 0) {
    return { ok: false as const, error: "title ne peut pas etre vide." };
  }

  if (title.length > TASK_TITLE_MAX_LENGTH) {
    return {
      ok: false as const,
      error: `title depasse la longueur maximale de ${TASK_TITLE_MAX_LENGTH} caracteres.`,
    };
  }

  return { ok: true as const, title };
}

// Le contexte est optionnel, et son absence s'ecrit null — jamais "". La
// contrainte personal_tasks_context_label_not_blank refuse la chaine vide en
// base ; cette fonction normalise donc "" et "   " vers null plutot que de les
// laisser produire une erreur 500 evitable.
export type TaskContextLabelParseResult =
  | { ok: true; contextLabel: string | null }
  | { ok: false; error: string };

export function parseTaskContextLabelValue(value: unknown): TaskContextLabelParseResult {
  if (value === null || value === undefined) {
    return { ok: true, contextLabel: null };
  }

  if (typeof value !== "string") {
    return { ok: false, error: "contextLabel doit etre une chaine de caracteres ou null." };
  }

  const contextLabel = value.trim();

  if (contextLabel.length === 0) {
    return { ok: true, contextLabel: null };
  }

  if (contextLabel.length > TASK_CONTEXT_LABEL_MAX_LENGTH) {
    return {
      ok: false,
      error: `contextLabel depasse la longueur maximale de ${TASK_CONTEXT_LABEL_MAX_LENGTH} caracteres.`,
    };
  }

  return { ok: true, contextLabel };
}

// L'echeance est un JOUR au format ISO court, pas un instant. Le format est
// verifie ici plutot que laisse a Postgres, dont le message d'erreur sur une
// date invalide n'est pas presentable a l'ecran.
//
// La validite du calendrier est verifiee en plus du format : "2026-02-31"
// respecte le motif mais n'existe pas, et Date() la reinterpreterait
// silencieusement en 3 mars.
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

export type TaskDueOnParseResult =
  | { ok: true; dueOn: string | null }
  | { ok: false; error: string };

export function parseTaskDueOnValue(value: unknown): TaskDueOnParseResult {
  if (value === null || value === undefined || value === "") {
    return { ok: true, dueOn: null };
  }

  if (typeof value !== "string" || !ISO_DAY.test(value)) {
    return { ok: false, error: "dueOn doit etre une date au format AAAA-MM-JJ, ou null." };
  }

  const parsed = new Date(`${value}T00:00:00Z`);

  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    return { ok: false, error: "dueOn n'est pas une date valide du calendrier." };
  }

  return { ok: true, dueOn: value };
}

export type TaskInputParseResult =
  | { ok: true; title: string; dueOn: string | null; contextLabel: string | null }
  | { ok: false; error: string };

// Charge utile de creation. Le statut n'y figure pas : une tache nait toujours
// 'todo'. L'accepter a la creation permettrait de creer une tache deja faite,
// ce qui n'a pas de sens et ouvrirait une valeur a valider pour rien.
export function parseTaskPayload(payload: unknown): TaskInputParseResult {
  const record =
    payload && typeof payload === "object"
      ? (payload as { title?: unknown; dueOn?: unknown; contextLabel?: unknown })
      : null;

  if (!record || typeof record.title !== "string") {
    return { ok: false, error: "title doit etre une chaine de caracteres." };
  }

  const title = parseTaskTitleValue(record.title);

  if (!title.ok) {
    return title;
  }

  const dueOn = parseTaskDueOnValue(record.dueOn);

  if (!dueOn.ok) {
    return dueOn;
  }

  const contextLabel = parseTaskContextLabelValue(record.contextLabel);

  if (!contextLabel.ok) {
    return contextLabel;
  }

  return {
    ok: true,
    title: title.title,
    dueOn: dueOn.dueOn,
    contextLabel: contextLabel.contextLabel,
  };
}

export type TaskUpdateParseResult =
  | {
      ok: true;
      updates: {
        title?: string;
        dueOn?: string | null;
        status?: TaskStatus;
        contextLabel?: string | null;
      };
    }
  | { ok: false; error: string };

// Mise a jour partielle : seuls les champs presents sont modifies. La distinction
// entre "absent" et "explicitement null" compte ici — retirer une echeance se
// fait en envoyant dueOn: null, ne pas y toucher se fait en l'omettant. Un
// traitement uniforme des deux effacerait des echeances a chaque changement de
// statut.
export function parseTaskUpdatePayload(payload: unknown): TaskUpdateParseResult {
  const record =
    payload && typeof payload === "object"
      ? (payload as Record<string, unknown>)
      : null;

  if (!record) {
    return { ok: false, error: "Charge utile invalide : objet attendu." };
  }

  const updates: {
    title?: string;
    dueOn?: string | null;
    status?: TaskStatus;
    contextLabel?: string | null;
  } = {};

  if ("title" in record) {
    if (typeof record.title !== "string") {
      return { ok: false, error: "title doit etre une chaine de caracteres." };
    }

    const title = parseTaskTitleValue(record.title);

    if (!title.ok) {
      return title;
    }

    updates.title = title.title;
  }

  if ("dueOn" in record) {
    const dueOn = parseTaskDueOnValue(record.dueOn);

    if (!dueOn.ok) {
      return dueOn;
    }

    updates.dueOn = dueOn.dueOn;
  }

  if ("status" in record) {
    if (!isTaskStatus(record.status)) {
      return { ok: false, error: "status doit valoir 'todo' ou 'done'." };
    }

    updates.status = record.status;
  }

  if ("contextLabel" in record) {
    const contextLabel = parseTaskContextLabelValue(record.contextLabel);

    if (!contextLabel.ok) {
      return contextLabel;
    }

    updates.contextLabel = contextLabel.contextLabel;
  }

  if (Object.keys(updates).length === 0) {
    return { ok: false, error: "Aucun champ modifiable fourni." };
  }

  return { ok: true, updates };
}
