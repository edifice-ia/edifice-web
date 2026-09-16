// Types et validation du geste "Vider l'historique" du pole Personnel, sans
// aucune I/O.
//
// Ce fichier est importe a la fois par la route API et par le composant client,
// pour que le mot de confirmation et la liste des modules effacables soient
// definis une seule fois. Un ecart entre les deux cotes serait ici plus grave
// qu'ailleurs : la suppression est physique et irreversible.

export type ErasableModuleId = "notes" | "journal" | "habits" | "tasks";

// Le mot est fixe, jamais derive d'un nom de module. La selection etant
// variable (1 a N modules), aucun nom unique n'existe ; et taper le nom d'un
// module cochable inviterait a confondre "je nomme ce que je supprime" avec
// "je choisis ce que je supprime".
export const ERASURE_CONFIRMATION_WORD = "SUPPRIMER";

export const ERASABLE_MODULES: Array<{
  id: ErasableModuleId;
  label: string;
  // Ce que le compte affiche ne couvre PAS, pour un module etendu sur
  // plusieurs tables. Le compte reste exprime dans l'unite que l'utilisateur
  // reconnait — une habitude, pas une ligne — mais taire ce qui part avec elle
  // ferait annoncer "3 elements" pour une suppression qui en detruit des
  // centaines. Renseigne pour Habitudes et Journal ; Notes et Taches tiennent
  // dans une table.
  //
  // Toujours un nom FEMININ PLURIEL : les phrases qui l'emploient l'accordent
  // ainsi ("toutes les ... associees", "elles sont supprimees").
  //
  // Obligatoire des qu'un module porte une table dependante : sans lui, les
  // lignes emportees ne sont ni nommees a la confirmation ni chiffrees au
  // resultat, ce que DEC-012 interdit.
  cascadeLabel?: string;
  // Qualificatif de VOLUME, ajoute a l'avertissement "elles sont supprimees
  // aussi". Facultatif, et renseigne seulement quand il est vrai pour tout
  // compte : les realisations d'Habitudes sont par construction bien plus
  // nombreuses que les habitudes. Rien de tel n'est garanti pour les
  // attributions de categories de Journal. Sans lui, la phrase reste neutre.
  cascadeVolumeNote?: string;
  // Ce qui SURVIT au vidage alors que le libelle pourrait laisser croire le
  // contraire. Journal seul : "toutes les attributions de categories associees"
  // se lit facilement comme "toutes les categories", alors que les categories
  // elles-memes restent.
  cascadeSurvivalNote?: string;
}> = [
  { id: "notes", label: "Notes" },
  {
    id: "journal",
    label: "Journal et Humeur",
    cascadeLabel: "attributions de catégories",
    cascadeSurvivalNote: "Les catégories elles-mêmes sont conservées.",
  },
  {
    id: "habits",
    label: "Habitudes",
    cascadeLabel: "réalisations",
    cascadeVolumeNote: "et elles sont bien plus nombreuses",
  },
  { id: "tasks", label: "Tâches" },
];

export type ErasableModuleSummary = {
  id: ErasableModuleId;
  label: string;
  count: number;
  cascadeLabel?: string;
};

export type ErasureModuleResult = {
  id: ErasableModuleId;
  label: string;
  deletedCount: number;
  // Lignes reellement supprimees dans les tables dependantes du module.
  // Renseigne pour un module a plusieurs tables uniquement, pour que l'ecran
  // de resultat annonce le volume detruit et non le seul compte principal.
  relatedDeletedCount?: number;
};

// Liste blanche derivee de ERASABLE_MODULES, et non repetee a la main : une
// enumeration parallele finirait par diverger, et la divergence dangereuse est
// silencieuse — un module retire de la liste affichee mais toujours accepte
// par le validateur resterait effacable via un appel direct a la route.
export function isErasableModuleId(value: unknown): value is ErasableModuleId {
  return ERASABLE_MODULES.some((module) => module.id === value);
}

export function labelForErasableModule(id: ErasableModuleId) {
  return ERASABLE_MODULES.find((module) => module.id === id)?.label ?? id;
}

// Resultat de la suppression physique d'UN element archive, geste distinct de
// "Vider l'historique" — voir 11-modularite-configuration.md, sous-cas du
// troisieme geste canonique.
//
// relatedDeletedCount porte les lignes dependantes emportees avec l'element :
// les realisations d'une habitude. Vaut 0 pour un module a table unique, et
// non undefined comme sur ErasureModuleResult — ici une seule entree d'audit
// est ecrite, et sa colonne related_deleted_count est not null default 0.
export type PersonalItemErasureResult = {
  module: ErasableModuleId;
  itemId: string;
  relatedDeletedCount: number;
};

// Aperçu affiche dans la confirmation de suppression definitive d'un element.
//
// La confirmation est binaire — pas de mot a taper, l'archivage prealable
// faisant office de premiere barriere. Elle doit donc rendre la cible
// identifiable par elle-meme : une confirmation generique ne protege de rien
// quand plusieurs elements archives se ressemblent.
//
// Les sauts de ligne sont remplaces par des espaces : dans une confirmation
// tenant sur une ligne, un texte multiligne tronque au premier retour donnerait
// un apercu vide pour une note commencant par une ligne blanche.
export const ERASURE_PREVIEW_MAX_LENGTH = 80;

export function erasurePreview(content: string, maxLength = ERASURE_PREVIEW_MAX_LENGTH) {
  const flat = content.replace(/\s+/g, " ").trim();

  return flat.length > maxLength ? `${flat.slice(0, maxLength)}…` : flat;
}

export type ErasureRequestParseResult =
  | { ok: true; module: ErasableModuleId }
  | { ok: false; error: string };

// Valide la charge utile de POST /api/personal/settings/erase.
//
// Un module par requete, jamais une liste. Une requete ne peut donc plus decrire
// qu'un seul effacement, et la question de l'echec partiel entre modules ne se
// pose plus : elle n'a pas de representation possible dans ce contrat.
//
// Le mot de confirmation est revalide ici, cote serveur : la confirmation de
// l'interface ne suffit pas, la route doit rester infranchissable si on la
// court-circuite.
//
// L'identifiant de module passe par une liste blanche. Aucun nom de table ne
// vient jamais du client.
export function parseErasureRequest(payload: unknown): ErasureRequestParseResult {
  const record =
    payload && typeof payload === "object"
      ? (payload as { module?: unknown; confirmation?: unknown })
      : null;

  if (!record) {
    return { ok: false, error: "Charge utile invalide : objet attendu." };
  }

  if (record.confirmation !== ERASURE_CONFIRMATION_WORD) {
    return {
      ok: false,
      error: `Confirmation invalide : le mot ${ERASURE_CONFIRMATION_WORD} est attendu, a l'identique.`,
    };
  }

  // Un tableau ne satisfait pas isErasableModuleId, donc l'ancienne forme
  // `modules: [...]` est rejetee ici sans traitement particulier : un appelant
  // reste sur l'ancien contrat recoit une erreur de validation, jamais un
  // effacement partiel ou silencieux.
  if (!isErasableModuleId(record.module)) {
    return { ok: false, error: "module doit etre un identifiant de module connu." };
  }

  return { ok: true, module: record.module };
}
