# Stack technique

Statut : source de vérité initiale  
Dernière mise à jour : 2026-07-07

## Sommaire

- [Rôle du document](#rôle-du-document)
- [Stack principale](#stack-principale)
- [Scripts projet](#scripts-projet)
- [Environnements](#environnements)
- [Contraintes Next.js](#contraintes-nextjs)
- [Liens utiles](#liens-utiles)
- [À mettre à jour](#à-mettre-à-jour)

## Rôle du document

Ce fichier résume les technologies du dépôt et les commandes importantes. Il doit être mis à jour à chaque changement de dépendance structurante.

## Stack principale

- Framework web : Next.js `16.2.6`.
- UI : React `19.2.4`, React DOM `19.2.4`.
- Langage : TypeScript `5`.
- Données : Supabase JS `2.106.0`, `@supabase/ssr` `0.10.3`.
- Style : Tailwind CSS `4`, PostCSS.
- Lint : ESLint `9`, `eslint-config-next` `16.2.6`.
- Service vidéo : Python FastAPI dans `services/shorts-renderer`.
- Déploiement pressenti : Vercel pour l'application web, Railway pour le renderer.

## Scripts projet

Commandes principales définies dans `package.json` :

```bash
npm run dev
npm run build
npm run start
npm run lint
```

Scripts métier :

```bash
npm run costs:check
npm run assets:enrich-visuals
npm run assets:enrich-visuals:check-urls
npm run assets:enrich-visuals:dry-run
npm run assets:reconcile-storage
npm run index:content-assets
npm run pinterest:storage:reorganize
npm run pinterest:sync
npm run shorts:scheduling:check
npm run shorts:workflow:check
npm run sync:pinterest-snapshot
```

## Environnements

Les variables sensibles ne doivent pas être exposées côté client. Les variables publiques doivent utiliser le préfixe prévu par Next.js.

Fichiers présents :

- `.env.example` pour le modèle public ;
- `.env.local` pour l'environnement local, non destiné à être documenté avec ses valeurs ;
- `services/shorts-renderer/.env.example` pour le service vidéo.

## Contraintes Next.js

Le dépôt contient une règle locale importante : cette version de Next.js peut différer des connaissances générales d'un assistant. Avant toute modification de code Next.js, lire les guides pertinents dans `node_modules/next/dist/docs/`.

Références locales utiles :

- `node_modules/next/dist/docs/01-app/index.md`
- `node_modules/next/dist/docs/01-app/03-api-reference`
- `node_modules/next/dist/docs/01-app/03-api-reference/05-config`

## Liens utiles

- [Architecture](./01_Architecture.md)
- [Conventions](./10_Conventions.md)
- [Base de données](./05_Database.md)

## À mettre à jour

- Ajouter les versions Python exactes du service renderer.
- Ajouter les dépendances Python critiques.
- Documenter les variables d'environnement obligatoires par environnement.
- Ajouter la stratégie de mise à jour Next.js, React et Supabase.
