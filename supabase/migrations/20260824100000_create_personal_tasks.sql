-- Module Taches du pole Personnel, quatrieme module a saisie manuelle.
--
-- Donnees cles reprises de 23-modules.md : intitule, echeance, statut,
-- contexte. Une seule table — une tache est une ligne, sans dependante,
-- contrairement a personal_habits.
--
-- La "charge de taches en attente" que 23-modules.md cite comme donnee derivee
-- notable n'est PAS une colonne : c'est un compte de status = 'todo', calcule a
-- la lecture. Meme decision que pour la serie et le taux de constance
-- d'Habitudes — aucune valeur derivee n'est persistee, donc aucune ne peut se
-- perimer en silence.

create table if not exists public.personal_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,

  -- L'intitule. Meme patron que personal_habits.name : non vide apres trim, et
  -- borne, pour qu'une valeur absurde soit refusee par la base et pas seulement
  -- par le formulaire.
  title text not null,

  -- L'echeance. Un JOUR, pas un instant — comme personal_habit_completions
  -- .completed_on. Les bornes de journee sont calculees en Europe/Paris cote
  -- application, jamais en UTC.
  --
  -- Nullable, et le nul porte une information : "pas d'echeance" est un etat
  -- reel, pas une valeur manquante. Meme raisonnement que mood sur
  -- personal_journal_entries, ou le nul signifie "non renseignee" et non la
  -- valeur neutre du milieu de l'echelle.
  due_on date null,

  -- Le statut, deux valeurs seulement. 'doing' est ecarte deliberement : il
  -- introduirait un workflow que rien ne demande. Meme retenue que sur
  -- personal_habits.frequency_type, ou toute granularite supplementaire
  -- obligerait a revoir le calcul plutot qu'a ajouter une valeur.
  status text not null default 'todo',

  -- Le contexte, TEXTE LIBRE DESCRIPTIF de la tache elle-meme : "perso",
  -- "pro", "courses". Rien d'autre.
  --
  -- ATTENTION, collision de vocabulaire a ne pas resoudre par extension. Ce
  -- champ n'est PAS le "Rattachement contexte" de 12-modele-de-donnees.md, qui
  -- est une TABLE DE LIAISON optionnelle entre une donnee de module et une
  -- Marque ou un Projet, pour les cas ou une meme donnee sert plusieurs
  -- contextes a la fois. Ici il n'y a ni liaison, ni instance d'espace, ni
  -- cardinalite multiple : une chaine de caracteres sur la ligne.
  --
  -- Le jour ou une tache devra pointer vers une Marque ou un Projet — et
  -- 23-modules.md prevoit explicitement qu'une tache puisse provenir d'une
  -- Action de Trajectoire — ce sera une COLONNE SEPAREE, ou une table de
  -- liaison, jamais une reinterpretation de ce champ. Le renommer en
  -- marque_id/projet_id, ou y ranger un identifiant, ferait passer un
  -- descriptif libre pour une cle etrangere et casserait silencieusement les
  -- donnees deja saisies.
  --
  -- Voir DEC-010 : aucun rattachement Marque/Projet tant que le concept
  -- n'existe pas en code.
  context_label text null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Suppression logique, patron du pole. Voir 12-modele-de-donnees.md, regle
  -- "soft delete par defaut".
  deleted_at timestamptz null,

  constraint personal_tasks_title_not_blank
    check (length(btrim(title)) > 0),
  constraint personal_tasks_title_max_length
    check (length(title) <= 200),
  constraint personal_tasks_status_known
    check (status in ('todo', 'done')),
  -- Autorise le nul, mais refuse la chaine vide : "pas de contexte" s'ecrit
  -- null, jamais "". Deux representations du meme etat divergeraient a la
  -- lecture.
  constraint personal_tasks_context_label_not_blank
    check (context_label is null or length(btrim(context_label)) > 0),
  constraint personal_tasks_context_label_max_length
    check (context_label is null or length(context_label) <= 60)
);

alter table public.personal_tasks enable row level security;

revoke all on table public.personal_tasks from anon;

-- Pas de "delete" dans ce grant, deliberement, et aucune policy DELETE non plus.
-- Sous RLS l'absence de policy vaut refus : il faudrait donc ajouter A LA FOIS
-- le privilege et une policy pour qu'une suppression physique devienne possible
-- depuis le client de session. C'est la lecon de l'incident content_assets du
-- 2026-07-28, ou le grant DELETE et une policy using(true) etaient tombes
-- ensemble.
--
-- La suppression physique de ce module, quand elle sera branchee, passera par la
-- cle service-role comme pour les trois autres — geste "Vider l'historique" et
-- suppression d'un element archive, tous deux hors perimetre de cette migration.
grant select, insert, update on table public.personal_tasks to authenticated;

-- Liste active, triee par creation.
create index if not exists personal_tasks_user_id_created_at_idx
on public.personal_tasks (user_id, created_at desc)
where deleted_at is null;

-- Tri et filtre par echeance. Partiel sur deleted_at pour la meme raison que
-- l'index precedent : les taches archivees ne sont jamais listees ici.
create index if not exists personal_tasks_user_id_due_on_idx
on public.personal_tasks (user_id, due_on)
where deleted_at is null;

create or replace function public.set_personal_tasks_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists personal_tasks_set_updated_at on public.personal_tasks;

create trigger personal_tasks_set_updated_at
before update on public.personal_tasks
for each row
execute function public.set_personal_tasks_updated_at();

-- Trois policies, identiques a Notes, Journal et Habitudes. RLS est ici le
-- garde REEL et non une defense en profondeur : le store utilise le client de
-- session, pas la cle service-role.
drop policy if exists personal_tasks_select_own on public.personal_tasks;
drop policy if exists personal_tasks_insert_own on public.personal_tasks;
drop policy if exists personal_tasks_update_own on public.personal_tasks;

create policy personal_tasks_select_own
on public.personal_tasks
for select
to authenticated
using (user_id = auth.uid());

create policy personal_tasks_insert_own
on public.personal_tasks
for insert
to authenticated
with check (user_id = auth.uid());

create policy personal_tasks_update_own
on public.personal_tasks
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());
