"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import Link from "next/link";
import { SectionContainer } from "@/components/cockpit/SectionContainer";
import {
  getPersonalConnectors,
  type PersonalConnector,
  type PersonalConnectorCapability,
} from "@/lib/personal/connectors";
import type { CockpitCalendarTodayState } from "@/types/cockpit";

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
  { id: "summary", label: "Résumé" },
  { id: "energy", label: "Énergie" },
  { id: "sleep", label: "Sommeil" },
  { id: "sport", label: "Sport" },
  { id: "goals", label: "Objectifs" },
  { id: "tasks", label: "Tâches" },
  { id: "routines", label: "Routines" },
  { id: "journal", label: "Journal" },
  { id: "notes", label: "Notes" },
  { id: "calendar", label: "Calendrier" },
  { id: "sources", label: "Sources" },
];

const summaryCards: PersonalCardDefinition[] = [
  {
    title: "Vision du jour",
    source: "Ce bloc sera alimenté par journal / objectifs selon le cas.",
  },
  {
    title: "Énergie",
    source: "Ce bloc sera alimenté par Garmin / journal selon le cas.",
  },
  {
    title: "Sommeil",
    source: "Ce bloc sera alimenté par Garmin / journal selon le cas.",
  },
  {
    title: "Objectifs actifs",
    source: "Ce bloc sera alimenté par objectifs selon le cas.",
  },
  {
    title: "Tâches prioritaires",
    source: "Ce bloc sera alimenté par objectifs / calendrier selon le cas.",
  },
  {
    title: "Journal du jour",
    source: "Ce bloc sera alimenté par journal selon le cas.",
  },
];

const tabCards: Record<Exclude<PersonalTab, "summary" | "sources">, PersonalCardDefinition[]> = {
  calendar: [
    {
      title: "Agenda du jour",
      source: "Ce bloc sera alimenté par calendrier selon le cas.",
    },
    {
      title: "Repères à venir",
      source: "Ce bloc sera alimenté par calendrier / objectifs selon le cas.",
    },
  ],
  energy: [
    {
      title: "Niveau ressenti",
      source: "Ce bloc sera alimenté par Garmin / journal selon le cas.",
    },
    {
      title: "Signaux à surveiller",
      source: "Ce bloc sera alimenté par journal / routines selon le cas.",
    },
  ],
  goals: [
    {
      title: "Objectifs actifs",
      source: "Ce bloc sera alimenté par objectifs selon le cas.",
    },
    {
      title: "Décisions liées",
      source: "Ce bloc sera alimenté par journal / objectifs selon le cas.",
    },
  ],
  journal: [
    {
      title: "Entrée du jour",
      source: "Ce bloc sera alimenté par journal selon le cas.",
    },
    {
      title: "Décisions du quotidien",
      source: "Ce bloc sera alimenté par journal / objectifs selon le cas.",
    },
  ],
  notes: [
    {
      title: "Notes rapides",
      source: "Ce bloc sera alimenté par notes selon le cas.",
    },
    {
      title: "Repères personnels",
      source: "Ce bloc sera alimenté par notes / journal selon le cas.",
    },
  ],
  routines: [
    {
      title: "Routines du jour",
      source: "Ce bloc sera alimenté par routines selon le cas.",
    },
    {
      title: "Routines à stabiliser",
      source: "Ce bloc sera alimenté par routines / journal selon le cas.",
    },
  ],
  sleep: [
    {
      title: "Sommeil récent",
      source: "Ce bloc sera alimenté par Garmin / journal selon le cas.",
    },
    {
      title: "Qualité de récupération",
      source: "Ce bloc sera alimenté par Garmin selon le cas.",
    },
  ],
  sport: [
    {
      title: "Activités sportives",
      source: "Ce bloc sera alimenté par Garmin selon le cas.",
    },
    {
      title: "Récupération",
      source: "Ce bloc sera alimenté par Garmin / journal selon le cas.",
    },
  ],
  tasks: [
    {
      title: "Tâches prioritaires",
      source: "Ce bloc sera alimenté par objectifs / calendrier selon le cas.",
    },
    {
      title: "Actions à clarifier",
      source: "Ce bloc sera alimenté par journal / objectifs selon le cas.",
    },
  ],
};

