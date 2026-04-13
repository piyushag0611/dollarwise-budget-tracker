import { type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

/**
 * Returns a wrapper component that provides a fresh QueryClient to any hook
 * rendered with renderHook(). Use like:
 *
 *   const { result } = renderHook(() => useMyHook(), { wrapper: createWrapper() });
 */
export function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,       // don't retry on failure in tests
        gcTime: Infinity,   // keep cache alive for the duration of the test
      },
    },
  });

  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}
