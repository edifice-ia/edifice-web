"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { SectionContainer } from "@/components/cockpit/SectionContainer";

type PersonalTab =
  | "summary"
  | "energy"
  | "sleep"
  | "sport"
  | "goals"
  | "tasks"
  | "routines"
  | "journal"
  | "notes"
  | "calendar"
  | "sources";

type PersonalTabDefinition = {
  id: PersonalTab;
  label: string;
};

type PersonalCardDefinition = {
  source: string;
  title: string;
};

const personalTabs: PersonalTabDefinition[] = [
  { id: "summary", label: "R\u00e9sum\u00e9" },
  { id: "energy", label: "\u00c9nergie" },
  { id: "sleep", label: "Sommeil" },
  { id: "sport", label: "Sport" },
  { id: "goals", label: "Objectifs" },
  { id: "tasks", label: "T\u00e2ches" },
  { id: "routines", label: "Routines" },
  { id: "journal", label: "Journal" },
  { id: "notes", label: "Notes" },
  { id: "calendar", label: "Calendrier" },
  { id: "sources", label: "Sources" },
];

const summaryCards: PersonalCardDefinition[] = [
  {
    title: "Vision du jour",
    source: "Ce bloc sera aliment\u00e9 par journal / objectifs selon le cas.",
  },
  {
    title: "\u00c9nergie",
    source: "Ce bloc sera aliment\u00e9 par Garmin / journal selon le cas.",
  },
  {
    title: "Sommeil",
    source: "Ce bloc sera aliment\u00e9 par Garmin / journal selon le cas.",
  },
  {
    title: "Objectifs actifs",
    source: "Ce bloc sera aliment\u00e9 par objectifs selon le cas.",
  },
  {
    title: "T\u00e2ches prioritaires",
    source: "Ce bloc sera aliment\u00e9 par objectifs / calendrier selon le cas.",
  },
  {
    title: "Journal du jour",
    source: "Ce bloc sera aliment\u00e9 par journal selon le cas.",
  },
];

const tabCards: Record<Exclude<PersonalTab, "summary">, PersonalCardDefinition[]> = {
  calendar: [
    {
      title: "Agenda du jour",
      source: "Ce bloc sera aliment\u00e9 par calendrier selon le cas.",
    },
    {
      title: "Rep\u00e8res \u00e0 venir",
      source: "Ce bloc sera aliment\u00e9 par calendrier / objectifs selon le cas.",
    },
  ],
  energy: [
    {
      title: "Niveau ressenti",
      source: "Ce bloc sera aliment\u00e9 par Garmin / journal selon le cas.",
    },
    {
      title: "Signaux \u00e0 surveiller",
      source: "Ce bloc sera aliment\u00e9 par journal / routines selon le cas.",
    },
  ],
  goals: [
    {
      title: "Objectifs actifs",
      source: "Ce bloc sera aliment\u00e9 par objectifs selon le cas.",
    },
    {
      title: "D\u00e9cisions li\u00e9es",
      source: "Ce bloc sera aliment\u00e9 par journal / objectifs selon le cas.",
    },
  ],
  journal: [
    {
      title: "Entr\u00e9e du jour",
      source: "Ce bloc sera aliment\u00e9 par journal selon le cas.",
    },
    {
      title: "D\u00e9cisions du quotidien",
      source: "Ce bloc sera aliment\u00e9 par journal / objectifs selon le cas.",
    },
  ],
  notes: [
    {
      title: "Notes rapides",
      source: "Ce bloc sera aliment\u00e9 par notes selon le cas.",
    },
    {
      title: "Rep\u00e8res personnels",
      source: "Ce bloc sera aliment\u00e9 par notes / journal selon le cas.",
    },
  ],
  routines: [
    {
      title: "Routines du jour",
      source: "Ce bloc sera aliment\u00e9 par routines selon le cas.",
    },
    {
      title: "Routines \u00e0 stabiliser",
      source: "Ce bloc sera aliment\u00e9 par routines / journal selon le cas.",
    },
  ],
  sleep: [
    {
      title: "Sommeil r\u00e9cent",
      source: "Ce bloc sera aliment\u00e9 par Garmin / journal selon le cas.",
    },
    {
      title: "Qualit\u00e9 de r\u00e9cup\u00e9ration",
      source: "Ce bloc sera aliment\u00e9 par Garmin selon le cas.",
    },
  ],
  sources: [
    {
      title: "Connexions pr\u00e9vues",
      source: "Ce bloc sera aliment\u00e9 par Garmin / calendrier / journal / objectifs selon le cas.",
    },
    {
      title: "Statut des sources",
      source: "Ce bloc sera aliment\u00e9 par les sources connect\u00e9es selon le cas.",
    },
  ],
  sport: [
    {
      title: "Activit\u00e9s sportives",
      source: "Ce bloc sera aliment\u00e9 par Garmin selon le cas.",
    },
    {
      title: "R\u00e9cup\u00e9ration",
      source: "Ce bloc sera aliment\u00e9 par Garmin / journal selon le cas.",
    },
  ],
  tasks: [
    {
      title: "T\u00e2ches prioritaires",
      source: "Ce bloc sera aliment\u00e9 par objectifs / calendrier selon le cas.",
    },
    {
      title: "Actions \u00e0 clarifier",
      source: "Ce bloc sera aliment\u00e9 par journal / objectifs selon le cas.",
    },
  ],
};

