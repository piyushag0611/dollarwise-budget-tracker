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

async function createWebAdapter(): Promise<DatabaseAdapter> {
  // Dynamically imported so the WASM binary is only loaded on web
  const { default: sqlite3InitModule } = await import(/* @vite-ignore */ "@sqlite.org/sqlite-wasm");
  const sqlite3 = await sqlite3InitModule({ print: () => {}, printErr: () => {} });

  // Use OPFS if available (persistent across sessions), fall back to in-memory
  const db = "opfs" in sqlite3
    ? new sqlite3.oo1.OpfsDb("/dollarwise.db")
    : new sqlite3.oo1.DB("/dollarwise.db", "ct");

  return {
    async initialize() {
      db.exec(SCHEMA_SQL);
    },
    async execute(sql, params = []) {
      db.exec({ sql, bind: params });
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
      db.close();
    },
  };
}
