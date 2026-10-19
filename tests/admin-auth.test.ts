import assert from "node:assert/strict";
import { afterEach, beforeEach, mock, test } from "node:test";
import { createAdminAccess, isAdminRole, type AdminAccessDependencies, type AdminAccessRecord } from "../src/lib/auth/admin-access";
import { isGoogleSignInConfigured } from "../src/lib/auth/config";

const adminId = "12345678-1234-1234-1234-123456789012";
const subject = "123456789012345678901";
const account = { provider: "google", type: "oidc", providerAccountId: subject };
const profile = { sub: subject, email: "farzin2tech@gmail.com", email_verified: true };
const approvedAdmin: AdminAccessRecord = {
  id: adminId, email: "farzin2tech@gmail.com", role: "SUPER_ADMIN",
  passwordHash: null, googleSubject: null, isActive: true,
};

function fixture(changes: Partial<AdminAccessRecord> = {}, overrides: Partial<AdminAccessDependencies> = {}) {
  let record: AdminAccessRecord | null = { ...approvedAdmin, ...changes };
  const compared: string[] = [];
  const bindings: string[] = [];
  const copy = () => record ? structuredClone(record) : null;
  const dependencies: AdminAccessDependencies = {
    findByEmail: async (email) => record?.email.toLowerCase() === email ? copy() : null,
    findById: async (id) => record?.id === id ? copy() : null,
    bindGoogleSubject: async (id, value) => {
      bindings.push(value);
      if (record?.id === id && record.isActive && record.googleSubject === null) record.googleSubject = value;
      return copy();
    },
    comparePassword: async (password) => { compared.push(password); return password === "correct password"; },
    ...overrides,
  };
  return {
    access: createAdminAccess(dependencies), compared, bindings, current: copy,
    update: (updates: Partial<AdminAccessRecord>) => { if (record) Object.assign(record, updates); },
    remove: () => { record = null; },
  };
}

beforeEach(() => {
  mock.method(globalThis, "fetch", async () => { throw new Error("Unexpected real provider request"); });
});
afterEach(() => mock.restoreAll());

test("Google login is configured only when both dedicated server credentials exist", () => {
  assert.equal(isGoogleSignInConfigured({}), false);
  assert.equal(isGoogleSignInConfigured({ AUTH_GOOGLE_ID: "client", AUTH_GOOGLE_SECRET: " " }), false);
  assert.equal(isGoogleSignInConfigured({ AUTH_GOOGLE_SECRET: "secret" }), false);
  assert.equal(isGoogleSignInConfigured({ AUTH_GOOGLE_ID: "client", AUTH_GOOGLE_SECRET: "secret" }), true);
});

test("only a previously approved admin can bind a verified Google identity", async () => {
  const f = fixture();
  assert.equal(await f.access.authorizeGoogle(account, { ...profile, email: "visitor@gmail.com" }), null);
  assert.equal(f.bindings.length, 0);
  const identity = await f.access.authorizeGoogle(account, { ...profile, email: " Farzin2Tech@Gmail.com " });
  assert.deepEqual(identity, {
    id: adminId, email: approvedAdmin.email, role: "SUPER_ADMIN", googleSubject: subject,
  });
  assert.equal(f.current()?.googleSubject, subject);
  assert.notEqual(identity?.id, subject, "The admin session must use the database identity");
  assert.ok(identity && !Object.hasOwn(identity, "passwordHash"));
  await f.access.authorizeGoogle(account, profile);
  assert.equal(f.bindings.length, 1, "A linked Google account is not rebound");
});

test("Google approval requires the verified OIDC profile and matching stable subject", async () => {
  const f = fixture();
  for (const invalid of [
    { ...profile, email_verified: false }, { ...profile, email_verified: "true" },
    { ...profile, email_verified: undefined }, { ...profile, sub: "" },
    { ...profile, sub: "another-google-account" }, { ...profile, sub: " " },
    { ...profile, email: "invalid" }, { ...profile, email: undefined }, null,
  ]) assert.equal(await f.access.authorizeGoogle(account, invalid), null);
  for (const invalid of [
    { ...account, provider: "untrusted" }, { ...account, type: "oauth" },
    { ...account, providerAccountId: "different-subject" }, null,
  ]) assert.equal(await f.access.authorizeGoogle(invalid, profile), null);
  assert.equal(f.bindings.length, 0);
});

test("an existing Google subject cannot be replaced through email matching", async () => {
  const f = fixture({ googleSubject: "previously-linked-google-account" });
  assert.equal(await f.access.authorizeGoogle(account, profile), null);
  assert.equal(f.bindings.length, 0);
  assert.equal(f.current()?.googleSubject, "previously-linked-google-account");
});

