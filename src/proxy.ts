import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/auth";
import { isAdminRole } from "@/lib/auth/admin-access";

export async function proxy(request: NextRequest) {
  const session = await auth();
  const isAuthenticated = Boolean(session?.user?.id && isAdminRole(session.user.role));
  const isAdminRoute = request.nextUrl.pathname.startsWith("/admin");
  const isLoginPage = request.nextUrl.pathname === "/admin/login";

  if (isAdminRoute && !isLoginPage && !isAuthenticated) {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  if (isLoginPage && isAuthenticated) {
    return NextResponse.redirect(new URL("/admin", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
