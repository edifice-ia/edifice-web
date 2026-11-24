# Suivi des chantiers — L'Édifice

*Chantiers 4 et 5 mis à jour le 24 août 2026, chantier 6 le 3 septembre 2026, vérifiés contre le code, l'historique git et la base. Une date du chantier 4 requalifiée le 14 septembre 2026, sans re-vérification du reste du chantier. Chantier 7 ouvert le 28 septembre 2026, et une affirmation du chantier 6 corrigée le même jour ; migration du chantier 7 appliquée en base, compte rendu du 4 octobre 2026. Les chantiers 1, 2 et 3 datent du 28 juillet 2026 et n'ont pas été re-vérifiés depuis. Chantier 8 (EDIFICE ACADEMY) ouvert le 22 novembre 2026 ; le même jour, le statut du chantier 2 est re-vérifié contre git et le code, et la priorité des chantiers change (DEC-014).*

*Principe de ce document, inchangé : chaque état est vérifié contre le code et l'historique git, jamais contre la version précédente de ce fichier.*

## Priorités (par urgence réelle)

*Réordonnées le 22 novembre 2026 : EDIFICE ACADEMY devient la priorité de développement et le pôle Personnel est mis en pause — [DEC-014](knowledge/Documentation-Technique-Code/03_Decisions.md). L'ordre ci-dessous distingue la priorité de développement de ce qui la bloque.*

1. **Chantier 8 — EDIFICE ACADEMY.** Priorité de développement. Étape 0 faite le 22 novembre 2026 ; **étape 1 (squelette, sans données) faite le 24 novembre 2026**. L'étape 2 attend une demande explicite du porteur du projet. Voir plus bas.
2. ~~**Chantier 2 — Audit de sécurité.**~~ **Clos le 22 novembre 2026** par déclaration du porteur du projet, sous réserve de l'exception TikTok, à réexaminer à la fin de la revue. Les commits du correctif (`91cbfda`, `d3a6427`, `3e2047e`) sont locaux, non poussés : le correctif du `CRON_SECRET` n'est pas déployé tant qu'ils ne le sont pas. Voir plus bas.
3. **Chantier 7 — Privilèges hérités sur neuf tables service-role.** Migration **appliquée et vérifiée en base** (compte rendu du 4 octobre 2026). Le 22 novembre 2026, deux de ses points ouverts sont levés : le contenu des quatre policies `{public}` de `content_drafts` est lu (restreint au propriétaire, à supprimer par la migration `20261122100000`), et les deux tables non identifiées sont `project_memory` et `project_memory_audit_log`. Restent les deux limites de vérification et les gardes Calendrier. Voir plus bas.
4. ~~**Chantier 1 — Module Vitals (étape 6, UI).**~~ **En pause** avec le pôle Personnel depuis le 22 novembre 2026, et déjà de fait depuis juillet faute d'accès Garmin. Le travail non committé — `lib/server/personal/daily-briefs-store.ts` et `app/api/personal/daily-brief/` — reste hors de l'index, intact.
5. ~~**Chantier 5 — Mise en conformité DEC-007 sur `/api/personal/`.**~~ **Terminé** le 24 août 2026 : dix routes converties, quatorze fichiers désormais conformes sous ce chemin. Voir plus bas.
6. ~~**Chantier 6 — Privilèges hérités du défaut de schéma.**~~ **Terminé** le 30 août 2026, chantier imprévu : cinq tables corrigées et défaut du schéma restreint. Le même défaut subsiste sur d'autres tables : voir le chantier 7.
7. ~~**Chantier 3 — Audit Observatoire.**~~ **Terminé** le 22 juillet 2026 (`4280a8d`), vérifié dans le code le 28 juillet. Voir plus bas.

---

## Chantier 8 — EDIFICE ACADEMY — ÉTAPES 0 ET 1 FAITES

**Objectif** : construire Academy, troisième espace de L'Édifice — environnement d'apprentissage autonome, accessible depuis la navigation principale, avec sa propre navigation intérieure. Cible : [22-espaces-et-marques.md](knowledge/Documentation-Strategique/Markdown/22-espaces-et-marques.md). Décisions : [DEC-014](knowledge/Documentation-Technique-Code/03_Decisions.md) (espace, priorité, pause de Personnel, hiérarchie pédagogique) et DEC-015 (service commun IA multi-fournisseurs, révise DEC-011).

**État au 22 novembre 2026** : étape 0 faite — décisions et documentation, aucun code. **Rien n'existe dans le code ni en base** : vérifié par recherche sur « academy » / « académie » dans tout le dépôt.

**Plan par étapes**, chacune utilisable seule. Chaque étape est commitée avec sa documentation, vérifiée en isolation, puis testée par contrat et de bout en bout :

