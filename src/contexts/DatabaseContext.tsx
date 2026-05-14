import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { DatabaseAdapter } from "@/integrations/sqlite/types";

export const DatabaseContext = createContext<DatabaseAdapter | null>(null);
const DatabaseRefreshContext = createContext<() => Promise<void>>(async () => {});

export function DatabaseProvider({
  children,
  adapterFactory,
}: {
  children: ReactNode;
  adapterFactory: () => Promise<DatabaseAdapter>;
}) {
  const [db, setDb] = useState<DatabaseAdapter | null>(null);

  const initDb = useCallback(async () => {
    const adapter = await adapterFactory();
    setDb(adapter);
  }, [adapterFactory]);

  useEffect(() => {
    initDb();
  }, [initDb]);

  return (
    <DatabaseRefreshContext.Provider value={initDb}>
      <DatabaseContext.Provider value={db}>{children}</DatabaseContext.Provider>
    </DatabaseRefreshContext.Provider>
  );
}

export function useDatabase(): DatabaseAdapter | null {
  return useContext(DatabaseContext);
}

export function useDatabaseRefresh(): () => Promise<void> {
  return useContext(DatabaseRefreshContext);
}
