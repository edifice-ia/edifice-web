# Actions manuelles en attente

Ce fichier recense les actions que **seul un humain peut faire** : celles qui nécessitent un navigateur, une console tierce, une authentification interactive, ou un droit dont l'agent ne dispose pas.

Règle : quand une action manuelle est détectée pendant une session autonome, elle est **ajoutée ici avec les étapes exactes**, jamais contournée ni simulée. La session continue ensuite sur la tâche actionnable suivante.

Voir le protocole complet dans [CLAUDE.md](./CLAUDE.md#protocole--session-longue-absence-de-supervision-immédiate).

## Sommaire

- [Statuts](#statuts)
- [Modèle d'entrée](#modèle-dentrée)
- [Entrées](#entrées)
- [Archive (done)](#archive-done)

## Statuts

| Statut | Signification |
| --- | --- |
| `pending` | À faire par un humain. Peut bloquer une suite de tâches. |
| `done` | Fait. Déplacer l'entrée dans [Archive](#archive-done) en gardant la date de réalisation. |

## Modèle d'entrée

Copier ce bloc pour chaque nouvelle entrée. Les étapes doivent être **copiables telles quelles**, sans avoir à deviner un nom de projet, une URL ou une valeur.

```markdown
### YYYY-MM-DD — Titre court et concret

**Statut** : `pending`

**Pourquoi c'est manuel** : quelle limite technique empêche l'agent de le faire lui-même. Être précis sur la limite, pas sur la tâche.

**Bloque** : ce qui est en attente de cette action (ou `rien`).

**Étapes** :

1. Étape exacte, avec l'URL complète.
2. Étape exacte, avec le nom exact du champ / bouton.
3. Valeur à coller, dans un bloc de code si c'est du SQL, une variable d'environnement ou une commande.

**Vérification** : comment savoir que c'est bien passé (ce qui doit s'afficher, ou la commande à relancer côté agent).
```

Exemple de rédaction du champ « Pourquoi c'est manuel » (formulations attendues) :

- « nécessite un clic dans le SQL Editor Supabase, pas d'accès API direct pour ce type d'opération »
- « ajout d'une URL de redirection OAuth dans Google Cloud Console : console web uniquement, pas d'API pour les clients OAuth »
- « variable d'environnement à créer dans le dashboard Vercel, avec sélection des environnements (Production/Preview) via cases à cocher »
- « validation d'un consentement / acceptation de conditions : action irréversible engageant le compte, réservée à l'humain »

## Entrées

<!-- Les entrées `pending` vont ici, les plus récentes en haut. -->

### 2026-08-01 — Vérifier si la review TikTok est terminée, et durcir `/api/oauth/tiktok/status` si oui

**Statut** : `pending`

**Pourquoi c'est manuel** : l'état d'avancement d'une app review TikTok ne se lit que dans le portail développeur TikTok, derrière une authentification interactive. Rien dans le dépôt ne l'indique — recherche faite le 2026-08-01 : aucun ticket, aucune date de soumission, aucun statut, ni dans le code, ni dans `knowledge/`, ni dans l'historique git. Le seul repère est la date d'introduction de l'exception, le 2026-07-28 (`2cf9316`), et celle de la mise en place de l'accès reviewer, entre le 2026-05-20 et le 2026-05-31.

**Bloque** : rien de fonctionnel. C'est une exception de sécurité sans date d'expiration — le risque est qu'elle survive à sa raison d'être et devienne un écart inexpliqué.

**Déclencheur** : relancer la demande de revue TikTok lors de la reprise du module de création de contenu (Atelier de contenu). Noter ici la date de la relance.

**Ce que l'exception autorise exactement** — mesuré le 2026-08-01, pour que la décision se prenne sur des faits et non sur le mot « exception » :

- **Aucun accès anonyme.** Sans session, la route répond `403`, et le middleware redirige déjà vers `/login`. Le compromis ne porte que sur le filtre de rôle.
- `canAccessPrivateCockpit(user)` vaut `getUserRole(user) !== "reviewer"` (`src/lib/auth/roles.ts`). L'écart entre ce garde et le garde strict est donc **exactement un rôle** : celui de `reviewer@edificeia.com`, compte créé et contrôlé par le projet.
- La réponse ne contient **ni token, ni identifiant de compte, ni scope** : `{ present, storageEnabled, storageMode, expiresAt, updatedAt }`. Le reviewer voit qu'un token TikTok existe et depuis quand — strictement moins que ce que le flux OAuth et l'upload sandbox lui accordent déjà par ailleurs.

**Pourquoi le durcissement ne peut pas être fait à l'aveugle** : `/tiktok-sandbox-test` rend `<TikTokConnectionControls />`, qui appelle cette route et **affiche les quatre champs**. Ajouter `canAccessPrivateCockpit` ferait répondre `403` au reviewer et casserait la « vérification du token stocké côté serveur » que la page lui annonce — pendant l'examen de cette même page.

**Étapes** :

1. Ouvrir le portail développeur TikTok et lire le statut de l'app review.
2. **Si la review est terminée** (approuvée ou définitivement rejetée), appliquer le durcissement :
   - retirer `"/api/oauth/tiktok/status"` de `reviewerAllowedPaths` dans `src/lib/supabase/proxy.ts` ;
   - dans `app/api/oauth/tiktok/status/route.ts`, remplacer le garde par celui de `youtube/status` et `calendar/status` :
     ```ts
     if (!user || !canAccessPrivateCockpit(user)) {
       return NextResponse.json({ error: "Acces refuse." }, { status: 403 });
     }
     ```
     avec `import { canAccessPrivateCockpit } from "@/src/lib/auth/roles";` ;
   - supprimer le bloc de commentaire d'exception devenu faux, et mettre à jour `DEC-007` dans `knowledge/Documentation-Technique-Code/03_Decisions.md`, qui cite cette route comme cas particulier assumé.
   - décider au passage du sort des trois autres chemins encore dans `reviewerAllowedPaths` (`/api/oauth/tiktok/start`, `/callback`, `/upload-test`) et du compte `reviewer@edificeia.com` lui-même.
3. **Si la review est encore en cours**, ne rien changer et repousser la relecture ; noter la date de relecture ici.

**Vérification** : connecté avec un compte non-reviewer, `/api/oauth/tiktok/status` doit continuer de répondre `200`. Avec le compte reviewer, elle doit répondre `403` une fois le durcissement appliqué. Et `grep -rn "tiktok/status" src/lib/supabase/proxy.ts` ne doit plus rien renvoyer.

## Archive (done)

### 2026-11-26 — Contrôler à la main l'archivage et la restauration dans l'interface Academy

**Statut** : `done` — 2026-11-26. Contrôle exécuté par Vincent, porteur du projet, dans le navigateur, sur le serveur local (`localhost:3000`), avec le compte `test-erase@edificeia.com` ; **conforme aux sept étapes**. L'agent n'a rien exécuté.

**Pourquoi c'est manuel** : le contrôle demande une session authentifiée du porteur du projet dans le navigateur, et l'agent ne saisit pas d'identifiants.

**Bloquait** : la validation de l'étape d'édition 3 ; à faire avec le test SQL d'isolation du même jour.

**Compte** : `test-erase@edificeia.com`, sur les données de contrôle créées le 2026-11-26, **conservées pour ce test** — ne pas les supprimer avant la fin du contrôle.

**Résultats** — 2026-11-26, transmis par Vincent, sur les sept étapes du contrôle préparé le même jour :

1. **Annuler** : après « Archiver » puis « Annuler », le programme reste dans la liste ; « Programmes archivés » est vide — **conforme**.
2. **Archiver un programme** : il disparaît de la liste et apparaît dans « Programmes archivés » ; sa page répond `404` — **conforme**.
3. **Restaurer le programme** : il revient avec son arbre complet — **conforme**.
4. **Archiver une leçon, un chapitre, un module, une matière** : chacun disparaît de l'arbre avec ses descendants ; « Éléments archivés de ce programme » ne montre que les éléments dont les ancêtres sont vivants ; la page d'une leçon archivée, ou sous un élément archivé, répond `404` — **conforme**.
5. **Chapitre, puis module, puis restauration du module** : le chapitre reste archivé, absent de l'arbre, et réapparaît dans la section, restaurable — **conforme**.
6. **Refus à deux onglets** (« Restaurer » sur un chapitre dont le module a été archivé dans l'autre onglet) : `404`, message « Cet élément a changé entre-temps. La page a été actualisée. » **visible** — **conforme**.
7. **Remise en état** : effectuée.

**Données de contrôle** : elles restent sur `test-erase@edificeia.com` ; aucun nettoyage n'est demandé.

**Étapes prévues** (telles qu'écrites avant l'exécution ; le contrôle réellement exécuté est celui, en sept étapes, consigné ci-dessus) :

1. Page Programmes : archiver un programme (« Archiver », puis « Confirmer l'archivage ») ; il disparaît de la liste et apparaît dans « Programmes archivés » ; le restaurer : il revient, avec tout son contenu.
2. « Annuler » après « Archiver » : rien n'est archivé.
3. Dans l'arbre d'un programme : archiver une leçon, puis un chapitre ; chacun disparaît de l'arbre et apparaît dans « Éléments archivés de ce programme » ; les restaurer.
4. **Cas imposé** : archiver un **chapitre**, puis **son module** ; vérifier que la section n'affiche que le module (le chapitre, sous un ancêtre archivé, n'y figure pas) ; **restaurer le module** ; vérifier que le module revient dans l'arbre, que le **chapitre reste archivé** — absent de l'arbre — et qu'il **apparaît maintenant dans la section**, restaurable ; le restaurer.
5. Page d'une leçon archivée, ou sous un ancêtre archivé : `404`.
6. Relever les identifiants de toute donnée créée pendant le contrôle, pour le nettoyage.

**Vérification** : chaque étape conforme ; transmettre les écarts tels quels à l'agent.

*Écrit le 2026-11-26 par l'agent, sans exécution ; exécution par Vincent consignée le même jour.*

### 2026-11-26 — Tester l'isolation SQL de la lecture des éléments archivés d'un programme

**Statut** : `done` — 2026-11-26. Script exécuté par Vincent, porteur du projet, dans le SQL Editor, sous le rôle `postgres` ; **résultats conformes**. L'agent n'a exécuté aucune requête.

**Pourquoi c'est manuel** : seul le SQL Editor peut exécuter ce test sur la base réelle, et aucune base de test n'est disponible depuis le dépôt (ni CLI Supabase, ni `psql`, ni Docker sur cette machine). L'agent n'a pas d'accès SQL au projet. **À exécuter par Vincent, porteur du projet**, dans le SQL Editor, sous le rôle `postgres`.

**Bloquait** : le push de l'étape d'édition 3 (archivage et restauration depuis l'interface), qui ajoute au store `listArchivedDescendants` — une nouvelle lecture, donc une nouvelle surface d'accès.

**Ce que le test reproduit** : `listArchivedDescendants(userId, programId)` (`lib/server/academy/hierarchy-store.ts`) lit, sous le client de session, le programme vivant, puis à chaque niveau les enfants **vivants** (pour descendre) et **archivés** (pour la liste) des seuls parents vivants, avec `user_id = userId` sur chaque requête. Le script réécrit ces requêtes en une seule requête SQL équivalente, exécutée sous le rôle `authenticated` de chaque compte, règle d'accès appliquée. Il contrôle :

1. **pas de fuite entre comptes** : B ne lit aucune archive du programme de A, et A aucune de celui de B, même en passant l'identifiant de l'autre programme ; B ne voit aucune ligne archivée de A, même sans filtre `user_id` ;
2. **aucun élément sous un ancêtre archivé** : `U3`, sous la matière archivée `S2`, et `C3`, sous le module archivé `U2`, ne figurent pas dans la liste de A ;
3. la liste contient bien les éléments archivés restaurables, et seulement eux.

**Limite** : c'est la requête SQL équivalente qui est éprouvée, pas le code TypeScript lui-même ; l'équivalence est vérifiée à la lecture. Le contrôle manuel dans l'interface (entrée du même jour) éprouve le code réel.

**Sans effet durable** : même modèle que les tests du 2026-11-25. Le script écrit **uniquement dans une transaction terminée par `rollback`** ; les comptes fictifs `…000c` (A) et `…000d` (B) sont créés dans `auth.users` au début de la transaction, sous `postgres`, et retirés par le `rollback`. Aucun compte réel n'est utilisé, aucune donnée existante n'est lue ni modifiée — les données de contrôle de `test-erase@edificeia.com` ne sont pas touchées.

**Résultats obtenus** — 2026-11-26, transmis par Vincent (tableau complet de la synthèse, cinq colonnes) :

| Colonne | Résultat | Attendu |
| --- | --- | --- |
| `archives_de_a_lues_par_a` | `C2 archive \| L1 archivee \| S2 archivee \| U2 archive` | idem — **conforme** : ni `U3`, ni `C3`, sous un ancêtre archivé |
| `archives_de_b_lues_par_a` | `(aucun)` | idem — **conforme** : aucune fuite de B vers A |
| `archives_de_a_lues_par_b` | `(aucun)` | idem — **conforme** : aucune fuite de A vers B |
| `archives_de_b_lues_par_b` | `SB archivee` | idem — **conforme** |
| `lignes_archivees_de_a_vues_par_b` | `0` | idem — **conforme** |

**Contrôle après coup** : `0` partout — **conforme**.

**Précision sur la dernière colonne** : le commentaire du script dit « sans filtre user_id » ; plus exactement, B interroge les lignes de A en filtrant sur l'identifiant de A. Cette requête est exécutée après `select set_config('request.jwt.claims', '{"sub":"…000d","role":"authenticated"}', true);` puis `set local role authenticated;`, et avant `reset role;` — vérifié dans le script le 2026-11-26 : c'est donc **la règle d'accès qui masque** à B les lignes de A.

**Étapes** :

1. Ouvrir le SQL Editor du projet Supabase.
2. **Contrôle préalable, en lecture seule** :
   ```sql
   select column_name, data_type
   from information_schema.columns
   where table_schema = 'auth' and table_name = 'users'
     and is_nullable = 'NO' and column_default is null
   order by ordinal_position;

   select tgname, tgenabled
   from pg_trigger
   where tgrelid = 'auth.users'::regclass and not tgisinternal;
   ```
   Attendu : `id` seul dans la première requête, aucune ligne dans la seconde. **Sinon, s'arrêter** et le transmettre à l'agent.
3. Lancer le script ci-dessous **en une seule exécution**. Si une erreur s'affiche à la place de la synthèse, s'arrêter et transmettre le message tel quel : la transaction est annulée, rien n'est écrit.
4. Relever le résultat de la synthèse.
5. **Contrôle après coup, en lecture seule** :
   ```sql
   select
     (select count(*) from auth.users where id in ('00000000-0000-0000-0000-00000000000c', '00000000-0000-0000-0000-00000000000d')) as utilisateurs_de_test_restants,
     (select count(*) from public.academy_programs where user_id in ('00000000-0000-0000-0000-00000000000c', '00000000-0000-0000-0000-00000000000d')) as programmes,
     (select count(*) from public.academy_subjects where user_id in ('00000000-0000-0000-0000-00000000000c', '00000000-0000-0000-0000-00000000000d')) as matieres,
     (select count(*) from public.academy_units where user_id in ('00000000-0000-0000-0000-00000000000c', '00000000-0000-0000-0000-00000000000d')) as modules,
     (select count(*) from public.academy_chapters where user_id in ('00000000-0000-0000-0000-00000000000c', '00000000-0000-0000-0000-00000000000d')) as chapitres,
     (select count(*) from public.academy_lessons where user_id in ('00000000-0000-0000-0000-00000000000c', '00000000-0000-0000-0000-00000000000d')) as lecons;
   ```
   Attendu : `0` partout.
6. Transmettre les résultats, tels quels, à l'agent pour consignation.

```sql
begin;

-- Sous le role postgres du SQL Editor : creation des deux comptes de test.
-- Annules par le rollback final.
insert into auth.users (id) values
  ('00000000-0000-0000-0000-00000000000c'),
  ('00000000-0000-0000-0000-00000000000d');

-- Compte A : un programme, sous son propre role.
--   S1 matiere vivante ; S2 matiere archivee, avec U3 module archive dessous.
--   U1 module vivant sous S1 ; U2 module archive sous S1, avec C3 chapitre archive dessous.
--   C1 chapitre vivant sous U1 ; C2 chapitre archive sous U1.
--   L1 lecon archivee sous C1 ; L2 lecon vivante sous C1.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000c","role":"authenticated"}', true);
set local role authenticated;
insert into public.academy_programs (user_id, kind, title) values ('00000000-0000-0000-0000-00000000000c', 'formation', 'P de A');
insert into public.academy_subjects (user_id, program_id, title)
select '00000000-0000-0000-0000-00000000000c', id, t from public.academy_programs, (values ('S1 vivante'), ('S2 archivee')) v(t) where user_id = '00000000-0000-0000-0000-00000000000c';
insert into public.academy_units (user_id, subject_id, title)
select '00000000-0000-0000-0000-00000000000c', (select id from public.academy_subjects where user_id = '00000000-0000-0000-0000-00000000000c' and title = 'S1 vivante'), t from (values ('U1 vivant'), ('U2 archive')) v(t);
insert into public.academy_units (user_id, subject_id, title)
values ('00000000-0000-0000-0000-00000000000c', (select id from public.academy_subjects where user_id = '00000000-0000-0000-0000-00000000000c' and title = 'S2 archivee'), 'U3 archive sous S2');
insert into public.academy_chapters (user_id, unit_id, title)
select '00000000-0000-0000-0000-00000000000c', (select id from public.academy_units where user_id = '00000000-0000-0000-0000-00000000000c' and title = 'U1 vivant'), t from (values ('C1 vivant'), ('C2 archive')) v(t);
insert into public.academy_chapters (user_id, unit_id, title)
values ('00000000-0000-0000-0000-00000000000c', (select id from public.academy_units where user_id = '00000000-0000-0000-0000-00000000000c' and title = 'U2 archive'), 'C3 archive sous U2');
insert into public.academy_lessons (user_id, chapter_id, title)
select '00000000-0000-0000-0000-00000000000c', (select id from public.academy_chapters where user_id = '00000000-0000-0000-0000-00000000000c' and title = 'C1 vivant'), t from (values ('L1 archivee'), ('L2 vivante')) v(t);

-- Archivage par A lui-meme (regle d'acces en modification appliquee).
update public.academy_subjects set deleted_at = now() where user_id = '00000000-0000-0000-0000-00000000000c' and title = 'S2 archivee';
update public.academy_units set deleted_at = now() where user_id = '00000000-0000-0000-0000-00000000000c' and title in ('U2 archive', 'U3 archive sous S2');
update public.academy_chapters set deleted_at = now() where user_id = '00000000-0000-0000-0000-00000000000c' and title in ('C2 archive', 'C3 archive sous U2');
update public.academy_lessons set deleted_at = now() where user_id = '00000000-0000-0000-0000-00000000000c' and title = 'L1 archivee';
reset role;

-- Compte B : son propre programme, avec une matiere archivee.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000d","role":"authenticated"}', true);
set local role authenticated;
insert into public.academy_programs (user_id, kind, title) values ('00000000-0000-0000-0000-00000000000d', 'formation', 'P de B');
insert into public.academy_subjects (user_id, program_id, title)
select '00000000-0000-0000-0000-00000000000d', id, 'SB archivee' from public.academy_programs where user_id = '00000000-0000-0000-0000-00000000000d';
update public.academy_subjects set deleted_at = now() where user_id = '00000000-0000-0000-0000-00000000000d';
reset role;

-- Sous postgres : releve des identifiants des deux programmes.
select set_config('academy_test.program_a',
  (select id::text from public.academy_programs where user_id = '00000000-0000-0000-0000-00000000000c'), true);
select set_config('academy_test.program_b',
  (select id::text from public.academy_programs where user_id = '00000000-0000-0000-0000-00000000000d'), true);

-- A lit les archives de son programme. Attendu : C2 archive | L1 archivee | S2 archivee | U2 archive
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000c","role":"authenticated"}', true);
set local role authenticated;
select set_config('academy_test.a_sur_a', (with p as (
    select id from public.academy_programs
    where id = current_setting('academy_test.program_a')::uuid and user_id = '00000000-0000-0000-0000-00000000000c' and deleted_at is null
  ),
  ls as (select id from public.academy_subjects where user_id = '00000000-0000-0000-0000-00000000000c' and deleted_at is null and program_id in (select id from p)),
  lu as (select id from public.academy_units where user_id = '00000000-0000-0000-0000-00000000000c' and deleted_at is null and subject_id in (select id from ls)),
  lc as (select id from public.academy_chapters where user_id = '00000000-0000-0000-0000-00000000000c' and deleted_at is null and unit_id in (select id from lu)),
  arch as (
    select title from public.academy_subjects where user_id = '00000000-0000-0000-0000-00000000000c' and deleted_at is not null and program_id in (select id from p)
    union all
    select title from public.academy_units where user_id = '00000000-0000-0000-0000-00000000000c' and deleted_at is not null and subject_id in (select id from ls)
    union all
    select title from public.academy_chapters where user_id = '00000000-0000-0000-0000-00000000000c' and deleted_at is not null and unit_id in (select id from lu)
    union all
    select title from public.academy_lessons where user_id = '00000000-0000-0000-0000-00000000000c' and deleted_at is not null and chapter_id in (select id from lc)
  )
  select coalesce(string_agg(title, ' | ' order by title), '(aucun)') from arch), true);
-- A lit les archives du programme de B, avec son propre user_id. Attendu : (aucun)
select set_config('academy_test.a_sur_b', (with p as (
    select id from public.academy_programs
    where id = current_setting('academy_test.program_b')::uuid and user_id = '00000000-0000-0000-0000-00000000000c' and deleted_at is null
  ),
  ls as (select id from public.academy_subjects where user_id = '00000000-0000-0000-0000-00000000000c' and deleted_at is null and program_id in (select id from p)),
  lu as (select id from public.academy_units where user_id = '00000000-0000-0000-0000-00000000000c' and deleted_at is null and subject_id in (select id from ls)),
  lc as (select id from public.academy_chapters where user_id = '00000000-0000-0000-0000-00000000000c' and deleted_at is null and unit_id in (select id from lu)),
  arch as (
    select title from public.academy_subjects where user_id = '00000000-0000-0000-0000-00000000000c' and deleted_at is not null and program_id in (select id from p)
    union all
    select title from public.academy_units where user_id = '00000000-0000-0000-0000-00000000000c' and deleted_at is not null and subject_id in (select id from ls)
    union all
    select title from public.academy_chapters where user_id = '00000000-0000-0000-0000-00000000000c' and deleted_at is not null and unit_id in (select id from lu)
    union all
    select title from public.academy_lessons where user_id = '00000000-0000-0000-0000-00000000000c' and deleted_at is not null and chapter_id in (select id from lc)
  )
  select coalesce(string_agg(title, ' | ' order by title), '(aucun)') from arch), true);
reset role;

-- B lit les archives du programme de A, avec son propre user_id. Attendu : (aucun)
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000d","role":"authenticated"}', true);
set local role authenticated;
select set_config('academy_test.b_sur_a', (with p as (
    select id from public.academy_programs
    where id = current_setting('academy_test.program_a')::uuid and user_id = '00000000-0000-0000-0000-00000000000d' and deleted_at is null
  ),
  ls as (select id from public.academy_subjects where user_id = '00000000-0000-0000-0000-00000000000d' and deleted_at is null and program_id in (select id from p)),
  lu as (select id from public.academy_units where user_id = '00000000-0000-0000-0000-00000000000d' and deleted_at is null and subject_id in (select id from ls)),
  lc as (select id from public.academy_chapters where user_id = '00000000-0000-0000-0000-00000000000d' and deleted_at is null and unit_id in (select id from lu)),
  arch as (
    select title from public.academy_subjects where user_id = '00000000-0000-0000-0000-00000000000d' and deleted_at is not null and program_id in (select id from p)
    union all
    select title from public.academy_units where user_id = '00000000-0000-0000-0000-00000000000d' and deleted_at is not null and subject_id in (select id from ls)
    union all
    select title from public.academy_chapters where user_id = '00000000-0000-0000-0000-00000000000d' and deleted_at is not null and unit_id in (select id from lu)
    union all
    select title from public.academy_lessons where user_id = '00000000-0000-0000-0000-00000000000d' and deleted_at is not null and chapter_id in (select id from lc)
  )
  select coalesce(string_agg(title, ' | ' order by title), '(aucun)') from arch), true);
-- B lit les archives de son programme. Attendu : SB archivee
select set_config('academy_test.b_sur_b', (with p as (
    select id from public.academy_programs
    where id = current_setting('academy_test.program_b')::uuid and user_id = '00000000-0000-0000-0000-00000000000d' and deleted_at is null
  ),
  ls as (select id from public.academy_subjects where user_id = '00000000-0000-0000-0000-00000000000d' and deleted_at is null and program_id in (select id from p)),
  lu as (select id from public.academy_units where user_id = '00000000-0000-0000-0000-00000000000d' and deleted_at is null and subject_id in (select id from ls)),
  lc as (select id from public.academy_chapters where user_id = '00000000-0000-0000-0000-00000000000d' and deleted_at is null and unit_id in (select id from lu)),
  arch as (
    select title from public.academy_subjects where user_id = '00000000-0000-0000-0000-00000000000d' and deleted_at is not null and program_id in (select id from p)
    union all
    select title from public.academy_units where user_id = '00000000-0000-0000-0000-00000000000d' and deleted_at is not null and subject_id in (select id from ls)
    union all
    select title from public.academy_chapters where user_id = '00000000-0000-0000-0000-00000000000d' and deleted_at is not null and unit_id in (select id from lu)
    union all
    select title from public.academy_lessons where user_id = '00000000-0000-0000-0000-00000000000d' and deleted_at is not null and chapter_id in (select id from lc)
  )
  select coalesce(string_agg(title, ' | ' order by title), '(aucun)') from arch), true);
-- B lit directement les lignes archivees de A, sans filtre user_id. Attendu : 0
select set_config('academy_test.b_voit_archives_a', (
  (select count(*) from public.academy_subjects where user_id = '00000000-0000-0000-0000-00000000000c' and deleted_at is not null)
  + (select count(*) from public.academy_units where user_id = '00000000-0000-0000-0000-00000000000c' and deleted_at is not null)
  + (select count(*) from public.academy_chapters where user_id = '00000000-0000-0000-0000-00000000000c' and deleted_at is not null)
  + (select count(*) from public.academy_lessons where user_id = '00000000-0000-0000-0000-00000000000c' and deleted_at is not null)
)::text, true);
reset role;

-- Synthese, sous postgres.
select
  current_setting('academy_test.a_sur_a', true) as archives_de_a_lues_par_a,
  current_setting('academy_test.a_sur_b', true) as archives_de_b_lues_par_a,
  current_setting('academy_test.b_sur_a', true) as archives_de_a_lues_par_b,
  current_setting('academy_test.b_sur_b', true) as archives_de_b_lues_par_b,
  current_setting('academy_test.b_voit_archives_a', true) as lignes_archivees_de_a_vues_par_b;

rollback;
```

**Résultat attendu de la synthèse** :

- `archives_de_a_lues_par_a` : `C2 archive | L1 archivee | S2 archivee | U2 archive` — ni `U3 archive sous S2`, ni `C3 archive sous U2` ;
- `archives_de_b_lues_par_a` : `(aucun)` ;
- `archives_de_a_lues_par_b` : `(aucun)` ;
- `archives_de_b_lues_par_b` : `SB archivee` ;
- `lignes_archivees_de_a_vues_par_b` : `0`.

**Vérification** : synthèse conforme à l'attendu ci-dessus, et contrôle de l'étape 5 à `0` partout. Si un résultat diffère, s'arrêter et le signaler. **Ne pas corriger les politiques ni le store dans la foulée.**

*Écrit le 2026-11-26 par l'agent, sans exécution ; exécution par Vincent consignée le même jour, puis corrigée : le tableau complet avait été transmis.*

### 2026-11-26 — Nettoyer les données de contrôle de la page Leçon

**Statut** : `done` — 2026-11-26. Comptages et suppression exécutés par Vincent, porteur du projet, dans le SQL Editor, sous le rôle `postgres` ; **conforme, sans écart**. L'agent n'a exécuté aucune requête.

**Pourquoi c'est manuel** : il n'existe pas de suppression physique dans Academy — les tables `academy_*` n'accordent pas `DELETE` à `authenticated`, et le chemin de suppression de l'étape 8 n'est pas écrit —, et seul le SQL Editor, sous le rôle `postgres`, peut supprimer ces données. L'agent n'a pas d'accès SQL au projet.

**Contexte** : données créées pour contrôler à la main la page Leçon (leçon avec contenu, leçon sans contenu). **Aucune entrée `pending` n'avait été écrite pour ce nettoyage** : cette entrée est créée directement en `done`, d'après les résultats transmis par Vincent. Les requêtes exécutées ne sont pas reproduites ici ; les colonnes transmises sont celles du comptage de l'entrée archivée « Nettoyer les données de contrôle de l'arbre Academy (test-erase@edificeia.com) » du 2026-11-25 (lignes visées et totaux du compte).

**Compte** : `test-erase@edificeia.com` — adresse utilisée par le comptage avant et après suppression, transmise par Vincent le 2026-11-26. *Jusqu'à cette précision, l'entrée indiquait « adresse du compte non transmise ».*

**Exécution** — 2026-11-26, résultats transmis par Vincent :

- **Comptage avant suppression** : `comptes = 1` ; programme visé `1` (`1c2588af-c05f-44b3-b214-c2ab09e04202`), matières `1`, modules `1`, chapitres `1`, leçons `2` ; les totaux du compte égalent les totaux visés (`1 / 1 / 1 / 1 / 2`) — **conforme** : aucune autre donnée Academy sur ce compte.
- **Suppression** : bloc `begin` … `commit` exécuté en entier, sans erreur signalée.
- **Comptage après suppression** : `comptes = 1`, toutes les autres colonnes à `0` — **conforme**.

**Supprimés** : le programme « Programme leçon de contrôle » (`1c2588af-c05f-44b3-b214-c2ab09e04202`) et ses descendants — une matière, un module, un chapitre et les deux leçons de contrôle, l'une avec contenu, l'autre sans. Identifiants de la matière, du module, du chapitre et des leçons non relevés.

*Consigné le 2026-11-26 par l'agent, d'après les résultats transmis par Vincent.*

### 2026-11-25 — Nettoyer les données de contrôle de l'arbre Academy (test-erase@edificeia.com)

**Statut** : `done` — 2026-11-25. Comptages et suppression exécutés par Vincent, porteur du projet, dans le SQL Editor, sous le rôle `postgres` ; **conforme, sans écart**. L'agent n'a exécuté aucune requête.

**Pourquoi c'est manuel** : il n'existe pas de suppression physique dans Academy — les tables `academy_*` n'accordent pas `DELETE` à `authenticated`, et le chemin de suppression de l'étape 8 n'est pas écrit —, et seul le SQL Editor, sous le rôle `postgres`, peut supprimer ces données. L'agent n'a pas d'accès SQL au projet.

**Bloquait** : rien. Données créées le 2026-11-25 sous `test-erase@edificeia.com` pour contrôler à la main la page Programmes et l'arbre d'un programme dans le navigateur.

**Données de contrôle à supprimer**, identifiants transmis par Vincent :

- programme `49a2b15e-21b9-4509-b231-f18acc10d41d`, avec sa matière, son module, son chapitre et sa leçon `480d4d7b-71eb-48d5-9167-69e3881bcd6c` — identifiants de la matière, du module et du chapitre non relevés ;
- programme vide `13e64a2e-6f6c-4573-8718-72631570110a`.

**Portée** : à la différence du nettoyage du 2026-11-24, la suppression **ne vise pas toutes les lignes `academy_*` du compte**, mais seulement ces deux programmes et leurs descendants, rattachés par les clés `program_id`, `subject_id`, `unit_id` et `chapter_id`, sur le seul compte `test-erase@edificeia.com` — chaque `delete` filtre aussi sur ce `user_id`. Les lignes archivées sous ces programmes sont comprises. Si l'adresse ne correspond à aucun compte, aucune ligne n'est supprimée ; si elle en désigne plusieurs, la sous-requête échoue et la transaction est annulée. Les données Personnel de ce compte, qui sert aussi aux tests d'effacement, ne sont pas touchées.

**Leçon du nettoyage du 2026-11-24** : une leçon de plus que prévu y avait été supprimée sans avoir été identifiée. Ici, le comptage relève à la fois les lignes visées et **toutes** les lignes Academy du compte : **tout écart arrête la procédure** tant que la ligne en trop n'est pas identifiée.

**Exécution** — 2026-11-25, résultats transmis par Vincent :

- **Comptage avant suppression** (étape 2) : une seule ligne de compte, `comptes = 1` ; programmes visés `2`, matières `1`, modules `1`, chapitres `1`, leçons `1`, leçon relevée `1` ; les totaux du compte égalent les totaux visés (`2 / 1 / 1 / 1 / 1`) — **conforme** : aucune autre donnée Academy sur ce compte, aucun écart, contrairement au nettoyage du 2026-11-24.
- **Suppression** (étape 3) : bloc `begin` … `commit` exécuté en entier, sans erreur signalée.
- **Comptage après suppression** (étape 4) : `comptes = 1`, toutes les autres colonnes à `0` — **conforme**.

**Supprimés** : le programme `49a2b15e-21b9-4509-b231-f18acc10d41d` et le programme vide `13e64a2e-6f6c-4573-8718-72631570110a`, avec leurs descendants — une matière, un module, un chapitre et la leçon `480d4d7b-71eb-48d5-9167-69e3881bcd6c`. Le compte `test-erase@edificeia.com` ne porte plus aucune donnée Academy.

**Étapes** :

1. Ouvrir le SQL Editor du projet Supabase.
2. **Comptage, en lecture seule** :
   ```sql
   with u as (
     select id from auth.users where email = 'test-erase@edificeia.com'
   ),
   p as (
     select id from public.academy_programs
     where user_id = (select id from u) and id in ('49a2b15e-21b9-4509-b231-f18acc10d41d', '13e64a2e-6f6c-4573-8718-72631570110a')
   ),
   s as (
     select id from public.academy_subjects
     where user_id = (select id from u) and program_id in (select id from p)
   ),
   n as (
     select id from public.academy_units
     where user_id = (select id from u) and subject_id in (select id from s)
   ),
   c as (
     select id from public.academy_chapters
     where user_id = (select id from u) and unit_id in (select id from n)
   ),
   l as (
     select id from public.academy_lessons
     where user_id = (select id from u) and chapter_id in (select id from c)
   )
   select
     (select count(*) from u) as comptes,
     (select count(*) from p) as programmes_vises,
     (select count(*) from s) as matieres_visees,
     (select count(*) from n) as modules_vises,
     (select count(*) from c) as chapitres_vises,
     (select count(*) from l) as lecons_visees,
     (select count(*) from l where id = '480d4d7b-71eb-48d5-9167-69e3881bcd6c') as lecon_relevee,
     (select count(*) from public.academy_programs where user_id = (select id from u)) as programmes_du_compte,
     (select count(*) from public.academy_subjects where user_id = (select id from u)) as matieres_du_compte,
     (select count(*) from public.academy_units where user_id = (select id from u)) as modules_du_compte,
     (select count(*) from public.academy_chapters where user_id = (select id from u)) as chapitres_du_compte,
     (select count(*) from public.academy_lessons where user_id = (select id from u)) as lecons_du_compte;
   ```
   Attendu :
   - `comptes` : `1` — aucune ligne, ou plusieurs : s'arrêter et le signaler ;
   - `programmes_vises` `2`, `matieres_visees` `1`, `modules_vises` `1`, `chapitres_vises` `1`, `lecons_visees` `1`, `lecon_relevee` `1` ;
   - les colonnes `*_du_compte` **égales** aux colonnes `*_vises` correspondantes (2 / 1 / 1 / 1 / 1). Une valeur supérieure signale d'autres données Academy sur ce compte : elles ne seraient pas supprimées, mais **s'arrêter**, les identifier et les transmettre avant l'étape 3. Une valeur `*_vises` différente de l'attendu : s'arrêter de même.
3. **Suppression**, seulement si le comptage est conforme — dans l'ordre inverse des dépendances, leçons d'abord, programmes en dernier, dans une seule transaction. **Action irréversible.**
   ```sql
   begin;

   delete from public.academy_lessons
   where user_id = (select id from auth.users where email = 'test-erase@edificeia.com')
     and chapter_id in (
       select id from public.academy_chapters where user_id = (select id from auth.users where email = 'test-erase@edificeia.com') and unit_id in (select id from public.academy_units where user_id = (select id from auth.users where email = 'test-erase@edificeia.com') and subject_id in (select id from public.academy_subjects where user_id = (select id from auth.users where email = 'test-erase@edificeia.com') and program_id in ('49a2b15e-21b9-4509-b231-f18acc10d41d', '13e64a2e-6f6c-4573-8718-72631570110a')))
     );

   delete from public.academy_chapters
   where user_id = (select id from auth.users where email = 'test-erase@edificeia.com')
     and unit_id in (
       select id from public.academy_units where user_id = (select id from auth.users where email = 'test-erase@edificeia.com') and subject_id in (select id from public.academy_subjects where user_id = (select id from auth.users where email = 'test-erase@edificeia.com') and program_id in ('49a2b15e-21b9-4509-b231-f18acc10d41d', '13e64a2e-6f6c-4573-8718-72631570110a'))
     );

   delete from public.academy_units
   where user_id = (select id from auth.users where email = 'test-erase@edificeia.com')
     and subject_id in (
       select id from public.academy_subjects where user_id = (select id from auth.users where email = 'test-erase@edificeia.com') and program_id in ('49a2b15e-21b9-4509-b231-f18acc10d41d', '13e64a2e-6f6c-4573-8718-72631570110a')
     );

   delete from public.academy_subjects
   where user_id = (select id from auth.users where email = 'test-erase@edificeia.com')
     and program_id in ('49a2b15e-21b9-4509-b231-f18acc10d41d', '13e64a2e-6f6c-4573-8718-72631570110a');

   delete from public.academy_programs
   where user_id = (select id from auth.users where email = 'test-erase@edificeia.com')
     and id in ('49a2b15e-21b9-4509-b231-f18acc10d41d', '13e64a2e-6f6c-4573-8718-72631570110a');

   commit;
   ```
4. Relancer le comptage de l'étape 2, puis transmettre les deux comptages à l'agent pour consignation.

**Vérification** : le comptage relancé renvoie `1` pour `comptes` et `0` dans toutes les autres colonnes.

*Écrit le 2026-11-25 par l'agent, sans exécution ; exécution par Vincent consignée le même jour.*

### 2026-11-25 — Tester la modification (update) de l'isolation SQL sur academy_programs et academy_subjects

**Statut** : `done` — 2026-11-25. Script exécuté par Vincent, porteur du projet, dans le SQL Editor, sous le rôle `postgres` ; **résultats conformes**. L'agent n'a exécuté aucune requête.

**Pourquoi c'est manuel** : seul le SQL Editor peut exécuter ce test sur la base réelle, et aucune base de test n'est disponible depuis le dépôt (ni CLI Supabase, ni `psql`, ni Docker sur cette machine). L'agent n'a pas d'accès SQL au projet. **À exécuter par Vincent, porteur du projet**, dans le SQL Editor, sous le rôle `postgres`.

**Bloquait** : rien d'immédiat. Ce test complète l'entrée archivée du 2026-11-25 sur `academy_units`, `academy_chapters` et `academy_lessons` : sur `academy_programs` et `academy_subjects`, le test du 2026-11-24 n'a éprouvé, en modification, que la ligne d'un autre compte sur les programmes — ni le rattachement d'une matière à un autre parent, ni le changement de `user_id`.

**Ce que dit la migration** (`20261124120000_create_academy_hierarchy.sql`, relue sans exécution) : `academy_programs_update_own` et `academy_subjects_update_own` sont `for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid())` ; la clé composite `academy_subjects_program_fk` `(program_id, user_id)` vers `academy_programs (id, user_id)` ne précise pas d'`on update` et est donc contrôlée à chaque modification de la matière. Attendus déduits, que ce test doit confirmer :

- **(a)** B rattache **sa propre matière** au programme de A (`program_id` du compte A) : la règle d'accès l'accepte, la clé composite refuse — **`23503`**, `academy_subjects_program_fk` ;
- **(b)** B tente de modifier **la ligne de A** : la clause `using` la rend invisible à B — **0 ligne affectée**, sans erreur ;
- **(c)** B passe le `user_id` de **sa propre ligne** à celui de A : la clause `with check` refuse — **`42501`** (row-level security). Un `23503` à cette étape serait un refus, mais pas par la règle d'accès : à signaler.

**`academy_programs` n'a pas de parent** : le test (a) n'existe pas pour cette table ; **seuls (b) et (c) s'y appliquent**. `academy_subjects` reçoit les trois.

**Sans effet durable** : même modèle que le test du 2026-11-25 sur les tables enfants. Le script écrit **uniquement dans une transaction terminée par `rollback`** ; les comptes fictifs `…000c` (A) et `…000d` (B) sont créés dans `auth.users` au début de la transaction, sous `postgres`, et retirés par le `rollback`. Chaque compte ne crée qu'un programme et une matière. Aucun compte réel n'est utilisé, aucune donnée existante n'est lue ni modifiée.

Chaque tentative de B est placée dans un bloc `do` : (a) et (c) capturent le refus attendu et l'enregistrent, et lèvent « ECHEC DU TEST » si la modification passe — y compris sans ligne affectée ; (b) compte les lignes affectées et lève « ECHEC DU TEST » s'il y en a au moins une. « ECHEC DU TEST » n'est capté par aucun bloc : il interrompt toute la transaction, annulée, et le SQL Editor l'affiche à la place de la synthèse.

**Résultats obtenus** — 2026-11-25, transmis par Vincent :

- **Contrôle préalable (étape 2)** : conforme selon Vincent — `auth.users` n'a que la colonne `id` obligatoire ; aucun déclencheur sur `auth.users`. Le détail des lignes renvoyées n'a pas été transmis.
- **Synthèse (étape 4)** :
  - programme **(b)** : `0` ligne affectée — **conforme** ;
  - programme **(c)** : refus en **`42501`** (row-level security) — **conforme** ;
  - matière **(a)** : refus en **`23503`** sur `academy_subjects_program_fk` — **conforme** ;
  - matière **(b)** : `0` ligne affectée — **conforme** ;
  - matière **(c)** : refus en **`42501`** (row-level security) — **conforme** ;
  - titres de A inchangés : « Programme de A / Matiere de A » — **conforme** ;
  - lignes de B intactes : `1 / 1` — **conforme**.
- **Contrôle après coup (étape 5)** : conforme selon Vincent — `0` partout. Le détail des colonnes n'a pas été transmis.
- Le script s'est terminé par `rollback` : **aucune donnée de test n'a persisté**.

**Portée** : avec l'entrée archivée du même jour sur `academy_units`, `academy_chapters` et `academy_lessons`, la modification est éprouvée côté base sur **les cinq tables** de la hiérarchie : modification de la ligne d'un autre compte sans effet, changement de `user_id` refusé par la règle d'accès, et — pour les quatre tables qui ont un parent — rattachement au parent d'un autre compte refusé par la clé composite. Le point ouvert sur la modification des programmes et des matières est **clos**.

**Étapes** :

1. Ouvrir le SQL Editor du projet Supabase.
2. **Contrôle préalable, en lecture seule** — conforme les 2026-11-24 et 2026-11-25 (seule `id` obligatoire, aucun déclencheur), à relancer pour s'assurer que rien n'a changé :
   ```sql
   select column_name, data_type
   from information_schema.columns
   where table_schema = 'auth' and table_name = 'users'
     and is_nullable = 'NO' and column_default is null
   order by ordinal_position;

   select tgname, tgenabled
   from pg_trigger
   where tgrelid = 'auth.users'::regclass and not tgisinternal;
   ```
   Attendu : `id` seul dans la première requête, aucune ligne dans la seconde. **Sinon, s'arrêter** et le transmettre à l'agent.
3. Lancer le script ci-dessous **en une seule exécution**. Si une erreur s'affiche à la place de la synthèse (« ECHEC DU TEST », `permission denied`…), s'arrêter et transmettre le message tel quel : la transaction est annulée, rien n'est écrit.
4. Relever le résultat de la synthèse.
5. **Contrôle après coup, en lecture seule** :
   ```sql
   select
     (select count(*) from auth.users where id in ('00000000-0000-0000-0000-00000000000c', '00000000-0000-0000-0000-00000000000d')) as utilisateurs_de_test_restants,
     (select count(*) from public.academy_programs where user_id in ('00000000-0000-0000-0000-00000000000c', '00000000-0000-0000-0000-00000000000d')) as programmes,
     (select count(*) from public.academy_subjects where user_id in ('00000000-0000-0000-0000-00000000000c', '00000000-0000-0000-0000-00000000000d')) as matieres,
     (select count(*) from public.academy_units where user_id in ('00000000-0000-0000-0000-00000000000c', '00000000-0000-0000-0000-00000000000d')) as modules,
     (select count(*) from public.academy_chapters where user_id in ('00000000-0000-0000-0000-00000000000c', '00000000-0000-0000-0000-00000000000d')) as chapitres,
     (select count(*) from public.academy_lessons where user_id in ('00000000-0000-0000-0000-00000000000c', '00000000-0000-0000-0000-00000000000d')) as lecons;
   ```
   Attendu : `0` partout.
6. Transmettre les résultats, tels quels, à l'agent pour consignation.

```sql
begin;

-- Sous le role postgres du SQL Editor : creation des deux comptes de test.
-- Annules par le rollback final.
insert into auth.users (id) values
  ('00000000-0000-0000-0000-00000000000c'),
  ('00000000-0000-0000-0000-00000000000d');

-- Compte A : programme et matiere, sous son propre role (regle d'acces appliquee).
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000c","role":"authenticated"}', true);
set local role authenticated;
insert into public.academy_programs (user_id, kind, title)
values ('00000000-0000-0000-0000-00000000000c', 'formation', 'Programme de A');
insert into public.academy_subjects (user_id, program_id, title)
select '00000000-0000-0000-0000-00000000000c', id, 'Matiere de A' from public.academy_programs where user_id = '00000000-0000-0000-0000-00000000000c';
reset role;

-- Compte B : son propre programme et sa propre matiere, sous son propre role.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000d","role":"authenticated"}', true);
set local role authenticated;
insert into public.academy_programs (user_id, kind, title)
values ('00000000-0000-0000-0000-00000000000d', 'formation', 'Programme de B');
insert into public.academy_subjects (user_id, program_id, title)
select '00000000-0000-0000-0000-00000000000d', id, 'Matiere de B' from public.academy_programs where user_id = '00000000-0000-0000-0000-00000000000d';
reset role;

-- Sous postgres (proprietaire des tables, hors regle d'acces) : releve des
-- identifiants de A, que B va viser tels quels.
select set_config('academy_test.program_a',
  (select id::text from public.academy_programs where user_id = '00000000-0000-0000-0000-00000000000c'), true);
select set_config('academy_test.subject_a',
  (select id::text from public.academy_subjects where user_id = '00000000-0000-0000-0000-00000000000c'), true);

-- Bascule sur B : tentatives de modification.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000d","role":"authenticated"}', true);
set local role authenticated;

-- academy_programs : pas de parent, donc pas de test (a).
-- (b) B tente de modifier la ligne de A. Attendu : 0 ligne affectee.
do $$
declare
  n integer;
begin
  update public.academy_programs
  set title = 'Piratage'
  where id = current_setting('academy_test.program_a')::uuid;
  get diagnostics n = row_count;
  if n <> 0 then
    raise exception 'ECHEC DU TEST (b) : B a modifie % ligne(s) de A dans academy_programs.', n;
  end if;
  perform set_config('academy_test.programs_b', n::text || ' ligne affectee', true);
end;
$$;

-- (c) B donne sa propre ligne a A (user_id). Attendu : 42501.
do $$
begin
  update public.academy_programs
  set user_id = '00000000-0000-0000-0000-00000000000c'
  where user_id = '00000000-0000-0000-0000-00000000000d';
  raise exception 'ECHEC DU TEST (c) : programme de B reaffecte(e) au compte A.';
exception
  when insufficient_privilege or foreign_key_violation then
    perform set_config('academy_test.programs_c', sqlstate || ' ' || sqlerrm, true);
end;
$$;

-- academy_subjects
-- (a) B rattache sa propre ligne au parent de A. Attendu : 23503.
do $$
begin
  update public.academy_subjects
  set program_id = current_setting('academy_test.program_a')::uuid
  where user_id = '00000000-0000-0000-0000-00000000000d';
  raise exception 'ECHEC DU TEST (a) : matiere de B rattache(e) sous le programme de A.';
exception
  when foreign_key_violation or insufficient_privilege then
    perform set_config('academy_test.subjects_a', sqlstate || ' ' || sqlerrm, true);
end;
$$;

-- (b) B tente de modifier la ligne de A. Attendu : 0 ligne affectee.
do $$
declare
  n integer;
begin
  update public.academy_subjects
  set title = 'Piratage'
  where id = current_setting('academy_test.subject_a')::uuid;
  get diagnostics n = row_count;
  if n <> 0 then
    raise exception 'ECHEC DU TEST (b) : B a modifie % ligne(s) de A dans academy_subjects.', n;
  end if;
  perform set_config('academy_test.subjects_b', n::text || ' ligne affectee', true);
end;
$$;

-- (c) B donne sa propre ligne a A (user_id). Attendu : 42501.
do $$
begin
  update public.academy_subjects
  set user_id = '00000000-0000-0000-0000-00000000000c'
  where user_id = '00000000-0000-0000-0000-00000000000d';
  raise exception 'ECHEC DU TEST (c) : matiere de B reaffecte(e) au compte A.';
exception
  when insufficient_privilege or foreign_key_violation then
    perform set_config('academy_test.subjects_c', sqlstate || ' ' || sqlerrm, true);
end;
$$;

reset role;

-- Synthese, sous postgres. Les lignes de A et de B doivent etre intactes.
select
  current_setting('academy_test.programs_b', true) as programme_b_ligne_de_a,
  current_setting('academy_test.programs_c', true) as programme_c_user_id_de_a,
  current_setting('academy_test.subjects_a', true) as matiere_a_parent_de_a,
  current_setting('academy_test.subjects_b', true) as matiere_b_ligne_de_a,
  current_setting('academy_test.subjects_c', true) as matiere_c_user_id_de_a,
  format('%s / %s',
    (select title from public.academy_programs where user_id = '00000000-0000-0000-0000-00000000000c'),
    (select title from public.academy_subjects where user_id = '00000000-0000-0000-0000-00000000000c')) as titres_de_a,
  format('%s / %s',
    (select count(*) from public.academy_programs where user_id = '00000000-0000-0000-0000-00000000000d'),
    (select count(*) from public.academy_subjects s
       join public.academy_programs p on p.id = s.program_id and p.user_id = s.user_id
     where s.user_id = '00000000-0000-0000-0000-00000000000d')) as lignes_de_b_programme_matiere_sous_programme_de_b;

rollback;
```

**Résultat attendu de la synthèse** :

- `programme_b_ligne_de_a` et `matiere_b_ligne_de_a` : `0 ligne affectee` ;
- `programme_c_user_id_de_a` et `matiere_c_user_id_de_a` : `42501`, « new row violates row-level security policy for table … » ;
- `matiere_a_parent_de_a` : `23503`, avec `academy_subjects_program_fk` dans le message ;
- `titres_de_a` : `Programme de A / Matiere de A` — inchangés ;
- `lignes_de_b_programme_matiere_sous_programme_de_b` : `1 / 1` — le programme de B est resté à B, et sa matière sous son propre programme.

**Vérification** : synthèse conforme à l'attendu ci-dessus, et contrôle de l'étape 5 à `0` partout. Si un résultat diffère, s'arrêter et le signaler. **Ne pas corriger les politiques dans la foulée.**

*Écrit le 2026-11-25 par l'agent, sans exécution ; exécution par Vincent consignée le même jour.*

### 2026-11-25 — Contrôler en base la cascade et le droit DELETE de service_role sur Academy

**Statut** : `done` — 2026-11-25. Deux requêtes en lecture seule exécutées par Vincent, porteur du projet, dans le SQL Editor ; **résultats conformes**. L'agent n'a exécuté aucune requête ; il consigne les requêtes et les résultats transmis.

**Pourquoi c'est manuel** : seul le SQL Editor peut lire le catalogue de la base réelle ; l'agent n'a pas d'accès SQL au projet.

**Bloquait** : la clôture du point « cascade à l'usage » de l'isolation Academy (chantier 8). La migration `20261124120000_create_academy_hierarchy.sql` déclare les clés en `on delete cascade`, mais elle utilise `create table if not exists` : une table déjà présente aurait gardé ses anciennes clauses. Seul le catalogue prouve l'état réel.

**Étapes et résultats** :

1. Requête « 2026-11-25 - Academy contrôle cascade on delete », en lecture seule :
   ```sql
   select conname, confdeltype from pg_constraint where conname in ('academy_subjects_program_fk', 'academy_units_subject_fk', 'academy_chapters_unit_fk', 'academy_lessons_chapter_fk');
   ```
   **Résultat** : quatre lignes, `confdeltype = c` (cascade) pour chacune — **conforme**.
2. Requête « 2026-11-25 - Academy contrôle droits DELETE service_role », en lecture seule :
   ```sql
   select table_name, privilege_type from information_schema.table_privileges where table_schema = 'public' and table_name like 'academy_%' and grantee = 'service_role' and privilege_type = 'DELETE';
   ```
   **Résultat** : cinq lignes, `DELETE` sur `academy_chapters`, `academy_lessons`, `academy_programs`, `academy_subjects` et `academy_units` — **conforme** au plan de l'étape 8 (suppression physique par la clé `service-role`, DEC-013). `authenticated` n'a pas `DELETE` : la migration le lui retire et ne le lui rend pas.

**Portée** : le constat porte sur la **déclaration en base** — les clés sont en cascade, et `service_role` peut supprimer. **La cascade elle-même n'a pas été exercée par un test** : son comportement relève de Postgres. Le test du chemin de suppression réel — clé `service-role`, enfants supprimés explicitement avant leurs parents, la cascade n'étant qu'un filet — est **reporté à l'étape 8**, lorsqu'il sera écrit.

**Limite** : le filtre `like 'academy_%'` laisse passer le `_` comme caractère quelconque ; sans effet ici, aucune autre table ne commençant par `academy`.

*Consigné le 2026-11-25 par l'agent, d'après les résultats transmis par Vincent.*

### 2026-11-24 — Tester la modification (update) de l'isolation SQL sur academy_units, academy_chapters et academy_lessons

**Statut** : `done` — 2026-11-25. Script exécuté par Vincent, porteur du projet, dans le SQL Editor, sous le rôle `postgres` ; **résultats conformes**. L'agent n'a exécuté aucune requête.

**Pourquoi c'est manuel** : seul le SQL Editor peut exécuter ce test sur la base réelle, et aucune base de test n'est disponible depuis le dépôt (ni CLI Supabase, ni `psql`, ni Docker sur cette machine). L'agent n'a pas d'accès SQL au projet. **À exécuter par Vincent, porteur du projet**, dans le SQL Editor, sous le rôle `postgres`.

**Bloquait** : rien d'immédiat. Ce test comble le dernier point ouvert de l'isolation côté base relevé le 2026-11-24 : la règle d'accès en **modification** sur les trois tables enfants, que le test d'insertion du même jour ne tentait pas. Côté base, elle n'est éprouvée que sur `academy_programs` ; côté routes, par les tests à la main.

**Ce que dit la migration** (`20261124120000_create_academy_hierarchy.sql`, relue le 2026-11-24 sans exécution) : pour chacune des trois tables, la règle `academy_<table>_update_own` est `for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid())`, et la clé composite `(parent_id, user_id)` vers `(id, user_id)` du parent ne précise pas d'`on update` : elle est donc contrôlée à chaque modification de la ligne enfant. Attendus déduits, que ce test doit confirmer :

- **(a)** B rattache **sa propre ligne** au parent de A : la règle d'accès l'accepte (la ligne reste à B), la clé composite refuse — **`23503`** ;
- **(b)** B tente de modifier **une ligne de A** : la clause `using` la rend invisible à B — **0 ligne affectée**, sans erreur ;
- **(c)** B passe le `user_id` de **sa propre ligne** à celui de A : la clause `with check` refuse la nouvelle ligne — **`42501`** (« new row violates row-level security policy »). Le contrôle de la règle d'accès précède celui des clés étrangères ; un `23503` à cette étape serait un refus, mais **pas par la règle d'accès** : à signaler.

**Sans effet durable** : même modèle que le test d'insertion du 2026-11-24. Le script écrit **uniquement dans une transaction terminée par `rollback`** ; les comptes fictifs `…000c` (A) et `…000d` (B) sont créés dans `auth.users` au début de la transaction, sous `postgres`, et retirés par le `rollback`. Aucun compte réel n'est utilisé, aucune donnée existante n'est lue ni modifiée.

Chaque tentative de B est placée dans un bloc `do` :

- (a) et (c) capturent le refus attendu et l'enregistrent ; si la modification passe, le bloc lève « ECHEC DU TEST » — y compris si elle n'affecte aucune ligne, ce qui signalerait que B ne voit pas sa propre ligne ;
- (b) compte les lignes affectées (`get diagnostics`) ; s'il y en a au moins une, le bloc lève « ECHEC DU TEST ».

« ECHEC DU TEST » n'est capté par aucun bloc : il interrompt toute la transaction, annulée, et le SQL Editor l'affiche à la place de la synthèse.

**Résultats obtenus** — 2026-11-25, transmis par Vincent :

- **Contrôle préalable (étape 2)** : `auth.users` n'a que la colonne `id` obligatoire sans valeur par défaut ; le contrôle `pg_trigger` sur `auth.users` ne renvoie aucune ligne, donc aucun déclencheur — **conforme**.
- **Synthèse (étape 4)** :
  - **(a)** B rattache sa propre ligne au parent de A : refus en **`23503`** sur les trois tables, par `academy_units_subject_fk`, `academy_chapters_unit_fk` et `academy_lessons_chapter_fk` — **conforme** ;
  - **(b)** B modifie la ligne de A : **`0` ligne affectée** sur les trois tables — **conforme** ;
  - **(c)** B donne sa propre ligne à A (`user_id`) : refus en **`42501`** (row-level security) sur les trois tables — **conforme** : c'est bien la règle d'accès qui refuse, pas la clé étrangère ;
  - titres de A inchangés : « Module de A / Chapitre de A / Lecon de A » — **conforme** ;
  - lignes de B intactes, sous leurs propres parents : `1 / 1 / 1` — **conforme**.
- **Contrôle après coup (étape 5)** : `0` compte de test et `0` ligne dans les cinq tables `academy_*` — **conforme**.
- Le script s'est terminé par `rollback` : **aucune donnée de test n'a persisté**.

**Portée** : la règle d'accès en modification et la clé composite à la modification sont éprouvées côté base sur `academy_units`, `academy_chapters` et `academy_lessons`. Avec les tests du 2026-11-24, l'isolation côté base couvre la lecture, l'insertion et la modification sur les tables enfants ; sur `academy_programs` et `academy_subjects`, la modification n'est éprouvée que pour la ligne d'un autre compte (test du 2026-11-24), pas pour le rattachement ni le changement de `user_id`. *Complété le 2026-11-25 : voir l'entrée archivée « Tester la modification (update) de l'isolation SQL sur academy_programs et academy_subjects », conforme.*

**Cascade** — point clos : constat en base du 2026-11-25, deux requêtes en lecture seule exécutées par Vincent : les quatre clés composites (`academy_subjects_program_fk`, `academy_units_subject_fk`, `academy_chapters_unit_fk`, `academy_lessons_chapter_fk`) sont en cascade (`confdeltype = 'c'`), et `service_role` a `DELETE` sur les cinq tables ; `authenticated` ne l'a pas (migration). Requêtes et résultats consignés dans l'entrée archivée « Contrôler en base la cascade et le droit DELETE de service_role sur Academy » du 2026-11-25 de `MANUAL_ACTIONS.md`. La cascade elle-même n'est pas exercée par un test : son comportement relève de Postgres, et le chemin de suppression réel (étape 8, clé `service-role`, enfants avant parents) sera testé lorsqu'il sera écrit.

**Étapes** :

1. Ouvrir le SQL Editor du projet Supabase.
2. **Contrôle préalable, en lecture seule** — déjà conforme le 2026-11-24 (seule `id` obligatoire, aucun déclencheur), à relancer pour s'assurer que rien n'a changé :
   ```sql
   select column_name, data_type
   from information_schema.columns
   where table_schema = 'auth' and table_name = 'users'
     and is_nullable = 'NO' and column_default is null
   order by ordinal_position;

   select tgname, tgenabled
   from pg_trigger
   where tgrelid = 'auth.users'::regclass and not tgisinternal;
   ```
   Attendu : `id` seul dans la première requête, aucune ligne dans la seconde. **Sinon, s'arrêter** et le transmettre à l'agent.
3. Lancer le script ci-dessous **en une seule exécution**. Si une erreur s'affiche à la place de la synthèse (« ECHEC DU TEST », `permission denied`…), s'arrêter et transmettre le message tel quel : la transaction est annulée, rien n'est écrit.
4. Relever le résultat de la synthèse.
5. **Contrôle après coup, en lecture seule** :
   ```sql
   select
     (select count(*) from auth.users where id in ('00000000-0000-0000-0000-00000000000c', '00000000-0000-0000-0000-00000000000d')) as utilisateurs_de_test_restants,
     (select count(*) from public.academy_programs where user_id in ('00000000-0000-0000-0000-00000000000c', '00000000-0000-0000-0000-00000000000d')) as programmes,
     (select count(*) from public.academy_subjects where user_id in ('00000000-0000-0000-0000-00000000000c', '00000000-0000-0000-0000-00000000000d')) as matieres,
     (select count(*) from public.academy_units where user_id in ('00000000-0000-0000-0000-00000000000c', '00000000-0000-0000-0000-00000000000d')) as modules,
     (select count(*) from public.academy_chapters where user_id in ('00000000-0000-0000-0000-00000000000c', '00000000-0000-0000-0000-00000000000d')) as chapitres,
     (select count(*) from public.academy_lessons where user_id in ('00000000-0000-0000-0000-00000000000c', '00000000-0000-0000-0000-00000000000d')) as lecons;
   ```
   Attendu : `0` partout.
6. Transmettre les résultats, tels quels, à l'agent pour consignation.

```sql
begin;

-- Sous le role postgres du SQL Editor : creation des deux comptes de test.
-- Annules par le rollback final.
insert into auth.users (id) values
  ('00000000-0000-0000-0000-00000000000c'),
  ('00000000-0000-0000-0000-00000000000d');

-- Compte A : chaine complete, sous son propre role (regle d'acces appliquee).
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000c","role":"authenticated"}', true);
set local role authenticated;
insert into public.academy_programs (user_id, kind, title)
values ('00000000-0000-0000-0000-00000000000c', 'formation', 'Programme de A');
insert into public.academy_subjects (user_id, program_id, title)
select '00000000-0000-0000-0000-00000000000c', id, 'Matiere de A' from public.academy_programs where user_id = '00000000-0000-0000-0000-00000000000c';
insert into public.academy_units (user_id, subject_id, title)
select '00000000-0000-0000-0000-00000000000c', id, 'Module de A' from public.academy_subjects where user_id = '00000000-0000-0000-0000-00000000000c';
insert into public.academy_chapters (user_id, unit_id, title)
select '00000000-0000-0000-0000-00000000000c', id, 'Chapitre de A' from public.academy_units where user_id = '00000000-0000-0000-0000-00000000000c';
insert into public.academy_lessons (user_id, chapter_id, title)
select '00000000-0000-0000-0000-00000000000c', id, 'Lecon de A' from public.academy_chapters where user_id = '00000000-0000-0000-0000-00000000000c';
reset role;

-- Compte B : sa propre chaine complete, sous son propre role.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000d","role":"authenticated"}', true);
set local role authenticated;
insert into public.academy_programs (user_id, kind, title)
values ('00000000-0000-0000-0000-00000000000d', 'formation', 'Programme de B');
insert into public.academy_subjects (user_id, program_id, title)
select '00000000-0000-0000-0000-00000000000d', id, 'Matiere de B' from public.academy_programs where user_id = '00000000-0000-0000-0000-00000000000d';
insert into public.academy_units (user_id, subject_id, title)
select '00000000-0000-0000-0000-00000000000d', id, 'Module de B' from public.academy_subjects where user_id = '00000000-0000-0000-0000-00000000000d';
insert into public.academy_chapters (user_id, unit_id, title)
select '00000000-0000-0000-0000-00000000000d', id, 'Chapitre de B' from public.academy_units where user_id = '00000000-0000-0000-0000-00000000000d';
insert into public.academy_lessons (user_id, chapter_id, title)
select '00000000-0000-0000-0000-00000000000d', id, 'Lecon de B' from public.academy_chapters where user_id = '00000000-0000-0000-0000-00000000000d';
reset role;

-- Sous postgres (proprietaire des tables, hors regle d'acces) : releve des
-- identifiants de A, que B va viser tels quels.
select set_config('academy_test.subject_a',
  (select id::text from public.academy_subjects where user_id = '00000000-0000-0000-0000-00000000000c'), true);
select set_config('academy_test.unit_a',
  (select id::text from public.academy_units where user_id = '00000000-0000-0000-0000-00000000000c'), true);
select set_config('academy_test.chapter_a',
  (select id::text from public.academy_chapters where user_id = '00000000-0000-0000-0000-00000000000c'), true);
select set_config('academy_test.lesson_a',
  (select id::text from public.academy_lessons where user_id = '00000000-0000-0000-0000-00000000000c'), true);

-- Bascule sur B : trois tentatives de modification par table.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000d","role":"authenticated"}', true);
set local role authenticated;

-- academy_units
-- (a) B rattache sa propre ligne au parent de A. Attendu : 23503.
do $$
begin
  update public.academy_units
  set subject_id = current_setting('academy_test.subject_a')::uuid
  where user_id = '00000000-0000-0000-0000-00000000000d';
  raise exception 'ECHEC DU TEST (a) : module de B rattache(e) sous la matiere de A.';
exception
  when foreign_key_violation or insufficient_privilege then
    perform set_config('academy_test.units_a', sqlstate || ' ' || sqlerrm, true);
end;
$$;

-- (b) B tente de modifier la ligne de A. Attendu : 0 ligne affectee.
do $$
declare
  n integer;
begin
  update public.academy_units
  set title = 'Piratage'
  where id = current_setting('academy_test.unit_a')::uuid;
  get diagnostics n = row_count;
  if n <> 0 then
    raise exception 'ECHEC DU TEST (b) : B a modifie % ligne(s) de A dans academy_units.', n;
  end if;
  perform set_config('academy_test.units_b', n::text || ' ligne affectee', true);
end;
$$;

-- (c) B donne sa propre ligne a A (user_id). Attendu : 42501.
do $$
begin
  update public.academy_units
  set user_id = '00000000-0000-0000-0000-00000000000c'
  where user_id = '00000000-0000-0000-0000-00000000000d';
  raise exception 'ECHEC DU TEST (c) : module de B reaffecte(e) au compte A.';
exception
  when insufficient_privilege or foreign_key_violation then
    perform set_config('academy_test.units_c', sqlstate || ' ' || sqlerrm, true);
end;
$$;

-- academy_chapters
-- (a) B rattache sa propre ligne au parent de A. Attendu : 23503.
do $$
begin
  update public.academy_chapters
  set unit_id = current_setting('academy_test.unit_a')::uuid
  where user_id = '00000000-0000-0000-0000-00000000000d';
  raise exception 'ECHEC DU TEST (a) : chapitre de B rattache(e) sous le module de A.';
exception
  when foreign_key_violation or insufficient_privilege then
    perform set_config('academy_test.chapters_a', sqlstate || ' ' || sqlerrm, true);
end;
$$;

-- (b) B tente de modifier la ligne de A. Attendu : 0 ligne affectee.
do $$
declare
  n integer;
begin
  update public.academy_chapters
  set title = 'Piratage'
  where id = current_setting('academy_test.chapter_a')::uuid;
  get diagnostics n = row_count;
  if n <> 0 then
    raise exception 'ECHEC DU TEST (b) : B a modifie % ligne(s) de A dans academy_chapters.', n;
  end if;
  perform set_config('academy_test.chapters_b', n::text || ' ligne affectee', true);
end;
$$;

-- (c) B donne sa propre ligne a A (user_id). Attendu : 42501.
do $$
begin
  update public.academy_chapters
  set user_id = '00000000-0000-0000-0000-00000000000c'
  where user_id = '00000000-0000-0000-0000-00000000000d';
  raise exception 'ECHEC DU TEST (c) : chapitre de B reaffecte(e) au compte A.';
exception
  when insufficient_privilege or foreign_key_violation then
    perform set_config('academy_test.chapters_c', sqlstate || ' ' || sqlerrm, true);
end;
$$;

-- academy_lessons
-- (a) B rattache sa propre ligne au parent de A. Attendu : 23503.
do $$
begin
  update public.academy_lessons
  set chapter_id = current_setting('academy_test.chapter_a')::uuid
  where user_id = '00000000-0000-0000-0000-00000000000d';
  raise exception 'ECHEC DU TEST (a) : lecon de B rattache(e) sous le chapitre de A.';
exception
  when foreign_key_violation or insufficient_privilege then
    perform set_config('academy_test.lessons_a', sqlstate || ' ' || sqlerrm, true);
end;
$$;

-- (b) B tente de modifier la ligne de A. Attendu : 0 ligne affectee.
do $$
declare
  n integer;
begin
  update public.academy_lessons
  set title = 'Piratage'
  where id = current_setting('academy_test.lesson_a')::uuid;
  get diagnostics n = row_count;
  if n <> 0 then
    raise exception 'ECHEC DU TEST (b) : B a modifie % ligne(s) de A dans academy_lessons.', n;
  end if;
  perform set_config('academy_test.lessons_b', n::text || ' ligne affectee', true);
end;
$$;

-- (c) B donne sa propre ligne a A (user_id). Attendu : 42501.
do $$
begin
  update public.academy_lessons
  set user_id = '00000000-0000-0000-0000-00000000000c'
  where user_id = '00000000-0000-0000-0000-00000000000d';
  raise exception 'ECHEC DU TEST (c) : lecon de B reaffecte(e) au compte A.';
exception
  when insufficient_privilege or foreign_key_violation then
    perform set_config('academy_test.lessons_c', sqlstate || ' ' || sqlerrm, true);
end;
$$;

reset role;

-- Synthese, sous postgres. Les lignes de A et de B doivent etre intactes.
select
  current_setting('academy_test.units_a', true) as module_a_parent_de_a,
  current_setting('academy_test.units_b', true) as module_b_ligne_de_a,
  current_setting('academy_test.units_c', true) as module_c_user_id_de_a,
  current_setting('academy_test.chapters_a', true) as chapitre_a_parent_de_a,
  current_setting('academy_test.chapters_b', true) as chapitre_b_ligne_de_a,
  current_setting('academy_test.chapters_c', true) as chapitre_c_user_id_de_a,
  current_setting('academy_test.lessons_a', true) as lecon_a_parent_de_a,
  current_setting('academy_test.lessons_b', true) as lecon_b_ligne_de_a,
  current_setting('academy_test.lessons_c', true) as lecon_c_user_id_de_a,
  format('%s / %s / %s',
    (select title from public.academy_units where user_id = '00000000-0000-0000-0000-00000000000c'),
    (select title from public.academy_chapters where user_id = '00000000-0000-0000-0000-00000000000c'),
    (select title from public.academy_lessons where user_id = '00000000-0000-0000-0000-00000000000c')) as titres_de_a,
  format('%s / %s / %s',
    (select count(*) from public.academy_units u
       join public.academy_subjects s on s.id = u.subject_id and s.user_id = u.user_id
     where u.user_id = '00000000-0000-0000-0000-00000000000d'),
    (select count(*) from public.academy_chapters c
       join public.academy_units u on u.id = c.unit_id and u.user_id = c.user_id
     where c.user_id = '00000000-0000-0000-0000-00000000000d'),
    (select count(*) from public.academy_lessons l
       join public.academy_chapters c on c.id = l.chapter_id and c.user_id = l.user_id
     where l.user_id = '00000000-0000-0000-0000-00000000000d')) as lignes_de_b_sous_parents_de_b;

rollback;
```

**Résultat attendu de la synthèse** :

- `*_a_parent_de_a` (module, chapitre, leçon) : `23503`, avec respectivement `academy_units_subject_fk`, `academy_chapters_unit_fk` et `academy_lessons_chapter_fk` dans le message ;
- `*_b_ligne_de_a` : `0 ligne affectee` pour les trois tables ;
- `*_c_user_id_de_a` : `42501`, « new row violates row-level security policy for table … » pour les trois tables ;
- `titres_de_a` : `Module de A / Chapitre de A / Lecon de A` — inchangés ;
- `lignes_de_b_sous_parents_de_b` : `1 / 1 / 1` — les lignes de B sont restées sous leurs propres parents.

**Vérification** : synthèse conforme à l'attendu ci-dessus, et contrôle de l'étape 5 à `0` partout. Si un résultat diffère, s'arrêter et le signaler. **Ne pas corriger les politiques dans la foulée.**

*Écrit le 2026-11-24 par l'agent, sans exécution ; exécution par Vincent consignée le 2026-11-25.*

### 2026-11-24 — Tester l'isolation SQL des tables academy_units, academy_chapters et academy_lessons

**Statut** : `done` — 2026-11-24. Script exécuté par Vincent, porteur du projet, dans le SQL Editor, sous le rôle `postgres` ; **résultats conformes**. L'agent n'a exécuté aucune requête.

**Pourquoi c'est manuel** : seul le SQL Editor peut exécuter ce test sur la base réelle, et aucune base de test n'est disponible depuis le dépôt (ni CLI Supabase, ni `psql`, ni Docker sur cette machine). L'agent n'a pas d'accès SQL au projet. **À exécuter par Vincent, porteur du projet**, dans le SQL Editor, sous le rôle `postgres`.

**Bloquait** : rien d'immédiat — les routes sont déjà testées à la main, isolation comprise (entrée archivée « Tester les routes Academy : contrat, masquage, isolation »). Ce test comble le trou laissé par l'entrée archivée « Vérifier l'isolation entre deux utilisateurs sur les tables Academy », qui n'a éprouvé que `academy_programs` et la clé composite de `academy_subjects`. **À faire avant l'interface de l'étape 2a.**

**Portée** : pour chacune des trois tables `academy_units`, `academy_chapters` et `academy_lessons` :

1. **une ligne est insérée sous le compte A**, par A lui-même (rôle `authenticated`, règle d'accès appliquée) ;
2. **une insertion du compte B sous le parent de A doit échouer** — module de B sous la matière de A, chapitre de B sous le module de A, leçon de B sous le chapitre de A. Le parent est désigné par son identifiant exact, relevé sous `postgres` : la clé composite `(parent_id, user_id)` est donc réellement éprouvée. Attendu : `23503` (violation de clé composite) ; un `42501` (refus par la règle d'accès) est aussi un refus valable, consigné tel quel ;
3. **A ne voit aucune ligne de B**, et réciproquement : chacun crée sa propre chaîne complète, programme → matière → module → chapitre → leçon, et compte les lignes de l'autre.

**Sans effet durable** : le script écrit, mais **uniquement dans une transaction terminée par `rollback`**. Les deux comptes de test sont créés dans `auth.users` au début de la transaction, sous `postgres`, avec des identifiants fictifs réservés à ce test (`…000c` pour A, `…000d` pour B), différents de ceux du test du 2026-11-24 ; le `rollback` final retire comptes et lignes. Aucun compte réel n'est utilisé, et aucune donnée existante n'est lue ni modifiée. Le contrôle de l'étape 5 vérifie qu'il ne reste rien.

Chaque insertion de B attendue en échec est placée dans un bloc `do` qui **capture** le refus et l'enregistre, pour que l'erreur attendue n'interrompe pas la transaction avant la synthèse et le `rollback`. Si une insertion réussit, le bloc lève « ECHEC DU TEST », et toute la transaction est annulée.

**Résultats obtenus** — 2026-11-24, transmis par Vincent :

- **Contrôle préalable (étape 2)** : `auth.users` n'a que la colonne `id` obligatoire sans valeur par défaut ; le contrôle `pg_trigger` sur `auth.users` ne renvoie aucune ligne, donc aucun déclencheur — **conforme**.
- **Synthèse (étape 3)** :
  - lignes de A : `1 / 1 / 1` (modules, chapitres, leçons) ; lignes de B : `1 / 1 / 1` — chaque compte a bien créé sa chaîne, le test porte donc sur des lignes réelles — **conforme** ;
  - les trois insertions de B sous les parents de A : refusées en **`23503`**, par `academy_units_subject_fk`, `academy_chapters_unit_fk` et `academy_lessons_chapter_fk` — **conforme** : la clé composite refuse à chaque niveau ;
  - vues croisées : `0 / 0 / 0` dans les deux sens — A ne voit aucune ligne de B, B aucune ligne de A — **conforme**.
- **Contrôle après coup (étape 5)** : `0` compte de test et `0` ligne dans les cinq tables `academy_*` — **conforme**.
- Le script s'est terminé par `rollback` : **aucune donnée de test n'a persisté**.

**Portée** : avec le test archivé « Vérifier l'isolation entre deux utilisateurs sur les tables Academy » (`academy_programs`, clé composite de `academy_subjects`), l'isolation côté base est désormais éprouvée sur **les cinq tables** de la hiérarchie : règle d'accès en lecture sur chaque niveau enfant, et clé composite à chaque rattachement. Restent non testées : la cascade à l'usage, et la règle d'accès en **modification** (`update`) sur `academy_units`, `academy_chapters` et `academy_lessons` — ce script ne la tente pas ; elle n'est éprouvée côté base que sur `academy_programs`, et côté routes par les tests à la main.

**Étapes** :

1. Ouvrir le SQL Editor du projet Supabase.
2. **Contrôle préalable, en lecture seule** — déjà conforme le 2026-11-24 (seule `id` obligatoire, aucun déclencheur), à relancer pour s'assurer que rien n'a changé :
   ```sql
   select column_name, data_type
   from information_schema.columns
   where table_schema = 'auth' and table_name = 'users'
     and is_nullable = 'NO' and column_default is null
   order by ordinal_position;

   select tgname, tgenabled
   from pg_trigger
   where tgrelid = 'auth.users'::regclass and not tgisinternal;
   ```
   Attendu : `id` seul dans la première requête, aucun déclencheur dans la seconde. **Sinon, s'arrêter** et le transmettre à l'agent.
3. Lancer le script ci-dessous **en une seule exécution**. Si une instruction échoue hors des blocs `do` (par exemple `permission denied`, ou « ECHEC DU TEST »), s'arrêter et transmettre le message : la transaction est annulée, rien n'est écrit.
4. Relever le résultat de la requête de synthèse — le SQL Editor n'affiche que le résultat de la dernière instruction qui en renvoie un, d'où la synthèse placée juste avant le `rollback`.
5. **Contrôle après coup, en lecture seule** :
   ```sql
   select
     (select count(*) from auth.users where id in ('00000000-0000-0000-0000-00000000000c', '00000000-0000-0000-0000-00000000000d')) as utilisateurs_de_test_restants,
     (select count(*) from public.academy_programs where user_id in ('00000000-0000-0000-0000-00000000000c', '00000000-0000-0000-0000-00000000000d')) as programmes,
     (select count(*) from public.academy_subjects where user_id in ('00000000-0000-0000-0000-00000000000c', '00000000-0000-0000-0000-00000000000d')) as matieres,
     (select count(*) from public.academy_units where user_id in ('00000000-0000-0000-0000-00000000000c', '00000000-0000-0000-0000-00000000000d')) as modules,
     (select count(*) from public.academy_chapters where user_id in ('00000000-0000-0000-0000-00000000000c', '00000000-0000-0000-0000-00000000000d')) as chapitres,
     (select count(*) from public.academy_lessons where user_id in ('00000000-0000-0000-0000-00000000000c', '00000000-0000-0000-0000-00000000000d')) as lecons;
   ```
   Attendu : `0` partout.
6. Transmettre les deux résultats, tels quels, à l'agent pour consignation.

```sql
begin;

-- Sous le role postgres du SQL Editor : creation des deux comptes de test.
-- Annules par le rollback final.
insert into auth.users (id) values
  ('00000000-0000-0000-0000-00000000000c'),
  ('00000000-0000-0000-0000-00000000000d');

-- Compte A : chaine complete, sous son propre role (regle d'acces appliquee).
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000c","role":"authenticated"}', true);
set local role authenticated;
insert into public.academy_programs (user_id, kind, title)
values ('00000000-0000-0000-0000-00000000000c', 'formation', 'Programme de A');
insert into public.academy_subjects (user_id, program_id, title)
select '00000000-0000-0000-0000-00000000000c', id, 'Matiere de A' from public.academy_programs where user_id = '00000000-0000-0000-0000-00000000000c';
insert into public.academy_units (user_id, subject_id, title)
select '00000000-0000-0000-0000-00000000000c', id, 'Module de A' from public.academy_subjects where user_id = '00000000-0000-0000-0000-00000000000c';
insert into public.academy_chapters (user_id, unit_id, title)
select '00000000-0000-0000-0000-00000000000c', id, 'Chapitre de A' from public.academy_units where user_id = '00000000-0000-0000-0000-00000000000c';
insert into public.academy_lessons (user_id, chapter_id, title)
select '00000000-0000-0000-0000-00000000000c', id, 'Lecon de A' from public.academy_chapters where user_id = '00000000-0000-0000-0000-00000000000c';
reset role;

-- Compte B : sa propre chaine complete, sous son propre role.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000d","role":"authenticated"}', true);
set local role authenticated;
insert into public.academy_programs (user_id, kind, title)
values ('00000000-0000-0000-0000-00000000000d', 'formation', 'Programme de B');
insert into public.academy_subjects (user_id, program_id, title)
select '00000000-0000-0000-0000-00000000000d', id, 'Matiere de B' from public.academy_programs where user_id = '00000000-0000-0000-0000-00000000000d';
insert into public.academy_units (user_id, subject_id, title)
select '00000000-0000-0000-0000-00000000000d', id, 'Module de B' from public.academy_subjects where user_id = '00000000-0000-0000-0000-00000000000d';
insert into public.academy_chapters (user_id, unit_id, title)
select '00000000-0000-0000-0000-00000000000d', id, 'Chapitre de B' from public.academy_units where user_id = '00000000-0000-0000-0000-00000000000d';
insert into public.academy_lessons (user_id, chapter_id, title)
select '00000000-0000-0000-0000-00000000000d', id, 'Lecon de B' from public.academy_chapters where user_id = '00000000-0000-0000-0000-00000000000d';
reset role;

-- Sous postgres (proprietaire des tables, hors regle d'acces) : releve des
-- identifiants des parents de A, que B va viser tels quels.
select set_config('academy_test.subject_a',
  (select id::text from public.academy_subjects where user_id = '00000000-0000-0000-0000-00000000000c'), true);
select set_config('academy_test.unit_a',
  (select id::text from public.academy_units where user_id = '00000000-0000-0000-0000-00000000000c'), true);
select set_config('academy_test.chapter_a',
  (select id::text from public.academy_chapters where user_id = '00000000-0000-0000-0000-00000000000c'), true);

-- Bascule sur B : insertions sous les parents de A. Attendu : refus (23503, ou 42501).
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000d","role":"authenticated"}', true);
set local role authenticated;

do $$
begin
  insert into public.academy_units (user_id, subject_id, title)
  values ('00000000-0000-0000-0000-00000000000d', current_setting('academy_test.subject_a')::uuid, 'Intrusion');
  raise exception 'ECHEC DU TEST : module de B accepte sous la matiere de A.';
exception
  when foreign_key_violation or insufficient_privilege then
    perform set_config('academy_test.unit_b', sqlstate || ' ' || sqlerrm, true);
end;
$$;

do $$
begin
  insert into public.academy_chapters (user_id, unit_id, title)
  values ('00000000-0000-0000-0000-00000000000d', current_setting('academy_test.unit_a')::uuid, 'Intrusion');
  raise exception 'ECHEC DU TEST : chapitre de B accepte sous le module de A.';
exception
  when foreign_key_violation or insufficient_privilege then
    perform set_config('academy_test.chapter_b', sqlstate || ' ' || sqlerrm, true);
end;
$$;

do $$
begin
  insert into public.academy_lessons (user_id, chapter_id, title)
  values ('00000000-0000-0000-0000-00000000000d', current_setting('academy_test.chapter_a')::uuid, 'Intrusion');
  raise exception 'ECHEC DU TEST : lecon de B acceptee sous le chapitre de A.';
exception
  when foreign_key_violation or insufficient_privilege then
    perform set_config('academy_test.lesson_b', sqlstate || ' ' || sqlerrm, true);
end;
$$;

-- B compte les lignes de A. Attendu : 0 / 0 / 0.
select set_config('academy_test.b_voit_a', format('%s / %s / %s',
  (select count(*) from public.academy_units where user_id = '00000000-0000-0000-0000-00000000000c'),
  (select count(*) from public.academy_chapters where user_id = '00000000-0000-0000-0000-00000000000c'),
  (select count(*) from public.academy_lessons where user_id = '00000000-0000-0000-0000-00000000000c')), true);
reset role;

-- Bascule sur A : A compte les lignes de B. Attendu : 0 / 0 / 0.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000c","role":"authenticated"}', true);
set local role authenticated;
select set_config('academy_test.a_voit_b', format('%s / %s / %s',
  (select count(*) from public.academy_units where user_id = '00000000-0000-0000-0000-00000000000d'),
  (select count(*) from public.academy_chapters where user_id = '00000000-0000-0000-0000-00000000000d'),
  (select count(*) from public.academy_lessons where user_id = '00000000-0000-0000-0000-00000000000d')), true);
reset role;

-- Synthese, sous postgres.
select
  format('%s / %s / %s',
    (select count(*) from public.academy_units where user_id = '00000000-0000-0000-0000-00000000000c'),
    (select count(*) from public.academy_chapters where user_id = '00000000-0000-0000-0000-00000000000c'),
    (select count(*) from public.academy_lessons where user_id = '00000000-0000-0000-0000-00000000000c')) as lignes_de_a_modules_chapitres_lecons,
  format('%s / %s / %s',
    (select count(*) from public.academy_units where user_id = '00000000-0000-0000-0000-00000000000d'),
    (select count(*) from public.academy_chapters where user_id = '00000000-0000-0000-0000-00000000000d'),
    (select count(*) from public.academy_lessons where user_id = '00000000-0000-0000-0000-00000000000d')) as lignes_de_b_modules_chapitres_lecons,
  current_setting('academy_test.unit_b', true) as module_de_b_sous_matiere_de_a,
  current_setting('academy_test.chapter_b', true) as chapitre_de_b_sous_module_de_a,
  current_setting('academy_test.lesson_b', true) as lecon_de_b_sous_chapitre_de_a,
  current_setting('academy_test.a_voit_b', true) as lignes_de_b_vues_par_a,
  current_setting('academy_test.b_voit_a', true) as lignes_de_a_vues_par_b;

rollback;
```

**Résultat attendu de la synthèse** :

- `lignes_de_a_…` et `lignes_de_b_…` : `1 / 1 / 1` — chaque compte a bien créé sa ligne dans chacune des trois tables (sinon le test ne prouve rien) ;
- les trois insertions de B : `23503`, avec respectivement `academy_units_subject_fk`, `academy_chapters_unit_fk` et `academy_lessons_chapter_fk` dans le message ; un `42501` est aussi un refus, à consigner tel quel ;
- `lignes_de_b_vues_par_a` et `lignes_de_a_vues_par_b` : `0 / 0 / 0`.

**Vérification** : synthèse conforme à l'attendu ci-dessus, et contrôle de l'étape 5 à `0` partout. Si un résultat diffère, s'arrêter et le signaler. **Ne pas corriger les politiques dans la foulée.**

*Écrit le 2026-11-24 par l'agent, sans exécution ; exécution par Vincent consignée le même jour.*

### 2026-11-24 — Nettoyer les données de test Academy après les tests de routes

**Statut** : `done` — 2026-11-24, **avec un écart** : une leçon de plus que prévu a été supprimée sans avoir été identifiée (voir « Exécution »). Suppression exécutée par Vincent, porteur du projet ; l'agent n'a exécuté aucune requête.

**Pourquoi c'est manuel** : il n'existe pas de suppression physique dans Academy — les tables `academy_*` n'accordent pas `DELETE` à `authenticated`, et le chemin de suppression de l'étape 8 n'est pas écrit —, et seul le SQL Editor, sous le rôle `postgres`, peut supprimer les données de test du compte. L'agent n'a pas d'accès SQL au projet.

**Bloquait** : rien. **À faire avant toute mise en production d'un usage réel de la hiérarchie**, et après les tests de contrat et d'isolation des routes.

**Cible corrigée le 2026-11-24 : `test-erase@edificeia.com`, et non `academy@edificeia.com`.** Les tests de contrat des routes ont créé leurs données sous `test-erase@edificeia.com`, par erreur de départ, corrigée ensuite (entrée archivée « Tester les routes Academy » du même jour). `academy@edificeia.com` n'a servi qu'au second compte des tests d'isolation, où aucune écriture n'a réussi : il ne porte aucune donnée Academy à supprimer — à confirmer par le comptage, relancé sur son adresse si besoin.

**Portée** : supprime **toutes** les lignes des cinq tables `academy_*` du seul compte `test-erase@edificeia.com`. Aucun autre compte n'est touché : chaque `delete` filtre sur l'identifiant de ce compte, résolu par son adresse. Si l'adresse ne correspond à aucun compte, l'identifiant est nul et aucune ligne n'est supprimée ; si elle en désigne plusieurs, la sous-requête échoue et la transaction est annulée. **Seules les tables `academy_*` sont visées** : les données Personnel de ce compte, qui sert aussi aux tests d'effacement, ne sont pas touchées.

**Données de test connues à supprimer**, relevées avant l'exécution, créées sous `test-erase@edificeia.com` le 2026-11-24 :

- programme `39e6135b-2a79-4f48-8f9e-0581dec2d233` ;
- matière `636e01ff-7b78-4d2d-a15a-534de0edb7ad` ;
- module de test `5623505a-94b7-4ad7-9dee-3b5edbe5dd6a` ;
- **un premier module de test, en double, dont l'identifiant n'a pas été relevé** ;
- chapitre `d4fe188e-ee7a-4141-98ef-f89bcaceba5b` ;
- leçon `c73fa183-3235-4d74-ba59-4fb05a4a1775`.

Le module en double n'ayant pas d'identifiant relevé, la suppression vise **toutes** les lignes `academy_*` du compte plutôt qu'une liste d'identifiants : elle l'emporte avec le reste. Le comptage de l'étape 2 doit donc montrer au moins 1 programme, 1 matière, 2 modules, 1 chapitre et 1 leçon ; un volume supérieur signale d'autres données Academy sur ce compte, à examiner avant la suppression.

**Exécution** — 2026-11-24, résultats transmis par Vincent (l'agent n'a exécuté aucune requête) :

- **Comptage avant suppression** (étape 2) : une seule ligne, pour `test-erase@edificeia.com` — **1 programme, 1 matière, 2 modules, 1 chapitre, 2 leçons**.
- **Écart constaté** : le comptage attendu était **1 leçon**, il en a trouvé **2**. La procédure demandait d'examiner tout volume supérieur avant la suppression ; **cela n'a pas été fait** : la seconde leçon n'a pas été identifiée — une requête de listage était préparée, mais n'a pas été exécutée, la suppression ayant été lancée avant.
- **Suppression** (étape 3) : bloc `begin` … `commit` exécuté en entier dans le SQL Editor, sous le rôle `postgres`, sans erreur signalée.
- **Comptage après suppression** (étape 4) : `0` dans les cinq tables, sur la même ligne de compte — `user_id` `a144c044-0621-405c-809c-78127fde3a4d`.

**Conséquence** : la leçon en trop **n'est plus vérifiable** — ni son identifiant, ni son titre, ni son origine ne pourront être retrouvés. Elle appartenait au compte `test-erase@edificeia.com`, dont l'usage de test est confirmé par Vincent ; elle ne peut donc pas être une donnée réelle d'un autre compte, la suppression filtrant sur ce seul `user_id`. **La suppression n'est pas conforme à la procédure sur ce point** : le volume supérieur à l'attendu devait être examiné avant l'étape 3. Les volumes des autres tables correspondaient à l'attendu.

**Leçon pour la suite** : un écart au comptage arrête la procédure tant que la ligne en trop n'est pas identifiée.

**Étapes** :

1. Ouvrir le SQL Editor du projet Supabase.
2. **Comptage, en lecture seule** — vérifier que le compte existe une seule fois, et relever les volumes :
   ```sql
   select
     u.id as user_id,
     (select count(*) from public.academy_programs p where p.user_id = u.id) as programmes,
     (select count(*) from public.academy_subjects s where s.user_id = u.id) as matieres,
     (select count(*) from public.academy_units n where n.user_id = u.id) as modules,
     (select count(*) from public.academy_chapters c where c.user_id = u.id) as chapitres,
     (select count(*) from public.academy_lessons l where l.user_id = u.id) as lecons
   from auth.users u
   where u.email = 'test-erase@edificeia.com';
   ```
   Attendu : **une seule ligne**. Aucune ligne, ou plusieurs : s'arrêter et le signaler. Relire les volumes avant l'étape 3.
3. **Suppression**, après relecture du comptage — dans l'ordre inverse des dépendances, leçons d'abord, programmes en dernier, dans une seule transaction. **Action irréversible.**
   ```sql
   begin;

   delete from public.academy_lessons
   where user_id = (select id from auth.users where email = 'test-erase@edificeia.com');

   delete from public.academy_chapters
   where user_id = (select id from auth.users where email = 'test-erase@edificeia.com');

   delete from public.academy_units
   where user_id = (select id from auth.users where email = 'test-erase@edificeia.com');

   delete from public.academy_subjects
   where user_id = (select id from auth.users where email = 'test-erase@edificeia.com');

   delete from public.academy_programs
   where user_id = (select id from auth.users where email = 'test-erase@edificeia.com');

   commit;
   ```
4. Relancer le comptage de l'étape 2, puis transmettre les deux comptages à l'agent pour consignation.

**Vérification** : le comptage de l'étape 2, relancé, renvoie `0` pour chaque table, sur la même ligne de compte.

*Écrit le 2026-11-24 par l'agent, sans exécution ; cible corrigée le même jour ; exécution par Vincent consignée le même jour.*

### 2026-11-24 — Tester les routes Academy : contrat, masquage, isolation

**Statut** : `done` — 2026-11-24. Tests faits à la main par le porteur du projet, dans la console du navigateur, sur le serveur local (`localhost:3000`). Résultats transmis à l'agent, qui n'a fait aucun appel ni aucune requête.

**Pourquoi c'est manuel** : les tests demandent deux sessions authentifiées de deux comptes distincts, ouvertes par le porteur du projet ; l'agent ne saisit pas d'identifiants.

**Compte des créations : `test-erase@edificeia.com`**, et non `academy@edificeia.com` — erreur de départ, corrigée ensuite. Ce compte sert aussi aux tests d'effacement du pôle Personnel : l'entrée de nettoyage ne vise que ses tables `academy_*`.

**Données créées sous `test-erase@edificeia.com`** :

- programme `39e6135b-2a79-4f48-8f9e-0581dec2d233` ;
- matière `636e01ff-7b78-4d2d-a15a-534de0edb7ad` ;
- module de test `5623505a-94b7-4ad7-9dee-3b5edbe5dd6a` ;
- **un premier module de test, en double, dont l'identifiant n'a pas été relevé** ;
- chapitre `d4fe188e-ee7a-4141-98ef-f89bcaceba5b` ;
- leçon `c73fa183-3235-4d74-ba59-4fb05a4a1775`.

**Contrat** :

- `POST` programme, matière, module, chapitre, leçon : `201` ;
- `GET` arbre du programme : `200`, cinq niveaux ;
- `GET` leçon : `200`, avec son contenu ;
- `GET` sans session : `401` ;
- `GET` sur `/api/academy/chapters/[id]` : `405` — **voulu** : ce fichier n'exporte que `PATCH` et `DELETE`, conformément au plan validé, où seuls le programme (arbre) et la leçon (contenu) se lisent par identifiant. Next.js répond `405` à une méthode non exportée, sans exécuter de handler ni renvoyer de donnée.

**Masquage** :

- archivage du module : `200` ;
- après archivage, le chapitre et la leçon sont absents de l'arbre ;
- `PATCH`, `DELETE` et restauration du chapitre : `404` ;
- restauration du module : `200` ;
- après restauration, tout est de nouveau visible.

**Isolation** — second compte `academy@edificeia.com`, fenêtre privée, identifiants de `test-erase@edificeia.com` :

- `GET` arbre, `GET` leçon, `PATCH` programme, `DELETE` et restauration du module, création de matière, de chapitre et de leçon sous les parents de `test-erase`, `PATCH` leçon : tous **`404`** ;
- identifiant malformé : `404` ;
- JSON invalide : `400` ;
- **aucune écriture réussie.**

**Non couvert** :

- l'isolation **côté base** de `academy_units`, `academy_chapters` et `academy_lessons` : le script SQL du 2026-11-24 n'a éprouvé que `academy_programs` et la clé composite de `academy_subjects`. **Entrée distincte à ajouter** ;
- au niveau des routes, l'isolation porte sur les opérations listées ci-dessus, pas sur toutes les combinaisons méthode × niveau ;
- la cascade à l'usage — rien n'est supprimé physiquement par les routes.

**Suite** : nettoyage des données de test, entrée `pending` « Nettoyer les données de test Academy après les tests de routes ».

### 2026-11-24 — Créer le compte de test dédié à Academy

**Statut** : `done` — 2026-11-24, compte créé par le porteur du projet.

**Pourquoi c'est manuel** : la création d'un compte et le choix de son mot de passe passent par l'authentification de l'application ou le dashboard Supabase, et un mot de passe ne doit passer ni par l'agent ni par le dépôt.

**Compte** : `academy@edificeia.com`. **Le mot de passe n'est consigné nulle part**, ni dans ce fichier ni ailleurs dans le dépôt.

**Usage** : tests d'isolation et de contrat des routes Academy (étape 2a du chantier 8), **et rien d'autre**. Ne pas le réutiliser pour un autre test.

**Distinction avec les autres comptes de test du dépôt** :

- `test-erase@edificeia.com` : tests de l'effacement du pôle Personnel (« Vider l'historique », suppression définitive d'un élément archivé). À ne pas utiliser pour Academy.
- `contact.edificeia@gmail.com` : compte sur lequel les dix catégories de Journal ont été amorcées (entrée archivée du 2026-09-09). À ne pas utiliser pour Academy.

Séparer les comptes garde chaque test lisible : les données de test Academy ne se mêlent ni aux données d'effacement, ni aux catégories de Journal, et leur nettoyage — entrée `pending` du même jour — ne vise que ce compte.

**Vérification** : aucune par l'agent — la création est déclarée par le porteur du projet. Le comptage de l'entrée de nettoyage, en lecture seule, confirme l'existence du compte par son adresse.

### 2026-11-24 — Vérifier l'isolation entre deux utilisateurs sur les tables Academy

**Statut** : `done` — 2026-11-24. Script exécuté par le porteur du projet dans le SQL Editor, en une fois ; résultats conformes.

**Pourquoi c'est manuel** : seul le SQL Editor peut exécuter ce test sur la base réelle, et aucune base de test n'est disponible depuis le dépôt (ni CLI Supabase, ni `psql`, ni Docker sur cette machine). L'agent n'a pas d'accès SQL au projet.

**Bloquait** : la mise en service des routes Academy de l'étape 2a suite. **Ne pas les déployer avant un résultat conforme.**

**Validé par le porteur du projet le 2026-11-24 ; exécution autorisée.** Aucune requête de cette entrée n'a été exécutée par l'agent. *(Jusqu'à cette validation, l'entrée portait la mention « ne pas exécuter en l'état ».)*

*Révision du 2026-11-24.* La première version du script, consignée par `e03c182`, avait deux défauts relevés à la lecture : l'insertion de A échouait sur la clé étrangère vers `auth.users`, les identifiants de test n'y existant pas ; et l'insertion d'un enfant par B passait par un `select` filtré par la règle d'accès de B, qui ne renvoyait rien — zéro ligne insérée, sans erreur, donc sans éprouver la clé composite. La version ci-dessous corrige les deux, à la demande du porteur du projet :

- **A et B sont créés dans `auth.users`** au début de la transaction, sous le rôle `postgres` du SQL Editor, avant toute bascule vers `authenticated`, avec la seule colonne obligatoire attendue (`id`). Le `rollback` final les retire.
- **L'identifiant du programme de A est relevé sous `postgres`**, après l'insertion de A et avant la bascule vers B, et conservé dans un paramètre de transaction (`set_config('academy_test.program_a', …, true)`). B l'utilise **tel quel** comme `program_id` : la clé composite `(program_id, user_id)` est alors réellement éprouvée. Les contrôles de clé étrangère s'exécutent hors RLS : l'erreur `23503` doit apparaître.
- L'insertion de B est placée dans un bloc `do` qui **capture** le `23503` et l'enregistre, pour que l'erreur attendue n'interrompe pas la transaction avant la synthèse et le `rollback`. Si l'insertion réussit, le bloc lève une erreur explicite (« ECHEC DU TEST »), et la transaction est annulée.
- Une **requête de synthèse**, sous `postgres`, réunit les résultats avant le `rollback`, et une **requête de contrôle** après le `rollback` vérifie qu'il ne reste rien.

**Résultats des contrôles préalables** — 2026-11-24, transmis par le porteur du projet (étape 2) :

- colonnes `not null` sans valeur par défaut sur `auth.users` : seulement `id` — **conforme** ;
- déclencheurs sur `auth.users` : aucun — **conforme**.

**Étapes** :

1. Ouvrir le SQL Editor du projet Supabase.
2. **Contrôle préalable, en lecture seule** — colonnes `not null` sans valeur par défaut de `auth.users`, et déclencheurs posés sur la table :
   ```sql
   select column_name, data_type
   from information_schema.columns
   where table_schema = 'auth' and table_name = 'users'
     and is_nullable = 'NO' and column_default is null
   order by ordinal_position;

   select tgname, tgenabled
   from pg_trigger
   where tgrelid = 'auth.users'::regclass and not tgisinternal;
   ```
   Attendu : `id` seul dans la première requête, et aucun déclencheur dans la seconde (aucune migration du dépôt n'en pose sur `auth.users`). **Si une autre colonne apparaît, ou un déclencheur, s'arrêter** et le transmettre : l'insertion du script devra être adaptée.
3. Lancer le script ci-dessous **en une seule exécution**. Si la première instruction échoue (par exemple `permission denied for table users`), s'arrêter et le transmettre : la transaction est annulée, rien n'est écrit, et la création des utilisateurs de test devra être revue.
4. Relever le résultat de la requête de synthèse, puis lancer la requête de contrôle de l'étape 5.
5. **Contrôle après coup, en lecture seule** :
   ```sql
   select
     (select count(*) from auth.users where id in ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000b')) as utilisateurs_de_test_restants,
     (select count(*) from public.academy_programs where user_id in ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000b')) as programmes_de_test_restants,
     (select count(*) from public.academy_subjects where user_id in ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000b')) as matieres_de_test_restantes;
   ```
6. Transmettre les résultats, tels quels, au porteur du projet pour consignation.

```sql
begin;

-- Sous le role postgres du SQL Editor : creation des deux utilisateurs de test.
-- Seule la colonne obligatoire attendue (id) ; verifier l'etape 2 avant.
-- Annules par le rollback final.
insert into auth.users (id) values
  ('00000000-0000-0000-0000-00000000000a'),
  ('00000000-0000-0000-0000-00000000000b');

-- Utilisateur A : creation d'un programme sous son propre role.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}', true);
set local role authenticated;
insert into public.academy_programs (user_id, kind, title)
values ('00000000-0000-0000-0000-00000000000a', 'formation', 'Programme de A')
returning id;

-- Retour sous postgres : releve de l'identifiant du programme de A, avant la
-- bascule sur B (postgres, proprietaire des tables, n'est pas soumis a RLS).
reset role;
select set_config(
  'academy_test.program_a',
  (select id::text from public.academy_programs where user_id = '00000000-0000-0000-0000-00000000000a'),
  true
);

-- Bascule sur B : A n'est plus visible.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}', true);
set local role authenticated;

-- Attendu : 0 ligne.
select set_config(
  'academy_test.count_b',
  (select count(*)::text from public.academy_programs where user_id = '00000000-0000-0000-0000-00000000000a'),
  true
);

-- Attendu : aucune ligne modifiee (la regle d'acces masque A a B).
update public.academy_programs set title = 'Piratage'
where user_id = '00000000-0000-0000-0000-00000000000a';

-- Attendu : erreur 23503, la cle composite (program_id, user_id) refuse un
-- enfant de B sous le programme de A, identifiant exact.
do $$
begin
  insert into public.academy_subjects (user_id, program_id, title)
  values (
    '00000000-0000-0000-0000-00000000000b',
    current_setting('academy_test.program_a')::uuid,
    'Intrusion'
  );
  raise exception 'ECHEC DU TEST : l''insertion de B sous le programme de A a ete acceptee.';
exception
  when foreign_key_violation then
    perform set_config('academy_test.insert_b', '23503 ' || sqlerrm, true);
end;
$$;

-- Synthese, sous postgres.
reset role;
select
  current_setting('academy_test.program_a', true) as programme_a,
  current_setting('academy_test.count_b', true) as lignes_visibles_par_b,
  (select title from public.academy_programs
   where id = current_setting('academy_test.program_a')::uuid) as titre_programme_a_apres_update_b,
  current_setting('academy_test.insert_b', true) as insertion_enfant_par_b;

rollback;
```

**Résultats obtenus** — 2026-11-24, transmis par le porteur du projet (l'agent n'a exécuté aucune requête) :

- **Étape 3, script d'isolation, exécuté en une fois** :
  - programme de A : créé, identifiant `8b2dcded-b075-475f-b116-ab9938d0b19a` ;
  - lignes visibles par B : `0` — **conforme** ;
  - titre du programme de A après la tentative de modification par B : « Programme de A », inchangé — **conforme** ;
  - insertion d'un enfant par B sous le programme de A : erreur `23503`, violation de `academy_subjects_program_fk` — **conforme** : la clé composite refuse.
- **Étape 5, contrôle après rollback** : 0 utilisateur de test, 0 programme de test, 0 matière de test restants — **conforme**.

Le SQL Editor a affiché le résultat de la dernière instruction, qui synthétise les trois contrôles : les résultats de l'étape 3 ci-dessus sont ceux de cette synthèse.

**Portée** : ce test prouve, côté base, l'isolation entre deux utilisateurs sur `academy_programs` — B ne voit ni ne modifie les lignes de A — et le refus par la clé composite de `academy_subjects` d'un enfant rattaché au programme d'un autre utilisateur. Il ne couvre **pas** les routes, **ni** la cascade à l'usage, **ni** les autres tables de la hiérarchie — `academy_units`, `academy_chapters`, `academy_lessons` —, qui ont la même structure mais ne sont pas testées individuellement.

**Limite d'affichage** : le SQL Editor ne montre que le résultat de la dernière instruction exécutée ; c'est ce qui s'est produit, et c'est pourquoi la synthèse est placée en dernier. *(Cette limite était signalée comme non vérifiée avant l'exécution.)*

**Vérification** : si un résultat diffère, arrêter et le signaler au porteur du projet. **Ne pas corriger les politiques dans la foulée.**

### 2026-11-24 — Appliquer la migration Academy (hiérarchie 2a)

**Statut** : `done` — 2026-11-24, migration appliquée par le porteur du projet dans le SQL Editor ; contrôles structurels conformes.

**Pourquoi c'est manuel** : appliquer une migration et lire l'état réel des droits, des policies et des contraintes passent par le SQL Editor du dashboard Supabase. L'agent n'a pas d'accès SQL au projet, et aucune base de test locale n'existe sur cette machine (ni CLI Supabase, ni `psql`, ni Docker) : **la migration n'a été exécutée nulle part**.

**Bloquait** : le store, les routes et l'interface de la hiérarchie pédagogique (suite de l'étape 2 du chantier 8).

**Étapes** :

1. Ouvrir le SQL Editor du projet Supabase.
2. **Témoin avant** — aucune table `academy_*` ne doit exister :
   ```sql
   select tablename from pg_tables
   where schemaname = 'public' and tablename like 'academy\_%'
   order by 1;
   ```
   Attendu : aucune ligne.
3. Coller et exécuter le contenu intégral de `supabase/migrations/20261124120000_create_academy_hierarchy.sql`. Il est enveloppé dans `begin; … commit;` : une erreur annule tout.
4. **Droits** — exactement `INSERT, SELECT, UPDATE` pour `authenticated`, rien pour `anon` ni `PUBLIC` :
   ```sql
   select c.relname as table_name,
          case when a.grantee = 0 then 'PUBLIC' else a.grantee::regrole::text end as grantee,
          string_agg(a.privilege_type, ', ' order by a.privilege_type) as privileges
   from pg_class c
   join pg_namespace n on n.oid = c.relnamespace
   cross join lateral aclexplode(c.relacl) a
   where n.nspname = 'public'
     and c.relname in ('academy_programs', 'academy_subjects', 'academy_units', 'academy_chapters', 'academy_lessons')
     and (a.grantee = 0
          or a.grantee in (select oid from pg_roles where rolname in ('anon', 'authenticated')))
   group by 1, 2
   order by 1, 2;
   ```
   Attendu : cinq lignes, une par table, toutes `authenticated` → `INSERT, SELECT, UPDATE`. Aucune ligne `anon` ni `PUBLIC`, aucun `DELETE`.
5. **RLS et policies** — trois par table, toutes sur le propriétaire :
   ```sql
   select c.relname, c.relrowsecurity
   from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relname in ('academy_programs', 'academy_subjects', 'academy_units', 'academy_chapters', 'academy_lessons')
   order by 1;

   select tablename, policyname, roles, cmd, qual, with_check
   from pg_policies
   where schemaname = 'public' and tablename in ('academy_programs', 'academy_subjects', 'academy_units', 'academy_chapters', 'academy_lessons')
   order by tablename, policyname;
   ```
   Attendu : `relrowsecurity = true` sur les cinq ; quinze policies `<table>_insert_own`, `_select_own`, `_update_own`, rôle `{authenticated}`, `qual` et `with_check` à `(user_id = auth.uid())` (ou nuls selon la commande) ; aucune autre.
6. **Contraintes** — clés composites et `check` :
   ```sql
   select conrelid::regclass as table_name, conname, contype, confdeltype,
          pg_get_constraintdef(oid) as definition
   from pg_constraint
   where conrelid in ('public.academy_programs'::regclass, 'public.academy_subjects'::regclass,
                      'public.academy_units'::regclass, 'public.academy_chapters'::regclass,
                      'public.academy_lessons'::regclass)
   order by 1, 2;
   ```
   Attendu : sur chaque table, `<table>_id_user_id_key` (`contype = u`) ; quatre clés étrangères `academy_subjects_program_fk`, `academy_units_subject_fk`, `academy_chapters_unit_fk`, `academy_lessons_chapter_fk` (`contype = f`, `confdeltype = c`, sur `(…_id, user_id)`) ; les `check` de titre, description ou contenu, de position, et `academy_programs_kind_known`.
7. Transmettre les résultats des étapes 2, 4, 5 et 6 à l'agent, pour qu'ils soient consignés ici.

**Résultats** — 2026-11-24, transmis par le porteur du projet (l'agent n'a exécuté aucune requête) :

- **Témoin avant** (étape 2) : aucune table `academy_*`.
- **Application** (étape 3) : « Success. No rows returned ».
- **Droits** (étape 4) : cinq lignes, toutes `authenticated` → `INSERT, SELECT, UPDATE` ; aucune ligne `anon` ni `PUBLIC` ; aucun `DELETE`.
- **RLS** (étape 5) : activée sur les cinq tables.
- **Règles d'accès** (étape 5) : quinze règles, trois par table, toutes `{authenticated}`, sur `user_id = auth.uid()`.
- **Contraintes** (étape 6) : clés primaires, clés uniques `(id, user_id)`, références à `auth.users` en cascade, `check` attendus, et les quatre clés composites `academy_subjects_program_fk`, `academy_units_subject_fk`, `academy_chapters_unit_fk`, `academy_lessons_chapter_fk`, en cascade.

**Portée** : ces contrôles sont **structurels**. Ils établissent que les objets existent avec les droits, règles et contraintes prévus. **Les tests fonctionnels ne sont pas faits** : ni l'isolation entre deux utilisateurs (un compte qui lirait ou écrirait les lignes d'un autre), ni le comportement de la cascade à l'usage. Ils viendront avec le store et les routes de l'étape 2.

**Vérification** : les résultats correspondent aux attendus ci-dessus. Tout écart — un `DELETE`, un privilège `anon`, une policy en trop, une clé étrangère absente — est à signaler avant toute écriture applicative.

### 2026-11-24 — Vérifier que Vercel Cron passe avec le vrai `CRON_SECRET`

**Statut** : `done` — 2026-11-24. Run lancé par le mainteneur sur `calendar-channel-renewal` : **`200`**, code lu dans le tableau de bord Vercel et transmis à l'agent.

**Pourquoi c'est manuel** : seul Vercel connaît la valeur de `CRON_SECRET`, et l'agent ne la lit pas. Les logs que l'agent peut consulter (API runtime logs, offre Hobby) ne contiennent pas de code HTTP et ne remontent qu'une heure ; une réponse `200` silencieuse n'y laisse aucune trace. Le code HTTP d'un appel cron ne se lit que dans l'onglet Logs du tableau de bord Vercel, derrière une authentification interactive.

**Bloquait** : la preuve, en conditions réelles, que les trois routes cron acceptent le vrai secret depuis sa création le 2026-11-24 (entrée archivée du même jour). Ne bloque aucun développement.

**À savoir avant le 2026-11-25 à 02:00 UTC (03:00 à Paris)** : `process-scheduled-publications` tournera pour la première fois avec un secret valide, si le test ci-dessous confirme l'acceptation. Elle publie sur Instagram toutes les publications programmées dont l'heure est passée. Si des publications anciennes sont restées en file, elles partiront toutes ensemble. À vérifier avant cette heure si ce n'est pas voulu.

**Étapes** :

1. Ouvrir https://vercel.com/edifice-ias-projects/edifice-web/settings/cron-jobs.
2. Sur la ligne `/api/internal/cron/calendar-channel-renewal`, cliquer **Run**. En dehors de 5h à Paris, la route ne fait rien et répond `{ ok: true, skipped: true }`. **Ne pas** lancer `process-scheduled-publications`, qui publierait réellement.
3. Ouvrir aussitôt https://vercel.com/edifice-ias-projects/edifice-web/logs, environnement Production, et relever le code HTTP de la requête `/api/internal/cron/calendar-channel-renewal`.

**Vérification** : code **`200`**. Un `401` voudrait dire que Vercel n'envoie pas le secret, ou que la valeur ne correspond pas : vérifier que `CRON_SECRET` existe toujours dans le projet, en Production, et qu'un déploiement a été construit après sa dernière modification. Transmettre le code obtenu à l'agent, pour qu'il le consigne au chantier 2.

**Résultat** — 2026-11-24 : **`200`** sur `/api/internal/cron/calendar-channel-renewal`, appel déclenché par Vercel avec le vrai `CRON_SECRET`, sur le déploiement `dpl_HHRwrtnSNBpwNjfGWttzKvmBQoxE`. Le vrai secret est accepté par le nouveau code, et le refus sans secret reste `401`. Limite : seule cette route a été exercée. Les deux autres partagent le même helper (`isCronRequestAuthorized`) et la même variable, mais n'ont pas été appelées : `process-scheduled-publications` volontairement, puisqu'elle publie.

### 2026-11-24 — Créer `CRON_SECRET` dans les variables de production Vercel, puis redéployer

**Statut** : `done` — 2026-11-24. Variable créée par le mainteneur ; production redéployée par l'agent, sur son accord explicite.

**Pourquoi c'est manuel** : la valeur d'un secret de production ne doit passer ni par l'agent ni par le dépôt. Elle se crée dans le tableau de bord Vercel.

**Constat qui l'a déclenchée** : le 2026-11-24 vers 08:52 UTC, la liste des variables du projet `edifice-web`, lue sans les valeurs (`decrypt: false`), comptait 31 variables, **dont aucune nommée `CRON_SECRET`**, avec `hiddenProductionEnvCount: 0`. Or les trois routes cron refusent tout appel quand `CRON_SECRET` est absent, et Vercel Cron n'envoie l'en-tête `Authorization: Bearer` que si la variable existe. **Conséquence probable : tous les appels de Vercel Cron recevaient `401`.** `process-scheduled-publications` ne publiait donc rien, `calendar-channel-renewal` ne renouvelait pas les canaux, et `personal-daily-brief` ne générait pas de brief. **Ce n'est pas une régression du correctif `3e2047e`** : l'ancien code refusait de la même façon un secret absent. Depuis quand la variable manquait, **non établi** : l'agent n'a pas accès à l'historique des variables. Limite du constat : les variables partagées au niveau de l'équipe Vercel n'apparaissent pas dans cette liste.

**Ce qui a été fait** :

1. Le mainteneur a créé `CRON_SECRET` dans le projet, type `sensitive`, **environnement Production seulement**. Constaté par l'agent, sans lecture de la valeur : présente le 2026-11-24, création vers 08:58 UTC.
2. Le déploiement en ligne (`dpl_HrSL9sLokbvxNDbHzwtJJvaqsUXs`, commit `712ec92`) datait d'avant la variable. L'agent l'a redéployé à l'identique : **`dpl_HHRwrtnSNBpwNjfGWttzKvmBQoxE`**, même commit, `READY`, et il sert `www.edificeia.com` et `edificeia.com`.

**Vérification** : sans secret, les trois routes cron répondent toujours `401` sur `www.edificeia.com` après le redéploiement, constaté par l'agent. **L'acceptation du vrai secret n'est pas encore vérifiée** : voir l'entrée `pending` du même jour.

### 2026-11-22 — Décider de la clôture de l'audit de sécurité

**Statut** : `done` — 2026-11-22. Le porteur du projet a déclaré l'audit **clos au 2026-11-22, sous réserve de l'exception TikTok**. La déclaration complète est au chantier 2 de `suivi-chantiers-edifice.md`.

**Pourquoi c'est manuel** : la clôture n'est pas un constat mais un arbitrage du porteur du projet — aucun document n'a jamais fixé de critère de fin à l'audit (`suivi-chantiers-edifice.md`, chantier 2, point 1). L'agent peut rassembler les faits ; il ne peut pas décider à la place du porteur du projet quel risque résiduel est acceptable.

**Bloquait** : l'étape 1 du chantier 8 — EDIFICE ACADEMY —, et tout nouveau développement fonctionnel ([02-strategie-produit.md](knowledge/Documentation-Strategique/Markdown/02-strategie-produit.md)).

**État des faits au 2026-11-22**, pour décider sur pièces :

- lots 1 à 3 et re-audit du 28 juillet dans `origin/main` ; 87 routes API sur 88 portent un motif de garde, la dernière étant `/api/health`, exception documentée ;
- contrôles SQL en lecture seule du 2026-11-22 : privilèges conformes aux migrations, aucun privilège `anon` ni `PUBLIC`, aucune table sans RLS, écart de décompte du chantier 7 expliqué ;
- seul écart réel trouvé — `pinterest_pins` lisible par tout compte connecté — **corrigé et appliqué** le 2026-11-22 (`20261122100000`), avec les quatre policies non versionnées de `content_drafts`.

**Étapes** — écrire, au chantier 2 de `suivi-chantiers-edifice.md` ou en le dictant à l'agent :

1. **Le critère de clôture retenu.** Par exemple : « aucune route sans garde, aucun privilège client au-delà des migrations, aucune policy ouverte, aucune table sans RLS, constaté en base à la date de clôture ».
2. **Le sort de chaque point résiduel**, accepté avec une raison ou traité avec une échéance :
   - exception de garde de `/api/oauth/tiktok/status` (entrée `pending` du 2026-08-01, dépend de l'état de la review TikTok) ;
   - gardes écrits à la main sur les routes Calendrier, au lieu de `authorizeCockpitApiAccess()` ;
   - `/api/personal` absent de `reviewerBlockedPrefixes` dans le middleware (défense en profondeur) ;
   - les deux limites de vérification du chantier 7 (refus attendu non testé sur cinq tables ; écritures de l'Atelier de contenu non exercées) ;
   - le gating des modes debug, déclaré vérifié le 28 juillet et non re-vérifié depuis.
3. **La déclaration** : audit clos à telle date, ou non clos avec ce qui manque.

**Vérification** : le chantier 2 porte une décision datée, un critère écrit et un sort pour chacun des cinq points. L'étape 1 d'Academy ne démarre qu'ensuite, et sur validation explicite.

### 2026-11-22 — Appliquer la migration 20261122100000

**Statut** : `done` — 2026-11-22, appliquée par le mainteneur dans le SQL Editor, contrôles et test de fumée conformes. La décision de clôture de l'audit, qui figurait en étape 6, est sortie dans sa propre entrée `pending`.

**Pourquoi c'est manuel** : appliquer une migration et lire l'état réel des policies et des privilèges passent par le SQL Editor du dashboard Supabase. L'agent n'a pas d'accès SQL au projet. La décision de clôture est un arbitrage du porteur du projet, pas un constat que l'agent peut prendre seul.

**Bloquait** : la clôture de l'audit de sécurité (chantier 2), donc l'étape 1 du chantier 8 — EDIFICE ACADEMY.

**Ce que fait la migration** : supprime la policy `pinterest_pins_authenticated_select` (`using (true)`) et révoque tout privilège de `anon` et `authenticated` sur `pinterest_pins` ; supprime les quatre policies `{public}` non versionnées de `content_drafts`. **Aucun effet attendu sur l'application** : `pinterest_pins` n'est lue et écrite que par la clé service-role (trois fichiers, vérifiés le 2026-11-22), et les quatre policies de `content_drafts` étaient déjà inatteignables. Détail et retour arrière en commentaire du fichier.

**Étapes** :

1. Ouvrir le SQL Editor du projet Supabase.
2. **Témoin avant**, à garder :
   ```sql
   select tablename, policyname, roles, cmd, qual
   from pg_policies
   where schemaname = 'public' and tablename in ('pinterest_pins', 'content_drafts')
   order by tablename, policyname;
   ```
3. Coller et exécuter le contenu intégral de `supabase/migrations/20261122100000_restrict_pinterest_pins_and_drop_unversioned_content_drafts_policies.sql`.
4. Relancer la requête de l'étape 2, puis celle-ci :
   ```sql
   select c.relname as table_name,
          case when a.grantee = 0 then 'PUBLIC' else a.grantee::regrole::text end as grantee,
          string_agg(a.privilege_type, ', ' order by a.privilege_type) as privileges
   from pg_class c
   join pg_namespace n on n.oid = c.relnamespace
   cross join lateral aclexplode(c.relacl) a
   where n.nspname = 'public'
     and c.relname = 'pinterest_pins'
     and (a.grantee = 0
          or a.grantee in (select oid from pg_roles where rolname in ('anon', 'authenticated')))
   group by 1, 2;
   ```
   *(Correction du 2026-11-22 : la version d'origine de cette entrée omettait `group by 1, 2`, sans lequel `string_agg` à côté de colonnes non agrégées est refusé par Postgres. Le mainteneur a exécuté la version corrigée, transmise dans la conversation.)*
5. **Test de fumée** : ouvrir `/interface/post-creation/pinterest`, vérifier que la bibliothèque d'épingles s'affiche comme avant, puis ouvrir le Publisher Pinterest (`/interface/publishers/pinterest`) en lecture.

**Résultats** — 2026-11-22, exécutés par le mainteneur, transmis tels quels à l'agent :

- **Témoin avant** (étape 2) : 9 lignes, conformes aux contrôles du même jour — les quatre policies `{public}` « Users can create / delete / read / update their own content drafts » et les quatre `content_drafts_*_own` sur `content_drafts`, plus `pinterest_pins_authenticated_select` (`{authenticated}`, `SELECT`, `qual = true`) sur `pinterest_pins`.
- **Migration** (étape 3) : appliquée. Date d'application : 2026-11-22, déclarée par le mainteneur dans la conversation.
- **Contrôle des policies après** (étape 4) : **4 lignes**, exactement `content_drafts_delete_own`, `content_drafts_insert_own`, `content_drafts_select_own`, `content_drafts_update_own`, toutes `{authenticated}`, filtre `user_id = auth.uid()`. Plus aucune policy `{public}` sur `content_drafts`, plus aucune policy sur `pinterest_pins`.
- **Contrôle des privilèges après** (étape 4) : « Success », **aucune ligne** — ni `anon`, ni `authenticated`, ni `PUBLIC` sur `pinterest_pins`.
- **Test de fumée** (étape 5) : `/interface/post-creation/pinterest` et `/interface/publishers/pinterest` **s'affichent sans erreur**. Test fait sur le site déployé ou en local, la migration ne changeant aucun code ; l'environnement exact n'est pas consigné.

**Limite** : le test de fumée a exercé la **lecture** de `pinterest_pins` par la clé service-role, pas l'écriture (génération ou publication d'une épingle). La clé service-role n'étant pas touchée par la migration, l'écriture n'est pas concernée — déduit, non testé.

**Vérification** : à l'étape 4, `content_drafts` ne porte plus que ses quatre policies `content_drafts_*_own`, `pinterest_pins` n'en porte plus aucune, et la requête de privilèges ne renvoie **aucune ligne**. À l'étape 5, aucune erreur. Le résultat de l'étape 4 est à transmettre à l'agent pour qu'il soit consigné ici.

### 2026-11-22 — Contrôles de clôture de l'audit de sécurité (préalable au chantier Academy)

**Statut** : `done` — 2026-11-22, contrôles exécutés par le mainteneur, résultats ci-dessous. **La clôture de l'audit, elle, reste en attente** : voir l'entrée `pending` « Appliquer la migration 20261122100000 ».

**Pourquoi c'est manuel** : les quatre contrôles portent sur l'état réel de la base — policies, privilèges de table, RLS — et ne se lisent que par une requête SQL sur le projet Supabase, depuis le SQL Editor du dashboard. L'agent n'a pas d'accès SQL direct : les variables serveur ne sont pas exposées dans son environnement. Les fichiers de `supabase/migrations` ne prouvent rien sur l'état de la base, qui en a déjà divergé deux fois — policy `content_assets_authenticated_delete` le 2026-07-28, quatre policies `{public}` sur `content_drafts` le 2026-09-28. **Les quatre requêtes sont en lecture seule** : elles ne modifient rien.

**Bloque** : la clôture de l'audit de sécurité (chantier 2 de `suivi-chantiers-edifice.md`), donc le démarrage de tout développement fonctionnel, dont l'étape 1 du chantier 8 — EDIFICE ACADEMY. La clôture demande en plus une décision écrite du porteur du projet ; ces contrôles en sont la base factuelle, pas le substitut.

**Étapes** :

1. Ouvrir le SQL Editor du projet Supabase.
2. **Contenu des policies de `content_drafts`** — les quatre policies `{public}` absentes des migrations :
   ```sql
   select policyname, roles, cmd, permissive, qual, with_check
   from pg_policies
   where schemaname = 'public' and tablename = 'content_drafts'
   order by policyname;
   ```
3. **Toute policy ouverte ou applicable à tous les rôles**, sur tout le schéma :
   ```sql
   select tablename, policyname, roles, cmd, qual, with_check
   from pg_policies
   where schemaname = 'public'
     and ('public' = any(roles) or qual = 'true' or with_check = 'true')
   order by tablename, policyname;
   ```
4. **Privilèges de table accordés à `anon`, `authenticated` et `PUBLIC`**, sur tout le schéma :
   ```sql
   select c.relname as table_name,
          case when a.grantee = 0 then 'PUBLIC' else a.grantee::regrole::text end as grantee,
          string_agg(a.privilege_type, ', ' order by a.privilege_type) as privileges
   from pg_class c
   join pg_namespace n on n.oid = c.relnamespace
   cross join lateral aclexplode(c.relacl) a
   where n.nspname = 'public'
     and c.relkind = 'r'
     and (a.grantee = 0
          or a.grantee in (select oid from pg_roles where rolname in ('anon', 'authenticated')))
   group by 1, 2
   order by 1, 2;
   ```
5. **Tables sans RLS** :
   ```sql
   select c.relname
   from pg_class c
   join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity
   order by 1;
   ```
6. Copier les quatre résultats tels quels dans la conversation avec l'agent, ou les coller sous cette entrée, pour qu'ils soient consignés dans le dépôt. Les résultats bruts restés dans le SQL Editor ne sont pas versionnés, et c'est ce qui laisse aujourd'hui les quatre policies de `content_drafts` sans contenu connu.

**Résultats** — exécutés le 2026-11-22 par le mainteneur dans le SQL Editor, transmis tels quels à l'agent, comparés par l'agent aux migrations du dépôt :

- **Requête 1, `content_drafts`** : huit policies. Les quatre versionnées `content_drafts_{select,insert,update,delete}_own`, `to authenticated`, filtre `user_id = auth.uid()`. Et les quatre non versionnées, `to {public}` — « Users can create / read / update / delete their own content drafts » —, filtre `auth.uid() = user_id` en `qual` ou `with_check` selon la commande. **Pas une fuite** : restreintes au propriétaire, et inatteignables puisque `content_drafts` n'a plus aucun privilège client (requête 3). **Mais aucun fichier du dépôt ne les crée** (recherche du même jour) : ce sont des objets de sécurité qui n'existent qu'en base.
- **Requête 2, policies ouvertes** : les quatre précédentes, et **une seule autre : `pinterest_pins_authenticated_select`, `to authenticated`, `qual = true`**. Versionnée et voulue (`20260605110000_create_pinterest_pins.sql`), mais contraire à `13-securite-gouvernance.md`. Avec le `SELECT` accordé à `authenticated` (requête 3), **tout compte connecté — le compte reviewer compris — peut lire toutes les épingles**, `raw_payload` compris, par l'API REST et la clé anonyme, publique. La table n'a pas de `user_id`. **Seul écart réel trouvé par ces contrôles.**
- **Requête 3, privilèges** : dix-huit lignes, toutes `authenticated`, **chacune identique au dernier `grant` de sa migration** — vérifié table par table. Aucune ligne `anon` ni `PUBLIC`, aucun `TRUNCATE`, `REFERENCES`, `TRIGGER` ni `MAINTAIN`. Les huit tables Personnel ont exactement les valeurs attendues ci-dessous. Les dix autres — `assistant_decision_memory`, `content_assets`, `cost_events`, `pinterest_pins` (`SELECT`), `publication_performance_recommendation_actions`, `publication_performance_snapshots`, `short_video_publications`, `short_video_schedules`, `user_preferences`, `video_render_jobs` — ont `INSERT, SELECT, UPDATE` comme leurs migrations, sauf `pinterest_pins`. Les neuf tables du chantier 7, `oauth_tokens` et les deux journaux d'effacement n'apparaissent pas, comme attendu.
- **Les deux tables non identifiées du chantier 7 sont `project_memory` et `project_memory_audit_log`** : leurs migrations révoquent `anon` et `authenticated` sans rien ré-accorder, d'où leur absence. L'écart de décompte est clos : 25 tables hors chantier 7, dont 18 avec privilèges et 7 sans, toutes expliquées.
- **Requête 4, tables sans RLS** : aucune ligne (« Success. No rows returned »).

**Suite donnée** : migration `20261122100000_restrict_pinterest_pins_and_drop_unversioned_content_drafts_policies.sql`, écrite le même jour — voir l'entrée `pending` correspondante.

**Vérification** — ce qui est attendu, et ce qui demande une explication :

- étape 2 : lire `qual` et `with_check` de chaque policy. Une policy qui ne restreint pas au propriétaire est à supprimer **par migration versionnée**, pas dans le SQL Editor ;
- étape 3 : **aucune ligne attendue hors les quatre policies de `content_drafts`** déjà lues à l'étape 2. Toute autre ligne est un objet à expliquer ;
- étape 4 : `anon` et `PUBLIC` ne doivent apparaître **nulle part**. Pour `authenticated`, chaque ligne doit correspondre **exactement** au dernier `grant` de la migration de la table — ni plus, ni moins. Valeurs attendues d'après les migrations, pour les huit tables du pôle Personnel lues par le client de session :
  - `personal_notes`, `personal_journal_entries`, `personal_habits`, `personal_tasks`, `personal_goals` : `INSERT, SELECT, UPDATE` ;
  - `personal_habit_completions`, `personal_journal_entry_categories` : `DELETE, INSERT, SELECT` ;
  - `personal_journal_categories` : `DELETE, INSERT, SELECT, UPDATE` ;
  - les neuf tables du chantier 7, `oauth_tokens`, `personal_data_erasure_log` et `personal_item_erasure_log` : **aucune ligne**.

  Toute ligne qui porte `TRUNCATE`, `REFERENCES`, `TRIGGER` ou `MAINTAIN`, ou qui dépasse le `grant` de sa migration, est le défaut des chantiers 6 et 7. C'est ce contrôle qui identifie les deux tables non expliquées de la revue de moindre privilège du chantier 7 ;
- étape 5 : **aucune ligne attendue**.

Une fois les résultats consignés et expliqués, la clôture reste une **décision écrite du porteur du projet**, à inscrire au chantier 2 : critère de clôture retenu, sort du résiduel connu (exception TikTok, gardes Calendrier écrits à la main, `/api/personal` absent de `reviewerBlockedPrefixes`, limites de vérification du chantier 7).

### 2026-09-28 — Appliquer la migration de révocation des privilèges sur neuf tables service-role

**Statut** : `done` — compte rendu du 2026-10-04

**Date d'application : non établie avec certitude, et cette entrée refuse de la fixer.** Aucune commande disponible depuis cette machine ne peut la lire : un `revoke` exécuté dans le SQL Editor ne laisse aucun horodatage dans `pg_class`, et Supabase n'enregistre pas ce que le SQL Editor exécute dans le registre des migrations. Bornes vérifiées par commande : **après** le 2026-09-29, jour où cette entrée a été affichée pour exécution (horodatage de la conversation), et **au plus tard le 2026-10-04**, jour du compte rendu. Le commit de la migration, `be07b02`, date du 2026-09-29 à 10:15 (`git log`) — c'est le jour de son écriture, pas de son application. À remplacer par la date exacte si elle est retrouvée dans l'historique des requêtes du SQL Editor.

**Résultat** — relevé en base par le mainteneur, compte rendu du 2026-10-04 ; l'agent n'a pas exécuté ces requêtes et ne les a pas rejouées :

- **étape 3** : les neuf tables sont présentes ;
- **étape 7** : plus aucun privilège pour `anon`, `authenticated` ni `PUBLIC` sur les neuf tables ;
- **étape 8** : `postgres` et `service_role` intacts sur les neuf ;
- **étape 9** : aucun privilège de colonne ;
- **étape 10** : les neuf empreintes de policies sont identiques avant et après — RLS et policies inchangées ;
- **étape 12** : aucun résidu `[TEST-ACL]` ;
- **test de fumée** : carte « Agenda du jour » sans erreur ; Atelier de contenu en lecture sans erreur ; cycle complet projet, objectif, action puis suppressions sur Trajectoire avec `test-erase@edificeia.com`. Ce dernier exerce `select`, `insert`, `update` et `delete` sur les trois tables `trajectoire_*`, dont le `delete` à nom de table dynamique.

**Deux limites, qui ne sont pas des échecs** :

1. **L'effet de bord sur cinq tables n'a pas été testé.** `content_assets`, `video_render_jobs`, `short_video_schedules`, `short_video_publications` et `publication_performance_snapshots` ont des policies dont une sous-requête lit `content_drafts` (et `content_draft_asset_links` pour la première). Leur échec attendu en « permission denied » pour un appelant `authenticated` reste **déduit du fonctionnement des policies**. Aucun code du dépôt n'émet cette requête ; aucun test ne l'a confirmée ni infirmée.
2. **Les écritures de l'Atelier de contenu n'ont pas été exercées par le test de fumée** — comme l'étape 11b le prévoyait : créer un brouillon demande de générer du contenu avec son coût, en supprimer un détruit du contenu réel. Elles sont couvertes par un seul indice indirect : le témoin de l'étape 8 montre que `service_role` a gardé ses privilèges. Aucune écriture sur `content_drafts` ni sur les trois tables liées n'a été observée après la révocation.

**Fichier** : `supabase/migrations/20260928100000_revoke_client_privileges_on_service_role_only_tables.sql`

**Pourquoi c'est manuel** : nécessite un clic dans le SQL Editor Supabase, pas d'accès API direct pour ce type d'opération. Aucun CLI Supabase authentifié n'est configuré sur cette machine, et la clé service-role ne permet pas d'exécuter du DDL par l'API REST.

**Bloque** : rien de fonctionnel. C'est un durcissement : tant qu'elle n'est pas appliquée, `authenticated` garde en base les privilèges que les migrations d'origine lui ont accordés, et pour les tables créées avant le 2026-08-30, ceux du défaut de schéma en plus.

**À lire avant d'exécuter** :

1. **La migration ne re-grante rien**, contrairement au chantier 6. Ces neuf tables ne sont accédées que par des clients service-role — vérifié par lecture du code le 2026-09-28, noms de table dynamiques compris. La clé service-role n'est pas affectée : elle contourne RLS et garde ses propres privilèges. Le test de fumée ci-dessous existe pour prendre en défaut cette lecture du code.
2. **Effet de bord à connaître.** Cinq autres tables — `content_assets`, `video_render_jobs`, `short_video_schedules`, `short_video_publications`, `publication_performance_snapshots` — ont des policies `to authenticated` dont une sous-requête lit `content_drafts` (et `content_draft_asset_links` pour `content_assets`). Après la révocation, une requête `authenticated` sur ces cinq tables échouera en « permission denied for table content_drafts » au lieu de renvoyer des lignes filtrées. Aucun code du dépôt n'émet cette requête, et l'échec est fermé. Non testé : déduit du fonctionnement des policies.
3. **Retour arrière** : le script de re-grant est en commentaire à la fin du fichier de migration, non appliqué. Il restaure `select, insert, update, delete` à `authenticated`, pas `TRUNCATE`, `REFERENCES`, `TRIGGER` ni `MAINTAIN`, voulu.
4. **Compte de test** : les écritures du test de fumée se font sur `test-erase@edificeia.com`. Le compte `contact.edificeia@gmail.com` n'est jamais touché.

**Étapes** :

1. Ouvrir <https://supabase.com/dashboard>, sélectionner le projet de L'Édifice, puis « SQL Editor » dans la barre latérale.
2. Cliquer « New query ».
3. **Avant-état, existence des neuf tables** — sans quoi un résultat vide plus bas ne prouverait rien :

`2026-09-28_0_existence_neuf_tables`

```sql
select count(*) as tables_trouvees
from pg_class
where relnamespace = 'public'::regnamespace
  and relname in (
    'personal_calendar_events', 'personal_calendar_sync_state',
    'content_drafts', 'content_draft_asset_links',
    'content_draft_media_plans', 'content_draft_visual_scenes',
    'trajectoire_projects', 'trajectoire_objectives', 'trajectoire_actions'
  );
```

Attendu : `9`. Sinon, ne pas continuer.

4. **Avant-état, grants** — sert de référence, pas de valeur attendue. Conserver le résultat (capture ou copie) :

`2026-09-28_1_avant_grants_neuf_tables`

```sql
select c.relname as table_name,
       case a.grantee when 0 then 'PUBLIC' else pg_get_userbyid(a.grantee) end as grantee,
       string_agg(a.privilege_type, ', ' order by a.privilege_type) as privileges
from pg_class c
cross join lateral aclexplode(c.relacl) a
where c.relnamespace = 'public'::regnamespace
  and c.relname in (
    'personal_calendar_events', 'personal_calendar_sync_state',
    'content_drafts', 'content_draft_asset_links',
    'content_draft_media_plans', 'content_draft_visual_scenes',
    'trajectoire_projects', 'trajectoire_objectives', 'trajectoire_actions'
  )
  and (a.grantee = 0 or pg_get_userbyid(a.grantee) in ('anon', 'authenticated'))
group by 1, 2
order by 1, 2;
```

5. **Avant-état, RLS et policies** — l'empreinte permet de comparer avant et après sans relire chaque policy. Conserver le résultat :

`2026-09-28_2_avant_rls_policies_neuf_tables`

```sql
select c.relname as table_name,
       c.relrowsecurity as rls_enabled,
       c.relforcerowsecurity as rls_forced,
       count(p.policyname) as policies,
       md5(coalesce(string_agg(
         p.policyname || '|' || p.cmd || '|' || p.roles::text || '|'
           || coalesce(p.qual, '') || '|' || coalesce(p.with_check, ''),
         E'\n' order by p.policyname), '')) as policies_fingerprint
from pg_class c
left join pg_policies p
  on p.schemaname = 'public' and p.tablename = c.relname
where c.relnamespace = 'public'::regnamespace
  and c.relname in (
    'personal_calendar_events', 'personal_calendar_sync_state',
    'content_drafts', 'content_draft_asset_links',
    'content_draft_media_plans', 'content_draft_visual_scenes',
    'trajectoire_projects', 'trajectoire_objectives', 'trajectoire_actions'
  )
group by c.relname, c.relrowsecurity, c.relforcerowsecurity
order by 1;
```

Attendu : neuf lignes, `rls_enabled` à `true` sur chacune. Le nombre de policies est **noté, pas jugé** : les migrations en écrivent quatre par table, et `content_drafts` en porte davantage en base (voir le chantier 7 de `suivi-chantiers-edifice.md`).

6. Cliquer « New query », coller le contenu intégral de `20260928100000_revoke_client_privileges_on_service_role_only_tables.sql`, cliquer « Run ». Le fichier est dans une transaction et idempotent : le relancer ne casse rien.

7. **Après application, grants** — la même requête que l'étape 4, sous un nouveau nom :

`2026-09-28_3_apres_grants_neuf_tables`

```sql
select c.relname as table_name,
       case a.grantee when 0 then 'PUBLIC' else pg_get_userbyid(a.grantee) end as grantee,
       string_agg(a.privilege_type, ', ' order by a.privilege_type) as privileges
from pg_class c
cross join lateral aclexplode(c.relacl) a
where c.relnamespace = 'public'::regnamespace
  and c.relname in (
    'personal_calendar_events', 'personal_calendar_sync_state',
    'content_drafts', 'content_draft_asset_links',
    'content_draft_media_plans', 'content_draft_visual_scenes',
    'trajectoire_projects', 'trajectoire_objectives', 'trajectoire_actions'
  )
  and (a.grantee = 0 or pg_get_userbyid(a.grantee) in ('anon', 'authenticated'))
group by 1, 2
order by 1, 2;
```

Attendu : **zéro ligne**. Aucune ligne pour `anon`, `authenticated` ni `PUBLIC` sur les neuf tables. Une seule ligne est un échec, même si elle paraît inoffensive. Ne pas continuer, et **ne pas lancer le retour arrière** avant d'avoir compris : une ligne restante peut venir d'un troisième `ALTER DEFAULT PRIVILEGES` ou d'un grant posé hors des migrations.

8. **Témoin** — un résultat vide à l'étape 7 doit venir de la révocation, pas d'une requête cassée. Les autres rôles doivent avoir gardé leurs privilèges :

`2026-09-28_4_apres_temoin_autres_roles`

```sql
select c.relname as table_name,
       pg_get_userbyid(a.grantee) as grantee,
       string_agg(a.privilege_type, ', ' order by a.privilege_type) as privileges
from pg_class c
cross join lateral aclexplode(c.relacl) a
where c.relnamespace = 'public'::regnamespace
  and c.relname in (
    'personal_calendar_events', 'personal_calendar_sync_state',
    'content_drafts', 'content_draft_asset_links',
    'content_draft_media_plans', 'content_draft_visual_scenes',
    'trajectoire_projects', 'trajectoire_objectives', 'trajectoire_actions'
  )
  and a.grantee <> 0
  and pg_get_userbyid(a.grantee) not in ('anon', 'authenticated')
group by 1, 2
order by 1, 2;
```

Attendu : sur **chacune des neuf tables**, au moins `postgres` et `service_role`. Toute autre ligne (`supabase_admin`, par exemple) est à lire et à noter, pas à traiter comme une erreur : la migration ne les touche pas.

9. **Après application, privilèges de colonne** — `revoke all on table` ne retire pas un grant posé au niveau d'une colonne :

`2026-09-28_5_apres_acl_colonnes`

```sql
select c.relname as table_name, a.attname as column_name, a.attacl
from pg_attribute a
join pg_class c on c.oid = a.attrelid
where c.relnamespace = 'public'::regnamespace
  and c.relname in (
    'personal_calendar_events', 'personal_calendar_sync_state',
    'content_drafts', 'content_draft_asset_links',
    'content_draft_media_plans', 'content_draft_visual_scenes',
    'trajectoire_projects', 'trajectoire_objectives', 'trajectoire_actions'
  )
  and a.attnum > 0
  and not a.attisdropped
  and a.attacl is not null
order by 1, 2;
```

Attendu : **zéro ligne**.

10. **Après application, RLS et policies inchangées** — la requête de l'étape 5, sous un nouveau nom :

`2026-09-28_6_apres_rls_policies_neuf_tables`

```sql
select c.relname as table_name,
       c.relrowsecurity as rls_enabled,
       c.relforcerowsecurity as rls_forced,
       count(p.policyname) as policies,
       md5(coalesce(string_agg(
         p.policyname || '|' || p.cmd || '|' || p.roles::text || '|'
           || coalesce(p.qual, '') || '|' || coalesce(p.with_check, ''),
         E'\n' order by p.policyname), '')) as policies_fingerprint
from pg_class c
left join pg_policies p
  on p.schemaname = 'public' and p.tablename = c.relname
where c.relnamespace = 'public'::regnamespace
  and c.relname in (
    'personal_calendar_events', 'personal_calendar_sync_state',
    'content_drafts', 'content_draft_asset_links',
    'content_draft_media_plans', 'content_draft_visual_scenes',
    'trajectoire_projects', 'trajectoire_objectives', 'trajectoire_actions'
  )
group by c.relname, c.relrowsecurity, c.relforcerowsecurity
order by 1;
```

Attendu : **identique à l'étape 5, ligne à ligne** — mêmes `rls_enabled`, même nombre de policies, même `policies_fingerprint` sur les neuf tables. La migration ne touche ni RLS ni les policies : la moindre différence est un échec.

11. **Test de fumée**, dans cet ordre. Il sert à prendre en défaut la lecture du code qui a justifié de ne rien re-granter : un écran qui casse désigne un chemin que la recherche n'a pas vu.

**11a. Calendrier** — avec le compte habituel, lecture seule. Ouvrir `/interface/personnel`, carte « Agenda du jour ». Attendu : la carte affiche ses événements ou son état vide, **sans message « Lecture personal_calendar_events impossible »** ni erreur. Puis ouvrir `/api/oauth/calendar/status` dans le navigateur, connecté : réponse `200`.

**11b. Atelier de contenu** — avec le compte habituel, lecture seule : ouvrir `/interface/post-creation`. Attendu : la liste des brouillons se charge sans bandeau d'erreur. Ouvrir un brouillon existant, puis `/interface/post-creation/shorts/visuals` : les scènes et le plan média se chargent. **Aucune écriture n'est testée ici** : en créer une demanderait de générer du contenu, avec son coût, et supprimer un brouillon détruirait du contenu réel. Les écritures passent par la clé service-role, dont le témoin de l'étape 8 vérifie qu'elle a gardé ses privilèges.

**11c. Trajectoire** — avec `test-erase@edificeia.com`, jamais avec `contact.edificeia@gmail.com`. Ouvrir `/interface/trajectoire`. Attendu : la page se charge sans erreur. Puis, dans l'ordre : « Ajouter un projet » nommé `[TEST-ACL] projet`, « Ajouter un objectif » `[TEST-ACL] objectif` sous ce projet, « Ajouter une action » `[TEST-ACL] action` sous cet objectif ; modifier le statut de l'action ; puis « Supprimer » l'action, l'objectif, le projet, en confirmant à chaque fois. Attendu : chaque geste réussit sans message d'erreur, et la page revient à son état initial. Cela couvre `select`, `insert`, `update` et `delete` sur les trois tables `trajectoire_*`, dont le `delete` qui passe par un nom de table dynamique.

12. **Résidu** — contre-vérification du test de fumée :

`2026-09-28_7_residus_trajectoire`

```sql
select
  (select count(*) from public.trajectoire_projects where title like '[TEST-ACL]%') as projets,
  (select count(*) from public.trajectoire_objectives where title like '[TEST-ACL]%') as objectifs,
  (select count(*) from public.trajectoire_actions where title like '[TEST-ACL]%') as actions;
```

Attendu : `0`, `0`, `0`.

**Vérification** : les étapes 3, 7, 8, 9, 10 et 12 renvoient exactement les valeurs attendues, et le test de fumée n'a affiché aucune erreur. Si une page casse, **relever d'abord la route et le message**, retrouver le fichier qui utilise un client de session ou navigateur sur ces tables, puis seulement envisager le retour arrière. Le compte `contact.edificeia@gmail.com` n'est jamais touché en écriture.

### 2026-09-17 — Appliquer la migration « module Objectifs »

**Statut** : `done` — 2026-09-18

**Résultat** : migration appliquée dans le SQL Editor et vérifiée par les huit étapes ci-dessous. RLS active. Grants exacts : `INSERT`, `SELECT`, `UPDATE` pour `authenticated` seul, aucune ligne pour `anon` ni `PUBLIC`, aucun `DELETE`, `TRUNCATE` ni `MAINTAIN`. Trois policies alignées sur ces trois verbes, aucune `DELETE`. Six contraintes présentes. Les quatre tests de comportement conformes : cible égale au départ, statut inconnu et unité vide refusés, cas valide accepté avec `start_value` à `0.000` — et **l'arrondi silencieux confirmé, `80.12345` enregistré en `80.123`**. Aucun résidu.

**Réserve levée** : la lisibilité du `returning` de l'étape 7e dans le SQL Editor était incertaine à la rédaction. Les valeurs ont bien été lues ; l'étape est donc conservée telle quelle.

**Fichier** : `supabase/migrations/20260917100000_create_personal_goals.sql`

**Pourquoi c'est manuel** : nécessite un clic dans le SQL Editor Supabase, pas d'accès API direct pour ce type d'opération. Aucun CLI Supabase authentifié n'est configuré sur cette machine, et la clé service-role ne permet pas d'exécuter du DDL par l'API REST.

**Bloque** : le checkpoint 2 du module Objectifs (store et routes), qui ne doit pas être **déployé** avant que la table existe. Rien de ce qui est déjà en production n'en dépend : aucun code du dépôt ne référence `personal_goals` à la date de cette entrée, et les deux gestes de suppression physique ne la connaîtront qu'au checkpoint 4.

**À lire avant d'exécuter** — ce qui distingue cette table du patron du pôle, et ce qui n'en diffère pas :

1. **Aucun écart sur les droits.** `SELECT`, `INSERT`, `UPDATE` à `authenticated`, **pas de `DELETE`**, rien à `anon` ; trois policies scopées au propriétaire. La migration révoque `from anon, authenticated` avant le `grant`, pour neutraliser le défaut de schéma posé par `supabase_admin`.
2. **Valeurs en `numeric(15,3)`.** Au-delà de trois décimales, Postgres **arrondit sans erreur** : le test 7e le montre. C'est au parser applicatif, au checkpoint 2, de refuser plus de trois décimales.
3. **`current_value` n'a pas de défaut en base** : une colonne ne peut pas prendre par défaut la valeur d'une autre. Un `insert` qui l'omet échoue en `23502`, ce qui est voulu ; l'application la fixera à `start_value`.

**Étapes** :

1. Ouvrir <https://supabase.com/dashboard>, sélectionner le projet de L'Édifice, puis « SQL Editor » dans la barre latérale.
2. Cliquer « New query ».
3. Coller le contenu intégral de `20260917100000_create_personal_goals.sql`, cliquer « Run ». Le fichier est idempotent (`if not exists`, `drop policy if exists`, `drop trigger if exists`, `create or replace function`) : le relancer ne casse rien.
4. Vérifier que **RLS est activée** — sans cela les policies ne s'appliquent pas :

```sql
select relname, relrowsecurity
from pg_class
where relname = 'personal_goals'
  and relnamespace = 'public'::regnamespace;
```

Attendu : une ligne, `relrowsecurity` à `true`.

5. Vérifier les **grants**, lus dans l'ACL brute par `aclexplode` — `information_schema.role_table_grants` n'affiche pas `MAINTAIN`, privilège de PostgreSQL 17. Ce contrôle n'est pas optionnel : c'est lui qui a révélé le défaut du 2026-08-24.

```sql
select case a.grantee when 0 then 'PUBLIC' else pg_get_userbyid(a.grantee) end as grantee,
       a.privilege_type
from pg_class c
cross join lateral aclexplode(c.relacl) a
where c.relnamespace = 'public'::regnamespace
  and c.relname = 'personal_goals'
  and (a.grantee = 0 or pg_get_userbyid(a.grantee) in ('anon', 'authenticated'))
order by 1, 2;
```

Attendu, **exactement 3 lignes**, et rien d'autre :

- `authenticated` → `INSERT`, `SELECT`, `UPDATE`
- **aucune ligne pour `anon` ni pour `PUBLIC`**, et **aucun `DELETE`, `TRUNCATE`, `REFERENCES`, `TRIGGER` ni `MAINTAIN`**

6. Vérifier que les policies correspondent exactement aux verbes accordés :

```sql
select policyname, cmd, roles
from pg_policies
where schemaname = 'public'
  and tablename = 'personal_goals'
order by cmd;
```

Attendu, **exactement 3 lignes** : `personal_goals_insert_own` (`INSERT`), `personal_goals_select_own` (`SELECT`), `personal_goals_update_own` (`UPDATE`), chacune pour `{authenticated}`. **Aucune policy `DELETE`.**

7. Vérifier les **contraintes**, en structure puis en comportement.

**7a, structure** :

```sql
select conname, pg_get_constraintdef(oid) as definition
from pg_constraint
where conrelid = 'public.personal_goals'::regclass
  and contype = 'c'
order by conname;
```

Attendu, **exactement 6 lignes** : `personal_goals_status_known`, `personal_goals_target_differs_from_start`, `personal_goals_title_max_length`, `personal_goals_title_not_blank`, `personal_goals_unit_label_max_length`, `personal_goals_unit_label_not_blank`.

**7b à 7e, comportement** — sur le compte de test uniquement, chaque bloc dans sa propre transaction annulée, puisqu'une erreur rend la transaction inutilisable. **Vérifier d'abord que `test-erase@edificeia.com` existe** : sinon les `insert … select` ne visent aucune ligne et passent sans erreur, ce qui ne prouve rien.

```sql
select id from auth.users where email = 'test-erase@edificeia.com';
```

Attendu : une ligne.

**7b, cible égale au départ** :

```sql
begin;
insert into public.personal_goals (user_id, title, start_value, target_value, current_value)
select id, 'Controle cible', 10, 10, 10 from auth.users where email = 'test-erase@edificeia.com';
rollback;
```

Attendu : échec `23514`, contrainte `personal_goals_target_differs_from_start`.

**7c, statut inconnu** :

```sql
begin;
insert into public.personal_goals (user_id, title, target_value, current_value, status)
select id, 'Controle statut', 100, 0, 'abandoned' from auth.users where email = 'test-erase@edificeia.com';
rollback;
```

Attendu : échec `23514`, contrainte `personal_goals_status_known`.

**7d, unité vide** :

```sql
begin;
insert into public.personal_goals (user_id, title, target_value, current_value, unit_label)
select id, 'Controle unite', 100, 0, '   ' from auth.users where email = 'test-erase@edificeia.com';
rollback;
```

Attendu : échec `23514`, contrainte `personal_goals_unit_label_not_blank`.

**7e, cas valide, défaut du départ et arrondi** :

```sql
begin;
insert into public.personal_goals (user_id, title, target_value, current_value)
select id, 'Controle valide', 80.12345, 0 from auth.users where email = 'test-erase@edificeia.com'
returning start_value, target_value, current_value, status, unit_label, due_on, deleted_at;
rollback;
```

Attendu : une ligne, `start_value` = `0.000`, `target_value` = **`80.123`** (arrondi silencieux, point 2 ci-dessus), `current_value` = `0.000`, `status` = `active`, et `unit_label`, `due_on`, `deleted_at` à `null`.

8. **Résidu** — contre-vérification :

```sql
select count(*) as residus
from public.personal_goals
where title like 'Controle %';
```

Attendu : `0`.

**Vérification** : les étapes 4 à 8 renvoient exactement les valeurs attendues. Toute ligne de grant en plus des trois attendues est un échec, même si elle paraît inoffensive. Le compte `contact.edificeia@gmail.com` n'est jamais touché.

### 2026-09-14 — Appliquer les clés étrangères composites de la liaison des catégories de Journal

**Statut** : `done` — 2026-09-15

**Résultat** : migration appliquée dans le SQL Editor le 2026-09-15, jour même de son commit (`1bbd602`), et vérifiée en suivant les sept étapes ci-dessous. Noms des clés conformes avant application. Après : deux clés composites à deux colonnes, `personal_journal_entry_categories_entry_fk` en `cascade` et `personal_journal_entry_categories_category_fk` en `restrict`, la clé `user_id` vers `auth.users` inchangée, et aucune clé à une colonne vers les entrées ni vers les catégories. Cibles `unique (id, user_id)` présentes sur les deux tables parentes. Test de comportement concluant : `A : accepte ; B : refuse (23503) ; C : refuse (23503)`. Aucun résidu. **La faille d'isolation entre comptes est fermée en base**, avant qu'aucune liaison n'ait existé.

**Fichier** : `supabase/migrations/20260914100000_journal_categories_composite_fk.sql`

**Pourquoi c'est manuel** : nécessite un clic dans le SQL Editor Supabase, pas d'accès API direct pour ce type d'opération. Aucun CLI Supabase authentifié n'est configuré sur cette machine, et la clé service-role ne permet pas d'exécuter du DDL par l'API REST.

**Bloque** : toute création de liaison entre une entrée de journal et une catégorie. Les routes du checkpoint suivant, qui en créeront, ne doivent pas être exposées en production avant que cette migration soit appliquée.

**Ce que corrige cette migration, à lire avant d'exécuter** : les deux clés étrangères de `personal_journal_entry_categories` étaient simples. Or Postgres vérifie une clé étrangère **sans appliquer RLS**. Un utilisateur connaissant l'UUID d'une catégorie d'un autre compte pouvait donc y lier sa propre entrée — et bloquer ainsi, par le `restrict`, la suppression de cette catégorie par son propriétaire, avec une erreur 500 que son contrôle applicatif n'aurait pas vu venir. Les clés deviennent composites, sur `(id, user_id)`, patron repris d'Habitudes. **Les règles de suppression ne changent pas** — `restrict` vers les catégories, `cascade` vers les entrées — ni aucun grant, ni aucune policy. La table de liaison est vide : rien n'est revalidé.

**Étapes** :

1. Ouvrir <https://supabase.com/dashboard>, sélectionner le projet de L'Édifice, puis « SQL Editor » dans la barre latérale.

2. **Contrôle préalable — noms des clés actuelles.** La migration retire les deux clés simples par leur nom par défaut. Si les noms diffèrent, elle ne les retirerait pas :

```sql
select conname,
       confrelid::regclass as vers,
       confdeltype,
       array_length(conkey, 1) as nb_colonnes
from pg_constraint
where conrelid = 'public.personal_journal_entry_categories'::regclass
  and contype = 'f'
order by conname;
```

Attendu, **trois lignes exactement** :

- `personal_journal_entry_categories_category_id_fkey` → `personal_journal_categories`, `r`, 1
- `personal_journal_entry_categories_entry_id_fkey` → `personal_journal_entries`, `c`, 1
- `personal_journal_entry_categories_user_id_fkey` → `auth.users`, `c`, 1

**Si l'un des deux premiers noms diffère, ne pas exécuter** : le signaler, la migration sera corrigée d'abord.

3. Nouvelle requête, coller le contenu intégral de `20260914100000_journal_categories_composite_fk.sql`, cliquer « Run ». Le fichier est idempotent — ajouts gardés par un test d'existence, retraits en `if exists` — et tient dans une transaction : il n'existe aucun instant où la liaison serait sans clé étrangère.

4. **Contrôle après application — les clés.** Relancer la requête de l'étape 2.

Attendu, **trois lignes exactement** :

- `personal_journal_entry_categories_category_fk` → `personal_journal_categories`, `r`, **2**
- `personal_journal_entry_categories_entry_fk` → `personal_journal_entries`, `c`, **2**
- `personal_journal_entry_categories_user_id_fkey` → `auth.users`, `c`, 1

**Aucune clé à une colonne vers `personal_journal_categories` ni vers `personal_journal_entries` ne doit subsister.** Si l'une reste, la faille n'est pas fermée : la clé simple continuerait d'accepter une catégorie d'un autre compte.

5. **Contrôle après application — les cibles uniques** :

```sql
select conrelid::regclass as table_name, conname, pg_get_constraintdef(oid) as definition
from pg_constraint
where conname in ('personal_journal_entries_id_user_id_key',
                  'personal_journal_categories_id_user_id_key')
order by 1;
```

Attendu : deux lignes, chacune avec `UNIQUE (id, user_id)`.

6. **Contrôle de comportement — dans un bloc entièrement annulé.** Il crée, sans rien conserver, une catégorie pour `reviewer@edificeia.com`, une catégorie et une entrée pour `test-erase@edificeia.com`, puis tente trois liaisons. Le compte `contact.edificeia@gmail.com` n'est jamais touché.

```sql
do $$
declare
  v_reviewer uuid;
  v_test uuid;
  v_cat_reviewer uuid;
  v_cat_test uuid;
  v_entry_test uuid;
  v_cas_b text := 'ECHEC';
  v_cas_c text := 'ECHEC';
begin
  select id into v_reviewer from auth.users where email = 'reviewer@edificeia.com';
  select id into v_test from auth.users where email = 'test-erase@edificeia.com';
  if v_reviewer is null or v_test is null then
    raise exception 'CONTROLE NUL : un des deux comptes est absent, le test ne prouverait rien';
  end if;

  insert into public.personal_journal_categories (user_id, name)
    values (v_reviewer, 'Controle isolation') returning id into v_cat_reviewer;
  insert into public.personal_journal_categories (user_id, name)
    values (v_test, 'Controle isolation') returning id into v_cat_test;
  insert into public.personal_journal_entries (user_id, content)
    values (v_test, 'Controle isolation') returning id into v_entry_test;

  -- Cas A, temoin : entree et categorie du meme compte. Doit PASSER, sinon le
  -- test echouerait pour une autre raison que la cle composite.
  insert into public.personal_journal_entry_categories (entry_id, category_id, user_id)
    values (v_entry_test, v_cat_test, v_test);

  -- Cas B : categorie d'un autre compte. Doit ECHOUER sur la cle categorie.
  begin
    insert into public.personal_journal_entry_categories (entry_id, category_id, user_id)
      values (v_entry_test, v_cat_reviewer, v_test);
  exception when foreign_key_violation then
    v_cas_b := 'refuse (23503)';
  end;

  -- Cas C : liaison qui se declare d'un autre compte que l'entree. Doit
  -- ECHOUER sur la cle entree.
  begin
    insert into public.personal_journal_entry_categories (entry_id, category_id, user_id)
      values (v_entry_test, v_cat_reviewer, v_reviewer);
  exception when foreign_key_violation then
    v_cas_c := 'refuse (23503)';
  end;

  -- Annulation volontaire de TOUT le bloc. Le resultat est porte par le message
  -- d'erreur, parce que le SQL Editor n'affiche pas toujours les NOTICE.
  raise exception 'ANNULATION VOLONTAIRE, rien n''est conserve — A : accepte ; B : % ; C : %',
    v_cas_b, v_cas_c;
end $$;
```

Attendu : le bloc se termine **en erreur, et c'est voulu**, avec le message :

```text
ANNULATION VOLONTAIRE, rien n'est conserve — A : accepte ; B : refuse (23503) ; C : refuse (23503)
```

Tout autre message est un échec. `B : ECHEC` ou `C : ECHEC` signifie qu'un lien inter-comptes a été accepté : la faille reste ouverte. Une erreur dès le cas A signifie que le témoin lui-même ne passe pas.

7. **Contre-vérification** — rien n'a subsisté :

```sql
select
  (select count(*) from public.personal_journal_categories where name = 'Controle isolation') as categories,
  (select count(*) from public.personal_journal_entries where content = 'Controle isolation') as entrees;
```

Attendu : `0` et `0`.

**Vérification** : les étapes 4 à 7 renvoient exactement les valeurs attendues. Grants, RLS et policies ne sont pas touchés par cette migration : les contrôles de l'entrée du 2026-09-09 restent valables sans être rejoués.

### 2026-09-09 — Appliquer les deux migrations « catégories de Journal »

**Statut** : `done` — 2026-09-10

**Résultat** : les deux migrations ont été appliquées dans le SQL Editor le 2026-09-10, dans l'ordre, **avant tout push de `3b36515`**. L'ordre impératif décrit plus bas a donc été tenu : les gestes de suppression physique de Journal n'ont jamais été exposés en production à l'erreur `PGRST205`. Contrôles 5 à 9 validés avec les requêtes révisées : 7 lignes de grants exactes lues par `aclexplode`, aucune pour `anon` ; RLS active sur les deux tables ; 7 policies alignées ligne à ligne sur les grants ; `23505` déclenché par le test de casse, aucun résidu.

**Correction de compte, relevée à la clôture** : le point 1 de « À lire avant d'exécuter » présente `personal_journal_categories` comme la « seconde exception » du pôle sur `DELETE`. C'est faux d'une unité — la table de liaison `personal_journal_entry_categories` accorde elle aussi `DELETE`, et le contrôle 6 l'a montré. **Trois** tables du pôle accordent `DELETE` à `authenticated`. `05_Database.md` porte le compte juste ; le commentaire de la migration `20260909100000`, déjà appliquée, n'est pas modifié, pour ne pas désaligner le fichier du dépôt de ce qui a tourné en base.

**Fichiers** :

- `supabase/migrations/20260909100000_create_personal_journal_categories.sql`
- `supabase/migrations/20260909110000_create_personal_journal_entry_categories.sql`

**Pourquoi c'est manuel** : nécessite un clic dans le SQL Editor Supabase, pas d'accès API direct pour ce type d'opération. Aucun CLI Supabase authentifié n'est configuré sur cette machine, et la clé service-role ne permet pas d'exécuter du DDL par l'API REST.

**Bloque** : tout le chantier « catégories de Journal », et l'amorçage des dix catégories décrit dans l'entrée suivante.

**ORDRE IMPÉRATIF — appliquer ces deux migrations AVANT de déployer le commit qui les accompagne.** Ce commit déclare déjà `personal_journal_entry_categories` comme table dépendante de Journal dans `lib/server/personal/data-erasure-store.ts`. Tant que la table n'existe pas en base, les **deux gestes de suppression physique de Journal** — « Vider l'historique » et la suppression d'une entrée archivée — échouent en `500`. Vérifié : PostgREST répond `PGRST205 / Could not find the table 'public.personal_journal_entry_categories' in the schema cache`, et `deleteOwnedRows` transforme cette erreur en exception. Aucune donnée n'est perdue, mais le geste est indisponible. La fenêtre inverse — des liaisons orphelines — est nulle aujourd'hui, la table de liaison étant vide tant qu'aucune interface ne crée de lien.

**À lire avant d'exécuter — deux écarts au patron du pôle, tous deux délibérés** :

1. `personal_journal_categories` **accorde `DELETE` à `authenticated`**, avec une policy scopée au propriétaire. C'est la **seconde exception** du pôle après `personal_habit_completions`. Une catégorie est une étiquette, pas du contenu ; la protection contre la perte est la règle de blocage, pas une corbeille.
2. Ces deux tables **n'ont pas de `deleted_at`**. Le soft delete du pôle protège du contenu ; il n'y en a pas ici.

**Conséquence, déjà traitée dans le commit qui accompagne ces migrations** : Journal devient le **deuxième module du pôle à porter une table dépendante**, après Habitudes. `lib/server/personal/data-erasure-store.ts` déclare donc désormais `journal.dependents` avec `personal_journal_entry_categories` et `parentKey: "entry_id"` — c'est la raison de l'ordre impératif ci-dessus. C'est aussi le second cas réel que **DEC-013** attendait, et qui l'a fait passer de `proposé` à `actif` le 2026-09-09.

**Étapes** :

1. Ouvrir <https://supabase.com/dashboard>, sélectionner le projet de L'Édifice, puis « SQL Editor » dans la barre latérale.
2. Cliquer « New query ».
3. Coller le contenu intégral de `20260909100000_create_personal_journal_categories.sql`, cliquer « Run ». Les deux fichiers sont idempotents (`if not exists`, `drop policy if exists`, `drop trigger if exists`, `create or replace function`) : les relancer ne casse rien.
4. Nouvelle requête, coller `20260909110000_create_personal_journal_entry_categories.sql`, cliquer « Run ». **Dans cet ordre** : la seconde référence la première.
5. Vérifier que **RLS est activée** sur les deux — sans cela les policies ne s'appliquent pas :

```sql
select relname, relrowsecurity
from pg_class
where relname in ('personal_journal_categories', 'personal_journal_entry_categories');
```

Attendu : `relrowsecurity` à `true` sur les deux lignes.

6. Vérifier les **grants**, lus dans l'ACL brute. C'est ce contrôle qui a révélé le défaut du chantier 6 ; il n'est pas optionnel :

```sql
select c.relname as table_name,
       case a.grantee when 0 then 'PUBLIC' else pg_get_userbyid(a.grantee) end as grantee,
       a.privilege_type
from pg_class c
cross join lateral aclexplode(c.relacl) a
where c.relnamespace = 'public'::regnamespace
  and c.relname in ('personal_journal_categories', 'personal_journal_entry_categories')
  and (a.grantee = 0 or pg_get_userbyid(a.grantee) in ('anon', 'authenticated'))
order by 1, 2, 3;
```

Attendu, **exactement 7 lignes**, et rien d'autre :

- `personal_journal_categories` / `authenticated` → `DELETE`, `INSERT`, `SELECT`, `UPDATE`
- `personal_journal_entry_categories` / `authenticated` → `DELETE`, `INSERT`, `SELECT`
- **aucune ligne pour `anon` ni pour `PUBLIC`**, et **aucun `TRUNCATE`, `REFERENCES`, `TRIGGER` ni `MAINTAIN`**

**Pourquoi `aclexplode` et non `information_schema.role_table_grants`**, la vue que cette étape utilisait dans sa première rédaction : la vue n'affiche pas `MAINTAIN`, privilège apparu avec PostgreSQL 17. La preuve est dans le chantier 6 — le défaut du projet accordait `arwdDxtm`, soit huit privilèges, et le contrôle du 2026-08-24 fait avec cette vue n'en a listé que sept. `aclexplode` lit l'ACL brute de la table et ne peut en omettre aucun.

7. Vérifier que les policies correspondent exactement aux verbes accordés :

```sql
select tablename, policyname, cmd
from pg_policies
where schemaname = 'public'
  and tablename in ('personal_journal_categories', 'personal_journal_entry_categories')
order by tablename, cmd;
```

Attendu : quatre policies sur `personal_journal_categories` (`SELECT`, `INSERT`, `UPDATE`, `DELETE`), trois sur `personal_journal_entry_categories` (`SELECT`, `INSERT`, `DELETE`). **Aucune policy `UPDATE` sur la table de liaison.**

8. Vérifier que la contrainte `RESTRICT` est bien posée — c'est la moitié structurelle de la règle de blocage :

```sql
select conname, confdeltype
from pg_constraint
where conrelid = 'public.personal_journal_entry_categories'::regclass
  and contype = 'f';
```

Attendu : `confdeltype` = `r` (restrict) sur la clé étrangère vers `personal_journal_categories`, et `c` (cascade) sur celles vers `personal_journal_entries` et `auth.users`.

9. Vérifier l'**unicité insensible à la casse** sur `personal_journal_categories`, en structure puis en comportement. Absente de la première rédaction de cette entrée, alors que l'amorçage ci-dessous repose dessus pour ne pas créer de doublons.

**9a, structure** — l'index existe et porte bien l'expression :

```sql
select indexname, indexdef
from pg_indexes
where schemaname = 'public'
  and tablename = 'personal_journal_categories'
  and indexname = 'personal_journal_categories_user_id_name_key';
```

Attendu, une ligne, dont `indexdef` contient **à la fois** `UNIQUE` et `lower(btrim(name))` :

```text
CREATE UNIQUE INDEX personal_journal_categories_user_id_name_key
ON public.personal_journal_categories USING btree (user_id, lower(btrim(name)))
```

C'est un **index** et non une contrainte — une contrainte `unique` ne peut pas porter sur une expression. Il n'apparaît donc pas dans `pg_constraint`, et ce n'est pas une anomalie.

**9b, comportement** — dans une transaction annulée, sur le compte de test uniquement :

```sql
begin;
insert into public.personal_journal_categories (user_id, name)
select id, 'Controle casse' from auth.users where email = 'test-erase@edificeia.com';
insert into public.personal_journal_categories (user_id, name)
select id, '  CONTROLE CASSE ' from auth.users where email = 'test-erase@edificeia.com';
rollback;
```

Attendu : la **seconde** insertion échoue en `23505 — duplicate key value violates unique constraint "personal_journal_categories_user_id_name_key"`. La casse et les blancs de bord diffèrent tous deux, donc l'échec prouve que `lower` et `btrim` sont appliqués. Rien n'est conservé : la transaction échoue, et aucun `COMMIT` ne peut plus aboutir.

Ce test **ne prouve rien si `test-erase@edificeia.com` n'existe pas** : les deux `insert` ne visent alors aucune ligne et passent sans erreur. Vérifier le compte avant. Le compte `contact.edificeia@gmail.com` n'est jamais touché.

**9c, résidu** — contre-vérification :

```sql
select count(*) as residus
from public.personal_journal_categories
where lower(btrim(name)) = 'controle casse';
```

Attendu : `0`.

**Vérification** : les étapes 5 à 9 renvoient exactement les valeurs attendues. Si un `TRUNCATE`, un `MAINTAIN` ou un droit `anon` apparaît malgré la révocation explicite, **ne pas continuer** et rouvrir le chantier 6 : cela signifierait qu'un troisième `ALTER DEFAULT PRIVILEGES` existe.

**Révision du 2026-09-10** : les étapes 6 et 9 ont été corrigées après la rédaction initiale du 2026-09-09, qui présentait deux trous — une vue de grants aveugle à `MAINTAIN`, et aucun contrôle de l'unicité. L'application du 2026-09-10 a été vérifiée **avec les requêtes corrigées** : 7 lignes de grants exactes, aucune pour `anon` ; RLS active sur les deux tables ; 7 policies alignées sur les grants ; `23505` déclenché par le test de casse, aucun résidu.

### 2026-09-09 — Amorcer les dix catégories de Journal sur `contact.edificeia@gmail.com`

**Statut** : `done` — 2026-09-10

**Résultat** : insertion exécutée dans le SQL Editor le 2026-09-10. Vérification conforme : **10 catégories** sur `contact.edificeia@gmail.com`, **0** sur tout autre compte. Geste ponctuel, à ne pas rejouer — et s'il l'était par erreur, l'index unique insensible à la casse ferait du `on conflict do nothing` un no-op.

**Pourquoi c'est manuel** : insertion ponctuelle de données en production, sur un compte réel nommé. Ce n'est **pas** un mécanisme de seed et ne doit pas en devenir un — aucun script du dépôt ne doit connaître ces dix noms, et aucun futur compte ne doit les recevoir automatiquement. Un script dans `scripts/` serait un outil, et un outil se relance ; ce geste ne doit jamais l'être.

**Bloque** : rien techniquement. Le chantier fonctionne sans, avec zéro catégorie.

**Dépend de** : l'entrée ci-dessus. Les deux tables doivent exister.

**Garde en place, à ne pas retirer** : le `SELECT` résout le compte **par e-mail**, il ne contient aucun UUID en dur. Un identifiant copié serait faux le jour où le compte est recréé — c'est déjà arrivé deux fois sur le compte de test au cours du chantier Tâches. Aucune ligne ne peut atteindre un autre compte que celui nommé dans le `where`.

**Étapes** :

1. **Contrôle préalable.** Vérifier qu'exactement un compte porte cet e-mail :

```sql
select id, email, created_at
from auth.users
where email = 'contact.edificeia@gmail.com';
```

**Une seule ligne attendue.** Si zéro ou plusieurs, s'arrêter : l'insertion viserait la mauvaise cible ou aucune.

2. Exécuter l'insertion :

```sql
insert into public.personal_journal_categories (user_id, name, description)
select u.id, c.name, c.description
from auth.users u
cross join (values
  ('Observations',            'Ce que tu remarques — comportements, relations, société, environnement, toi-même.'),
  ('Prises de conscience',    'Ce que tu comprends sur toi ou sur la vie.'),
  ('Évolutions',              'Ce qui change en toi, comparé à l''ancien toi.'),
  ('Tempêtes',                'Les périodes difficiles : événement → réaction → compréhension → évolution.'),
  ('Décisions',               'Les choix importants, et pourquoi cette direction plutôt qu''une autre.'),
  ('Objectifs / Directions',  'Là où tu veux aller, mesurable ou non.'),
  ('Apprentissages',          'Ce que tu retiens d''une expérience — erreur, rencontre, réussite, échec.'),
  ('Principes / Philosophie', 'Les règles de vie construites progressivement, amenées à évoluer.'),
  ('Relations / Humain',      'Observations et apprentissages sur les dynamiques relationnelles.'),
  ('Fragments',               'Pensées brutes, intuitions non encore classées.')
) as c(name, description)
where u.email = 'contact.edificeia@gmail.com'
on conflict do nothing;
```

`on conflict do nothing` s'appuie sur l'index unique `personal_journal_categories_user_id_name_key`, insensible à la casse : une seconde exécution accidentelle n'insère aucun doublon.

**Vérification** : dix catégories, et zéro sur tout autre compte.

```sql
select count(*) as total
from public.personal_journal_categories c
join auth.users u on u.id = c.user_id
where u.email = 'contact.edificeia@gmail.com';

select count(*) as hors_compte_cible
from public.personal_journal_categories c
join auth.users u on u.id = c.user_id
where u.email <> 'contact.edificeia@gmail.com';
```

Attendu : `total` = 10, `hors_compte_cible` = 0.


### 2026-08-24 — Appliquer la migration `personal_tasks` (module Tâches du pôle Personnel)

**Statut** : `done` — 2026-08-24

**Résultat** : migration appliquée dans le SQL Editor et vérifiée le 2026-08-24. Table, colonnes, contraintes, RLS et policies conformes.

**Ce sont ses contrôles post-application qui ont ouvert le chantier 6.** L'étape 6 ci-dessous — la vérification des grants — a montré `authenticated` en possession de **tous** les privilèges (`SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER`) alors que la migration n'en accordait que trois. Le défaut ne venait pas de cette migration : les cinq tables du pôle étaient dans le même état depuis `personal_notes` (2026-08-04), à cause de deux `ALTER DEFAULT PRIVILEGES` du projet Supabase et de migrations qui révoquaient `from anon` sans révoquer `from authenticated`. Corrigé le 2026-08-30 par `20260824110000` et `20260824120000` (commit `f0b1e2d`).

**Ce contrôle a donc payé, et c'est la raison de le garder dans toute entrée future** : sans lui, la table serait passée pour conforme.


**Fichier** : `supabase/migrations/20260824100000_create_personal_tasks.sql`

**Pourquoi c'est manuel** : nécessite un clic dans le SQL Editor Supabase, pas d'accès API direct pour ce type d'opération. Aucun CLI Supabase authentifié n'est configuré sur cette machine, et la clé service-role ne permet pas d'exécuter du DDL par l'API REST.

**Bloque** : tout le module Tâches. Sans cette table, le store et les routes `/api/personal/tasks` échouent et l'onglet ne peut rien afficher ni enregistrer.

**Particularité de sécurité, à lire avant d'exécuter** : comme pour Notes, Journal et Habitudes, **RLS est ici le garde réel et non une défense en profondeur**. Le store utilisera le client de session (clé `anon` + cookies), pas la clé service-role qui contourne RLS. Si les policies ne sont pas appliquées correctement, **il n'y a pas de second filet côté application**. Les étapes de vérification ci-dessous ne sont donc pas optionnelles — et l'incident du 2026-08-10 sur `personal_habits`, où la migration n'avait été appliquée que partiellement, montre que ce n'est pas théorique.

**Étapes** :

1. Ouvrir <https://supabase.com/dashboard>, sélectionner le projet de L'Édifice, puis « SQL Editor » dans la barre latérale.
2. Cliquer « New query ».
3. Coller le contenu intégral de `supabase/migrations/20260824100000_create_personal_tasks.sql` et cliquer « Run ». Le fichier est idempotent (`if not exists`, `drop policy if exists`, `drop trigger if exists`, `create or replace function`) : le relancer ne casse rien.
4. Vérifier que la table et ses colonnes existent :

```sql
select column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public' and table_name = 'personal_tasks'
order by ordinal_position;
```

5. Vérifier que **RLS est activée** — sans cela les policies ne s'appliquent pas, quoi qu'il arrive :

```sql
select relrowsecurity from pg_class where relname = 'personal_tasks';
```

6. Vérifier les **grants** — c'est le point qui avait été appliqué partiellement lors de l'incident du 2026-08-10 :

```sql
select grantee, privilege_type
from information_schema.role_table_grants
where table_name = 'personal_tasks'
order by grantee, privilege_type;
```

7. Vérifier les **policies**, leur nombre et leur expression :

```sql
select policyname, cmd, qual, with_check
from pg_policies
where schemaname = 'public' and tablename = 'personal_tasks'
order by policyname;
```

8. Vérifier les **contraintes de validation** :

```sql
select conname, pg_get_constraintdef(oid)
from pg_constraint
where conrelid = 'public.personal_tasks'::regclass and contype = 'c'
order by conname;
```

**Vérification** :

- étape 4 : `id`, `user_id` (`NO`), `title` (`NO`), `due_on` (`YES`), `status` (`NO`), `context_label` (`YES`), `created_at` (`NO`), `updated_at` (`NO`), `deleted_at` (`YES`).
- étape 5 : doit renvoyer `true`.
- étape 6 : `authenticated` doit avoir **exactement** `SELECT`, `INSERT`, `UPDATE` — **jamais `DELETE`**. `anon` ne doit apparaître dans **aucune ligne**. Un `DELETE` accordé ici rendrait la suppression physique possible depuis le navigateur, ce que ce module refuse par conception.
- étape 7 : **trois** policies, `personal_tasks_select_own` / `insert_own` / `update_own`, et **aucune policy `DELETE`**. Chaque `qual` et `with_check` doit être `(user_id = auth.uid())` — une expression à `true` serait exactement la faille `content_assets` du 2026-07-28.
- étape 8 : cinq contraintes `CHECK` — `title_not_blank`, `title_max_length`, `status_known` (`status in ('todo','done')`), `context_label_not_blank`, `context_label_max_length`.

Une fois appliquée, le cycle CRUD complet reste à valider par test manuel une fois l'interface construite (checkpoint 3).

### 2026-08-18 — Appliquer la migration `personal_item_erasure_log`

**Statut** : `done` — au plus tard le 2026-08-20, date exacte non établie

**Résultat** : migration appliquée dans le SQL Editor, à une date qui **n'est pas établie avec certitude**, et que cette entrée refuse donc de fixer. `cc76f38` (2026-08-20, 10:11) l'affirme « appliquée et vérifiée en base le 2026-08-18 » — grants propres, RLS actif sans policy, contrainte `CHECK` confirmée — et `suivi-chantiers-edifice.md` reprend cette date. Mais cette entrée a été ouverte au statut `pending` par `5951773`, le 2026-08-20 à 09:52, dix-neuf minutes plus tôt : les deux affirmations ne peuvent pas être vraies ensemble. La lecture la plus probable est que la migration était déjà appliquée et que l'entrée est née périmée. « 2026-08-18 » peut aussi n'être que l'horodatage du nom de fichier, repris comme date d'application — le piège relevé au chantier 6. Seule borne sûre : **au plus tard le 2026-08-20**, date de l'affirmation de `cc76f38`.

**En service, prouvé en base et non seulement affirmé** : la table porte quatre entrées — les trois du test de suppression par élément du 2026-08-24, la première à `07:29:55Z`, et celle du test Tâches du 2026-09-09 à `15:30:47Z`, avec `related_deleted_count` à 0. Le 2026-09-09, la clé `anon` y reçoit `42501` : le privilège est absent, pas seulement masqué.

Le contrôle de l'étape 4 lit `information_schema.role_table_grants`, aveugle à `MAINTAIN` — le défaut corrigé le 2026-09-10 dans l'entrée des catégories de Journal. Sans conséquence ici : la migration révoque `all` des deux rôles, ce qui inclut `MAINTAIN`.

**Pourquoi c'est manuel** : nécessite un clic dans le SQL Editor Supabase, pas d'accès API direct pour ce type d'opération. Aucun CLI Supabase authentifié n'est configuré sur cette machine, et la clé service-role ne permet pas d'exécuter du DDL par l'API REST.

**Bloque** : la suppression physique individuelle d'un élément archivé (bouton « Supprimer définitivement » de la carte Archives), sur Notes, Journal et Humeur, et Habitudes. **Le code n'est pas encore écrit** : cette entrée précède l'implémentation, contrairement à celle du 2026-08-13 qui la suivait. Appliquer la migration maintenant ne casse rien et ne rend rien accessible — aucune route n'écrit encore dans cette table.

**Étapes** :

1. Ouvrir <https://supabase.com/dashboard>, sélectionner le projet de L'Édifice, puis « SQL Editor » dans la barre latérale.
2. Cliquer « New query ».
3. Coller ce script **tel quel** et cliquer « Run ». C'est le contenu exact de `supabase/migrations/20260818100000_create_personal_item_erasure_log.sql`, commentaires abrégés ; en cas de doute, c'est le fichier qui fait foi.

```sql
create table if not exists public.personal_item_erasure_log (
  id uuid primary key default gen_random_uuid(),
  -- Pas de FK vers auth.users : une suppression de compte cascaderait et
  -- effacerait la preuve que l'effacement a eu lieu.
  user_id uuid not null,
  module text not null,
  table_name text not null,
  -- Identifiant technique de la ligne supprimee, pas du contenu. Pas de FK :
  -- la ligne referencee n'existe plus au moment de l'ecriture.
  item_id uuid not null,
  -- Lignes dependantes emportees avec l'element. 0 si le module tient dans
  -- une seule table.
  related_deleted_count integer not null default 0,
  requested_at timestamptz not null default now(),
  source text not null default 'archives_panel',
  constraint personal_item_erasure_log_related_count_positive
    check (related_deleted_count >= 0)
);

alter table public.personal_item_erasure_log enable row level security;

-- Patron repris de personal_data_erasure_log : les DEUX roles sont revoques, et
-- aucune policy n'est creee. La table n'est accessible que par la service-role.
revoke all on table public.personal_item_erasure_log from anon;
revoke all on table public.personal_item_erasure_log from authenticated;

create index if not exists personal_item_erasure_log_user_id_requested_at_idx
on public.personal_item_erasure_log (user_id, requested_at desc);
```

Le script est **idempotent sur la table et l'index** (`create ... if not exists`), les `revoke` sont sans effet s'ils ont déjà été appliqués, et `enable row level security` est sans effet si RLS est déjà actif. Le rejouer ne casse rien.

4. Vérifier que les révocations ont bien pris — c'est le point qui avait été appliqué partiellement lors de l'incident du 2026-08-10 sur `personal_habits` :

```sql
select grantee, privilege_type
from information_schema.role_table_grants
where table_name = 'personal_item_erasure_log';
```

5. Vérifier que RLS est actif et qu'aucune policy n'existe :

```sql
select c.relrowsecurity as rls_active,
       (select count(*) from pg_policies p
        where p.schemaname = 'public' and p.tablename = 'personal_item_erasure_log') as nb_policies
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relname = 'personal_item_erasure_log';
```

6. Vérifier que la contrainte de positivité est bien en place :

```sql
select conname, pg_get_constraintdef(oid)
from pg_constraint
where conrelid = 'public.personal_item_erasure_log'::regclass
  and contype = 'c';
```

**Vérification** :

- étape 4 : `anon` et `authenticated` **ne doivent apparaître dans aucune ligne**. Une ligne pour l'un des deux signifie que les `revoke` n'ont pas pris, et la table serait alors lisible depuis le navigateur — ce qui retirerait toute valeur au journal.
- étape 5 : `rls_active` doit valoir `true` et `nb_policies` doit valoir `0`. Zéro policy avec RLS actif est le résultat attendu, pas une anomalie : sous RLS, l'absence de policy vaut refus, et l'accès ne passe que par la service-role qui contourne RLS.
- étape 6 : la contrainte `personal_item_erasure_log_related_count_positive` doit apparaître avec `CHECK ((related_deleted_count >= 0))`.

Aucun test fonctionnel n'est possible à ce stade : aucune route n'écrit encore dans cette table. Le test viendra avec l'implémentation du geste.

### 2026-08-13 — Appliquer la migration `personal_data_erasure_log`, puis tester « Vider l'historique »

**Statut** : `done` — 2026-08-18

**Résultat** : migration appliquée dans le SQL Editor et vérifiée — grants propres (ni `anon` ni `authenticated`), et `confdeltype = c` confirmé sur `personal_habit_completions_habit_fk`, donc la cascade existe bien en base. Le test de bout en bout du geste « Vider l'historique » a été mené le **2026-08-18 par pilotage navigateur humain, pas par script**, sur le compte jetable `test-erase@edificeia.com` (16 lignes de test : 3 notes, 3 entrées de journal, 2 habitudes, 8 réalisations). Les trois modules ont été testés **séparément** :

- suppression ciblée confirmée sur chacun, les deux autres modules restés intacts à chaque fois — c'est la propriété que le passage à un module à la fois (Option A) existe pour garantir ;
- journal d'audit conforme pour Habitudes : **deux entrées dans l'ordre attendu**, `personal_habit_completions` = 8 puis `personal_habits` = 2, ce qui valide la suppression explicite des dépendantes avant la principale ;
- réalisations orphelines : **0**.

Aucune donnée du compte `contact.edificeia@gmail.com` n'a été touchée.

**Pourquoi c'est manuel** : nécessite un clic dans le SQL Editor Supabase, pas d'accès API direct pour ce type d'opération. Aucun CLI Supabase authentifié n'est configuré sur cette machine, et la clé service-role ne permet pas d'exécuter du DDL par l'API REST.

**Bloque** : tout le geste « Vider l'historique » (Réglages > Personnel). Le code est écrit, typé et compilé, mais `writeErasureAudit` insère dans `personal_data_erasure_log` **après** chaque suppression. Tant que la table n'existe pas, la route renvoie une erreur 500 — et pour Notes ou Journal, la suppression physique aura **déjà eu lieu** quand l'écriture d'audit échoue. **Ne pas exercer le geste avant d'avoir appliqué cette migration.**

**Étapes** :

1. Ouvrir <https://supabase.com/dashboard>, sélectionner le projet de L'Édifice, puis « SQL Editor » dans la barre latérale.
2. Cliquer « New query ».
3. Coller ce script **tel quel** et cliquer « Run ». C'est le contenu exact de `supabase/migrations/20260806200000_create_personal_data_erasure_log.sql` ; en cas de doute, c'est le fichier qui fait foi.

```sql
create table if not exists public.personal_data_erasure_log (
  id uuid primary key default gen_random_uuid(),
  -- Pas de cle etrangere vers auth.users, deliberement : une suppression de
  -- compte cascaderait et effacerait la preuve que l'effacement a eu lieu.
  user_id uuid not null,
  module text not null,
  table_name text not null,
  deleted_count integer not null,
  requested_at timestamptz not null default now(),
  source text not null default 'settings_personal',
  constraint personal_data_erasure_log_deleted_count_positive
    check (deleted_count >= 0)
);

alter table public.personal_data_erasure_log enable row level security;

-- Patron repris de project_memory_audit_log : les DEUX roles sont revoques, et
-- aucune policy n'est creee. La table n'est accessible que par la service-role.
revoke all on table public.personal_data_erasure_log from anon;
revoke all on table public.personal_data_erasure_log from authenticated;

create index if not exists personal_data_erasure_log_user_id_requested_at_idx
on public.personal_data_erasure_log (user_id, requested_at desc);
```

Le script est **idempotent sur la table et l'index** (`create ... if not exists`) et les `revoke` sont sans effet s'ils ont déjà été appliqués : le rejouer ne casse rien. Il ne l'est pas sur `alter table ... enable row level security`, qui est simplement sans effet si RLS est déjà actif.
4. Vérifier ensuite que les révocations sont bien en place — c'est le point qui a été appliqué partiellement lors de l'incident du 2026-08-10 sur `personal_habits`. Coller et exécuter :

```sql
select grantee, privilege_type
from information_schema.role_table_grants
where table_name = 'personal_data_erasure_log';
```

5. Vérifier aussi que la cascade d'`personal_habit_completions` existe réellement en base, puisque c'est la contrainte que le code refuse délibérément de présumer :

```sql
select conname, confdeltype
from pg_constraint
where conrelid = 'public.personal_habit_completions'::regclass
  and contype = 'f';
```

**Vérification** : à l'étape 4, `anon` et `authenticated` **ne doivent apparaître dans aucune ligne** — la table n'est accessible qu'à la clé service-role, et une ligne pour l'un de ces deux rôles signifie que les `revoke` n'ont pas pris. À l'étape 5, `confdeltype` doit valoir `c` (cascade) ; toute autre valeur confirme que la migration `20260806100000` est encore partiellement appliquée, ce qui ne casse pas la suppression (le code supprime les réalisations explicitement) mais doit être corrigé.

**Procédure de test exécutée** — conservée ci-dessous telle qu'elle a été suivie, pour qu'un futur test du même geste reparte du même protocole.

Ensuite, tester le geste de bout en bout dans Réglages > Personnel. Le flux est **un module à la fois** depuis le 2026-08-16 : chaque module a sa propre ligne et son propre bouton « Vider <module> », et le mot `SUPPRIMER` est retapé à chaque fois. Pour chacun des trois modules, séparément :

1. cliquer « Vider <module> », vérifier que l'écran de confirmation nomme **le bon module** et que le compte annoncé correspond ;
2. taper `SUPPRIMER`, confirmer ;
3. vérifier que **les deux autres modules ont gardé leur compte** — c'est la propriété que ce flux existe pour garantir ;
4. contrôler le journal d'audit, une ligne par table effectivement vidée :

```sql
select module, table_name, deleted_count, requested_at
from public.personal_data_erasure_log
order by requested_at desc
limit 20;
```

Pour **Habitudes**, deux lignes doivent apparaître pour un seul geste — `personal_habit_completions` puis `personal_habits` — et l'écran de résultat doit annoncer les réalisations en plus des habitudes. Vérifier qu'aucune réalisation orpheline ne subsiste :

```sql
select count(*) from public.personal_habit_completions;
```

Tester sur un jeu de données jetable : la suppression est irréversible et sans sauvegarde.

### 2026-08-04 — Appliquer la migration `personal_notes` (module Notes du pôle Personnel)

**Statut** : `done` — 2026-08-04

**Resultat** : migration appliquee dans le SQL Editor et registre reconcilie. Verifie cote agent — `supabase migration list` renvoie desormais `{"local":"20260804100000","remote":"20260804100000"}`, et les trois migrations Garmin restent sans equivalent remote : la pause n'a pas ete rompue. Les policies ont ete controlees contre la base reelle par un appel PostgREST anonyme : `SELECT`, `INSERT` et `DELETE` refuses avec `42501`. Le cycle CRUD complet a ete valide par test manuel le 2026-08-04.

**Pourquoi c'est manuel** : appliquer une migration passe par le SQL Editor du dashboard Supabase. L'agent n'a pas d'accès SQL direct au projet — les variables serveur ne sont pas exposées dans son environnement. La CLI `supabase` est liée et `supabase migration list` fonctionne, mais la seule commande qui appliquerait la migration est `supabase db push`, et **elle ne doit pas être lancée ici** : elle pousserait aussi les trois migrations du lot Garmin/Vitals volontairement en pause (`20260708100000`, `20260708110000`, `20260708120000`).

**Bloque** : tout le module Notes. Sans cette table, la route `/api/personal/notes` échoue et l'onglet Notes ne peut rien afficher ni enregistrer.

**Particularité de sécurité, à lire avant d'exécuter** : c'est la première table du dépôt dont **RLS est le garde réel et non une défense en profondeur**. Le store Notes utilise le client de session (`src/lib/supabase/server.ts`, clé `anon` + cookies), pas la clé service-role des deux autres stores Personnel — qui, eux, contournent RLS. Si les policies ne sont pas appliquées correctement, il n'y a pas de second filet côté application. Les étapes de vérification ci-dessous ne sont donc pas optionnelles.

**Étapes** :

1. Ouvrir le SQL Editor du projet Supabase.
2. Coller et exécuter le contenu intégral de `supabase/migrations/20260804100000_create_personal_notes.sql`. Le fichier est idempotent (`if not exists`, `drop policy if exists`, `create or replace`) : le relancer ne casse rien.
3. Vérifier que la table et ses contraintes existent :
   ```sql
   select column_name, data_type, is_nullable
   from information_schema.columns
   where table_schema = 'public' and table_name = 'personal_notes'
   order by ordinal_position;
   ```
   Attendu : `id`, `user_id` (`NO`), `content` (`NO`), `created_at`, `updated_at`, `deleted_at` (`YES`).
4. Vérifier que **RLS est activée** — sans cela, les policies ne s'appliquent pas, quoi qu'il arrive :
   ```sql
   select relrowsecurity from pg_class where relname = 'personal_notes';
   ```
   Doit renvoyer `true`.
5. Lire **toutes** les policies sans filtre de nom, et contrôler qu'aucune ne porte un `qual` permissif :
   ```sql
   select policyname, cmd, qual, with_check
   from pg_policies
   where schemaname = 'public' and tablename = 'personal_notes'
   order by policyname;
   ```
   Attendu exactement trois lignes — `_select_own` (SELECT), `_insert_own` (INSERT), `_update_own` (UPDATE) — toutes avec `user_id = auth.uid()`. **Aucune ligne `DELETE`, et aucun `qual` ou `with_check` à `true`.** C'est la requête sans filtre de nom qui avait rattrapé la policy fantôme de `content_assets` le 2026-07-28 : la garder telle quelle.
6. Vérifier que le privilège DELETE n'est **pas** accordé — l'application ne fait que du soft delete :
   ```sql
   select privilege_type
   from information_schema.role_table_grants
   where table_schema = 'public' and table_name = 'personal_notes' and grantee = 'authenticated'
   order by privilege_type;
   ```
   Attendu : `INSERT`, `SELECT`, `UPDATE`. **Pas de `DELETE`.**
7. Réconcilier le registre de migrations — **uniquement ce timestamp** :
   ```bash
   supabase migration repair --status applied 20260804100000
   ```
8. Contrôler que les trois migrations Garmin sont **toujours** non appliquées :
   ```bash
   supabase migration list
   ```

**Vérification fonctionnelle** : ouvrir `/interface/personnel`, onglet Notes. Créer une note, la modifier, la supprimer. Puis contrôler que la suppression est bien logique et non physique :

```sql
select id, left(content, 40) as extrait, deleted_at
from public.personal_notes
order by created_at desc
limit 5;
```

La note supprimée doit toujours être présente, avec un `deleted_at` non nul.

### 2026-08-01 — Ajouter la colonne `effort_level` à `trajectoire_actions` en production

**Statut** : `done` — 2026-08-04

**Resultat** : migration appliquee et registre reconcilie. Constate cote agent le 2026-08-04 en verifiant une autre migration — `supabase migration list` renvoie `{"local":"20260711100000","remote":"20260711100000"}`. Le module Trajectoire n'est donc plus vide en production.

**Pourquoi c'est manuel** : appliquer une migration passe par le SQL Editor du dashboard Supabase. L'agent n'a pas d'accès SQL direct au projet — les variables serveur ne sont pas exposées dans son environnement. La CLI `supabase` est bien liée au projet et `supabase migration list` fonctionne, mais la seule commande qui appliquerait la migration est `supabase db push`, et **elle ne doit surtout pas être lancée ici** : elle pousserait les **quatre** migrations en retard d'un coup, dont les trois du lot Garmin/Vitals volontairement en pause (voir le tableau ci-dessous). C'est précisément ce que cette entrée existe pour éviter.

**Bloque** : tout le module Trajectoire en production, en lecture comme en écriture.

**État confirmé le 2026-08-01** par `supabase migration list` (compare le local au registre distant, sans rien appliquer). Quatre migrations locales n'ont pas d'équivalent distant, et ce sont les seules :

| Migration | Objet | Remote | Lot |
| --- | --- | --- | --- |
| `20260708100000_create_personal_garmin_daily_stats.sql` | table `personal_garmin_daily_stats` | **absente** | Garmin/Vitals — en pause |
| `20260708110000_create_personal_daily_briefs.sql` | table `personal_daily_briefs` | **absente** | Garmin/Vitals — en pause |
| `20260708120000_add_garmin_oauth_provider.sql` | `garmin` dans le check `provider` de `oauth_tokens` | **absente** | Garmin/Vitals — en pause |
| `20260711100000_add_effort_level_to_trajectoire_actions.sql` | colonne `effort_level` | **absente** | **isolée — objet de cette entrée** |

Toutes les autres migrations du dossier sont appliquées, y compris celles postérieures au 2026-07-11 (`20260721090000` et suivantes) : le retard est un trou au milieu de la séquence, pas une queue non appliquée.

**Pourquoi la quatrième est isolable** — vérifié point par point :

- elle ne touche que `public.trajectoire_actions`, créée par `20260613170000_create_trajectoire_tables.sql`, qui **est** appliquée en remote ;
- son contenu ne comporte aucune clé étrangère, aucun trigger, aucune fonction, aucune référence à une autre table ;
- les trois migrations Garmin ne mentionnent ni `trajectoire` ni `effort_level` (zéro occurrence dans les trois fichiers) ;
- `20260711100000` est le seul fichier du dossier à ajouter `effort_level`.

Elle peut donc être appliquée seule, sans rien réactiver du lot en pause.

**Ce que ça casse aujourd'hui, précisément** — la page ne plante pas, elle se vide. `readTrajectoire` (`lib/server/trajectoire.ts:566`) sélectionne `effort_level` dans la requête sur `trajectoire_actions` et relance l'erreur telle quelle (`throw new Error(actionsError.message)`, ligne 572). Comme cette requête est dans la même fonction que la lecture des projets et des objectifs, son échec **emporte tout le reste** : des projets et objectifs parfaitement lisibles ne sont jamais renvoyés.

En aval, l'erreur est bien attrapée partout, mais ne peut qu'être affichée :

- `/api/trajectoire` répond **500** avec le message Postgres brut ;
- `app/interface/trajectoire/TrajectoireClient.tsx:754` l'affiche dans un bandeau et laisse la liste vide ;
- `app/interface/overview/page.tsx:47` l'attrape aussi et le passe en `readError` ; l'aperçu Trajectoire de l'accueil est vide.

Le message vu par l'utilisateur est donc le texte Postgres, du type `column trajectoire_actions.effort_level does not exist` (SQLSTATE `42703`).

**Étapes** :

1. Ouvrir le SQL Editor du projet Supabase.
2. Coller et exécuter le contenu intégral de `supabase/migrations/20260711100000_add_effort_level_to_trajectoire_actions.sql`, reproduit ici tel quel. Il est idempotent (`if not exists` / `if exists`) : le relancer ne casse rien.

   ```sql
   alter table public.trajectoire_actions
   add column if not exists effort_level text not null default 'medium';

   alter table public.trajectoire_actions
   drop constraint if exists trajectoire_actions_effort_level_check;

   alter table public.trajectoire_actions
   add constraint trajectoire_actions_effort_level_check
   check (effort_level in ('low', 'medium', 'high'));
   ```

   Le `default 'medium'` est ce que le code attend déjà : `mapAction` (`lib/server/trajectoire.ts:370`) retombe sur `"medium"` quand la valeur est nulle ou inconnue. Les lignes existantes prennent donc la valeur que l'application leur donnait déjà implicitement.

3. Vérifier que la colonne et la contrainte existent :

   ```sql
   select column_name, data_type, is_nullable, column_default
   from information_schema.columns
   where table_schema = 'public'
     and table_name = 'trajectoire_actions'
     and column_name = 'effort_level';

   select conname, pg_get_constraintdef(oid)
   from pg_constraint
   where conrelid = 'public.trajectoire_actions'::regclass
     and conname = 'trajectoire_actions_effort_level_check';
   ```

4. Vérifier que la lecture qui échouait passe :

   ```sql
   select id, status, effort_level
   from public.trajectoire_actions
   limit 5;
   ```

5. Réconcilier le registre de migrations, pour que `supabase migration list` cesse de signaler ce décalage — **uniquement ce timestamp**, jamais les trois autres :

   ```bash
   supabase migration repair --status applied 20260711100000
   ```

6. Contrôler que les trois migrations Garmin sont **toujours** signalées comme non appliquées :

   ```bash
   supabase migration list
   ```

   Attendu : `20260708100000`, `20260708110000` et `20260708120000` sans équivalent remote ; `20260711100000` désormais avec.

**Vérification** : ouvrir `/interface/trajectoire`. Attendu — le bandeau d'erreur disparaît et les projets s'affichent. Côté agent, `curl` authentifié sur `/api/trajectoire` doit renvoyer 200 au lieu de 500.

**Option écartée, à rouvrir seulement si l'exécution SQL doit attendre longtemps** : ajouter un repli côté lecture dans `readTrajectoire`, sur le modèle de `isMissingTableError` dans `lib/server/personal/daily-briefs-store.ts` — retenter la requête sans `effort_level` sur SQLSTATE `42703`, et laisser `mapAction` appliquer son défaut `"medium"`. Ce serait trivial et sans risque (lecture seule, aucune RLS, aucune auth touchée), et rendrait les projets et objectifs de nouveau visibles sans attendre.

Non fait délibérément, et non commité : ce repli deviendrait **définitivement du code mort** dès l'étape 2 exécutée, puisqu'il protège contre un état transitoire qui ne doit pas se reproduire. Ajouter une branche permanente pour contourner une migration en retard revient à documenter le retard dans le code plutôt que de le corriger. Si l'exécution SQL est repoussée de plusieurs jours, l'arbitrage se justifie et le correctif tient en quelques lignes — c'est un choix à faire, pas une évidence.

### 2026-08-01 — Régénérer 3 PDF de `knowledge/Documentation-Strategique/PDF/` désynchronisés de leur source Markdown

**Statut** : `done` — 2026-08-01, via `npx md-to-pdf@5.2.5`

**Suite donnée — 2026-08-01** : l’outillage n’est plus ponctuel. `md-to-pdf` est passé en `devDependency` et la régénération des 16 PDF tient dans `npm run docs:pdf` (`scripts/generate-strategic-pdf.mjs`), avec `npm run docs:pdf:check` pour détecter un `.pdf` divergent sans rien réécrire. Le point ouvert que cette entrée laissait — « aucun outil de rendu Markdown → PDF n’est disponible » — est clos : ce n’est plus une action manuelle.

L’arbitrage typographique que cette entrée signalait est tranché du même coup : les 16 PDF sont désormais produits par le même pipeline, donc homogènes. Contenu vérifié identique document par document — seules changent les coupures de ligne, désormais correctes sur les noms de fichiers.

**Pourquoi c'est manuel** : aucun outil de rendu Markdown → PDF n'est disponible. Vérifié dans le dépôt — aucun script npm de génération (les 18 scripts de `package.json` ne couvrent pas la documentation), aucun fichier de `scripts/`, aucune dépendance de rendu dans `package.json`. Vérifié sur la machine — `pandoc`, `wkhtmltopdf`, `weasyprint`, `libreoffice` et `soffice` sont tous absents du `PATH`. `npx md-to-pdf` exige le téléchargement d'un paquet, c'est-à-dire une installation non demandée. Seul `pdftotext` est présent (`/mingw64/bin/pdftotext`), mais il extrait du texte, il n'en produit pas. Le `README.md` de `Documentation-Technique-Code/` confirme d'ailleurs que la génération a toujours été faite à la main : sa section « À mettre à jour » demande encore « ajouter la commande officielle de génération du PDF si elle devient un script npm ».

**Bloquait** : rien de fonctionnel. Mais les trois PDF affichent désormais des liens internes faux, alors que leurs `.md` sources sont corrects — c'est-à-dire exactement le type d'écart que la correction visait à supprimer. Quiconque lit la version PDF suivra un lien mort.

**Ce qui a débloqué la situation** : `npx -y md-to-pdf@5.2.5` fonctionne sur cette machine. Le paquet embarque son propre Chromium via Puppeteer et n'a besoin d'aucun installeur système ni droit administrateur — c'est précisément la limite que cette entrée croyait bloquante. Il n'a **pas** été ajouté à `package.json` : usage ponctuel via `npx`, aucune dépendance du projet n'a changé.

**Deux écarts de rendu découverts en comparant aux 13 autres PDF**, et traités :

1. Le lot initial **ne contient pas la section « Sommaire »** que porte chaque `.md` — vérifié sur trois documents : le `.md` en a une, le `.pdf` n'en garde aucune trace. Un rendu direct en aurait ajouté une que les autres documents n'ont pas. Un script de préparation la retire donc avant rendu.
2. Le lot initial porte un pied de page « L'Édifice — Documentation stratégique » à gauche et le numéro de page à droite, absent du `.md`. Reproduit via `footerTemplate`.

**Ce qui n'est pas identique** : la typographie et la mise en page. Le gabarit d'origine est inconnu — les PDF ne portent aucune métadonnée `Producer`/`Creator` — et n'a donc pas pu être reproduit à l'identique. Les trois documents régénérés sont lisibles et complets, mais ne sont pas visuellement interchangeables avec les treize autres. **C'est un arbitrage à trancher** : soit régénérer les seize avec ce pipeline pour retrouver l'homogénéité, soit retrouver le gabarit d'origine et refaire ces trois-là avec. En l'état, un lien juste a été préféré à une police identique.

**Vérification effectuée** — extraction `pdftotext -layout`, méthode d'abord validée sur les PDF fautifs encore en place, qui remontaient bien une occurrence de chaque ancien nom :

| PDF régénéré | Nom corrigé présent | Ancien nom restant |
| --- | --- | --- |
| `10-architecture-systeme.pdf` | `11-modularite-configuration.md` ×1, `12-modele-de-donnees.md` ×1 | 0 |
| `11-modularite-configuration.pdf` | `13-securite-gouvernance.md` ×1 | 0 |
| `20-catalogue-services.pdf` | `22-espaces-et-marques.md` ×1 | 0 |

Contrôles complémentaires : aucun des seize PDF du dossier ne contient plus d'ancien nom de fichier ; tous les titres de niveau 1 à 3 des sources sont présents dans les rendus (11, 6 et 17 titres, aucun manquant) ; les volumes de texte concordent avec les `.md` sources comme avec les PDF d'origine, à moins de 1 % près, écart imputable au pied de page répété.

**Les trois fichiers concernés**, et la correction que leur `.md` a reçue mais pas eux :

| PDF à régénérer | Source Markdown | Lien corrigé dans le `.md` |
| --- | --- | --- |
| `knowledge/Documentation-Strategique/PDF/10-architecture-systeme.pdf` | `../Markdown/10-architecture-systeme.md` | `11-configuration.md` → `11-modularite-configuration.md`, et `12-modele-donnees.md` → `12-modele-de-donnees.md` |
| `knowledge/Documentation-Strategique/PDF/11-modularite-configuration.pdf` | `../Markdown/11-modularite-configuration.md` | `13-securite.md` → `13-securite-gouvernance.md` |
| `knowledge/Documentation-Strategique/PDF/20-catalogue-services.pdf` | `../Markdown/20-catalogue-services.md` | `22-espaces.md` → `22-espaces-et-marques.md` |

Les 13 autres paires `.md`/`.pdf` du dossier sont inchangées et restent synchronisées.

**Étapes** :

1. Régénérer les trois PDF depuis leur `.md` source, avec l'outil et le gabarit utilisés pour produire le lot initial du 2026-08-01 (chaque PDF porte un pied de page « L'Édifice — Documentation stratégique » : reprendre le même rendu pour que le dossier reste homogène).
2. Les écrire par-dessus les fichiers existants, aux mêmes chemins que le tableau ci-dessus.
3. Committer les trois PDF avec les `.md` déjà corrigés.

Si l'outil d'origine n'est plus disponible, l'alternative durable est d'installer un moteur de rendu et de le câbler en script npm — ce qui fermerait cette entrée définitivement plutôt qu'à chaque révision :

```powershell
winget install --id JohnMacFarlane.Pandoc -e
```

**Vérification** : ouvrir chaque PDF régénéré et contrôler que les noms de fichiers cités correspondent à ceux de la colonne de droite du tableau. Côté agent, l'extraction fonctionne sans Poppler :

```bash
pdftotext -enc UTF-8 knowledge/Documentation-Strategique/PDF/10-architecture-systeme.pdf - | grep -c "11-modularite-configuration"
```

Doit renvoyer au moins `1`, et la commande équivalente sur `11-configuration.md` doit renvoyer `0`.

### 2026-07-28 — Vérifier / appliquer les policies RLS `content_assets` (Lot 2 de l'audit sécurité)

**Statut** : `done` — 2026-07-28

**Pourquoi c'est manuel** : appliquer une migration Supabase et lire l'état réel des policies passent par le SQL Editor du dashboard. L'agent n'a pas d'accès SQL direct au projet Supabase — les variables serveur ne sont pas exposées dans son environnement — et le dépôt ne trace pas quelles migrations ont déjà été exécutées. Le fichier de migration présent dans `supabase/migrations` ne prouve donc rien sur l'état de la base.

**Bloque** : la clôture du Lot 2. Tant que ce n'est pas vérifié, `content_assets` peut encore être en `using(true)` en production, c'est-à-dire lisible par n'importe quel utilisateur authentifié — la faille que le Lot 2 est censé fermer.

**Étapes** :

1. Ouvrir le SQL Editor du projet Supabase.
2. Lire l'état actuel des policies :
   ```sql
   select policyname, cmd, qual, with_check
   from pg_policies
   where schemaname = 'public' and tablename = 'content_assets'
   order by policyname;
   ```
3. Si les colonnes `qual` / `with_check` valent `true` (ou si les trois policies `content_assets_authenticated_*` sont absentes), la migration n'est pas appliquée : coller et exécuter le contenu intégral de `supabase/migrations/20260721090000_scope_content_assets_rls_to_owner.sql`.
4. Vérifier au passage que RLS est bien activé sur la table :
   ```sql
   select relrowsecurity from pg_class where relname = 'content_assets';
   ```
   Si le résultat est `false`, les policies ne sont pas appliquées quoi qu'il arrive :
   ```sql
   alter table public.content_assets enable row level security;
   ```
5. Relancer la requête de l'étape 2 pour confirmer.

**Vérification** — résultat obtenu le 2026-07-28, en base :

- Les policies `_select`, `_insert`, `_update` sont bien resserrées sur le propriétaire : la migration `20260721090000` était appliquée.
- **Une quatrième policy non prévue a été trouvée** : `content_assets_authenticated_delete`, avec `qual = true` littéral — n'importe quel utilisateur authentifié pouvait supprimer n'importe quelle ligne. Elle n'était créée par aucune migration du dépôt (`20260601133000` la supprime en préambule sans la recréer, `20260721090000` ne la mentionne pas) : elle existait uniquement en base, hors du flux de migrations.
- Le grant `DELETE` **était bien accordé** à `authenticated`. La faille était donc réellement exploitable, pas seulement latente — la couche de privilège ne rattrapait pas la couche RLS.
- Corrigé en base par `ALTER POLICY`, vérifié par relecture de `pg_policies` : `_delete` porte désormais la même restriction propriétaire que `_update`. Le correctif est versionné dans `supabase/migrations/20260728210000_scope_content_assets_delete_policy_to_owner.sql`.

**Ce que cette entrée a appris, au-delà de son objet** : `supabase/migrations` ne reflète pas fidèlement l'état réel de la base. Au moins un objet de sécurité y existait sans être versionné. Le critère de succès initialement écrit ici (« les trois policies existent ») était trop étroit et invitait à cocher trois cases au lieu de lire ce que la table contenait — c'est la requête, qui listait toutes les policies sans filtre de nom, qui a rattrapé le coup.

**Note connexe** : le changelog du 2026-07-11 indique que `20260711100000_add_effort_level_to_trajectoire_actions.sql` n'était pas encore appliquée non plus. Reste à vérifier — `lib/server/trajectoire.ts` lit `effort_level`, donc la page Trajectoire échoue si la colonne manque.

### 2026-07-28 — Rendre lisible le PDF de `Documentation_Stratégique/`

**Statut** : `done` — 2026-07-28 (option B retenue)

**Pourquoi c'est manuel** : le rendu de PDF côté agent nécessite `pdftoppm` (paquet `poppler-utils`), absent de cette machine. Son installation est un installeur système au niveau de Windows, hors du dépôt et hors de portée de l'agent. L'extraction de texte sans cette dépendance ne renvoie que des données de police illisibles — testé sur les deux PDF du dépôt, échec dans les deux cas.

**Bloque** : l'étape 1 du cadrage « concentre-toi sur le module X » ([CLAUDE.md](./CLAUDE.md#cadrage--concentre-toi-sur-le-module-x-)). En session autonome, la partie « vision long terme » de l'analyse sera absente : seul `knowledge/` sera exploitable, et l'agent devra signaler la lacune au lieu de la combler.

**Étapes** — deux options, la seconde est préférable :

*Option A — installer la dépendance (débloque la lecture de tous les PDF)*

1. Ouvrir PowerShell **en administrateur**.
2. Exécuter :
   ```powershell
   winget install --id oschwartz10612.Poppler -e
   ```
3. Ajouter le dossier `bin` de Poppler au `PATH` système, puis rouvrir le terminal.

*Option B — exporter le contenu en Markdown (recommandé)*

1. Ouvrir `Documentation_Stratégique\L'Edifice - Documentation Strategique de Reference.pdf`.
2. Exporter / copier le contenu en Markdown vers un fichier texte à côté du PDF, par exemple :
   ```text
   Documentation_Stratégique/documentation-strategique-de-reference.md
   ```
3. Garder le PDF comme original de référence ; le `.md` devient la version lisible par l'agent et par git (diffable, versionnable).

Pourquoi B est préférable : un PDF non suivi par git ne se diffe pas, ne se relit pas en revue, et diverge silencieusement du code. Un `.md` à côté résout le problème d'accès **et** le problème de traçabilité.

**Vérification** : Fichier .md créé et poussé dans `Documentation_Stratégique/`, lisible sans Poppler.
