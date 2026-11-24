// Sections de la navigation intérieure d'EDIFICE ACADEMY — étape 1 du
// chantier 8 (suivi-chantiers-edifice.md), squelette sans données.
//
// Source unique : la navigation intérieure (AcademyNav) et les pages
// (app/interface/academy) dérivent de cette liste. Ajouter une section ici la
// rend navigable ; la retirer la fait répondre 404. Aucune énumération
// parallèle à tenir synchronisée.
//
// `plannedStep` renvoie au plan d'étapes du chantier 8 : l'étape à laquelle la
// section recevra son contenu. Rien de ce qui est décrit ici n'est construit.

export type AcademySection = {
  id: string;
  // Segment d'URL sous /interface/academy ; vide pour le tableau de bord.
  slug: string;
  label: string;
  // Ce que la section fera une fois construite — jamais ce qu'elle fait déjà.
  purpose: string;
  plannedStep: number;
};

export const ACADEMY_BASE_PATH = "/interface/academy";

export const academySections: AcademySection[] = [
  {
    id: "dashboard",
    slug: "",
    label: "Tableau de bord",
    purpose:
      "Vue calculée des programmes en cours, des séances et des révisions du jour.",
    plannedStep: 6,
  },
  {
    id: "calendar",
    slug: "calendrier",
    label: "Calendrier",
    purpose:
      "Planification des cours, des séances de travail, des révisions et des évaluations, avec l'agenda externe superposé en lecture seule.",
    plannedStep: 3,
  },
  {
    id: "programs",
    slug: "programmes",
    label: "Programmes",
    purpose:
      "Curriculums et formations indépendantes : matières, modules, chapitres et objectifs pédagogiques.",
    plannedStep: 2,
  },
  {
    id: "lessons",
    slug: "lecons",
    label: "Leçons",
    purpose: "Cours et leçons rattachés aux chapitres des programmes.",
    plannedStep: 2,
  },
  {
    id: "notes",
    slug: "notes",
    label: "Notes",
    purpose: "Notes et fiches de révision rattachées aux leçons.",
    plannedStep: 4,
  },
  {
    id: "assessments",
    slug: "evaluations",
    label: "Évaluations",
    purpose: "Quiz, exercices et évaluations, avec leurs tentatives et leurs scores.",
    plannedStep: 5,
  },
  {
    id: "reviews",
    slug: "revisions",
    label: "Révisions",
    purpose:
      "File des révisions du jour, planifiée par un calcul à partir des résultats passés.",
    plannedStep: 6,
  },
  {
    id: "progress",
    slug: "progression",
    label: "Progression",
    purpose: "Progression et compétences, calculées à partir de ce qui a été fait.",
    plannedStep: 6,
  },
  {
    id: "resources",
    slug: "ressources",
    label: "Ressources",
    purpose: "Ressources pédagogiques : liens, fichiers et textes rattachés aux programmes.",
    plannedStep: 2,
  },
  {
    id: "tutor",
    slug: "professeur",
    label: "Professeur IA",
    purpose:
      "Explications et propositions par le service commun IA, enregistrées seulement après validation explicite.",
    plannedStep: 7,
  },
];

export function academySectionHref(section: AcademySection) {
  return section.slug ? `${ACADEMY_BASE_PATH}/${section.slug}` : ACADEMY_BASE_PATH;
}

export function findAcademySectionBySlug(slug: string) {
  // Le tableau de bord n'a pas de segment : il ne doit pas répondre sous un slug.
  return academySections.find((section) => section.slug !== "" && section.slug === slug);
}

export const academyDashboardSection = academySections[0];
