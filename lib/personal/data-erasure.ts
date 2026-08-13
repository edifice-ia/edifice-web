// Types et validation du geste "Vider l'historique" du pole Personnel, sans
// aucune I/O.
//
// Ce fichier est importe a la fois par la route API et par le composant client,
// pour que le mot de confirmation et la liste des modules effacables soient
// definis une seule fois. Un ecart entre les deux cotes serait ici plus grave
// qu'ailleurs : la suppression est physique et irreversible.

export type ErasableModuleId = "notes" | "journal" | "habits";

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
  // centaines. Renseigne pour Habitudes seul, les deux autres modules tenant
  // dans une table.
  cascadeLabel?: string;
}> = [
  { id: "notes", label: "Notes" },
  { id: "journal", label: "Journal et Humeur" },
  { id: "habits", label: "Habitudes", cascadeLabel: "réalisations" },
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

export type ErasureRequestParseResult =
  | { ok: true; modules: ErasableModuleId[] }
  | { ok: false; error: string };

// Valide la charge utile de POST /api/personal/settings/erase.
//
// Le mot de confirmation est revalide ici, cote serveur : la confirmation de
// l'interface ne suffit pas, la route doit rester infranchissable si on la
// court-circuite.
//
// Les identifiants de module passent par une liste blanche. Aucun nom de table
// ne vient jamais du client.
export function parseErasureRequest(payload: unknown): ErasureRequestParseResult {
  const record =
    payload && typeof payload === "object"
      ? (payload as { modules?: unknown; confirmation?: unknown })
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

  if (!Array.isArray(record.modules) || record.modules.length === 0) {
    return { ok: false, error: "modules doit etre une liste non vide." };
  }

  const modules: ErasableModuleId[] = [];

  for (const candidate of record.modules) {
    if (!isErasableModuleId(candidate)) {
      return { ok: false, error: "modules contient un identifiant inconnu." };
    }

    if (!modules.includes(candidate)) {
      modules.push(candidate);
    }
  }

  return { ok: true, modules };
}
