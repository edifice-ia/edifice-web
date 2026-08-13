import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  ERASABLE_MODULES,
  labelForErasableModule,
  type ErasableModuleId,
  type ErasableModuleSummary,
  type ErasureModuleResult,
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
// de la cle etrangere composite. La cascade existe bien dans la migration
// 20260806100000, mais ce module a precisement connu une migration appliquee
// partiellement en base — l'incident RLS documente dans cc281b2. Si la
// contrainte manque en production, la cascade ne se produit pas et les
// realisations survivent a leur habitude : des lignes orphelines qu'aucun ecran
// ne montre plus, apres un geste qui promettait de tout effacer. Supprimer
// explicitement ne coute rien quand la cascade fonctionne, et rattrape le cas
// ou elle manque. Ne jamais dependre d'une contrainte pour la correction d'une
// suppression qu'on annonce comme totale.
const MODULE_TABLES: Record<
  ErasableModuleId,
  { countedTable: string; dependents: string[] }
> = {
  notes: { countedTable: "personal_notes", dependents: [] },
  journal: { countedTable: "personal_journal_entries", dependents: [] },
  habits: {
    countedTable: "personal_habits",
    dependents: ["personal_habit_completions"],
  },
};

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
// desormais s'etendre sur plusieurs tables. Ce nom ne peut venir que de
// MODULE_TABLES : aucun appelant de ce fichier ne doit lui passer autre chose,
// et rien de ce qui vient du client n'atteint ce parametre.
async function deleteOwnedRows(userId: string, tableName: string) {
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

// Traite les modules en sequence, pas en parallele : chaque suppression est
// suivie de son entree d'audit, et un echec sur le second module ne doit pas
// laisser le premier sans trace.
//
// En cas d'echec partiel, les modules deja traites restent supprimes et
// journalises ; l'erreur remonte a l'appelant, qui renvoie ce qui a ete fait.
export async function erasePersonalModules({
  userId,
  modules,
}: {
  userId: string;
  modules: ErasableModuleId[];
}): Promise<ErasureModuleResult[]> {
  const results: ErasureModuleResult[] = [];

  for (const moduleId of modules) {
    const { countedTable, dependents } = MODULE_TABLES[moduleId];

    // Les dependantes d'abord, la principale ensuite. L'ordre inverse
    // s'appuierait sur la cascade pour emporter les dependantes, ce que ce
    // store refuse de faire — voir MODULE_TABLES.
    let relatedDeletedCount = 0;

    for (const dependentTable of dependents) {
      const dependentCount = await deleteOwnedRows(userId, dependentTable);
      await writeErasureAudit({
        userId,
        moduleId,
        tableName: dependentTable,
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

    results.push({
      id: moduleId,
      label: labelForErasableModule(moduleId),
      deletedCount,
      // Omis pour un module a table unique, plutot que force a 0 : "et 0
      // realisations" sur une note n'aurait aucun sens a l'ecran.
      ...(dependents.length > 0 ? { relatedDeletedCount } : {}),
    });
  }

  return results;
}
