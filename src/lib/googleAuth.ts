import { Capacitor } from "@capacitor/core";

const SCOPES = "https://www.googleapis.com/auth/drive.appdata";
const REDIRECT_PATH_KEY = "dollarwise_auth_redirect";
const PKCE_VERIFIER_KEY = "dollarwise_pkce_verifier";

// Token is held in module memory — cleared when the page/app is closed
let _token: string | null = null;

export function getStoredToken(): string | null {
  return _token;
}

export function clearToken(): void {
  _token = null;
}

// ─── PKCE helpers ─────────────────────────────────────────────────────────────

function generateRandomString(length: number): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, (x) => chars[x % chars.length]).join("");
}

async function generateCodeChallenge(verifier: string): Promise<string> {
  const data = new TextEncoder().encode(verifier);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

// ─── Redirect callback handler (call once on app startup) ────────────────────

// Checks if the page just loaded after a Google OAuth redirect.
// If so, exchanges the code for a token and returns it. Otherwise returns null.
export async function consumeAuthRedirect(): Promise<string | null> {
  const code = new URLSearchParams(window.location.search).get("code");
  if (!code) return null;

  const verifier = sessionStorage.getItem(PKCE_VERIFIER_KEY);
  if (!verifier) return null;
  sessionStorage.removeItem(PKCE_VERIFIER_KEY);

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID as string,
      client_secret: import.meta.env.VITE_GOOGLE_CLIENT_SECRET as string,
      code,
      code_verifier: verifier,
      grant_type: "authorization_code",
      redirect_uri: window.location.origin,
    }),
  });

  const data = await res.json() as { access_token?: string; error_description?: string };
  if (!res.ok || !data.access_token) {
    throw new Error(data.error_description ?? "Token exchange failed");
  }

  _token = data.access_token;
  const returnPath = sessionStorage.getItem(REDIRECT_PATH_KEY) ?? "/";
  sessionStorage.removeItem(REDIRECT_PATH_KEY);
  window.history.replaceState({}, document.title, returnPath);
  return _token;
}

// ─── Sign in ─────────────────────────────────────────────────────────────────

export async function signInWithGoogle(): Promise<string> {
  if (Capacitor.isNativePlatform()) {
    return signInNative();
  }
  return signInWeb();
}

// Redirects to Google OAuth with PKCE. The page navigates away — the returned
// Promise never resolves. consumeAuthRedirect() picks up the result on reload.
async function signInWeb(): Promise<string> {
  const verifier = generateRandomString(64);
  const challenge = await generateCodeChallenge(verifier);

  sessionStorage.setItem(REDIRECT_PATH_KEY, window.location.pathname);
  sessionStorage.setItem(PKCE_VERIFIER_KEY, verifier);

  const params = new URLSearchParams({
    client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID as string,
    redirect_uri: window.location.origin,
    response_type: "code",
    scope: SCOPES,
    code_challenge: challenge,
    code_challenge_method: "S256",
    access_type: "online",
  });

  window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
  return new Promise(() => {}); // page is navigating away
}

// ─── Android: Capacitor Google Auth plugin ───────────────────────────────────

async function signInNative(): Promise<string> {
  const { GoogleAuth } = await import(/* @vite-ignore */ "@codetrix-studio/capacitor-google-auth");

  await GoogleAuth.initialize({
    clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID,
    scopes: ["profile", "email", SCOPES],
    grantOfflineAccess: false,
  });

  const user = await GoogleAuth.signIn();
  _token = user.authentication.accessToken as string;
  return _token;
}
