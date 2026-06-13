"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CockpitHeader } from "@/components/cockpit/CockpitHeader";
import { SectionContainer } from "@/components/cockpit/SectionContainer";
import { StatusBadge } from "@/components/cockpit/StatusBadge";
import type { CockpitStatus } from "@/types/cockpit";

type DashboardData = {
  greetingName: string;
  summary: {
    operationalSummary: string;
    cockpitState: string;
    activeProjects: number;
    activeObjectives: number;
    nextDeadline: string;
    dayPriority: string;
    nextAction: string;
    criticalBlocker: string | null;
  };
  trajectory: {
    globalProgress: number;
    activeProjects: string[];
    activeObjectives: string[];
    upcomingDeadlines: Array<{
      title: string;
      date: string | null;
      projectTitle: string;
    }>;
    lateObjectives: string[];
    readError: string | null;
  };
  content: {
    shortsDrafts: number;
    validatedTexts: number;
    visualsReady: number;
    voicesReady: number;
    videosReady: number;
    readyToPublish: number;
    pinterestReadyPins: number;
  };
  connections: Array<{
    name: string;
    state: "connecte" | "actif" | "sandbox" | "reporte";
    detail: string;
  }>;
  recommendations: {
    actions: string[];
    blockers: string[];
    priority: string;
    shortAction: string;
    strategicAction: string;
  };
  personal: string[];
  quickLinks: Array<{
    id: string;
    title: string;
    description: string;
    href: string;
    status: CockpitStatus;
  }>;
  isProjectOwner: boolean;
};

type BlockId =
  | "summary"
  | "trajectory"
  | "content"
  | "connections"
  | "recommendations"
  | "personal";

const blocks: Array<{ id: BlockId; label: string; shortLabel: string }> = [
  { id: "summary", label: "Résumé", shortLabel: "1 Résumé" },
  { id: "trajectory", label: "Trajectoire", shortLabel: "2 Trajectoire" },
  { id: "content", label: "Contenus", shortLabel: "3 Contenus" },
  { id: "connections", label: "Connexions", shortLabel: "4 Connexions" },
  { id: "recommendations", label: "Recommandations", shortLabel: "5 Recos" },
  { id: "personal", label: "Personnel", shortLabel: "6 Personnel" },
];

const connectionClasses: Record<DashboardData["connections"][number]["state"], string> = {
  connecte: "border-[#39E6D0]/40 bg-[#39E6D0]/10 text-[#39E6D0]",
  actif: "border-[#38BDF8]/40 bg-[#38BDF8]/10 text-[#7DD3FC]",
  sandbox: "border-[#f59e0b]/40 bg-[#f59e0b]/10 text-[#fbbf24]",
  reporte: "border-[#64748b]/40 bg-[#64748b]/10 text-[#cbd5e1]",
};

function formatDate(value: string | null) {
  if (!value) {
    return "Sans date";
  }

  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
  }).format(new Date(`${value}T00:00:00`));
}

function MetricCard({
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
    <div className="rounded-md border border-[#1D2A44] bg-[#08111A] px-4 py-3">
      <p className="text-sm text-[#A7B0C0]">{label}</p>
      <p className={`mt-2 text-2xl font-semibold ${toneClass}`}>{value}</p>
    </div>
  );
}

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

function SimpleList({
  empty,
  items,
}: {
  empty: string;
  items: string[];
}) {
  return (
    <div className="grid gap-2">
      {items.length ? (
        items.map((item) => (
          <p
            className="rounded-md border border-[#1D2A44] bg-[#08111A] px-3 py-2 text-sm text-[#A7B0C0]"
            key={item}
          >
            {item}
          </p>
        ))
      ) : (
        <p className="rounded-md border border-[#1D2A44] bg-[#08111A] px-3 py-2 text-sm text-[#A7B0C0]">
          {empty}
        </p>
      )}
    </div>
  );
}

