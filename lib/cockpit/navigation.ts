import type { CockpitNavItem } from "@/types/cockpit";

export const cockpitNavigation: CockpitNavItem[] = [
  {
    id: "cockpit-home",
    href: "/dashboard",
    label: "Accueil cockpit",
    description: "Resume operationnel du jour",
    status: "Operationnel",
    showStatus: true,
  },
  {
    id: "assistant",
    href: "/interface",
    label: "Assistant de L'Edifice",
    description: "Projet, interieur, equilibre",
    status: "En migration",
    showStatus: true,
  },
  {
    id: "overview",
    href: "/interface/overview",
    label: "Tableau de bord",
    description: "Fondations du cockpit",
    status: "Disponible",
  },
  {
    id: "post-creation",
    href: "/interface/post-creation",
    label: "Atelier de contenu",
    description: "Shorts et Pinterest",
    status: "En migration",
    children: [
      {
        id: "post-creation-shorts",
        href: "/interface/post-creation/shorts",
        label: "Shorts",
      },
      {
        id: "post-creation-pinterest",
        href: "/interface/post-creation/pinterest",
        label: "Pinterest",
      },
    ],
  },
  {
    id: "publishers",
    href: "/interface/publishers",
    label: "Publications",
    description: "Pinterest Publisher",
    status: "En migration",
    children: [
      {
        id: "publisher-pinterest",
        href: "/interface/publishers/pinterest",
        label: "Pinterest Publisher",
      },
    ],
  },
  {
    id: "monitoring",
    href: "/interface/monitoring",
    label: "Observatoire",
    description: "Signaux et etat",
    status: "Experimental",
    showStatus: true,
  },
  {
    id: "personnel",
    href: "/interface/personnel",
    label: "Espace interieur",
    description: "Routines et energie",
    status: "Experimental",
  },
  {
    id: "settings",
    href: "/interface/settings",
    label: "Reglages",
    description: "Compte et connexions",
    status: "A securiser",
    showStatus: true,
  },
  {
    id: "links",
    href: "/interface/resources",
    label: "Ressources",
    description: "Reperes et documents",
    status: "Disponible",
    showStatus: true,
  },
];
