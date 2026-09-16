"use client";

import type { PersonalJournalCategoryWithCounts } from "@/lib/personal/journal-categories";

// Categories d'une entree, sur le motif de MoodSelector : boutons a bascule,
// aria-pressed. L'ordre est celui de la liste chargee, deja triee par nom par le
// serveur. Aucune categorie n'est cochee par defaut, et aucune n'est
// obligatoire — l'ecran le dit plutot que de le laisser deviner.
//
// Partage par PersonalJournalPanel (creation, modification) et par la carte
// de gestion (reassignation depuis l'ecran de blocage). Il vit dans ce fichier
// et non dans PersonalJournalPanel : la carte, importee par ce panneau, ne
// pourrait l'y chercher sans former un cycle.
//
// emptySelectionNote remplace la mention affichee quand rien n'est coche ;
// null la retire. La reassignation la retire : une entree bloquante doit
// recevoir au moins une categorie, rien coche n'y est donc pas "permis".
export function JournalCategorySelector({
  categories,
  disabled = false,
  emptySelectionNote = "Aucune catégorie cochée : c'est permis.",
  isLoading,
  loadError,
  onChange,
  onManage,
  value,
}: {
  categories: PersonalJournalCategoryWithCounts[];
  disabled?: boolean;
  emptySelectionNote?: string | null;
  isLoading: boolean;
  loadError: string | null;
  onChange: (categoryIds: string[]) => void;
  onManage: () => void;
  value: string[];
}) {
  if (isLoading) {
    return <p className="text-sm text-[#A7B0C0]">Catégories : chargement...</p>;
  }

  if (loadError) {
    return (
      <p className="text-sm text-[#fbbf24]">
        Catégories indisponibles : {loadError} L&apos;entrée peut être enregistrée sans.
      </p>
    );
  }

  if (categories.length === 0) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-[#A7B0C0]">Catégories</span>
        <span className="text-sm text-[#64748b]">Aucune catégorie pour l&apos;instant.</span>
        <button
          className="rounded-md border border-[#1D2A44] bg-[#08111A] px-3 py-1 text-sm font-semibold text-[#A7B0C0] transition hover:border-[#39E6D0]/40 hover:text-[#F8FAFC]"
          onClick={onManage}
          type="button"
        >
          Créer une catégorie
        </button>
      </div>
    );
  }

  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-[#A7B0C0]">Catégories</span>
        {categories.map((category) => {
          const isSelected = value.includes(category.id);

          return (
            <button
              aria-pressed={isSelected}
              className={`rounded-md border px-3 py-1 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${
                isSelected
                  ? "border-[#39E6D0]/60 bg-[#39E6D0]/15 text-[#39E6D0]"
                  : "border-[#1D2A44] bg-[#08111A] text-[#A7B0C0] hover:border-[#39E6D0]/40 hover:text-[#F8FAFC]"
              }`}
              disabled={disabled}
              key={category.id}
              onClick={() =>
                onChange(
                  isSelected
                    ? value.filter((id) => id !== category.id)
                    : [...value, category.id],
                )
              }
              title={category.description ?? undefined}
              type="button"
            >
              {category.name}
            </button>
          );
        })}
      </div>
      {value.length === 0 && emptySelectionNote ? (
        <p className="text-xs text-[#64748b]">{emptySelectionNote}</p>
      ) : null}
    </div>
  );
}
