import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
import React from "react";
import { DatabaseContext, useDatabase } from "./DatabaseContext";
import { createTestDatabase } from "@/test/mocks/database";
import type { DatabaseAdapter } from "@/integrations/sqlite/types";

let db: DatabaseAdapter;

beforeEach(() => { db = createTestDatabase(); });
afterEach(async () => { await db.close(); });

describe("useDatabase", () => {
  it("returns null when no provider is present", () => {
    const { result } = renderHook(() => useDatabase());
    expect(result.current).toBeNull();
  });

  it("returns the adapter when provided via context", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <DatabaseContext.Provider value={db}>{children}</DatabaseContext.Provider>
    );
    const { result } = renderHook(() => useDatabase(), { wrapper });
    expect(result.current).toBe(db);
  });

  it("adapter from context can execute queries", async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <DatabaseContext.Provider value={db}>{children}</DatabaseContext.Provider>
    );
    const { result } = renderHook(() => useDatabase(), { wrapper });
    const rows = await result.current!.query("SELECT name FROM sqlite_master WHERE type='table'");
    expect(rows.length).toBeGreaterThan(0);
  });
});
