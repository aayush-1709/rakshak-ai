'use client';

import { createContext, useCallback, useContext, useMemo, useState } from 'react';

interface DashboardRefreshContextValue {
  /** Bumps when complaints/clusters should refetch (submit, mock toggle). */
  dataRefreshKey: number;
  bumpDataRefresh: () => void;
}

const DashboardRefreshContext = createContext<DashboardRefreshContextValue | null>(null);

export function DashboardRefreshProvider({ children }: { children: React.ReactNode }) {
  const [dataRefreshKey, setDataRefreshKey] = useState(0);

  const bumpDataRefresh = useCallback(() => {
    setDataRefreshKey((k) => k + 1);
  }, []);

  const value = useMemo(
    () => ({ dataRefreshKey, bumpDataRefresh }),
    [dataRefreshKey, bumpDataRefresh]
  );

  return (
    <DashboardRefreshContext.Provider value={value}>{children}</DashboardRefreshContext.Provider>
  );
}

export function useDashboardRefresh() {
  const ctx = useContext(DashboardRefreshContext);
  if (!ctx) {
    throw new Error('useDashboardRefresh must be used within DashboardRefreshProvider');
  }
  return ctx;
}
