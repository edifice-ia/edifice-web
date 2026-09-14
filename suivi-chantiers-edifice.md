# Suivi des chantiers — L'Édifice

*Chantiers 4 et 5 mis à jour le 24 août 2026, chantier 6 le 3 septembre 2026, vérifiés contre le code, l'historique git et la base. Une date du chantier 4 requalifiée le 14 septembre 2026, sans re-vérification du reste du chantier. Les chantiers 1, 2 et 3 datent du 28 juillet 2026 et n'ont pas été re-vérifiés depuis.*

*Principe de ce document, inchangé : chaque état est vérifié contre le code et l'historique git, jamais contre la version précédente de ce fichier.*

## Priorités (par urgence réelle)

1. **Chantier 2 — Audit de sécurité.** Des failles réelles restent ouvertes en production (routes OAuth Instagram/Pinterest sans authentification, table `content_assets` sans isolation utilisateur, modes debug non gatés sur plusieurs providers). Le Lot 1 est poussé, mais tant que les Lots 2 et 3 ne sont pas traités, l'exposition est active et en prod.
2. **Chantier 1 — Module Vitals (étape 6, UI).** L'étape 5 (cron quotidien) est committée et poussée (`195aced`). Ce qui reste non committé est le volet suivant — le store de brief quotidien et sa route API — délibérément laissé de côté (voir Chantier 1).
3. ~~**Chantier 5 — Mise en conformité DEC-007 sur `/api/personal/`.**~~ **Terminé** le 24 août 2026 : dix routes converties, quatorze fichiers désormais conformes sous ce chemin. Voir plus bas.
4. ~~**Chantier 6 — Privilèges hérités du défaut de schéma.**~~ **Terminé** le 30 août 2026, chantier imprévu : cinq tables corrigées et défaut du schéma restreint. Voir plus bas.
5. ~~**Chantier 3 — Audit Observatoire.**~~ **Terminé** le 22 juillet 2026 (`4280a8d`), vérifié dans le code le 28 juillet. Voir plus bas.

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

**Objectif** : croiser les données de forme physique (sommeil, récupération, HRV) avec Trajectoire pour proposer chaque jour un ordre de priorité des actions selon la forme réelle.

**État actuel** :
- Étapes 1-4 faites et testées en mock : doc, migrations, OAuth Garmin, moteur de calcul du brief quotidien (champ `effort_level` ajouté à `trajectoire_actions`).
- Étape 5 (cron quotidien) **committée et poussée** dans `195aced` (15 juillet 2026), avec l'OAuth Garmin et le moteur de brief. La mention « pas encore committée » de la version précédente de ce document était périmée.
- Ce qui reste non committé aujourd'hui est un volet distinct : `lib/server/personal/daily-briefs-store.ts` (modifié) et `app/api/personal/` (non suivi), délibérément laissés hors de git par `227fb7a` tant que le store et la route ne sont pas prêts.
- Étape 6 (UI) pas commencée.
- Blocage externe : le formulaire Garmin Connect Developer Program est cassé côté Garmin (page "under construction"), sans date de réouverture. Terra API et Spike API écartées (trop chères, B2B par utilisateur actif). Piste actuelle : Health Auto Export (iOS) → webhook, en cours de test vers webhook.site pour voir le format réel des données. Ne couvrira probablement pas Body Battery/Stress (propriétaires Garmin) — un score de récupération maison est prévu en remplacement.

**Prochaine action concrète** : lancer la revue de sécurité dédiée au module cron pour débloquer le commit des étapes 3-5. En parallèle, terminer le test webhook.site avec Health Auto Export pour valider le format de données réel.

---

## Chantier 2 — Audit de sécurité (le plus avancé)

**Objectif** : corriger les failles trouvées par une revue de code indépendante sur les connexions OAuth en production (TikTok, Meta, YouTube).

