# L'ÉDIFICE — Documentation Stratégique de Référence

**Cockpit IA personnel — Une seule source de vérité**
Architecture fonctionnelle, technique et feuille de route d'un système d'exploitation personnel

| | |
|---|---|
| **Document** | Référence officielle — v1.0 |
| **Propriétaire** | Vincent |
| **Date** | Juillet 2026 |
| **Classification** | Usage personnel — confidentiel |

> Ce fichier est une conversion Markdown du PDF original (`Documentation_Stratégique/L'Edifice - Documentation Strategique de Reference.pdf`), générée pour permettre le versionnement, la revue en diff, et la lecture par les agents Claude Code qui n'ont pas d'outil d'extraction PDF sur cette machine. **Le PDF reste la source de référence en cas de divergence** ; ce fichier doit être régénéré/mis à jour manuellement à chaque révision du PDF.

---

## Table des matières

**Partie I — Vision & Fondations**
- Résumé exécutif
- Vision & Mission
- Philosophie & Principes fondateurs
- Utilisateur & Contexte d'usage

**Partie II — Cartographie des modules**
- Vue d'ensemble des modules
- Module : Cockpit
- Module : Assistant IA
- Module : Personnel
- Module : Business
- Module : CRM
- Module : Création de Contenu
- Module : Observatoire
- Module : Bibliothèque
- Module : Développement
- Module : Finances
- Module : Infrastructure
- Module : Paramètres
- Module : Automatisations

**Partie III — Architecture & Données**
- Modèle de données & graphe de connexions
- Architecture technique
- Sécurité & Gouvernance des données

**Partie IV — Intégrations & Trajectoire**
- Intégrations
- Roadmap
- Métriques de succès du projet

**Partie V — Référence**
- Glossaire
- Annexes

---

# PARTIE I — Vision & Fondations

*Mission, philosophie et principes fondateurs du projet.*

## 01 · Résumé exécutif

L'Édifice n'est pas une application de productivité de plus. C'est un système d'exploitation personnel : une couche logicielle unique, construite sur mesure, dont le rôle est de centraliser l'intégralité des données d'une vie — santé, sport, travail, entreprise, finances, création de contenu, relations, projets — pour qu'une intelligence artificielle puisse en tirer une compréhension contextuelle complète et assister son unique utilisateur dans chaque décision importante.

Le projet part d'un constat simple : la vie moderne est fragmentée entre des dizaines d'outils cloisonnés — une application de sommeil qui ignore tout du calendrier, un gestionnaire de tâches qui ignore le niveau d'énergie du jour, un CRM qui ignore la charge de travail personnelle, un tracker de sport qui ignore le stress professionnel. Chaque outil optimise sa propre fonction, mais aucun ne voit l'ensemble. Résultat : les décisions se prennent sur des fragments d'information, jamais sur le tableau complet.

L'Édifice inverse ce modèle. Une seule base de données, un seul graphe de relations entre les entités de vie, un seul point d'entrée. Chaque nouvelle donnée enregistrée enrichit la compréhension que l'IA a du contexte global, et chaque recommandation produite par l'IA s'appuie sur l'ensemble de ce contexte plutôt que sur un silo isolé.

Le projet est conçu, dès l'origine, pour un usage strictement personnel — un cockpit à une seule place — mais avec une architecture et une rigueur documentaire dignes d'un produit destiné à des dizaines de milliers d'utilisateurs, avec un horizon de lancement public envisagé avant 2027. Cette rigueur n'est pas un exercice de style : c'est la condition pour que L'Édifice reste utilisable, maintenable et évolutif sur un horizon de plusieurs années de développement en solo, où le principal risque n'est pas la concurrence mais l'entropie — la complexité qui s'accumule silencieusement jusqu'à rendre le système impossible à faire évoluer.

Ce document est la documentation de référence officielle du projet. Il définit la vision, la philosophie, l'architecture fonctionnelle et technique, le modèle de données, les intégrations et la feuille de route de L'Édifice. Il est destiné à survivre au turnover naturel de la mémoire humaine : dans deux ans, dans cinq ans, ce document doit permettre de retrouver pourquoi une décision a été prise, et non seulement ce qui a été construit.

## 02 · Vision & Mission

### Mission

Construire le cockpit personnel qui connaît son utilisateur mieux qu'aucun outil n'a jamais pu le faire, et qui transforme cette connaissance en décisions concrètes, quotidiennes, actionnables.

L'Édifice a une mission unique : devenir la source de vérité unique de la vie de son utilisateur, et le point de départ obligé de toute décision — que faire aujourd'hui, quel projet mérite l'attention, pourquoi telle baisse de forme, quel risque se prépare pour la semaine prochaine.

### Vision à long terme

À terme, L'Édifice doit pouvoir répondre, sans effort de saisie manuelle superflu et avec un niveau de justesse qu'aucune application spécialisée ne peut atteindre seule, à des questions comme :

| Question posée | Ce que L'Édifice doit être capable de croiser |
|---|---|
| Pourquoi suis-je fatigué ? | Sommeil (Garmin), charge d'entraînement (Hevy/Runna), stress perçu (journal), charge de travail (calendrier, heures travaillées), nutrition/hydratation |
| Pourquoi ma productivité baisse-t-elle ? | Sommeil, humeur, nombre de tâches en retard, interruptions au calendrier, charge mentale (nombre de projets actifs) |
| Quels objectifs sont en retard ? | Objectifs personnels et business, jalons de projets (Trajectoire), delta entre progression planifiée et réelle |
| Pourquoi mes performances sportives diminuent-elles ? | Charge d'entraînement (Hevy, Runna), récupération (Garmin — VFC, sommeil profond), nutrition, stress, blessures déclarées au journal |
| Quel projet mérite mon attention aujourd'hui ? | Urgence des échéances, niveau d'énergie du jour, valeur business estimée, dépendances bloquantes |
| Que dois-je faire maintenant ? | Créneau du calendrier, niveau d'énergie, priorités du jour, contexte (lieu, matériel disponible) |
| Quels sont les risques pour les prochains jours ? | Échéances qui convergent, absence de récupération planifiée, facture ou renouvellement d'abonnement à venir, charge cumulée |
| Quels sont les gains potentiels ? | Opportunités commerciales en attente, habitudes en voie de consolidation, marge de progression identifiée par les statistiques |

Cette capacité de corrélation transversale est la raison d'être du projet. Elle ne peut exister que si toutes les données vivent dans le même système, reliées par un modèle de données cohérent — et non dispersées dans quinze applications qui ne se parlent pas.

### Ce que L'Édifice n'est pas

Pour éviter toute dérive de scope au fil des années de développement, il est utile de définir aussi ce que le projet n'est pas :

