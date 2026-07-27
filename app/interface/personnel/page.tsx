import type { Metadata } from "next";
import { CockpitHeader } from "@/components/cockpit/CockpitHeader";
import { readCalendarEventsForParisRange } from "@/lib/server/calendar/calendar-events-store";
import { todayInParis } from "@/lib/server/personal/daily-brief-engine";
import { readPersonalDailyBrief } from "@/lib/server/personal/daily-briefs-store";
import { getCurrentUser } from "@/src/lib/supabase/server";
import { PersonalDashboardClient } from "./PersonalDashboardClient";

export const metadata: Metadata = {
  title: "Espace intérieur - L'Édifice",
};

const calendarReadFallback = {
  connected: false,
  events: [],
  readError: "Lecture calendrier indisponible.",
};

export default async function PersonnelPage() {
  const user = await getCurrentUser();
  const [dailyBrief, calendarToday, calendarUpcoming] = await Promise.all([
    user
      ? readPersonalDailyBrief({ userId: user.id, date: todayInParis() }).catch(
          () => null,
        )
      : Promise.resolve(null),
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
        dailyBrief={dailyBrief}
        calendarToday={calendarToday}
        calendarUpcoming={calendarUpcoming}
      />
    </div>
  );
}