test("simultaneous first Google logins preserve the atomic subject binding", async () => {
  const f = fixture();
  const otherSubject = "other-google-subject";
  const results = await Promise.all([
    f.access.authorizeGoogle(account, profile),
    f.access.authorizeGoogle({ ...account, providerAccountId: otherSubject }, { ...profile, sub: otherSubject }),
  ]);
  assert.equal(results.filter(Boolean).length, 1);
  assert.equal(results[0]?.googleSubject, subject);
  assert.equal(results[1], null);
  assert.equal(f.current()?.googleSubject, subject);
});

test("inactive or unsupported accounts cannot sign in through either provider", async () => {
  for (const changes of [{ isActive: false }, { role: "CUSTOMER" }] as const) {
    const f = fixture({ passwordHash: "test-hash", ...changes });
    assert.equal(await f.access.authorizeGoogle(account, profile), null);
    assert.equal(await f.access.authorizeCredentials({ email: profile.email, password: "correct password" }), null);
    assert.equal(f.bindings.length, 0);
    assert.equal(f.compared.length, 0);
  }
  assert.equal(isAdminRole("SUPER_ADMIN"), true);
  assert.equal(isAdminRole("ADMIN"), true);
  assert.equal(isAdminRole("admin"), false);
});

test("Google-only admins have no password login and existing admins retain credential access", async () => {
  const googleOnly = fixture();
  assert.equal(await googleOnly.access.authorizeCredentials({ email: profile.email, password: "correct password" }), null);
  assert.equal(googleOnly.compared.length, 0);
  const f = fixture({ role: "ADMIN", passwordHash: "test-hash" });
  const identity = await f.access.authorizeCredentials({ email: " Farzin2Tech@Gmail.com ", password: "correct password" });
  assert.equal(identity?.id, adminId);
  assert.equal(identity?.role, "ADMIN");
  assert.equal(await f.access.authorizeCredentials({ email: profile.email, password: "wrong password" }), null);
  assert.equal(await f.access.authorizeCredentials({ email: profile.email, password: "é".repeat(37) }), null);
  assert.equal(await f.access.authorizeCredentials({ email: "invalid", password: "correct password" }), null);
});

test("existing sessions reload database roles and reject revoked or removed admins", async () => {
  const f = fixture({ googleSubject: subject });
  const claims = { id: adminId, provider: "google", googleSubject: subject, role: "SUPER_ADMIN" };
  assert.equal((await f.access.resolveSession(claims))?.role, "SUPER_ADMIN");
  f.update({ role: "ADMIN" });
  assert.equal((await f.access.resolveSession(claims))?.role, "ADMIN", "A stale or client-supplied role never wins");
  f.update({ isActive: false });
  assert.equal(await f.access.resolveSession(claims), null);
  f.update({ isActive: true, googleSubject: "replacement-account" });
  assert.equal(await f.access.resolveSession(claims), null);
  f.remove();
  assert.equal(await f.access.resolveSession({ id: adminId }), null);
});

test("malformed sessions fail closed while existing credential sessions remain valid", async () => {
  const f = fixture({ role: "ADMIN", passwordHash: "test-hash", googleSubject: subject });
  for (const claims of [
    {}, { id: "" }, { id: subject }, { id: adminId, provider: "unknown" },
    { id: adminId, provider: "google" }, { id: adminId, provider: "google", googleSubject: "wrong" },
  ]) assert.equal(await f.access.resolveSession(claims), null);
  assert.equal((await f.access.resolveSession({ id: adminId }))?.role, "ADMIN");
  assert.equal((await f.access.resolveSession({ id: adminId, provider: "credentials" }))?.role, "ADMIN");
});

test("database and verification failures deny authentication without leaking provider details", async () => {
  const unavailable = async () => { throw new Error("Private database configuration"); };
  const f = fixture({}, { findById: unavailable, findByEmail: unavailable });
  assert.equal(await f.access.authorizeGoogle(account, profile), null);
  assert.equal(await f.access.authorizeCredentials({ email: profile.email, password: "correct password" }), null);
  assert.equal(await f.access.resolveSession({ id: adminId }), null);
  const bindingFailure = fixture({}, { bindGoogleSubject: unavailable });
  assert.equal(await bindingFailure.access.authorizeGoogle(account, profile), null);
  const passwordFailure = fixture({ passwordHash: "test-hash" }, { comparePassword: unavailable });
  assert.equal(await passwordFailure.access.authorizeCredentials({ email: profile.email, password: "correct password" }), null);
});
