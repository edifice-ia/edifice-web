# Liens cibles Pinterest

La correspondance entre comptes et variables d'environnement est centralisee dans
`config/pinterest-accounts.json`.

Configurer localement dans `.env.local` :

```dotenv
PINTEREST_EDIFICE_DISCIPLINE_TARGET_URL=https://example.com/edifice-discipline
PINTEREST_SOLUTION_SOMMEIL_TARGET_URL=https://example.com/solution-sommeil
```

Configurer les memes variables dans Vercel pour les environnements web concernes.

Les URLs ne sont appliquees aux pins Supabase qu'au lancement de :

```bash
npm run pinterest:sync
```

Une variable absente ne remplace pas un `target_url` deja enregistre.
