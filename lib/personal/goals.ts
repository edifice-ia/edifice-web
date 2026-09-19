// Types et validation du module Objectifs, sans aucune I/O.
//
// Meme partage que lib/personal/tasks.ts face a son store : ce fichier est
// importe par les routes API ET par le composant client, pour que le retour
// visuel avant appel et le 400 renvoye par le serveur ne puissent pas diverger.
//
// Il porte aussi le CALCUL DE PROGRESSION, qui n'est ni stocke en base ni
// renvoye par l'API : l'interface l'appelle sur les champs de l'objectif. Une
// seule implementation, contrairement a retainedObjectiveProgress de
// Trajectoire, qui existe en double sans que rien ne tienne les deux copies
// synchronisees.

export type GoalStatus = "active" | "achieved";

export type PersonalGoal = {
  id: string;
  title: string;
  startValue: number;
  targetValue: number;
  currentValue: number;
  unitLabel: string | null;
  dueOn: string | null;
  status: GoalStatus;
  createdAt: string;
  updatedAt: string;
};

// Type distinct plutot qu'un champ optionnel, comme pour Taches et Journal :
// archivedAt n'existe que sur une ligne archivee.
export type ArchivedPersonalGoal = PersonalGoal & {
  archivedAt: string;
};

// Reproduisent les contraintes SQL de 20260917100000. La base reste le dernier
// rempart ; ces bornes rendent la meme regle en message lisible.
export const GOAL_TITLE_MAX_LENGTH = 200;
export const GOAL_UNIT_LABEL_MAX_LENGTH = 20;

// numeric(15,3) : douze chiffres entiers au plus, trois decimales.
//
// La borne est refusee ici plutot que laissee a Postgres, dont le 22003 n'est
// pas presentable a l'ecran. Les decimales, elles, DOIVENT etre refusees ici :
// au-dela de trois, Postgres ARRONDIT SANS ERREUR — 80.12345 devient 80.123,
// constate a l'application de la migration. Arrondir pour l'utilisateur
// reproduirait ce defaut dans le code cense l'en proteger, et la valeur affichee
// ne serait pas celle qu'il a saisie.
export const GOAL_VALUE_MAX_DECIMALS = 3;
export const GOAL_VALUE_ABS_MAX = 1e12;

export const GOAL_STATUSES: GoalStatus[] = ["active", "achieved"];

// Regle "cible differente du depart", enoncee une fois pour la creation, la mise
// a jour et le store. La contrainte personal_goals_target_differs_from_start la
// tient en base ; ici elle produit un 400 lisible au lieu d'un 23514 remonte en
// 500.
export const TARGET_EQUALS_START_ERROR =
  "targetValue doit etre differente de startValue : sans ecart, aucune progression n'est definie.";

export function isGoalStatus(value: unknown): value is GoalStatus {
  return GOAL_STATUSES.includes(value as GoalStatus);
}

export function isUuid(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
  );
}

export type GoalValueParseResult =
  | { ok: true; value: number }
  | { ok: false; error: string };

// Le champ est nomme dans le message : les trois valeurs partagent cette
// fonction, et "valeur invalide" sans preciser laquelle n'aiderait personne.
export function parseGoalValue(value: unknown, field: string): GoalValueParseResult {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return { ok: false, error: `${field} doit etre un nombre.` };
  }

  if (Math.abs(value) >= GOAL_VALUE_ABS_MAX) {
    return {
      ok: false,
      // Formule sans accord en genre : le champ est nomme par l'appelant, et
      // l'interface y passe un libelle francais ("La valeur cible") la ou les
      // routes passent le nom du champ de l'API ("targetValue").
      error: `${field} : valeur trop grande, la limite est de ${GOAL_VALUE_ABS_MAX} en valeur absolue.`,
    };
  }

  // Compte les decimales sur la notation decimale, jamais sur la notation
  // exponentielle : String(1e-7) donne "1e-7", ou "split" ne verrait aucune
  // decimale. toFixed borne la lecture a la precision qui nous interesse, et la
  // comparaison rejette tout ce qui en porte davantage.
  if (Number(value.toFixed(GOAL_VALUE_MAX_DECIMALS)) !== value) {
    return {
      ok: false,
      error: `${field} ne peut pas avoir plus de ${GOAL_VALUE_MAX_DECIMALS} decimales : la base arrondirait la valeur sans le dire.`,
    };
  }

  return { ok: true, value };
}

export function parseGoalTitleValue(value: unknown) {
  if (typeof value !== "string") {
    return { ok: false as const, error: "title doit etre une chaine de caracteres." };
  }

  const title = value.trim();

  if (title.length === 0) {
    return { ok: false as const, error: "title ne peut pas etre vide." };
  }

  if (title.length > GOAL_TITLE_MAX_LENGTH) {
    return {
      ok: false as const,
      error: `title depasse la longueur maximale de ${GOAL_TITLE_MAX_LENGTH} caracteres.`,
    };
  }

  return { ok: true as const, title };
}

