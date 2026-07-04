import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { requireDb } from "@/lib/db";
import { admins } from "@/lib/db/schema";
import { loginSchema } from "@/lib/validations";

export const { handlers, signIn, signOut, auth } = NextAuth({
  secret:
    process.env.AUTH_SECRET ??
    (process.env.NODE_ENV === "development"
      ? "dev-only-auth-secret-do-not-use-in-production"
      : undefined),
  providers: [
    Credentials({
      credentials: {
        email: {},
        password: {},
      },
      authorize: async (credentials) => {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        try {
          const db = requireDb();
          const [admin] = await db
            .select()
            .from(admins)
            .where(eq(admins.email, parsed.data.email))
            .limit(1);

          if (!admin) return null;

          const valid = await bcrypt.compare(
            parsed.data.password,
            admin.passwordHash
          );

          if (!valid) return null;

          return {
            id: admin.id,
            email: admin.email,
          };
        } catch {
          console.error(
            "[auth] Database not configured — set DATABASE_URL and run npm run db:seed"
          );
          return null;
        }
      },
    }),
  ],
  pages: {
    signIn: "/admin/login",
  },
  session: {
    strategy: "jwt",
  },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
});
