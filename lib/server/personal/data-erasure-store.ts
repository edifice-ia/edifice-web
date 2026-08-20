import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  ERASABLE_MODULES,
  labelForErasableModule,
  type ErasableModuleId,
  type ErasableModuleSummary,
  type ErasureModuleResult,
  type PersonalItemErasureResult,
} from "@/lib/personal/data-erasure";

// Ce store est le SEUL du pole Personnel a utiliser la cle service-role, et il
// le fait pour une raison structurelle, pas par commodite : personal_notes,
// personal_journal_entries et personal_habits n'accordent pas le privilege
// DELETE a authenticated et ne portent aucune policy DELETE. Une suppression
// physique y est donc impossible depuis le client de session, par conception —
// voir les migrations 20260804100000, 20260805100000 et 20260806100000.
//
// Une seule table du pole fait exception, personal_habit_completions, qui
// accorde DELETE a authenticated sous une policy scopee au proprietaire :
// decocher un jour retire la ligne. Elle est neanmoins videe ici par la
// service-role comme les autres, et non par le client de session — melanger
// deux chemins de suppression dans un meme geste rendrait le resultat partiel
// si l'un des deux echouait.
//
// Le service-role contourne RLS. Il n'existe donc ICI aucun garde en base :
// le seul filtre d'isolation est le .eq("user_id", userId) applique ci-dessous.
// C'est le point le plus dangereux de tout ce chantier. Il est centralise dans
// une seule fonction, deleteOwnedRows, pour qu'aucun appelant ne puisse
// l'oublier — ne jamais appeler .delete() directement depuis ce fichier.
let erasureClient: SupabaseClient | null = null;

function getErasureClient() {
  if (erasureClient) {
    return erasureClient;
  }

  const supabaseUrl =
    process.env.SUPABASE_URL?.trim() || process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "La suppression definitive requiert SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY.",
    );
  }

  erasureClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  return erasureClient;
}

// Liste blanche identifiant de module -> tables. Aucun nom de table ne vient du
// client : il est resolu ici, a partir d'un identifiant deja valide par
// parseErasureRequest.
//
// countedTable porte l'unite annoncee a l'utilisateur : une note, une entree de
// journal, une habitude. dependents liste les tables qui partent avec, dans
// l'ordre de suppression — les dependantes d'abord, la principale ensuite.
//
// Habitudes est le premier module a deux tables. Ses realisations sont
// supprimees EXPLICITEMENT avant les habitudes plutot que laissees a la cascade
// de la cle etrangere composite.
//
// CE N'EST PAS UNE REGLE DU DEPOT — voir DEC-013, au statut `propose`. C'est ce
// que le code fait aujourd'hui, sur un argument qui tient mais ne suffit pas a
// generaliser : la cascade existe bien dans la migration 20260806100000, mais ce
// module a precisement connu une migration appliquee partiellement en base
// (l'incident RLS documente dans cc281b2), et une contrainte absente en
// production ne leve aucune erreur — les realisations survivraient a leur
// habitude en lignes orphelines qu'aucun ecran ne montre plus.
//
// Ce que l'argument ne couvre pas, et qui reste a trancher : le patron est
// deduit d'un seul module, et il suppose que chaque table dependante porte
// `user_id`, faute de quoi deleteOwnedRows ne peut pas la filtrer. Un deuxieme
// module effacable a table dependante tranchera. D'ici la, ne pas invoquer ce
// choix comme precedent etabli ailleurs dans le depot.
//
// `as const satisfies Record<...>` plutot qu'une annotation de type : l'annotation
// elargissait les noms de tables en `string`, et la liste blanche ne tenait plus
// que par convention. `satisfies` verifie toujours que les trois modules sont
// couverts et que la forme est la bonne, mais laisse TypeScript conserver les
// litteraux — c'est d'eux qu'est derive ErasableTableName ci-dessous.
const MODULE_TABLES = {
  notes: { countedTable: "personal_notes", dependents: [] },
  journal: { countedTable: "personal_journal_entries", dependents: [] },
  habits: {
    countedTable: "personal_habits",
    // parentKey : la colonne par laquelle la dependante reference sa principale.
    // Le geste module n'en a pas besoin (il vide tout par user_id), mais la
    // suppression d'UN element doit cibler les seules dependantes de cet
    // element. Les deux granularites lisent la meme declaration, ce qui evite
    // une seconde table de correspondance qui divergerait.
    dependents: [{ table: "personal_habit_completions", parentKey: "habit_id" }],
  },
} as const satisfies Record<
  ErasableModuleId,
  { countedTable: string; dependents: readonly { table: string; parentKey: string }[] }
