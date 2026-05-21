"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { StatusBadge } from "./StatusBadge";
import { cockpitNavigation } from "@/lib/cockpit/navigation";

export function CockpitSidebar() {
  const pathname = usePathname();

  return (
    <aside className="lg:sticky lg:top-24 lg:h-[calc(100vh-7rem)] lg:w-72 lg:shrink-0">
      <div className="h-full overflow-y-auto rounded-lg border border-[#1D2A44] bg-[#08111A] p-3">
        <p className="px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#A7B0C0]">
          Cockpit
        </p>
        <nav className="mt-2 grid gap-1">
          {cockpitNavigation.map((item) => {
            const active =
              item.href === "/interface"
                ? pathname === item.href
                : pathname === item.href ||
                  pathname.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.id}
                href={item.href}
                className={`rounded-md border px-3 py-3 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${
                  active
                    ? "border-[#39E6D0]/50 bg-[#39E6D0]/10 text-[#F8FAFC]"
                    : "border-transparent text-[#A7B0C0] hover:border-[#1D2A44] hover:bg-[#0B1420] hover:text-[#F8FAFC]"
                }`}
              >
                <span className="flex items-center justify-between gap-3">
                  <span className="font-semibold">{item.label}</span>
                  <StatusBadge status={item.status} />
                </span>
                <span className="mt-1 block text-sm text-[#A7B0C0]">
                  {item.description}
                </span>
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