- **Ce n'est pas un agrégateur passif de flux.** Un tableau de bord qui affiche des widgets sans les relier entre eux n'apporte aucune valeur supplémentaire par rapport aux applications sources. La valeur de L'Édifice est dans la corrélation, pas dans l'affichage.
- **Ce n'est pas un produit multi-utilisateur dans sa phase de conception.** L'architecture doit rester ouverte à une évolution multi-tenant future, mais chaque décision de conception privilégie la profondeur d'usage pour un utilisateur unique plutôt que la généricité prématurée pour plusieurs utilisateurs.
- **Ce n'est pas un assistant qui décide à la place de l'utilisateur.** L'IA recommande, argumente, anticipe — elle n'agit jamais de façon autonome et irréversible sans validation explicite sur les actions à conséquence (envoi d'email, paiement, publication, suppression de données).
- **Ce n'est pas un projet avec une deadline dure.** L'horizon de lancement public envisagé est avant 2027, mais la priorité absolue reste la qualité de l'architecture et la robustesse du système sur le temps long, plutôt que la vitesse de mise sur le marché.

## 03 · Philosophie & Principes fondateurs

La philosophie de L'Édifice n'est pas décorative : chaque principe ci-dessous est un critère d'arbitrage concret, utilisé pour trancher les désaccords de conception au fil du développement. Quand une décision technique ou produit est ambiguë, elle doit être confrontée à ces principes.

### 1. Une seule source de vérité

Aucune donnée ne doit exister en double dans deux systèmes sans lien explicite entre les deux copies. Quand une donnée existe déjà dans une application tierce (Garmin, Google Calendar, GitHub…), L'Édifice ne la recopie pas aveuglément : il l'importe, la normalise et l'enrichit de métadonnées de corrélation, en conservant la traçabilité vers la source. La règle n'est pas « tout doit être stocké dans L'Édifice » mais « tout doit être visible et corrélable depuis L'Édifice ».

### 2. Souveraineté des données personnelles

L'utilisateur doit rester propriétaire, à tout moment, de l'intégralité de ses données. Cela se traduit par des exigences concrètes : export complet possible à tout moment (format ouvert), hébergement sur une infrastructure dont les conditions d'usage sont connues et maîtrisées, chiffrement des données sensibles au repos, et absence de dépendance à un fournisseur qui rendrait la migration impossible. La souveraineté n'est pas un slogan : c'est une contrainte d'architecture qui influence le choix de chaque fournisseur tiers (cf. chapitre Sécurité & Gouvernance des données).

### 3. Le minimum de clics

Chaque interaction manuelle superflue est un coût. L'objectif de conception pour chaque fonctionnalité est de minimiser le nombre d'actions nécessaires pour capturer une donnée ou obtenir une réponse. Quand une donnée peut être captée automatiquement via une intégration plutôt que saisie manuellement, l'intégration est toujours préférée. Quand une saisie manuelle est inévitable (journal, humeur), l'interface doit la rendre aussi rapide que possible (un clic, un slider, une commande vocale ou texte libre interprétée par l'IA).

### 4. Automatiser tout ce qui peut l'être

Toute tâche répétitive, mécanique et sans jugement humain nécessaire est candidate à l'automatisation : synchronisation de données, relances, rappels, classement de documents, catégorisation de dépenses, publication de contenu planifié. Le module Automatisations n'est pas un module parmi d'autres : c'est une couche transversale qui infuse tous les autres modules.

### 5. Les données doivent toujours circuler

Une donnée isolée dans un module n'a qu'une fraction de sa valeur potentielle. Le sommeil enregistré dans le module Personnel doit pouvoir influencer une recommandation de planification dans le Cockpit. Une facture impayée dans le module Finances doit pouvoir déclencher une alerte dans l'Observatoire. La circulation des données est assurée par une architecture orientée événements (cf. Architecture technique) : chaque écriture significative émet un événement que les autres modules peuvent consommer.

### 6. Chaque module doit enrichir les autres

Un module qui fonctionne en silo, même parfaitement, est un échec de conception au regard de la philosophie de L'Édifice. Avant d'ajouter un module, la question à se poser n'est pas seulement « que fait-il ? » mais « avec quoi se connecte-t-il, et qu'apporte-t-il aux corrélations existantes ? ».

### 7. L'IA augmente, elle ne remplace pas

L'Assistant IA de L'Édifice a un rôle d'augmentation des capacités de décision de l'utilisateur, jamais de substitution à son autonomie. Il produit des recommandations argumentées et sourcées dans les données ; il n'exécute pas d'action irréversible sans confirmation. Cette distinction protège contre deux risques : la dépendance excessive à l'automatisation (perte de compétence décisionnelle) et l'erreur silencieuse d'un modèle qui agirait sur une corrélation erronée.

### 8. La priorisation par l'énergie, pas seulement par l'urgence

La plupart des outils de gestion de tâches priorisent uniquement par date d'échéance ou par importance déclarée. L'Édifice ajoute une troisième dimension, spécifique à sa philosophie : le niveau d'énergie réel de l'utilisateur, mesuré et estimé à partir du sommeil, de la charge d'entraînement et de l'historique de productivité. Une tâche exigeant une forte concentration ne devrait pas être recommandée un jour de récupération incomplète — même si son échéance est proche. Cette dimension énergétique est un différenciateur central du moteur de recommandation.

### 9. Documentation vivante

La documentation de L'Édifice — dont ce document est la pièce maîtresse — est mise à jour dans le même changement que le code qu'elle décrit. Un changement d'architecture non documenté est considéré comme incomplet. Cette discipline garantit que le projet reste compréhensible après une interruption de plusieurs mois, un risque réel pour un projet solo mené sur plusieurs années.

### 10. Simplicité avant généricité

Face à un choix entre une solution simple qui répond au besoin actuel et une solution générique qui anticipe des besoins hypothétiques, L'Édifice choisit la simplicité — sauf lorsque l'analyse de la feuille de route indique une quasi-certitude que la généricité sera nécessaire à court terme. La dette technique volontaire, documentée et bornée, est préférable à la complexité prématurée.

## 04 · Utilisateur & Contexte d'usage

### Profil de l'utilisateur principal

L'Édifice est conçu pour un utilisateur unique : son concepteur et développeur. Ce choix n'est pas une limitation temporaire tolérée en attendant une hypothétique ouverture multi-utilisateur — c'est un choix de conception qui permet une profondeur d'intégration et de personnalisation impossible à atteindre avec un produit générique destiné au grand public.

Ce profil se caractérise par :

- Une vie à plusieurs facettes actives simultanément : activité professionnelle, développement de projets personnels, activité entrepreneuriale (produits, services, contenu), pratique sportive régulière et structurée (course à pied avec plan d'entraînement, musculation), et une exigence de suivi rigoureux de la santé.
- Une appétence technique forte : l'utilisateur est lui-même le développeur du système, ce qui autorise des choix d'interface et d'architecture qui privilégieraient normalement l'efficacité sur l'accessibilité pour un public non technique (raccourcis clavier, commandes texte, vues denses en information).
- Une exigence de rigueur méthodologique : chaque évolution du système est décidée consciemment (architecture discutée avant implémentation), validée avant intégration (relecture de chaque fichier avant commit), et documentée en continu.

### Modes d'usage quotidien

Trois moments d'usage structurent la journée type de l'utilisateur avec L'Édifice :

**Le matin — la synthèse.** L'utilisateur ouvre le Cockpit pour obtenir un état des lieux : qualité du sommeil de la nuit, énergie estimée du jour, priorités recommandées, alertes éventuelles (échéance qui approche, facture à régler, objectif en retard). Ce moment doit être bref (moins d'une minute de lecture) et dense en information utile.

**En continu — la capture.** Tout au long de la journée, l'utilisateur enregistre des données ponctuelles : une tâche terminée, une note de journal, un repas, une dépense, une idée de contenu. Ces captures doivent être aussi frictionless que possible, idéalement via une interface de saisie unique en langage naturel que l'Assistant IA route vers le bon module.

**Le soir — la revue.** Un moment de bilan : progression de la journée par rapport aux objectifs, état d'esprit, ajustement des priorités du lendemain. C'est aussi le moment où l'Assistant IA peut proposer des observations à plus long terme (tendances sur la semaine, corrélations émergentes).

### Contraintes d'usage

L'Édifice doit rester utilisable dans des contextes variés : bureau, déplacement, mobile, voix. L'architecture d'interface (cf. module Cockpit) doit donc séparer strictement la couche de présentation de la couche de données, pour permettre à terme plusieurs points d'entrée (web, mobile, assistant vocal) sans dupliquer la logique métier.

---

# PARTIE II — Cartographie des modules

*Description fonctionnelle détaillée des treize modules de L'Édifice.*

## 05 · Vue d'ensemble des modules

L'Édifice est composé de treize modules. Chacun possède une responsabilité fonctionnelle claire, mais aucun ne fonctionne en isolation : tous lisent et écrivent dans le même graphe de données, et tous sont consultables — directement ou par corrélation — depuis l'Assistant IA et l'Observatoire.

### Tableau de synthèse des modules

| Module | Rôle principal | Données clés | Modules fortement connectés |
|---|---|---|---|
| Cockpit | Point d'entrée unique, synthèse quotidienne | Vue agrégée de tous les modules | Tous |
| Assistant IA | Corrélation, recommandation, décision argumentée | Contexte complet | Tous |
| Personnel | Sommeil, sport, santé, habitudes, journal, objectifs | Vitals, Trajectoire perso | Observatoire, Automatisations |
| Business | CRM, infrastructure, facturation, pipeline commercial | Comptes, contrats, abonnements | CRM, Finances, Infrastructure |
| CRM | Relation clients et prospects | Contacts, opportunités, historique | Business, Finances, Automatisations |
| Création de Contenu | Pipeline de production et publication multiplateforme | Scripts, médias, statistiques de publication | Bibliothèque, Observatoire, Automatisations |
| Observatoire | Tableau de bord global, KPI, alertes | Agrégats de tous les modules | Tous (lecture) |
| Bibliothèque | Gestion documentaire centralisée | Documents, contrats, médias, notes | Business, CRM, Contenu, Développement |
| Développement | Suivi des projets techniques et produits (Trajectoire) | Roadmap, tâches, dépôts de code | Infrastructure, Business, Automatisations |
| Finances | Comptes, revenus, dépenses, abonnements | Transactions, factures, budgets | Business, CRM, Observatoire |
| Infrastructure | Domaines, hébergement, services cloud | DNS, déploiements, environnements | Développement, Business, Automatisations |
| Paramètres | Configuration système, identité, préférences | Comptes liés, préférences, sécurité | Tous (configuration) |
| Automatisations | Orchestration des flux automatiques | Règles, déclencheurs, historique d'exécution | Tous |

### Schéma d'architecture fonctionnelle

```
 ┌────────────────────────────────────────────┐
 │                   COCKPIT                    │
 │      (point d'entrée unique — synthèse)      │
 └───────────────────────┬──────────────────────┘
                          │
 ┌────────────────────────┴──────────────────────┐
 │              ASSISTANT IA (le cerveau)          │
 │  contexte complet · corrélations · décisions    │
 └───┬─────┬─────┬─────┬─────┬─────┬─────┬─────┬─┘
     │     │     │     │     │     │     │     │
 ┌───┘     │     │     │     │     │     │     └───────┐
 │         │     │     │     │     │     │             │
┌▼────────┐┌▼────────┐│┌───▼────┐│┌────▼─────┐┌───────▼──────┐│
│PERSONNEL││ BUSINESS ││ │ CRM  │││CONTENU   ││ OBSERVATOIRE ││
└────┬────┘└────┬─────┘│ └───┬────┘│└────┬─────┘└──────┬───────┘│
     │          │      │     │     │     │             │        │
┌────▼──────┐┌──▼───┐┌─▼─────▼──┐┌─▼─────▼───┐┌───────▼──────┐│
│BIBLIOTHÈQUE││DÉVELOP-│FINANCES ││INFRA-     ││ AUTOMATISA-  ││
│           ││PEMENT  │         ││STRUCTURE  ││ TIONS        │◄──┘
└───────────┘└────────┘└─────────┘└───────────┘└──────────────┘
                          ┌──────────────┐
                          │  PARAMÈTRES  │
                          └──────────────┘
```

Toutes les flèches sont bidirectionnelles : chaque module lit le contexte des autres et alimente le graphe de données commun. L'Assistant IA et l'Observatoire sont les deux modules « transversaux » qui lisent l'intégralité du graphe.

## 06 · Module : Cockpit

### Rôle

Le Cockpit est le point d'entrée unique de L'Édifice — l'écran que l'utilisateur ouvre en premier, chaque jour. Il n'est pas un module de saisie ni de gestion : c'est une couche de synthèse, qui compile les signaux les plus importants issus de tous les autres modules en une vue actionnable, hiérarchisée par urgence et par pertinence contextuelle.

### Principes de conception

Le Cockpit obéit à une contrainte stricte de densité utile : chaque élément affiché doit répondre à une question que l'utilisateur se pose réellement au démarrage de sa journée. Un widget qui affiche une donnée sans l'interpréter (« vous avez dormi 6h32 ») a moins de valeur qu'un widget qui la contextualise (« 6h32 de sommeil, 1h14 sous votre moyenne des 14 derniers jours — attendez-vous à une baisse de capacité de concentration cet après-midi »).

La hiérarchie d'affichage suit un ordre fixe :

1. **Alertes critiques** — ce qui exige une action aujourd'hui (échéance dépassée, facture impayée, objectif en rupture de trajectoire).
2. **Synthèse énergie & forme** — sommeil, récupération, humeur, niveau d'énergie estimé du jour.
3. **Priorités du jour** — la sélection de tâches recommandée par l'Assistant IA, croisée avec le calendrier et le niveau d'énergie.
4. **Calendrier du jour** — vue compacte des rendez-vous et blocs de travail.
5. **Signaux business** — nouvelles opportunités CRM, statuts de projets Trajectoire proches d'un jalon.
6. **Contenu & création** — publications planifiées du jour, statistiques récentes notables.
7. **Vue rapide Observatoire** — indicateurs macro (finances, KPI business, progression des objectifs long terme).

### Fonctionnalités

- **Brief quotidien génératif** : chaque matin, l'Assistant IA rédige une synthèse en langage naturel (2 à 4 paragraphes) qui interprète les données de la nuit et de la veille, plutôt que de simplement les lister.
- **Barre de capture universelle** : un champ de saisie unique, toujours accessible, dans lequel l'utilisateur tape ou dicte une information libre (« déjeuner terminé, 650 kcal », « appel avec Julien reporté à jeudi », « idée de vidéo sur la récupération active »). L'Assistant IA route la donnée vers le bon module et demande confirmation si l'interprétation est ambiguë.
- **Vue « Maintenant »** : à tout moment, un mode qui répond uniquement à la question « que dois-je faire dans les 30 prochaines minutes ? », combinant calendrier, énergie et priorités.
- **Historique de synthèses** : chaque brief quotidien est archivé, consultable, et sert de matière première à l'analyse de tendances de l'Observatoire.

### Connexions

Le Cockpit ne stocke aucune donnée métier propre : il est une vue calculée en lecture sur l'ensemble du graphe de données de L'Édifice, rafraîchie en temps réel via l'architecture orientée événements.

## 07 · Module : Assistant IA

### Rôle

L'Assistant IA est le module central de L'Édifice, au sens où il ne gère pas un domaine de vie particulier mais connaît l'ensemble des autres modules et sert de couche de raisonnement transversal. C'est le composant qui transforme un ensemble de données cloisonnées en un système véritablement intelligent.

### Responsabilités

**Connaître le contexte complet.** Avant de répondre à une question ou de produire une recommandation, l'Assistant IA doit pouvoir accéder — via des requêtes structurées sur le graphe de données — à l'ensemble des signaux pertinents : état physiologique récent, charge de travail, agenda, objectifs actifs, situation financière, état des projets. Cet accès est gouverné par un système de récupération de contexte (context retrieval) qui sélectionne dynamiquement les données pertinentes à la question posée, plutôt que d'injecter l'intégralité du graphe à chaque requête.

**Faire des recommandations argumentées.** Chaque recommandation produite par l'Assistant doit être accompagnée de son raisonnement : quelles données ont été utilisées, quelle corrélation a été identifiée, quel est le degré de confiance. Une recommandation sans justification n'est pas acceptable dans L'Édifice — la confiance de l'utilisateur dans le système dépend de la transparence du raisonnement.

**Proposer des automatisations.** Lorsque l'Assistant identifie un motif répétitif dans le comportement de l'utilisateur (par exemple, une catégorisation manuelle systématique de certaines dépenses), il propose la création d'une règle d'automatisation correspondante plutôt que de laisser la répétition perdurer.

**Prioriser les tâches.** Le moteur de priorisation combine quatre facteurs : l'urgence (échéance), l'importance déclarée, la valeur business ou personnelle estimée, et le niveau d'énergie requis rapporté au niveau d'énergie disponible du jour (cf. Principe fondateur n°8). Le résultat est une liste ordonnée, jamais une simple liste triée par date.

**Anticiper les problèmes.** Sur la base des tendances observées (charge de travail cumulée, absence de récupération planifiée, échéances qui convergent), l'Assistant produit des alertes prospectives — une capacité distincte du reporting rétrospectif de l'Observatoire.

**Analyser les corrélations.** L'Assistant maintient et actualise un ensemble de corrélations statistiques entre variables du graphe de données (sommeil × productivité, charge d'entraînement × humeur, etc.), qu'il utilise à la fois pour expliquer des situations passées et pour anticiper des situations futures.

**Prendre des décisions argumentées** — au sens de proposer une décision avec une justification complète, jamais au sens d'agir de façon autonome sur des actions à conséquence irréversible.

### Architecture fonctionnelle de l'Assistant

```
 Question / événement déclencheur
              │
              ▼
 ┌─────────────────────┐
 │ Sélecteur de        │  Détermine quelles données du graphe
 │ contexte            │  sont pertinentes pour la requête
 └──────────┬───────────┘
            ▼
 ┌─────────────────────┐
 │ Moteur de           │  Croise les données sélectionnées avec
 │ corrélation         │  les corrélations connues et l'historique
 └──────────┬───────────┘
            ▼
 ┌─────────────────────┐
 │ Modèle de langage   │  Formule la réponse, la recommandation
 │ (raisonnement)      │  ou l'alerte, avec justification
 └──────────┬───────────┘
            ▼
 ┌─────────────────────┐
 │ Couche de           │  Toute action à conséquence (envoi,
 │ confirmation        │  paiement, publication, suppression)
 └──────────┬───────────┘  requiert une validation explicite
            ▼
 Réponse / action exécutée + entrée journalisée
```

### Niveaux de confiance

Chaque sortie de l'Assistant est étiquetée d'un niveau de confiance, calculé à partir de la quantité et de la fraîcheur des données disponibles :

| Niveau | Signification | Exemple |
|---|---|---|
| Élevé | Corrélation établie sur un historique long et stable | « Vos 3 dernières nuits de moins de 6h ont systématiquement précédé une séance d'entraînement manquée » |
| Moyen | Tendance émergente, historique encore limité | « Il semble que votre humeur soit meilleure les jours où vous terminez une session de sport avant midi, mais l'échantillon est encore réduit » |
| Faible / exploratoire | Corrélation statistique sans certitude causale | « Une corrélation faible existe entre les jours de pluie et une baisse d'humeur déclarée, à confirmer avec plus de données » |

### Mémoire de l'Assistant

L'Assistant IA maintient trois strates de mémoire, chacune avec une politique de rétention distincte :

- **Mémoire de session** : contexte de la conversation en cours, non persistée.
- **Mémoire de faits** : préférences déclarées, contraintes connues, décisions passées explicitement mémorisées à la demande de l'utilisateur ou détectées comme durables.
- **Mémoire statistique** : corrélations et tendances calculées sur l'historique complet du graphe de données, recalculées périodiquement.

## 08 · Module : Personnel

### Rôle

Le module Personnel est le cœur battant de L'Édifice — le module dont dépend directement la validité du principe fondateur de priorisation par l'énergie, et celui qui fournit à l'Assistant IA la matière première la plus riche pour ses corrélations. Il centralise l'ensemble des données physiologiques, comportementales et psychologiques de l'utilisateur.

Il se structure en un sous-ensemble central baptisé Vitals — les données physiologiques et de forme — et en plusieurs domaines complémentaires : habitudes, journal, objectifs personnels, gestion du temps.

### Sous-module Vitals : sommeil, sport, santé, nutrition

**Sommeil.** Source principale : Garmin, synchronisé automatiquement. Données collectées : durée totale, répartition des phases (léger, profond, paradoxal), fréquence cardiaque nocturne, variabilité de la fréquence cardiaque (VFC), score de sommeil calculé par Garmin, heure de coucher et de lever.

L'Édifice ne se contente pas d'afficher ces métriques : il calcule une dette de sommeil glissante sur 14 jours, comparée à un objectif personnel défini par l'utilisateur, et l'expose à l'Assistant IA comme variable d'entrée du calcul de niveau d'énergie quotidien.

**Sport.** Trois sources se combinent :
- Garmin : données brutes d'activité (course, cyclisme, fréquence cardiaque à l'effort, allure, dénivelé, charge d'entraînement, VO2max estimé).
- Runna : plans d'entraînement structurés de course à pied, séances prévues vs séances réalisées, progression du plan.
- Hevy : séances de musculation, charges soulevées, volume d'entraînement, progression par exercice.

L'Édifice consolide ces trois sources dans une vue unique de charge d'entraînement hebdomadaire, en distinguant charge cardio et charge de force, et calcule un indice de récupération croisant cette charge avec les données de sommeil et de VFC.

**Santé.** Données de santé générales : poids (évolution, tendance), mesures corporelles optionnelles, épisodes de maladie ou blessure déclarés au journal, rendez-vous médicaux (liés au calendrier), traitements en cours si pertinent pour le suivi. Le module ne vise pas à se substituer à un dossier médical mais à fournir à l'Assistant IA les signaux nécessaires pour expliquer des baisses de performance ou d'énergie.

**Nutrition & hydratation.** Suivi des repas (saisie rapide via la barre de capture universelle du Cockpit, avec estimation calorique assistée par IA à partir d'une description en langage naturel), suivi calorique global, suivi de l'hydratation quotidienne. Ces données alimentent directement les corrélations avec la performance sportive et l'énergie perçue.

### Sous-module Habitudes

Système de suivi d'habitudes récurrentes (méditation, lecture, temps d'écran, exposition à la lumière du matin, etc.), avec suivi de séries (streaks), taux de complétion glissant, et détection automatique des habitudes en voie d'abandon (baisse du taux de complétion sur une fenêtre glissante), qui déclenche une alerte douce plutôt qu'une notification culpabilisante.

### Sous-module Journal & Humeur

Un journal en texte libre, horodaté, avec une saisie d'humeur rapide associée (échelle simple, complétée si souhaité par un texte libre). Le journal n'est pas un simple carnet : chaque entrée est analysée par l'Assistant IA (avec le consentement explicite de l'utilisateur sur ce traitement) pour en extraire des signaux structurés — mentions de stress, de fatigue, d'un projet, d'une personne — qui viennent enrichir le graphe de corrélations sans que l'utilisateur ait à structurer manuellement son écriture.