const tabCopy: Record<PersonalTab, { description: string; title: string }> = {
  calendar: {
    title: "Calendrier",
    description: "Rendez-vous, blocs de temps et repères utiles au quotidien.",
  },
  energy: {
    title: "Énergie",
    description: "Lecture calme de l'énergie disponible et des signaux personnels.",
  },
  goals: {
    title: "Objectifs",
    description: "Objectifs actifs, intentions et points de décision personnels.",
  },
  journal: {
    title: "Journal",
    description: "Espace d'écriture, de recul et de suivi des décisions du jour.",
  },
  notes: {
    title: "Notes",
    description: "Idées rapides, repères personnels et fragments à reprendre.",
  },
  routines: {
    title: "Routines",
    description: "Rituels, habitudes et gestes de maintenance personnelle.",
  },
  sleep: {
    title: "Sommeil",
    description: "Suivi de la récupération sans interprétation automatique pour l'instant.",
  },
  sources: {
    title: "Sources",
    description: "Vue de préparation des futures connexions, sans appel API externe.",
  },
  sport: {
    title: "Sport",
    description: "Activités, récupération et signaux physiques quand les sources seront prêtes.",
  },
  summary: {
    title: "Résumé",
    description: "Vue courte pour garder l'essentiel visible sans longue page verticale.",
  },
  tasks: {
    title: "Tâches",
    description: "Actions prioritaires, à clarifier ou à relier aux objectifs.",
  },
};

const capabilityLabels: Record<PersonalConnectorCapability, string> = {
  activities: "Activités",
  body_battery: "Body Battery",
  calendar_events: "Événements calendrier",
  heart_rate: "Fréquence cardiaque",
  notes: "Notes",
  recovery: "Récupération",
  sleep: "Sommeil",
  stress: "Stress",
  tasks: "Tâches",
  transactions: "Transactions",
  vo2max: "VO2 max",
};

function sourceForActiveTab(tab: PersonalTab) {
  if (tab === "calendar") {
    return "Ce bloc sera alimenté par calendrier selon le cas.";
  }

  if (tab === "goals" || tab === "tasks") {
    return "Ce bloc sera alimenté par objectifs selon le cas.";
  }

  if (tab === "journal" || tab === "notes" || tab === "routines") {
    return "Ce bloc sera alimenté par journal / objectifs selon le cas.";
  }

  return "Ce bloc sera alimenté par Garmin / journal selon le cas.";
}

function connectorStatusClass(connector: PersonalConnector) {
  if (connector.status === "Préparé") {
    return "border-[#39E6D0]/40 bg-[#39E6D0]/10 text-[#39E6D0]";
  }

  if (connector.status === "À connecter") {
    return "border-[#f59e0b]/40 bg-[#f59e0b]/10 text-[#fbbf24]";
  }

  return "border-[#64748b]/40 bg-[#64748b]/10 text-[#cbd5e1]";
}