| Étape | Contenu | Prérequis |
| --- | --- | --- |
| 0 | Décisions et documentation | — **fait** |
| 1 | Squelette de l'espace : route, layout, navigation intérieure, entrée `academy` dans les deux registres, états vides qui le disent. Aucune base de données | **fait le 24 novembre 2026** — commit « feat(academy): squelette de l'espace Academy, sans donnees » |
| 2a | Hiérarchie pédagogique : programmes, matières, modules, chapitres, leçons. Migration **une table par niveau** (DEC-014) | **appliquée en base le 24 novembre 2026, contrôlée** (contrôles structurels : droits, RLS, règles d'accès, contraintes ; tests fonctionnels non faits) — commit « feat(academy): migration 2a, hierarchie pedagogique », non poussé ; détail dans l'entrée archivée du 24 novembre 2026 de `MANUAL_ACTIONS.md` ; **validation et store faits en local le 24 novembre 2026** — commit « feat(academy): validation et store de la hierarchie pedagogique » ; **routes API écrites en local le 24 novembre 2026** — commit « feat(academy): routes API de la hierarchie pedagogique » ; **routes testées à la main le 24 novembre 2026, conformes** (contrat, masquage, isolation) ; données de test supprimées le 24 novembre 2026, avec un écart (une leçon non identifiée) ; **isolation côté base vérifiée sur les cinq tables le 24 novembre 2026** ; interface à venir |
| 2b | Objectifs pédagogiques et ressources pédagogiques (reportés de l'étape 2) | 2a |
| 3 | Calendrier d'Academy : séances planifiées, agenda Google superposé en lecture | 2 |
| 4 | Notes et fiches de révision | 2 |
| 5 | Quiz, exercices, évaluations, tentatives | 2 |
| 6 | Révisions intelligentes (algorithme déterministe), progression et compétences calculées | 4, 5 |
| 7 | Service commun IA, puis Professeur IA — dont la création d'un cours à partir d'un sujet demandé (voir ci-dessous) | DEC-015 ; clé et variable d'environnement (action manuelle) ; revue de sécurité ; étape 2 (structure où ranger le cours) ; fournisseur de recherche web à choisir (critères de choix : note du 22 novembre 2026 sous DEC-015) |
| 8 | Cycle de vie des données : suppression physique propre à Academy (schéma de « Vider l'historique », journal d'effacement dédié — décidé le 22 novembre 2026, DEC-014), export | 2 à 6 |

**Journal de temps (temps actif déclaré par le porteur du projet, arrondi à la demi-heure)**

| Date | Plage déclarée | Durée | Travail |
|---|---|---|---|
| 2026-11-22 | jusqu'à 21 h (début non précisé, premier commit à 19 h 02) | environ 2 h | étape 0, audit de sécurité, clôture |
| 2026-11-24 | 9 h 30 à 12 h | 2 h 30 | CRON_SECRET, étape 1, migration 2a |
| 2026-11-24 | 14 h 30 à 15 h 30 | environ 1 h | isolation, validation, store, audit des routes |
| **Total** | | **environ 5 h 30** | |

**Estimation restante**, à la date du 2026-11-24 : environ 2 à 3 h pour la fin de l'étape 2a : tests des routes déjà écrites (commit 32c6f72), tests d'isolation à la main, interface, hors étapes 2b et 3 à 8. Estimation indicative, qui peut évoluer.

Règles du journal :

- chaque ligne est ajoutée à la fin de chaque session, avec la plage déclarée par le porteur du projet ;
- l'agent ne mesure rien : il recopie ce qui est déclaré ;
- le total est mis à jour à chaque ajout.

**Étape 2a — routes testées à la main le 2026-11-24, conformes** (serveur local, console du navigateur, par le porteur du projet) : contrat (`201` aux cinq niveaux, arbre et leçon en `200`, `401` sans session) ; masquage (module archivé : chapitre et leçon absents, `404` en écriture et en restauration ; module restauré : tout réapparaît) ; isolation entre deux comptes (`test-erase@edificeia.com` crée, `academy@edificeia.com` tente) : toutes les tentatives en `404`, malformé en `404`, JSON invalide en `400`, aucune écriture réussie. `GET /api/academy/chapters/[id]` en `405`, voulu. Données de test créées sous `test-erase@edificeia.com` (erreur de départ) : **supprimées le 24 novembre 2026, avec un écart** — 2 leçons comptées au lieu d'1, la seconde supprimée sans avoir été identifiée. Isolation côté base de `academy_units`, `academy_chapters`, `academy_lessons` : **vérifiée le 24 novembre 2026, conforme** (voir ci-dessous). Détail dans l'entrée archivée du 24 novembre 2026 de `MANUAL_ACTIONS.md`.

**Étape 2a — isolation côté base vérifiée le 2026-11-24 sur academy_units, academy_chapters et academy_lessons, conforme.** Script du SQL Editor exécuté par Vincent : chaque compte crée sa chaîne (`1 / 1 / 1`) ; les trois insertions de B sous les parents de A refusées en `23503` (`academy_units_subject_fk`, `academy_chapters_unit_fk`, `academy_lessons_chapter_fk`) ; vues croisées `0 / 0 / 0` dans les deux sens ; aucun résidu après `rollback`. Avec le test précédent, l'isolation côté base couvre les cinq tables. Restent non testées : la cascade à l'usage, et la règle d'accès en modification sur ces trois tables côté base. Détail dans l'entrée archivée du 24 novembre 2026 de `MANUAL_ACTIONS.md`.

**Étape 2a — isolation côté base vérifiée le 2026-11-24 (academy_subjects) ; routes et cascade à l'usage non testées.** Test du SQL Editor, exécuté par le porteur du projet : B ne voit ni ne modifie le programme de A, et la clé composite de `academy_subjects` refuse en `23503` un enfant de B sous le programme de A ; aucun résidu après `rollback`. Les tables `academy_units`, `academy_chapters` et `academy_lessons` ne sont pas testées individuellement. Détail dans l'entrée archivée du 24 novembre 2026 de `MANUAL_ACTIONS.md`.

**Étape 1 — constat en production, 24 novembre 2026** : après le déploiement de `2a3f82f` en production (`dpl_FAubGHeHg5TBg8GULs8aK3bR7nrc`), la page `/interface/academy` s'affiche avec son bloc « pas encore construit », et le menu principal présente une seule entrée « Academy », active sur les sous-pages. Constaté par le porteur du projet, dans le navigateur. Ce constat ne porte que sur l'interface, et sur ces deux points : aucune donnée, aucune table, aucune route API n'est concernée.

**Hors plan, décisions distinctes** : service Notifications, écriture dans Google Agenda (scope élargi), rattachement à Trajectoire (DEC-010).

**Fonctionnalité inscrite le 22 novembre 2026 — créer un cours à partir d'un sujet demandé.** Rattachée à l'**étape 7** : c'est un usage du service commun IA, au même titre que le Professeur IA, et non une capacité propre à Academy. Elle n'entre donc pas dans les hors-plan. Trois arbitrages du porteur du projet, consignés aussi sous [DEC-015](knowledge/Documentation-Technique-Code/03_Decisions.md) :

1. **Validation humaine obligatoire.** L'IA produit un brouillon de cours, présenté comme une proposition. Rien n'est enregistré en base sans validation explicite de l'utilisateur.
2. **Source : recherche sur le web, avec comparaison de plusieurs sources** avant de retenir une information, pour éviter les fausses informations. Chaque affirmation du brouillon est rattachée à ses sources, qui restent consultables au moment de la validation.
3. **Coûts et limites reportés à la création de la fonctionnalité.** Le principe « coûts et limites centralisés » de DEC-015 s'applique ; aucun plafond chiffré n'est fixé pour l'instant.

Rien n'est construit. Deux préalables découlent de ces arbitrages : la structure pédagogique de l'étape 2, dans laquelle le cours validé sera rangé ; et le choix d'un fournisseur de recherche web, nouvelle intégration tierce à documenter le moment venu, avec son coût et le moindre privilège.

**Règle de push** : toute étape qui contient une migration avec `GRANT`, `REVOKE` ou une policy reste en commit local, sans push automatique — règle permanente de `CLAUDE.md`.

**Questions ouvertes : aucune de principe — les trois sont closes le 22 novembre 2026** par le porteur du projet, notes datées sous DEC-014 et DEC-015 :

- ~~modèle de la hiérarchie~~ → **une table par niveau** : curriculum, matière, module, chapitre, leçon ;
- ~~chemin de suppression physique d'Academy~~ → **suppression logique par défaut ; suppression physique sur le schéma de « Vider l'historique » de Personnel, avec un journal d'effacement dédié**, sans modifier Personnel ;
- ~~emplacement de l'historique du Professeur IA~~ → **dans le service commun IA**, avec les appels, coûts et limites, **séparé de l'historique de l'Assistant**, sans aucun mélange.

Restent des détails de construction, rattachés à leur étape : la forme de la séparation des historiques (étape 7), l'emplacement de l'écran d'effacement et sa granularité (étape 8).

**Prochaine action concrète** : exécuter le test de modification côté base de `academy_units`, `academy_chapters`, `academy_lessons` (entrée `pending` de `MANUAL_ACTIONS.md`, écrite le 24 novembre 2026) ; interface de l'étape 2a (pages Programmes et Leçon), sur demande explicite. Isolation côté base vérifiée sur les cinq tables le 24 novembre 2026. Routes testées à la main le 24 novembre 2026, conformes. Routes écrites le 24 novembre 2026 (commit retrouvable par `git log --grep "routes API de la hierarchie"`). Validation et store poussés le 24 novembre 2026. La migration 2a est appliquée et contrôlée depuis le 24 novembre 2026. L'étape 1 est faite le 24 novembre 2026 (commit retrouvable par `git log --grep "squelette de l'espace Academy"`).

**Dettes relevées le 24 novembre 2026, non traitées** :

- **`isUuid` en quatrième copie** : `lib/academy/hierarchy.ts`, après `lib/personal/goals.ts`, `lib/personal/journal-categories.ts` et `lib/personal/data-erasure.ts`. Copie volontaire, pour qu'Academy ne dépende pas de Personnel, en pause. Le regroupement en un utilitaire partagé demande un commit dédié, qui touchera les trois copies de Personnel.
- **Message d'erreur brut des routes Objectifs** : `app/api/personal/goals/route.ts` et `app/api/personal/goals/[id]/route.ts`, comme `[id]/restore` et `[id]/permanent`, renvoient au client `error.message` dans leurs réponses `500`, donc le message brut de Postgres quand il en remonte un. Le store d'Academy ne reprend pas ce patron. Correction à faire dans un commit dédié, hors du chantier 8, Personnel étant en pause.

---

## Chantier 4 — « Vider l'historique » (Réglages > Personnel)

**Objectif** : donner au pôle Personnel un moyen d'effacer réellement des données. Ses trois modules à saisie manuelle n'implémentent que la suppression logique, par conception — c'est une lacune de souveraineté que la documentation stratégique rattache explicitement à Réglages.

**État actuel** (24 août 2026) — **les deux volets sont livrés et testés en conditions réelles.**

### Volet 1 — « Vider l'historique », à l'échelle du module

- Livré dans `6383597` : validation partagée client/serveur, store service-role, route API gardée, onglet Personnel dans Réglages, migration du journal d'audit écrite.
- Extension à Habitudes faite : les trois modules du pôle sont couverts. `ERASURE_EXCLUDED_NOTICE`, qui annonçait l'exclusion d'Habitudes, est retiré — il serait devenu faux à l'écran.
- `261c042` a scindé DEC-012 : la suppression explicite des tables dépendantes en est retirée et devient DEC-013, au statut `proposé`. `59bf997` a contraint `deleteOwnedRows` au type des tables effaçables.
- **Passage à un module à la fois** (`a014030` interface, `4fd5dc5` API) : la sélection multiple par cases à cocher est abandonnée. Une ligne et un bouton nommé par module, une confirmation dédiée, et `POST /api/personal/settings/erase` accepte `module` et non `modules`. L'échec partiel entre modules disparaît par construction.
- Documentation alignée sur ce flux dans `22299e3`.
- **Migration `20260806200000_create_personal_data_erasure_log.sql` appliquée et vérifiée en base le 2026-08-18** : grants propres (ni `anon` ni `authenticated`), et `confdeltype = c` confirmé sur `personal_habit_completions_habit_fk`.
- **Test de bout en bout fait le 2026-08-18**, par pilotage navigateur humain et non par script, sur `test-erase@edificeia.com`. Les trois modules testés séparément : suppression ciblée confirmée à chaque fois, les deux autres modules restés intacts ; journal d'audit conforme pour Habitudes (deux entrées, `personal_habit_completions` = 8 puis `personal_habits` = 2) ; zéro réalisation orpheline.

### Volet 2 — Suppression individuelle d'un élément archivé

Geste distinct, rangé en **sous-cas du troisième geste canonique** dans `11-modularite-configuration.md` — pas un sixième geste.

- `d6d0108` : garde DEC-007 posé sur la route d'effacement, qui ne portait que `getCurrentUser()`.
- `cc76f38` : socle serveur — helper partagé `authorizeCockpitApiAccess()`, table `personal_item_erasure_log`, `permanentlyDeletePersonalItem` sous filtre triple (`id` + `user_id` + `deleted_at is not null`), et les trois routes `DELETE /api/personal/{notes,journal,habits}/[id]/permanent`.
- `a137fc0` : interface et documentation — bouton « Supprimer définitivement » dans les trois cartes Archives, confirmation binaire avec aperçu identifiable, `completionCount` sur `ArchivedPersonalHabit`.
- Migration `20260818100000_create_personal_item_erasure_log.sql` appliquée **au plus tard le 2026-08-20, date exacte non établie**. `cc76f38` (2026-08-20, 10:11) l'affirme appliquée et vérifiée le 2026-08-18, mais `5951773`, dix-neuf minutes plus tôt, ouvrait l'entrée `MANUAL_ACTIONS.md` correspondante au statut `pending` : les deux ne peuvent pas être vraies ensemble, et « 2026-08-18 » peut n'être que l'horodatage du nom de fichier. Cette ligne reprenait la date de `cc76f38` jusqu'au 2026-09-14. Voir l'entrée archivée du 2026-08-18 dans `MANUAL_ACTIONS.md`.
- **Test de bout en bout validé le 2026-08-24** sur `test-erase@edificeia.com`, par pilotage navigateur humain. Les trois modules testés séparément, et les trois cas limites du jeu de test confirmés : troncature de l'aperçu à 80 caractères sur une note longue, désambiguïsation par date et humeur entre deux entrées de journal commençant à l'identique, et compte de réalisations propre à l'habitude visée.

  Corroboré en base : `personal_item_erasure_log` porte **trois entrées** le 2026-08-24, une par module, avec `related_deleted_count` à 0 pour Notes et Journal et à **3** pour Habitudes — soit le compte de l'habitude supprimée, et non le total de 8 réalisations du compte. Zéro réalisation orpheline après coup.

**Points de vigilance connus, non corrigés** — identiques sur les deux volets, même cause, même arbitrage non pris :

- **suppression puis journalisation, sans atomicité.** Si l'écriture d'audit échoue, la suppression a déjà eu lieu et l'entrée manque.
- **échec partiel à l'intérieur d'un élément à table dépendante.** Si le `DELETE` de l'habitude échoue après celui de ses réalisations, `permanentlyDeletePersonalItem` renvoie `null` et la route répond `404` — trompeur, puisque des données ont été détruites.

Rendre l'un ou l'autre atomique demanderait une fonction Postgres `security definer`.

**Piège de nommage relevé, non corrigé** : les trois panneaux portent un état `confirmingDeleteId` qui désigne la confirmation d'**archivage**, hérité du renommage « Supprimer » → « Archiver » du 2026-08-09. Le nouvel état s'appelle `confirmingPermanentId`, et `PersonalHabitsPanel` utilise déjà `confirmingArchiveId` — l'incohérence est donc aussi entre les fichiers.

**Prochaine action concrète** : aucune sur le périmètre livré. Restent ouverts, hors de ce chantier : l'**export complet des données** et la **suppression totale** (compte, autres pôles), les deux capacités de souveraineté que la vision rattache à Réglages et qui ne sont toujours pas couvertes.

---

## Chantier 1 — Module Personnel/Vitals (intégration Garmin)

> **En pause depuis le 22 novembre 2026**, avec le pôle Personnel — [DEC-014](knowledge/Documentation-Technique-Code/03_Decisions.md). Le contenu ci-dessous date du 28 juillet 2026 et n'est pas re-vérifié.

**Objectif** : croiser les données de forme physique (sommeil, récupération, HRV) avec Trajectoire pour proposer chaque jour un ordre de priorité des actions selon la forme réelle.

**État actuel** :
- Étapes 1-4 faites et testées en mock : doc, migrations, OAuth Garmin, moteur de calcul du brief quotidien (champ `effort_level` ajouté à `trajectoire_actions`).
- Étape 5 (cron quotidien) **committée et poussée** dans `195aced` (15 juillet 2026), avec l'OAuth Garmin et le moteur de brief. La mention « pas encore committée » de la version précédente de ce document était périmée.
- Ce qui reste non committé aujourd'hui est un volet distinct : `lib/server/personal/daily-briefs-store.ts` (modifié) et `app/api/personal/` (non suivi), délibérément laissés hors de git par `227fb7a` tant que le store et la route ne sont pas prêts.
- Étape 6 (UI) pas commencée.
- Blocage externe : le formulaire Garmin Connect Developer Program est cassé côté Garmin (page "under construction"), sans date de réouverture. Terra API et Spike API écartées (trop chères, B2B par utilisateur actif). Piste actuelle : Health Auto Export (iOS) → webhook, en cours de test vers webhook.site pour voir le format réel des données. Ne couvrira probablement pas Body Battery/Stress (propriétaires Garmin) — un score de récupération maison est prévu en remplacement.

**Prochaine action concrète** : lancer la revue de sécurité dédiée au module cron pour débloquer le commit des étapes 3-5. En parallèle, terminer le test webhook.site avec Health Auto Export pour valider le format de données réel.

---

## Chantier 2 — Audit de sécurité — CLOS LE 22 NOVEMBRE 2026, SOUS RÉSERVE TIKTOK

**Objectif** : corriger les failles trouvées par une revue de code indépendante sur les connexions OAuth en production (TikTok, Meta, YouTube).

**État actuel** :
- Lot 1 (authentification + state OAuth lié à l'utilisateur sur toutes les routes, upload TikTok protégé) : fait, committé et **poussé** (`985d919`, présent dans `origin/main` — vérifié le 28 juillet, `main` et `origin/main` alignés). La mention « pas encore poussé » de la version précédente était périmée.
- Lot 2 (isolation `content_assets`) : policies RLS réécrites et committées (`aeaec7a`, 21 juillet, dans `origin/main`). **Application en base non vérifiée** — voir `MANUAL_ACTIONS.md`.
- Lot 3 (routes Instagram/Pinterest sans authentification) : fait (`13a5145`, 21 juillet, dans `origin/main`). Les 9 routes portent le garde complet, vérifié le 28 juillet.
- Gating des modes debug/test : en place sur tous les providers, vérifié le 28 juillet.
- Re-audit du 28 juillet (`2cf9316`, **local, non poussé**) : six routes API répondaient encore sans session, dont `/api/oauth/youtube/status` et `/api/oauth/calendar/status` qui rafraîchissaient le token stocké et renvoyaient l'identité de la chaîne YouTube / de l'agenda principal. Plus l'OAuth Garmin, oublié du Lot 1 : `start` sans authentification et état PKCE non lié à un utilisateur. Corrigés, documentés en DEC-007.

> ⚠️ **Les deux actions ci-dessous sont faites ; elles sont conservées pour l'historique.** Re-vérification du 22 novembre 2026, ci-après.

**Prochaine action concrète** : relire `2cf9316` puis pousser. Ensuite, vérifier dans le SQL Editor Supabase que les policies RLS `content_assets` sont réellement appliquées — c'est le dernier point du Lot 2 qui ne peut pas être clos depuis le dépôt, et tant qu'il ne l'est pas, la table peut encore être en `using(true)` en production.

### Re-vérification du 22 novembre 2026 — clôture NON établie

Faite pour lever le préalable de sécurité avant le chantier 8. Elle distingue ce que l'agent a **constaté** de ce qui n'est que **consigné**.

**Constaté par l'agent, ce jour, contre git et le code** :

- `985d919` (Lot 1, 2026-07-15), `13a5145` (Lot 3, 2026-07-21), `aeaec7a` (Lot 2, policies, 2026-07-21) et `2cf9316` (re-audit, 2026-07-28) sont tous contenus dans `origin/main` (`git branch -r --contains`). « Relire `2cf9316` puis pousser » est donc fait ; la relecture elle-même n'a laissé aucune trace écrite ;
- la migration corrective de la policy de suppression, `20260728210000_scope_content_assets_delete_policy_to_owner.sql`, est présente dans `supabase/migrations` ;
- sur les 88 fichiers `route.ts` suivis par git sous `app/api`, **87 portent un motif de garde** — `authorizeCockpitApiAccess`, `getCurrentUser`, `canAccessPrivateCockpit`, ou une validation de secret. Le seul sans motif est `/api/health`, exception documentée par DEC-007. Limite : c'est une recherche de motif, pas une relecture ; elle prouve la présence d'un garde, pas sa justesse. Le seul fichier de route non suivi, `app/api/personal/daily-brief/route.ts`, n'est pas déployé ;
- `main` et `origin/main` pointent sur le même commit (`1ecaf85`) : `be07b02`, que le chantier 7 demandait de ne pas pousser sans demande explicite, est **déjà dans `origin/main`**. Qui l'a poussé, et à quelle date, n'est pas établi depuis le dépôt.

**Consigné, non re-vérifiable par l'agent** — pas d'accès SQL à la base :

- la vérification `content_assets` du 2026-07-28 (entrée archivée de `MANUAL_ACTIONS.md`) : policies resserrées, et une policy `_delete` hors migrations, en `qual = true`, trouvée puis corrigée. Le résultat est détaillé et daté, mais il date de près de quatre mois ;
- le gating des modes debug sur tous les providers, déclaré vérifié le 28 juillet, non re-vérifié depuis.

**Ce qui empêche de déclarer l'audit clos** :

1. **aucun critère de clôture n'a jamais été écrit.** [13-securite-gouvernance.md](knowledge/Documentation-Strategique/Markdown/13-securite-gouvernance.md) parle d'« un audit complet en cours » sans en fixer le périmètre ; ce chantier liste des lots, pas une condition de fin ;
2. **quatre policies `{public}` sur `content_drafts`, absentes des migrations, au contenu non consigné** (chantier 7). Elles sont inatteignables pour `anon` et `authenticated` depuis la révocation, mais personne ne sait ce qu'elles filtrent. C'est le même motif que la policy `_delete` de `content_assets` — un objet de sécurité créé hors migrations ;
3. **deux tables non identifiées** dans l'écart de décompte de la revue de moindre privilège (chantier 7) ;
4. **la base a déjà divergé des migrations deux fois.** Une vérification de quatre mois ne prouve pas l'état présent.

**Résiduel connu, à accepter ou traiter par décision** — ce n'est pas une faille ouverte, mais aucun n'a de date de fin : l'exception de garde de `/api/oauth/tiktok/status`, avec une entrée `pending` depuis le 2026-08-01 ; les gardes écrits à la main sur les routes Calendrier ; l'absence de `/api/personal` dans `reviewerBlockedPrefixes`, défense en profondeur seulement ; les deux limites de vérification du chantier 7.

**Ce qu'il faut pour clore** : les contrôles en lecture seule de l'entrée `pending` du 22 novembre 2026 dans `MANUAL_ACTIONS.md`, qui couvrent les points 2 à 4 ; puis une décision écrite du porteur du projet qui fixe le critère du point 1 et statue sur le résiduel. **Tant que ce n'est pas fait, le développement fonctionnel reste bloqué**, chantier 8 compris — [02-strategie-produit.md](knowledge/Documentation-Strategique/Markdown/02-strategie-produit.md).

**Contrôles SQL du 22 novembre 2026 — faits.** Exécutés par le mainteneur, comparés par l'agent aux migrations ; résultats détaillés dans l'entrée archivée « Contrôles de clôture de l'audit de sécurité » de `MANUAL_ACTIONS.md`. Points 2 à 4 ci-dessus :

- **point 2 levé** : les quatre policies `{public}` de `content_drafts` sont restreintes au propriétaire (`auth.uid() = user_id`) et inatteignables. Pas une fuite. Non versionnées : supprimées par la migration corrective ;
- **point 3 levé** : les deux tables non identifiées sont `project_memory` et `project_memory_audit_log`, qui n'ont aucun privilège client par construction ;
- **point 4 levé pour les privilèges et RLS** : les dix-huit lignes de privilèges `authenticated` sont chacune identiques au dernier `grant` de leur migration ; aucun privilège `anon` ni `PUBLIC` ; aucune table sans RLS ;
- **un écart réel trouvé** : `pinterest_pins_authenticated_select`, `using (true)`, plus `SELECT` accordé à `authenticated`. Versionné (`20260605110000`) mais contraire à `13-securite-gouvernance.md` : tout compte connecté, reviewer compris, lit toutes les épingles par l'API REST. Aucun code n'utilise ce privilège — les trois fichiers qui lisent la table passent par la clé service-role. Corrigé par `20261122100000_restrict_pinterest_pins_and_drop_unversioned_content_drafts_policies.sql`, écrite le 22 novembre 2026 et **appliquée en base le même jour** : plus aucune policy ni aucun privilège client sur `pinterest_pins`, `content_drafts` réduite à ses quatre policies versionnées, pages Pinterest affichées sans erreur. Détail dans l'entrée archivée « Appliquer la migration 20261122100000 » de `MANUAL_ACTIONS.md`.

**Reste pour clore** : la décision écrite du porteur du projet — point 1 (critère de clôture) et sort du résiduel connu. Entrée `pending` « Décider de la clôture de l'audit de sécurité » dans `MANUAL_ACTIONS.md`, qui rassemble les faits.

### Décision de clôture — rédigée le 22 novembre 2026 : AUDIT NON CLOS

Rédigée par l'agent à la demande du porteur du projet, sur la base des vérifications ci-dessous, faites en **lecture seule dans le code** le 22 novembre 2026. Aucune n'a été supposée ; chacune cite sa preuve.

**Vérifications préalables**

| Point | Vérifié | Preuve | Écart |
| --- | --- | --- | --- |
| a) Routes Calendrier écrites à la main : refus du reviewer | Oui | `app/api/oauth/calendar/status/route.ts:16-19` et `register-channel/route.ts:23-25` : `getCurrentUser()` + `canAccessPrivateCockpit` → **`403`**. `callback/route.ts:44-49` : même test → **redirection** vers le retour Connexions avec `connected=false`, avant tout échange de code, donc aucun jeton écrit. Le middleware redirige en amont le reviewer sur tout `/api/oauth/*` hors TikTok (`src/lib/supabase/proxy.ts:17-29`). `webhooks/calendar/route.ts:16,28,43` : secret entrant comparé par `timingSafeEqual`, `401`. `internal/cron/calendar-channel-renewal/route.ts:22-30,165` : `CRON_SECRET`, `401` | **Forme** : le callback redirige au lieu de répondre `403`, ce qui est l'usage d'un callback OAuth navigateur ; refus effectif. **Fond, hors des cinq points** : la route cron compare le secret par `===` (`:30`), pas à temps constant — voir plus bas |
| b) Atelier de contenu : clé service-role seule | Oui | Les **13 fichiers** qui appellent `.from()` sur `content_drafts` ou ses trois tables liées créent tous un client service-role, par exemple `lib/server/content-workshop.ts:377`, `lib/server/media-pipeline.ts:317`, `lib/server/voice-pipeline.ts:59`, `lib/server/subtitle-pipeline.ts:118`, `lib/server/video-preparation.ts:102`, `lib/server/video-renderer.ts:83`, `lib/server/shorts-publication.ts:228`, `lib/server/shorts-scheduling.ts:110`, `lib/server/content-assets.ts:100`, `lib/server/cost-tracking.ts:134`, `lib/server/publication-performance.ts:196`, `lib/server/trajectoire.ts:242`, `lib/server/cockpit/read-only-state.ts:59`. Aucun n'importe le client de session ni le client navigateur. Les autres mentions des noms de table sont des chaînes de caractères : `lib/server/assistant-actions/shorts.ts:1098-1100`, `lib/server/assistant-workflows/engine.ts:521`, `lib/short-workflow.ts:322,341`, `app/api/content-workshop/drafts/[id]/route.ts:137`, `.../media/route.ts:76`, `ContentWorkshopClient.tsx:2552`. Les deux routes API n'importent que `getCurrentUser` | Aucun |
| c) `/api/oauth/tiktok/status` : ni jeton ni identifiant | Oui | `app/api/oauth/tiktok/status/route.ts:37-43` renvoie `getOAuthTokenStatus("tiktok")` ; `lib/server/oauth/token-store.ts:433-439`, unique `return` de la fonction : `{ present, storageEnabled: true, storageMode: "supabase", expiresAt, updatedAt }`. Le jeton est lu (`:409`) mais seul `Boolean(data?.access_token)` en sort (`:425`). En cas d'erreur, la fonction lève une exception au message générique (`:421-423`) | Aucun |
| d) État de la review TikTok | Non établi | `MANUAL_ACTIONS.md`, entrée `pending` du 2026-08-01 : l'état ne se lit que dans le portail développeur TikTok. Aucune trace de fin de review dans `MANUAL_ACTIONS.md` ni dans ce fichier | La review **n'est pas connue comme terminée**, donc l'exception reste acceptable sous sa condition de sortie. Si elle est terminée, l'exception doit être levée |

