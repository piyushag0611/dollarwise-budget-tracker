import { Capacitor } from "@capacitor/core";

const SCOPES = "https://www.googleapis.com/auth/drive.appdata";

// Token is held in module memory — cleared when the page/app is closed
let _token: string | null = null;

export function getStoredToken(): string | null {
  return _token;
}

export function clearToken(): void {
  _token = null;
}

export async function signInWithGoogle(): Promise<string> {
  if (Capacitor.isNativePlatform()) {
    return signInNative();
  }
  return signInWeb();
}

// ─── Web: Google Identity Services popup ─────────────────────────────────────

function signInWeb(): Promise<string> {
  return new Promise((resolve, reject) => {
    const google = (window as { google?: { accounts: { oauth2: { initTokenClient: (opts: unknown) => { requestAccessToken: () => void } } } } }).google;
    if (!google) {
      reject(new Error("Google Identity Services not loaded. Add the GIS script to index.html."));
      return;
    }

    const tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
      scope: SCOPES,
      callback: (response: { access_token?: string; error?: string }) => {
        if (response.error) {
          reject(new Error(response.error));
          return;
        }
        _token = response.access_token!;
        resolve(_token);
      },
    });

    tokenClient.requestAccessToken();
  });
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
