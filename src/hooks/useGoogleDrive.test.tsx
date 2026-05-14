import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { createTestDatabase } from "@/test/mocks/database";
import { createWrapper } from "@/test/utils/renderWithDb";
import type { DatabaseAdapter } from "@/integrations/sqlite/types";
import { useGoogleDrive } from "./useGoogleDrive";

vi.mock("@/lib/googleAuth", () => ({
  signInWithGoogle: vi.fn(),
  getStoredToken: vi.fn(),
  clearToken: vi.fn(),
  consumeAuthRedirect: vi.fn().mockResolvedValue(null), // no redirect in tests
}));

vi.mock("@/lib/driveSync", () => ({
  exportDatabase: vi.fn(),
  importDatabase: vi.fn(),
  uploadBackup: vi.fn(),
  downloadBackup: vi.fn(),
  getBackupInfo: vi.fn(),
}));

import * as googleAuth from "@/lib/googleAuth";
import * as driveSync from "@/lib/driveSync";

let db: DatabaseAdapter;
let wrapper: ReturnType<typeof createWrapper>;

beforeEach(() => {
  db = createTestDatabase();
  wrapper = createWrapper(db);
  vi.mocked(googleAuth.getStoredToken).mockReturnValue(null);
  vi.mocked(driveSync.getBackupInfo).mockResolvedValue({ exists: false, modifiedAt: null });
});

afterEach(async () => {
  await db.close();
  vi.clearAllMocks();
});

// ─── isSignedIn ───────────────────────────────────────────────────────────────

describe("isSignedIn", () => {
  it("is false when no token is stored", () => {
    const { result } = renderHook(() => useGoogleDrive(), { wrapper });
    expect(result.current.isSignedIn).toBe(false);
  });

  it("is true when a token is already in memory", () => {
    vi.mocked(googleAuth.getStoredToken).mockReturnValue("ya29.existing");
    const { result } = renderHook(() => useGoogleDrive(), { wrapper });
    expect(result.current.isSignedIn).toBe(true);
  });
});

// ─── signIn ───────────────────────────────────────────────────────────────────

describe("signIn", () => {
  it("calls signInWithGoogle and sets isSignedIn to true", async () => {
    vi.mocked(googleAuth.signInWithGoogle).mockResolvedValue("ya29.new-token");

    const { result } = renderHook(() => useGoogleDrive(), { wrapper });
    expect(result.current.isSignedIn).toBe(false);

    await act(async () => { await result.current.signIn(); });

    expect(googleAuth.signInWithGoogle).toHaveBeenCalledOnce();
    expect(result.current.isSignedIn).toBe(true);
  });

  it("does not change isSignedIn when signInWithGoogle throws", async () => {
    vi.mocked(googleAuth.signInWithGoogle).mockRejectedValue(new Error("access_denied"));

    const { result } = renderHook(() => useGoogleDrive(), { wrapper });

    let error: Error | null = null;
    await act(async () => {
      try { await result.current.signIn(); } catch (e) { error = e as Error; }
    });

    expect(error?.message).toBe("access_denied");
    expect(result.current.isSignedIn).toBe(false);
  });
});

// ─── signOut ──────────────────────────────────────────────────────────────────

describe("signOut", () => {
  it("calls clearToken and sets isSignedIn to false", async () => {
    vi.mocked(googleAuth.getStoredToken).mockReturnValue("ya29.token");

    const { result } = renderHook(() => useGoogleDrive(), { wrapper });
    expect(result.current.isSignedIn).toBe(true);

    act(() => { result.current.signOut(); });

    expect(googleAuth.clearToken).toHaveBeenCalledOnce();
    expect(result.current.isSignedIn).toBe(false);
  });
});

// ─── backup ───────────────────────────────────────────────────────────────────