**Critère de clôture retenu** : chaque route API porte un garde, sauf les exceptions documentées (`/api/health`).

**Les cinq points résiduels**

1. **Exception de garde `/api/oauth/tiktok/status`** — *accepté avec raison* : aucun accès anonyme ; l'écart avec le garde strict est un seul rôle, contrôlé par le projet ; la réponse ne contient ni jeton ni identifiant (point c). L'acceptation vaut **tant que la review TikTok n'est pas terminée**. Sa fin déclenche le durcissement décrit dans l'entrée `pending` du 2026-08-01.
2. **Gardes des routes Calendrier écrits à la main** — *accepté avec raison* : `status` et `register-channel` répondent `403` au reviewer, `callback` le refuse par redirection avant tout échange de jeton (point a). L'écart avec `authorizeCockpitApiAccess()` est de forme : distinction `401`/`403`, factorisation.
3. **`/api/personal` absent de `reviewerBlockedPrefixes`** — *accepté avec raison* : les 25 routes suivies sous `/api/personal` passent toutes par `authorizeCockpitApiAccess()`, qui répond `403` au reviewer (vérifié le 22 novembre 2026). Le préfixe dans le middleware ne serait qu'une défense en profondeur.
4. **Deux limites de vérification du chantier 7** — *accepté avec raison* : le refus attendu sur les cinq tables échoue de façon fermée, et aucun code n'émet ces requêtes ; l'Atelier de contenu n'accède à ses tables que par la clé service-role (point b), que la révocation n'a pas touchée.
5. **Gating des modes debug** — *accepté avec raison* : revérifié le 22 novembre 2026, les paramètres `debug=1` et `mode=test` des routes OAuth génériques exigent une session et `canAccessPrivateCockpit` (`app/api/oauth/[provider]/start/route.ts:57-61` pour les providers à state signé, `:81-86` pour les autres ; `callback/route.ts:40-46`). Une seule branche n'est pas gardée : `callback/route.ts:41` exempte `youtube` du contrôle en mode debug. Elle est **inatteignable** — la route statique `app/api/oauth/youtube/callback/route.ts` prime sur le segment dynamique `[provider]` —, et le contenu qu'elle renverrait ne porte que des booléens et un message (`:28-38`). Code mort à retirer à l'occasion, sans exposition. Les routes de test Instagram, Pinterest, YouTube et TikTok portent le garde complet. Les deux routes de démo sont réservées aux rôles reviewer et admin, en `dryRun` obligatoire.