const tabCopy: Record<PersonalTab, { description: string; title: string }> = {
  calendar: {
    title: "Calendrier",
    description: "Rendez-vous, blocs de temps et rep\u00e8res utiles au quotidien.",
  },
  energy: {
    title: "\u00c9nergie",
    description: "Lecture calme de l'\u00e9nergie disponible et des signaux personnels.",
  },
  goals: {
    title: "Objectifs",
    description: "Objectifs actifs, intentions et points de d\u00e9cision personnels.",
  },
  journal: {
    title: "Journal",
    description: "Espace d'\u00e9criture, de recul et de suivi des d\u00e9cisions du jour.",
  },
  notes: {
    title: "Notes",
    description: "Id\u00e9es rapides, rep\u00e8res personnels et fragments \u00e0 reprendre.",
  },
  routines: {
    title: "Routines",
    description: "Rituels, habitudes et gestes de maintenance personnelle.",
  },
  sleep: {
    title: "Sommeil",
    description: "Suivi de la r\u00e9cup\u00e9ration sans interpr\u00e9tation automatique pour l'instant.",
  },
  sources: {
    title: "Sources",
    description: "Vue de pr\u00e9paration des futures connexions, sans appel API externe.",
  },
  sport: {
    title: "Sport",
    description: "Activit\u00e9s, r\u00e9cup\u00e9ration et signaux physiques quand les sources seront pr\u00eates.",
  },
  summary: {
    title: "R\u00e9sum\u00e9",
    description: "Vue courte pour garder l'essentiel visible sans longue page verticale.",
  },
  tasks: {
    title: "T\u00e2ches",
    description: "Actions prioritaires, \u00e0 clarifier ou \u00e0 relier aux objectifs.",
  },
};

function sourceForActiveTab(tab: PersonalTab) {
  if (tab === "sources") {
    return "Ce bloc sera aliment\u00e9 par Garmin / calendrier / journal / objectifs selon le cas.";
  }

  if (tab === "calendar") {
    return "Ce bloc sera aliment\u00e9 par calendrier selon le cas.";
  }

  if (tab === "goals" || tab === "tasks") {
    return "Ce bloc sera aliment\u00e9 par objectifs selon le cas.";
  }

  if (tab === "journal" || tab === "notes" || tab === "routines") {
    return "Ce bloc sera aliment\u00e9 par journal / objectifs selon le cas.";
  }

  return "Ce bloc sera aliment\u00e9 par Garmin / journal selon le cas.";
}

