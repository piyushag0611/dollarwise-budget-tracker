import Database from "better-sqlite3";
import { SCHEMA_SQL } from "@/integrations/sqlite/schema";
import type { DatabaseAdapter } from "@/integrations/sqlite/types";

// In-memory SQLite adapter for tests — uses better-sqlite3 (synchronous),
// wrapped in Promises to match the async DatabaseAdapter interface.
export function createTestDatabase(): DatabaseAdapter {
  const db = new Database(":memory:");

  // Foreign key enforcement is off by default in SQLite — must enable per connection
  db.pragma("foreign_keys = ON");
  db.exec(SCHEMA_SQL);

  return {
    async initialize() {
      // Already initialized above; no-op here
    },

    async execute(sql: string, params: unknown[] = []) {
      db.prepare(sql).run(params);
    },

    async query<T>(sql: string, params: unknown[] = []): Promise<T[]> {
      return db.prepare(sql).all(params) as T[];
    },

    async queryOne<T>(sql: string, params: unknown[] = []): Promise<T | null> {
      return (db.prepare(sql).get(params) as T) ?? null;
    },

    async close() {
      db.close();
    },
  };
}
