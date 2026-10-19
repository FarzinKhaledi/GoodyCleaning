import { redirect } from "next/navigation";
import { auth, signOut } from "@/auth";
import { isAdminRole } from "@/lib/auth/admin-access";
import { AdminShell } from "@/components/admin/AdminShell";

export default async function ProtectedAdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.id || !isAdminRole(session.user.role)) redirect("/admin/login");
  return <AdminShell email={session.user.email ?? "Admin"} superAdmin={session.user.role === "SUPER_ADMIN"} signOutAction={async () => {
    "use server";
    await signOut({ redirectTo: "/admin/login" });
  }}>{children}</AdminShell>;
}
