import { vi } from "vitest";

// A chainable mock object — every method returns itself so you can chain
// .from("table").select("*").eq("id", x).order("name") etc.
// The final awaited value resolves to { data, error }.
// Override `mockResolvedData` in individual tests to control what comes back.

const createChainableMock = (resolvedValue: { data: unknown; error: null | object }) => {
  const mock: Record<string, unknown> = {};
  const chain = new Proxy(mock, {
    get(_, prop) {
      if (prop === "then") {
        // Makes the object thenable (awaitable)
        return (resolve: (v: unknown) => void) => resolve(resolvedValue);
      }
      // Every method returns the same chainable proxy
      return vi.fn().mockReturnValue(chain);
    },
  });
  return chain;
};

// Default: returns empty data with no error
export let mockSupabaseChain = createChainableMock({ data: [], error: null });

// Call this in a test to set what the mock returns
export function mockSupabaseResolve(data: unknown, error: null | object = null) {
  mockSupabaseChain = createChainableMock({ data, error });
  mockFrom.mockReturnValue(mockSupabaseChain);
}

export const mockFrom = vi.fn().mockReturnValue(mockSupabaseChain);

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: mockFrom,
    auth: {
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      signInWithOAuth: vi.fn().mockResolvedValue({ data: { url: null }, error: null }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
      exchangeCodeForSession: vi.fn().mockResolvedValue({ data: null, error: null }),
    },
  },
}));
