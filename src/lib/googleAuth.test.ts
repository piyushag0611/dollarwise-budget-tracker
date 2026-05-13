import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { getStoredToken, clearToken, signInWithGoogle } from "./googleAuth";

// Native path requires device hardware — test the web path only
vi.mock("@capacitor/core", () => ({
  Capacitor: { isNativePlatform: () => false },
}));

const mockGoogleWith = (accessToken: string) =>
  vi.stubGlobal("google", {
    accounts: {
      oauth2: {
        initTokenClient: vi.fn(({ callback }: { callback: (r: Record<string, string>) => void }) => ({
          requestAccessToken: () => callback({ access_token: accessToken }),
        })),
      },
    },
  });

const mockGoogleWithError = (error: string) =>
  vi.stubGlobal("google", {
    accounts: {
      oauth2: {
        initTokenClient: vi.fn(({ callback }: { callback: (r: Record<string, string>) => void }) => ({
          requestAccessToken: () => callback({ error }),
        })),
      },
    },
  });

// ─── getStoredToken ───────────────────────────────────────────────────────────

describe("getStoredToken", () => {
  beforeEach(() => { clearToken(); });

  it("returns null before any sign-in", () => {
    expect(getStoredToken()).toBeNull();
  });
});

// ─── clearToken ───────────────────────────────────────────────────────────────

describe("clearToken", () => {
  afterEach(() => { vi.unstubAllGlobals(); });

  it("clears the token after sign-in", async () => {
    mockGoogleWith("tok123");
    await signInWithGoogle();
    expect(getStoredToken()).toBe("tok123");

    clearToken();
    expect(getStoredToken()).toBeNull();
  });
});

// ─── signInWithGoogle (web path) ──────────────────────────────────────────────

describe("signInWithGoogle", () => {
  beforeEach(() => { clearToken(); });
  afterEach(() => { vi.unstubAllGlobals(); });

  it("returns the access token on success", async () => {
    mockGoogleWith("ya29.test-token");
    const token = await signInWithGoogle();
    expect(token).toBe("ya29.test-token");
  });

  it("stores the token so getStoredToken returns it", async () => {
    mockGoogleWith("ya29.stored-token");
    await signInWithGoogle();
    expect(getStoredToken()).toBe("ya29.stored-token");
  });

  it("throws when the GIS script is not loaded", async () => {
    vi.stubGlobal("google", undefined);
    await expect(signInWithGoogle()).rejects.toThrow();
  });

  it("throws when the OAuth callback returns an error", async () => {
    mockGoogleWithError("access_denied");
    await expect(signInWithGoogle()).rejects.toThrow("access_denied");
  });
});
