type GoogleAuthEnvironment = {
  [key: string]: string | undefined;
  AUTH_GOOGLE_ID?: string;
  AUTH_GOOGLE_SECRET?: string;
};

export function isGoogleSignInConfigured(environment: GoogleAuthEnvironment = process.env) {
  return Boolean(environment.AUTH_GOOGLE_ID?.trim() && environment.AUTH_GOOGLE_SECRET?.trim());
}