describe("backup", () => {
  it("exports the DB and uploads to Drive", async () => {
    vi.mocked(googleAuth.getStoredToken).mockReturnValue("ya29.token");
    vi.mocked(driveSync.exportDatabase).mockResolvedValue('{"version":1}');
    vi.mocked(driveSync.uploadBackup).mockResolvedValue(undefined);

    const { result } = renderHook(() => useGoogleDrive(), { wrapper });

    await act(async () => { await result.current.backup(); });

    expect(driveSync.exportDatabase).toHaveBeenCalledOnce();
    expect(driveSync.uploadBackup).toHaveBeenCalledWith("ya29.token", '{"version":1}');
  });

  it("exposes isBackingUp while the mutation is running", async () => {
    vi.mocked(googleAuth.getStoredToken).mockReturnValue("ya29.token");
    vi.mocked(driveSync.exportDatabase).mockResolvedValue('{"version":1}');

    let resolve!: () => void;
    vi.mocked(driveSync.uploadBackup).mockReturnValue(new Promise<void>((r) => { resolve = r; }));

    const { result } = renderHook(() => useGoogleDrive(), { wrapper });

    act(() => { result.current.backup(); });
    await waitFor(() => expect(result.current.isBackingUp).toBe(true));

    resolve();
    await waitFor(() => expect(result.current.isBackingUp).toBe(false));
  });
});

// ─── restore ─────────────────────────────────────────────────────────────────

describe("restore", () => {
  it("downloads from Drive and imports to the DB", async () => {
    const backupJson = '{"version":1,"exportedAt":"2026-05-12T00:00:00Z","categories":[],"subcategories":[],"transactions":[]}';
    vi.mocked(googleAuth.getStoredToken).mockReturnValue("ya29.token");
    vi.mocked(driveSync.downloadBackup).mockResolvedValue(backupJson);
    vi.mocked(driveSync.importDatabase).mockResolvedValue(undefined);

    const { result } = renderHook(() => useGoogleDrive(), { wrapper });

    await act(async () => { await result.current.restore(); });

    expect(driveSync.downloadBackup).toHaveBeenCalledWith("ya29.token");
    expect(driveSync.importDatabase).toHaveBeenCalledOnce();
  });

  it("throws when no backup is found on Drive", async () => {
    vi.mocked(googleAuth.getStoredToken).mockReturnValue("ya29.token");
    vi.mocked(driveSync.downloadBackup).mockResolvedValue(null);

    const { result } = renderHook(() => useGoogleDrive(), { wrapper });

    let error: Error | null = null;
    await act(async () => {
      try { await result.current.restore(); } catch (e) { error = e as Error; }
    });

    expect(error).not.toBeNull();
    expect(driveSync.importDatabase).not.toHaveBeenCalled();
  });

  it("exposes isRestoring while the mutation is running", async () => {
    const backupJson = '{"version":1,"exportedAt":"2026-05-12T00:00:00Z","categories":[],"subcategories":[],"transactions":[]}';
    vi.mocked(googleAuth.getStoredToken).mockReturnValue("ya29.token");
    vi.mocked(driveSync.downloadBackup).mockResolvedValue(backupJson);

    let resolve!: () => void;
    vi.mocked(driveSync.importDatabase).mockReturnValue(new Promise<void>((r) => { resolve = r; }));

    const { result } = renderHook(() => useGoogleDrive(), { wrapper });

    act(() => { result.current.restore(); });
    await waitFor(() => expect(result.current.isRestoring).toBe(true));

    resolve();
    await waitFor(() => expect(result.current.isRestoring).toBe(false));
  });
});

// ─── backupInfo ───────────────────────────────────────────────────────────────

describe("backupInfo", () => {
  it("returns exists:false by default when not signed in", () => {
    const { result } = renderHook(() => useGoogleDrive(), { wrapper });
    expect(result.current.backupInfo.exists).toBe(false);
  });

  it("fetches and returns backup metadata when signed in", async () => {
    vi.mocked(googleAuth.getStoredToken).mockReturnValue("ya29.token");
    vi.mocked(driveSync.getBackupInfo).mockResolvedValue({ exists: true, modifiedAt: "2026-05-10T12:00:00Z" });

    const { result } = renderHook(() => useGoogleDrive(), { wrapper });

    await waitFor(() => expect(result.current.backupInfo.exists).toBe(true));
    expect(result.current.backupInfo.modifiedAt).toBe("2026-05-10T12:00:00Z");
  });
});
