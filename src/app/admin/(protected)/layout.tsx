import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { isAdminRole } from "@/lib/auth/admin-access";

export default async function ProtectedAdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.id || !isAdminRole(session.user.role)) redirect("/admin/login");
  return children;
}