>;

// Union des noms de tables reellement effacables, derivee de MODULE_TABLES et
// jamais reecrite a la main — meme raison que pour isErasableModuleId : deux
// listes paralleles divergent, et cette divergence-la serait silencieuse.
//
// C'est ce type qui porte la garantie de liste blanche au compilateur. Passer a
// deleteOwnedRows un nom de table absent de MODULE_TABLES ne compile pas, et
// aucune valeur venue du client ne peut satisfaire ce type.
//
// `dependents[number]` vaut `never` pour un module sans dependante, ce qui
// disparait de l'union sans avoir a traiter le cas.
type ErasableTableName =
  | (typeof MODULE_TABLES)[ErasableModuleId]["countedTable"]
  | (typeof MODULE_TABLES)[ErasableModuleId]["dependents"][number]["table"];

// Compte TOUTES les lignes du module, archivees comprises. "Vider l'historique"
// ne fait pas de distinction entre actif et archive ; annoncer un compte qui en
// exclurait une partie mentirait sur la portee du geste.
async function countOwnedRows(userId: string, moduleId: ErasableModuleId) {
  const supabase = getErasureClient();
  const { count, error } = await supabase
    .from(MODULE_TABLES[moduleId].countedTable)
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);

  if (error) {
    throw new Error(error.message);
  }

  return count ?? 0;
}

// Le seul endroit du depot qui supprime physiquement des donnees Personnel.
// Le filtre sur user_id est applique ici et nulle part ailleurs.
//
// Prend un nom de table et non un identifiant de module, un module pouvant
// desormais s'etendre sur plusieurs tables. Le type ErasableTableName restreint
// ce parametre aux seules tables declarees dans MODULE_TABLES : la garantie de
// liste blanche est tenue par le compilateur, pas par ce commentaire.
async function deleteOwnedRows(userId: string, tableName: ErasableTableName) {
  const supabase = getErasureClient();
  const { count, error } = await supabase
    .from(tableName)
    .delete({ count: "exact" })
    .eq("user_id", userId);

  if (error) {
    throw new Error(error.message);
  }

  return count ?? 0;
}

