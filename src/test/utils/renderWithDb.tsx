import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { DatabaseContext } from "@/contexts/DatabaseContext";
import type { DatabaseAdapter } from "@/integrations/sqlite/types";

export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
}

export function createWrapper(db: DatabaseAdapter) {
  const queryClient = createTestQueryClient();
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <DatabaseContext.Provider value={db}>
          {children}
        </DatabaseContext.Provider>
      </QueryClientProvider>
    );
  };
}