**Écart révélé par les vérifications** — hors des cinq points. **Traité le 22 novembre 2026**, voir ci-dessous :

- **Comparaison du `CRON_SECRET` en `===`, et non à temps constant**, sur les trois routes cron : `app/api/internal/cron/calendar-channel-renewal/route.ts:30`, `process-scheduled-publications/route.ts`, `personal-daily-brief/route.ts`. [DEC-007](knowledge/Documentation-Technique-Code/03_Decisions.md) admet une route sans session à condition qu'elle valide un secret entrant **à temps constant** — ce que fait `webhooks/calendar` avec `timingSafeEqual`, et pas ces trois routes. Chacune porte bien un garde, et le critère de clôture est donc rempli à la lettre. Mais l'écart avec la décision du dépôt est réel. Le risque pratique est faible — attaque temporelle à distance sur un secret long —, ce qui relève d'une décision, pas d'une supposition.

**Traitement — 22 novembre 2026** : *traité*, par le commit « fix(securite): comparer le CRON_SECRET a temps constant dans les trois routes cron ». Le hash n'est pas inscrit ici : un commit ne peut pas contenir son propre hash ; il se retrouve par `git log --grep "CRON_SECRET a temps constant"`. Un helper unique, `isCronRequestAuthorized` (`src/lib/auth/cron-auth.ts`), compare les deux en-têtes acceptés par `timingSafeEqual`, après une vérification de longueur, et sans court-circuit entre les deux comparaisons. Les trois routes cron l'appellent, et la sémantique d'acceptation est inchangée : `Authorization: Bearer <secret>` ou `x-cron-secret: <secret>`, refus si `CRON_SECRET` est absent ou vide. Tests : `npm run cron:auth:check` (nouveau) et `npm run personal:daily-brief:cron:check` (existant) passent. Limite assumée : la vérification de longueur révèle si la longueur proposée est la bonne, rien du contenu. **Non poussé** : code de `app/api/internal/**`, règle permanente de `CLAUDE.md`.

