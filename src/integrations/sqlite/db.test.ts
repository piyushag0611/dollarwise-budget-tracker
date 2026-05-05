import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createTestDatabase } from "@/test/mocks/database";
import type { DatabaseAdapter, Category, Subcategory, Transaction } from "./types";

let db: DatabaseAdapter;

beforeEach(() => { db = createTestDatabase(); });
afterEach(async () => { await db.close(); });

// ─── Schema ───────────────────────────────────────────────────────────────────

describe("Schema initialisation", () => {
  it("creates the categories table", async () => {
    const rows = await db.query(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='categories'"
    );
    expect(rows).toHaveLength(1);
  });

  it("creates the subcategories table", async () => {
    const rows = await db.query(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='subcategories'"
    );
    expect(rows).toHaveLength(1);
  });

  it("creates the transactions table", async () => {
    const rows = await db.query(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='transactions'"
    );
    expect(rows).toHaveLength(1);
  });
});

// ─── Categories ───────────────────────────────────────────────────────────────

describe("Categories", () => {
  it("inserts and retrieves a category", async () => {
    await db.execute("INSERT INTO categories (id, name, type) VALUES (?, ?, ?)", ["c1", "Food", "expense"]);
    const rows = await db.query<Category>("SELECT * FROM categories");
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ id: "c1", name: "Food", type: "expense" });
  });

  it("retrieves all categories", async () => {
    await db.execute("INSERT INTO categories (id, name, type) VALUES (?, ?, ?)", ["c1", "Food", "expense"]);
    await db.execute("INSERT INTO categories (id, name, type) VALUES (?, ?, ?)", ["c2", "Salary", "income"]);
    const rows = await db.query<Category>("SELECT * FROM categories ORDER BY name");
    expect(rows).toHaveLength(2);
  });

  it("updates a category name", async () => {
    await db.execute("INSERT INTO categories (id, name, type) VALUES (?, ?, ?)", ["c1", "Food", "expense"]);
    await db.execute("UPDATE categories SET name = ? WHERE id = ?", ["Groceries", "c1"]);
    const row = await db.queryOne<Category>("SELECT * FROM categories WHERE id = ?", ["c1"]);
    expect(row?.name).toBe("Groceries");
  });

  it("deletes a category", async () => {
    await db.execute("INSERT INTO categories (id, name, type) VALUES (?, ?, ?)", ["c1", "Food", "expense"]);
    await db.execute("DELETE FROM categories WHERE id = ?", ["c1"]);
    const rows = await db.query("SELECT * FROM categories");
    expect(rows).toHaveLength(0);
  });

  it("enforces unique category names", async () => {
    await db.execute("INSERT INTO categories (id, name, type) VALUES (?, ?, ?)", ["c1", "Food", "expense"]);
    await expect(
      db.execute("INSERT INTO categories (id, name, type) VALUES (?, ?, ?)", ["c2", "Food", "expense"])
    ).rejects.toThrow();
  });

  it("rejects invalid type values", async () => {
    await expect(
      db.execute("INSERT INTO categories (id, name, type) VALUES (?, ?, ?)", ["c1", "Food", "invalid"])
    ).rejects.toThrow();
  });
});

// ─── Subcategories ────────────────────────────────────────────────────────────

