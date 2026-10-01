import { useApp } from '../contexts/AppContext';

export const useHealthCheck = () => {
  const { isBackendHealthy, healthData, isLoadingHealth, healthError, refreshHealth } = useApp();
  return {
    isHealthy: isBackendHealthy,
    healthData,
    isLoading: isLoadingHealth,
    error: healthError,
    refreshHealth,
  };
};
