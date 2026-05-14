import { Capacitor } from "@capacitor/core";
import { SCHEMA_SQL } from "./schema";
import type { DatabaseAdapter } from "./types";

// Singleton — one database connection for the lifetime of the app
let instance: DatabaseAdapter | null = null;

export async function getDatabase(): Promise<DatabaseAdapter> {
  if (instance) return instance;
  instance = Capacitor.isNativePlatform()
    ? await createNativeAdapter()
    : await createWebAdapter();
  await instance.initialize();
  return instance;
}

// Called when Android activity lifecycle resets the SQLite connection.
// Closes the stale adapter and forces a fresh connection on next getDatabase().
export async function resetDatabase(): Promise<DatabaseAdapter> {
  if (instance) {
    try { await instance.close(); } catch {}
    instance = null;
  }
  return getDatabase();
}

// ─── Android (Capacitor SQLite) ───────────────────────────────────────────────

async function createNativeAdapter(): Promise<DatabaseAdapter> {
  const { CapacitorSQLite, SQLiteConnection } = await import(
    /* @vite-ignore */ "@capacitor-community/sqlite"
  );
  const sqlite = new SQLiteConnection(CapacitorSQLite);
  const db = await sqlite.createConnection("dollarwise", false, "no-encryption", 1, false);
  await db.open();

  return {
    async initialize() {
      await db.query("PRAGMA journal_mode = WAL", []);
      await db.execute(SCHEMA_SQL);
    },
    async execute(sql, params = []) {
      await db.run(sql, params);
    },
    async query<T>(sql: string, params: unknown[] = []): Promise<T[]> {
      const result = await db.query(sql, params);
      return (result.values ?? []) as T[];
    },
    async queryOne<T>(sql: string, params: unknown[] = []): Promise<T | null> {
      const result = await db.query(sql, params);
      return ((result.values ?? [])[0] as T) ?? null;
    },
    async close() {
      await sqlite.closeConnection("dollarwise", false);
    },
  };
}

// ─── Web (SQLite WASM + Origin Private File System) ──────────────────────────

const DB_STORAGE_KEY = "dollarwise_db";

async function createWebAdapter(): Promise<DatabaseAdapter> {
  const { default: sqlite3InitModule } = await import(/* @vite-ignore */ "@sqlite.org/sqlite-wasm");
  const sqlite3 = await sqlite3InitModule({ print: () => {}, printErr: () => {} });

  const db = new sqlite3.oo1.DB("/dollarwise.db", "ct");

  // Restore database from localStorage if it exists
  const saved = localStorage.getItem(DB_STORAGE_KEY);
if (saved) {
  try {
    const binary = Uint8Array.from(atob(saved), c => c.charCodeAt(0));
    const pData = sqlite3.wasm.alloc(binary.length);
    sqlite3.wasm.heap8u().set(binary, pData);
    sqlite3.capi.sqlite3_deserialize(
      db.pointer,
      "main",
      pData,
      binary.length,
      binary.length,
      0
    );
    console.log("DB restored from localStorage, size:", binary.length);
  } catch (e) {
    console.error("Failed to restore DB:", e);
  }
}

  // Helper to persist DB to localStorage after every write
function persist() {
  try {
    const stack = sqlite3.wasm.pstack.pointer;
    const pSize = sqlite3.wasm.pstack.alloc(8); // allocate pointer for size
    const pData = sqlite3.capi.sqlite3_serialize(
      db.pointer,
      "main",
      pSize,
      0
    );
    if (pData) {
      const size = sqlite3.wasm.heap32u()[pSize / 4]; // read size from pointer
      const binary = sqlite3.wasm.heap8u().slice(pData, pData + size);
      const base64 = btoa(String.fromCharCode(...new Uint8Array(binary)));
      localStorage.setItem(DB_STORAGE_KEY, base64);
      console.log("DB persisted, size:", base64.length, "bytes");
    }
    sqlite3.wasm.pstack.restore(stack);
  } catch (e) {
    console.error("Failed to persist DB:", e);
  }
}

  return {
    async initialize() {
      db.exec(SCHEMA_SQL);
      persist(); // persist schema
    },
    async execute(sql, params = []) {
      db.exec({ sql, bind: params });
      persist(); // persist after every write
    },
    async query<T>(sql: string, params: unknown[] = []): Promise<T[]> {
      const rows: T[] = [];
      db.exec({
        sql,
        bind: params,
        rowMode: "object",
        callback: (row: T) => rows.push(row),
      });
      return rows;
    },
    async queryOne<T>(sql: string, params: unknown[] = []): Promise<T | null> {
      const rows: T[] = [];
      db.exec({
        sql,
        bind: params,
        rowMode: "object",
        callback: (row: T) => rows.push(row),
      });
      return rows[0] ?? null;
    },
    async close() {
      persist();
      db.close();
    },
  };
}
