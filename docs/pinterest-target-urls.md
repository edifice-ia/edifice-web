# Liens cibles Pinterest

La correspondance entre comptes et variables d'environnement est centralisee dans
`config/pinterest-accounts.json`.

Configurer localement dans `.env.local` :

```dotenv
PINTEREST_EDIFICE_DISCIPLINE_TARGET_URL=https://example.com/edifice-discipline
PINTEREST_SOLUTION_SOMMEIL_TARGET_URL=https://example.com/solution-sommeil
```

Configurer les memes variables dans Vercel pour les environnements web concernes.

Priorite appliquee pour chaque pin :

1. `pinterest_pins.target_url` lorsqu'il est renseigne ;
2. URL par defaut du compte issue de sa variable d'environnement.

Les URLs ne sont appliquees aux pins Supabase qu'au lancement de :

```bash
npm run pinterest:sync
```

Le dry-run affiche l'URL effectivement retenue et sa source, sans modifier Supabase :

```bash
npm run pinterest:sync -- --dry-run
```

Une URL par defaut absente ne remplace jamais un `target_url` deja enregistre.
