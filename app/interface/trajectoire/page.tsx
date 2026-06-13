import type { Metadata } from "next";
import { CockpitHeader } from "@/components/cockpit/CockpitHeader";
import { SectionContainer } from "@/components/cockpit/SectionContainer";
import { StatusBadge } from "@/components/cockpit/StatusBadge";
import type { CockpitStatus } from "@/types/cockpit";

export const metadata: Metadata = {
  title: "Trajectoire - L'Edifice",
};

type GoalStatus = "non commence" | "en cours" | "bloque" | "termine";
type GoalPriority = "haute" | "moyenne" | "basse";

type TrajectoryGoal = {
  id: string;
  title: string;
  description: string;
  linkedProject: string;
  category: string;
  targetDate: string;
  priority: GoalPriority;
  progress: number;
  status: GoalStatus;
  subGoals: Array<{
    title: string;
    done: boolean;
  }>;
};

const goals: TrajectoryGoal[] = [
  {
    id: "traj-content-system",
    title: "Structurer le systeme de contenu",
    description:
      "Stabiliser l'atelier Shorts, Pinterest et les publishers pour produire sans melanger creation et publication.",
    linkedProject: "Edifice Web",
    category: "Professionnel",
    targetDate: "2026-07-05",
    priority: "haute",
    progress: 68,
    status: "en cours",
    subGoals: [
      { title: "Separer Brouillons, Visuels et Voix", done: true },
      { title: "Finaliser le module Visuels", done: true },
      { title: "Brancher les rapports quotidiens Assistant", done: false },
    ],
  },
  {
    id: "traj-pinterest-production",
    title: "Rendre Pinterest exploitable en production",
    description:
      "Clarifier les environnements, verifier les comptes et publier uniquement depuis les bons tableaux.",
    linkedProject: "Pinterest Publisher",
    category: "Professionnel",
    targetDate: "2026-06-24",
    priority: "haute",
    progress: 74,
    status: "en cours",
    subGoals: [
      { title: "Separer Production et Sandbox", done: true },
      { title: "Verifier les tableaux par environnement", done: true },
      { title: "Documenter le protocole de publication", done: false },
    ],
  },
  {
    id: "traj-daily-balance",
    title: "Maintenir une routine de pilotage sobre",
    description:
      "Conserver une lecture simple du jour: energie, priorites, blocages et prochaine action realiste.",
    linkedProject: "Espace interieur",
    category: "Personnel",
    targetDate: "2026-06-30",
    priority: "moyenne",
    progress: 35,
    status: "non commence",
    subGoals: [
      { title: "Definir le rituel du matin", done: false },
      { title: "Ajouter le point de fin de jour", done: false },
      { title: "Relier les objectifs aux rapports Assistant", done: false },
    ],
  },
  {
    id: "traj-review-loop",
    title: "Reduire les blocages de validation",
    description:
      "Identifier les dependances externes et garder une liste courte des validations en attente.",
    linkedProject: "Cockpit",
    category: "Operations",
    targetDate: "2026-06-10",
    priority: "moyenne",
    progress: 45,
    status: "bloque",
    subGoals: [
      { title: "Lister les validations externes", done: true },
      { title: "Associer chaque blocage a une prochaine action", done: false },
    ],
  },
  {
    id: "traj-foundations",
    title: "Poser les fondations du cockpit web",
    description:
      "Assembler navigation, garde-fous, modules de contenu et premiere couche de monitoring.",
    linkedProject: "L'Edifice",
    category: "Socle",
    targetDate: "2026-05-31",
    priority: "haute",
    progress: 100,
    status: "termine",
    subGoals: [
      { title: "Navigation cockpit", done: true },
      { title: "Atelier de contenu", done: true },
      { title: "Publishers separes", done: true },
    ],
  },
];

const statusConfig: Record<
  GoalStatus,
  { label: string; badge: CockpitStatus; className: string }
> = {
  "non commence": {
    label: "non commence",
    badge: "Plus tard",
    className: "border-[#64748b]/40 bg-[#64748b]/10 text-[#cbd5e1]",
  },
  "en cours": {
    label: "en cours",
    badge: "En cours",
    className: "border-[#38BDF8]/40 bg-[#38BDF8]/10 text-[#7DD3FC]",
  },
  bloque: {
    label: "bloque",
    badge: "Bloque",
    className: "border-[#ef4444]/40 bg-[#ef4444]/10 text-[#fecaca]",
  },
  termine: {
    label: "termine",
    badge: "Operationnel",
    className: "border-[#39E6D0]/40 bg-[#39E6D0]/10 text-[#39E6D0]",
  },
};

const priorityLabels: Record<GoalPriority, string> = {
  haute: "Priorite haute",
  moyenne: "Priorite moyenne",
  basse: "Priorite basse",
};

