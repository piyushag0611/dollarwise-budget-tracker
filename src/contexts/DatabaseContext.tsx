import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { DatabaseAdapter } from "@/integrations/sqlite/types";

export const DatabaseContext = createContext<DatabaseAdapter | null>(null);

export function DatabaseProvider({
  children,
  adapterFactory,
}: {
  children: ReactNode;
  adapterFactory: () => Promise<DatabaseAdapter>;
}) {
  const [db, setDb] = useState<DatabaseAdapter | null>(null);

  useEffect(() => {
    let adapter: DatabaseAdapter | undefined;
    adapterFactory().then((a) => {
      adapter = a;
      setDb(a);
    });
    return () => { adapter?.close(); };
  }, [adapterFactory]);

  return <DatabaseContext.Provider value={db}>{children}</DatabaseContext.Provider>;
}

export function useDatabase(): DatabaseAdapter | null {
  return useContext(DatabaseContext);
}
