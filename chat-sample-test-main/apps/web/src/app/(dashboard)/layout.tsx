import { redirect } from "next/navigation";

import { getMe } from "@/lib/api";
import { Sidebar } from "./sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let me;
  try {
    me = await getMe();
  } catch {
    // missing/expired session -> back to login (server-side gate)
    redirect("/login");
  }

  const canSeeRoles = me.role.permissions.includes("roles:get_all");

  return (
    <div className="flex flex-1">
      <Sidebar
        userName={me.name}
        userEmail={me.email}
        roleName={me.role.name}
        canSeeRoles={canSeeRoles}
      />
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
