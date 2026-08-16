# Suivi des chantiers — L'Édifice

*Mis à jour le 28 juillet 2026 — état vérifié contre le code et l'historique git, pas contre la version précédente de ce document.*

## Priorités (par urgence réelle)

1. **Chantier 2 — Audit de sécurité.** Des failles réelles restent ouvertes en production (routes OAuth Instagram/Pinterest sans authentification, table `content_assets` sans isolation utilisateur, modes debug non gatés sur plusieurs providers). Le Lot 1 est poussé, mais tant que les Lots 2 et 3 ne sont pas traités, l'exposition est active et en prod.
2. **Chantier 1 — Module Vitals (étape 6, UI).** L'étape 5 (cron quotidien) est committée et poussée (`195aced`). Ce qui reste non committé est le volet suivant — le store de brief quotidien et sa route API — délibérément laissé de côté (voir Chantier 1).
3. ~~**Chantier 3 — Audit Observatoire.**~~ **Terminé** le 22 juillet 2026 (`4280a8d`), vérifié dans le code le 28 juillet. Voir plus bas.

---

## Chantier 4 — « Vider l'historique » (Réglages > Personnel)

**Objectif** : donner au pôle Personnel un moyen d'effacer réellement des données. Ses trois modules à saisie manuelle n'implémentent que la suppression logique, par conception — c'est une lacune de souveraineté que la documentation stratégique rattache explicitement à Réglages.

**État actuel** (13 août 2026) :
- Livré dans `6383597` : validation partagée client/serveur, store service-role, route API à quatre gardes, onglet Personnel dans Réglages, migration du journal d'audit écrite.
- Extension à Habitudes faite : les trois modules du pôle sont couverts. `ERASURE_EXCLUDED_NOTICE`, qui annonçait l'exclusion d'Habitudes, est retiré — il serait devenu faux à l'écran.
- Documentation : `6383597` a modifié `03_Decisions.md` (DEC-012), `05_Database.md`, `06_Modules.md` et `11_Changelog.md`. **Cette documentation est partiellement obsolète** : elle décrit le flux de confirmation partagée — une sélection multiple par cases à cocher, un seul mot `SUPPRIMER` tapé une fois pour tous les modules cochés — abandonné depuis le passage à l'Option A (un module à la fois, confirmation dédiée). Elle sera reprise une fois le code stabilisé, pas avant.
- `261c042` a scindé DEC-012 : la suppression explicite des tables dépendantes en est retirée et devient DEC-013, au statut `proposé`. `59bf997` a contraint `deleteOwnedRows` au type des tables effaçables.

  *Note : il n'a jamais existé de plan en quatre étapes pour ce chantier. La formulation « étapes 1-3 faites / étape 4 (documentation) » qui figurait ici reprenait un message de reprise de session, sans source dans le dépôt — aucun fichier, aucun commit ne définit un tel découpage, et aucune trace n'indique qu'une étape de documentation ait été validée. Retirée le 2026-08-16.*
- **Migration `20260806200000_create_personal_data_erasure_log.sql` non appliquée en base.** Voir `MANUAL_ACTIONS.md`, entrée du 2026-08-13.
- Test de bout en bout **pas fait** — il dépend de l'application de la migration.

**Point de vigilance connu, non corrigé** : `erasePersonalModules` supprime puis journalise. Si l'écriture d'audit échoue, la suppression a déjà eu lieu et l'entrée manque. Le code le documente et remonte l'erreur à l'appelant, qui renvoie ce qui a été fait. Rendre les deux atomiques demanderait une fonction Postgres `security definer`, donc un arbitrage qui n'a pas été pris.

**Prochaine action concrète** : appliquer la migration via le SQL Editor Supabase (étapes exactes dans `MANUAL_ACTIONS.md`), vérifier les révocations, puis tester le geste sur un jeu de données jetable. La suppression est irréversible et sans sauvegarde.

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
