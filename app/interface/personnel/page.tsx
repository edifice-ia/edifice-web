import type { Metadata } from "next";
import { CockpitHeader } from "@/components/cockpit/CockpitHeader";
import { readCalendarEventsForParisRange } from "@/lib/server/calendar/calendar-events-store";
import type { CockpitCalendarTodayState } from "@/types/cockpit";
import { PersonalDashboardClient } from "./PersonalDashboardClient";

export const metadata: Metadata = {
  title: "Espace intérieur - L'Édifice",
};

const calendarReadFallback: CockpitCalendarTodayState = {
  connected: false,
  events: [],
  readError: "Lecture calendrier indisponible.",
};

export default async function PersonnelPage() {
  const [calendarToday, calendarUpcoming] = await Promise.all([
    // Meme fonction de lecture que le Cockpit (calendar-events-store), plage
    // "aujourd'hui" pour Agenda du jour...
    readCalendarEventsForParisRange().catch(() => calendarReadFallback),
    // ...et les 7 prochains jours (a partir de demain) pour Reperes a venir.
    readCalendarEventsForParisRange({ startDayOffset: 1, days: 7 }).catch(
      () => calendarReadFallback,
    ),
  ]);

  return (
    <div>
      <CockpitHeader
        eyebrow="Personnel"
        title="Espace intérieur"
        description="OS personnel pour suivre énergie, objectifs, routines, notes et décisions du quotidien."
        status="Experimental"
      />
      <PersonalDashboardClient
        calendarToday={calendarToday}
        calendarUpcoming={calendarUpcoming}
      />
    </div>
  );
}
