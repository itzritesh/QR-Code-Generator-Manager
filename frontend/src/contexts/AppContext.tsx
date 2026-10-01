import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { healthApi, HealthResponse } from '../services/api';

interface AppContextType {
  appName: string;
  isBackendHealthy: boolean | null;
  healthData: HealthResponse | null;
  isLoadingHealth: boolean;
  healthError: string | null;
  refreshHealth: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [appName] = useState<string>(
    import.meta.env.VITE_APP_NAME || 'QR Code Generator & Management Platform'
  );
  const [isBackendHealthy, setIsBackendHealthy] = useState<boolean | null>(null);
  const [healthData, setHealthData] = useState<HealthResponse | null>(null);
  const [isLoadingHealth, setIsLoadingHealth] = useState<boolean>(true);
  const [healthError, setHealthError] = useState<string | null>(null);

  const refreshHealth = useCallback(async () => {
    setIsLoadingHealth(true);
    setHealthError(null);
    try {
      const data = await healthApi.check();
      setHealthData(data);
      setIsBackendHealthy(data.status === 'healthy');
    } catch (err: any) {
      setIsBackendHealthy(false);
      setHealthError(err.message || 'Unable to connect to backend service');
    } finally {
      setIsLoadingHealth(false);
    }
  }, []);

  useEffect(() => {
    refreshHealth();
  }, [refreshHealth]);

  return (
    <AppContext.Provider
      value={{
        appName,
        isBackendHealthy,
        healthData,
        isLoadingHealth,
        healthError,
        refreshHealth,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = (): AppContextType => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