function daysUntil(targetDate: string) {
  const today = new Date("2026-06-13T00:00:00");
  const target = new Date(`${targetDate}T00:00:00`);
  const difference = target.getTime() - today.getTime();

  return Math.ceil(difference / 86_400_000);
}

function deadlineLabel(goal: TrajectoryGoal) {
  const remaining = daysUntil(goal.targetDate);

  if (goal.status === "termine") {
    return "termine";
  }

  if (remaining < 0) {
    return `${Math.abs(remaining)} jour(s) de retard`;
  }

  if (remaining === 0) {
    return "aujourd'hui";
  }

  return `${remaining} jour(s) restants`;
}

function isLate(goal: TrajectoryGoal) {
  return goal.status !== "termine" && daysUntil(goal.targetDate) < 0;
}

const activeGoals = goals.filter((goal) => goal.status !== "termine");
const completedGoals = goals.filter((goal) => goal.status === "termine");
const lateGoals = goals.filter(isLate);
const upcomingGoals = activeGoals
  .filter((goal) => daysUntil(goal.targetDate) >= 0)
  .sort((a, b) => daysUntil(a.targetDate) - daysUntil(b.targetDate))
  .slice(0, 4);

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="h-2 overflow-hidden rounded-full border border-[#1D2A44] bg-[#03070B]">
      <div
        className="h-full rounded-full bg-gradient-to-r from-[#38BDF8] via-[#39E6D0] to-[#A7F3D0]"
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  );
}

function DashboardMetric({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: number | string;
  tone?: "neutral" | "good" | "warning";
}) {
  const toneClass =
    tone === "good"
      ? "text-[#39E6D0]"
      : tone === "warning"
        ? "text-[#fbbf24]"
        : "text-[#F8FAFC]";

  return (
    <SectionContainer>
      <p className="text-sm text-[#A7B0C0]">{label}</p>
      <p className={`mt-2 text-3xl font-semibold ${toneClass}`}>{value}</p>
    </SectionContainer>
  );
}

function GoalCard({ goal }: { goal: TrajectoryGoal }) {
  const late = isLate(goal);

  return (
    <article className="rounded-md border border-[#1D2A44] bg-[#08111A] p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#7DD3FC]">
            {goal.category} / {goal.linkedProject}
          </p>
          <h3 className="mt-2 text-lg font-semibold text-[#F8FAFC]">
            {goal.title}
          </h3>
          <p className="mt-2 text-sm leading-6 text-[#A7B0C0]">
            {goal.description}
          </p>
        </div>
        <span
          className={`w-fit rounded-md border px-2.5 py-1 text-xs font-semibold ${statusConfig[goal.status].className}`}
        >
          {statusConfig[goal.status].label}
        </span>
      </div>

      <div className="mt-4 grid gap-3 text-sm md:grid-cols-4">
        <p className="rounded-md border border-[#1D2A44] bg-[#03070B] px-3 py-2 text-[#A7B0C0]">
          Cible: <span className="text-[#F8FAFC]">{goal.targetDate}</span>
        </p>
        <p className="rounded-md border border-[#1D2A44] bg-[#03070B] px-3 py-2 text-[#A7B0C0]">
          {late ? "Retard" : "Temps"}:{" "}
          <span className={late ? "text-[#fecaca]" : "text-[#F8FAFC]"}>
            {deadlineLabel(goal)}
          </span>
        </p>
        <p className="rounded-md border border-[#1D2A44] bg-[#03070B] px-3 py-2 text-[#A7B0C0]">
          {priorityLabels[goal.priority]}
        </p>
        <p className="rounded-md border border-[#1D2A44] bg-[#03070B] px-3 py-2 text-[#A7B0C0]">
          Progression: <span className="text-[#F8FAFC]">{goal.progress}%</span>
        </p>
      </div>

      <div className="mt-4">
        <ProgressBar value={goal.progress} />
      </div>

      <div className="mt-4 grid gap-2">
        {goal.subGoals.map((subGoal) => (
          <p
            key={subGoal.title}
            className="rounded-md border border-[#1D2A44] bg-[#03070B] px-3 py-2 text-sm text-[#A7B0C0]"
          >
            <span className={subGoal.done ? "text-[#39E6D0]" : "text-[#64748B]"}>
              {subGoal.done ? "fait" : "a faire"}
            </span>{" "}
            {subGoal.title}
          </p>
        ))}
      </div>
    </article>
  );
}

