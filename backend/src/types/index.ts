export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: unknown;
  meta?: {
    timestamp: string;
    path?: string;
    [key: string]: unknown;
  };
}

export interface UserPayload {
  userId: string;
  email: string;
  role: string;
}