export type GoalUnitLabelParseResult =
  | { ok: true; unitLabel: string | null }
  | { ok: false; error: string };

// L'unite est optionnelle, et son absence s'ecrit null — jamais "". La
// contrainte personal_goals_unit_label_not_blank refuse la chaine vide en base ;
// cette fonction normalise donc "" et "   " vers null plutot que de les laisser
// produire une 500 evitable. Meme patron que contextLabel sur Taches.
export function parseGoalUnitLabelValue(value: unknown): GoalUnitLabelParseResult {
  if (value === null || value === undefined) {
    return { ok: true, unitLabel: null };
  }

  if (typeof value !== "string") {
    return { ok: false, error: "unitLabel doit etre une chaine de caracteres ou null." };
  }

  const unitLabel = value.trim();

  if (unitLabel.length === 0) {
    return { ok: true, unitLabel: null };
  }

  if (unitLabel.length > GOAL_UNIT_LABEL_MAX_LENGTH) {
    return {
      ok: false,
      error: `unitLabel depasse la longueur maximale de ${GOAL_UNIT_LABEL_MAX_LENGTH} caracteres.`,
    };
  }

  return { ok: true, unitLabel };
}

// L'echeance est un JOUR au format ISO court, pas un instant. Copie assumee de
// parseTaskDueOnValue : la regle est la meme, et importer Taches depuis
// Objectifs lierait deux modules autonomes pour six lignes.
//
// La validite du calendrier est verifiee en plus du format : "2026-02-31"
// respecte le motif mais n'existe pas, et Date() la reinterpreterait
// silencieusement en 3 mars.
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

export type GoalDueOnParseResult =
  | { ok: true; dueOn: string | null }
  | { ok: false; error: string };

