import { CockpitSidebar } from "./CockpitSidebar";
import { CockpitTopbar } from "./CockpitTopbar";

type CockpitShellProps = {
  children: React.ReactNode;
  userEmail?: string | null;
  isOwner: boolean;
};

export function CockpitShell({
  children,
  userEmail,
  isOwner,
}: CockpitShellProps) {
  return (
    <div className="bg-[#03070B]">
      <div className="mx-auto flex max-w-[1500px] flex-col gap-6 px-4 py-6 sm:px-6 lg:flex-row lg:px-8">
        <CockpitSidebar />
        <div className="min-w-0 flex-1">
          <CockpitTopbar userEmail={userEmail} isOwner={isOwner} />
          <div className="min-h-[70vh]">{children}</div>
        </div>
      </div>
    </div>
  );
}
