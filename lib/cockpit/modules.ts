import type { CockpitLog, CockpitModule } from "@/types/cockpit";

export const cockpitModules: CockpitModule[] = [
  {
    id: "assistant-edifice",
    title: "Assistant de L'Edifice",
    description:
      "Point central pour batir l'oeuvre, organiser l'interieur et garder le cap.",
    href: "/interface",
    status: "En migration",
    accent: "jade",
  },
  {
    id: "content-workshop",
    title: "Atelier de contenu",
    description:
      "Creation et preparation: Shorts d'un cote, Pinterest de l'autre.",
    href: "/interface/post-creation",
    status: "En migration",
  },
  {
    id: "publishers-overview",
    title: "Publications",
    description: "Publication controlee et separee des ateliers de creation.",
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
    description: "Publication Pinterest active, limitee a un pin test confirme.",
    href: "/interface/publishers/pinterest",
    status: "Actif",
  },
  {
    id: "monitoring-static",
    title: "Observatoire",
    description: "Signaux, alertes et etat du systeme.",
    href: "/interface/monitoring",
    status: "Experimental",
  },
  {
    id: "trajectory",
    title: "Trajectoire",
    description: "Objectifs, projets, progression et deadlines.",
    href: "/interface/trajectoire",
    status: "Experimental",
    accent: "blue",
  },
  {
    id: "personnel-light",
    title: "Espace interieur",
    description: "Vision du jour, routines, notes, energie et objectifs.",
    href: "/interface/personnel",
    status: "Experimental",
  },
  {
    id: "links-useful",
    title: "Ressources",
    description: "Documents, reperes et liens utiles du cockpit.",
    href: "/interface/resources",
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
    description:
      "Selection des pins prets, choix du tableau cible et publication d'un seul pin test.",
    href: "/interface/publishers/pinterest",
    status: "Actif",
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
    message: "Routes cockpit protegees par session Supabase.",
    status: "Disponible",
  },
  {
    timestamp: "09:10",
    type: "assistant",
    message: "Assistant de L'Edifice disponible sans action reelle.",
    status: "En migration",
  },
];
