import { isGoogleSignInConfigured } from "@/lib/auth/config";
import AdminLoginClient from "./AdminLoginClient";

const signInErrors: Record<string, string> = {
  AccessDenied:
    "This Google account does not have admin access. Please use your approved admin account.",
  OAuthSignin:
    "We couldn’t connect to Google. Please try again in a moment.",
  OAuthCallback:
    "Google sign-in couldn’t be completed. Please try again.",
  OAuthAccountNotLinked:
    "We couldn’t connect this account. Please contact your administrator for help.",
  Configuration:
    "Sign-in is temporarily unavailable. Please try again later or contact support.",
};

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string | string[] }>;
}) {
  const { error } = await searchParams;
  const errorCode = Array.isArray(error) ? error[0] : error;
  const initialError = errorCode
    ? Object.hasOwn(signInErrors, errorCode)
      ? signInErrors[errorCode]
      : "We couldn’t sign you in. Please try again or contact your administrator."
    : "";

  return (
    <AdminLoginClient
      key={errorCode || "sign-in"}
      googleEnabled={isGoogleSignInConfigured()}
      initialError={initialError}
    />
  );
}
