import { vi } from "vitest";

// A fake authenticated user used across hook tests
export const testUser = {
  id: "test-user-id",
  email: "test@example.com",
};

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: vi.fn().mockReturnValue({
    user: testUser,
    session: null,
    loading: false,
    signInWithGoogle: vi.fn(),
    signOut: vi.fn(),
  }),
}));
