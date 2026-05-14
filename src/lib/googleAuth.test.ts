import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { getStoredToken, clearToken, consumeAuthRedirect } from "./googleAuth";

vi.mock("@capacitor/core", () => ({
  Capacitor: { isNativePlatform: () => false },
}));

beforeEach(() => {
  clearToken();
  sessionStorage.clear();
  window.history.replaceState({}, "", "/");
});

afterEach(() => {
  vi.unstubAllGlobals();
});

// ─── getStoredToken ───────────────────────────────────────────────────────────

describe("getStoredToken", () => {
  it("returns null before any sign-in", () => {
    expect(getStoredToken()).toBeNull();
  });
});

// ─── consumeAuthRedirect ──────────────────────────────────────────────────────

describe("consumeAuthRedirect", () => {
  it("returns null when there is no code in the URL", async () => {
    expect(await consumeAuthRedirect()).toBeNull();
  });

  it("returns null when code is present but PKCE verifier is missing", async () => {
    window.history.pushState({}, "", "/?code=some-code");
    expect(await consumeAuthRedirect()).toBeNull();
  });

  it("exchanges the code for a token and returns it", async () => {
    window.history.pushState({}, "", "/?code=auth-code-123");
    sessionStorage.setItem("dollarwise_pkce_verifier", "test-verifier");

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ access_token: "ya29.pkce-token" }),
    }));

    const token = await consumeAuthRedirect();
    expect(token).toBe("ya29.pkce-token");
  });

  it("stores the token so getStoredToken returns it", async () => {
    window.history.pushState({}, "", "/?code=auth-code-123");
    sessionStorage.setItem("dollarwise_pkce_verifier", "test-verifier");

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ access_token: "ya29.stored" }),
    }));

    await consumeAuthRedirect();
    expect(getStoredToken()).toBe("ya29.stored");
  });

  it("cleans up the code from the URL after consuming", async () => {
    window.history.pushState({}, "", "/?code=auth-code-123");
    sessionStorage.setItem("dollarwise_pkce_verifier", "test-verifier");

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ access_token: "ya29.token" }),
    }));

    await consumeAuthRedirect();
    expect(window.location.search).toBe("");
  });

  it("throws when the token exchange fails", async () => {
    window.history.pushState({}, "", "/?code=bad-code");
    sessionStorage.setItem("dollarwise_pkce_verifier", "test-verifier");

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error_description: "invalid_grant" }),
    }));

    await expect(consumeAuthRedirect()).rejects.toThrow("invalid_grant");
  });
});

// ─── clearToken ───────────────────────────────────────────────────────────────

describe("clearToken", () => {
  it("clears a token set by consumeAuthRedirect", async () => {
    window.history.pushState({}, "", "/?code=auth-code");
    sessionStorage.setItem("dollarwise_pkce_verifier", "verifier");

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ access_token: "ya29.token" }),
    }));

    await consumeAuthRedirect();
    expect(getStoredToken()).toBe("ya29.token");

    clearToken();
    expect(getStoredToken()).toBeNull();
  });
});
