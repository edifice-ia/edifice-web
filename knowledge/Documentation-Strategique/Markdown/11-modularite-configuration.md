# Modularité et configuration

Statut : source de vérité
Dernière mise à jour : 2026-08-01

## Sommaire

- [Rôle du document](#rôle-du-document)
- [Un seul mécanisme, trois entrées](#un-seul-mécanisme-trois-entrées)
- [Le questionnaire intelligent](#le-questionnaire-intelligent)
- [Le cycle de vie des données](#le-cycle-de-vie-des-données)
- [Désactiver n'est pas supprimer](#désactiver-nest-pas-supprimer)

## Rôle du document

La troisième règle d'or énonce qu'une seule couche de configuration gouverne le focus de l'IA, l'activation des modules et l'onboarding public — voir [01-principes.md](./01-principes.md). Ce document démontre concrètement pourquoi ce sont trois entrées vers un seul mécanisme, décrit comment l'onboarding public alimente cette même couche, et documente le cycle de vie des données qui en découle. Il ne traite pas la sécurité de cette couche — voir [13-securite-gouvernance.md](./13-securite-gouvernance.md).

## Un seul mécanisme, trois entrées

Trois écrans, trois moments d'usage, trois publics différents — mais une seule question derrière chacun : *qu'est-ce qui est allumé pour cet utilisateur, dans ce contexte ?*

**Le focus perso/pro de l'Assistant.** Quand je dis à l'Assistant de se concentrer sur ma vie personnelle ou sur mon activité professionnelle, je ne change pas de logiciel ni de base de données : je change la valeur d'un filtre qui restreint, pour cette conversation, l'ensemble des pôles, espaces et modules considérés comme pertinents. Ce filtre lit la même couche de configuration que les deux mécanismes suivants.

**L'activation des modules dans Réglages.** Quand j'active ou je désactive un module dans Réglages, j'écris directement dans cette couche. Ce n'est pas un réglage à part entretenu par un écran séparé — c'est la même donnée, vue et modifiée depuis une autre porte d'entrée.

**L'onboarding public.** Quand un futur utilisateur répond au questionnaire d'onboarding, ses réponses ne créent pas un profil dans un format différent : elles remplissent la même couche, par un troisième chemin. Voir la section suivante.

Ces trois mécanismes ne sont pas trois systèmes qui se ressemblent — c'est un seul système à trois interfaces. La preuve la plus directe : n'importe lequel des trois peut modifier un état que les deux autres liront immédiatement, sans synchronisation à écrire, parce qu'il n'y a rien à synchroniser entre des choses qui n'ont jamais été séparées.

## Le questionnaire intelligent

L'onboarding public pose des questions simples et les traduit en configuration : qui es-tu (une vie personnelle seule, une activité professionnelle solo, une aventure entrepreneuriale avec plusieurs marques) ; quels services externes veux-tu connecter (calendrier, objets connectés, banque, réseaux sociaux) ; quels modules veux-tu voir actifs dès le premier jour (sommeil, tâches, CRM, journal...) ; combien de marques ou de projets démarrent dans tes espaces.

Le point essentiel n'est pas la liste des questions, c'est ce qu'elles produisent : les réponses du questionnaire pré-remplissent exactement les mêmes champs de configuration que je renseigne à la main aujourd'hui en tant qu'utilisateur unique. Il n'existe pas un schéma de configuration « pour moi » et un schéma « pour le public » qu'il faudrait réconcilier plus tard. Le questionnaire est une façade au-dessus du même mécanisme — c'est ce qui permet, comme annoncé dans la stratégie produit, qu'aucune refonte ne soit nécessaire le jour où L'Édifice s'ouvre à d'autres personnes ; voir [02-strategie-produit.md](./02-strategie-produit.md).

## Le cycle de vie des données

Activer et désactiver une capacité ne suffit pas à décrire ce qui arrive aux données qu'elle a produites. Cinq gestes distincts couvrent l'ensemble des cas, et ne doivent jamais être confondus l'un avec l'autre — ni dans le code, ni dans l'interface, ni dans un seul bouton qui en ferait deux à la fois.

**Désactiver.** Coupe la synchronisation, les workers et l'affichage du module. Ne détruit rien : l'historique déjà produit reste en base, et reste lisible par l'IA à la demande — si je demande à l'Assistant ce qui s'est passé sur un module désactivé il y a trois mois, il peut encore répondre. C'est un geste réversible et purement opérationnel : arrêter de consommer des ressources pour quelque chose qu'on n'utilise plus activement, sans perdre la mémoire qui va avec.

**Masquer.** Ne touche qu'à l'interface. Le module continue de tourner en arrière-plan — synchronisation et workers actifs — seule sa présence dans la navigation disparaît. C'est un geste de rangement de l'espace de travail, sans aucune conséquence sur le coût ni sur la donnée.

**Supprimer l'historique d'un module.** Suppression physique, ciblée à ce module précisément, volontairement dotée de friction — une confirmation explicite est requise, jamais un simple interrupteur. Efface les données produites par ce module ; les autres modules n'en sont pas affectés.

**Supprimer le compte.** Suppression physique et totale : toutes les données, sans exception. Ce geste se propage aux tiers connectés — révocation des accès et jetons externes — et reste journalisé : une trace de l'action de suppression elle-même subsiste, pas les données supprimées.

**Exporter.** Sortie des données dans un format exploitable. Ce geste est indépendant des quatre autres et peut précéder n'importe lequel d'entre eux — désactiver, masquer, supprimer un historique ou supprimer le compte n'empêchent jamais d'avoir d'abord exporté.

## Désactiver n'est pas supprimer

Ces cinq gestes se résument à une règle qui ne souffre aucune exception : éteindre une capacité est une décision d'économie — celle de ne plus payer le coût de sa synchronisation active — tandis que supprimer une donnée est une décision de vie privée — celle de ne plus vouloir qu'elle existe. Ce sont deux intentions différentes, avec des conséquences différentes, et elles ne doivent jamais partager un seul bouton ni une seule confirmation. Confondre les deux, c'est soit supprimer des données que l'utilisateur voulait seulement mettre en pause, soit lui laisser croire qu'il a supprimé une donnée qu'il a seulement désactivée — les deux sont des ruptures de la souveraineté des données énoncée dans [01-principes.md](./01-principes.md).