export default function TrajectoryPage() {
  const averageProgress = Math.round(
    goals.reduce((sum, goal) => sum + goal.progress, 0) / goals.length,
  );

  return (
    <div>
      <CockpitHeader
        eyebrow="Trajectoire"
        title="Trajectoire"
        description="Objectifs personnels et professionnels, projets lies, echeances et progression. Cette vue servira de base aux rapports quotidiens de l'Assistant Edifice."
        status="Experimental"
      />

      <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <DashboardMetric label="Objectifs actifs" value={activeGoals.length} />
        <DashboardMetric
          label="Objectifs termines"
          value={completedGoals.length}
          tone="good"
        />
        <DashboardMetric
          label="Objectifs en retard"
          value={lateGoals.length}
          tone={lateGoals.length > 0 ? "warning" : "good"}
        />
        <DashboardMetric label="Progression moyenne" value={`${averageProgress}%`} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-6">
          <SectionContainer>
            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_260px]">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#39E6D0]">
                  Vision
                </p>
                <h2 className="mt-3 text-2xl font-semibold text-[#F8FAFC]">
                  Avancer sans perdre le fil
                </h2>
                <p className="mt-3 leading-7 text-[#A7B0C0]">
                  Trajectoire rassemble ce qui compte, ce qui bloque et ce qui
                  approche. La lecture reste courte pour nourrir un rapport
                  quotidien sans bruit.
                </p>
              </div>
              <div className="rounded-md border border-[#1D2A44] bg-[#08111A] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#7DD3FC]">
                  Assistant Edifice
                </p>
                <p className="mt-2 text-sm leading-6 text-[#A7B0C0]">
                  Donnees preparees pour resumer chaque jour: progression,
                  retards, blocages et prochaine action.
                </p>
              </div>
            </div>
          </SectionContainer>

          <SectionContainer>
            <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#39E6D0]">
                  Objectifs
                </p>
                <h2 className="mt-3 text-2xl font-semibold text-[#F8FAFC]">
                  Suivi detaille
                </h2>
              </div>
              <StatusBadge status="Experimental" />
            </div>
            <div className="grid gap-4">
              {goals.map((goal) => (
                <GoalCard key={goal.id} goal={goal} />
              ))}
            </div>
          </SectionContainer>
        </div>

        <aside className="space-y-6">
          <SectionContainer>
            <h2 className="text-xl font-semibold text-[#F8FAFC]">
              Projets associes
            </h2>
            <div className="mt-4 grid gap-3">
              {[...new Set(goals.map((goal) => goal.linkedProject))].map((project) => (
                <p
                  key={project}
                  className="rounded-md border border-[#1D2A44] bg-[#08111A] px-3 py-2 text-sm text-[#A7B0C0]"
                >
                  {project}
                </p>
              ))}
            </div>
          </SectionContainer>

          <SectionContainer>
            <h2 className="text-xl font-semibold text-[#F8FAFC]">
              Deadlines
            </h2>
            <div className="mt-4 grid gap-3">
              {upcomingGoals.map((goal) => (
                <div
                  key={goal.id}
                  className="rounded-md border border-[#1D2A44] bg-[#08111A] px-3 py-3"
                >
                  <p className="text-sm font-semibold text-[#F8FAFC]">
                    {goal.title}
                  </p>
                  <p className="mt-1 text-xs text-[#A7B0C0]">
                    {deadlineLabel(goal)} / {goal.targetDate}
                  </p>
                </div>
              ))}
            </div>
          </SectionContainer>

          <SectionContainer>
            <h2 className="text-xl font-semibold text-[#F8FAFC]">
              Progression
            </h2>
            <div className="mt-4 grid gap-3">
              {goals.map((goal) => (
                <div key={goal.id} className="grid gap-2">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="truncate text-[#A7B0C0]">{goal.title}</span>
                    <span className="font-semibold text-[#F8FAFC]">
                      {goal.progress}%
                    </span>
                  </div>
                  <ProgressBar value={goal.progress} />
                </div>
              ))}
            </div>
          </SectionContainer>

          <SectionContainer>
            <h2 className="text-xl font-semibold text-[#F8FAFC]">Vue POPAM</h2>
            <div className="mt-4 grid gap-3 text-sm text-[#A7B0C0]">
              {[
                ["P", "Priorites", `${activeGoals.length} objectif(s) actifs`],
                ["O", "Obstacles", `${lateGoals.length} retard(s) ou blocage(s)`],
                ["P", "Projets", `${new Set(goals.map((goal) => goal.linkedProject)).size} projets lies`],
                ["A", "Actions", "Prochaine action a definir par l'Assistant"],
                ["M", "Mesure", `${averageProgress}% de progression moyenne`],
              ].map(([letter, label, value]) => (
                <div
                  key={`${letter}-${label}`}
                  className="rounded-md border border-[#1D2A44] bg-[#08111A] px-3 py-3"
                >
                  <p className="font-semibold text-[#F8FAFC]">
                    {letter} / {label}
                  </p>
                  <p className="mt-1">{value}</p>
                </div>
              ))}
            </div>
          </SectionContainer>
        </aside>
      </div>
    </div>
  );
}
