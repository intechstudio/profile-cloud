const FIREBASE_ISSUER_PREFIX = "https://securetoken.google.com/";

export const KEYCLOAK_PROVIDER_ID = "oidc.keycloak";

export function legacyProviderId(appEnv: string | undefined) {
  return appEnv === "production" ? "oidc.is-auth" : "oidc.is-auth-dev";
}

// Reads `iss` without verifying the token; Firebase verifies it on sign-in.
export function tokenIssuer(idToken: string | undefined): string | undefined {
  const payload = idToken?.split(".")[1];
  if (!payload) return undefined;
  try {
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    const claims = JSON.parse(new TextDecoder().decode(bytes));
    return typeof claims?.iss === "string" && claims.iss
      ? claims.iss
      : undefined;
  } catch {
    return undefined;
  }
}

// Firebase-issued tokens (released editors) keep today's provider. So does a
// token without a readable issuer: it fails exactly as it did before.
export function providerIdForToken(
  idToken: string | undefined,
  appEnv: string | undefined,
) {
  const iss = tokenIssuer(idToken);
  if (iss === undefined || iss.startsWith(FIREBASE_ISSUER_PREFIX)) {
    return legacyProviderId(appEnv);
  }
  return KEYCLOAK_PROVIDER_ID;
}
