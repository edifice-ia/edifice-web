import type { CockpitLog, CockpitModule } from "@/types/cockpit";

export const cockpitModules: CockpitModule[] = [
  {
    id: "assistant-edifice",
    title: "Assistant Édifice",
    description:
      "Point central pour bâtir l'œuvre, organiser l'intérieur et garder le cap.",
    href: "/interface",
    status: "En migration",
    accent: "jade",
  },
  {
    id: "post-creation",
    title: "Atelier de contenu",
    description:
      "Idées, scripts courts, captions, hooks, prompts et préparation multi-réseaux.",
    href: "/interface/post-creation",
    status: "En migration",
  },
  {
    id: "publishers-overview",
    title: "Publications",
    description: "Espace de préparation et validation des publications.",
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
    description: "Préparer le futur espace Pinterest sans publication réelle.",
    href: "/interface/publishers/pinterest",
    status: "En migration",
  },
  {
    id: "monitoring-static",
    title: "Observatoire",
    description: "Signaux, alertes et état du système.",
    href: "/interface/monitoring",
    status: "Experimental",
  },
  {
    id: "personnel-light",
    title: "Espace intérieur",
    description: "Vision du jour, routines, notes, énergie et objectifs.",
    href: "/interface/personnel",
    status: "Experimental",
  },
  {
    id: "links-useful",
    title: "Ressources",
    description: "Documents, repères et liens utiles du cockpit.",
    href: "/interface/links",
    status: "Disponible",
  },
];

export const publisherModules: CockpitModule[] = [
  {
    id: "publisher-youtube-hub",
    title: "YouTube Publisher",
    description:
      "Workflow YouTube conservé, avec publication réelle bloquée côté web.",
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
    title: "Réseaux courts",
    description:
      "TikTok, Instagram et Meta regroupés, non migrés et bloqués par défaut.",
    href: "/interface/publishers/shorts",
    status: "A securiser",
  },
];

export const overviewLogs: CockpitLog[] = [
  {
    timestamp: "09:00",
    type: "system",
    message: "Fondations du cockpit web en place.",
    status: "Disponible",
  },
  {
    timestamp: "09:05",
    type: "security",
    message: "Routes cockpit protégées par session Supabase.",
    status: "Disponible",
  },
  {
    timestamp: "09:10",
    type: "assistant",
    message: "Assistant Édifice disponible sans action réelle.",
    status: "En migration",
  },
];
