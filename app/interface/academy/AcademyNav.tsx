"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ACADEMY_BASE_PATH,
  academySectionHref,
  academySections,
} from "@/lib/academy/sections";

// Navigation intérieure d'Academy. Elle vit dans le layout de l'espace, pas
// dans le menu principal : l'entrée `academy` de cockpitNavigation n'a pas
// d'enfants, pour garder le menu latéral court.
export function AcademyNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navigation d'Academy"
      className="mb-6 flex flex-wrap gap-2 rounded-lg border border-[#1D2A44] bg-[#08111A] p-2"
    >
      {academySections.map((section) => {
        const href = academySectionHref(section);
        const active =
          href === ACADEMY_BASE_PATH
            ? pathname === href
            : pathname === href || pathname.startsWith(`${href}/`);

        return (
          <Link
            key={section.id}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`rounded-md px-3 py-2 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${
              active
                ? "bg-[#39E6D0]/10 text-[#39E6D0]"
                : "text-[#A7B0C0] hover:bg-[#0B1420] hover:text-[#F8FAFC]"
            }`}
          >
            {section.label}
          </Link>
        );
      })}
    </nav>
  );
}
