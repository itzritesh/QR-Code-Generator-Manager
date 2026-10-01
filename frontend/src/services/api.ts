import axios, { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios';

// Resolve API base URL from Vite environment variables (VITE_API_URL or VITE_API_BASE_URL)
// Strips any trailing slashes and ensures /api is cleanly mounted without duplication
const getApiBaseUrl = (): string => {
  const envUrl = (import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || '').trim();
  if (!envUrl) {
    return '/api';
  }
  const clean = envUrl.replace(/\/+$/, '');
  return clean.endsWith('/api') ? clean : `${clean}/api`;
};

export const apiClient = axios.create({
  baseURL: getApiBaseUrl(),
  timeout: 20000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// Request Interceptor: Attach JWT authorization token if available
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('auth_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// Response Interceptor: Centralized error handling
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  (error: AxiosError) => {
    let errorMessage = 'An unexpected network error occurred.';

    if (error.response) {
      // Backend returned an error response
      const data = error.response.data as any;
      errorMessage = data?.message || data?.error || `Error ${error.response.status}: Request failed`;
    } else if (error.request) {
      // The request was made but no response was received (e.g. backend offline)
      errorMessage = 'Backend server is unreachable. Please verify server is running.';
    } else {
      errorMessage = error.message;
    }

    return Promise.reject(new Error(errorMessage));
  }
);

// Health check API methods
export interface HealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  service: string;
  version: string;
  environment: string;
  uptimeSeconds: number;
  timestamp: string;
  database: {
    connected: boolean;
    provider: string;
    latencyMs?: number;
    error?: string;
  };
  system: {
    nodeVersion: string;
    memoryUsageMB: {
      rss: number;
      heapTotal: number;
      heapUsed: number;
    };
  };
}

export const healthApi = {
  check: async (): Promise<HealthResponse> => {
    const response = await apiClient.get<{ success: boolean; data: HealthResponse }>('/health');
    return response.data.data;
  },
};
