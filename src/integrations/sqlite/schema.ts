// SQLite schema — simplified from the Supabase migrations:
// - No user_id (local-first, single user per device)
// - UUID generation handled in app layer via crypto.randomUUID()
// - TIMESTAMP WITH TIME ZONE → TEXT (ISO 8601)
// - BOOLEAN → INTEGER (0/1, SQLite convention)
// - NUMERIC(12,2) → REAL

export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS categories (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  type       TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(name)
);

CREATE TABLE IF NOT EXISTS subcategories (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  category_id TEXT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(category_id, name)
);

CREATE TABLE IF NOT EXISTS transactions (
  id              TEXT PRIMARY KEY,
  amount          REAL NOT NULL CHECK (amount > 0),
  date            TEXT NOT NULL DEFAULT (date('now')),
  type            TEXT NOT NULL DEFAULT 'expense' CHECK (type IN ('income', 'expense')),
  category_id     TEXT NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  subcategory_id  TEXT REFERENCES subcategories(id) ON DELETE SET NULL,
  description     TEXT,
  is_recurring    INTEGER NOT NULL DEFAULT 0,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_transactions_date     ON transactions(date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category_id);
CREATE INDEX IF NOT EXISTS idx_subcategories_cat ON subcategories(category_id);

CREATE TRIGGER IF NOT EXISTS trg_categories_updated_at
  AFTER UPDATE ON categories BEGIN
    UPDATE categories SET updated_at = datetime('now') WHERE id = NEW.id;
  END;

CREATE TRIGGER IF NOT EXISTS trg_subcategories_updated_at
  AFTER UPDATE ON subcategories BEGIN
    UPDATE subcategories SET updated_at = datetime('now') WHERE id = NEW.id;
  END;

CREATE TRIGGER IF NOT EXISTS trg_transactions_updated_at
  AFTER UPDATE ON transactions BEGIN
    UPDATE transactions SET updated_at = datetime('now') WHERE id = NEW.id;
  END;
`;