### Sous-module Objectifs & Todo

Gestion des objectifs personnels à différents horizons (semaine, mois, trimestre, année), déclinés en tâches concrètes. Ce sous-module partage son moteur de suivi de progression avec le module Trajectoire du module Développement et avec les objectifs business, afin qu'un objectif personnel et un objectif professionnel soient traités avec la même rigueur de suivi (jalons, delta de progression, alertes de retard) sans dupliquer la logique.

La liste de tâches (Todo) de L'Édifice se distingue d'un gestionnaire de tâches classique par l'intégration native du niveau d'énergie requis par tâche (estimé par l'utilisateur ou appris par l'Assistant à partir de l'historique) et par la recommandation quotidienne générée par l'Assistant IA plutôt qu'un tri manuel.

### Sous-module Temps

Suivi du temps de travail et du temps libre, croisé avec le calendrier. Objectif : mesurer l'équilibre réel entre les catégories de temps (travail salarié ou indépendant, business personnel, sport, famille/social, repos), et le confronter aux objectifs d'équilibre déclarés par l'utilisateur.

### Historique, progression, statistiques

Chaque donnée du module Personnel est conservée avec un historique complet, jamais écrasée. L'interface propose des vues de progression sur plusieurs échelles de temps (semaine, mois, trimestre, année, historique complet), avec une bibliothèque de statistiques prêtes à l'emploi (tendance de sommeil, évolution du poids, progression de charge en musculation, taux de complétion des habitudes) et la possibilité pour l'Assistant IA de générer des statistiques ad hoc à la demande.

### Exemple de chaîne de corrélation

Le module Personnel est celui qui rend concrète la chaîne de corrélation citée dans le brief du projet :

```
 Sommeil insuffisant (Vitals)
              │
              ▼
 Récupération incomplète ──────► Performance sportive en baisse (Vitals)
              │
              ▼
 Humeur en baisse (Journal)
              │
              ▼
 Productivité en baisse (Temps, Todo)
              │
              ▼
 Retard sur les projets actifs (Développement / Trajectoire, Business)
```

Cette chaîne n'est pas câblée en dur : elle émerge du moteur de corrélation de l'Assistant IA à partir des données réelles accumulées, et sa force (niveau de confiance) évolue avec le volume d'historique disponible.

### Tableau de synthèse

| Sous-domaine | Sources principales | Fréquence de mise à jour | Donnée dérivée clé |
|---|---|---|---|
| Sommeil | Garmin | Automatique, quotidienne | Dette de sommeil glissante (14j) |
| Sport | Garmin, Runna, Hevy | Automatique, par séance | Charge d'entraînement hebdomadaire, indice de récupération |
| Santé | Saisie manuelle, calendrier | Ponctuelle | Historique de poids, épisodes de santé |
| Nutrition / Hydratation | Saisie assistée par IA | Quotidienne | Bilan calorique, hydratation cumulée |
| Habitudes | Saisie manuelle rapide | Quotidienne | Taux de complétion glissant, séries |
| Journal / Humeur | Saisie manuelle | Quotidienne à hebdomadaire | Signaux structurés extraits par IA |
| Objectifs / Todo | Saisie manuelle + Assistant | Continue | Priorisation quotidienne pondérée par l'énergie |
| Temps | Calendrier, déclaratif | Continue | Équilibre travail / vie personnelle |

## 09 · Module : Business

### Rôle

Le module Business centralise tout ce qui relève de l'activité entrepreneuriale : la gestion de la relation commerciale (déléguée fonctionnellement au module CRM, mais orchestrée depuis Business), l'infrastructure technique de l'activité, les comptes et abonnements, la facturation, et le pipeline de projets commerciaux. Business est le module qui donne à L'Édifice sa dimension d'outil de pilotage d'entreprise, et pas seulement de vie personnelle.

### Domaines couverts

**Comptes, domaines & infrastructure liée à l'activité.** Inventaire centralisé des domaines détenus, de leur configuration DNS, et des services d'infrastructure utilisés pour l'activité (Cloudflare pour le DNS et la protection, Railway et Vercel pour l'hébergement et le déploiement, Supabase pour les données). Ce sous-domaine est en miroir fonctionnel du module Infrastructure : Business en présente la vue orientée coût et criticité business, Infrastructure en présente la vue orientée exploitation technique.

**Comptes & abonnements.** Registre de tous les comptes de service liés à l'activité (SaaS, API, outils), avec date de renouvellement, coût, et statut d'utilisation réelle. Ce registre alimente directement le module Finances (coût récurrent) et l'Observatoire (alerte de renouvellement à venir, détection d'abonnements sous-utilisés).

