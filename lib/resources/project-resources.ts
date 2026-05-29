export type ProjectResourceStatus = "actif" | "a configurer" | "review" | "externe";

export type ProjectResourceCategory =
  | "Déploiement & infrastructure"
  | "Réseaux sociaux / développeurs"
  | "Domaine & identité"
  | "Projet & documentation";

export type ProjectResource = {
  name: string;
  url: string;
  category: ProjectResourceCategory;
  description: string;
  status: ProjectResourceStatus;
};

export const projectResourceCategories: ProjectResourceCategory[] = [
  "Déploiement & infrastructure",
  "Réseaux sociaux / développeurs",
  "Domaine & identité",
  "Projet & documentation",
];

export const projectResources: ProjectResource[] = [
  {
    name: "Vercel Dashboard",
    url: "https://vercel.com/dashboard",
    category: "Déploiement & infrastructure",
    description: "Déploiements, domaines et variables d'environnement.",
    status: "actif",
  },
  {
    name: "Supabase Dashboard",
    url: "https://supabase.com/dashboard/projects",
    category: "Déploiement & infrastructure",
    description: "Base de données, auth, tables et logs serveur.",
    status: "actif",
  },
  {
    name: "GitHub",
    url: "https://github.com/",
    category: "Déploiement & infrastructure",
    description: "Code source, issues, branches et historique du projet.",
    status: "actif",
  },
  {
    name: "OVHcloud Manager",
    url: "https://www.ovh.com/manager/",
    category: "Déploiement & infrastructure",
    description: "Gestion cloud, domaine, DNS et services OVHcloud.",
    status: "externe",
  },
  {
    name: "Google Cloud Console",
    url: "https://console.cloud.google.com/",
    category: "Déploiement & infrastructure",
    description: "Projets Google Cloud, APIs, OAuth et quotas.",
    status: "review",
  },
  {
    name: "TikTok for Developers",
    url: "https://developers.tiktok.com/",
    category: "Réseaux sociaux / développeurs",
    description: "Apps TikTok, OAuth, scopes et configuration sandbox.",
    status: "review",
  },
  {
    name: "Meta Developers",
    url: "https://developers.facebook.com/",
    category: "Réseaux sociaux / développeurs",
    description: "Applications Meta, permissions, webhooks et Graph API.",
    status: "review",
  },
  {
    name: "Facebook Developers",
    url: "https://developers.facebook.com/apps/",
    category: "Réseaux sociaux / développeurs",
    description: "Accès direct aux apps Facebook et paramètres développeur.",
    status: "review",
  },
  {
    name: "Meta Business Suite",
    url: "https://business.facebook.com/",
    category: "Réseaux sociaux / développeurs",
    description: "Pages, comptes business, Instagram et assets Meta.",
    status: "externe",
  },
  {
    name: "Pinterest Developers",
    url: "https://developers.pinterest.com/",
    category: "Réseaux sociaux / développeurs",
    description: "Apps Pinterest, OAuth, boards et pins API.",
    status: "a configurer",
  },
  {
    name: "YouTube Studio",
    url: "https://studio.youtube.com/",
    category: "Réseaux sociaux / développeurs",
    description: "Chaîne, contenus, analytics et gestion YouTube.",
    status: "actif",
  },
  {
    name: "Google API Console",
    url: "https://console.cloud.google.com/apis/dashboard",
    category: "Réseaux sociaux / développeurs",
    description: "Activation et suivi des APIs Google.",
    status: "review",
  },
  {
    name: "Google Cloud Credentials",
    url: "https://console.cloud.google.com/apis/credentials",
    category: "Réseaux sociaux / développeurs",
    description: "Identifiants OAuth, clients et clés API Google.",
    status: "review",
  },
  {
    name: "Google OAuth Consent Screen",
    url: "https://console.cloud.google.com/apis/credentials/consent",
    category: "Réseaux sociaux / développeurs",
    description: "Écran de consentement OAuth et statut de vérification.",
    status: "review",
  },
  {
    name: "OVHcloud domaine",
    url: "https://www.ovh.com/manager/#/web/domain",
    category: "Domaine & identité",
    description: "Gestion du domaine, renouvellement et zone DNS.",
    status: "externe",
  },
  {
    name: "OVHcloud mails",
    url: "https://www.ovh.com/manager/#/web/email",
    category: "Domaine & identité",
    description: "Boîtes mail, redirections et configuration email.",
    status: "a configurer",
  },
  {
    name: "DNS",
    url: "https://www.ovh.com/manager/#/web/domain",
    category: "Domaine & identité",
    description: "Zone DNS, enregistrements et redirections.",
    status: "review",
  },
  {
    name: "Email professionnel",
    url: "https://www.ovh.com/manager/#/web/email",
    category: "Domaine & identité",
    description: "Accès aux réglages du mail professionnel L'Édifice.",
    status: "a configurer",
  },
  {
    name: "GitHub repository",
    url: "https://github.com/",
    category: "Projet & documentation",
    description: "Dépôt du projet, code et suivi technique.",
    status: "actif",
  },
  {
    name: "Supabase project",
    url: "https://supabase.com/dashboard/projects",
    category: "Projet & documentation",
    description: "Projet Supabase relié au cockpit.",
    status: "actif",
  },
  {
    name: "Vercel project",
    url: "https://vercel.com/dashboard",
    category: "Projet & documentation",
    description: "Projet Vercel, builds et configuration web.",
    status: "actif",
  },
  {
    name: "Documentation interne Édifice",
    url: "https://www.notion.so/",
    category: "Projet & documentation",
    description: "Documentation, décisions et mémoire interne si disponible.",
    status: "externe",
  },
  {
    name: "Notion",
    url: "https://www.notion.so/",
    category: "Projet & documentation",
    description: "Espace de notes et documentation projet.",
    status: "externe",
  },
  {
    name: "Observatoire",
    url: "/interface/monitoring",
    category: "Projet & documentation",
    description: "État global des modules et mémoire de chantier.",
    status: "actif",
  },
  {
    name: "Connexions OAuth",
    url: "/interface/settings/connections",
    category: "Projet & documentation",
    description: "Vue cockpit des connexions externes, sans secret exposé.",
    status: "review",
  },
  {
    name: "ChatGPT",
    url: "https://chatgpt.com/",
    category: "Projet & documentation",
    description: "Assistance générale, rédaction et réflexion projet.",
    status: "externe",
  },
  {
    name: "Codex",
    url: "https://chatgpt.com/codex",
    category: "Projet & documentation",
    description: "Assistance de développement pour le cockpit.",
    status: "externe",
  },
];
