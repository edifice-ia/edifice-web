import type { CockpitNavItem } from "@/types/cockpit";

export const cockpitNavigation: CockpitNavItem[] = [
  {
    id: "assistant",
    href: "/interface",
    label: "Assistant Édifice",
    description: "Projet, personnel, equilibre",
    status: "En migration",
  },
  {
    id: "overview",
    href: "/interface/overview",
    label: "Tableau de bord",
    description: "Synthese cockpit",
    status: "Disponible",
  },
  {
    id: "post-creation",
    href: "/interface/post-creation",
    label: "Atelier de contenu",
    description: "Idees, scripts et contenus",
    status: "En migration",
  },
  {
    id: "publishers",
    href: "/interface/publishers",
    label: "Publications",
    description: "Hub de publication",
    status: "En migration",
  },
  {
    id: "monitoring",
    href: "/interface/monitoring",
    label: "Suivi système",
    description: "Logs et sante",
    status: "Experimental",
  },
  {
    id: "personnel",
    href: "/interface/personnel",
    label: "Espace personnel",
    description: "Routines et objectifs",
    status: "Experimental",
  },
  {
    id: "settings",
    href: "/interface/settings",
    label: "Réglages",
    description: "Compte et connexions",
    status: "A securiser",
  },
  {
    id: "links",
    href: "/interface/links",
    label: "Ressources",
    description: "Documentation et outils",
    status: "Disponible",
  },
];