**API.** Suivi des clés d'API utilisées par l'activité (limite de quota, coût à l'usage, statut), avec une attention particulière aux API facturées à l'usage (IA notamment), dont la consommation est remontée dans l'Observatoire sous forme de coût IA suivi en continu.

**Facturation & paiements.** Émission et suivi des factures clients, suivi des paiements reçus et des paiements en attente, rapprochement avec les mouvements du module Finances. Intégration prévue avec Stripe pour la capture des paiements et la réconciliation automatique.

**Documents & contrats.** Les contrats, devis et documents commerciaux sont stockés et classés via le module Bibliothèque, mais indexés et retrouvables depuis Business par entité liée (client, projet, fournisseur), pour éviter toute duplication de système de classement.

**Pipeline commercial & gestion de projets.** Vue d'ensemble du pipeline commercial (prospects, opportunités en cours, taux de conversion), en lien direct avec le module CRM qui en détient les données fines. La gestion de projets business (livrables, jalons, ressources) partage son moteur avec le module Trajectoire du module Développement, garantissant un traitement homogène entre projets techniques et projets commerciaux.

### Principe d'architecture : Business comme orchestrateur, pas comme silo

Une tentation naturelle de conception serait de faire de Business un module monolithique contenant CRM, facturation et infrastructure. L'Édifice fait le choix inverse : Business est une couche de synthèse et d'orchestration au-dessus de modules spécialisés (CRM, Finances, Infrastructure, Bibliothèque, Développement), à l'image du rôle que joue le Cockpit au niveau de l'ensemble du système. Cette séparation évite la duplication de logique et garde chaque module spécialisé réutilisable indépendamment.

## 10 · Module : CRM

### Rôle

Le CRM gère la relation avec les clients et prospects de l'activité. C'est un module spécialisé mais profondément connecté : sa valeur dans L'Édifice dépasse celle d'un CRM classique du fait de sa connexion directe aux modules Finances, Bibliothèque, Automatisations et Observatoire.

### Structure des données

**Contacts.** Fiche contact enrichie : identité, rôle, entreprise, canal de contact préféré, historique complet des interactions (emails, appels, réunions liées au calendrier), et statut relationnel (prospect froid, prospect chaud, client actif, client inactif, ancien client).

**Prospects & opportunités.** Chaque opportunité commerciale est suivie à travers un pipeline à étapes configurables (premier contact, qualification, proposition, négociation, gagné/perdu), avec une valeur estimée, une probabilité de conversion, et une date de clôture prévisionnelle. Le pipeline agrégé alimente directement la vision « gains potentiels » demandée à l'Assistant IA au niveau du Cockpit et de l'Observatoire.

**Historique d'interactions.** Toute interaction — email envoyé ou reçu (via l'intégration Gmail), réunion tenue (via l'intégration Google Calendar), note manuelle — est journalisée sur la fiche contact concernée, construisant un historique complet consultable en un seul endroit plutôt que dispersé entre boîte mail et agenda.

### Fonctionnalités clés

- **Détection de relances nécessaires** : l'Assistant IA identifie les opportunités sans interaction récente au regard de leur étape de pipeline, et propose une relance — un exemple typique de la logique « l'IA augmente, elle ne remplace pas » : la relance est proposée, jamais envoyée automatiquement sans validation.
- **Scoring de prospects** : un score de priorité est calculé à partir de la valeur estimée, de la probabilité de conversion et de la fraîcheur de l'interaction, pour nourrir la section « signaux business » du Cockpit.
- **Vue unifiée client** : pour un client donné, une vue consolidée agrège son historique CRM, ses factures (Finances), ses contrats (Bibliothèque) et ses projets actifs (Développement / Trajectoire).

### Tableau de synthèse Business / CRM

| Élément | Propriétaire fonctionnel | Connecté à |
|---|---|---|
| Domaines & DNS | Business (vue coût) / Infrastructure (vue technique) | Infrastructure, Finances |
| Comptes & abonnements | Business | Finances, Observatoire |
| Facturation & paiements | Business | Finances, CRM |
| Contrats & documents | Bibliothèque (stockage), Business (indexation) | CRM, Développement |
| Pipeline commercial | CRM | Business, Observatoire |
| Contacts & historique | CRM | Automatisations (relances), Bibliothèque |
| Projets commerciaux | Business ↔ Développement (Trajectoire) | Finances, CRM |

## 11 · Module : Création de Contenu

### Rôle

Le module Création de Contenu couvre l'intégralité du pipeline de production et de diffusion de contenu, de l'idée initiale à la mesure de performance post-publication. Sa vocation est de réduire au minimum la friction entre une idée et sa publication, tout en conservant une bibliothèque structurée et des statistiques exploitables.

### Le pipeline complet

```
 Idée ──► Script ──► Voix ──► Montage ──► Sous-titres
                                              │
        ,-------------------------------------
        v
 Médias ──► Planification ──► Publication ──► Statistiques ──► Optimisation
   │                                                                 │
   `-----------------------------------------------------------------
        Boucle d'apprentissage : les statistiques de performance
                    ré-informent les idées futures
```

**Idée & script.** Capture d'idées via la barre de capture universelle du Cockpit, classées par plateforme cible et par format. Génération assistée de scripts par IA à partir d'une idée brève, avec plusieurs variantes de ton (éducatif, narratif, direct) proposées et affinables par itération.

**Voix & montage.** Génération ou sélection de voix off (synthèse vocale ou enregistrement propre), montage assisté (découpage, rythme, ajout de musique et d'effets), génération automatique de sous-titres synchronisés, avec relecture obligatoire avant validation — aucun contenu n'est publié sans validation humaine explicite du montage final.

**Bibliothèque médias.** Stockage centralisé de tous les actifs de contenu (vidéos brutes, montées, visuels, musiques, templates), avec un système de tags permettant de retrouver un actif par plateforme, campagne, ou sujet. Ce sous-domaine partage son infrastructure de stockage avec le module Bibliothèque global mais reste indexé selon une taxonomie propre au contenu.

**Planification & publication.** Calendrier éditorial centralisé, multi-plateforme, avec publication automatisée aux formats et horaires optimaux par plateforme :

| Plateforme | Format principal | Particularité de publication |
|---|---|---|
| YouTube | Vidéo longue / Shorts | Titres, miniatures et description optimisés SEO |
| TikTok | Vidéo courte verticale | Fenêtre de publication optimisée par tendance |
| Instagram | Reels, carrousels, stories | Cohérence visuelle de grille |
| Pinterest | Épingles visuelles | Optimisation SEO de recherche visuelle |
| LinkedIn | Texte long, carrousel professionnel | Ton et format adaptés à l'audience professionnelle |
| Threads | Texte court, conversationnel | Publication réactive, liée à l'actualité |

**Statistiques & optimisation.** Remontée centralisée des statistiques de chaque plateforme (vues, engagement, rétention, conversion), agrégées dans une vue unique plutôt que dispersées dans chaque application native. L'Assistant IA identifie les formats et sujets les plus performants et alimente la phase d'idéation suivante — bouclant le pipeline.

### Automatisations du module

- Publication planifiée automatique aux horaires définis.
- Redimensionnement et adaptation automatique d'un même contenu source aux formats de chaque plateforme.
- Alerte lorsqu'une statistique de performance s'écarte significativement de la moyenne historique (positive ou négative).

## 12 · Module : Observatoire

### Rôle

L'Observatoire est le tableau de bord global de L'Édifice : la vue macro qui permet, en un coup d'œil, de juger de l'état de santé général du système de vie de l'utilisateur — au-delà du quotidien traité par le Cockpit. Là où le Cockpit répond à « que dois-je faire aujourd'hui », l'Observatoire répond à « comment vont les choses, globalement, en ce moment ».

### Domaines couverts

- **KPI** : indicateurs clés définis par l'utilisateur, personnels et business, suivis dans le temps.
- **Coûts IA** : suivi fin de la consommation et du coût des API d'intelligence artificielle utilisées par L'Édifice lui-même (Anthropic, OpenAI), pour garder le système économiquement maîtrisé.
- **Statistiques & performances** : vues consolidées de performance sur toutes les dimensions (sport, business, contenu, finances).
- **Objectifs** : état de progression de tous les objectifs actifs, tous modules confondus, avec indicateur visuel d'avance ou de retard.
- **Temps** : répartition du temps sur les grandes catégories de vie, tendance sur la durée.
- **Business** : chiffre d'affaires, pipeline, marge, comptes clients.
- **Sport & Santé** : tendances de forme physique sur le temps long.
- **Finances** : trésorerie, dépenses récurrentes, projection.
- **Alertes** : liste consolidée de toutes les alertes actives, tous modules confondus, triées par criticité.
- **Recommandations IA** : synthèse hebdomadaire des recommandations les plus importantes produites par l'Assistant IA.

### Principe de conception : lecture seule, agrégation pure

L'Observatoire, comme le Cockpit, ne possède aucune donnée propre : c'est une couche de visualisation et d'agrégation en lecture sur le graphe de données commun. Cette contrainte architecturale garantit qu'il n'existe jamais de désynchronisation entre une donnée « source » et sa représentation dans l'Observatoire.

### Fréquences de synthèse

| Horizon | Contenu | Déclenchement |
|---|---|---|
| Quotidien | Alertes actives, KPI du jour | Automatique, à l'ouverture |
| Hebdomadaire | Synthèse de tendances, recommandations IA | Généré chaque dimanche soir |
| Mensuel | Bilan complet, comparaison au mois précédent | Généré en début de mois |
| Trimestriel / annuel | Bilan stratégique, révision d'objectifs long terme | Généré à date fixe, revue manuelle recommandée |

## 13 · Module : Bibliothèque

### Rôle

La Bibliothèque est le système de gestion documentaire centralisé de L'Édifice. Sa fonction est d'éviter la dispersion de documents entre Google Drive, emails, disque local et applications tierces, en offrant un point de classement et de recherche unique — sans pour autant dupliquer inutilement le stockage physique quand une source externe (Google Drive notamment) fait déjà autorité.

### Fonctionnalités

- **Classement automatique** : les documents entrants (factures reçues par email, contrats signés, exports de données) sont classés automatiquement par type et par entité liée (client, projet, fournisseur), avec proposition de classement validée par l'utilisateur pour les cas ambigus.
- **Indexation par entité** : chaque document est lié à une ou plusieurs entités du graphe de données (un client CRM, un projet Trajectoire, une dépense Finances), le rendant retrouvable depuis n'importe quel module concerné plutôt que seulement depuis la Bibliothèque elle-même.
- **Recherche sémantique** : recherche en langage naturel dans le contenu des documents (et pas seulement dans leurs noms de fichiers), via indexation du texte extrait.
- **Gestion de versions** : conservation de l'historique des versions d'un document modifié, avec horodatage.
- **Notes liées** : les notes personnelles ou professionnelles font partie de la Bibliothèque et peuvent être liées à n'importe quelle entité du système.

### Connexions principales

La Bibliothèque est un module de support pour Business (contrats), CRM (documents clients), Développement (documentation technique et produit), Finances (factures) et Création de Contenu (bibliothèque médias, dont la gestion fine reste néanmoins spécialisée dans le module Contenu).

## 14 · Module : Développement

### Rôle

Le module Développement centralise le suivi de tous les projets techniques et produits — y compris L'Édifice lui-même, qui se documente et se pilote à travers son propre système, dans une logique de « dogfooding » assumée. Le sous-module de suivi de projets porte un nom propre au sein du système : Trajectoire.

### Sous-module Trajectoire

Trajectoire est le moteur de suivi de projet de L'Édifice, utilisé aussi bien pour les projets techniques (développement de L'Édifice lui-même, produits logiciels) que — via un partage de moteur — pour les projets business et les objectifs personnels de long terme (cf. modules Personnel et Business). Il gère :

- **Roadmap par projet** : jalons, dépendances entre jalons, statut (planifié, en cours, bloqué, terminé).
- **Tâches** : découpage d'un jalon en tâches concrètes, avec estimation d'effort et niveau d'énergie requis (cohérent avec le moteur de priorisation du module Personnel).
- **Suivi de dérive** : comparaison continue entre la progression planifiée et la progression réelle, avec alerte automatique en cas de dérive au-delà d'un seuil défini.
- **Dépendances inter-projets** : un projet peut dépendre de l'achèvement d'un autre (technique ou business), rendant visibles les blocages en cascade.

### Suivi des dépôts de code

Intégration avec GitHub pour suivre l'activité de développement (commits, pull requests, issues) et la relier aux jalons Trajectoire correspondants. Cette intégration permet à l'Assistant IA de rapprocher l'avancement réel du code de la progression déclarée d'un projet, et de signaler un écart (jalon marqué « en cours » sans activité de code récente, par exemple).

### Documentation vivante

Conformément au principe fondateur n°9, le module Développement encourage — et à terme impose — la mise à jour de la documentation dans le même changement que le code. La documentation interne du projet est centralisée et versionnée, avec un lien direct entre chaque document et le ou les projets Trajectoire concernés.

### Environnements & qualité

Suivi des environnements de développement, de test et de production, et des pratiques de validation associées : revue systématique de chaque changement avant intégration, conventions de commit standardisées (type de changement, portée, résumé impératif, description en points, référence). Cette rigueur, appliquée à L'Édifice depuis son origine, est documentée ici pour rester la référence applicable à tout projet futur du module Développement.

## 15 · Module : Finances

### Rôle

Le module Finances centralise la vision financière complète de l'utilisateur, personnelle et business, dans un cadre suffisamment structuré pour servir de base fiable aux décisions, sans pour autant se substituer à un outil de comptabilité réglementaire.

### Domaines couverts

- **Comptes** : vue consolidée des comptes bancaires et de paiement, personnels et professionnels.
- **Revenus** : suivi des revenus par source (salaire, revenus business, revenus de contenu), avec historique et tendance.
- **Dépenses** : catégorisation automatique assistée par IA, avec apprentissage progressif des habitudes de catégorisation de l'utilisateur.
- **Abonnements récurrents** : registre unique de tous les abonnements (personnels et business), avec alerte de renouvellement et détection de sous-utilisation — en lien direct avec le registre d'abonnements du module Business pour la partie professionnelle.
- **Facturation** : suivi des factures émises et reçues, rapprochement avec les paiements effectifs (intégration Stripe prévue).
- **Budgets** : définition de budgets par catégorie, suivi en temps réel de la consommation du budget, projection de fin de période.
- **Trésorerie & projection** : vue de trésorerie consolidée avec projection à court et moyen terme, prenant en compte les revenus attendus (pipeline CRM) et les dépenses récurrentes connues.

### Corrélations activées par Finances

Le module Finances, connecté au reste du graphe, permet des corrélations qui dépassent la comptabilité classique : anticiper une tension de trésorerie à partir d'un ralentissement du pipeline commercial (CRM), ou mesurer le retour réel d'un investissement en contenu en croisant les coûts de production (Contenu) avec les revenus attribuables.

## 16 · Module : Infrastructure

### Rôle

Le module Infrastructure est la vue opérationnelle et technique de tout ce qui fait tourner L'Édifice et les projets qui en dépendent : domaines, hébergement, services cloud, environnements de déploiement. Il est le pendant technique du sous-domaine « comptes & infrastructure » du module Business, qui en présente la vue orientée coût.

### Domaines couverts

- **Domaines & DNS** : inventaire des noms de domaine, configuration DNS, gestion via Cloudflare.
- **Hébergement & déploiement** : suivi des projets déployés sur Vercel (frontend) et Railway (services backend), statut de déploiement, historique de versions déployées.
- **Base de données & stockage** : suivi de l'infrastructure Supabase (base de données PostgreSQL, authentification, stockage de fichiers), incluant l'usage et les quotas.
- **Environnements** : distinction claire entre environnements de développement, de test (staging) et de production, avec les règles de promotion d'un environnement à l'autre.
- **Monitoring & incidents** : suivi de la disponibilité et des incidents techniques, avec journal d'incidents et actions correctives associées.

### Connexion avec Développement et Business

Infrastructure ne duplique pas la vision de Trajectoire (Développement) ni celle du sous-domaine infrastructure de Business : il en est la couche d'exécution technique, consultée pour le détail opérationnel quand les deux autres modules en présentent des vues orientées projet et orientées coût.

## 17 · Module : Paramètres

### Rôle

Le module Paramètres gère la configuration globale du système : identité de l'utilisateur, préférences d'interface, comptes tiers liés, règles de sécurité, et réglages spécifiques à chaque module.

### Domaines couverts

- **Identité & profil** : informations de base de l'utilisateur, objectifs déclarés de haut niveau (utilisés comme référence par l'Assistant IA).
- **Comptes liés** : gestion centralisée de toutes les connexions OAuth et clés d'API vers les services tiers, avec statut de connexion et date de dernière synchronisation.
- **Préférences** : réglages d'affichage, unités de mesure, fuseau horaire, langue, seuils personnalisés utilisés par les moteurs de recommandation (par exemple, le seuil de dette de sommeil déclenchant une alerte).
- **Sécurité** : gestion de l'authentification, de la politique de mots de passe ou clés d'accès, des sessions actives, et des journaux d'accès.
- **Notifications** : configuration fine des canaux et de la fréquence des notifications par type d'alerte, pour éviter la fatigue de notification.

## 18 · Module : Automatisations

### Rôle

Le module Automatisations est une couche transversale : il ne possède pas de domaine de vie propre, mais orchestre les règles automatiques qui traversent tous les autres modules, conformément au principe fondateur n°4 (« automatiser tout ce qui peut l'être »).

### Structure d'une automatisation

Chaque automatisation de L'Édifice suit une structure uniforme, quel que soit le module concerné :

```
 DÉCLENCHEUR ──► CONDITION(S) ──► ACTION(S) ──► JOURNALISATION
```

- **Déclencheur** : un événement du système (nouvelle donnée synchronisée, seuil franchi, date atteinte) ou une planification (horaire fixe, récurrence).
- **Condition(s)** : filtres logiques qui déterminent si l'action doit se déclencher.
- **Action(s)** : effet produit — création d'une tâche, envoi d'une notification, classement d'un document, publication planifiée, mise à jour d'un statut. Les actions à conséquence irréversible (envoi externe, paiement, suppression) requièrent une validation explicite, conformément au principe fondateur n°7.
- **Journalisation** : chaque exécution d'automatisation est journalisée, consultable et auditable, pour permettre de comprendre a posteriori pourquoi une action a été déclenchée.

### Exemples d'automatisations par module

| Module concerné | Exemple d'automatisation |
|---|---|
| Personnel | Synchronisation automatique quotidienne des données Garmin, Runna, Hevy |
| CRM | Proposition de relance après 10 jours sans interaction sur une opportunité active |
| Finances | Alerte 5 jours avant le renouvellement d'un abonnement non utilisé depuis 60 jours |
| Contenu | Publication automatique aux horaires planifiés, adaptation multi-format automatique |
| Bibliothèque | Classement automatique d'une facture reçue par email dans le bon dossier client |
| Développement | Alerte si un jalon Trajectoire est marqué « en cours » sans commit associé depuis 7 jours |
| Observatoire | Génération automatique de la synthèse hebdomadaire chaque dimanche soir |

### Gouvernance des automatisations

Pour éviter qu'une automatisation mal conçue ne devienne une source d'erreurs silencieuses, chaque règle active doit être consultable dans une vue centralisée listant : son déclencheur, ses conditions, ses actions, son historique récent d'exécution, et un interrupteur d'activation/désactivation immédiat.

---

# PARTIE III — Architecture & Données

*Modèle de données, architecture technique et gouvernance de la sécurité.*

## 19 · Modèle de données & graphe de connexions

### Le principe du graphe unique

La promesse centrale de L'Édifice — la corrélation transversale — repose entièrement sur un choix de modélisation : toutes les entités du système vivent dans une base de données relationnelle unique, reliées par des clés étrangères et des tables de liaison explicites, plutôt que dans des bases de données séparées par module. Un module « voit » son propre domaine à travers une vue restreinte de ce graphe, mais rien n'empêche techniquement une requête transversale.

### Entités fondamentales

Le modèle de données distingue des entités primaires (les objets de premier ordre du système) et des entités de liaison (qui matérialisent les relations entre entités primaires, souvent enrichies de métadonnées propres).

| Entité primaire | Module propriétaire | Exemples d'attributs |
|---|---|---|
| utilisateur | Paramètres | identité, préférences, seuils personnalisés |
| activite_sommeil | Personnel (Vitals) | date, durée, phases, VFC, source |
| seance_sport | Personnel (Vitals) | date, type, charge, source (Garmin/Runna/Hevy) |
| entree_journal | Personnel | date, texte, humeur, signaux extraits |
| habitude / suivi_habitude | Personnel | définition, occurrence, statut |
| objectif | Personnel / Business / Développement | titre, horizon, jalons, statut |
| tache | Personnel / Développement | titre, échéance, énergie requise, statut |
| contact | CRM | identité, entreprise, statut relationnel |
| opportunite | CRM | valeur, étape, probabilité |
| interaction | CRM | type, date, contenu, contact lié |
| transaction | Finances | montant, catégorie, date, compte |
| abonnement | Finances / Business | service, coût, date de renouvellement |
| document | Bibliothèque | fichier, type, entités liées, version |
| projet (Trajectoire) | Développement | jalons, dépendances, statut |
| contenu | Création de Contenu | statut pipeline, plateforme, statistiques |
| ressource_infra | Infrastructure | type, fournisseur, environnement |
| automatisation | Automatisations | déclencheur, conditions, actions, historique |
| evenement | Transversal (event bus) | type, entité source, horodatage, charge utile |

### L'entité transversale : evenement

L'entité `evenement` mérite une mention à part : elle n'appartient à aucun module métier, mais à la couche d'architecture orientée événements elle-même (cf. chapitre suivant). Chaque écriture significative sur une entité primaire génère un enregistrement `evenement`, consommé de façon asynchrone par les modules intéressés (Assistant IA pour recalcul de corrélations, Observatoire pour rafraîchissement d'agrégats, Automatisations pour évaluation de déclencheurs).

### Schéma relationnel simplifié

*(Schéma simplifié à des fins de lisibilité : la totalité des relations est documentée dans le schéma de base de données versionné du projet, pas dans ce document.)*

```
                        utilisateur
                             │
       ┌─────────┼──────────────────────────────────────────────┐
       │          │                                              │
       ▼          ▼                                              ▼
    Vitals    objectif ◄────────────┐                       contact (CRM)
  (sommeil,       │                  │                            │
   sport,         ▼                  │                            ▼
   santé)      tache ───────────► projet (Trajectoire)      opportunite
       │          │                  │                            │
       │          │                  ▼                            ▼
       │          │            ressource_infra              interaction
       │          │                  │                            │
       ▼          ▼                  ▼                            ▼
  entree_journal automatisation ◄──────── evenement ──────► transaction
       ▲              │                                          │
       └──────────────┘                                          ▼
                                                              abonnement
```

### Règles de modélisation

- Toute entité est horodatée (création, dernière modification) et conserve, quand c'est pertinent, un historique de versions plutôt qu'un simple écrasement.
- Toute donnée importée d'une source externe conserve une référence à sa source (identifiant externe, date de synchronisation), pour permettre une resynchronisation fiable et éviter les doublons.
- Les relations inter-modules passent par des tables de liaison explicites, jamais par des champs texte libres non structurés — condition nécessaire pour que le moteur de corrélation de l'Assistant IA puisse exploiter ces relations de façon fiable.
- Aucune suppression physique par défaut : les entités sont archivées (soft delete) plutôt que supprimées, pour préserver l'intégrité de l'historique utilisé par les corrélations statistiques. La suppression physique reste possible explicitement, notamment pour l'exercice du droit à l'oubli sur des données sensibles.

## 20 · Architecture technique

### Stack technologique

L'Édifice repose sur une stack délibérément resserrée, choisie pour sa maturité, sa vélocité de développement en solo, et l'absence de verrou propriétaire fort :

| Couche | Choix technologique | Justification |
|---|---|---|
| Frontend | Next.js (React) | Rendu hybride (serveur/client), écosystème mature, déploiement natif sur Vercel |
| Hébergement frontend | Vercel | Déploiement continu, aperçus par branche, scalabilité automatique |
| Backend applicatif | Python (FastAPI) | Performance, typage explicite, écosystème riche pour l'intégration IA et le traitement de données |
| Hébergement backend | Railway | Déploiement simple de services Python persistants, adapté aux workers et tâches de fond |
| Base de données | Supabase (PostgreSQL) | Base relationnelle robuste, authentification intégrée, stockage de fichiers, temps réel natif |
| Authentification | Supabase Auth | Gestion centralisée de l'identité, compatible OAuth pour les intégrations tierces |
| Stockage de fichiers | Supabase Storage | Cohérent avec la base de données, gestion fine des permissions |
| DNS & protection | Cloudflare | Gestion des domaines, protection contre les abus, mise en cache en périphérie |
| Modèles d'IA | Anthropic (Claude), avec OpenAI en option | Raisonnement de l'Assistant IA, génération de contenu, extraction de signaux |

> **Note (2026) :** le backend applicatif FastAPI tourne en réalité sur Vercel, pas sur Railway — Railway n'est utilisé aujourd'hui que pour le traitement vidéo du module Création de Contenu. Cet écart entre la doc et la réalité de déploiement est connu et à corriger dans une prochaine révision (cf. `knowledge/`).

### Vue d'ensemble de l'architecture

```
 ┌───────────────────────┐
 │  Frontend (Next.js)   │ ◄── Vercel
 │  Cockpit · Modules UI │
 └───────────┬───────────┘
             │ HTTPS / API
 ┌───────────▼───────────┐
 │ Backend API (FastAPI) │ ◄── Railway
 │  Logique métier · IA  │
 └───┬───────────────┬────┘
     │               │
 ┌───▼──────────┐ ┌───▼─────────────────┐
 │  Supabase    │ │ File d'attente /    │
 │ (PostgreSQL, │◄►│ Workers            │
 │ Auth, Storage)│ │ (traitements async, │
 └──────────────┘ │ synchronisations)   │
                   └─────┬────────────────┘
                         │
             ┌────────────▼─────────────┐
             │  Intégrations externes    │
             │ Garmin · Google · GitHub  │
             │ Stripe · réseaux sociaux  │
             └───────────────────────────┘
```

### Architecture orientée événements

La circulation des données entre modules (principe fondateur n°5) est assurée par un bus d'événements interne : toute écriture significative sur une entité du graphe émet un événement structuré (`entite.action`, ex. `seance_sport.creee`, `objectif.mis_a_jour`). Les modules et services intéressés s'abonnent aux types d'événements pertinents plutôt que d'interroger en permanence l'état des autres modules (pull), ce qui limite le couplage direct entre modules et permet d'ajouter un nouveau module consommateur sans modifier les modules producteurs.

### Files d'attente & workers

Les traitements longs ou différables (synchronisation d'une intégration externe, génération de contenu IA, recalcul de corrélations statistiques) sont exécutés de façon asynchrone par des workers dédiés, découplés du cycle de requête/réponse de l'API principale. Cette séparation garantit que l'interface reste réactive même lorsqu'un traitement lourd est en cours en arrière-plan.

### Intégrations, OAuth & Webhooks

Chaque intégration tierce suit un patron uniforme :

1. **Connexion** : authentification OAuth2 quand le fournisseur le permet (Google, GitHub), ou clé d'API sécurisée sinon (Garmin selon disponibilité, Hevy).
2. **Synchronisation** : pull périodique planifié pour les sources sans webhook, ou réception de webhook en temps réel quand le fournisseur le propose (Stripe, GitHub).
3. **Normalisation** : les données reçues sont transformées vers le schéma interne de L'Édifice avant écriture, avec conservation de l'identifiant source (cf. règles de modélisation).
4. **Émission d'événement** : chaque synchronisation réussie émet un événement consommable par le reste du système.

### Modularité de l'architecture

Chaque module fonctionnel correspond, côté backend, à un ensemble cohérent de routes API, de modèles de données et de règles métier, organisé pour rester indépendant des autres modules à l'exception des interfaces explicites (événements, requêtes de lecture transversale documentées). Cette modularité permet de faire évoluer un module (par exemple, changer la logique de calcul de charge d'entraînement) sans effet de bord non maîtrisé sur les autres.

### Monitoring, logs & observabilité technique

Distincte de l'Observatoire fonctionnel (qui présente une vue métier), l'observabilité technique de L'Édifice couvre : les journaux structurés de chaque service, le suivi de performance des requêtes API, le suivi des erreurs et leur taux, et le suivi de la consommation des API tierces (notamment IA, dont le coût est également remonté côté métier dans l'Observatoire).

### Sauvegardes & continuité

Sauvegardes automatiques régulières de la base de données (gérées nativement par Supabase, complétées par des exports périodiques indépendants pour garantir la portabilité, conformément au principe de souveraineté des données), avec une procédure de restauration testée périodiquement plutôt que supposée fonctionnelle.

### Scalabilité

Bien que conçu pour un utilisateur unique, L'Édifice est architecturé pour ne pas exclure une évolution multi-tenant future : les entités du graphe sont, dès l'origine, rattachées à un identifiant `utilisateur`, même lorsque ce rattachement est aujourd'hui trivial (un seul utilisateur existant). Ce choix évite une migration de schéma majeure si le projet devait un jour s'ouvrir à d'autres utilisateurs, conformément à la vision énoncée en introduction — sans pour autant complexifier prématurément la logique applicative actuelle (principe fondateur n°10).

## 21 · Sécurité & Gouvernance des données

### Pourquoi ce chapitre est critique

L'Édifice centralise, par construction, la totalité des données sensibles d'une vie : santé, finances, contenu privé du journal, relations professionnelles. Cette centralisation est la source de la valeur du projet, mais elle est aussi, symétriquement, le point de défaillance le plus critique en cas de compromission. La sécurité n'est donc pas un chapitre optionnel ajouté a posteriori : c'est une contrainte de conception au même titre que la corrélation de données.

### Principes de gouvernance

- **Souveraineté avant commodité.** Chaque fournisseur tiers intégré est choisi en tenant compte de sa politique de données, de sa localisation d'hébergement, et de la possibilité d'exporter et de supprimer intégralement les données qui lui sont confiées.
- **Chiffrement au repos et en transit.** Les données sensibles (santé, finances, contenu du journal) sont chiffrées au repos dans la base de données, et toutes les communications entre le frontend, le backend et les services tiers transitent exclusivement en HTTPS/TLS.
- **Principe du moindre privilège.** Chaque intégration tierce ne demande que les scopes OAuth strictement nécessaires à sa fonction. Un accès en lecture seule est systématiquement préféré à un accès en écriture quand la fonctionnalité ne requiert pas d'écriture.
- **Traçabilité complète.** Toute action sensible (accès à une donnée de santé, modification d'une donnée financière, exécution d'une automatisation à conséquence) est journalisée avec horodatage, dans un journal d'audit consultable.
- **Séparation des secrets et du code.** Toutes les clés d'API et secrets d'authentification sont gérés via un système de variables d'environnement sécurisées, jamais versionnés dans le code source.

### Authentification & contrôle d'accès

L'authentification de l'utilisateur repose sur Supabase Auth, avec authentification forte recommandée (clé d'accès ou authentification à deux facteurs). Les connexions aux services tiers passent par OAuth2 quand disponible, avec des jetons de rafraîchissement stockés chiffrés et une politique de rotation périodique.

### Classification des données

| Niveau de sensibilité | Exemples | Traitement |
|---|---|---|
| Critique | Santé, données financières, authentification | Chiffrement au repos renforcé, accès journalisé, export/suppression prioritaires |
| Sensible | Journal personnel, CRM (données de tiers) | Chiffrement au repos, accès restreint |
| Standard | Contenu créatif, documentation technique | Protection standard de la plateforme |
| Publique | Contenu déjà publié sur les réseaux sociaux | Aucune exigence de confidentialité additionnelle |

### Données de tiers dans le CRM

Le module CRM contient des données personnelles de tiers (contacts, prospects, clients), ce qui engage une responsabilité distincte de celle des données strictement personnelles de l'utilisateur. L'Édifice applique aux données de tiers les mêmes exigences minimales qu'un CRM professionnel : finalité de traitement claire, durée de conservation raisonnable, et capacité de suppression sur demande.

### Droit à l'oubli & portabilité

Conformément au principe de souveraineté, L'Édifice garantit deux capacités structurelles, disponibles depuis le module Paramètres :

- **Export complet** : génération d'un export intégral et structuré de toutes les données de l'utilisateur, dans un format ouvert et exploitable, à tout moment.
- **Suppression ciblée ou totale** : possibilité de supprimer physiquement (et non seulement archiver) une entité ou l'ensemble des données, y compris chez les fournisseurs tiers intégrés dans la mesure permise par leurs API.

### Résilience & continuité

Au-delà des sauvegardes régulières décrites dans le chapitre Architecture technique, la résilience de L'Édifice repose sur un principe simple : la perte d'accès à une intégration tierce ne doit jamais entraîner de perte de données déjà synchronisées. Les données importées restent la propriété durable de la base de données de L'Édifice, indépendamment de la disponibilité future du fournisseur source.

---

# PARTIE IV — Intégrations & Trajectoire

*Écosystème d'intégrations, feuille de route et indicateurs de succès.*

## 22 · Intégrations

### Méthodologie

Chaque intégration listée ci-dessous est documentée selon un format uniforme, pour permettre une évaluation homogène de sa valeur et de sa priorité au fil de la feuille de route : objectif (pourquoi cette intégration existe), données récupérées (ce que L'Édifice importe), données envoyées (ce que L'Édifice écrit dans le service tiers, le cas échéant), valeur pour L'Édifice (le bénéfice de corrélation ou d'automatisation apporté), et priorité (Critique, Élevée, Moyenne, Différée).

La priorité n'est pas figée : elle est réévaluée à chaque cycle de roadmap en fonction de l'usage réel et de la disponibilité technique de l'API du fournisseur.

### Santé & Sport

**Garmin**
- Objectif : source de vérité pour toutes les données physiologiques passives (sommeil, fréquence cardiaque, VFC, activité).
- Données récupérées : sommeil (durée, phases, score), fréquence cardiaque au repos et à l'effort, VFC, activités sportives, VO2max estimé, charge d'entraînement.
- Données envoyées : aucune (intégration en lecture seule).
- Valeur pour L'Édifice : socle du sous-module Vitals ; alimente le calcul de dette de sommeil et de niveau d'énergie quotidien.
- Priorité : **Critique**.

**Runna**
- Objectif : suivi du plan d'entraînement structuré de course à pied.
- Données récupérées : séances planifiées, séances réalisées, progression du plan, ajustements de plan.
- Données envoyées : aucune (lecture seule dans un premier temps).
- Valeur pour L'Édifice : permet de comparer prescription et réalisation, et de corréler l'écart au niveau de récupération.
- Priorité : **Élevée**.

**Hevy**
- Objectif : suivi des séances de musculation.
- Données récupérées : exercices réalisés, charges, séries, répétitions, volume total.
- Données envoyées : aucune (lecture seule).
- Valeur pour L'Édifice : complète la vision de charge d'entraînement totale (cardio + force) utilisée dans l'indice de récupération.
- Priorité : **Élevée**.

**Strava**
- Objectif : source secondaire ou complémentaire d'activités sportives, utile pour la dimension sociale et la validation croisée des données Garmin.
- Données récupérées : activités, segments, statistiques de performance.
- Données envoyées : éventuellement, publication croisée d'une activité si souhaité.
- Valeur pour L'Édifice : redondance et enrichissement des données de sport, utile si Garmin ne couvre pas un type d'activité.
- Priorité : **Moyenne**.

### Productivité & Organisation

**Google Calendar**
- Objectif : source de vérité du calendrier, utilisée par le Cockpit et le moteur de priorisation.
- Données récupérées : événements, créneaux libres/occupés, participants.
- Données envoyées : création et modification d'événements (blocs de travail planifiés par l'Assistant IA, rappels).
- Valeur pour L'Édifice : condition nécessaire à la recommandation « que dois-je faire maintenant » du Cockpit.
- Priorité : **Critique**.

**Gmail**
- Objectif : intégration de la correspondance dans l'historique CRM et détection d'actions requises.
- Données récupérées : emails liés à des contacts CRM identifiés, pièces jointes pertinentes (factures, contrats).
- Données envoyées : brouillons de relance proposés par l'Assistant IA (jamais d'envoi automatique sans validation).
- Valeur pour L'Édifice : historique d'interaction complet sur les fiches contact du CRM ; alimentation automatique de la Bibliothèque.
- Priorité : **Élevée**.

**Google Drive**
- Objectif : source externe faisant autorité pour certains documents, référencée plutôt que dupliquée par la Bibliothèque.
- Données récupérées : métadonnées de fichiers, contenu pour indexation de recherche.
- Données envoyées : organisation de dossiers si nécessaire.
- Valeur pour L'Édifice : évite la duplication de stockage tout en gardant les documents retrouvables depuis la Bibliothèque.
- Priorité : **Moyenne**.

**Google Docs**
- Objectif : édition de documents longs (contrats, documentation) sans réinventer un éditeur de texte propre à L'Édifice.
- Données récupérées : contenu textuel pour indexation et recherche sémantique.
- Données envoyées : création de documents depuis des modèles L'Édifice.
- Valeur pour L'Édifice : rédaction sans friction, tout en conservant l'indexation centralisée.
- Priorité : **Moyenne**.

**Google Tasks**
- Objectif : point de synchronisation optionnel pour les utilisateurs de l'écosystème Google souhaitant une vue de tâches mobile native.
- Données récupérées : tâches créées côté Google.
- Données envoyées : tâches créées dans L'Édifice, pour visibilité croisée.
- Valeur pour L'Édifice : redondance d'accès mobile en attendant une application mobile native de L'Édifice.
- Priorité : **Différée**.

**Google Contacts**
- Objectif : enrichissement et synchronisation des fiches contact CRM.
- Données récupérées : coordonnées, photos, informations de base.
- Données envoyées : mise à jour de contacts enrichis par le CRM.
- Valeur pour L'Édifice : évite la ressaisie manuelle de contacts déjà connus dans l'écosystème Google.
- Priorité : **Moyenne**.

### Développement & Infrastructure

**GitHub**
- Objectif : suivi de l'activité de développement liée aux projets Trajectoire.
- Données récupérées : commits, pull requests, issues, statut de dépôt.
- Données envoyées : aucune dans un premier temps (lecture seule) ; création d'issues envisageable à terme.
- Valeur pour L'Édifice : rapproche la progression déclarée d'un projet de l'activité de code réelle.
- Priorité : **Élevée**.

**Supabase**
- Objectif : infrastructure de données principale de L'Édifice (pas une intégration externe au sens strict, mais un fournisseur de plateforme).
- Données récupérées / envoyées : l'ensemble du graphe de données de L'Édifice.
- Valeur pour L'Édifice : fondation de toute l'architecture.
- Priorité : **Critique** (infrastructure, non désactivable).

**Railway**
- Objectif : hébergement du backend applicatif et des workers.
- Données récupérées / envoyées : aucune donnée métier directe ; fournisseur d'exécution.
- Valeur pour L'Édifice : exécution fiable des traitements asynchrones et de l'API.
- Priorité : **Critique** (infrastructure).

**Vercel**
- Objectif : hébergement et déploiement continu du frontend.
- Données récupérées / envoyées : aucune donnée métier directe.
- Valeur pour L'Édifice : déploiement fiable de l'interface utilisateur.
- Priorité : **Critique** (infrastructure).

**Cloudflare**
- Objectif : gestion DNS et protection des domaines utilisés par L'Édifice et par l'activité Business.
- Données récupérées : statut DNS, statistiques de trafic et de menaces.
- Données envoyées : configuration DNS.
- Valeur pour L'Édifice : fiabilité et sécurité de l'exposition publique des domaines gérés.
- Priorité : **Élevée**.

### Intelligence artificielle

**Anthropic (Claude)**
- Objectif : moteur de raisonnement principal de l'Assistant IA.
- Données récupérées / envoyées : requêtes de contexte envoyées au modèle, réponses générées.
- Valeur pour L'Édifice : cœur du module Assistant IA.
- Priorité : **Critique**.

**OpenAI**
- Objectif : moteur alternatif ou complémentaire pour des tâches spécifiques (génération vocale, cas d'usage où un modèle alternatif est pertinent).
- Données récupérées / envoyées : requêtes ponctuelles selon la tâche.
- Valeur pour L'Édifice : diversification et redondance du moteur IA, utile en cas d'indisponibilité ou de limite de coût sur le fournisseur principal.
- Priorité : **Moyenne**.

### Finances

**Stripe**
- Objectif : capture des paiements clients et réconciliation avec la facturation du module Finances/Business.
- Données récupérées : paiements reçus, statut des factures, abonnements clients.
- Données envoyées : création de factures et de liens de paiement.
- Valeur pour L'Édifice : automatisation du rapprochement facturation/paiement.
- Priorité : **Élevée**.

### Communication & Notifications

**Discord**
- Objectif : canal de notification et, potentiellement, communauté autour du projet en cas d'ouverture publique future.
- Données récupérées : aucune par défaut.
- Données envoyées : notifications, alertes critiques.
- Valeur pour L'Édifice : canal de notification alternatif à l'email.
- Priorité : **Moyenne**.

**Slack**
- Objectif : canal de notification pour un usage professionnel, pertinent si l'activité Business implique une collaboration future.
- Données récupérées : aucune par défaut.
- Données envoyées : notifications ciblées.
- Valeur pour L'Édifice : intégration professionnelle standard.
- Priorité : **Différée**.

**Telegram**
- Objectif : canal de notification mobile léger, utile pour les alertes critiques nécessitant une réaction rapide.
- Données récupérées : aucune par défaut.
- Données envoyées : notifications, possibilité d'interaction avec l'Assistant IA en messagerie.
- Valeur pour L'Édifice : point d'entrée mobile complémentaire à l'interface web.
- Priorité : **Moyenne**.

**WhatsApp**
- Objectif : canal de notification alternatif, pertinent selon les habitudes de communication de l'utilisateur.
- Données récupérées : aucune par défaut.
- Données envoyées : notifications.
- Valeur pour L'Édifice : redondance de canal de notification.
- Priorité : **Différée**.

### Réseaux sociaux & création de contenu

**YouTube**
- Objectif : publication et suivi de performance de contenu vidéo long format et Shorts.
- Données récupérées : statistiques de vues, rétention, engagement, abonnés.
- Données envoyées : publication de vidéos, métadonnées (titre, description, miniature).
- Valeur pour L'Édifice : boucle complète de publication et d'optimisation du module Création de Contenu.
- Priorité : **Élevée**.

**TikTok**
- Objectif : publication et suivi de performance de contenu court format.
- Données récupérées : statistiques de vues, engagement, tendances.
- Données envoyées : publication de vidéos.
- Valeur pour L'Édifice : couverture d'une plateforme à fort potentiel de portée organique.
- Priorité : **Élevée**.

**Instagram**
- Objectif : publication de Reels, carrousels et stories.
- Données récupérées : statistiques d'engagement, portée, abonnés.
- Données envoyées : publication de contenu.
- Valeur pour L'Édifice : couverture d'une plateforme visuelle centrale du pipeline de contenu.
- Priorité : **Élevée**.

**Pinterest**
- Objectif : publication d'épingles à visée de recherche visuelle et de trafic longue traîne.
- Données récupérées : statistiques d'impressions et de clics.
- Données envoyées : publication d'épingles.
- Valeur pour L'Édifice : canal de trafic différé et cumulatif, complémentaire aux plateformes à consommation instantanée.
- Priorité : **Moyenne**.

**LinkedIn**
- Objectif : publication de contenu professionnel, pertinent pour la dimension Business de l'utilisateur.
- Données récupérées : statistiques d'engagement professionnel.
- Données envoyées : publication de posts et carrousels.
- Valeur pour L'Édifice : levier de crédibilité et de génération de prospects pour le module CRM.
- Priorité : **Moyenne**.

**Threads**
- Objectif : publication de contenu conversationnel court format.
- Données récupérées : statistiques d'engagement.
- Données envoyées : publication de posts.
- Valeur pour L'Édifice : réactivité et complément aux plateformes de contenu planifié.
- Priorité : **Moyenne**.

### Autres intégrations envisagées

**Notion (optionnel)**
- Objectif : import ponctuel de documentation existante avant sa migration complète vers la Bibliothèque de L'Édifice.
- Données récupérées : contenu de pages et bases de données Notion.
- Données envoyées : aucune.
- Valeur pour L'Édifice : facilite la transition depuis un système préexistant sans perte d'historique.
- Priorité : **Différée** (usage ponctuel de migration).

### Tableau récapitulatif des priorités

| Priorité | Intégrations |
|---|---|
| Critique | Garmin, Google Calendar, Supabase, Railway, Vercel, Anthropic (Claude) |
| Élevée | Runna, Hevy, Gmail, GitHub, Cloudflare, Stripe, YouTube, TikTok, Instagram |
| Moyenne | Strava, Google Drive, Google Docs, Google Contacts, OpenAI, Discord, Telegram, Pinterest, LinkedIn, Threads |
| Différée | Google Tasks, Slack, WhatsApp, Notion |

Cette hiérarchie de priorité est directement reprise dans la feuille de route pour séquencer les phases de développement (cf. chapitre Roadmap).

## 23 · Roadmap

### Principe directeur de la feuille de route

L'Édifice n'a pas de deadline dure, mais il a un horizon : un lancement public envisagé avant 2027. Cet horizon structure la feuille de route sans la contraindre rigidement — la priorité reste la solidité architecturale plutôt que la vitesse. La roadmap est donc organisée par phases fonctionnelles plutôt que par dates fixes, chaque phase étant néanmoins positionnée sur un horizon indicatif (court, moyen, long terme).

### Vue synthétique

```
  COURT TERME          MOYEN TERME           LONG TERME           VISION 5-10 ANS
  (0-6 mois)           (6-18 mois)           (18-36 mois)
  ───────────          ────────────          ────────────         ─────────────────
  Fondations           Intelligence          Automatisation       Ouverture publique
  · Cockpit MVP        · Assistant IA        complète             (multi-utilisateur)
  · Personnel/Vitals   · Corrélations        · Automatisations    · Écosystème de
  · Modèle de données  avancées              transversales        plugins/intégrations
  central              · Observatoire        matures              · Application mobile
  · Intégrations       complet               · Création de        native
  critiques (Garmin,   · CRM + Business      contenu pipeline     · Assistant vocal
  Calendar,            · Finances avancées   complet
  Supabase)
```

### Phase 1 — Court terme (0 à 6 mois) : Fondations

Objectif de phase : disposer d'un système fonctionnel au quotidien, même partiel, plutôt que de chercher l'exhaustivité avant la première mise en usage réel.

| Chantier | Détail | Dépendances |
|---|---|---|
| Modèle de données central | Schéma relationnel de base (utilisateur, Vitals, tâches, objectifs, événements) | Aucune — fondation de tout le reste |
| Cockpit (version minimale) | Brief quotidien basique, vue calendrier, barre de capture | Modèle de données |
| Module Personnel (Vitals) | Intégration Garmin, suivi sommeil et sport, journal simple | Modèle de données |
| Intégrations critiques | Garmin, Google Calendar, Supabase (infrastructure), Anthropic | Modèle de données |
| Architecture orientée événements | Bus d'événements minimal, suffisant pour connecter 2-3 modules | Modèle de données |

Risque principal de la phase : sur-ingénierie prématurée de l'architecture événementielle avant d'avoir un usage réel qui en valide le besoin. Mitigation : démarrer avec un couplage direct simple entre modules, et n'introduire le bus d'événements complet qu'au moment où un troisième module doit consommer un même événement.

### Phase 2 — Moyen terme (6 à 18 mois) : Intelligence

Objectif de phase : faire émerger la valeur différenciante de L'Édifice — la corrélation transversale et la recommandation argumentée — désormais que suffisamment de données historiques sont disponibles.

| Chantier | Détail | Dépendances |
|---|---|---|
| Assistant IA complet | Sélecteur de contexte, moteur de corrélation, niveaux de confiance | Historique de données de la phase 1 (minimum 2-3 mois d'usage) |
| Observatoire complet | Agrégats multi-modules, synthèses hebdomadaires et mensuelles | Assistant IA (pour les recommandations), modules sources alimentés |
| CRM & Business | Pipeline commercial, facturation, intégration Stripe | Modèle de données étendu, module Bibliothèque de base |
| Intégrations élevées | Runna, Hevy, Gmail, GitHub, Cloudflare | Modules Personnel et Développement en place |
| Priorisation par énergie | Modèle de calcul de niveau d'énergie quotidien, intégré au moteur de tâches | Historique suffisant de sommeil et de sport (phase 1) |

Risque principal de la phase : lancer les corrélations statistiques avec un historique de données insuffisant, produisant des recommandations peu fiables qui érodent la confiance dans le système. Mitigation : le système de niveaux de confiance (Élevé / Moyen / Faible) documenté au chapitre Assistant IA rend ce risque visible plutôt que silencieux.

### Phase 3 — Long terme (18 à 36 mois) : Automatisation complète

Objectif de phase : que le système anticipe et propose activement, plutôt que de simplement répondre à des questions posées.

| Chantier | Détail | Dépendances |
|---|---|---|
| Automatisations transversales matures | Bibliothèque de règles couvrant tous les modules, gouvernance centralisée | Bus d'événements complet, historique d'usage suffisant |
| Pipeline de Création de Contenu complet | Génération assistée bout en bout, publication multi-plateforme automatisée | Intégrations réseaux sociaux (phase 2-3) |
| Finances avancées | Projection de trésorerie, budgets dynamiques | Historique de transactions suffisant |
| Infrastructure consolidée | Monitoring complet, procédures de sauvegarde/restauration testées | Charge de données significative justifiant la robustesse renforcée |

### Vision à 5 ans

À l'horizon de cinq ans, L'Édifice doit avoir démontré, sur un usage réel prolongé, la validité de sa proposition centrale : des décisions quotidiennes mesurablement meilleures grâce à la corrélation transversale des données de vie. Cette validation ouvre la question, envisagée mais non engagée dès l'origine, d'une ouverture publique du produit — sous une forme multi-utilisateur, en s'appuyant sur les fondations d'architecture posées dès la phase 1 (rattachement systématique des entités à un identifiant utilisateur).

### Vision à 10 ans

À l'horizon de dix ans, si l'ouverture publique a eu lieu, L'Édifice peut évoluer vers un écosystème plutôt qu'un produit fermé : ouverture d'un système de plugins ou d'intégrations tierces développées par une communauté, application mobile native complète, et point d'entrée vocal ou conversationnel autonome (assistant ambiant). Ces évolutions restent, à ce stade, des directions envisagées et non des engagements de roadmap — elles sont documentées ici pour orienter les choix d'architecture actuels vers des options qui ne les excluent pas.

### Dépendances critiques inter-phases

```
 Modèle de données central
        │
        ├──► Cockpit MVP ──► Assistant IA ──► Automatisations transversales
        │                        │
        ├──► Module Personnel ────┤
        │       (Vitals)          │
        │                         ▼
        ├──► Bus d'événements ──► Observatoire complet
        │
        └──► Bibliothèque ──► CRM/Business ──► Finances avancées
```

### Risques transverses à la feuille de route

| Risque | Impact | Mitigation |
|---|---|---|
| Épuisement du temps disponible (projet solo, à côté d'une activité principale) | Ralentissement ou abandon de phases | Séquencement strict par valeur d'usage immédiate, pas par exhaustivité |
| Dérive de scope (ajout continu de modules) | Complexité croissante, dette technique | Application stricte du principe fondateur n°10 (simplicité avant généricité) |
| Dépendance à des API tierces changeantes (Garmin, réseaux sociaux) | Rupture d'intégration, retravail | Couche de normalisation interne isolant le cœur du système des schémas externes |
| Sur-confiance dans des corrélations statistiques encore faibles | Recommandations erronées suivies aveuglément | Niveaux de confiance explicites, recommandations argumentées et jamais autonomes sur les actions à conséquence |
| Absence de revue externe (projet solo) | Angles morts de conception non détectés | Revue périodique de ce document lui-même, mise à jour à chaque changement d'architecture majeur |

## 24 · Métriques de succès du projet

Contrairement à un produit commercial, L'Édifice ne se mesure pas à des indicateurs d'acquisition ou de revenu dans sa phase actuelle, mais à des indicateurs d'usage réel et de valeur décisionnelle. Ces métriques doivent être suivies par le module Observatoire lui-même — L'Édifice se mesurant avec ses propres outils.

| Catégorie | Métrique | Signal recherché |
|---|---|---|
| Adoption | Fréquence d'ouverture quotidienne du Cockpit | Le système est-il devenu un réflexe ou reste-t-il une curiosité ? |
| Complétude des données | Proportion de modules alimentés régulièrement vs modules à l'abandon | Un module non alimenté est un signal de conception à revoir |
| Qualité des recommandations | Taux d'acceptation des recommandations de l'Assistant IA | Une recommandation systématiquement ignorée doit être requestionnée |
| Fiabilité des corrélations | Évolution du niveau de confiance moyen des corrélations dans le temps | La maturité statistique du système doit croître avec l'historique |
| Charge de maintenance | Temps consacré à la maintenance vs au développement de nouvelles fonctionnalités | Une dérive vers la maintenance pure signale une dette technique excessive |
| Coût opérationnel | Coût mensuel cumulé des services tiers, notamment IA | Doit rester proportionné à la valeur perçue, suivi dans l'Observatoire |
| Documentation | Fraîcheur de la documentation par rapport au code (délai entre changement et mise à jour documentaire) | Garantit la viabilité à long terme du principe de documentation vivante |

---

# PARTIE V — Référence

*Glossaire et annexes techniques.*

## 25 · Glossaire

- **Assistant IA** — Module central de L'Édifice chargé du raisonnement transversal, de la corrélation de données et de la production de recommandations argumentées.
- **Automatisation** — Règle structurée (déclencheur, conditions, actions) exécutée sans intervention manuelle, journalisée et auditable.
- **Bus d'événements** — Mécanisme d'architecture logicielle par lequel chaque écriture significative sur une entité du graphe de données émet un événement consommable de façon asynchrone par d'autres modules.
- **Cockpit** — Module de synthèse quotidienne, point d'entrée unique de L'Édifice.
- **Corrélation** — Relation statistique identifiée entre deux ou plusieurs variables du graphe de données (par exemple, sommeil et performance sportive), assortie d'un niveau de confiance.
- **Dette de sommeil** — Écart cumulé entre le sommeil réel et l'objectif de sommeil personnel, calculé sur une fenêtre glissante.
- **Entité** — Objet de premier ordre du modèle de données (utilisateur, tâche, contact, transaction, etc.).
- **Graphe de données** — Ensemble des entités et de leurs relations, formant la source de vérité unique de L'Édifice.
- **Indice de récupération** — Mesure dérivée combinant sommeil, VFC et charge d'entraînement récente, utilisée pour estimer la capacité physique et cognitive du jour.
- **Niveau de confiance** — Étiquette (Élevé, Moyen, Faible) attachée à chaque recommandation ou corrélation produite par l'Assistant IA, reflétant la robustesse statistique du signal.
- **Niveau d'énergie** — Estimation quotidienne de la capacité de concentration et d'effort de l'utilisateur, utilisée comme dimension de priorisation des tâches, distincte de l'urgence et de l'importance.
- **Observatoire** — Module de tableau de bord global, agrégation en lecture de l'ensemble du graphe de données à des fins de suivi macro.
- **Source de vérité unique** — Principe fondateur selon lequel chaque donnée n'existe qu'à un seul endroit faisant autorité, même si elle est visible depuis plusieurs modules.
- **Trajectoire** — Sous-module de suivi de projets (techniques, business ou personnels), partagé entre les modules Développement, Business et Personnel.
- **Vitals** — Sous-module du module Personnel centralisant les données physiologiques (sommeil, sport, santé, nutrition).

## 26 · Annexes

### Annexe A — Convention de commit du projet

Pour assurer la traçabilité et la lisibilité de l'historique de développement, tout changement de code appliqué à L'Édifice suit le format suivant :

```
type(scope): résumé impératif

- point de détail 1
- point de détail 2
- point de détail 3

Ref: <référence associée, ticket ou jalon Trajectoire>
```

Chaque fichier modifié est relu avant intégration, et la documentation concernée est mise à jour dans le même changement, conformément au principe fondateur n°9 (documentation vivante).

### Annexe B — Emplacement de la documentation interne

La documentation interne détaillée (au-delà du présent document de référence) est centralisée dans un répertoire dédié du dépôt de code du projet (`knowledge/`), versionné au même titre que le code source, et indexée depuis le module Bibliothèque pour rester consultable depuis l'interface de L'Édifice elle-même.

### Annexe C — Principes de relecture de ce document

Ce document est destiné à être révisé, non figé. Il doit être relu et mis à jour :
- à chaque changement d'architecture majeur (nouveau module, changement de stack) ;
- à chaque révision de la feuille de route (a minima une fois par an) ;
- à chaque écart significatif constaté entre la vision décrite ici et l'usage réel observé.

### Annexe D — Table de correspondance modules ↔ chapitres

| Module | Chapitre de référence |
|---|---|
| Cockpit | Module : Cockpit |
| Assistant IA | Module : Assistant IA |
| Personnel (Vitals, habitudes, journal, objectifs) | Module : Personnel |
| Business | Module : Business |
| CRM | Module : CRM |
| Création de Contenu | Module : Création de Contenu |
| Observatoire | Module : Observatoire |
| Bibliothèque | Module : Bibliothèque |
| Développement (Trajectoire) | Module : Développement |
| Finances | Module : Finances |
| Infrastructure | Module : Infrastructure |
| Paramètres | Module : Paramètres |
| Automatisations | Module : Automatisations |
