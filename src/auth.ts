import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { and, eq, isNull, sql } from "drizzle-orm";
import { requireDb } from "@/lib/db";
import { admins } from "@/lib/db/schema";
import { createAdminAccess, isAdminRole } from "@/lib/auth/admin-access";
import { isGoogleSignInConfigured } from "@/lib/auth/config";

const adminAccess = createAdminAccess({
  async findByEmail(email) {
    const [admin] = await requireDb().select().from(admins)
      .where(sql`lower(${admins.email}) = ${email}`).limit(1);
    return admin ?? null;
  },
  async findById(id) {
    const [admin] = await requireDb().select().from(admins).where(eq(admins.id, id)).limit(1);
    return admin ?? null;
  },
  async bindGoogleSubject(id, subject) {
    const db = requireDb();
    const [bound] = await db.update(admins).set({ googleSubject: subject })
      .where(and(eq(admins.id, id), isNull(admins.googleSubject), eq(admins.isActive, true))).returning();
    if (bound) return bound;
    // A simultaneous login may have linked this record. Validate the winner's subject, never overwrite it.
    const [current] = await db.select().from(admins).where(eq(admins.id, id)).limit(1);
    return current ?? null;
  },
  comparePassword: bcrypt.compare,
});

export const { handlers, signIn, signOut, auth } = NextAuth({
  secret:
    process.env.AUTH_SECRET ??
    (process.env.NODE_ENV === "development"
      ? "dev-only-auth-secret-do-not-use-in-production"
      : undefined),
  providers: [
    ...(isGoogleSignInConfigured() ? [Google({
      clientId: process.env.AUTH_GOOGLE_ID?.trim(),
      clientSecret: process.env.AUTH_GOOGLE_SECRET?.trim(),
      authorization: { params: { scope: "openid email profile", prompt: "select_account" } },
      checks: ["pkce", "state", "nonce"],
    })] : []),
    Credentials({
      credentials: {
        email: {},
        password: {},
      },
      authorize: async (credentials) => {
        const admin = await adminAccess.authorizeCredentials(credentials);
        return admin ? { id: admin.id, email: admin.email, role: admin.role } : null;
      },
    }),
  ],
  pages: {
    signIn: "/admin/login",
    error: "/admin/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60,
  },
  callbacks: {
    async signIn({ account, profile, user }) {
      if (account?.provider === "google") return Boolean(await adminAccess.authorizeGoogle(account, profile));
      if (account?.provider === "credentials") {
        return Boolean(await adminAccess.resolveSession({ id: user.id, provider: "credentials" }));
      }
      return false;
    },
    async jwt({ token, user, account, profile }) {
      const admin = account
        ? account.provider === "google"
          ? await adminAccess.authorizeGoogle(account, profile)
          : account.provider === "credentials"
            ? await adminAccess.resolveSession({ id: user.id, provider: "credentials" })
            : null
        : await adminAccess.resolveSession(token);
      // JWT possession alone never grants access after an account has been disabled or removed.
      if (!admin) return null;
      token.id = admin.id;
      token.sub = admin.id;
      token.email = admin.email;
      token.role = admin.role;
      if (account) token.provider = account.provider === "google" ? "google" : "credentials";
      if (token.provider === "google") token.googleSubject = admin.googleSubject ?? undefined;
      else delete token.googleSubject;
      return token;
    },
    session({ session, token }) {
      if (!session.user || typeof token.id !== "string" || typeof token.email !== "string" || !isAdminRole(token.role)) throw new Error("Invalid admin session");
      session.user.id = token.id;
      session.user.email = token.email;
      session.user.role = token.role;
      return session;
    },
  },
});
