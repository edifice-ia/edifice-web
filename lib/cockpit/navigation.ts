import type { CockpitNavItem } from "@/types/cockpit";

export const cockpitNavigation: CockpitNavItem[] = [
  {
    id: "home",
    href: "/interface",
    label: "Accueil cockpit",
    description: "Vue d'ensemble",
    status: "Disponible",
  },
  {
    id: "assistant",
    href: "/interface/assistant",
    label: "Assistant IA",
    description: "Assistant et recherche web",
    status: "En migration",
  },
  {
    id: "post-creation",
    href: "/interface/post-creation",
    label: "Creation de post",
    description: "Idees, scripts et contenus",
    status: "En migration",
  },
  {
    id: "publishers",
    href: "/interface/publishers",
    label: "Publishers",
    description: "Hub de publication",
    status: "En migration",
  },
  {
    id: "monitoring",
    href: "/interface/monitoring",
    label: "Monitoring",
    description: "Logs et health checks",
    status: "Experimental",
  },
  {
    id: "personnel",
    href: "/interface/personnel",
    label: "Personnel",
    description: "Routines et objectifs",
    status: "Experimental",
  },
  {
    id: "settings",
    href: "/interface/settings",
    label: "Parametres",
    description: "Compte et preferences",
    status: "A securiser",
  },
  {
    id: "links",
    href: "/interface/links",
    label: "Liens utiles",
    description: "Documentation et outils",
    status: "Disponible",
  },
];