// Une entree par TABLE effectivement videe, et non par module. Ecrite apres la
// suppression, avec le compte reellement supprime.
//
// Un module a deux tables produit donc deux entrees, portant le meme `module`
// et deux `table_name` distincts. C'est le sens de la colonne table_name, et
// c'est ce qui permet au journal de dire combien de realisations sont parties
// avec les habitudes — une entree unique par module aurait tu ce volume, alors
// que c'est le plus gros des deux.
async function writeErasureAudit({
  userId,
  moduleId,
  tableName,
  deletedCount,
}: {
  userId: string;
  moduleId: ErasableModuleId;
  tableName: string;
  deletedCount: number;
}) {
  const supabase = getErasureClient();
  const { error } = await supabase.from("personal_data_erasure_log").insert({
    user_id: userId,
    module: moduleId,
    table_name: tableName,
    deleted_count: deletedCount,
    source: "settings_personal",
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function summarizePersonalErasure(
  userId: string,
): Promise<ErasableModuleSummary[]> {
  const counts = await Promise.all(
    ERASABLE_MODULES.map(async (module) => ({
      id: module.id,
      label: module.label,
      count: await countOwnedRows(userId, module.id),
      // Repropage tel quel : c'est l'interface qui decide comment le dire, mais
      // l'information doit voyager avec le compte qu'elle nuance.
      cascadeLabel: module.cascadeLabel,
    })),
  );

  return counts;
}

// Efface un module, et un seul.
//
// L'echec partiel ENTRE modules n'existe plus : il n'y a plus de boucle externe,
// donc plus d'etat ou un module serait supprime et le suivant non. Chaque appel
// vise une cible unique, et l'appelant ne peut plus decrire qu'un seul resultat.
//
// L'echec partiel A L'INTERIEUR d'un module reste possible, et n'est pas traite
// ici : sur un module a table dependante, les dependantes sont supprimees avant
// la principale, et une erreur entre les deux laisse la principale intacte pour
// des dependantes deja parties. Rendre l'ensemble atomique demanderait une
// fonction Postgres `security definer` — arbitrage non pris, voir le suivi de
// chantier.
export async function erasePersonalModule({
  userId,
  moduleId,
}: {
  userId: string;
  moduleId: ErasableModuleId;
}): Promise<ErasureModuleResult> {
  const { countedTable, dependents } = MODULE_TABLES[moduleId];

  // Les dependantes d'abord, la principale ensuite. L'ordre inverse
  // s'appuierait sur la cascade pour emporter les dependantes, ce que ce
  // store refuse de faire — voir MODULE_TABLES.
  let relatedDeletedCount = 0;

  for (const dependent of dependents) {
    const dependentCount = await deleteOwnedRows(userId, dependent.table);
    await writeErasureAudit({
      userId,
      moduleId,
      tableName: dependent.table,
      deletedCount: dependentCount,
    });

    relatedDeletedCount += dependentCount;
  }

  const deletedCount = await deleteOwnedRows(userId, countedTable);
  await writeErasureAudit({
    userId,
    moduleId,
    tableName: countedTable,
    deletedCount,
  });

  return {
    id: moduleId,
    label: labelForErasableModule(moduleId),
    deletedCount,
    // Omis pour un module a table unique, plutot que force a 0 : "et 0
    // realisations" sur une note n'aurait aucun sens a l'ecran.
    ...(dependents.length > 0 ? { relatedDeletedCount } : {}),
  };
}

// ---------------------------------------------------------------------------
// Suppression physique d'UN element archive
//
// Geste distinct de "Vider l'historique" : autre granularite, autre journal
// d'audit (personal_item_erasure_log), autre friction cote interface — une
// confirmation binaire, pas un mot a taper, parce que l'archivage prealable
// fait deja office de premiere barriere.
//
// Il vit dans CE fichier et non dans notes-store / journal-store /
// habits-store, pour tenir l'invariant annonce en tete : un seul fichier du
// depot supprime physiquement des donnees Personnel. L'eparpiller dans les
// trois stores de module le romprait, et ces stores utilisent le client de
// session, qui n'a de toute facon pas le privilege DELETE.
// ---------------------------------------------------------------------------

// Supprime UNE ligne, sous filtre triple : identifiant, proprietaire, et
// deleted_at non nul.
//
// La troisieme condition est ce qui rend impossible la suppression d'un element
// ACTIF par appel direct a la route. Elle n'est pas une commodite d'affichage :
// l'interface n'expose le bouton que dans les archives, mais l'interface n'est
// pas un garde. Sans ce filtre, un id d'element actif poste a la route le
// detruirait sans passer par l'archivage.
async function deleteOwnedArchivedRow(
  userId: string,
  tableName: ErasableTableName,
  itemId: string,
) {
  const supabase = getErasureClient();
  const { data, error } = await supabase
    .from(tableName)
    .delete()
    .eq("id", itemId)
    .eq("user_id", userId)
    .not("deleted_at", "is", null)
    .select("id")
    .maybeSingle<{ id: string }>();

  if (error) {
    throw new Error(error.message);
  }

  return data !== null;
}

// Supprime les dependantes d'UN element : filtre sur la colonne parente ET sur
// user_id. Le second est redondant avec la cle etrangere composite, et c'est
// voulu — c'est precisement la contrainte que DEC-013 refuse de presumer
// appliquee en base.
async function deleteOwnedDependents(
  userId: string,
  tableName: ErasableTableName,
  parentKey: string,
  itemId: string,
) {
  const supabase = getErasureClient();
  const { count, error } = await supabase
    .from(tableName)
    .delete({ count: "exact" })
    .eq(parentKey, itemId)
    .eq("user_id", userId);

  if (error) {
    throw new Error(error.message);
  }

  return count ?? 0;
}

// UNE entree par element supprime, y compris pour un module a plusieurs tables.
// Le volume dependant vit dans related_deleted_count.
//
// Asymetrie assumee avec writeErasureAudit, qui ecrit une entree par TABLE
// videe : ici l'unite auditee est l'element, pas la table. Les deux journaux
// repondent a des questions differentes, d'ou deux tables distinctes.
//
// Aucun contenu n'est journalise : ni le texte de la note, ni l'humeur, ni le
// nom de l'habitude. item_id est un uuid technique, qui ne reconstitue rien.
async function writeItemErasureAudit({
  userId,
  moduleId,
  tableName,
  itemId,
  relatedDeletedCount,
}: {
  userId: string;
  moduleId: ErasableModuleId;
  tableName: string;
  itemId: string;
  relatedDeletedCount: number;
}) {
  const supabase = getErasureClient();
  const { error } = await supabase.from("personal_item_erasure_log").insert({
    user_id: userId,
    module: moduleId,
    table_name: tableName,
    item_id: itemId,
    related_deleted_count: relatedDeletedCount,
    source: "archives_panel",
  });

  if (error) {
    throw new Error(error.message);
  }
}

// Renvoie null si l'element n'existe pas, n'appartient pas a l'appelant, ou
// n'est pas archive. L'appelant repond 404 dans les trois cas, sans les
// distinguer : les separer transformerait la route en oracle d'existence.
export async function permanentlyDeletePersonalItem({
  userId,
  moduleId,
  itemId,
}: {
  userId: string;
  moduleId: ErasableModuleId;
  itemId: string;
}): Promise<PersonalItemErasureResult | null> {
  const { countedTable, dependents } = MODULE_TABLES[moduleId];

  // Sur un module a dependantes, l'eligibilite est verifiee AVANT de toucher
  // quoi que ce soit. Supprimer les realisations d'abord puis decouvrir que
  // l'habitude n'etait pas archivee detruirait des donnees sur un geste qui
  // aurait du repondre 404 sans rien faire.
  //
  // Sur un module a table unique, cette verification est inutile : le filtre
  // triple du DELETE fait office de controle, et une lecture prealable
  // n'ajouterait qu'un aller-retour et une fenetre de course.
  if (dependents.length > 0) {
    const supabase = getErasureClient();
    const { data, error } = await supabase
      .from(countedTable)
      .select("id")
      .eq("id", itemId)
      .eq("user_id", userId)
      .not("deleted_at", "is", null)
      .maybeSingle<{ id: string }>();

    if (error) {
      throw new Error(error.message);
    }

    if (data === null) {
      return null;
    }
  }

  // Les dependantes d'abord, la principale ensuite — meme ordre que le geste
  // module, et meme raison : ne pas dependre d'une cascade dont l'application
  // en base n'est pas verifiee (DEC-013).
  let relatedDeletedCount = 0;

  for (const dependent of dependents) {
    relatedDeletedCount += await deleteOwnedDependents(
      userId,
      dependent.table,
      dependent.parentKey,
      itemId,
    );
  }

  const deleted = await deleteOwnedArchivedRow(userId, countedTable, itemId);

  if (!deleted) {
    return null;
  }

  await writeItemErasureAudit({
    userId,
    moduleId,
    tableName: countedTable,
    itemId,
    relatedDeletedCount,
  });

  return { module: moduleId, itemId, relatedDeletedCount };
}
