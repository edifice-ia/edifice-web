import type { Metadata } from "next";
import { OverviewDashboardClient } from "./OverviewDashboardClient";
import { cockpitModules } from "@/lib/cockpit/modules";
import { readCockpitState } from "@/lib/server/cockpit/read-only-state";
import { readPinterestPublisherPins } from "@/lib/server/pinterest-publisher";
import { readTrajectoire } from "@/lib/server/trajectoire";
import { getCurrentUser } from "@/src/lib/supabase/server";

export const metadata: Metadata = {
  title: "Accueil Cockpit - L'Edifice",
  description:
    "Accueil Cockpit du portail prive de L'Edifice.",
};

function daysUntil(value: string | null) {
  if (!value) {
    return null;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(`${value}T00:00:00`);

  return Math.ceil((target.getTime() - today.getTime()) / 86_400_000);
}

function isLate(status: string, deadline: string | null) {
  const remaining = daysUntil(deadline);

  return (
    remaining !== null &&
    remaining < 0 &&
    status !== "termine" &&
    status !== "reporte"
  );
}

export default async function OverviewPage() {
  const user = await getCurrentUser();
  const isProjectOwner = user?.email === "contact.edificeia@gmail.com";
  const [cockpitState, trajectoireResult, pinterestPins] = await Promise.all([
    readCockpitState(),
    user
      ? readTrajectoire(user.id)
          .then((result) => ({ projects: result.projects, error: null as string | null }))
          .catch((error) => ({
            projects: [],
            error:
              error instanceof Error
                ? error.message
                : "Lecture Trajectoire indisponible.",
          }))
      : Promise.resolve({ projects: [], error: "Utilisateur non connecte." }),
    readPinterestPublisherPins().catch(() => []),
  ]);

  const objectives = trajectoireResult.projects.flatMap((project) =>
    project.objectives.map((objective) => ({
      ...objective,
      projectTitle: project.title,
    })),
  );
  const actions = objectives.flatMap((objective) => objective.actions);
  const activeProjects = trajectoireResult.projects.filter(
    (project) => project.status === "actif",
  );
  const activeObjectives = objectives.filter(
    (objective) =>
      objective.status !== "termine" && objective.status !== "reporte",
  );
  const lateObjectives = objectives.filter((objective) =>
    isLate(objective.status, objective.deadline),
  );
  const upcomingDeadlines = objectives
    .filter((objective) => {
      const remaining = daysUntil(objective.deadline);
      return (
        remaining !== null &&
        remaining >= 0 &&
        objective.status !== "termine" &&
        objective.status !== "reporte"
      );
    })
    .sort((left, right) => {
      const leftDays = daysUntil(left.deadline) ?? 9999;
      const rightDays = daysUntil(right.deadline) ?? 9999;
      return leftDays - rightDays;
    })
    .slice(0, 4);
  const globalProgress = trajectoireResult.projects.length
    ? Math.round(
        trajectoireResult.projects.reduce((sum, project) => sum + project.progress, 0) /
          trajectoireResult.projects.length,
      )
    : 0;
  const draftStatuses = cockpitState.contentDrafts.byStatus;
  const shortsDrafts =
    (draftStatuses.draft ?? 0) + (draftStatuses["non commence"] ?? 0);
  const validatedTexts =
    (draftStatuses.approved ?? 0) + (draftStatuses.validated ?? 0);
  const visualsReady =
    (draftStatuses.media_ready ?? 0) + (draftStatuses.ready_to_publish ?? 0);
  const voicesReady = (draftStatuses.voice_ready ?? 0) + (draftStatuses.voix_prete ?? 0);
  const videosReady = draftStatuses.video_ready ?? 0;
  const readyToPublish = cockpitState.contentDrafts.readyToPublish.length;
  const pinterestReadyPins = pinterestPins.filter(
    (pin) => pin.status !== "published" && Boolean(pin.imageUrl || pin.storagePath),
  );
  const criticalBlockers = [
    trajectoireResult.error,
    ...lateObjectives
      .filter((objective) => objective.status === "bloque")
      .map((objective) => objective.title),
  ].filter((item): item is string => Boolean(item));
  const baseRecommendations = [
    cockpitState.nextActions[0] ?? "Finaliser le module Visuels Shorts.",
    "Verifier les prochains objectifs Trajectoire avant d'ouvrir une production.",
    "Garder les connexions en lecture claire sans modifier les tokens.",
  ];
  const recommendations = Array.from(new Set(baseRecommendations)).slice(0, 3);
  const connectionByKey = new Map(
    cockpitState.platformStatuses.map((platform) => [platform.key, platform]),
  );
  const connectionState = (key: string) => {
    const platform = connectionByKey.get(key);

    if (platform?.status === "CONNECTED") {
      return "connecte" as const;
    }

    if (platform?.status === "SANDBOX") {
      return "sandbox" as const;
    }

    if (platform?.status === "DISABLED") {
      return "reporte" as const;
    }

    return "actif" as const;
  };
  const connectionDetail = (key: string, fallback: string) =>
    connectionByKey.get(key)?.summary ?? fallback;

  return (
    <OverviewDashboardClient
      data={{
        greetingName: "Vincent",
        summary: {
          operationalSummary:
            "Cockpit pret pour piloter la journee par priorite, contenu, connexions et trajectoire.",
          cockpitState:
            criticalBlockers.length > 0
              ? "Attention requise"
              : "Aucun blocage critique",
          activeProjects: activeProjects.length,
          activeObjectives: activeObjectives.length,
          nextDeadline: upcomingDeadlines[0]
            ? `${upcomingDeadlines[0].title} / ${upcomingDeadlines[0].deadline ?? "sans date"}`
            : "Aucune echeance proche",
          dayPriority: recommendations[0],
          nextAction:
            actions.find((action) => action.status === "en cours")?.title ??
            actions.find((action) => action.status === "a faire")?.title ??
            recommendations[0],
          criticalBlocker: criticalBlockers[0] ?? null,
        },
        trajectory: {
          globalProgress,
          activeProjects: activeProjects.map((project) => project.title),
          activeObjectives: activeObjectives.map((objective) => objective.title),
          upcomingDeadlines: upcomingDeadlines.map((objective) => ({
            title: objective.title,
            date: objective.deadline,
            projectTitle: objective.projectTitle,
          })),
          lateObjectives: lateObjectives.map((objective) => objective.title),
          readError: trajectoireResult.error,
        },
        content: {
          shortsDrafts,
          validatedTexts,
          visualsReady,
          voicesReady,
          videosReady,
          readyToPublish,
          pinterestReadyPins: pinterestReadyPins.length,
        },
        connections: [
          {
            name: "Meta",
            state: connectionState("meta"),
            detail: connectionDetail("meta", "API active"),
          },
          {
            name: "Instagram",
            state: connectionState("instagram"),
            detail: connectionDetail("instagram", "Relie via Meta"),
          },
          {
            name: "Facebook",
            state: connectionState("facebook"),
            detail: connectionDetail("facebook", "Relie via Meta"),
          },
          {
            name: "YouTube",
            state: connectionState("youtube"),
            detail: connectionDetail("youtube", "OAuth valide"),
          },
          {
            name: "TikTok",
            state: connectionState("tiktok"),
            detail: connectionDetail("tiktok", "Sandbox / production selon memoire projet"),
          },
          {
            name: "Pinterest",
            state: connectionState("pinterest"),
            detail: connectionDetail("pinterest", "OAuth multi-comptes"),
          },
        ],
        recommendations: {
          actions: recommendations,
          blockers: criticalBlockers,
          priority: recommendations[0],
          shortAction:
            cockpitState.contentDrafts.inProgress[0]?.title ??
            "Relire un brouillon Shorts.",
          strategicAction:
            activeProjects[0]?.title ??
            "Structurer le prochain objectif Trajectoire.",
        },
        personal: ["Sport", "Ecriture", "Alternance", "Routine", "Sante"],
        quickLinks: cockpitModules.map((module) => ({
          id: module.id,
          title: module.title,
          description: module.description,
          href: module.href,
          status: module.status,
        })),
        isProjectOwner,
      }}
    />
  );
}