export function PersonalEmptyState({ source }: { source: string }) {
  return (
    <div className="rounded-md border border-dashed border-[#1D2A44] bg-[#03070B] p-4">
      <p className="text-sm font-semibold text-[#F8FAFC]">
        Aucune donn&eacute;e connect&eacute;e pour le moment.
      </p>
      <p className="mt-2 text-sm leading-6 text-[#A7B0C0]">{source}</p>
    </div>
  );
}

export function PersonalModuleCard({
  children,
  title,
}: {
  children: ReactNode;
  title: string;
}) {
  return (
    <article className="min-w-0 rounded-md border border-[#1D2A44] bg-[#08111A] p-4">
      <h3 className="text-base font-semibold text-[#F8FAFC]">{title}</h3>
      <div className="mt-4">{children}</div>
    </article>
  );
}

export function PersonalSection({
  children,
  description,
  title,
}: {
  children: ReactNode;
  description: string;
  title: string;
}) {
  return (
    <SectionContainer>
      <div className="mb-5 min-w-0">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#39E6D0]">
          Espace int&eacute;rieur
        </p>
        <h2 className="mt-2 text-2xl font-semibold text-[#F8FAFC]">{title}</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-[#A7B0C0]">
          {description}
        </p>
      </div>
      {children}
    </SectionContainer>
  );
}

export function PersonalSummaryGrid() {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {summaryCards.map((card) => (
        <PersonalModuleCard key={card.title} title={card.title}>
          <PersonalEmptyState source={card.source} />
        </PersonalModuleCard>
      ))}
    </div>
  );
}

export function PersonalTabs({
  activeTab,
  onSelect,
}: {
  activeTab: PersonalTab;
  onSelect: (tab: PersonalTab) => void;
}) {
  return (
    <div className="sticky top-0 z-20 mb-6 -mx-2 overflow-x-auto border-b border-[#1D2A44] bg-[#02060A]/95 px-2 py-3 backdrop-blur">
      <div className="flex min-w-max gap-2">
        {personalTabs.map((tab) => (
          <button
            className={`shrink-0 rounded-md border px-4 py-2 text-sm font-semibold transition ${
              activeTab === tab.id
                ? "border-[#39E6D0]/60 bg-[#39E6D0]/15 text-[#39E6D0]"
                : "border-[#1D2A44] bg-[#08111A] text-[#A7B0C0] hover:border-[#39E6D0]/40 hover:text-[#F8FAFC]"
            }`}
            key={tab.id}
            onClick={() => onSelect(tab.id)}
            type="button"
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function PersonalDashboardClient() {
  const [activeTab, setActiveTab] = useState<PersonalTab>(() => {
    if (typeof window === "undefined") {
      return "summary";
    }

    const saved = window.sessionStorage.getItem("personal-active-tab");
    return saved && personalTabs.some((tab) => tab.id === saved)
      ? (saved as PersonalTab)
      : "summary";
  });

  function selectTab(tab: PersonalTab) {
    window.sessionStorage.setItem("personal-active-tab", tab);
    setActiveTab(tab);
  }

  const activeCopy = tabCopy[activeTab];

  return (
    <div>
      <PersonalTabs activeTab={activeTab} onSelect={selectTab} />

      {activeTab === "summary" ? (
        <PersonalSection description={activeCopy.description} title={activeCopy.title}>
          <PersonalSummaryGrid />
        </PersonalSection>
      ) : (
        <PersonalSection description={activeCopy.description} title={activeCopy.title}>
          <div className="grid gap-4 lg:grid-cols-2">
            {tabCards[activeTab].map((card) => (
              <PersonalModuleCard key={card.title} title={card.title}>
                <PersonalEmptyState source={card.source} />
              </PersonalModuleCard>
            ))}
          </div>
          <div className="mt-4">
            <PersonalEmptyState source={sourceForActiveTab(activeTab)} />
          </div>
        </PersonalSection>
      )}
    </div>
  );
}