export function PersonalEmptyState({ source }: { source: string }) {
  return (
    <div className="rounded-md border border-dashed border-[#1D2A44] bg-[#03070B] p-4">
      <p className="text-sm font-semibold text-[#F8FAFC]">
        Aucune donnée connectée pour le moment.
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
          Personnel
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

function formatEventTime(value: string | null) {
  if (!value) {
    return "";
  }

  return new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatEventDay(value: string | null) {
  if (!value) {
    return "";
  }

  return new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris",
    weekday: "short",
    day: "2-digit",
    month: "short",
  }).format(new Date(value));
}

// Memes trois etats honnetes que CalendarTodayCard cote Cockpit
// (non connecte / erreur / vide), adaptes au style local du module Personnel
// (PersonalModuleCard, PersonalEmptyState) : cf. 06_Modules.md, ce module ne
// doit pas etre harmonise avec les conventions components/cockpit.
export function PersonalCalendarCard({
  calendar,
  emptyLabel,
  showDay = false,
  title,
}: {
  calendar: CockpitCalendarTodayState;
  emptyLabel: string;
  showDay?: boolean;
  title: string;
}) {
  if (!calendar.connected) {
    return (
      <PersonalModuleCard title={title}>
        <div className="rounded-md border border-dashed border-[#1D2A44] bg-[#03070B] p-4">
          <p className="text-sm font-semibold text-[#F8FAFC]">
            Aucune donnée connectée pour le moment.
          </p>
          <p className="mt-2 text-sm leading-6 text-[#A7B0C0]">
            Connecte Google Calendar pour voir tes événements ici.
          </p>
          <Link
            className="mt-3 inline-flex text-sm font-semibold text-[#39E6D0] hover:underline"
            href="/interface/settings/connections"
          >
            Connecter Google Calendar
          </Link>
        </div>
      </PersonalModuleCard>
    );
  }

  if (calendar.readError) {
    return (
      <PersonalModuleCard title={title}>
        <div className="rounded-md border border-[#f87171]/40 bg-[#f87171]/10 p-4">
          <p className="text-sm text-[#fecaca]">{calendar.readError}</p>
        </div>
      </PersonalModuleCard>
    );
  }

  if (calendar.events.length === 0) {
    return (
      <PersonalModuleCard title={title}>
        <PersonalEmptyState source={emptyLabel} />
      </PersonalModuleCard>
    );
  }

  return (
    <PersonalModuleCard title={title}>
      <div className="grid gap-2">
        {calendar.events.map((event) => (
          <div
            className="rounded-md border border-[#1D2A44] bg-[#03070B] px-3 py-2"
            key={event.id}
          >
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm font-semibold text-[#F8FAFC]">{event.title}</p>
              <span className="shrink-0 text-xs font-semibold text-[#39E6D0]">
                {event.isAllDay
                  ? showDay
                    ? `${formatEventDay(event.startsAt)} · Journée entière`
                    : "Journée entière"
                  : showDay
                    ? `${formatEventDay(event.startsAt)} · ${formatEventTime(event.startsAt)}`
                    : formatEventTime(event.startsAt)}
              </span>
            </div>
            {event.location ? (
              <p className="mt-1 text-xs text-[#A7B0C0]">{event.location}</p>
            ) : null}
          </div>
        ))}
      </div>
    </PersonalModuleCard>
  );
}

export function PersonalSourcesGrid() {
  const connectors = getPersonalConnectors();

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {connectors.map((connector) => (
        <PersonalModuleCard key={connector.id} title={connector.label}>
          <div className="grid gap-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <p className="text-sm leading-6 text-[#A7B0C0]">
                {connector.description}
              </p>
              <span
                className={`shrink-0 rounded-md border px-2.5 py-1 text-xs font-semibold ${connectorStatusClass(
                  connector,
                )}`}
              >
                {connector.status}
              </span>
            </div>

            <div className="rounded-md border border-[#1D2A44] bg-[#03070B] p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#A7B0C0]">
                Données prévues
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {connector.capabilities.map((capability) => (
                  <span
                    className="rounded-md border border-[#1D2A44] bg-[#08111A] px-2 py-1 text-xs font-semibold text-[#F8FAFC]"
                    key={capability}
                  >
                    {capabilityLabels[capability]}
                  </span>
                ))}
              </div>
            </div>

            <div className="rounded-md border border-[#1D2A44] bg-[#03070B] p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#A7B0C0]">
                {"Variables d'environnement requises"}
              </p>
              {connector.requiredEnvVars.length ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {connector.requiredEnvVars.map((envVar) => (
                    <code
                      className="rounded-md border border-[#1D2A44] bg-[#08111A] px-2 py-1 text-xs text-[#F8FAFC]"
                      key={envVar}
                    >
                      {envVar}
                    </code>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-sm text-[#A7B0C0]">
                  Aucune variable requise pour le moment.
                </p>
              )}
            </div>

            <button
              className="w-fit rounded-md border border-[#1D2A44] bg-[#03070B] px-3 py-2 text-sm font-semibold text-[#64748b]"
              disabled
              type="button"
            >
              Connexion bientôt disponible
            </button>
          </div>
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

export function PersonalDashboardClient({
  calendarToday,
  calendarUpcoming,
}: {
  calendarToday: CockpitCalendarTodayState;
  calendarUpcoming: CockpitCalendarTodayState;
}) {
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
      ) : null}

      {activeTab === "sources" ? (
        <PersonalSection description={activeCopy.description} title={activeCopy.title}>
          <PersonalSourcesGrid />
        </PersonalSection>
      ) : null}

      {activeTab === "calendar" ? (
        <PersonalSection description={activeCopy.description} title={activeCopy.title}>
          <div className="grid gap-4 lg:grid-cols-2">
            <PersonalCalendarCard
              calendar={calendarToday}
              emptyLabel="Aucun événement aujourd'hui."
              title={tabCards.calendar[0].title}
            />
            <PersonalCalendarCard
              calendar={calendarUpcoming}
              emptyLabel="Aucun événement dans les 7 prochains jours."
              showDay
              title={tabCards.calendar[1].title}
            />
          </div>
        </PersonalSection>
      ) : null}

      {activeTab !== "summary" && activeTab !== "sources" && activeTab !== "calendar" ? (
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
      ) : null}
    </div>
  );
}
