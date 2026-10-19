import { DefaultSession } from "next-auth";
import type { AdminRole } from "@/lib/auth/admin-access";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: AdminRole;
    } & DefaultSession["user"];
  }

  interface User {
    role?: AdminRole;
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    id?: string;
    role?: AdminRole;
    provider?: "google" | "credentials";
    googleSubject?: string;
  }
}
