"use client";

import { useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  CreditCard,
  Eye,
  EyeOff,
  FileText,
  LoaderCircle,
  LockKeyhole,
  Mail,
  MessageSquare,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import styles from "./login.module.css";

function GoogleMark() {
  return (
    <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.39-.18-2.05H12v3.88h5.38a4.6 4.6 0 0 1-1.99 3.02v2.51h3.23c1.89-1.74 2.98-4.3 2.98-7.36Z" />
      <path fill="#34A853" d="M12 22c2.7 0 4.96-.9 6.62-2.41l-3.23-2.51c-.9.6-2.05.97-3.39.97-2.6 0-4.81-1.76-5.6-4.12H3.06v2.59A10 10 0 0 0 12 22Z" />
      <path fill="#FBBC05" d="M6.4 13.93a6 6 0 0 1 0-3.86V7.48H3.06a10 10 0 0 0 0 9.04l3.34-2.59Z" />
      <path fill="#EA4335" d="M12 5.95c1.47 0 2.79.51 3.83 1.51l2.87-2.87A9.6 9.6 0 0 0 12 2a10 10 0 0 0-8.94 5.48l3.34 2.59c.79-2.36 3-4.12 5.6-4.12Z" />
    </svg>
  );
}

export default function AdminLoginClient({
  googleEnabled,
  initialError,
}: {
  googleEnabled: boolean;
  initialError: string;
}) {
  const router = useRouter();
  const submitting = useRef(false);
  const [pending, setPending] = useState<"google" | "credentials" | null>(null);
  const [error, setError] = useState(initialError);
  const [credentialsOpen, setCredentialsOpen] = useState(!googleEnabled);
  const [passwordVisible, setPasswordVisible] = useState(false);

  async function handleGoogleSignIn() {
    if (submitting.current || !googleEnabled) return;
    submitting.current = true;
    setPending("google");
    setError("");

    try {
      await signIn("google", { redirectTo: "/admin" });
    } catch {
      setError("We couldn’t connect to Google. Please check your connection and try again.");
    } finally {
      submitting.current = false;
      setPending(null);
    }
  }

  async function handleCredentialsSignIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;
    const form = event.currentTarget;
    if (!form.reportValidity()) return;
    submitting.current = true;
    setPending("credentials");
    setError("");

    try {
      const formData = new FormData(form);
      const result = await signIn("credentials", {
        email: String(formData.get("email") || "").trim(),
        password: String(formData.get("password") || ""),
        redirect: false,
        redirectTo: "/admin",
      });

      if (!result?.ok || result.error) {
        setError("We couldn’t sign you in with those details. Please check your email and password.");
        return;
      }

      router.replace("/admin");
      router.refresh();
    } catch {
      setError("We couldn’t reach the sign-in service. Please check your connection and try again.");
    } finally {
      submitting.current = false;
      setPending(null);
    }
  }

  return (
    <main className={styles.page}>
      <section className={styles.brandPanel} aria-label="GoodyCleaning admin workspace">
        <div className={styles.brandHeader}>
          <BrandLogo href="/" width={180} height={120} priority />
          <span className={styles.workspaceBadge}><span /> Admin workspace</span>
        </div>

        <div className={styles.brandContent}>
          <div className={styles.eyebrow}><span /> A little more organised</div>
          <h2>Great cleans.<br />Good business.</h2>
          <p>Your enquiries, thoughtful quotes and secure payments. All in one tidy place.</p>

          <div className={styles.workflow}>
            <div className={styles.workflowHeader}>
              <span>Your next great clean starts here</span>
              <Sparkles size={18} aria-hidden="true" />
            </div>
            <div className={styles.workflowRow}>
              <span className={styles.workflowIcon}><MessageSquare size={18} aria-hidden="true" /></span>
              <div><strong>Review the details</strong><span>Every enquiry, in focus</span></div>
              <span className={styles.stepNumber}>01</span>
            </div>
            <div className={styles.workflowConnector} aria-hidden="true" />
            <div className={styles.workflowRow}>
              <span className={`${styles.workflowIcon} ${styles.blueIcon}`}><FileText size={18} aria-hidden="true" /></span>
              <div><strong>Make it personal</strong><span>Prepare and send the right quote</span></div>
              <span className={styles.stepNumber}>02</span>
            </div>
            <div className={styles.workflowConnector} aria-hidden="true" />
            <div className={styles.workflowRow}>
              <span className={`${styles.workflowIcon} ${styles.limeIcon}`}><CreditCard size={18} aria-hidden="true" /></span>
              <div><strong>Keep things moving</strong><span>Track payments with ease</span></div>
              <span className={styles.stepNumber}>03</span>
            </div>
          </div>
        </div>

        <div className={styles.brandFooter}>
          <span>Clean spaces. Good vibes.</span>
          <span className={styles.footerSparkle} aria-hidden="true">✳</span>
        </div>
        <div className={styles.decorativeRing} aria-hidden="true" />
      </section>

      <section className={styles.signInPanel} aria-labelledby="sign-in-heading">
        <Link href="/" className={styles.backLink}><ArrowLeft size={15} aria-hidden="true" /> Back to website</Link>

        <div className={styles.signInContent}>
          <div className={styles.mobileBrand}><BrandLogo href="/" width={150} height={100} priority /></div>
          <div className={styles.lockBadge}><LockKeyhole size={22} strokeWidth={1.6} aria-hidden="true" /><span className={styles.smallSparkle} aria-hidden="true">✦</span></div>
          <p className={styles.formEyebrow}>GoodyCleaning admin</p>
          <h1 id="sign-in-heading">Welcome back.</h1>
          <p className={styles.formDescription}>Sign in to take care of the details.<br />We’ll take care of the good vibes.</p>

          <div className={styles.signInActions} aria-busy={pending !== null}>
            {error && <p className={styles.error} role="alert">{error}</p>}

            <button
              className={styles.googleButton}
              type="button"
              disabled={pending !== null || !googleEnabled}
              onClick={handleGoogleSignIn}
              aria-describedby="admin-access-note"
            >
              {pending === "google" ? <LoaderCircle className={styles.spinner} size={20} aria-hidden="true" /> : <GoogleMark />}
              <span>{pending === "google" ? "Connecting to Google…" : "Continue with Google"}</span>
              <ArrowRight size={17} aria-hidden="true" />
            </button>
            {!googleEnabled && <p className={styles.unavailableNote}>Google sign-in is being configured. You can use your existing admin credentials below.</p>}

            <div className={styles.divider}><span /> <span>or</span> <span /></div>

            <button
              type="button"
              className={styles.credentialsToggle}
              aria-expanded={credentialsOpen}
              aria-controls="admin-credentials"
              disabled={pending !== null}
              onClick={() => setCredentialsOpen((open) => !open)}
            >
              <Mail size={16} aria-hidden="true" />
              <span>Use email and password</span>
              <ChevronDown className={credentialsOpen ? styles.chevronOpen : ""} size={16} aria-hidden="true" />
            </button>

            <div id="admin-credentials" hidden={!credentialsOpen}>
              <form onSubmit={handleCredentialsSignIn} className={styles.credentialsForm}>
                <div className={styles.field}>
                  <label htmlFor="admin-email">Email address</label>
                  <input id="admin-email" name="email" type="email" autoComplete="username" autoCapitalize="none" spellCheck={false} placeholder="you@example.com" maxLength={254} disabled={pending !== null} required />
                </div>
                <div className={styles.field}>
                  <label htmlFor="admin-password">Password</label>
                  <div className={styles.passwordField}>
                    <input id="admin-password" name="password" type={passwordVisible ? "text" : "password"} autoComplete="current-password" disabled={pending !== null} required />
                    <button type="button" aria-label={passwordVisible ? "Hide password" : "Show password"} aria-pressed={passwordVisible} disabled={pending !== null} onClick={() => setPasswordVisible((visible) => !visible)}>
                      {passwordVisible ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
                    </button>
                  </div>
                </div>
                <button type="submit" className={styles.signInButton} disabled={pending !== null}>
                  {pending === "credentials" ? <LoaderCircle className={styles.spinner} size={18} aria-hidden="true" /> : null}
                  {pending === "credentials" ? "Signing in…" : "Sign in to your workspace"}
                  {pending !== "credentials" && <ArrowRight size={17} aria-hidden="true" />}
                </button>
              </form>
            </div>

            <p id="admin-access-note" className={styles.accessNote}><ShieldCheck size={16} aria-hidden="true" /><span>Access is limited to approved administrators.</span></p>
          </div>

          <p className={styles.supportNote}>Need a hand? <a href="mailto:support@goodyvan.com">Contact support <ArrowRight size={12} aria-hidden="true" /></a></p>
        </div>

        <footer className={styles.signInFooter}><span>GoodyCleaning</span><span><Check size={12} aria-hidden="true" /> A good place to get things done</span></footer>
      </section>
    </main>
  );
}
