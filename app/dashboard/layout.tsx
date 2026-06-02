import { CockpitShell } from "@/components/cockpit/CockpitShell";
import { isAdminUser } from "@/src/lib/auth/roles";
import { requirePrivateCockpitAccess } from "@/src/lib/auth/guards";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requirePrivateCockpitAccess();

  return (
    <CockpitShell userEmail={user.email} isOwner={isAdminUser(user)}>
      {children}
    </CockpitShell>
  );
}