export function OverviewDashboardClient({ data }: { data: DashboardData }) {
  const [activeBlock, setActiveBlock] = useState<BlockId>("summary");
  const activeIndex = blocks.findIndex((block) => block.id === activeBlock);
  const activeMeta = blocks[activeIndex] ?? blocks[0];
  const nextBlock = blocks[(activeIndex + 1) % blocks.length];
  const previousBlock = blocks[(activeIndex - 1 + blocks.length) % blocks.length];
  const summaryActions = useMemo(
    () => [
      { label: "Voir Trajectoire", id: "trajectory" as BlockId },
      { label: "Voir Contenus", id: "content" as BlockId },
      { label: "Voir Connexions", id: "connections" as BlockId },
      { label: "Voir Recommandations", id: "recommendations" as BlockId },
      { label: "Voir Vue personnelle", id: "personal" as BlockId },
    ],
    [],
  );

  return (
    <div>
      <CockpitHeader
        eyebrow="Accueil cockpit"
        title="Accueil Cockpit"
        description="Centre de pilotage quotidien de L'Edifice, organise en blocs rapides."
        status="Operationnel"
      />

      <div className="mb-5 flex flex-wrap gap-2">
        {blocks.map((block) => (
          <button
            className={`rounded-md border px-3 py-2 text-sm font-semibold transition ${
              block.id === activeBlock
                ? "border-[#39E6D0]/50 bg-[#39E6D0]/10 text-[#39E6D0]"
                : "border-[#1D2A44] bg-[#08111A] text-[#A7B0C0] hover:border-[#38BDF8] hover:text-[#F8FAFC]"
            }`}
            key={block.id}
            onClick={() => setActiveBlock(block.id)}
            type="button"
          >
            {block.shortLabel}
          </button>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <SectionContainer className="min-h-[520px] transition-all duration-200">
          <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#39E6D0]">
                {activeMeta.shortLabel}
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-[#F8FAFC]">
                {activeMeta.label}
              </h2>
            </div>
            <StatusBadge status="Operationnel" />
          </div>

          <div className="transition-opacity duration-200">
            {activeBlock === "summary" ? (
              <SummaryBlock data={data} summaryActions={summaryActions} setActiveBlock={setActiveBlock} />
            ) : null}
            {activeBlock === "trajectory" ? <TrajectoryBlock data={data} /> : null}
            {activeBlock === "content" ? <ContentBlock data={data} /> : null}
            {activeBlock === "connections" ? <ConnectionsBlock data={data} /> : null}
            {activeBlock === "recommendations" ? (
              <RecommendationsBlock data={data} />
            ) : null}
            {activeBlock === "personal" ? <PersonalBlock data={data} /> : null}
          </div>

          <div className="mt-8 flex flex-wrap gap-2 border-t border-[#1D2A44] pt-4">
            <button
              className="rounded-md border border-[#1D2A44] bg-[#03070B] px-4 py-2 text-sm font-semibold text-[#A7B0C0] transition hover:border-[#38BDF8] hover:text-[#F8FAFC]"
              onClick={() => setActiveBlock(previousBlock.id)}
              type="button"
            >
              ← Précédent
            </button>
            <button
              className="rounded-md border border-[#1D2A44] bg-[#03070B] px-4 py-2 text-sm font-semibold text-[#A7B0C0] transition hover:border-[#38BDF8] hover:text-[#F8FAFC]"
              onClick={() => setActiveBlock(nextBlock.id)}
              type="button"
            >
              Suivant →
            </button>
            <button
              className="rounded-md border border-[#39E6D0]/50 bg-[#39E6D0]/10 px-4 py-2 text-sm font-semibold text-[#39E6D0] transition hover:bg-[#39E6D0]/20"
              onClick={() => setActiveBlock("summary")}
              type="button"
            >
              Retour au résumé
            </button>
          </div>
        </SectionContainer>

        <aside className="space-y-4">
          <SectionContainer>
            <h2 className="text-lg font-semibold text-[#F8FAFC]">
              Accès rapide
            </h2>
            <div className="mt-4 grid gap-2">
              {data.quickLinks.slice(0, 7).map((link) => (
                <Link
                  className="rounded-md border border-[#1D2A44] bg-[#08111A] px-3 py-3 transition hover:border-[#39E6D0]/60"
                  href={link.href}
                  key={link.id}
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-semibold text-[#F8FAFC]">
                      {link.title}
                    </p>
                    <StatusBadge status={link.status} />
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs leading-5 text-[#A7B0C0]">
                    {link.description}
                  </p>
                </Link>
              ))}
            </div>
          </SectionContainer>

          {data.isProjectOwner ? (
            <SectionContainer>
              <h2 className="text-lg font-semibold text-[#F8FAFC]">
                Cockpit local
              </h2>
              <p className="mt-2 text-sm leading-6 text-[#A7B0C0]">
                Disponible uniquement si Streamlit tourne sur cette machine.
              </p>
              <a
                className="mt-4 inline-flex rounded-md border border-[#39E6D0]/50 bg-[#08111A] px-4 py-2 text-sm font-semibold text-[#39E6D0] transition hover:bg-[#1D2A44]"
                href="http://localhost:8501"
              >
                Ouvrir local
              </a>
            </SectionContainer>
          ) : null}
        </aside>
      </div>
    </div>
  );
}

function SummaryBlock({
  data,
  setActiveBlock,
  summaryActions,
}: {
  data: DashboardData;
  setActiveBlock: (block: BlockId) => void;
  summaryActions: Array<{ label: string; id: BlockId }>;
}) {
  return (
    <div className="grid gap-5">
      <div className="rounded-md border border-[#1D2A44] bg-[#08111A] p-5">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#39E6D0]">
          Bonjour {data.greetingName}
        </p>
        <h3 className="mt-3 text-3xl font-semibold text-[#F8FAFC]">
          Résumé opérationnel du jour
        </h3>
        <p className="mt-3 max-w-3xl leading-7 text-[#A7B0C0]">
          {data.summary.operationalSummary}
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <MetricCard label="Etat général du cockpit" value={data.summary.cockpitState} />
        <MetricCard label="Projets actifs" value={data.summary.activeProjects} />
        <MetricCard label="Objectifs actifs" value={data.summary.activeObjectives} />
        <MetricCard label="Prochaine échéance" value={data.summary.nextDeadline} />
        <MetricCard label="Prochaine action recommandée" value={data.summary.nextAction} />
        <MetricCard
          label="Blocage critique"
          tone={data.summary.criticalBlocker ? "warning" : "good"}
          value={data.summary.criticalBlocker ?? "Aucun blocage critique"}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {summaryActions.map((action) => (
          <button
            className="rounded-md border border-[#39E6D0]/50 bg-[#39E6D0]/10 px-4 py-2 text-sm font-semibold text-[#39E6D0] transition hover:bg-[#39E6D0]/20"
            key={action.id}
            onClick={() => setActiveBlock(action.id)}
            type="button"
          >
            {action.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function TrajectoryBlock({ data }: { data: DashboardData }) {
  return (
    <div className="grid gap-5">
      <div className="grid gap-3 md:grid-cols-3">
        <MetricCard label="Progression globale" value={`${data.trajectory.globalProgress}%`} />
        <MetricCard label="Projets actifs" value={data.trajectory.activeProjects.length} />
        <MetricCard label="Objectifs" value={data.trajectory.activeObjectives.length} />
      </div>
      <ProgressBar value={data.trajectory.globalProgress} />
      {data.trajectory.readError ? (
        <p className="rounded-md border border-[#f87171]/40 bg-[#f87171]/10 px-3 py-2 text-sm text-[#fecaca]">
          {data.trajectory.readError}
        </p>
      ) : null}
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <h3 className="mb-3 font-semibold text-[#F8FAFC]">Projets actifs</h3>
          <SimpleList empty="Aucun projet actif." items={data.trajectory.activeProjects} />
        </div>
        <div>
          <h3 className="mb-3 font-semibold text-[#F8FAFC]">Objectifs</h3>
          <SimpleList empty="Aucun objectif actif." items={data.trajectory.activeObjectives} />
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <h3 className="mb-3 font-semibold text-[#F8FAFC]">Échéances proches</h3>
          <div className="grid gap-2">
            {data.trajectory.upcomingDeadlines.length ? (
              data.trajectory.upcomingDeadlines.map((deadline) => (
                <p
                  className="rounded-md border border-[#1D2A44] bg-[#08111A] px-3 py-2 text-sm text-[#A7B0C0]"
                  key={`${deadline.title}-${deadline.date}`}
                >
                  <span className="text-[#F8FAFC]">{deadline.title}</span>
                  {" / "}
                  {deadline.projectTitle}
                  {" / "}
                  {formatDate(deadline.date)}
                </p>
              ))
            ) : (
              <p className="rounded-md border border-[#1D2A44] bg-[#08111A] px-3 py-2 text-sm text-[#A7B0C0]">
                Aucune deadline proche.
              </p>
            )}
          </div>
        </div>
      </div>
      <div>
        <h3 className="mb-3 font-semibold text-[#F8FAFC]">Objectifs en retard réels</h3>
        <SimpleList empty="Aucun retard réel." items={data.trajectory.lateObjectives} />
      </div>
      <LinkButton href="/interface/trajectoire">Ouvrir Trajectoire</LinkButton>
    </div>
  );
}

function ContentBlock({ data }: { data: DashboardData }) {
  return (
    <div className="grid gap-5">
      <div className="grid gap-3 md:grid-cols-4">
        <MetricCard label="Brouillons" value={data.content.shortsDrafts} />
        <MetricCard label="Textes validés" value={data.content.validatedTexts} />
        <MetricCard label="Visuels prêts" value={data.content.visualsReady} />
        <MetricCard label="Voix prêtes" value={data.content.voicesReady} />
        <MetricCard label="Vidéos prêtes" value={data.content.videosReady} />
        <MetricCard label="Contenus prêts à publier" value={data.content.readyToPublish} />
        <MetricCard label="Pinterest pins prêts" value={data.content.pinterestReadyPins} />
      </div>
      <div className="rounded-md border border-[#1D2A44] bg-[#08111A] p-4">
        <h3 className="font-semibold text-[#F8FAFC]">Atelier de contenu</h3>
        <p className="mt-2 leading-7 text-[#A7B0C0]">
          Les chiffres viennent des brouillons et de la file Pinterest existante.
          Aucun token ni publication n&apos;est modifié depuis cette vue.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <LinkButton href="/interface/post-creation">Ouvrir Atelier de contenu</LinkButton>
        <LinkButton href="/interface/post-creation/shorts/visuals">Voir Visuels Shorts</LinkButton>
        <LinkButton href="/interface/publishers/pinterest">Voir Pinterest Publisher</LinkButton>
      </div>
    </div>
  );
}

function ConnectionsBlock({ data }: { data: DashboardData }) {
  return (
    <div className="grid gap-5">
      <div className="grid gap-3 md:grid-cols-2">
        {data.connections.map((connection) => (
          <div
            className="rounded-md border border-[#1D2A44] bg-[#08111A] p-4"
            key={connection.name}
          >
            <div className="flex items-start justify-between gap-3">
              <h3 className="font-semibold text-[#F8FAFC]">{connection.name}</h3>
              <span
                className={`rounded-md border px-2.5 py-1 text-xs font-semibold ${connectionClasses[connection.state]}`}
              >
                {connection.state}
              </span>
            </div>
            <p className="mt-2 text-sm leading-6 text-[#A7B0C0]">
              {connection.detail}
            </p>
          </div>
        ))}
      </div>
      <LinkButton href="/interface/settings/connections">Gérer les connexions</LinkButton>
    </div>
  );
}

function RecommendationsBlock({ data }: { data: DashboardData }) {
  return (
    <div className="grid gap-5">
      <div>
        <h3 className="mb-3 font-semibold text-[#F8FAFC]">3 priorités du jour</h3>
        <SimpleList empty="Aucune recommandation." items={data.recommendations.actions} />
      </div>
      <div>
        <h3 className="mb-3 font-semibold text-[#F8FAFC]">Blocages éventuels</h3>
        <SimpleList
          empty="Aucun blocage critique."
          items={data.recommendations.blockers}
        />
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <MetricCard label="Action prioritaire" value={data.recommendations.priority} />
        <MetricCard label="Action courte" value={data.recommendations.shortAction} />
        <MetricCard label="Action stratégique" value={data.recommendations.strategicAction} />
      </div>
    </div>
  );
}

function PersonalBlock({ data }: { data: DashboardData }) {
  return (
    <div className="grid gap-5">
      <div className="rounded-md border border-[#1D2A44] bg-[#08111A] p-5">
        <h3 className="text-xl font-semibold text-[#F8FAFC]">
          Vue personnelle en préparation
        </h3>
        <p className="mt-3 leading-7 text-[#A7B0C0]">
          Ce bloc servira de passerelle vers sport, écriture, alternance,
          routine et santé, avec un futur lien vers l&apos;Espace intérieur et la
          Trajectoire personnelle.
        </p>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {data.personal.map((item) => (
          <div
            className="rounded-md border border-[#1D2A44] bg-[#08111A] px-4 py-3 text-[#A7B0C0]"
            key={item}
          >
            {item}
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <LinkButton href="/interface/personnel">Ouvrir Espace intérieur</LinkButton>
        <LinkButton href="/interface/trajectoire">Ouvrir Trajectoire personnelle</LinkButton>
      </div>
    </div>
  );
}

function LinkButton({
  children,
  href,
}: {
  children: string;
  href: string;
}) {
  return (
    <Link
      className="inline-flex w-fit rounded-md border border-[#39E6D0]/50 bg-[#39E6D0]/10 px-4 py-2 text-sm font-semibold text-[#39E6D0] transition hover:bg-[#39E6D0]/20"
      href={href}
    >
      {children}
    </Link>
  );
}
