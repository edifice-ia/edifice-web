import { redirect } from "next/navigation";
import { CockpitShell } from "@/components/cockpit/CockpitShell";
import { getCurrentUser } from "@/src/lib/supabase/server";

export default async function InterfaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <CockpitShell
      userEmail={user.email}
      isOwner={user.email === "contact.edificeia@gmail.com"}
    >
      {children}
    </CockpitShell>
  );
}