*La déclaration ci-dessous est celle du 22 novembre 2026, rédigée avant ce traitement ; elle est conservée telle quelle. La déclaration de clôture fera l'objet d'une décision séparée, une fois ce commit vérifié.*

**Déclaration : audit non clos, il manque :**

- **une décision sur la comparaison du `CRON_SECRET`** des trois routes cron : soit *acceptée avec raison*, soit *traitée*, par passage à `timingSafeEqual` sur le patron de `app/api/webhooks/calendar/route.ts:10-17`, avec une échéance. Le traitement est une modification de code dans `app/api/internal/**`, donc du code sensible : commit local, sans push automatique.

Dès que ce point est tranché, la déclaration devient « audit clos » à la date de la décision, les cinq points résiduels étant tous acceptés avec raison ci-dessus. L'étape 1 d'Academy reste ensuite soumise à une validation explicite.


### Déclaration de clôture — 22 novembre 2026 : AUDIT CLOS

*Déclaration du porteur du projet, reportée ici mot pour mot. Elle remplace la déclaration « non clos » de la section précédente, conservée pour l'historique.*

**Date** : 2026-11-22

**Critère retenu** : chaque route API porte un garde d'authentification, sauf les exceptions documentées (`/api/health`) ; aucun droit client n'est accordé à `anon` ni à `PUBLIC` ; aucune table du schéma `public` n'est sans RLS ; aucune règle d'accès n'est ouverte ; un secret entrant est comparé à temps constant (DEC-007).

**Contrôles effectués** :

- Contrôles SQL en lecture seule : droits conformes aux migrations, aucun droit `anon` ou `PUBLIC`, aucune table sans RLS.
- Migration `20261122100000` (commits locaux `91cbfda` et `d3a6427`) : règle ouverte sur `pinterest_pins` retirée ; quatre règles non versionnées sur `content_drafts` retirées. Appliquée en base par le porteur du projet.
- Comparaison du `CRON_SECRET` à temps constant dans les trois routes cron (commit local `3e2047e`). Tests et build passent en isolation.

**Points résiduels** :

1. Exception de garde sur `/api/oauth/tiktok/status` : acceptée avec raison. Aucun accès anonyme, un seul rôle concerné, aucun jeton ni identifiant dans la réponse. Elle reste acceptable tant que la revue TikTok n'est pas terminée ; elle sera durcie à la fin de la revue (entrée en attente du 2026-08-01).
2. Gardes des routes Calendrier écrits à la main : acceptés avec raison. Refus effectif du reviewer, forme différente (redirection au lieu de 403 sur le callback).
3. `/api/personal` hors de la liste de blocage du middleware : accepté avec raison. Les 25 routes refusent le reviewer dans leur propre code (`authorizeCockpitApiAccess`, 401 sans session, 403 pour le reviewer).
4. Deux limites de vérification du chantier 7 : acceptées avec raison. Le refus attendu sur les tables concernées échoue de façon fermée, et aucun code n'émet ces requêtes.
5. Modes debug et test : traité. Revérifié le 2026-11-22 : les routes OAuth exigent une session et `canAccessPrivateCockpit`, les routes de démo sont réservées aux rôles reviewer et admin en `dryRun`.

**Constat annexe** : la branche debug YouTube de `[provider]/callback/route.ts` est du code mort, la route dédiée étant appelée à sa place. Consigné, non modifié.

**Dette YouTube — détail, 24 novembre 2026** (signalée, non traitée) :

- la condition `if (provider.key !== "youtube")` de `app/api/oauth/[provider]/callback/route.ts`, ligne 41, dispense YouTube du contrôle d'accès en mode debug ;
- cette branche ne s'exécute jamais : la route dédiée `app/api/oauth/youtube/callback/route.ts` passe avant la route générique `[provider]` ;
- elle ne renverrait de toute façon que des booléens et un message ;
- son retrait est une modification de code, à faire dans un commit séparé et validé.

