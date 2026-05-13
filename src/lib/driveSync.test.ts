import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { createTestDatabase } from "@/test/mocks/database";
import type { DatabaseAdapter } from "@/integrations/sqlite/types";
import {
  exportDatabase,
  importDatabase,
  uploadBackup,
  downloadBackup,
  getBackupInfo,
} from "./driveSync";

const FAKE_TOKEN = "ya29.fake-access-token";

// ─── exportDatabase ───────────────────────────────────────────────────────────

describe("exportDatabase", () => {
  let db: DatabaseAdapter;

  beforeEach(() => { db = createTestDatabase(); });
  afterEach(async () => { await db.close(); });

  it("exports an empty database with the correct structure", async () => {
    const json = await exportDatabase(db);
    const snapshot = JSON.parse(json);
    expect(snapshot.version).toBe(1);
    expect(snapshot.exportedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(snapshot.categories).toEqual([]);
    expect(snapshot.subcategories).toEqual([]);
    expect(snapshot.transactions).toEqual([]);
  });

  it("includes all categories in the export", async () => {
    await db.execute("INSERT INTO categories (id, name, type) VALUES (?, ?, ?)", ["c1", "Food", "expense"]);
    await db.execute("INSERT INTO categories (id, name, type) VALUES (?, ?, ?)", ["c2", "Salary", "income"]);

    const snapshot = JSON.parse(await exportDatabase(db));
    expect(snapshot.categories).toHaveLength(2);
    expect(snapshot.categories[0]).toMatchObject({ id: "c1", name: "Food", type: "expense" });
  });

  it("includes subcategories and transactions in the export", async () => {
    await db.execute("INSERT INTO categories (id, name, type) VALUES (?, ?, ?)", ["c1", "Food", "expense"]);
    await db.execute("INSERT INTO subcategories (id, name, category_id) VALUES (?, ?, ?)", ["s1", "Groceries", "c1"]);
    await db.execute(
      "INSERT INTO transactions (id, amount, date, type, category_id, subcategory_id) VALUES (?, ?, ?, ?, ?, ?)",
      ["t1", 50, "2026-05-01", "expense", "c1", "s1"]
    );

    const snapshot = JSON.parse(await exportDatabase(db));
    expect(snapshot.subcategories).toHaveLength(1);
    expect(snapshot.subcategories[0]).toMatchObject({ id: "s1", name: "Groceries", category_id: "c1" });
    expect(snapshot.transactions).toHaveLength(1);
    expect(snapshot.transactions[0]).toMatchObject({ id: "t1", amount: 50, type: "expense" });
  });

  it("produces valid JSON", async () => {
    const json = await exportDatabase(db);
    expect(() => JSON.parse(json)).not.toThrow();
  });
});

// ─── importDatabase ───────────────────────────────────────────────────────────

const makeSnapshot = (overrides: object = {}) =>
  JSON.stringify({
    version: 1,
    exportedAt: new Date().toISOString(),
    categories: [],
    subcategories: [],
    transactions: [],
    ...overrides,
  });

describe("importDatabase", () => {
  let db: DatabaseAdapter;

  beforeEach(() => { db = createTestDatabase(); });
  afterEach(async () => { await db.close(); });

  it("imports categories from the snapshot", async () => {
    const snapshot = makeSnapshot({
      categories: [
        { id: "c1", name: "Food", type: "expense", created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z" },
      ],
    });

    await importDatabase(db, snapshot);

    const rows = await db.query("SELECT * FROM categories");
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ id: "c1", name: "Food", type: "expense" });
  });

  it("imports subcategories and transactions", async () => {
    const snapshot = makeSnapshot({
      categories: [
        { id: "c1", name: "Food", type: "expense", created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z" },
      ],
      subcategories: [
        { id: "s1", name: "Groceries", category_id: "c1", created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z" },
      ],
      transactions: [
        { id: "t1", amount: 99, date: "2026-05-01", type: "expense", category_id: "c1", subcategory_id: "s1", description: null, is_recurring: 0, created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z" },
      ],
    });

    await importDatabase(db, snapshot);

    const txns = await db.query("SELECT * FROM transactions");
    expect(txns).toHaveLength(1);
    expect(txns[0]).toMatchObject({ id: "t1", amount: 99, type: "expense" });
  });

  it("clears existing local data before importing", async () => {
    await db.execute("INSERT INTO categories (id, name, type) VALUES (?, ?, ?)", ["old", "OldCat", "expense"]);

    const snapshot = makeSnapshot({
      categories: [
        { id: "c1", name: "Food", type: "expense", created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z" },
      ],
    });

    await importDatabase(db, snapshot);

    const rows = await db.query("SELECT * FROM categories");
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ id: "c1" });
  });

  it("handles empty arrays without errors", async () => {
    await db.execute("INSERT INTO categories (id, name, type) VALUES (?, ?, ?)", ["c1", "Food", "expense"]);

    await expect(importDatabase(db, makeSnapshot())).resolves.not.toThrow();

    const rows = await db.query("SELECT * FROM categories");
    expect(rows).toHaveLength(0);
  });

  it("handles transactions with null subcategory_id and description", async () => {
    const snapshot = makeSnapshot({
      categories: [
        { id: "c1", name: "Food", type: "expense", created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z" },
      ],
      transactions: [
        { id: "t1", amount: 25, date: "2026-05-01", type: "expense", category_id: "c1", subcategory_id: null, description: null, is_recurring: 0, created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z" },
      ],
    });

    await importDatabase(db, snapshot);

    const row = await db.queryOne<{ subcategory_id: null; description: null }>(
      "SELECT * FROM transactions WHERE id = ?",
      ["t1"]
    );
    expect(row?.subcategory_id).toBeNull();
    expect(row?.description).toBeNull();
  });

  it("throws on invalid JSON", async () => {
    await expect(importDatabase(db, "not-valid-json")).rejects.toThrow();
  });
});

// ─── getBackupInfo ────────────────────────────────────────────────────────────

describe("getBackupInfo", () => {
  afterEach(() => { vi.unstubAllGlobals(); });

  it("returns exists:false when no backup file is found", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ files: [] }),
    }));

    const info = await getBackupInfo(FAKE_TOKEN);
    expect(info).toEqual({ exists: false, modifiedAt: null });
  });

  it("returns exists:true and modifiedAt when a backup file is found", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ files: [{ id: "file123", modifiedTime: "2026-05-12T10:00:00Z" }] }),
    }));

    const info = await getBackupInfo(FAKE_TOKEN);
    expect(info).toEqual({ exists: true, modifiedAt: "2026-05-12T10:00:00Z" });
  });

  it("sends the Authorization header with the access token", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ files: [] }),
    });
    vi.stubGlobal("fetch", mockFetch);

    await getBackupInfo(FAKE_TOKEN);

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("drive/v3/files"),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: `Bearer ${FAKE_TOKEN}` }),
      })
    );
  });

  it("throws when the Drive API returns an error response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 401 }));
    await expect(getBackupInfo(FAKE_TOKEN)).rejects.toThrow();
  });
});

