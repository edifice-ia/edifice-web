# Principes

Statut : source de vérité
Dernière mise à jour : 2026-08-01

## Sommaire

- [Rôle du document](#rôle-du-document)
- [Principe central](#principe-central)
- [Règles d'or d'architecture](#règles-dor-darchitecture)
- [Principes de conception](#principes-de-conception)

## Rôle du document

Un principe qui ne tranche rien n'est qu'une intention. Chaque entrée de ce document est écrite pour arbitrer un désaccord de conception réel : quand deux designs sont possibles, le principe dit lequel gagne. Ce document ne décrit ni l'architecture ni les modules — voir les documents dédiés pour cela.

## Principe central

**Tout est modulaire — rien n'est obligatoire.**

Aucune fonctionnalité, aucun module, aucun service commun n'est indispensable au fonctionnement du reste. Tout peut être activé, désactivé, remplacé ou reconfiguré sans casser autre chose. Ce principe gouverne tous les autres : en cas de conflit entre lui et un autre principe de ce document, c'est lui qui tranche.

Critère : face à toute nouvelle capacité, poser la question « peut-elle être désactivée sans rien casser ailleurs ? ». Si la réponse est non, la capacité est mal découpée — elle doit être redécoupée jusqu'à ce que la réponse soit oui, pas documentée comme une exception acceptée.

## Règles d'or d'architecture

Ces trois règles découlent directement du principe central. Elles s'appliquent à toute nouvelle surface ou tout nouveau composant.

**1. Les surfaces de synthèse lisent, elles ne possèdent pas.** Le brief, l'Assistant, l'Observatoire et la strate stratégique de Trajectoire agrègent en lecture ; la donnée vit dans son contexte d'origine — l'objectif de course près des données Garmin, l'objectif d'abonnés près des statistiques de la marque.

Critère : si une surface de synthèse écrit ou modifie une donnée métier au lieu de se contenter de la lire depuis son module d'origine, c'est une violation à corriger, pas une optimisation à conserver.

**2. Aucun composant ne présume de l'existence d'un autre.** Tout passe par la configuration.

Critère : désactiver n'importe quel module ne doit jamais faire planter, vider silencieusement ou dégrader un autre composant — au pire, ce dernier n'a simplement rien à afficher à cet endroit.

**3. Une seule couche de config gouverne.** Focus de l'IA, activation des modules et onboarding public passent par le même moteur — jamais par des systèmes de configuration parallèles. Moi = utilisateur avec une configuration manuelle ; le public = des configurations remplies par questionnaire. Même moteur, aucune refonte le jour de l'ouverture au public.

Critère : toute nouvelle option de configuration s'intègre à cette couche unique. Créer un mécanisme de configuration propre à un module, même temporairement, est un défaut à corriger avant livraison.

## Principes de conception

**Source de vérité unique.** Chaque donnée a un seul endroit où elle est écrite ; toute autre surface qui l'affiche la lit, elle ne la duplique jamais.

Critère : si une information peut être modifiée à deux endroits différents de l'app, c'est une violation — supprimer l'un des deux points d'écriture plutôt que les synchroniser.

**Souveraineté des données.** L'utilisateur possède ses données. Rien ne doit rester captif de la plateforme.

Critère : toute donnée doit pouvoir sortir dans un format exploitable sans négociation ni délai. L'export n'est pas une fonctionnalité qu'on ajoutera un jour, c'est un droit qui existe dès la première donnée stockée.

**Minimum de clics.** Toute action répétée régulièrement doit tendre vers zéro friction.

Critère : si une action quotidienne demande plus d'étapes que ce que son information ou sa fréquence justifie, c'est un défaut d'ergonomie à corriger — pas une question de goût à débattre.

**Tout automatiser.** Ce qui peut l'être doit l'être, dès qu'aucun jugement humain ne change le résultat.

Critère : si une tâche ne demande aucune décision, elle est candidate à l'automatisation, pas à un rappel manuel récurrent. À l'inverse, si une tâche engage un choix ou une conséquence, elle reste manuelle ou soumise à validation — voir le principe sur l'IA.

**Les données circulent.** Aucune donnée ne reste enfermée dans le module qui l'a produite si un autre module peut légitimement en avoir besoin en lecture.

Critère : avant de dupliquer un champ ou une valeur dans un nouveau module, vérifier s'il peut être lu depuis sa source plutôt que recopié.

**Chaque module enrichit les autres.** Un module qui n'apporte rien aux autres surfaces n'a rempli qu'une partie de sa mission.

Critère : pour tout nouveau module, énoncer explicitement ce qu'il rend possible ailleurs — dans l'Assistant, dans l'Observatoire, dans le brief. Si la réponse est « rien », il manque une intégration avant que le module soit considéré terminé.

**L'IA augmente, elle ne remplace pas.** L'assistant observe, propose, prépare et alerte ; il ne décide jamais seul d'une action irréversible ou engageante.

Critère : toute nouvelle capacité IA doit définir, avant sa livraison, le point exact où une validation humaine explicite est requise. Une capacité IA sans point de confirmation identifié n'est pas prête.

**Priorisation par l'énergie.** Ce qui mérite d'être fait aujourd'hui se décide en croisant l'état réel de la personne — énergie, sommeil, charge — avec ce qui est possible, pas seulement avec une liste triée par échéance.

Critère : un brief ou une recommandation qui ignore l'état physiologique disponible au profit d'un simple tri par priorité déclarée ou date limite a manqué ce principe.

**Documentation vivante.** La documentation change dans le même geste que le code ou la décision, jamais en différé.

Critère : un changement structurant livré sans mise à jour du document concerné n'est pas terminé, quel que soit l'état du code.

**Simplicité avant généricité.** On construit ce dont on a besoin maintenant, pas une abstraction anticipant un besoin hypothétique.

Critère : si une capacité généralise pour un cas d'usage qui n'existe pas encore concrètement, elle est prématurée. La généralisation attend qu'un second cas réel la justifie — jamais un premier cas anticipé.
