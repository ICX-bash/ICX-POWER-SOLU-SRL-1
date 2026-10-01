export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

const AUTH_PATHS = new Set(["/connexion", "/inscription", "/mot-de-passe-oublie", "/verification-email"]);

/** Send an unauthenticated client to the site's own sign-in page. */
export const startLogin = (returnTo = "/mon-espace") => {
  if (typeof window === "undefined") return;
  if (AUTH_PATHS.has(window.location.pathname)) return;

  const safeTarget = returnTo.startsWith("/") && !returnTo.startsWith("//") && !returnTo.includes("\\") && !returnTo.startsWith("/admin") && !AUTH_PATHS.has(returnTo)
    ? returnTo
    : "/mon-espace";
  try {
    sessionStorage.setItem("icx-auth-return-to", safeTarget);
  } catch {}
  window.location.assign("/connexion");
};