export function parseGoalDueOnValue(value: unknown): GoalDueOnParseResult {
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

export type GoalCreateParseResult =
  | {
      ok: true;
      title: string;
      startValue: number;
      targetValue: number;
      currentValue: number;
      unitLabel: string | null;
      dueOn: string | null;
    }
  | { ok: false; error: string };

// Charge utile de creation.
//
// Le statut n'y figure pas : un objectif nait 'active'. L'accepter a la creation
// permettrait de creer un objectif deja atteint, ce qui n'a pas de sens — meme
// retenue que sur la creation d'une tache.
//
// Deux valeurs par defaut, toutes deux appliquees ICI et non en base :
// startValue vaut 0 si absente, comme la colonne ; currentValue vaut startValue
// si absente, ce qu'une colonne ne peut pas faire — un defaut SQL ne peut pas
// reprendre la valeur d'une autre colonne.
export function parseGoalCreatePayload(payload: unknown): GoalCreateParseResult {
  const record =
    payload && typeof payload === "object"
      ? (payload as Record<string, unknown>)
      : null;

  if (!record) {
    return { ok: false, error: "Charge utile invalide : objet attendu." };
  }

  const title = parseGoalTitleValue(record.title);

  if (!title.ok) {
    return title;
  }

  const target = parseGoalValue(record.targetValue, "targetValue");

  if (!target.ok) {
    return target;
  }

  let startValue = 0;

  if ("startValue" in record && record.startValue !== null && record.startValue !== undefined) {
    const start = parseGoalValue(record.startValue, "startValue");

    if (!start.ok) {
      return start;
    }

    startValue = start.value;
  }

  let currentValue = startValue;

  if (
    "currentValue" in record &&
    record.currentValue !== null &&
    record.currentValue !== undefined
  ) {
    const current = parseGoalValue(record.currentValue, "currentValue");

    if (!current.ok) {
      return current;
    }

    currentValue = current.value;
  }

  if (target.value === startValue) {
    return { ok: false, error: TARGET_EQUALS_START_ERROR };
  }

  const unitLabel = parseGoalUnitLabelValue(record.unitLabel);

  if (!unitLabel.ok) {
    return unitLabel;
  }

  const dueOn = parseGoalDueOnValue(record.dueOn);

  if (!dueOn.ok) {
    return dueOn;
  }

  return {
    ok: true,
    title: title.title,
    startValue,
    targetValue: target.value,
    currentValue,
    unitLabel: unitLabel.unitLabel,
    dueOn: dueOn.dueOn,
  };
}

export type GoalUpdates = {
  title?: string;
  startValue?: number;
  targetValue?: number;
  currentValue?: number;
  unitLabel?: string | null;
  dueOn?: string | null;
  status?: GoalStatus;
};

export type GoalUpdateParseResult =
  | { ok: true; updates: GoalUpdates }
  | { ok: false; error: string };

// Mise a jour partielle : seuls les champs presents sont modifies. La
// distinction entre "absent" et "explicitement null" compte ici — mettre a jour
// la seule valeur actuelle ne doit pas effacer l'unite ni l'echeance.
//
// Les trois valeurs n'acceptent PAS null : une colonne not null ne peut pas etre
// videe, et l'ecrire ici evite un 23502 remonte en 500.
export function parseGoalUpdatePayload(payload: unknown): GoalUpdateParseResult {
  const record =
    payload && typeof payload === "object"
      ? (payload as Record<string, unknown>)
      : null;

  if (!record) {
    return { ok: false, error: "Charge utile invalide : objet attendu." };
  }

  const updates: GoalUpdates = {};

  if ("title" in record) {
    const title = parseGoalTitleValue(record.title);

    if (!title.ok) {
      return title;
    }

    updates.title = title.title;
  }

  for (const field of ["startValue", "targetValue", "currentValue"] as const) {
    if (field in record) {
      const value = parseGoalValue(record[field], field);

      if (!value.ok) {
        return value;
      }

      updates[field] = value.value;
    }
  }

  if ("unitLabel" in record) {
    const unitLabel = parseGoalUnitLabelValue(record.unitLabel);

    if (!unitLabel.ok) {
      return unitLabel;
    }

    updates.unitLabel = unitLabel.unitLabel;
  }

  if ("dueOn" in record) {
    const dueOn = parseGoalDueOnValue(record.dueOn);

    if (!dueOn.ok) {
      return dueOn;
    }

    updates.dueOn = dueOn.dueOn;
  }

  if ("status" in record) {
    if (!isGoalStatus(record.status)) {
      return { ok: false, error: "status doit valoir 'active' ou 'achieved'." };
    }

    updates.status = record.status;
  }

  if (Object.keys(updates).length === 0) {
    return { ok: false, error: "Aucun champ modifiable fourni." };
  }

  // Les deux valeurs envoyees ensemble se verifient ici. Si une seule des deux
  // est envoyee, la comparaison demande l'autre, qui n'est connue que du store :
  // le controle est refait la-bas, sur les valeurs resultantes.
  if (
    updates.targetValue !== undefined &&
    updates.startValue !== undefined &&
    updates.targetValue === updates.startValue
  ) {
    return { ok: false, error: TARGET_EQUALS_START_ERROR };
  }

  return { ok: true, updates };
}

// Etat de la progression, nomme plutot que laisse a un pourcentage seul : un
// recul et un debut valent tous deux 0 %, et un depassement comme une cible
// juste atteinte valent tous deux 100 %. La barre ne peut pas les distinguer ;
// l'ecran, si.
export type GoalProgressState = "behind" | "inProgress" | "reached" | "exceeded";

export type GoalProgress = {
  // Brut, non borne : negatif en cas de recul, superieur a 1 en cas de
  // depassement.
  ratio: number;
  // Borne a 0-100 et ARRONDI VERS LE BAS, pour la barre. Un arrondi au plus
  // proche afficherait 100 % a 99,6 %, alors que la cible n'est pas atteinte.
  percent: number;
  state: GoalProgressState;
  // Vrai quand la cible est au-dessous du depart : perdre du poids, reduire une
  // dette. Deduit, jamais stocke.
  descending: boolean;
};

// La formule, une seule pour les deux sens :
//
//   ratio = (actuelle - depart) / (cible - depart)
//
// Objectif qui monte, epargne de 0 vers 5000 : (2000 - 0) / (5000 - 0) = 0,40.
// Objectif qui descend, poids de 90 vers 80 : (85 - 90) / (80 - 90) = 0,50 —
// numerateur et denominateur negatifs, ratio positif.
//
// Le denominateur ne peut pas etre nul : la contrainte
// personal_goals_target_differs_from_start l'interdit en base, et les deux
// parsers avant elle. La garde ci-dessous n'est donc pas une defense contre une
// donnee attendue, mais contre une ligne qui aurait echappe aux deux.
export function goalProgress(goal: {
  startValue: number;
  targetValue: number;
  currentValue: number;
}): GoalProgress {
  const span = goal.targetValue - goal.startValue;

  if (span === 0) {
    return { ratio: 0, percent: 0, state: "behind", descending: false };
  }

  const ratio = (goal.currentValue - goal.startValue) / span;
  const state: GoalProgressState =
    ratio < 0 ? "behind" : ratio > 1 ? "exceeded" : ratio === 1 ? "reached" : "inProgress";

  return {
    ratio,
    percent: Math.floor(Math.min(Math.max(ratio, 0), 1) * 100),
    state,
    descending: span < 0,
  };
}