describe("Subcategories", () => {
  beforeEach(async () => {
    await db.execute("INSERT INTO categories (id, name, type) VALUES (?, ?, ?)", ["c1", "Food", "expense"]);
  });

  it("inserts and retrieves a subcategory", async () => {
    await db.execute("INSERT INTO subcategories (id, name, category_id) VALUES (?, ?, ?)", ["s1", "Groceries", "c1"]);
    const rows = await db.query<Subcategory>("SELECT * FROM subcategories");
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ id: "s1", name: "Groceries", category_id: "c1" });
  });

  it("deletes subcategories when parent category is deleted (cascade)", async () => {
    await db.execute("INSERT INTO subcategories (id, name, category_id) VALUES (?, ?, ?)", ["s1", "Groceries", "c1"]);
    await db.execute("DELETE FROM categories WHERE id = ?", ["c1"]);
    const rows = await db.query("SELECT * FROM subcategories");
    expect(rows).toHaveLength(0);
  });

  it("enforces unique subcategory names within a category", async () => {
    await db.execute("INSERT INTO subcategories (id, name, category_id) VALUES (?, ?, ?)", ["s1", "Groceries", "c1"]);
    await expect(
      db.execute("INSERT INTO subcategories (id, name, category_id) VALUES (?, ?, ?)", ["s2", "Groceries", "c1"])
    ).rejects.toThrow();
  });

  it("allows the same subcategory name under different categories", async () => {
    await db.execute("INSERT INTO categories (id, name, type) VALUES (?, ?, ?)", ["c2", "Transport", "expense"]);
    await db.execute("INSERT INTO subcategories (id, name, category_id) VALUES (?, ?, ?)", ["s1", "Bus", "c1"]);
    await expect(
      db.execute("INSERT INTO subcategories (id, name, category_id) VALUES (?, ?, ?)", ["s2", "Bus", "c2"])
    ).resolves.not.toThrow();
  });

  it("rejects a subcategory referencing a non-existent category", async () => {
    await expect(
      db.execute("INSERT INTO subcategories (id, name, category_id) VALUES (?, ?, ?)", ["s1", "Groceries", "nonexistent"])
    ).rejects.toThrow();
  });
});

// ─── Transactions ─────────────────────────────────────────────────────────────

