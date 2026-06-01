export type ProjectResourceLinkStatus =
  | "accessible"
  | "inaccessible"
  | "non testé";

export type ProjectResourceProjectStatus =
  | "actif"
  | "review"
  | "à configurer"
  | "en migration"
  | "bloqué"
  | "externe";

export type ProjectResourceCategory =
  | "Deploiement & infrastructure"
  | "Reseaux sociaux / developpeurs"
  | "Domaine & identite"
  | "Projet & documentation";

export type ProjectResource = {
  name: string;
  url: string;
  category: ProjectResourceCategory;
  description: string;
  linkStatus: ProjectResourceLinkStatus;
  projectStatus: ProjectResourceProjectStatus;
  note: string;
  blockedByExternalReview?: boolean;
};

export const projectResourceCategories: ProjectResourceCategory[] = [
  "Deploiement & infrastructure",
  "Reseaux sociaux / developpeurs",
  "Domaine & identite",
  "Projet & documentation",
];

export const projectResources: ProjectResource[] = [
  {
    name: "Vercel Dashboard",
    url: "https://vercel.com/dashboard",
    category: "Deploiement & infrastructure",
    description: "Deploiements, domaines et variables d'environnement.",
    linkStatus: "accessible",
    projectStatus: "actif",
    note: "Deploiements et variables d'environnement operationnels.",
  },
  {
    name: "Supabase Dashboard",
    url: "https://supabase.com/dashboard/projects",
    category: "Deploiement & infrastructure",
    description: "Base de donnees, auth, tables et logs serveur.",
    linkStatus: "accessible",
    projectStatus: "actif",
    note: "Stockage OAuth et memoire projet disponibles cote serveur.",
  },
  {
    name: "GitHub",
    url: "https://github.com/",
    category: "Deploiement & infrastructure",
    description: "Code source, issues, branches et historique du projet.",
    linkStatus: "accessible",
    projectStatus: "actif",
    note: "Depot et suivi technique accessibles.",
  },
  {
    name: "OVHcloud Manager",
    url: "https://www.ovh.com/manager/",
    category: "Deploiement & infrastructure",
    description: "Gestion cloud, domaine, DNS et services OVHcloud.",
    linkStatus: "accessible",
    projectStatus: "externe",
    note: "Plateforme externe utile pour domaine, DNS et email.",
  },
  {
    name: "Google Cloud Console",
    url: "https://console.cloud.google.com/",
    category: "Deploiement & infrastructure",
    description: "Projets Google Cloud, APIs, OAuth et quotas.",
    linkStatus: "accessible",
    projectStatus: "review",
    note: "Console accessible, configuration OAuth/API a relire avant production.",
  },
  {
    name: "TikTok for Developers",
    url: "https://developers.tiktok.com/",
    category: "Reseaux sociaux / developpeurs",
    description: "Apps TikTok, OAuth, scopes et configuration sandbox.",
    linkStatus: "accessible",
    projectStatus: "review",
    note: "OAuth Sandbox actif, review produit a consolider avant publication.",
    blockedByExternalReview: true,
  },
  {
    name: "Meta Developers",
    url: "https://developers.facebook.com/",
    category: "Reseaux sociaux / developpeurs",
    description: "Applications Meta, permissions, webhooks et Graph API.",
    linkStatus: "accessible",
    projectStatus: "actif",
    note: "Meta connecte et fonctionnel; aucune publication automatique.",
  },
  {
    name: "Facebook Developers",
    url: "https://developers.facebook.com/apps/",
    category: "Reseaux sociaux / developpeurs",
    description: "Acces direct aux apps Facebook et parametres developpeur.",
    linkStatus: "accessible",
    projectStatus: "actif",
    note: "Facebook connecte et fonctionnel via Meta; aucune publication automatique.",
  },
  {
    name: "Meta Business Suite",
    url: "https://business.facebook.com/",
    category: "Reseaux sociaux / developpeurs",
    description: "Pages, comptes business, Instagram et assets Meta.",
    linkStatus: "accessible",
    projectStatus: "externe",
    note: "Outil externe de pilotage Meta, distinct de l'etat du module.",
  },
  {
    name: "Pinterest Developers",
    url: "https://developers.pinterest.com/",
    category: "Reseaux sociaux / developpeurs",
    description: "Apps Pinterest, OAuth, boards et pins API.",
    linkStatus: "accessible",
    projectStatus: "review",
    note: "Attente de validation reviewer Pinterest, aucune action OAuth supplementaire pour l'instant.",
    blockedByExternalReview: true,
  },
  {
    name: "YouTube Studio",
    url: "https://studio.youtube.com/",
    category: "Reseaux sociaux / developpeurs",
    description: "Chaine, contenus, analytics et gestion YouTube.",
    linkStatus: "accessible",
    projectStatus: "actif",
    note: "Studio accessible, publication reelle toujours gardee par validation humaine.",
  },
  {
    name: "Google API Console",
    url: "https://console.cloud.google.com/apis/dashboard",
    category: "Reseaux sociaux / developpeurs",
    description: "Activation et suivi des APIs Google.",
    linkStatus: "accessible",
    projectStatus: "review",
    note: "APIs accessibles, configuration a relire pour les scopes et quotas.",
  },
  {
    name: "Google Cloud Credentials",
    url: "https://console.cloud.google.com/apis/credentials",
    category: "Reseaux sociaux / developpeurs",
    description: "Identifiants OAuth, clients et cles API Google.",
    linkStatus: "accessible",
    projectStatus: "review",
    note: "Acces aux identifiants; aucune cle ne doit etre affichee dans L'Edifice.",
  },
  {
    name: "Google OAuth Consent Screen",
    url: "https://console.cloud.google.com/apis/credentials/consent",
    category: "Reseaux sociaux / developpeurs",
    description: "Ecran de consentement OAuth et statut de verification.",
    linkStatus: "accessible",
    projectStatus: "review",
    note: "Consent screen a verifier avant ouverture plus large.",
    blockedByExternalReview: true,
  },
  {
    name: "OVHcloud domaine",
    url: "https://www.ovh.com/manager/#/web/domain",
    category: "Domaine & identite",
    description: "Gestion du domaine, renouvellement et zone DNS.",
    linkStatus: "accessible",
    projectStatus: "review",
    note: "Domaine accessible, DNS et redirections a confirmer.",
  },
  {
    name: "OVHcloud mails",
    url: "https://www.ovh.com/manager/#/web/email",
    category: "Domaine & identite",
    description: "Boites mail, redirections et configuration email.",
    linkStatus: "accessible",
    projectStatus: "à configurer",
    note: "Email professionnel encore a finaliser.",
  },
  {
    name: "DNS",
    url: "https://www.ovh.com/manager/#/web/domain",
    category: "Domaine & identite",
    description: "Zone DNS, enregistrements et redirections.",
    linkStatus: "accessible",
    projectStatus: "review",
    note: "Zone DNS accessible, coherence domaine/deploiement a verifier.",
  },
  {
    name: "Email professionnel",
    url: "https://www.ovh.com/manager/#/web/email",
    category: "Domaine & identite",
    description: "Acces aux reglages du mail professionnel L'Edifice.",
    linkStatus: "accessible",
    projectStatus: "à configurer",
    note: "Choix et configuration des adresses transactionnelles a poser.",
  },
  {
    name: "GitHub repository",
    url: "https://github.com/",
    category: "Projet & documentation",
    description: "Depot du projet, code et suivi technique.",
    linkStatus: "accessible",
    projectStatus: "actif",
    note: "Depot accessible pour pilotage technique.",
  },
  {
    name: "Supabase project",
    url: "https://supabase.com/dashboard/projects",
    category: "Projet & documentation",
    description: "Projet Supabase relie au cockpit.",
    linkStatus: "accessible",
    projectStatus: "actif",
    note: "Base projet, OAuth tokens et project_memory disponibles cote serveur.",
  },
  {
    name: "Vercel project",
    url: "https://vercel.com/dashboard",
    category: "Projet & documentation",
    description: "Projet Vercel, builds et configuration web.",
    linkStatus: "accessible",
    projectStatus: "actif",
    note: "Projet deployable et variables d'environnement a surveiller.",
  },
  {
    name: "Documentation interne Edifice",
    url: "https://www.notion.so/",
    category: "Projet & documentation",
    description: "Documentation, decisions et memoire interne si disponible.",
    linkStatus: "accessible",
    projectStatus: "externe",
    note: "Espace externe optionnel pour documentation longue.",
  },
  {
    name: "Notion",
    url: "https://www.notion.so/",
    category: "Projet & documentation",
    description: "Espace de notes et documentation projet.",
    linkStatus: "accessible",
    projectStatus: "externe",
    note: "Outil externe utile, distinct de la memoire persistante Supabase.",
  },
  {
    name: "Observatoire",
    url: "/interface/monitoring",
    category: "Projet & documentation",
    description: "Etat global des modules et memoire de chantier.",
    linkStatus: "accessible",
    projectStatus: "actif",
    note: "Cockpit de suivi projet actif dans L'Edifice.",
  },
  {
    name: "Connexions OAuth",
    url: "/interface/settings/connections",
    category: "Projet & documentation",
    description: "Vue cockpit des connexions externes, sans secret expose.",
    linkStatus: "accessible",
    projectStatus: "review",
    note: "Interface de lecture/controle OAuth, sans exposition de secrets.",
  },
  {
    name: "ChatGPT",
    url: "https://chatgpt.com/",
    category: "Projet & documentation",
    description: "Assistance generale, redaction et reflexion projet.",
    linkStatus: "accessible",
    projectStatus: "externe",
    note: "Outil externe d'assistance, non indicateur d'etat projet.",
  },
  {
    name: "Codex",
    url: "https://chatgpt.com/codex",
    category: "Projet & documentation",
    description: "Assistance de developpement pour le cockpit.",
    linkStatus: "accessible",
    projectStatus: "externe",
    note: "Outil externe de developpement, utile au chantier.",
  },
];

export function findProjectResourceByName(name: string) {
  const normalizedName = name.toLowerCase();

  return projectResources.find((resource) =>
    resource.name.toLowerCase().includes(normalizedName),
  );
}
