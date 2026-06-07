import type {
  CockpitPlatformState,
  CockpitStatus,
  PlatformStatusCode,
} from "@/types/cockpit";

const source = "Source de verite cockpit plateformes";

export const platformStatusOrder = [
  "meta",
  "facebook",
  "instagram",
  "youtube",
  "tiktok",
  "pinterest",
] as const;

export function getCanonicalPlatformStatuses(): CockpitPlatformState[] {
  return [
    {
      key: "meta",
      name: "Meta",
      status: "CONNECTED",
      label: "Connecte et fonctionnel",
      summary: "Meta OAuth et Graph API sont connectes et utilisables en test controle.",
      details: [
        "Connexion Meta active",
        "Fonctionnel pour les modules controles",
        "Aucun secret expose dans le cockpit",
      ],
      source,
      updatedAt: null,
    },
    {
      key: "facebook",
      name: "Facebook",
      status: "CONNECTED",
      label: "Connecte et fonctionnel",
      summary: "Facebook est connecte via l'ecosysteme Meta et fonctionnel.",
      details: [
        "App Facebook accessible",
        "Connexion fonctionnelle",
        "Publication automatique non declenchee",
      ],
      source,
      updatedAt: null,
    },
    {
      key: "instagram",
      name: "Instagram",
      status: "CONNECTED",
      label: "Connecte et fonctionnel",
      summary: "Instagram est connecte via Meta et fonctionnel pour les tests controles.",
      details: [
        "Instagram Graph relie a Meta",
        "Connexion fonctionnelle",
        "Publication automatique non declenchee",
      ],
      source,
      updatedAt: null,
    },
    {
      key: "youtube",
      name: "YouTube",
      status: "CONNECTED",
      label: "Connecte et fonctionnel",
      summary: "YouTube OAuth est connecte et l'upload prive est valide.",
      details: [
        "Connexion YouTube active",
        "Upload prive valide",
        "Publication publique non automatique",
      ],
      source,
      updatedAt: null,
    },
    {
      key: "tiktok",
      name: "TikTok",
      status: "REVIEW_PENDING",
      label: "Review en attente",
      summary: "TikTok reste en attente de review externe avant activation production.",
      details: [
        "Sandbox fonctionnel",
        "Review produit en attente",
        "Aucune publication automatique",
      ],
      source,
      updatedAt: null,
    },
    {
      key: "pinterest",
      name: "Pinterest",
      status: "CONNECTED",
      label: "Connecte et actif",
      summary: "Pinterest OAuth multi-comptes est connecte et utilisable en publication controlee.",
      details: [
        "OAuth multi-comptes actif",
        "Publisher Pinterest disponible",
        "Publication limitee a confirmation humaine",
      ],
      source,
      updatedAt: null,
    },
  ];
}

export function platformStatusToCockpitStatus(
  status: PlatformStatusCode,
): CockpitStatus {
  if (status === "CONNECTED") {
    return "Operationnel";
  }

  if (status === "REVIEW_PENDING") {
    return "Review";
  }

  if (status === "SANDBOX") {
    return "Experimental";
  }

  if (status === "DISABLED") {
    return "Plus tard";
  }

  return "Bloque";
}

export function isPlatformInReview(status: CockpitPlatformState) {
  return status.status === "REVIEW_PENDING";
}
