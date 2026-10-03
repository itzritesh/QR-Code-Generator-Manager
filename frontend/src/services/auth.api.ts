import { apiClient } from './api';

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string | null;
  role: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface UpdateProfilePayload {
  name?: string;
  avatar?: string | null;
}

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
  confirmNewPassword: string;
}

export interface ForgotPasswordResponse {
  message: string;
  devResetUrl?: string;
}

export interface ResetPasswordPayload {
  token: string;
  password: string;
  confirmPassword: string;
}

export const authApi = {
  register: async (payload: RegisterPayload): Promise<AuthResponse> => {
    const res = await apiClient.post<{ success: boolean; data: AuthResponse }>('/auth/register', payload);
    return res.data.data;
  },

  login: async (payload: LoginPayload): Promise<AuthResponse> => {
    const res = await apiClient.post<{ success: boolean; data: AuthResponse }>('/auth/login', payload);
    return res.data.data;
  },

  googleLogin: async (credential: string): Promise<AuthResponse> => {
    const res = await apiClient.post<{ success: boolean; data: AuthResponse }>('/auth/google', {
      credential,
    });
    return res.data.data;
  },

  logout: async (): Promise<void> => {
    try {
      await apiClient.post('/auth/logout');
    } catch {
      // Ignore network errors on logout
    }
  },

  getMe: async (): Promise<User> => {
    const res = await apiClient.get<{ success: boolean; data: { user: User } }>('/auth/me');
    return res.data.data.user;
  },

  updateProfile: async (payload: UpdateProfilePayload): Promise<User> => {
    const res = await apiClient.put<{ success: boolean; data: { user: User } }>('/auth/profile', payload);
    return res.data.data.user;
  },

  changePassword: async (payload: ChangePasswordPayload): Promise<{ message: string }> => {
    const res = await apiClient.put<{ success: boolean; data: { message: string } }>(
      '/auth/change-password',
      payload
    );
    return res.data.data;
  },

  forgotPassword: async (email: string): Promise<ForgotPasswordResponse> => {
    const clientOrigin = typeof window !== 'undefined' ? window.location.origin : undefined;
    const res = await apiClient.post<{ success: boolean; data: ForgotPasswordResponse }>(
      '/auth/forgot-password',
      { email, clientOrigin }
    );
    return res.data.data;
  },

  resetPassword: async (payload: ResetPasswordPayload): Promise<{ message: string }> => {
    const res = await apiClient.post<{ success: boolean; data: { message: string } }>(
      '/auth/reset-password',
      payload
    );
    return res.data.data;
  },

  deleteAccount: async (): Promise<{ message: string }> => {
    const res = await apiClient.delete<{ success: boolean; data: { message: string } }>('/auth/account');
    return res.data.data;
  },
};