describe("Transactions", () => {
  beforeEach(async () => {
    await db.execute("INSERT INTO categories (id, name, type) VALUES (?, ?, ?)", ["c1", "Food", "expense"]);
    await db.execute("INSERT INTO categories (id, name, type) VALUES (?, ?, ?)", ["c2", "Salary", "income"]);
    await db.execute("INSERT INTO subcategories (id, name, category_id) VALUES (?, ?, ?)", ["s1", "Groceries", "c1"]);
  });

  it("inserts and retrieves a transaction", async () => {
    await db.execute(
      "INSERT INTO transactions (id, amount, date, type, category_id) VALUES (?, ?, ?, ?, ?)",
      ["e1", 50.0, "2026-05-01", "expense", "c1"]
    );
    const rows = await db.query<Transaction>("SELECT * FROM transactions");
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ id: "e1", amount: 50.0, type: "expense", category_id: "c1" });
  });

  it("inserts a transaction with a subcategory", async () => {
    await db.execute(
      "INSERT INTO transactions (id, amount, date, type, category_id, subcategory_id) VALUES (?, ?, ?, ?, ?, ?)",
      ["e1", 30.0, "2026-05-01", "expense", "c1", "s1"]
    );
    const row = await db.queryOne<Transaction>("SELECT * FROM transactions WHERE id = ?", ["e1"]);
    expect(row?.subcategory_id).toBe("s1");
  });

  it("rejects amount of zero", async () => {
    await expect(
      db.execute("INSERT INTO transactions (id, amount, date, type, category_id) VALUES (?, ?, ?, ?, ?)",
        ["e1", 0, "2026-05-01", "expense", "c1"])
    ).rejects.toThrow();
  });

  it("rejects negative amount", async () => {
    await expect(
      db.execute("INSERT INTO transactions (id, amount, date, type, category_id) VALUES (?, ?, ?, ?, ?)",
        ["e1", -10, "2026-05-01", "expense", "c1"])
    ).rejects.toThrow();
  });

  it("rejects invalid transaction type", async () => {
    await expect(
      db.execute("INSERT INTO transactions (id, amount, date, type, category_id) VALUES (?, ?, ?, ?, ?)",
        ["e1", 50, "2026-05-01", "invalid", "c1"])
    ).rejects.toThrow();
  });

  it("rejects a transaction referencing a non-existent category", async () => {
    await expect(
      db.execute("INSERT INTO transactions (id, amount, date, type, category_id) VALUES (?, ?, ?, ?, ?)",
        ["e1", 50, "2026-05-01", "expense", "nonexistent"])
    ).rejects.toThrow();
  });

  it("sets subcategory_id to null when subcategory is deleted", async () => {
    await db.execute(
      "INSERT INTO transactions (id, amount, date, type, category_id, subcategory_id) VALUES (?, ?, ?, ?, ?, ?)",
      ["e1", 30.0, "2026-05-01", "expense", "c1", "s1"]
    );
    await db.execute("DELETE FROM subcategories WHERE id = ?", ["s1"]);
    const row = await db.queryOne<Transaction>("SELECT * FROM transactions WHERE id = ?", ["e1"]);
    expect(row?.subcategory_id).toBeNull();
  });

  it("prevents deleting a category that has transactions", async () => {
    await db.execute(
      "INSERT INTO transactions (id, amount, date, type, category_id) VALUES (?, ?, ?, ?, ?)",
      ["e1", 50, "2026-05-01", "expense", "c1"]
    );
    await expect(
      db.execute("DELETE FROM categories WHERE id = ?", ["c1"])
    ).rejects.toThrow();
  });

  it("filters transactions by date range", async () => {
    await db.execute("INSERT INTO transactions (id, amount, date, type, category_id) VALUES (?, ?, ?, ?, ?)", ["e1", 10, "2026-03-01", "expense", "c1"]);
    await db.execute("INSERT INTO transactions (id, amount, date, type, category_id) VALUES (?, ?, ?, ?, ?)", ["e2", 20, "2026-04-15", "expense", "c1"]);
    await db.execute("INSERT INTO transactions (id, amount, date, type, category_id) VALUES (?, ?, ?, ?, ?)", ["e3", 30, "2026-05-20", "expense", "c1"]);

    const rows = await db.query<Transaction>(
      "SELECT * FROM transactions WHERE date >= ? AND date <= ?",
      ["2026-04-01", "2026-04-30"]
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe("e2");
  });

  it("filters transactions by type", async () => {
    await db.execute("INSERT INTO transactions (id, amount, date, type, category_id) VALUES (?, ?, ?, ?, ?)", ["e1", 50, "2026-05-01", "expense", "c1"]);
    await db.execute("INSERT INTO transactions (id, amount, date, type, category_id) VALUES (?, ?, ?, ?, ?)", ["e2", 1000, "2026-05-01", "income", "c2"]);

    const transactions = await db.query<Transaction>("SELECT * FROM transactions WHERE type = ?", ["expense"]);
    expect(transactions).toHaveLength(1);
    expect(transactions[0].id).toBe("e1");
  });

  it("updates a transaction amount", async () => {
    await db.execute("INSERT INTO transactions (id, amount, date, type, category_id) VALUES (?, ?, ?, ?, ?)", ["e1", 50, "2026-05-01", "expense", "c1"]);
    await db.execute("UPDATE transactions SET amount = ? WHERE id = ?", [75, "e1"]);
    const row = await db.queryOne<Transaction>("SELECT * FROM transactions WHERE id = ?", ["e1"]);
    expect(row?.amount).toBe(75);
  });

  it("deletes a transaction", async () => {
    await db.execute("INSERT INTO transactions (id, amount, date, type, category_id) VALUES (?, ?, ?, ?, ?)", ["e1", 50, "2026-05-01", "expense", "c1"]);
    await db.execute("DELETE FROM transactions WHERE id = ?", ["e1"]);
    const rows = await db.query("SELECT * FROM transactions");
    expect(rows).toHaveLength(0);
  });

  it("returns null for a queryOne miss", async () => {
    const row = await db.queryOne("SELECT * FROM transactions WHERE id = ?", ["nonexistent"]);
    expect(row).toBeNull();
  });
});
