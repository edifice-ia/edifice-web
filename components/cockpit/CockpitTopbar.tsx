import Link from "next/link";
import { logout } from "@/app/login/actions";

type CockpitTopbarProps = {
  userEmail?: string | null;
  isOwner: boolean;
};

export function CockpitTopbar({ userEmail, isOwner }: CockpitTopbarProps) {
  return (
    <div className="mb-6 flex flex-col gap-3 rounded-lg border border-[#1D2A44] bg-[#08111A] p-4 md:flex-row md:items-center md:justify-between">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#39E6D0]">
          L&apos;Edifice Web Cockpit
        </p>
        <p className="mt-1 text-sm text-[#A7B0C0]">
          Session : <span className="text-[#F8FAFC]">{userEmail}</span>
          {isOwner ? " · proprietaire" : " · reviewer / utilisateur"}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Link
          href="/dashboard"
          className="rounded-md border border-[#1D2A44] px-4 py-2 text-sm font-semibold text-[#7DD3FC] transition hover:bg-[#0B1420] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          Dashboard
        </Link>
        <form action={logout}>
          <button
            type="submit"
            className="rounded-md bg-[#0B1420] px-4 py-2 text-sm font-semibold text-[#F8FAFC] transition hover:bg-[#1D2A44] hover:text-[#39E6D0] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            Deconnexion
          </button>
        </form>
      </div>
    </div>
  );
}
