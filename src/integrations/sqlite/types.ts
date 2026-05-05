// Core adapter interface — every platform implementation (web WASM, Android Capacitor,
// and the in-memory test adapter) must satisfy this contract.
export interface DatabaseAdapter {
  initialize(): Promise<void>;
  execute(sql: string, params?: unknown[]): Promise<void>;
  query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]>;
  queryOne<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T | null>;
  close(): Promise<void>;
}

// Domain types — mirrors the SQLite schema, no user_id (local-first, single user)
export interface Category {
  id: string;
  name: string;
  type: "income" | "expense";
  created_at: string;
  updated_at: string;
}

export interface Subcategory {
  id: string;
  name: string;
  category_id: string;
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: string;
  amount: number;
  date: string;
  type: "income" | "expense";
  category_id: string;
  subcategory_id: string | null;
  description: string | null;
  is_recurring: number; // SQLite stores booleans as 0/1
  created_at: string;
  updated_at: string;
}
