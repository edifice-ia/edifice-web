import type {
  ConstructionJournalEntry,
  ObservatoryArea,
  ObservatoryItem,
} from "@/types/cockpit";

export const observatoryAreas: ObservatoryArea[] = [
  "OAuth",
  "Agents",
  "Infrastructure",
];

export const observatoryItems: ObservatoryItem[] = [
  {
    id: "oauth-youtube",
    area: "OAuth",
    name: "YouTube",
    status: "Operationnel",
    summary: "Connexion OAuth et workflow publisher deja poses.",
    nextAction: "Verifier le rafraichissement de statut depuis le cockpit.",
  },
  {
    id: "oauth-tiktok",
    area: "OAuth",
    name: "TikTok",
    status: "Review",
    summary: "Route de connexion presente, validation produit a consolider.",
    nextAction: "Revoir les permissions et afficher le statut sans publier.",
    blockedByExternalReview: true,
    externalReviewNote:
      "OAuth Sandbox actif, review produit a consolider avant publication.",
  },
  {
    id: "oauth-meta",
    area: "OAuth",
    name: "Meta",
    status: "En cours",
    summary: "Flux Meta en place cote API, a stabiliser dans l'interface.",
    nextAction: "Centraliser le retour de statut Meta dans l'Observatoire.",
    blockedByExternalReview: true,
    externalReviewNote:
      "Permissions et review Meta a suivre sans publication automatique.",
  },
  {
    id: "oauth-instagram",
    area: "OAuth",
    name: "Instagram",
    status: "En cours",
    summary: "Statuts Instagram relies a Meta, sans action de publication.",
    nextAction: "Relier le choix de compte Instagram au suivi projet.",
  },
  {
    id: "oauth-pinterest",
    area: "OAuth",
    name: "Pinterest",
    status: "Review",
    summary: "Espace publisher prepare, en attente reviewer externe.",
    nextAction:
      "Attendre la validation reviewer Pinterest avant toute action OAuth supplementaire.",
    blockedByExternalReview: true,
    externalReviewNote:
      "Attente de validation reviewer Pinterest, aucune action OAuth supplementaire pour l'instant.",
  },
  {
    id: "agent-assistant",
    area: "Agents",
    name: "Assistant",
    status: "En cours",
    summary: "Point d'entree principal du cockpit et de la memoire projet.",
    nextAction: "Lire la memoire projet avant de proposer la prochaine action.",
  },
  {
    id: "agent-publisher",
    area: "Agents",
    name: "Publisher",
    status: "Review",
    summary: "Preparation des publications disponible, publication reelle gardee.",
    nextAction: "Conserver la validation humaine comme etape obligatoire.",
  },
  {
    id: "agent-scheduler",
    area: "Agents",
    name: "Scheduler",
    status: "A migrer",
    summary: "Planification a concevoir sans declencher de tache externe.",
    nextAction: "Designer une file d'attente locale avant automation.",
  },
  {
    id: "agent-generation",
    area: "Agents",
    name: "Generation",
    status: "En cours",
    summary: "Atelier de contenu en migration progressive.",
    nextAction: "Brancher les idees, scripts et formats sur la memoire projet.",
  },
  {
    id: "agent-montage",
    area: "Agents",
    name: "Montage",
    status: "A migrer",
    summary: "Module video non migre dans le cockpit web.",
    nextAction: "Lister les besoins de montage avant integration.",
  },
  {
    id: "infra-vercel",
    area: "Infrastructure",
    name: "Vercel",
    status: "Review",
    summary: "Cible de deploiement presente, a relire avant livraison.",
    nextAction: "Verifier les variables publiques et le build de production.",
  },
  {
    id: "infra-supabase",
    area: "Infrastructure",
    name: "Supabase",
    status: "Operationnel",
    summary: "Auth cockpit et stockage OAuth cote serveur en place.",
    nextAction: "Ne pas exposer les tokens, garder les acces serveur.",
  },
  {
    id: "infra-domain",
    area: "Infrastructure",
    name: "Domaine",
    status: "Review",
    summary: "Domaine a verifier au moment du deploiement public.",
    nextAction: "Confirmer DNS et redirections apres validation Vercel.",
  },
  {
    id: "infra-email",
    area: "Infrastructure",
    name: "Email",
    status: "Bloque",
    summary: "Configuration email non confirmee dans le cockpit.",
    nextAction: "Choisir le fournisseur et definir les emails transactionnels.",
  },
];

export const constructionJournalSeed: ConstructionJournalEntry[] = [
  {
    id: "journal-observatory-foundation",
    date: "2026-05-29",
    action: "Pose de la premiere couche Observatoire.",
    decision: "Creer une memoire projet lisible par l'assistant global.",
    blocker: "Les statuts restent declaratifs tant que les sondes live ne sont pas branchees.",
    nextStep: "Relier les statuts reels sans toucher aux OAuth fonctionnels.",
  },
];

export const projectMemoryForAssistant = {
  project: "L'Edifice",
  cockpitRole:
    "Transformer l'assistant en cockpit de suivi projet, sans declencher d'actions sensibles.",
  safeguards: [
    "Ne pas toucher aux OAuth fonctionnels.",
    "Ne pas toucher aux tokens Supabase.",
    "Ne pas declencher de publication reelle.",
    "Garder la validation humaine active pour les actions sensibles.",
  ],
  nextRecommendedAction:
    "Brancher les statuts reels en lecture seule dans l'Observatoire, en commencant par OAuth YouTube et Supabase.",
  observatoryItems,
  constructionJournalSeed,
};

export function buildProjectStatusOverview(items: ObservatoryItem[]) {
  return {
    totalModules: items.length,
    operational: items.filter((item) => item.status === "Operationnel").length,
    blocked: items.filter((item) => item.status === "Bloque").length,
    nextRecommendedAction: projectMemoryForAssistant.nextRecommendedAction,
  };
}

export const projectStatusOverview = buildProjectStatusOverview(observatoryItems);
