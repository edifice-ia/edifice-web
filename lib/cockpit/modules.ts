import type { CockpitLog, CockpitModule } from "@/types/cockpit";

export const cockpitModules: CockpitModule[] = [
  {
    id: "assistant-ia",
    title: "Assistant IA",
    description:
      "Interface conversationnelle future, recherche web lecture seule, outils et logs assistant.",
    href: "/interface/assistant",
    status: "En migration",
    accent: "jade",
  },
  {
    id: "post-creation",
    title: "Creation de post",
    description:
      "Idees, scripts courts, captions, hooks, prompts et preparation multi-reseaux.",
    href: "/interface/post-creation",
    status: "En migration",
  },
  {
    id: "publishers-overview",
    title: "Publishers",
    description: "Hub de publication avec YouTube, Pinterest et reseaux courts.",
    href: "/interface/publishers",
    status: "En migration",
  },
  {
    id: "publisher-youtube",
    title: "YouTube Publisher",
    description: "Workflow UI pour l'API YouTube fonctionnelle.",
    href: "/interface/publishers/youtube",
    status: "Disponible",
    accent: "blue",
  },
  {
    id: "publisher-pinterest",
    title: "Pinterest Publisher",
    description: "Preparer le futur espace Pinterest sans publication reelle.",
    href: "/interface/publishers/pinterest",
    status: "En migration",
  },
  {
    id: "monitoring-static",
    title: "Monitoring",
    description: "Sante systeme, couts et suivi statique.",
    href: "/interface/monitoring",
    status: "Experimental",
  },
  {
    id: "personnel-light",
    title: "Personnel",
    description: "Vision du jour, routines, notes et objectifs.",
    href: "/interface/personnel",
    status: "Experimental",
  },
  {
    id: "links-useful",
    title: "Liens utiles",
    description: "Documentation, outils et reperes de migration.",
    href: "/interface/links",
    status: "Disponible",
  },
];

export const publisherModules: CockpitModule[] = [
  {
    id: "publisher-youtube-hub",
    title: "YouTube Publisher",
    description:
      "Workflow YouTube conserve, avec publication reelle bloquee cote web.",
    href: "/interface/publishers/youtube",
    status: "Disponible",
    accent: "blue",
  },
  {
    id: "publisher-pinterest-hub",
    title: "Pinterest Publisher",
    description: "Espace Pinterest futur: workflow, API, automation et logs.",
    href: "/interface/publishers/pinterest",
    status: "En migration",
  },
  {
    id: "publisher-shorts-hub",
    title: "Reseaux courts",
    description:
      "TikTok, Instagram et Meta regroupes, non migres et bloques par defaut.",
    href: "/interface/publishers/shorts",
    status: "A securiser",
  },
];

export const overviewLogs: CockpitLog[] = [
  {
    timestamp: "09:00",
    type: "system",
    message: "Cockpit web initialise en mode migration progressive.",
    status: "Disponible",
  },
  {
    timestamp: "09:05",
    type: "security",
    message: "Routes cockpit protegees par session Supabase.",
    status: "Disponible",
  },
  {
    timestamp: "09:10",
    type: "agent",
    message: "Agent demo reviewer disponible sans publication reelle.",
    status: "Disponible",
  },
];
