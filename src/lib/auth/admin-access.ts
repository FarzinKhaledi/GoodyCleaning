import { loginSchema } from "../validations";

export type AdminRole = "ADMIN" | "SUPER_ADMIN";

export interface AdminAccessRecord {
  id: string;
  email: string;
  passwordHash: string | null;
  role: string;
  googleSubject: string | null;
  isActive: boolean;
}

export interface AdminIdentity {
  id: string;
  email: string;
  role: AdminRole;
  googleSubject: string | null;
}

export interface AdminAccessDependencies {
  findByEmail(email: string): Promise<AdminAccessRecord | null>;
  findById(id: string): Promise<AdminAccessRecord | null>;
  /** Bind only an unbound record atomically, returning its current state if another login won. */
  bindGoogleSubject(id: string, subject: string): Promise<AdminAccessRecord | null>;
  comparePassword(password: string, hash: string): Promise<boolean>;
}

export interface AdminSessionClaims {
  id?: unknown;
  provider?: unknown;
  googleSubject?: unknown;
}

export function isAdminRole(role: unknown): role is AdminRole {
  return role === "ADMIN" || role === "SUPER_ADMIN";
}

function identity(admin: AdminAccessRecord | null): AdminIdentity | null {
  if (!admin?.isActive || !isAdminRole(admin.role)) return null;
  return { id: admin.id, email: admin.email, role: admin.role, googleSubject: admin.googleSubject };
}

function isSubject(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= 255 && !/\s/.test(value);
}

function object(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" ? value as Record<string, unknown> : null;
}

export function createAdminAccess(dependencies: AdminAccessDependencies) {
  return {
    async authorizeCredentials(credentials: unknown): Promise<AdminIdentity | null> {
      const parsed = loginSchema.safeParse(credentials);
      if (!parsed.success || Buffer.byteLength(parsed.data.password, "utf8") > 72) return null;
      try {
        const admin = await dependencies.findByEmail(parsed.data.email.toLowerCase());
        const approved = identity(admin);
        if (!approved || !admin?.passwordHash) return null;
        if (!await dependencies.comparePassword(parsed.data.password, admin.passwordHash)) return null;
        return approved;
      } catch {
        return null;
      }
    },

    async authorizeGoogle(account: unknown, profile: unknown): Promise<AdminIdentity | null> {
      const provider = object(account);
      const claims = object(profile);
      if (provider?.provider !== "google" || provider.type !== "oidc" || claims?.email_verified !== true
        || !isSubject(claims.sub) || provider.providerAccountId !== claims.sub
        || typeof claims.email !== "string") return null;
      const email = claims.email.trim().toLowerCase();
      if (!loginSchema.shape.email.safeParse(email).success) return null;
      try {
        let admin = await dependencies.findByEmail(email);
        if (!identity(admin) || !admin) return null;
        // Only an existing, approved admin can link their verified Google identity.
        if (admin.googleSubject === null) {
          admin = await dependencies.bindGoogleSubject(admin.id, claims.sub);
        }
        const approved = identity(admin);
        if (!approved || approved.email.trim().toLowerCase() !== email || approved.googleSubject !== claims.sub) return null;
        return approved;
      } catch {
        return null;
      }
    },

    async resolveSession(claims: AdminSessionClaims): Promise<AdminIdentity | null> {
      if (typeof claims.id !== "string" || !claims.id) return null;
      if (claims.provider !== undefined && claims.provider !== "credentials" && claims.provider !== "google") return null;
      if (claims.provider === "google" && !isSubject(claims.googleSubject)) return null;
      try {
        const approved = identity(await dependencies.findById(claims.id));
        if (!approved || (claims.provider === "google" && approved.googleSubject !== claims.googleSubject)) return null;
        return approved;
      } catch {
        return null;
      }
    },
  };
}