// ─── uploadBackup ─────────────────────────────────────────────────────────────

describe("uploadBackup", () => {
  afterEach(() => { vi.unstubAllGlobals(); });

  it("sends the Authorization header with the access token", async () => {
    const mockFetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ files: [] }) })          // list (no existing file)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ id: "file123" }) });     // create
    vi.stubGlobal("fetch", mockFetch);

    await uploadBackup(FAKE_TOKEN, '{"version":1}');

    const calls = mockFetch.mock.calls;
    expect(calls.some(([, opts]) => opts?.headers?.Authorization === `Bearer ${FAKE_TOKEN}`)).toBe(true);
  });

  it("creates a new file when no backup exists", async () => {
    const mockFetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ files: [] }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ id: "newfile" }) });
    vi.stubGlobal("fetch", mockFetch);

    await uploadBackup(FAKE_TOKEN, '{"version":1}');

    const uploadCall = mockFetch.mock.calls[1];
    expect(uploadCall[1].method).toBe("POST");
  });

  it("updates the existing file when a backup already exists", async () => {
    const mockFetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ files: [{ id: "existing123" }] }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ id: "existing123" }) });
    vi.stubGlobal("fetch", mockFetch);

    await uploadBackup(FAKE_TOKEN, '{"version":1}');

    const uploadCall = mockFetch.mock.calls[1];
    expect(uploadCall[1].method).toBe("PATCH");
    expect(uploadCall[0]).toContain("existing123");
  });

  it("throws when the Drive API returns an error response", async () => {
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ files: [] }) })
      .mockResolvedValueOnce({ ok: false, status: 403, text: async () => "Forbidden" })
    );
    await expect(uploadBackup(FAKE_TOKEN, '{"version":1}')).rejects.toThrow();
  });
});

// ─── downloadBackup ───────────────────────────────────────────────────────────

describe("downloadBackup", () => {
  afterEach(() => { vi.unstubAllGlobals(); });

  it("returns null when no backup file exists", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ files: [] }),
    }));

    const result = await downloadBackup(FAKE_TOKEN);
    expect(result).toBeNull();
  });

  it("downloads and returns the backup JSON string", async () => {
    const backupJson = '{"version":1,"exportedAt":"2026-05-12T10:00:00Z","categories":[],"subcategories":[],"transactions":[]}';

    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ files: [{ id: "file123" }] }) })
      .mockResolvedValueOnce({ ok: true, text: async () => backupJson })
    );

    const result = await downloadBackup(FAKE_TOKEN);
    expect(result).toBe(backupJson);
  });

  it("throws when the download request fails", async () => {
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ files: [{ id: "file123" }] }) })
      .mockResolvedValueOnce({ ok: false, status: 500 })
    );

    await expect(downloadBackup(FAKE_TOKEN)).rejects.toThrow();
  });
});
