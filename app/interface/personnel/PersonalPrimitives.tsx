"use client";

import type { ReactNode } from "react";

// Primitives visuelles partagees du pole Personnel.
//
// Extraites de PersonalDashboardClient.tsx le 2026-08-04, quand le premier
// module a saisie manuelle (Notes) a eu besoin de vivre dans son propre
// fichier : un panneau de module qui importe ses primitives depuis
// PersonalDashboardClient, lequel importe le panneau, forme un cycle. Les
// modules suivants du pole — Journal, Habitudes, Nutrition, Taches — auront
// exactement le meme besoin.
//
// Ces primitives restent locales au pole et ne sont deliberement pas
// harmonisees avec components/cockpit : voir la note de PersonalCalendarCard
// et la section Personnel de 06_Modules.md. Le pole assume son propre langage
// visuel.

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