**État actuel** :
- Lot 1 (authentification + state OAuth lié à l'utilisateur sur toutes les routes, upload TikTok protégé) : fait, committé et **poussé** (`985d919`, présent dans `origin/main` — vérifié le 28 juillet, `main` et `origin/main` alignés). La mention « pas encore poussé » de la version précédente était périmée.
- Lot 2 (isolation `content_assets`) : policies RLS réécrites et committées (`aeaec7a`, 21 juillet, dans `origin/main`). **Application en base non vérifiée** — voir `MANUAL_ACTIONS.md`.
- Lot 3 (routes Instagram/Pinterest sans authentification) : fait (`13a5145`, 21 juillet, dans `origin/main`). Les 9 routes portent le garde complet, vérifié le 28 juillet.
- Gating des modes debug/test : en place sur tous les providers, vérifié le 28 juillet.
- Re-audit du 28 juillet (`2cf9316`, **local, non poussé**) : six routes API répondaient encore sans session, dont `/api/oauth/youtube/status` et `/api/oauth/calendar/status` qui rafraîchissaient le token stocké et renvoyaient l'identité de la chaîne YouTube / de l'agenda principal. Plus l'OAuth Garmin, oublié du Lot 1 : `start` sans authentification et état PKCE non lié à un utilisateur. Corrigés, documentés en DEC-007.

**Prochaine action concrète** : relire `2cf9316` puis pousser. Ensuite, vérifier dans le SQL Editor Supabase que les policies RLS `content_assets` sont réellement appliquées — c'est le dernier point du Lot 2 qui ne peut pas être clos depuis le dépôt, et tant qu'il ne l'est pas, la table peut encore être en `using(true)` en production.

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

Le défaut remonte à `personal_notes` (2026-08-04), première migration du pôle ; les quatre suivantes l'ont recopié fidèlement. **Les cinq tables du pôle étaient les seules du dépôt dans ce cas** : les seize autres tables révoquent toutes `from authenticated` avant d'accorder.

**Ce qui n'était pas cassé, et c'est important pour calibrer la gravité.** Aucune suppression physique n'a jamais été possible. Vérifié par **test négatif réel** le 2026-08-24 : avec un vrai JWT `authenticated` obtenu par lien magique, un `DELETE` sur une ligne appartenant à l'utilisateur renvoie **0 ligne supprimée sans erreur de privilège** — signature exacte d'un privilège accordé et d'une policy absente. La protection tenait, mais par **une seule couche** au lieu des deux annoncées partout dans la documentation. C'est précisément la configuration qui a rendu l'incident `content_assets` du 2026-07-28 exploitable le jour où cette couche unique est tombée.

**Portée du correctif** :

- `20260824110000` — les cinq tables passent par `revoke all ... from anon, authenticated` puis re-grant de l'ensemble voulu. Méthode exhaustive par construction, préférée à une énumération des privilèges à retirer : `MAINTAIN` (le `m` de `arwdDxtm`) n'existe que depuis PostgreSQL 17 et aurait été oublié, cette base tournant en 17.6.
- **Exception conservée** : `personal_habit_completions` garde `DELETE`, intentionnel depuis `20260806100000` et doublé d'une policy scopée au propriétaire. Elle perd en revanche `UPDATE`, qu'elle n'a jamais dû avoir — une réalisation n'a aucun champ modifiable.
- `20260824120000` — le défaut du schéma pour le rôle `postgres` ne concède plus rien à `anon` ni `authenticated`. Choix d'un défaut **vide** plutôt que `select/insert/update` : trois privilèges par défaut resteraient faux pour toute table qui ne doit rien exposer, et les journaux d'audit `personal_data_erasure_log` et `personal_item_erasure_log` sont exactement dans ce cas. Aucune migration du dépôt ne dépendait du défaut.

Les deux migrations sont **appliquées et vérifiées en base le 2026-08-30** — leur horodatage de nom porte `0824`, jour de la découverte, et non celui de leur écriture : grants conformes sur les cinq tables, une seule policy `DELETE` dans tout le pôle et correctement scopée, défaut de schéma vidé pour `postgres`.

**Limite connue, non corrigeable depuis le dépôt** : le second `ALTER DEFAULT PRIVILEGES`, posé par **`supabase_admin`**, reste hors de portée. Le modifier exige d'être `supabase_admin` ou superutilisateur ; le SQL Editor s'exécute en `postgres`. Une table créée par l'outillage interne de Supabase — pas par une migration du dépôt — hérite donc encore du blanc-seing. La commande est consignée en commentaire dans `20260824120000` si un accès superutilisateur devient disponible. À défaut, le garde-fou reste la discipline de migration : révoquer explicitement avant d'accorder.

**Effet de bord assumé** : une table créée depuis le Table Editor du dashboard ne sera plus lisible par l'API tant qu'un `grant` explicite n'aura pas été posé.

**Ce que ce chantier apprend, au-delà du correctif** : un commentaire de migration qui énonce une garantie ne la produit pas. Ceux du pôle décrivaient correctement la règle — « il faudrait ajouter à la fois le privilège et une policy » — tout en omettant l'instruction qui l'aurait rendue vraie. Seul un contrôle exécuté contre la base l'a montré, vingt jours plus tard.

**Prochaine action concrète** : aucune. Le contrôle des grants doit rester dans les entrées `MANUAL_ACTIONS.md` des futures migrations — c'est lui qui a trouvé ce défaut.

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
