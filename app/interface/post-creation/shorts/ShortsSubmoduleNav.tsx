import Link from "next/link";

const shortsSubmodules = [
  {
    href: "/interface/post-creation/shorts/drafts",
    label: "Brouillons",
    description: "Texte et validation",
  },
  {
    href: "/interface/post-creation/shorts/visuals",
    label: "Visuels",
    description: "Images par brouillon",
  },
  {
    href: "/interface/post-creation/shorts/voice",
    label: "Voix",
    description: "Audio en preparation",
  },
  {
    href: "/interface/post-creation/shorts/video",
    label: "Preparer la video",
    description: "Manifest de montage",
  },
  {
    href: "/interface/post-creation/shorts/programming",
    label: "Programmation",
    description: "Calendrier manuel",
  },
];

export function ShortsSubmoduleNav({ active }: { active: "drafts" | "visuals" | "voice" | "video" | "programming" }) {
  const activeHref = `/interface/post-creation/shorts/${active}`;

  return (
    <nav className="mb-6 grid gap-3 md:grid-cols-5" aria-label="Navigation Shorts">
      {shortsSubmodules.map((item) => {
        const isActive = item.href === activeHref;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`rounded-md border px-4 py-3 transition ${
              isActive
                ? "border-[#39E6D0]/60 bg-[#39E6D0]/10 text-[#F8FAFC]"
                : "border-[#1D2A44] bg-[#08111A] text-[#A7B0C0] hover:border-[#39E6D0]/35 hover:text-[#F8FAFC]"
            }`}
          >
            <span className="block text-sm font-semibold">{item.label}</span>
            <span className="mt-1 block text-xs text-[#64748B]">{item.description}</span>
          </Link>
        );
      })}
    </nav>
  );
}