**Déclaration : audit clos au 2026-11-22, sous réserve de l'exception TikTok, qui doit être réexaminée à la fin de la revue.**

**Ce que la clôture ne couvre pas** — note de l'agent, pour que la portée de la déclaration ne soit pas relue plus large qu'elle n'est : les commits `91cbfda`, `d3a6427` et `3e2047e` sont **locaux, non poussés**. La migration est appliquée en base, mais le correctif du `CRON_SECRET` n'est pas déployé tant que `3e2047e` n'est pas poussé : en production, les trois routes cron comparent encore le secret par `===` jusqu'au prochain déploiement. Le push relève de la règle permanente de `CLAUDE.md` : décision humaine explicite.


### Suivi du 24 novembre 2026 — `CRON_SECRET` absent en production, créé et redéployé

*Hors du périmètre de la déclaration de clôture : ce point est fonctionnel, pas une faille. Il ne rouvre pas l'audit.*

- **Constat** : le 24 novembre vers 08:52 UTC, aucune variable `CRON_SECRET` dans le projet Vercel, parmi 31 variables, sans valeur de production masquée. Les trois routes cron refusent tout appel sans ce secret, et Vercel Cron n'envoie pas d'en-tête sans lui : **les appels de Vercel Cron recevaient vraisemblablement tous `401`**. Les publications programmées ne partaient donc pas, et le renouvellement des canaux de l'agenda ne se faisait pas. Ce n'est pas une régression de `3e2047e` : l'ancien code se comportait de même. **Depuis quand, non établi.**
- **Correction** : variable créée par le porteur du projet (Production seulement, vers 08:58 UTC), puis production redéployée à l'identique : `dpl_HHRwrtnSNBpwNjfGWttzKvmBQoxE`, commit `712ec92`, `READY` sur `www.edificeia.com`. Sans secret, les trois routes répondent toujours `401`.
- **Vérifié le 24 novembre 2026** : **Run** sur `calendar-channel-renewal` lancé par le porteur du projet, réponse **`200`** lue dans les logs Vercel. Le vrai secret est accepté par le nouveau code. Seule cette route a été exercée ; les deux autres partagent le même helper et la même variable. Entrée archivée du 24 novembre 2026 dans `MANUAL_ACTIONS.md`.
- **Créneaux du 23 et du 24 novembre** : aucune trace consultable (rétention d'une heure sur l'offre Hobby, aucun code HTTP dans les logs accessibles à l'agent). Aucun succès n'en est déduit.
- **Vigilance** : première exécution avec un secret valide de `process-scheduled-publications` le 25 novembre à 02:00 UTC. Elle publiera d'un coup tout ce qui est programmé et dont l'heure est passée.


### État de la vérification du `CRON_SECRET` — 24 novembre 2026

*Ce qui est observé, et rien de plus. Cette entrée ne dit pas que les crons sont vérifiés en production.*

- **Variable** : `CRON_SECRET` créée en production le 24 novembre 2026. Sa valeur n'est pas consignée.
- **Refus sans secret** : le déploiement en ligne, `dpl_CwoNKvVD9pJerVmkyzVnbFsQSHZa` (commit `36f3f6e`), répond **`401`** sans secret sur les trois routes cron. Constaté par l'agent le 24 novembre.
- **Acceptation du vrai secret** : un **Run** sur `calendar-channel-renewal` a répondu **`200`**. Ce Run a été lancé par le porteur du projet sur le **déploiement précédent**, `dpl_HHRwrtnSNBpwNjfGWttzKvmBQoxE` (commit `712ec92`) : il est antérieur à `dpl_CwoNK…`, créé par le push de sa propre consignation. **Il n'a pas été refait sur `dpl_CwoNK…`.** Les deux déploiements portent le même code de route et ont été construits après la création de la variable ; cela reste une déduction, pas une observation.
- **Appels planifiés** : **aucun n'a été vérifié.** Les logs de l'offre Hobby ne conservent qu'une heure, et les appels des 22 au 24 novembre n'ont aucune trace consultable. La vérification d'un créneau planifié est **reportée, sans date**.
- **`process-scheduled-publications`** n'a jamais été appelée avec le vrai secret, volontairement : elle publie réellement sur Instagram.

**Constat ajouté le 24 novembre 2026, même jour** : un **Run** sur `calendar-channel-renewal`, avec le vrai secret envoyé par Vercel, répond **`200`** sur le déploiement en ligne `dpl_CwoNKvVD9pJerVmkyzVnbFsQSHZa` (commit `36f3f6e`). Run lancé par le porteur du projet, résultat transmis à l'agent. Ce constat ne couvre que `calendar-channel-renewal` : les deux autres routes cron ne sont pas testées avec le vrai secret, et les appels planifiés restent non vérifiés.

---

## Chantier 5 — Mise en conformité DEC-007 sur `/api/personal/` — TERMINÉ

**Objectif** : poser `canAccessPrivateCockpit` sur les routes du pôle Personnel qui ne portaient que `getCurrentUser()`. DEC-007 pose ce garde comme défaut, pas comme option.

**État** : **fait le 2026-08-24.** Les dix routes du périmètre sont converties, soit **17 handlers**. Avec les quatre routes déjà conformes (`settings/erase` et les trois `[id]/permanent`), **les quatorze fichiers de route sous `/api/personal/` passent désormais par `authorizeCockpitApiAccess()`** — vérifié par grep : plus aucun appel à `getCurrentUser()` ne subsiste sous ce chemin, hors Vitals.

Détail des dix routes converties :

| Route | Handlers |
| --- | --- |
| `notes/route.ts` | GET, POST |
| `notes/[id]/route.ts` | PATCH, DELETE |
| `notes/[id]/restore/route.ts` | POST |
| `journal/route.ts` | GET, POST |
| `journal/[id]/route.ts` | PATCH, DELETE |
| `journal/[id]/restore/route.ts` | POST |
| `habits/route.ts` | GET, POST |
| `habits/[id]/route.ts` | PATCH, DELETE |
| `habits/[id]/completions/route.ts` | POST, DELETE |
| `habits/[id]/restore/route.ts` | POST |

**Le point de vigilance est levé, et il l'est par constat, pas par confiance.** Les dix routes portaient un garde rigoureusement identique — `getCurrentUser()`, puis `if (!user)` renvoyant `NextResponse.json({ error: "Acces refuse." }, { status: 401 })`. Le helper renvoie la même charge utile et le même statut, au caractère près. **Aucun appelant non authentifié ne voit son comportement changer sur aucune des dix routes.** Le seul changement observable est l'ajout du `403` pour le rôle reviewer, qui est l'objet même de la mise en conformité.

Aucune divergence n'a été trouvée entre les dix routes : ni message différent, ni statut différent, ni logique intercalée entre l'appel et le test. Chaque fichier n'importait `getCurrentUser` que pour ce garde, ce qui a rendu la substitution mécanique.

**Hors périmètre, inchangé** : `daily-brief/route.ts` (Vitals en pause, non suivi par git) n'est pas touché. Le corriger reviendrait à modifier du travail délibérément laissé hors de l'index — à traiter avec le volet Vitals.

**Reste ouvert, hors de ce chantier** : le middleware ne couvre toujours pas `/api/personal` dans `reviewerBlockedPrefixes`. Ajouter ce préfixe serait une défense en profondeur, non un remplacement du garde en route, qui est désormais posé partout. C'est une modification du middleware, donc une décision distincte.

---

## Chantier 6 — Privilèges hérités du défaut de schéma — TERMINÉ

**Chantier imprévu**, ouvert le 24 août 2026 et clos le 30 août 2026.

**Origine** : découvert en exécutant les contrôles post-application de la migration `personal_tasks` (`ef48ede`). Le contrôle des grants a montré `authenticated` en possession de **tous** les privilèges — `SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER` — alors que la migration n'accordait que les trois premiers. C'est le contrôle lui-même qui a révélé le problème : sans lui, la table serait passée pour conforme.

**Cause** : le projet Supabase porte deux `ALTER DEFAULT PRIVILEGES`, posés par `postgres` et `supabase_admin`, qui accordent `arwdDxtm` à tous les rôles sur toute nouvelle table du schéma `public`. Les cinq migrations du pôle Personnel écrivaient `revoke all ... from anon` puis `grant select, insert, update ... to authenticated`, **sans jamais révoquer côté `authenticated`**. Or un `grant` est additif : il ajoute des privilèges, il n'en retire aucun. Le `grant` était donc un no-op, et le commentaire qui l'accompagnait — « pas de delete dans ce grant, délibérément » — décrivait l'intention, jamais l'effet.

Le défaut remonte à `personal_notes` (2026-08-04), première migration du pôle ; les quatre suivantes l'ont recopié fidèlement. **Les cinq tables du pôle n'étaient pas les seules du dépôt dans ce cas.** D'après les migrations, sur les vingt-six autres tables existant alors, quinze révoquaient `from authenticated` avant d'accorder et **onze ne le faisaient pas** : `content_drafts` et ses trois tables liées, les trois tables `trajectoire_*`, les deux tables `personal_calendar_*`, `personal_daily_briefs` et `personal_garmin_daily_stats`. Ce chantier n'en a corrigé que cinq. Neuf des onze relèvent du chantier 7 ; les deux dernières restent ouvertes.

**Ce qui n'était pas cassé, et c'est important pour calibrer la gravité.** Aucune suppression physique n'a jamais été possible. Vérifié par **test négatif réel** le 2026-08-24 : avec un vrai JWT `authenticated` obtenu par lien magique, un `DELETE` sur une ligne appartenant à l'utilisateur renvoie **0 ligne supprimée sans erreur de privilège** — signature exacte d'un privilège accordé et d'une policy absente. La protection tenait, mais par **une seule couche** au lieu des deux annoncées partout dans la documentation. C'est précisément la configuration qui a rendu l'incident `content_assets` du 2026-07-28 exploitable le jour où cette couche unique est tombée.

**Portée du correctif** :

- `20260824110000` — les cinq tables passent par `revoke all ... from anon, authenticated` puis re-grant de l'ensemble voulu. Méthode exhaustive par construction, préférée à une énumération des privilèges à retirer : `MAINTAIN` (le `m` de `arwdDxtm`) n'existe que depuis PostgreSQL 17 et aurait été oublié, cette base tournant en 17.6.
- **Exception conservée** : `personal_habit_completions` garde `DELETE`, intentionnel depuis `20260806100000` et doublé d'une policy scopée au propriétaire. Elle perd en revanche `UPDATE`, qu'elle n'a jamais dû avoir — une réalisation n'a aucun champ modifiable.
- `20260824120000` — le défaut du schéma pour le rôle `postgres` ne concède plus rien à `anon` ni `authenticated`. Choix d'un défaut **vide** plutôt que `select/insert/update` : trois privilèges par défaut resteraient faux pour toute table qui ne doit rien exposer, et les journaux d'audit `personal_data_erasure_log` et `personal_item_erasure_log` sont exactement dans ce cas. Aucune migration du dépôt ne dépendait du défaut.

Les deux migrations sont **appliquées et vérifiées en base le 2026-08-30** — leur horodatage de nom porte `0824`, jour de la découverte, et non celui de leur écriture : grants conformes sur les cinq tables, une seule policy `DELETE` dans tout le pôle et correctement scopée, défaut de schéma vidé pour `postgres`.

**Limite connue, non corrigeable depuis le dépôt** : le second `ALTER DEFAULT PRIVILEGES`, posé par **`supabase_admin`**, reste hors de portée. Le modifier exige d'être `supabase_admin` ou superutilisateur ; le SQL Editor s'exécute en `postgres`. Une table créée par l'outillage interne de Supabase — pas par une migration du dépôt — hérite donc encore du blanc-seing. La commande est consignée en commentaire dans `20260824120000` si un accès superutilisateur devient disponible. À défaut, le garde-fou reste la discipline de migration : révoquer explicitement avant d'accorder.

**Effet de bord assumé** : une table créée depuis le Table Editor du dashboard ne sera plus lisible par l'API tant qu'un `grant` explicite n'aura pas été posé.

**Ce que ce chantier apprend, au-delà du correctif** : un commentaire de migration qui énonce une garantie ne la produit pas. Ceux du pôle décrivaient correctement la règle — « il faudrait ajouter à la fois le privilège et une policy » — tout en omettant l'instruction qui l'aurait rendue vraie. Seul un contrôle exécuté contre la base l'a montré, vingt jours plus tard.

**Prochaine action concrète** : aucune sur le périmètre des cinq tables. Le contrôle des grants doit rester dans les entrées `MANUAL_ACTIONS.md` des futures migrations — c'est lui qui a trouvé ce défaut. Le même défaut sur les autres tables est traité au chantier 7.

---

## Chantier 7 — Privilèges hérités sur neuf tables service-role — MIGRATION APPLIQUÉE, POINTS OUVERTS

**Chantier imprévu**, ouvert le 28 septembre 2026, prolongement direct du chantier 6.

**État** — migration écrite et committée le 2026-09-29 (`be07b02`), **appliquée en base et vérifiée**, compte rendu du 2026-10-04. **La date d'application n'est pas établie** : un `revoke` exécuté dans le SQL Editor ne laisse aucun horodatage lisible, et seules les bornes sont vérifiées — après le 2026-09-29, au plus tard le 2026-10-04. Résultats relevés en base par le mainteneur : les neuf tables présentes ; plus aucun privilège pour `anon`, `authenticated` ni `PUBLIC` ; `postgres` et `service_role` intacts sur les neuf ; aucun privilège de colonne ; les neuf empreintes de policies identiques avant et après ; aucun résidu `[TEST-ACL]`. Test de fumée passé : carte « Agenda du jour » sans erreur, Atelier de contenu en lecture sans erreur, cycle complet projet, objectif, action puis suppressions sur Trajectoire avec `test-erase@edificeia.com`. Détail dans l'entrée archivée du 2026-09-28 de `MANUAL_ACTIONS.md`.

**Deux limites de cette vérification, non levées** :

- **l'effet de bord sur cinq tables n'a pas été testé** — voir « Effet à connaître » plus bas : il reste déduit du fonctionnement des policies ;
- **les écritures de l'Atelier de contenu n'ont pas été exercées par le test de fumée.** Aucune écriture sur `content_drafts` ni sur les trois tables liées n'a été observée après la révocation ; seul le témoin des privilèges de `service_role` les couvre, indirectement. La lecture de code qui justifie l'absence de re-grant n'a donc été prise en défaut par un test que sur Trajectoire (écritures comprises) et sur la lecture du Calendrier et de l'Atelier.

**Origine** : le contrôle de sécurité des deux tables Calendrier, demandé le 2026-09-25 (requêtes `aclexplode` et `pg_policies` dans le SQL Editor), a été étendu aux tables qui ne sont accédées que par la clé service-role. Neuf sont concernées : `personal_calendar_events`, `personal_calendar_sync_state`, `content_drafts`, `content_draft_asset_links`, `content_draft_media_plans`, `content_draft_visual_scenes`, `trajectoire_projects`, `trajectoire_objectives`, `trajectoire_actions`. Les résultats bruts de ces contrôles sont dans le SQL Editor, non versionnés.

**Cause** : celle du chantier 6. Les migrations de ces neuf tables écrivent `revoke all … from anon` puis `grant select, insert, update, delete … to authenticated`, sans jamais révoquer côté `authenticated` — et un `grant` est additif. Une table appliquée avant le 2026-08-30 a en outre hérité du défaut de schéma de `postgres`, vidé seulement ce jour-là et seulement pour les tables créées après. La date d'application de chacune des neuf n'est pas consignée : l'état réel est celui que lisent les contrôles `aclexplode` de `MANUAL_ACTIONS.md`.

**Ce que la migration fait** : `revoke all on table public.<table> from anon, authenticated;` sur les neuf tables, dans une transaction, **sans aucun re-grant** — `supabase/migrations/20260928100000_revoke_client_privileges_on_service_role_only_tables.sql`. Le chantier 6 terminait par un `grant` parce que ses cinq tables sont lues par le client de session, où RLS est le garde réel. Celles-ci ne le sont pas. RLS et les policies ne sont pas touchées. Le script de re-grant est en commentaire à la fin du fichier, non appliqué, et ne restaure que les quatre privilèges annoncés par les migrations d'origine — pas `TRUNCATE`, `REFERENCES`, `TRIGGER` ni `MAINTAIN`.

**Vérification préalable dans le code, faite le 2026-09-28**, noms de table dynamiques compris :

- **Aucun accès par le client de session ni par le client navigateur.** Le client de session (`createClient` de `src/lib/supabase/server.ts`) n'est utilisé que par `app/login/actions.ts` et par les six stores de `lib/server/personal` (`notes`, `journal`, `journal-categories`, `habits`, `tasks`, `goals`) — aucun ne cite l'une des neuf tables. Toutes les autres importations de ce module sont `getCurrentUser()`, qui n'appelle que `auth.getUser()`. Le client navigateur (`src/lib/supabase/client.ts`) n'a **aucun importateur**. `lib/supabase.ts` exporte un client à clé anonyme que **personne n'importe**.
- **Tous les accès aux neuf tables passent par un client service-role**, chaque fichier créant le sien avec `SUPABASE_SERVICE_ROLE_KEY`. Quinze fichiers sous `lib/server`.
- **Noms de table dynamiques** — trois fichiers, hors stockage de fichiers : `deleteTrajectoireEntity` (`lib/server/trajectoire.ts:1677`) ne vise que les trois tables `trajectoire_*`, et c'est **le seul `DELETE` sur ces trois tables**, invisible à une recherche par nom littéral ; `data-erasure-store.ts` ne vise que des tables `personal_*` ; `observatory/read-model.ts` ne sonde que `short_video_publications`. Les `.from(bucket)` sont du stockage de fichiers, pas des tables.
- **Limite de cette vérification** : c'est une lecture de code. Elle ne voit ni une requête construite hors du dépôt, ni un appel direct à l'API REST depuis un outil externe. Le test de fumée de `MANUAL_ACTIONS.md` existe pour la prendre en défaut.

**Effet à connaître** : cinq autres tables — `content_assets`, `video_render_jobs`, `short_video_schedules`, `short_video_publications`, `publication_performance_snapshots` — portent des policies `to authenticated` dont une sous-requête lit `content_drafts` (et `content_draft_asset_links` pour `content_assets`). Une sous-requête de policy est évaluée avec les privilèges de l'appelant : après la révocation, une requête `authenticated` sur ces cinq tables échouera en « permission denied for table content_drafts » au lieu de renvoyer des lignes filtrées. Aucun code du dépôt n'émet cette requête, et l'échec est fermé. **Déduit du fonctionnement des policies, non testé.**

**Constat hors périmètre, non corrigé** : `personal_daily_briefs` et `personal_garmin_daily_stats` présentent le même défaut — `revoke all … from anon` puis `grant select, insert, update, delete … to authenticated`, sans révocation côté `authenticated`. Elles n'étaient pas dans la demande. Leurs stores (`daily-briefs-store.ts`, `garmin-stats-store.ts`) utilisent la clé service-role ; le client de session ne les cite pas non plus.

**Fait, pas une hypothèse** : sondées en lecture seule le 2026-09-29 (`limit 0`, aucune ligne demandée), **les deux tables n'existent pas dans la base réelle** — `PGRST205 Could not find the table … in the schema cache`, HTTP 404 sur chacune, contre une réponse `200` pour `personal_notes` sondée dans le même appel comme témoin. Cohérent avec le chantier 1 : le volet Vitals reste en pause, `daily-briefs-store.ts` modifié et `app/api/personal/daily-brief/` non suivis délibérément par `227fb7a`. Leurs migrations (`20260708100000`, `20260708110000`) ne portent donc pas encore le défaut en base — seulement sur le papier.

**Condition avant réactivation du chantier Vitals** : corriger ces deux migrations — ajouter `revoke all … from anon, authenticated` avant le `grant` — **avant** que l'une ou l'autre soit appliquée. Une table qui n'existe pas encore en base n'a pas besoin d'un correctif après-coup comme celui du chantier 6 : le fichier de création peut être corrigé directement, sans migration séparée ni geste en production.

**Points ouverts, consignés sans être corrigés** :

- **quatre policies `{public}` sur `content_drafts`, absentes des migrations** : relevé en base par le mainteneur le 2026-09-28, créées hors du flux de migrations — la situation qu'a connue `content_assets_authenticated_delete` (voir `20260728210000`). Une policy `{public}` s'applique à tous les rôles, `anon` compris. La révocation de ce chantier les rend inatteignables pour `anon` et `authenticated`, mais elles **restent en base**, et personne ne sait ce qu'elles filtrent tant qu'on n'a pas lu leur `qual`. Le contenu exact de ces quatre policies n'est pas consigné dans le dépôt ;
  *(22 novembre 2026 : contenu lu — restreint au propriétaire, pas une fuite. Supprimées par la migration `20261122100000`, appliquée le 22 novembre 2026 : point levé. Voir le chantier 2.)*
- **gardes en `403` écrits à la main sur les routes Calendrier** : `app/api/oauth/calendar/register-channel/route.ts` et `status/route.ts` appellent `getCurrentUser()` puis `canAccessPrivateCockpit(user)` et répondent `403` ; `callback/route.ts` redirige au lieu de répondre `403`. Aucune n'utilise `authorizeCockpitApiAccess()`, le helper que DEC-007 pose comme défaut ;
- **revue de moindre privilège des autres tables** : le décompte du contrôle SQL, relevé en base par le mainteneur le 2026-09-28, en compte **18**. Une lecture des migrations en compte **25** hors ces neuf (34 tables en tout, vérifié le 2026-09-28). **5 des 7 d'écart sont expliqués** — `oauth_tokens`, `personal_data_erasure_log` et `personal_item_erasure_log` ne portent aucun grant à `authenticated` (leurs migrations révoquent des deux rôles sans rien re-accorder, patron opposé à celui des tables de ce chantier), et `personal_daily_briefs` / `personal_garmin_daily_stats` sont absentes de la base réelle — voir le constat ci-dessus. **2 restent non identifiés.** La liste des 25 n'est pas dressée ici.
  *(22 novembre 2026 : les 2 tables non identifiées sont `project_memory` et `project_memory_audit_log`, qui révoquent `anon` et `authenticated` sans rien ré-accorder. Les 25 tables sont toutes expliquées : 18 avec privilèges, conformes à leurs migrations, et 7 sans. Point levé.)*

**Prochaine action concrète** : aucune sur la migration elle-même, appliquée. Restent, sans urgence fixée : les points ouverts ci-dessus, la condition de correction des migrations Vitals avant leur application, et la décision de lever ou non les deux limites de vérification (tester le refus attendu sur les cinq tables ; exercer une écriture de l'Atelier de contenu). Pas de push du commit `be07b02` sans demande explicite : la migration contient `REVOKE`, la règle permanente s'applique. *(Constat du 22 novembre 2026 : `be07b02` est déjà dans `origin/main`, voir la re-vérification du chantier 2.)*

---

## Chantier 3 — Audit du module Observatoire — TERMINÉ

**Objectif** : fiabiliser le module de monitoring/coûts (suivi des coûts, performance de publication YouTube/Instagram).

**État actuel** : les 4 corrections sont faites, committées et poussées (`4280a8d`, 22 juillet 2026). Vérifié fichier par fichier dans le code le 28 juillet :

1. **Sonde de statut cassée** — `publicationTableCandidates` ne liste plus que `short_video_publications` au lieu des cinq noms de tables inexistants. Le statut Publisher/Scheduler reflète la présence réelle de la table. (`lib/server/observatory/read-model.ts:30`)
2. **Documentation manquante** — `lib/server/publication-performance.ts` est documenté dans `knowledge/06_Modules.md`, avec la mention assumée que TikTok reste en lecture placeholder. Entrée ajoutée à `knowledge/11_Changelog.md`.
3. **Transparence UI** — badge « Declaratif, non verifie » basé sur l'absence de `item.source`, donc auto-maintenu pour tout futur item jamais relié à une sonde. (`MonitoringDashboardClient.tsx:497`)
4. **Journal récent codé en dur** — le panneau doublon a disparu (aucune occurrence de « Journal recent » dans `app/` ni `components/`), la carte « Erreurs et rendus recents » est conservée avec le même badge. (`MonitoringDashboardClient.tsx:531`)

**Prochaine action concrète** : aucune. Chantier clos.

**Deux points latents relevés le 28 juillet, hors des 4 points de l'audit — corrigés le même jour (`ea00972`, poussé) :**

- `projectMemoryForAssistant.nextRecommendedAction` portait une directive figée du 29 mai (« Brancher les statuts reels en lecture seule dans l'Observatoire, en commencant par OAuth YouTube et Supabase ») déjà réalisée, affichée sans marquage sous « Prochaine pierre » dans `ProjectMemoryPanel`. Remplacée par `fallbackNextRecommendedAction`, dont le texte annonce son propre statut de repli au lieu de décrire l'état du projet — il ne peut donc plus se périmer. La chaîne de dérivation live est inchangée.
- `constructionJournalSeed`, entrée de journal du 29 mai dont le blocage annoncé était devenu faux, est supprimée. Elle n'était plus rendue dans l'UI mais restait exposée à l'assistant.

**Reste ouvert sur ce module** : les trois items d'area `Agents` (`agent-assistant`, `agent-generation`, `agent-montage`) ne sont rendus nulle part — `ProjectObservatory.tsx`, le seul composant qui les afficherait, n'est monté sur aucune route. C'est une décision de conception UI (les afficher ? les supprimer ?), pas une correction de transparence, et elle demande un arbitrage humain.
